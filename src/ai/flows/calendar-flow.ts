
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
  attachmentUrl: z.string().url().optional(),
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

function areCredentialsConfigured() {
    return process.env.GOOGLE_CLIENT_EMAIL && process.env.GOOGLE_PRIVATE_KEY;
}

function getFormattedPrivateKey(key?: string): string | undefined {
    if (!key) return undefined;
    try {
        // Attempt to parse the key as JSON to handle cases where it's a JSON string literal (e.g., "...\n...")
        // Then replace the literal \n with actual newlines.
        return JSON.parse(`"${key}"`);
    } catch {
        // If it fails, it's likely already in a usable format (or an invalid one).
        // Fallback to the original implementation for broader compatibility.
        return key.replace(/\\n/g, '\n');
    }
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
      
    let finalDescription = input.description || '';

    // Append the link to the calendar event description
    if (input.attachmentUrl) {
        finalDescription += `\n\nLampiran Surat Tugas/Undangan: ${input.attachmentUrl}`;
    }

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
