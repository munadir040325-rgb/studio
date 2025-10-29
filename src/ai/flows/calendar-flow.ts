
'use server';

import 'dotenv/config'

/**
 * @fileOverview Flow for interacting with Google Calendar.
 *
 * - createCalendarEvent - Creates a new event in a specified Google Calendar.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';

const calendarId = process.env.NEXT_PUBLIC_CALENDAR_ID;

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
  attachmentUrl: z.string().url().optional().or(z.literal('')),
  attachmentName: z.string().optional(),
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

const updateEventInputSchema = z.object({
  eventId: z.string(),
  resultFolderUrl: z.string().url().optional(),
  attachments: z.array(z.object({
    name: z.string(),
    webViewLink: z.string().url(),
    fileId: z.string(),
    mimeType: z.string(),
  })).optional(),
});


export type UpdateEventInput = z.infer<typeof updateEventInputSchema>;

function areCredentialsConfigured() {
    return process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
}

function getFormattedPrivateKey(key?: string): string | undefined {
    if (!key) return undefined;
    // The key from environment variables often has escaped newlines (\\n).
    // We must replace them with actual newline characters (\n).
    return key.replace(/\\n/g, '\n');
}


export async function getGoogleAuth(scopes: string | string[]) {
  if (!areCredentialsConfigured()) {
      return null;
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: getFormattedPrivateKey(process.env.GOOGLE_PRIVATE_KEY),
    },
    scopes: scopes,
  });
  return auth;
}

export const createCalendarEventFlow = ai.defineFlow(
  {
    name: 'createCalendarEventFlow',
    inputSchema: createEventInputSchema,
    outputSchema: calendarEventSchema,
  },
  async (input) => {
    if (!calendarId) {
        throw new Error("ID Kalender (NEXT_PUBLIC_CALENDAR_ID) belum diatur di environment variables.");
    }
      
    let descriptionParts: string[] = [];

    // Main description
    if (input.description) {
        // Check for 'Disposisi' and add pin emoji
        const disposisiRegex = /^(Disposisi:.*)/im;
        if (disposisiRegex.test(input.description)) {
            descriptionParts.push(input.description.replace(disposisiRegex, '📍 $1'));
        } else {
            descriptionParts.push(input.description);
        }
    }

    const finalDescription = descriptionParts.join('<br><br>');

    // Create the calendar event
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
            supportsAttachments: true,
        });
        return response.data as CalendarEvent;
    } catch (error: any) {
        throw new Error(`Gagal membuat acara di Google Calendar: ${error.message}`);
    }
  }
);

export const updateCalendarEventFlow = ai.defineFlow(
    {
      name: 'updateCalendarEventFlow',
      inputSchema: updateEventInputSchema,
      outputSchema: calendarEventSchema,
    },
    async (input) => {
        if (!calendarId) {
            throw new Error("ID Kalender (NEXT_PUBLIC_CALENDAR_ID) belum diatur di environment variables.");
        }
        
        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/calendar']);
        if (!auth) {
            throw new Error("Tidak dapat memperbarui kegiatan: Kredensial Google Calendar (Service Account) belum diatur.");
        }
        const calendar = google.calendar({ version: 'v3', auth });

        try {
            // 1. Get the existing event
            const existingEvent = await calendar.events.get({
                calendarId: calendarId,
                eventId: input.eventId,
            });

            if (!existingEvent.data) {
                throw new Error("Kegiatan yang akan diperbarui tidak ditemukan.");
            }

            // 2. Prepare the new description with link to result folder
            let description = existingEvent.data.description || '';
            if (input.resultFolderUrl) {
                const resultLinkText = `Link Hasil Kegiatan: <a href="${input.resultFolderUrl}">Folder Hasil</a>`;
                // Avoid adding duplicate links
                if (!description.includes(input.resultFolderUrl)) {
                    if (description) {
                       description += `<br><br>${resultLinkText}`;
                    } else {
                       description = resultLinkText;
                    }
                }
            }
            
            // 3. Prepare the new attachments in the correct Google Calendar API format
            const existingAttachments = existingEvent.data.attachments || [];
            const newAttachments = (input.attachments || []).map(att => ({
                fileId: att.fileId,
                title: att.name,
                mimeType: att.mimeType,
                fileUrl: att.webViewLink, // Google Calendar API requires fileUrl for attachments
            }));

            // Combine existing attachments with new ones, avoiding duplicates by fileId
            const combinedAttachments = [...existingAttachments];
            newAttachments.forEach(newAtt => {
                if (!existingAttachments.some(exAtt => exAtt.fileId === newAtt.fileId)) {
                    combinedAttachments.push(newAtt);
                }
            });


            // 4. Update the event with the new description and attachments
            const response = await calendar.events.patch({
                calendarId: calendarId,
                eventId: input.eventId,
                requestBody: {
                    description: description.trim(),
                    attachments: combinedAttachments,
                },
                supportsAttachments: true,
            });

            return response.data as CalendarEvent;

        } catch (error: any) {
            console.error("Error updating Google Calendar event:", error);
            if (error.response?.data?.error?.message) {
                // Extract more specific error from Google API response
                const gapiError = error.response.data.error;
                throw new Error(`Gagal memperbarui kegiatan di Google Calendar: ${gapiError.message} (Code: ${gapiError.code})`);
            }
            if (error.message.includes('supportsAttachments')) {
                 throw new Error(`Gagal menambahkan lampiran ke acara. Pastikan fitur "Lampiran" diaktifkan untuk kalender Anda.`);
            }
            throw new Error(`Gagal memperbarui kegiatan di Google Calendar: ${error.message}`);
        }
    }
);


export async function createCalendarEvent(input: Omit<CreateEventInput, 'attachmentUrl' | 'attachmentName'>): Promise<CalendarEvent> {
    if (!areCredentialsConfigured()) {
      throw new Error("Kredensial Google Service Account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) belum dikonfigurasi di file .env Anda.");
    }
    return createCalendarEventFlow({ ...input, attachmentUrl: '', attachmentName: '' });
}

export async function updateCalendarEvent(input: UpdateEventInput): Promise<CalendarEvent> {
    if (!areCredentialsConfigured()) {
      throw new Error("Kredensial Google Service Account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) belum dikonfigurasi di file .env Anda.");
    }
    return updateCalendarEventFlow(input);
}
