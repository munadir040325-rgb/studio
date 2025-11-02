
'use server';

import 'dotenv/config'

/**
 * @fileOverview Flow for interacting with Google Calendar.
 *
 * - createCalendarEvent - Creates a new event in a specified Google Calendar.
 * - updateCalendarEvent - Updates an existing event in a specified Google Calendar.
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

const eventInputSchema = z.object({
  summary: z.string(),
  description: z.string().optional(),
  location: z.string().optional(),
  startDateTime: z.string().datetime(),
  endDateTime: z.string().datetime(),
});

export type CreateEventInput = z.infer<typeof eventInputSchema>;

const updateEventInputSchema = eventInputSchema.extend({
    eventId: z.string(),
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

const createOrUpdateEvent = async (input: CreateEventInput | UpdateEventInput, isUpdate: boolean) => {
    if (!calendarId) {
        throw new Error("ID Kalender (NEXT_PUBLIC_CALENDAR_ID) belum diatur di environment variables.");
    }

    const finalDescription = `📍 Disposisi: ${input.description || ''}`;
    let colorId = '1';
    if (input.description && /camat/i.test(input.description)) {
      colorId = '11';
    }

    const auth = await getGoogleAuth(['https://www.googleapis.com/auth/calendar']);
    if (!auth) {
        throw new Error("Tidak dapat memproses kegiatan: Kredensial Google Calendar (Service Account) belum diatur.");
    }
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: input.summary,
      description: finalDescription.trim(),
      location: input.location,
      start: { dateTime: input.startDateTime, timeZone: 'Asia/Jakarta' },
      end: { dateTime: input.endDateTime, timeZone: 'Asia/Jakarta' },
      colorId: colorId,
      reminders: {
        useDefault: false,
        overrides: [
          { method: 'popup', minutes: 60 },
          { method: 'popup', minutes: 5 },
        ],
      },
    };

    try {
        if (isUpdate) {
            const updateInput = input as UpdateEventInput;
            const response = await calendar.events.patch({
                calendarId: calendarId,
                eventId: updateInput.eventId,
                requestBody: event,
                supportsAttachments: true,
            });
            return response.data as CalendarEvent;
        } else {
            const response = await calendar.events.insert({
                calendarId: calendarId,
                requestBody: event,
                supportsAttachments: true,
            });
            return response.data as CalendarEvent;
        }
    } catch (error: any) {
        const action = isUpdate ? "memperbarui" : "membuat";
        throw new Error(`Gagal ${action} acara di Google Calendar: ${error.message}`);
    }
};


export const createCalendarEventFlow = ai.defineFlow(
  {
    name: 'createCalendarEventFlow',
    inputSchema: eventInputSchema,
    outputSchema: calendarEventSchema,
  },
  async (input) => createOrUpdateEvent(input, false)
);

export const updateCalendarEventFlow = ai.defineFlow(
  {
    name: 'updateCalendarEventFlow',
    inputSchema: updateEventInputSchema,
    outputSchema: calendarEventSchema,
  },
  async (input) => createOrUpdateEvent(input, true)
);

function checkCredentials() {
    if (!areCredentialsConfigured()) {
        throw new Error("Kredensial Google Service Account (GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY) belum dikonfigurasi di file .env Anda.");
    }
}

export async function createCalendarEvent(input: CreateEventInput): Promise<CalendarEvent> {
    checkCredentials();
    return createCalendarEventFlow(input);
}

export async function updateCalendarEvent(input: UpdateEventInput): Promise<CalendarEvent> {
    checkCredentials();
    return updateCalendarEventFlow(input);
}
