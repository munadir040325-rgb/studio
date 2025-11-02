
import 'dotenv/config'
export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuth } from "@/ai/google-services";
import { format } from 'date-fns';
import { id } from 'date-fns/locale';

export async function GET(req: NextRequest) {
    try {
        const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID;
        
        // Determine the sheet name for the current month.
        const now = new Date();
        const monthName = format(now, 'MMMM', { locale: id });
        const yearShort = format(now, 'yy');
        const sheetName = `Giat_${monthName}_${yearShort}`;

        // The range for 'Bagian' names from the matrix.
        const range = `${sheetName}!A18:A52`;

        if (!spreadsheetId) {
            return NextResponse.json({ error: "ID Google Sheet (NEXT_PUBLIC_SHEET_ID) belum diatur." }, { status: 500 });
        }
        
        const auth = await getGoogleAuth("https://www.googleapis.com/auth/spreadsheets.readonly");

        const sheets = google.sheets({ version: "v4", auth });

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        
        // Flatten the array, filter out empty values, and get unique values.
        const rawValues = res.data.values ? res.data.values.flat().filter(Boolean) : [];
        const uniqueValues = [...new Set(rawValues)];

        return NextResponse.json({ values: uniqueValues });

    } catch (err: any) {
        let errorMessage = err?.message || String(err);
        const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID;
        if (errorMessage.includes('client_email') || errorMessage.includes('private_key') || errorMessage.includes('DECODER')) {
            errorMessage = 'Kredensial Google Service Account (GOOGLE_CLIENT_EMAIL atau GOOGLE_PRIVATE_KEY) di file .env tidak valid, kosong, atau salah format. Pastikan kuncinya disalin dengan benar.';
        } else if (errorMessage.includes('Requested entity was not found')) {
            errorMessage = `Spreadsheet dengan ID '${spreadsheetId}' tidak ditemukan atau belum dibagikan ke email Service Account.`;
        } else if (errorMessage.includes('Unable to parse range')) {
             const now = new Date();
             const monthName = format(now, 'MMMM', { locale: id });
             const yearShort = format(now, 'yy');
             const sheetName = `Giat_${monthName}_${yearShort}`;
            errorMessage = `Range '${sheetName}!A18:A52' tidak valid atau sheet '${sheetName}' tidak ada.`;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
