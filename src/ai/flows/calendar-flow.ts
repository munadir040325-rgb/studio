'use server';
/**
 * @fileOverview Flow for interacting with Google Calendar.
 *
 * - listCalendarEvents - Fetches events from a specified Google Calendar.
 * - createCalendarEvent - Creates a new event in a specified Google Calendar.
 */

import { ai } from '@/ai/genkit';
import { z } from 'genkit/zod';
import { google } from 'googleapis';
import {defineFlow} from 'genkit/flow';

const calendarId = 'kecamatan.gandrungmangu2020@gmail.com';

const calendarEventSchema = z.object({
  id: z.string().optional().nullable(),
  summary: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  start: z.object({
    dateTime: z.string().optional().nullable(),
    timeZone: z.string().optional().nullable(),
  }).optional().nullable(),
  end: z.object({
    dateTime: z.string().optional().nullable(),
    timeZone: z.string().optional().nullable(),
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
});

export type CreateEventInput = z.infer<typeof createEventInputSchema>;

async function getGoogleAuth() {
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: process.env.GOOGLE_CLIENT_EMAIL,
      private_key: process.env.GOOGLE_PRIVATE_KEY?.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/calendar'],
  });
  return auth;
}

export const listCalendarEventsFlow = defineFlow(
  {
    name: 'listCalendarEventsFlow',
    inputSchema: z.void(),
    outputSchema: z.array(calendarEventSchema),
  },
  async () => {
    const auth = await getGoogleAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const response = await calendar.events.list({
      calendarId: calendarId,
      timeMin: new Date().toISOString(),
      maxResults: 20,
      singleEvents: true,
      orderBy: 'startTime',
    });

    return (response.data.items || []) as CalendarEvent[];
  }
);

export const createCalendarEventFlow = defineFlow(
  {
    name: 'createCalendarEventFlow',
    inputSchema: createEventInputSchema,
    outputSchema: calendarEventSchema,
  },
  async (input) => {
    const auth = await getGoogleAuth();
    const calendar = google.calendar({ version: 'v3', auth });

    const event = {
      summary: input.summary,
      description: input.description,
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

    const response = await calendar.events.insert({
      calendarId: calendarId,
      requestBody: event,
    });

    return response.data as CalendarEvent;
  }
);

export async function listCalendarEvents(): Promise<CalendarEvent[]> {
    return listCalendarEventsFlow();
}

export async function createCalendarEvent(input: CreateEventInput): Promise<CalendarEvent> {
    return createCalendarEventFlow(input);
}
