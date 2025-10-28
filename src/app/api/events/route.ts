
import 'dotenv/config'
export const runtime = "nodejs";          // jangan edge: googleapis butuh Node
export const revalidate = 0;              // no cache
export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { google } from "googleapis";
import { getGoogleAuth } from "@/ai/flows/calendar-flow";

// Util: bangun timeMin/timeMax aman (timeMax eksklusif)
function buildRangeISO(startDateStr: string, endDateStr?: string, tz = "Asia/Jakarta") {
  // startDateStr, endDateStr = "YYYY-MM-DD" (tanggal lokal)
  // Jika endDate tidak diisi, ambil hari yang sama
  const [sy, sm, sd] = startDateStr.split("-").map(Number);
  const endParts = (endDateStr ?? startDateStr).split("-").map(Number);
  const [ey, em, ed] = endParts;

  // Buat Date di zona lokal menggunakan Intl (trik: buat UTC, lalu set jam lokal)
  // Cara paling stabil tanpa lib tambahan:
  const startLocal = new Date(Date.UTC(sy, sm - 1, sd, 0, 0, 0)); // 00:00 lokal (nanti dikoreksi)
  const endLocalStartOfDay = new Date(Date.UTC(ey, em - 1, ed, 0, 0, 0));

  // Hitung offset zona waktu Asia/Jakarta terhadap UTC pada tanggal tsb (tidak pakai DST)
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone: tz, hour12: false,
    year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit"
  });

  // Helper: tanggal lokal → ISO UTC akurat
  function localStartOfDayToISO(d: Date) {
    // Ambil komponen lokal di TZ
    const parts = fmt.formatToParts(d).reduce<Record<string,string>>((acc, p) => {
      if (p.type !== "literal") acc[p.type] = p.value;
      return acc;
    }, {});
    // Rakit sebagai lokal, lalu buat Date dengan zona UTC setara
    const isoLocal = `${parts.year}-${parts.month}-${parts.day}T00:00:00`;
    // Parse sebagai lokal Asia/Jakarta lalu convert ke UTC:
    // Trik sederhana: append offset +07:00
    return `${isoLocal}+07:00`; // Asia/Jakarta tetap +07:00 (tanpa DST)
  }

  const timeMin = localStartOfDayToISO(startLocal);
  // timeMax harus eksklusif: awal hari berikutnya dari endLocalStartOfDay
  const endPlus1 = new Date(endLocalStartOfDay.getTime() + 24 * 60 * 60 * 1000);
  const timeMax = localStartOfDayToISO(endPlus1);

  return { timeMin, timeMax };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const start = searchParams.get("start"); // "YYYY-MM-DD"
    const end = searchParams.get("end");     // "YYYY-MM-DD" (opsional)
    const calendarId = process.env.NEXT_PUBLIC_CALENDAR_ID;

    if (!calendarId) {
      return NextResponse.json({ error: "ID Kalender (NEXT_PUBLIC_CALENDAR_ID) belum diatur." }, { status: 500 });
    }

    // Jika tidak ada tanggal filter, ambil rentang default (misal, 1 tahun ke depan dan ke belakang)
    const today = new Date();
    const defaultStart = new Date(today);
    defaultStart.setFullYear(today.getFullYear() - 1);
    const defaultEnd = new Date(today);
    defaultEnd.setFullYear(today.getFullYear() + 1);

    const startDate = start || `${defaultStart.getFullYear()}-${String(defaultStart.getMonth() + 1).padStart(2, '0')}-${String(defaultStart.getDate()).padStart(2, '0')}`;
    const endDate = end || (start ? undefined : `${defaultEnd.getFullYear()}-${String(defaultEnd.getMonth() + 1).padStart(2, '0')}-${String(defaultEnd.getDate()).padStart(2, '0')}`);


    const { timeMin, timeMax } = buildRangeISO(startDate, endDate);

    // Auth service account for calendar
    const auth = await getGoogleAuth("https://www.googleapis.com/auth/calendar.readonly");
    if (!auth) {
        return NextResponse.json({ error: "Kredensial Google Service Account tidak dikonfigurasi." }, { status: 500 });
    }

    const calendar = google.calendar({ version: "v3", auth });

    const res = await calendar.events.list({
      calendarId,
      timeMin: timeMin,
      timeMax: timeMax,
      singleEvents: true,
      orderBy: "startTime",
      maxResults: 2500,
    });

    const items = (res.data.items || []).map(ev => ({
      id: ev.id,
      summary: ev.summary,
      description: ev.description,
      location: ev.location,
      start: ev.start?.dateTime ?? ev.start?.date,
      end: ev.end?.dateTime ?? ev.end?.date,
      isAllDay: !!(ev.start?.date && !ev.start?.dateTime),
      htmlLink: ev.htmlLink,
      attachments: (ev.attachments || []).map(att => ({
        fileUrl: att.fileUrl,
        title: att.title,
        fileId: att.fileId
      }))
    }));

    return NextResponse.json({
      items,
    });
  } catch (err: any) {
    let errorMessage = err?.message || String(err);
    const calendarId = process.env.NEXT_PUBLIC_CALENDAR_ID;
    if (errorMessage.includes('client_email') || errorMessage.includes('DECODER')) {
        errorMessage = 'Kredensial Google Service Account (client_email atau private_key) di file .env tidak valid, kosong, atau salah format. Pastikan kuncinya disalin dengan benar.';
    } else if (errorMessage.includes('not found')) {
        errorMessage = `Kalender dengan ID '${calendarId}' tidak ditemukan atau belum dibagikan ke email Service Account.`;
    }
    return NextResponse.json({ error: errorMessage }, { status: 500 });
  }
}
