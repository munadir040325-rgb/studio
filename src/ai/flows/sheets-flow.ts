
'use server';

import 'dotenv/config';

/**
 * @fileOverview Flow for writing data to Google Sheets based on a matrix layout.
 *
 * - writeEventToSheet - Writes a new event to the appropriate cell in the Google Sheet.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { getGoogleAuth } from './calendar-flow';
import { format, parseISO } from 'date-fns';
import { id } from 'date-fns/locale';
import { toZonedTime } from 'date-fns-tz';


const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID;

// Map 'bagian' values to their specific row ranges in the sheet.
const BAGIAN_ROW_MAP: Record<string, { start: number, end: number }> = {
    'setcam': { start: 18, end: 22 },
    'tapem': { start: 23, end: 27 },
    'trantib': { start: 28, end: 32 },
    'kesra': { start: 33, end: 37 },
    'pm': { start: 38, end: 42 },
    'perkeu': { start: 43, end: 47 },
    'paten': { start: 48, end: 52 }
};


const writeToSheetInputSchema = z.object({
  summary: z.string(),
  location: z.string().optional(),
  startDateTime: z.string().datetime(),
  // Now receiving the raw disposition content, not the full description.
  disposisi: z.string().optional(),
  bagian: z.string().refine(val => Object.keys(BAGIAN_ROW_MAP).includes(val), {
      message: "Bagian yang dipilih tidak valid."
  }),
});

export type WriteToSheetInput = z.infer<typeof writeToSheetInputSchema>;

// Constants from your Apps Script
const START_COL_INDEX = 5; // Column 'E' is index 5 in 1-based.


/**
 * Converts a Google Sheets serial number date to a JavaScript Date object.
 * This function correctly handles the "1900 leap year bug".
 * @param serial The serial number from Google Sheets.
 * @returns A JavaScript Date object.
 */
function sheetSerialNumberToDate(serial: number): Date {
  // Rumus dasar konversi serial number ke UTC Date
  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400 * 1000;
  const dateInUTC = new Date(utcValue);

  // Koreksi agar jam diubah ke WIB (Asia/Jakarta)
  const jakartaDate = new Date(dateInUTC.getTime() + (7 * 60 * 60 * 1000));
  return jakartaDate;
}


function getColumnLetter(colIndex: number): string {
  let letter = '';
  while (colIndex > 0) {
    const remainder = (colIndex - 1) % 26;
    letter = String.fromCharCode(65 + remainder) + letter;
    colIndex = Math.floor((colIndex - 1) / 26);
  }
  return letter;
}


export const writeToSheetFlow = ai.defineFlow(
  {
    name: 'writeToSheetFlow',
    inputSchema: writeToSheetInputSchema,
    outputSchema: z.object({
      status: z.string(),
      cell: z.string().optional()
    }),
  },
  async (input) => {
    if (!spreadsheetId) {
      throw new Error("ID Google Sheet (NEXT_PUBLIC_SHEET_ID) belum diatur.");
    }

    const auth = await getGoogleAuth([
        'https://www.googleapis.com/auth/spreadsheets',
    ]);
    if (!auth) {
        throw new Error("Kredensial Google Service Account tidak dikonfigurasi.");
    }
    const sheets = google.sheets({ version: 'v4', auth });
    
    // Use toZonedTime to correctly interpret the ISO string in Asia/Jakarta timezone
    const eventDate = toZonedTime(parseISO(input.startDateTime), 'Asia/Jakarta');

    // 1. Determine the correct sheet name (e.g., "Giat_Oktober_25")
    const monthName = format(eventDate, 'MMMM', { locale: id });
    const yearShort = format(eventDate, 'yy');
    const sheetName = `Giat_${monthName}_${yearShort}`;

    // 2. Find the correct column for the event date by comparing date objects.
    const dateRowRange = `${sheetName}!E17:AI17`; // E17 to AI17
    let dateRowValues;
    try {
        const dateRowResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: dateRowRange,
            valueRenderOption: 'UNFORMATTED_VALUE', // Get raw serial numbers
        });
        dateRowValues = dateRowResponse.data.values ? dateRowResponse.data.values[0] : [];
    } catch(e: any) {
        if (e.message.includes('Unable to parse range')) {
            throw new Error(`Sheet dengan nama '${sheetName}' tidak ditemukan. Pastikan sheet untuk bulan dan tahun yang relevan sudah dibuat.`);
        }
        throw e;
    }
    
    let targetColIndex = -1;

    for (let i = 0; i < dateRowValues.length; i++) {
        const cellValue = dateRowValues[i];
        if (typeof cellValue === 'number' && cellValue > 0) {
            const sheetDate = sheetSerialNumberToDate(cellValue);
            
            // Compare year, month, and day to avoid off-by-one errors
            if (
              sheetDate.getFullYear() === eventDate.getFullYear() &&
              sheetDate.getMonth() === eventDate.getMonth() &&
              sheetDate.getDate() === eventDate.getDate()
            ) {
                targetColIndex = START_COL_INDEX + i;
                break;
            }
        }
    }
    
    if (targetColIndex === -1) {
        throw new Error(`Kolom untuk tanggal ${format(eventDate, 'dd/MM/yyyy')} tidak ditemukan di sheet '${sheetName}'. Periksa header tanggal di baris 17.`);
    }

    const targetColLetter = getColumnLetter(targetColIndex);
    
    // 3. Find the first empty row within the specified 'bagian' range
    const bagianRange = BAGIAN_ROW_MAP[input.bagian];
    if (!bagianRange) {
        throw new Error(`Rentang baris untuk bagian '${input.bagian}' tidak ditemukan.`);
    }

    const colRangeForBagian = `${sheetName}!${targetColLetter}${bagianRange.start}:${targetColLetter}${bagianRange.end}`;
    
    const colValuesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: colRangeForBagian,
    });

    const colValues = colValuesResponse.data.values ? colValuesResponse.data.values.flat() : [];
    let firstEmptyRowInBagian = -1;

    for(let i = 0; i <= (bagianRange.end - bagianRange.start); i++) {
        if (!colValues[i] || colValues[i] === '') {
            firstEmptyRowInBagian = bagianRange.start + i;
            break;
        }
    }
    
    if (firstEmptyRowInBagian === -1) {
        throw new Error(`Slot untuk bagian '${input.bagian.toUpperCase()}' pada tanggal ${format(eventDate, 'dd/MM/yyyy')} sudah penuh.`);
    }


    // 4. Format the data and write to the cell
    const timeText = `Pukul ${format(eventDate, 'HH.mm')}`;
    // Use the raw disposisi content directly from the input.
    const disposisi = input.disposisi || ''; 
    const cellValue = [
        input.summary || 'Kegiatan',
        input.location || '',
        timeText,
        disposisi
    ].join('|');

    const targetCell = `${sheetName}!${targetColLetter}${firstEmptyRowInBagian}`;

    await sheets.spreadsheets.values.update({
        spreadsheetId,
        range: targetCell,
        valueInputOption: 'USER_ENTERED',
        requestBody: {
            values: [[cellValue]],
        },
    });

    return {
      status: 'success',
      cell: targetCell
    };
  }
);

// Wrapper function to be called from the client
export async function writeEventToSheet(input: WriteToSheetInput): Promise<any> {
    if (!process.env.NEXT_PUBLIC_SHEET_ID) {
      console.warn("Penulisan ke Sheet dilewati: NEXT_PUBLIC_SHEET_ID tidak diatur.");
      return { status: 'skipped', reason: 'Sheet ID not configured.'};
    }
    // We don't await this on the client, but we return the promise
    return writeToSheetFlow(input);
}
