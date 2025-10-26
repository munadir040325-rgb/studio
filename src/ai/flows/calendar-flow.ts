
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

export const createCalendarEventFlow = ai.defineFlow(
  {
    name: 'createCalendarEventFlow',
    inputSchema: createEventInputSchema,
    outputSchema: calendarEventSchema,
  },
  async (input) => {
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
