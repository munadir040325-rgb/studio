
'use server';

import 'dotenv/config';

/**
 * @fileOverview Flow for writing and deleting data in Google Sheets.
 *
 * - writeEventToSheet - Writes a new event to the appropriate cell in the Google Sheet. It now handles "adopting" existing manual entries and iterates over multi-day events.
 * - deleteSheetEntry - Finds and deletes an event entry from the Google Sheet based on eventId.
 * - findBagianByEventIds - Finds the 'bagian' for a list of event IDs in a single batch operation.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { getGoogleAuth } from '../google-services';
import { format, parseISO, eachDayOfInterval, isSameMonth, getYear } from 'date-fns';
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
  endDateTime: z.string().datetime(),
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
      cells: z.array(z.string()).optional()
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
    
    const startDate = toZonedTime(parseISO(input.startDateTime), 'Asia/Jakarta');
    const endDate = toZonedTime(parseISO(input.endDateTime), 'Asia/Jakarta');

    const eventDays = eachDayOfInterval({ start: startDate, end: endDate });
    
    const writtenCells: string[] = [];
    let lastSheetName = '';
    let dateRowValues: (string | number)[] = [];

    for (const eventDate of eventDays) {
        const monthName = format(eventDate, 'MMMM', { locale: id });
        const yearShort = format(eventDate, 'yy');
        const sheetName = `Giat_${monthName}_${yearShort}`;

        // 1. Find the correct column for the event date.
        // Cache the date row values to avoid fetching for every day in the same month.
        if (sheetName !== lastSheetName) {
            const dateRowRange = `${sheetName}!E17:AI17`;
            try {
                const dateRowResponse = await sheets.spreadsheets.values.get({
                    spreadsheetId,
                    range: dateRowRange,
                    valueRenderOption: 'UNFORMATTED_VALUE',
                });
                dateRowValues = dateRowResponse.data.values ? dateRowResponse.data.values[0] : [];
                lastSheetName = sheetName;
            } catch(e: any) {
                if (e.message.includes('Unable to parse range')) {
                    console.warn(`Sheet dengan nama '${sheetName}' tidak ditemukan. Melewati tanggal ${format(eventDate, 'dd/MM/yyyy')}.`);
                    continue; // Skip to the next day if sheet for that month/year doesn't exist
                }
                throw e;
            }
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
            console.warn(`Kolom untuk tanggal ${format(eventDate, 'dd/MM/yyyy')} tidak ditemukan di sheet '${sheetName}'. Melewati.`);
            continue; // Skip to the next day
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
        
        // Find the first truly empty row. We won't adopt manual entries for recurring events to keep it simple.
        for(let i = 0; i <= (bagianRange.end - bagianRange.start); i++) {
            if (!colValues[i] || colValues[i] === '') {
                targetRow = bagianRange.start + i;
                break;
            }
        }
        
        if (targetRow === -1) {
             console.warn(`Slot untuk bagian '${input.bagian.toUpperCase()}' pada tanggal ${format(eventDate, 'dd/MM/yyyy')} sudah penuh. Melewati.`);
             continue; // Skip to the next day
        }


        // 3. Format the data and write to the target cell
        const timeText = `Pukul ${format(startDate, 'HH.mm')}`; // Always use start time
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
        writtenCells.push(targetCell);
    }


    if (writtenCells.length === 0) {
        return {
            status: 'warning',
            cells: [],
        }
    }

    return {
      status: 'success',
      cells: writtenCells
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
                
                const clearRequests = [];

                // Iterate through the rows and columns to find the eventId
                for (let r = 0; r < rows.length; r++) {
                    const row = rows[r];
                    for (let c = 0; c < row.length; c++) {
                        const cellValue = row[c];
                        if (typeof cellValue === 'string' && cellValue.includes(`eventId:${input.eventId}`)) {
                            // Found a cell. Construct its A1 notation.
                            const targetRow = 18 + r; // Base row is 18
                            const targetCol = 5 + c;  // Base column is 'E' (5)
                            const targetCellA1 = `${sheetName}!${getColumnLetter(targetCol)}${targetRow}`;
                            clearRequests.push(targetCellA1);
                        }
                    }
                }
                
                if (clearRequests.length > 0) {
                    await sheets.spreadsheets.values.batchClear({
                        spreadsheetId,
                        requestBody: {
                            ranges: clearRequests,
                        }
                    });
                    console.log(`Successfully cleared ${clearRequests.length} cells for event ${input.eventId} in sheet ${sheetName}.`);
                    return clearRequests.join(', ');
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
        const foundCells = results.filter(res => res !== null).join(', ');

        if (foundCells) {
            return { status: 'deleted', cell: foundCells };
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

        try {
            const dataResponse = await sheets.spreadsheets.values.get({ spreadsheetId, range: searchRange });
            const rows = dataResponse.data.values;
            if (!rows) continue;
            
            for (let r = 0; r < rows.length; r++) {
                const row = rows[r];
                for (let c = 0; c < row.length; c++) {
                    const cellValue = row[c];
                    if (typeof cellValue === 'string' && cellValue.includes(`eventId:${input.eventId}`)) {
                        // Found the event. Now determine its 'bagian'.
                        const currentRow = 18 + r;
                         for (const [key, range] of Object.entries(BAGIAN_ROW_MAP)) {
                             if (currentRow >= range.start && currentRow <= range.end) {
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

    const sheetRanges = allSheets
        .map(sheet => sheet.properties?.title)
        .filter((sheetName): sheetName is string => !!sheetName && sheetName.startsWith('Giat_'))
        .flatMap(sheetName => [`${sheetName}!E18:AI52`, `${sheetName}!A18:A52`]);

    if (sheetRanges.length === 0) return {};

    const batchGetResponse = await sheets.spreadsheets.values.batchGet({
        spreadsheetId,
        ranges: sheetRanges,
    });
    
    const valueRanges = batchGetResponse.data.valueRanges || [];

    // Process responses in pairs (data matrix, then bagian names)
    for (let i = 0; i < valueRanges.length; i += 2) {
        if (remainingEventIds.size === 0) break;

        const dataRange = valueRanges[i];
        const bagianRange = valueRanges[i+1];
        
        const rows = dataRange.values;
        const bagianNames = bagianRange.values;

        if (!rows || !bagianNames) continue;

        for (let r = 0; r < rows.length; r++) {
            if (remainingEventIds.size === 0) break;

            const rowData = rows[r];
            if (!rowData) continue;
            
            // Find the 'bagian' this row belongs to from the map
            let rowBagianKey: string | null = null;
            const currentRow = 18 + r; // Calculate the actual row number in the sheet
            for (const [key, range] of Object.entries(BAGIAN_ROW_MAP)) {
                if (currentRow >= range.start && currentRow <= range.end) {
                    rowBagianKey = key;
                    break;
                }
            }
            if (!rowBagianKey) continue;
            
            // Get the display name of the 'bagian' from the cell
            const bagianDisplayName = bagianNames[r] && bagianNames[r][0] ? String(bagianNames[r][0]).toUpperCase() : rowBagianKey.toUpperCase();
            
            for (const cellValue of rowData) {
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
    

    