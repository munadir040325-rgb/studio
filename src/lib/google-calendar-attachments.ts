// src/lib/google-calendar-attachments.ts
'use server';

import 'dotenv/config'
import { google } from "googleapis";

type InputFile = {
  fileId?: string;              // opsional kalau sudah punya
  webViewLink?: string;         // atau kirim link drive (akan diparse)
  name?: string;                // nama tampil
  mimeType?: string;            // image/jpeg, application/pdf, dll
};

type AttachmentGroup = {
  label: string;                // "Foto", "Notulen", "Undangan", "Materi"
  folderUrl?: string;           // opsional: url folder grup
  files: InputFile[];           // daftar file
};

export type UpdateAttachmentArgs = {
  calendarId: string;
  eventId: string;
  resultFolderUrl?: string;     // url folder induk "nama kegiatan"
  groups: AttachmentGroup[];
};

// ---- AUTH (service account) ----
function getAuth(subjectEmail?: string) {
  const scopes = [
    "https://www.googleapis.com/auth/calendar",
    "https://www.googleapis.com/auth/drive.file",
  ];
  const jwt = new google.auth.JWT(
    process.env.GOOGLE_CLIENT_EMAIL,
    undefined,
    (process.env.GOOGLE_PRIVATE_KEY || "").replace(/\\n/g, "\n"),
    scopes,
    subjectEmail || undefined // isi jika DWD
  );
  return jwt;
}

// ---- Helpers ----
function extractFileId(urlOrId?: string): string | null {
  if (!urlOrId) return null;
  // kalau user sudah mengirim pure fileId
  if (/^[A-Za-z0-9_-]{20,}$/.test(urlOrId) && !urlOrId.startsWith("http")) return urlOrId;

  // berbagai pola URL Drive
  const patterns = [
    /\/file\/d\/([A-Za-z0-9_-]+)\//,          // https://drive.google.com/file/d/<ID>/view
    /id=([A-Za-z0-9_-]+)/,                    // ...open?id=<ID>
    /\/folders\/([A-Za-z0-9_-]+)/,            // folder id (untuk folderUrl)
    /\/uc\?export=download&id=([A-Za-z0-9_-]+)/,
  ];
  for (const rx of patterns) {
    const m = urlOrId.match(rx);
    if (m?.[1]) return m[1];
  }
  return null;
}

function iconLinkFor(mimeType?: string) {
  // ikon generik dari Google (tidak wajib, tapi rapi)
  const mt = mimeType || "application/octet-stream";
  return `https://drive-thirdparty.googleusercontent.com/16/type/${encodeURIComponent(mt)}`;
}

async function ensureAnyoneViewer(drive: any, fileId: string) {
  try {
    // tidak fatal jika sudah ada permission serupa — abaikan error 403/409
    await drive.permissions.create({
      fileId,
      requestBody: { role: "reader", type: "anyone" },
    });
  } catch (e: any) {
    // jika no permission karena file bukan milik SA, pastikan SA editor di file/folder
    const code = e?.code || e?.response?.status;
    if (![403, 409].includes(code)) {
      console.warn("ensureAnyoneViewer warn:", code, e?.message);
    }
  }
}

/**
 * Update event: tambah attachments + update deskripsi dengan ringkasan lampiran.
 */
export async function updateEventAttachments(args: UpdateAttachmentArgs, subjectEmail?: string) {
  if (!process.env.GOOGLE_CLIENT_EMAIL || !process.env.GOOGLE_PRIVATE_KEY) {
      throw new Error("Kredensial Google Service Account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) belum dikonfigurasi di file .env Anda.");
  }
  const auth = getAuth(subjectEmail);
  const calendar = google.calendar({ version: "v3", auth });
  const drive = google.drive({ version: "v3", auth });

  // Normalisasi semua file per grup → pastikan punya fileId, izin, lalu jadi attachment
  const attachments: any[] = [];

  for (const group of args.groups) {
    for (const f of group.files) {
      const id = f.fileId || extractFileId(f.webViewLink || "");
      if (!id) continue;

      // Ambil metadata (nama + mime) jika belum ada
      let name = f.name;
      let mimeType = f.mimeType;
      if (!name || !mimeType) {
        try {
            const meta = await drive.files.get({ fileId: id, fields: "name,mimeType,webViewLink" });
            name = name || meta.data.name || id;
            mimeType = mimeType || meta.data.mimeType || "application/octet-stream";
            // Simpan link balik agar user bisa klik di deskripsi
            f.webViewLink = f.webViewLink || meta.data.webViewLink || `https://drive.google.com/open?id=${id}`;
        } catch (driveError: any) {
             console.error(`Gagal mendapatkan metadata untuk fileId ${id}:`, driveError.message);
             // Tetap lanjutkan dengan data yang ada
             name = name || id;
             mimeType = mimeType || "application/octet-stream";
        }
      }

      // Pastikan bisa diakses publik via link (viewer)
      await ensureAnyoneViewer(drive, id);

      attachments.push({
        fileId: id,
        fileUrl: `https://drive.google.com/open?id=${id}`,
        title: name,
        mimeType,
        iconLink: iconLinkFor(mimeType),
      });
    }
  }

  // Ambil event existing → hapus blok lampiran lama dari deskripsi
  const ev = await calendar.events.get({
    calendarId: args.calendarId,
    eventId: args.eventId,
    fields: 'description,attachments'
  });

  const oldDesc = ev.data.description || "";
  // Hapus blok teks lampiran lama (jika ada) agar tidak dobel
  const cleanedDescription = oldDesc.replace(/\n\nLampiran \(\d+ file\)[\s\S]*/m, "").trim();
  
  // Gabungkan lampiran lama dan baru
  const existingAttachments = ev.data.attachments || [];
  const combinedAttachments = [...existingAttachments];
  attachments.forEach(newAtt => {
      if (!existingAttachments.some(exAtt => exAtt.fileId === newAtt.fileId)) {
          combinedAttachments.push(newAtt);
      }
  });


  // Patch event
  const res = await calendar.events.patch({
    calendarId: args.calendarId,
    eventId: args.eventId,
    supportsAttachments: true,
    requestBody: {
      description: cleanedDescription, // Gunakan deskripsi yang sudah dibersihkan
      attachments: combinedAttachments,
    },
  });

  return {
    eventId: res.data.id,
    htmlLink: res.data.htmlLink,
    attachmentsAdded: attachments.length,
  };
}
