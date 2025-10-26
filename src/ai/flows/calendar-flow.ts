
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
// ID folder root di Google Drive tempat semua folder bagian berada
const rootDriveFolderId = '1-XYZ...'; // GANTI DENGAN ID FOLDER GOOGLE DRIVE ANDA

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
    department: z.string(),
    fileType: z.string(),
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

/**
 * Finds a folder by name within a specific parent folder. If not found, creates it.
 * @param drive - Google Drive API instance.
 * @param name - The name of the folder to find or create.
 * @param parentId - The ID of the parent folder.
 * @returns The ID of the found or created folder.
 */
async function findOrCreateFolder(drive: any, name: string, parentId: string): Promise<string> {
    const query = `'${parentId}' in parents and mimeType='application/vnd.google-apps.folder' and name='${name}' and trashed=false`;
    
    try {
        const res = await drive.files.list({
            q: query,
            fields: 'files(id, name)',
            spaces: 'drive',
        });

        if (res.data.files && res.data.files.length > 0) {
            return res.data.files[0].id!; // Folder found
        } else {
            // Folder not found, create it
            const fileMetadata = {
                name: name,
                mimeType: 'application/vnd.google-apps.folder',
                parents: [parentId],
            };
            const folder = await drive.files.create({
                requestBody: fileMetadata,
                fields: 'id',
            });
            return folder.data.id!; // Return new folder's ID
        }
    } catch (error: any) {
        console.error(`Failed to find or create folder '${name}':`, error);
        throw new Error(`Failed to find or create folder '${name}'.`);
    }
}


const uploadFileFlow = ai.defineFlow(
    {
        name: 'uploadFileFlow',
        inputSchema: attachmentSchema,
        outputSchema: z.string().url(),
    },
    async (fileData) => {
        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/drive']);
        if (!auth) {
            throw new Error("Tidak dapat mengunggah file: Kredensial Google Drive belum diatur.");
        }
        const drive = google.drive({ version: 'v3', auth });

        // 1. Find or create the department folder inside the root folder
        const departmentFolderId = await findOrCreateFolder(drive, fileData.department, rootDriveFolderId);

        // 2. Find or create the file type subfolder (e.g., "Notulen") inside the department folder
        const fileTypeFolderId = await findOrCreateFolder(drive, fileData.fileType, departmentFolderId);

        // 3. Upload the file to the target folder
        const fileMetadata = {
            name: fileData.filename,
            parents: [fileTypeFolderId],
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
