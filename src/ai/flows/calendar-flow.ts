
'use server';

import 'dotenv/config'

/**
 * @fileOverview Flow for interacting with Google Calendar and Drive.
 *
 * - createCalendarEvent - Creates a new event in a specified Google Calendar.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { Readable } from 'stream';

const calendarId = 'kecamatan.gandrungmangu2020@gmail.com';
const DRIVE_FOLDER_ID = '1ozMzvJUBgy9h0bq4HXXxN0aPkPW4duCH';
const OWNER_EMAIL = 'kecamatan.gandrungmangu2020@gmail.com';


const calendarEventSchema = z.object({
  id: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  start: z.object({
    dateTime: z.string().optional().nullable(),
    timeZone: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
  }).optional().nullable(),
  end: z.object({
    dateTime: z.string().optional().nullable(),
    timeZone: z.string().optional().nullable(),
    date: z.string().optional().nullable(),
  }).optional().nullable(),
  location: z.string().optional().nullable(),
  htmlLink: z.string().optional().nullable(),
});

export type CalendarEvent = z.infer<typeof calendarEventSchema>;

const createEventInputSchema = z.object({
  summary: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  attachment: z.object({
      filename: z.string(),
      mimetype: z.string(),
      data: z.string(), // base64 encoded string
  }).optional(),
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;


const UploadFileResponseSchema = z.object({
  fileId: z.string(),
  webViewLink: z.string(),
});
export type UploadFileResponse = z.infer<typeof UploadFileResponseSchema>;

function areCredentialsConfigured() {
    return process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
}

export async function getGoogleAuth(scopes: string | string[]) {
  if (!areCredentialsConfigured()) {
      return null;
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: scopes,
  });
  return auth;
}


const uploadFileFlow = ai.defineFlow(
    {
        name: 'uploadFileFlow',
        inputSchema: z.object({
            filename: z.string(),
            mimetype: z.string(),
            data: z.string(), // base64
        }),
        outputSchema: UploadFileResponseSchema,
    },
    async (fileData) => {
        const auth = await getGoogleAuth('https://www.googleapis.com/auth/drive');
        if (!auth) {
            throw new Error("Tidak dapat mengunggah file: Kredensial Google Drive (Service Account) belum diatur.");
        }
        const drive = google.drive({ version: 'v3', auth });
        
        const fileBuffer = Buffer.from(fileData.data, 'base64');
        const media = {
            mimeType: fileData.mimetype,
            body: Readable.from(fileBuffer),
        };

        try {
            const file = await drive.files.create({
                media: media,
                requestBody: {
                    name: fileData.filename,
                    parents: [DRIVE_FOLDER_ID],
                },
                fields: 'id, webViewLink',
            });

            if (!file.data.id || !file.data.webViewLink) {
                 throw new Error("Upload ke Google Drive berhasil tetapi tidak mendapatkan ID atau Link.");
            }

            return {
                fileId: file.data.id,
                webViewLink: file.data.webViewLink,
            };
        } catch (error: any) {
            console.error('Google Drive API Error:', error);
             if (error.code === 403) {
                 throw new Error(`Izin ditolak. Pastikan Service Account memiliki akses 'Editor' ke folder Google Drive dengan ID '${DRIVE_FOLDER_ID}'. Pesan asli: ${error.message}`);
            }
             if (error.code === 404) {
                 throw new Error(`Folder Google Drive dengan ID '${DRIVE_FOLDER_ID}' tidak ditemukan. Mohon periksa kembali ID folder Anda.`);
            }
            throw new Error(`Gagal mengunggah file ke Google Drive: ${error.message}`);
        }
    }
);


export const createCalendarEventFlow = ai.defineFlow(
  {
    name: 'createCalendarEventFlow',
    inputSchema: createEventInputSchema,
    outputSchema: calendarEventSchema,
  },
  async (input) => {
    let finalDescription = input.description || '';
    
    // 1. Upload file if it exists
    let uploadedFileUrl: string | undefined;
    if (input.attachment) {
      try {
        const uploadResponse = await uploadFileFlow(input.attachment);
        uploadedFileUrl = uploadResponse.webViewLink;
      } catch (e: any) {
        // Tangkap error upload dan teruskan ke pengguna
        throw new Error(`Gagal mengunggah lampiran: ${e.message}`);
      }
    }

    // 2. Append the link to the calendar event description
    if (uploadedFileUrl) {
        finalDescription += `\n\nLampiran Surat Tugas/Undangan: ${uploadedFileUrl}`;
    }

    // 3. Create the calendar event
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/calendar']);
    if (!auth) {
        throw new Error("Tidak dapat membuat kegiatan: Kredensial Google Calendar (Service Account) belum diatur.");
    }
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: input.summary,
      description: finalDescription.trim(),
      location: input.location,
      start: {
        dateTime: input.startDateTime,
        timeZone: 'Asia/Jakarta',
      },
      end: {
        dateTime: input.endDateTime,
        timeZone: 'Asia/Jakarta',
      },
    };

    try {
        const response = await calendar.events.insert({
            calendarId: calendarId,
            requestBody: event,
        });
        return response.data as CalendarEvent;
    } catch (error: any) {
        throw new Error(`Gagal membuat acara di Google Calendar: ${error.message}`);
    }
  }
);


export async function createCalendarEvent(input: CreateEventInput): Promise<CalendarEvent> {
    if (!areCredentialsConfigured()) {
      throw new Error("Kredensial Google Service Account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) belum dikonfigurasi di file .env Anda.");
    }
    return createCalendarEventFlow(input);
}
