
'use server';
/**
 * @fileOverview Flow for interacting with Google Calendar and Google Drive.
 *
 * - createCalendarEvent - Creates a new event in a specified Google Calendar, with an optional file attachment uploaded to Google Drive.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { Readable } from 'stream';

const calendarId = 'kecamatan.gandrungmangu2020@gmail.com';

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

const attachmentSchema = z.object({
    filename: z.string(),
    contentType: z.string(),
    data: z.string(), // base64 encoded
});

const createEventInputSchema = z.object({
  summary: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
  attachment: attachmentSchema.optional(),
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

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
        inputSchema: attachmentSchema,
        outputSchema: z.string().url(),
    },
    async (fileData) => {
        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/drive.file']);
        if (!auth) {
            throw new Error("Tidak dapat mengunggah file: Kredensial Google Drive belum diatur.");
        }
        const drive = google.drive({ version: 'v3', auth });

        const fileMetadata = {
            name: fileData.filename,
        };
        const media = {
            mimeType: fileData.contentType,
            body: Readable.from(Buffer.from(fileData.data, 'base64')),
        };

        try {
            const file = await drive.files.create({
                requestBody: fileMetadata,
                media: media,
                fields: 'id, webViewLink',
            });

            // Make file publicly accessible with a link
            await drive.permissions.create({
                fileId: file.data.id!,
                requestBody: {
                    role: 'reader',
                    type: 'anyone',
                },
            });
            
            if (!file.data.webViewLink) {
                throw new Error('Gagal mendapatkan tautan file dari Google Drive.');
            }

            return file.data.webViewLink;

        } catch (error: any) {
            console.error('Google Drive API error:', error);
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

    // Handle file upload if attachment exists
    if (input.attachment) {
        try {
            const fileUrl = await uploadFileFlow(input.attachment);
            finalDescription += `\n\nLampiran: ${fileUrl}`;
        } catch (error: any) {
            // We won't block calendar event creation if file upload fails,
            // but we will add a note about the failure.
            finalDescription += `\n\n(Gagal mengunggah lampiran: ${error.message})`;
        }
    }

    // Use a separate auth instance specifically for the calendar
    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/calendar']);

    if (!auth) {
        throw new Error("Tidak dapat membuat kegiatan: Kredensial Google Calendar belum diatur.");
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
      throw new Error("Kredensial Google (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) belum dikonfigurasi di file .env Anda.");
    }
    return createCalendarEventFlow(input);
}
