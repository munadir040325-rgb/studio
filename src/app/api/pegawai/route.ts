
import 'dotenv/config'
export const runtime = "nodejs";
export const revalidate = 3600; // Cache for 1 hour
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuth } from "@/ai/google-services";

export async function GET(req: NextRequest) {
    try {
        const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID;
        const sheetName = 'Pegawai';
        const range = `${sheetName}!A2:E`; // Start from row 2 to skip header

        if (!spreadsheetId) {
            return NextResponse.json({ error: "ID Google Sheet (NEXT_PUBLIC_SHEET_ID) belum diatur." }, { status: 500 });
        }
        
        const auth = await getGoogleAuth("https://www.googleapis.com/auth/spreadsheets.readonly");

        const sheets = google.sheets({ version: "v4", auth });

        const res = await sheets.spreadsheets.values.get({
            spreadsheetId,
            range,
        });
        
        const rows = res.data.values;
        if (!rows || rows.length === 0) {
            return NextResponse.json({ pegawai: [] });
        }

        const pegawai = rows.map(row => ({
            id: row[0] || '',
            nama: row[1] || '',
            nip: row[2] || '',
            pangkat: row[3] || '',
            jabatan: row[4] || ''
        })).filter(p => p.id && p.nama); // Filter out empty rows

        return NextResponse.json({ pegawai });

    } catch (err: any) {
        let errorMessage = err?.message || String(err);
        const spreadsheetId = process.env.NEXT_PUBLIC_SHEET_ID;
        if (errorMessage.includes('client_email') || errorMessage.includes('private_key') || errorMessage.includes('DECODER')) {
            errorMessage = 'Kredensial Google Service Account di file .env tidak valid.';
        } else if (errorMessage.includes('Requested entity was not found')) {
            errorMessage = `Spreadsheet dengan ID '${spreadsheetId}' tidak ditemukan.`;
        } else if (errorMessage.includes('Unable to parse range')) {
            errorMessage = `Sheet 'Pegawai' tidak ditemukan di dalam spreadsheet.`;
        }
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
