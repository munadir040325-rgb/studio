'use server';

import 'dotenv/config';

/**
 * @fileOverview Flow for writing data to Google Sheets.
 *
 * - writeToSheet - Writes a new event to the appropriate Google Sheet based on date.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { getGoogleAuth } from './calendar-flow';
import { format, parseISO, getDate, getMonth, getYear } from 'date-fns';
import { id } from 'date-fns/locale';

const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID;

const writeToSheetInputSchema = z.object({
  summary: z.string(),
  location: z.string().optional(),
  startDateTime: z.string().datetime(),
  description: z.string().optional(),
});

export type WriteToSheetInput = z.infer<typeof writeToSheetInputSchema>;

// Constants from your Apps Script
const START_ROW_INDEX = 16; // 17 in 1-based index
const START_COL_INDEX = 4; // 5 in 1-based index (E)
const DATE_ROW_INDEX = 16; // Row 17

const extractDisposisiFromDescription = (description?: string): string => {
    if (!description) return '';
    const match = description.match(/Disposisi:\s*(.*)/i);
    return match && match[1] ? match[1].trim() : '';
};


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
    
    const eventDate = parseISO(input.startDateTime);

    // 1. Determine the correct sheet name (e.g., "Giat_Oktober_25")
    const monthName = format(eventDate, 'MMMM', { locale: id });
    const yearShort = format(eventDate, 'yy');
    const sheetName = `Giat_${monthName}_${yearShort}`;

    // 2. Find the correct column for the event date
    const dateRowRange = `${sheetName}!E17:AI17`; // E17 to AI17
    let dateRowValues;
    try {
        const dateRowResponse = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range: dateRowRange,
            valueRenderOption: 'UNFORMATTED_VALUE',
        });
        dateRowValues = dateRowResponse.data.values ? dateRowResponse.data.values[0] : [];
    } catch(e: any) {
        if (e.message.includes('Unable to parse range')) {
            throw new Error(`Sheet dengan nama '${sheetName}' tidak ditemukan. Pastikan sheet untuk bulan dan tahun yang relevan sudah dibuat.`);
        }
        throw e;
    }

    const eventDay = getDate(eventDate);
    let targetColIndex = -1;

    for (let i = 0; i < dateRowValues.length; i++) {
        const cellValue = dateRowValues[i];
        if (typeof cellValue === 'number') {
            // Google Sheets dates are serial numbers, difference from 1899-12-30
            const date = new Date(1899, 11, 30 + cellValue);
            if (getDate(date) === eventDay && getMonth(date) === getMonth(eventDate) && getYear(date) === getYear(eventDate)) {
                targetColIndex = START_COL_INDEX + i;
                break;
            }
        }
    }
    
    if (targetColIndex === -1) {
        throw new Error(`Kolom untuk tanggal ${format(eventDate, 'dd-MM-yyyy')} tidak ditemukan di sheet '${sheetName}'.`);
    }

    const targetColLetter = String.fromCharCode('A'.charCodeAt(0) + targetColIndex -1);
    
    // 3. Find the first empty row in that column (starting from row 18)
    const colRange = `${sheetName}!${targetColLetter}18:${targetColLetter}52`;
    const colValuesResponse = await sheets.spreadsheets.values.get({
        spreadsheetId,
        range: colRange,
    });

    const colValues = colValuesResponse.data.values ? colValuesResponse.data.values.flat() : [];
    const firstEmptyRowIndex = START_ROW_INDEX + 1 + colValues.length; // Find next empty row

    if (firstEmptyRowIndex > 52) {
        throw new Error(`Kolom untuk tanggal ${format(eventDate, 'dd-MM-yyyy')} sudah penuh.`);
    }

    // 4. Format the data and write to the cell
    const timeText = format(eventDate, 'HH:mm');
    const disposisi = extractDisposisiFromDescription(input.description);
    const cellValue = [
        input.summary || 'Kegiatan',
        input.location || '',
        timeText,
        disposisi
    ].join('|');

    const targetCell = `${sheetName}!${targetColLetter}${firstEmptyRowIndex}`;

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
