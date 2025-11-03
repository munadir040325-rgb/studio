
'use server';

import 'dotenv/config';

/**
 * @fileOverview Flow for writing and deleting data in Google Sheets.
 *
 * - writeEventToSheet - Writes a new event to the appropriate cell in the Google Sheet. It now handles "adopting" existing manual entries.
 * - deleteSheetEntry - Finds and deletes an event entry from the Google Sheet based on eventId.
 * - findBagianByEventIds - Finds the 'bagian' for a list of event IDs.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { getGoogleAuth } from '../google-services';
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
  disposisi: z.string().optional(),
  bagian: z.string().refine(val => Object.keys(BAGIAN_ROW_MAP).includes(val), {
      message: "Bagian yang dipilih tidak valid."
  }),
  eventId: z.string(),
});

export type WriteToSheetInput = z.infer<typeof writeToSheetInputSchema>;

const deleteSheetEntryInputSchema = z.object({
    eventId: z.string(),
    bagianLama: z.string().optional(),
});
export type DeleteSheetEntryInput = z.infer<typeof deleteSheetEntryInputSchema>;

const findBagianInputSchema = z.object({
    eventId: z.string(),
});

export type FindBagianInput = z.infer<typeof findBagianInputSchema>;

const findBagianBatchInputSchema = z.object({
    eventIds: z.array(z.string()),
});
export type FindBagianBatchInput = z.infer<typeof findBagianBatchInputSchema>;


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
    const sheets = google.sheets({ version: 'v4', auth });
    
    const eventDate = toZonedTime(parseISO(input.startDateTime), 'Asia/Jakarta');
    const monthName = format(eventDate, 'MMMM', { locale: id });
    const yearShort = format(eventDate, 'yy');
    const sheetName = `Giat_${monthName}_${yearShort}`;

    // 1. Find the correct column for the event date.
    const dateRowRange = `${sheetName}!E17:AI17`;
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
    
    let targetColIndex = -1;
    for (let i = 0; i < dateRowValues.length; i++) {
        const cellValue = dateRowValues[i];
        if (typeof cellValue === 'number' && cellValue > 0) {
            const sheetDate = sheetSerialNumberToDate(cellValue);
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
    
    // 2. Look for an existing manual entry or an empty row within the 'bagian' range
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
    let targetRow = -1;
    let existingValue = '';

    // Logic: First, try to find a matching manual entry to "adopt".
    // A manual entry is one that contains the event summary but NOT an eventId.
    for (let i = 0; i < (bagianRange.end - bagianRange.start + 1); i++) {
        const cellContent = colValues[i] || '';
        if (cellContent.includes(input.summary) && !cellContent.includes('eventId:')) {
            targetRow = bagianRange.start + i;
            existingValue = cellContent;
            console.log(`Found matching manual entry to adopt at row ${targetRow}`);
            break;
        }
    }

    // If no manual entry to adopt, find the first truly empty row.
    if (targetRow === -1) {
        for(let i = 0; i <= (bagianRange.end - bagianRange.start); i++) {
            if (!colValues[i] || colValues[i] === '') {
                targetRow = bagianRange.start + i;
                console.log(`Found first empty row at ${targetRow}`);
                break;
            }
        }
    }
    
    if (targetRow === -1) {
        throw new Error(`Slot untuk bagian '${input.bagian.toUpperCase()}' pada tanggal ${format(eventDate, 'dd/MM/yyyy')} sudah penuh.`);
    }


    // 3. Format the data and write to the target cell
    const timeText = `Pukul ${format(eventDate, 'HH.mm')}`;
    const disposisi = input.disposisi || ''; 
    
    const cellValue = [
        input.summary || 'Kegiatan',
        input.location || '',
        timeText,
        disposisi,
        `eventId:${input.eventId}`
    ].join('|');


    const targetCell = `${sheetName}!${targetColLetter}${targetRow}`;

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


export const deleteSheetEntryFlow = ai.defineFlow(
    {
        name: 'deleteSheetEntryFlow',
        inputSchema: deleteSheetEntryInputSchema,
        outputSchema: z.object({
            status: z.string(),
            cell: z.string().optional(),
        }),
    },
    async (input) => {
        if (!spreadsheetId) {
            throw new Error("ID Google Sheet (NEXT_PUBLIC_SHEET_ID) belum diatur.");
        }

        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets']);
        const sheets = google.sheets({ version: 'v4', auth });
        
        const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
        const allSheets = spreadsheetMeta.data.sheets || [];

        const searchPromises = allSheets.map(async (sheet) => {
            const sheetName = sheet.properties?.title;
            if (!sheetName || !sheetName.startsWith('Giat_')) {
                return null;
            }

            // Define the full search range for the data matrix
            const searchRange = `${sheetName}!E18:AI52`;
            try {
                const response = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: searchRange,
                });

                const rows = response.data.values;
                if (!rows) return null;

                // Iterate through the rows and columns to find the eventId
                for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    for (let c = 0; c < row.length; c++) {
                        const cellValue = row[c];
                        if (typeof cellValue === 'string' && cellValue.includes(`eventId:${input.eventId}`)) {
                            // Found the cell. Construct its A1 notation.
                            const targetRow = 18 + r; // Base row is 18
                            const targetCol = 5 + c;  // Base column is 'E' (5)
                            const targetCellA1 = `${sheetName}!${getColumnLetter(targetCol)}${targetRow}`;
                            
                            // Clear the specific cell
                            await sheets.spreadsheets.values.clear({
                                spreadsheetId,
                                range: targetCellA1,
                            });
                            
                            console.log(`Successfully cleared cell: ${targetCellA1}`);
                            return targetCellA1; // Return the A1 notation of the cleared cell
                        }
                    }
                }
            } catch (e: any) {
                // Ignore errors from sheets that don't exist or ranges that are invalid
                if (!e.message.includes('Unable to parse range')) {
                    console.error(`Error searching in sheet '${sheetName}':`, e.message);
                }
            }
            return null;
        });

        const results = await Promise.all(searchPromises);
        const foundCell = results.find(res => res !== null);

        if (foundCell) {
            return { status: 'deleted', cell: foundCell };
        } else {
            console.log(`Event ID ${input.eventId} not found in any sheet.`);
            return { status: 'not_found' };
        }
    }
);

export const findBagianByEventIdFlow = ai.defineFlow({
    name: 'findBagianByEventIdFlow',
    inputSchema: findBagianInputSchema,
    outputSchema: z.object({
        bagian: z.string().nullable(),
    }),
}, async (input) => {
    if (!spreadsheetId) throw new Error("ID Google Sheet (NEXT_PUBLIC_SHEET_ID) belum diatur.");
    if (!input.eventId) return { bagian: null };
    
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const allSheets = spreadsheetMeta.data.sheets || [];

    for (const sheet of allSheets) {
        const sheetName = sheet.properties?.title;
        if (!sheetName || !sheetName.startsWith('Giat_')) continue;

        const searchRange = `${sheetName}!E18:AI52`; // Search data matrix
        const bagianRange = `${sheetName}!A18:A52`;  // Bagian names

        try {
            const [dataResponse, bagianResponse] = await Promise.all([
                 sheets.spreadsheets.values.get({ spreadsheetId, range: searchRange }),
                 sheets.spreadsheets.values.get({ spreadsheetId, range: bagianRange })
            ]);

            const rows = dataResponse.data.values;
            const bagianNames = bagianResponse.data.values;
            if (!rows || !bagianNames) continue;
            
            let currentBagian = '';
            for (let r = 0; r < rows.length; r++) {
                 // Update current bagian if the cell is not empty
                if (bagianNames[r] && bagianNames[r][0]) {
                    currentBagian = bagianNames[r][0];
                }
                const row = rows[r];
                for (let c = 0; c < row.length; c++) {
                    const cellValue = row[c];
                    if (typeof cellValue === 'string' && cellValue.includes(`eventId:${input.eventId}`)) {
                        // Find which major 'bagian' this row belongs to.
                         for (const [key, range] of Object.entries(BAGIAN_ROW_MAP)) {
                             if (r + 18 >= range.start && r + 18 <= range.end) {
                                return { bagian: key };
                             }
                         }
                        return { bagian: null }; // Found but couldn't map to a bagian
                    }
                }
            }
        } catch (e: any) {
            if (!e.message.includes('Unable to parse range')) {
                console.error(`Error in findBagian sheet '${sheetName}':`, e.message);
            }
        }
    }
    return { bagian: null };
});


export const findBagianByEventIdsFlow = ai.defineFlow({
    name: 'findBagianByEventIdsFlow',
    inputSchema: findBagianBatchInputSchema,
    outputSchema: z.record(z.string(), z.string()), // { eventId: bagianName }
}, async (input) => {
    if (!spreadsheetId) throw new Error("ID Google Sheet (NEXT_PUBLIC_SHEET_ID) belum diatur.");
    if (!input.eventIds || input.eventIds.length === 0) return {};

    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/spreadsheets.readonly']);
    const sheets = google.sheets({ version: 'v4', auth });

    const spreadsheetMeta = await sheets.spreadsheets.get({ spreadsheetId });
    const allSheets = spreadsheetMeta.data.sheets || [];
    
    const eventIdToBagianMap: Record<string, string> = {};
    const remainingEventIds = new Set(input.eventIds);

    for (const sheet of allSheets) {
        if (remainingEventIds.size === 0) break;

        const sheetName = sheet.properties?.title;
        if (!sheetName || !sheetName.startsWith('Giat_')) continue;

        const searchRange = `${sheetName}!E18:AI52`;
        const bagianRange = `${sheetName}!A18:A52`;

        try {
            const [dataResponse, bagianResponse] = await Promise.all([
                 sheets.spreadsheets.values.get({ spreadsheetId, range: searchRange }),
                 sheets.spreadsheets.values.get({ spreadsheetId, range: bagianRange })
            ]);

            const rows = dataResponse.data.values;
            const bagianNames = bagianResponse.data.values;
            if (!rows || !bagianNames) continue;

            for (let r = 0; r < rows.length; r++) {
                if (remainingEventIds.size === 0) break;

                // Find the 'bagian' this row belongs to from the map
                let rowBagianKey: string | null = null;
                for (const [key, range] of Object.entries(BAGIAN_ROW_MAP)) {
                    if (r + 18 >= range.start && r + 18 <= range.end) {
                        rowBagianKey = key;
                        break;
                    }
                }
                if (!rowBagianKey) continue;
                
                // Get the display name of the 'bagian' from the cell
                const bagianDisplayName = bagianNames[r] && bagianNames[r][0] ? String(bagianNames[r][0]).toUpperCase() : rowBagianKey.toUpperCase();

                const rowData = rows[r];
                for (let c = 0; c < rowData.length; c++) {
                    const cellValue = rowData[c];
                    if (typeof cellValue === 'string') {
                         for (const eventId of remainingEventIds) {
                            if (cellValue.includes(`eventId:${eventId}`)) {
                                eventIdToBagianMap[eventId] = bagianDisplayName;
                                remainingEventIds.delete(eventId);
                                break; 
                            }
                        }
                    }
                }
            }
        } catch (e: any) {
            if (!e.message.includes('Unable to parse range')) {
                console.error(`Error in findBagianByEventIds sheet '${sheetName}':`, e.message);
            }
        }
    }

    return eventIdToBagianMap;
});


// Wrapper functions
const checkSheetId = () => {
    if (!process.env.NEXT_PUBLIC_SHEET_ID) {
        console.warn("Operation skipped: NEXT_PUBLIC_SHEET_ID is not set.");
        return false;
    }
    return true;
};

export async function writeEventToSheet(input: WriteToSheetInput): Promise<any> {
    if (!checkSheetId()) {
      return { status: 'skipped', reason: 'Sheet ID not configured.'};
    }
    return writeToSheetFlow(input);
}


export async function deleteSheetEntry(input: DeleteSheetEntryInput): Promise<any> {
    if (!checkSheetId()) {
        return { status: 'skipped', reason: 'Sheet ID not configured.' };
    }
    return deleteSheetEntryFlow(input);
}


export async function findBagianByEventId(input: FindBagianInput): Promise<{ bagian: string | null }> {
    if (!checkSheetId()) {
        return { bagian: null };
    }
    return findBagianByEventIdFlow(input);
}

export async function findBagianByEventIds(input: FindBagianBatchInput): Promise<Record<string, string>> {
    if (!checkSheetId()) {
        return {};
    }
    return findBagianByEventIdsFlow(input);
}
    