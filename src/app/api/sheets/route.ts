
import 'dotenv/config'
export const runtime = "nodejs";
export const revalidate = 0;
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuth } from "@/ai/flows/calendar-flow";

export async function GET(req: NextRequest) {
    try {
        const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID;
        const range = 'Pilihan!Q2:Q'; // Hardcoded as per request

        if (!spreadsheetId) {
            return NextResponse.json({ error: "ID Google Sheet (NEXT_PUBLIC_SHEET_ID) belum diatur." }, { status: 500 });
        }
        
        const auth = await getGoogleAuth("https://www.googleapis.com/auth/spreadsheets.readonly");
        if (!auth) {
            return NextResponse.json({ error: "Kredensial Google Service Account tidak dikonfigurasi." }, { status: 500 });
        }

        const sheets = google.sheets({ version: "v4", auth });

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        
        const values = res.data.values ? res.data.values.flat().filter(Boolean) : [];

        return NextResponse.json({ values });

    } catch (err: any) {
        let errorMessage = err?.message || String(err);
        const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID;
        if (errorMessage.includes('client_email') || errorMessage.includes('DECODER')) {
            errorMessage = 'Kredensial Google Service Account (client_email atau private_key) di file .env tidak valid, kosong, atau salah format. Pastikan kuncinya disalin dengan benar.';
        } else if (errorMessage.includes('Requested entity was not found')) {
            errorMessage = `Spreadsheet dengan ID '${spreadsheetId}' tidak ditemukan atau belum dibagikan ke email Service Account.`;
        } else if (errorMessage.includes('Unable to parse range')) {
            errorMessage = `Range '${'Pilihan!Q2:Q'}' tidak valid atau sheet 'Pilihan' tidak ada.`;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
