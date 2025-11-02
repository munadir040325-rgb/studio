
'use server';

import 'dotenv/config'

/**
 * @fileOverview Flow for interacting with Google Calendar.
 *
 * - createCalendarEvent - Creates a new event in a specified Google Calendar.
 * - updateCalendarEvent - Updates an existing event in a specified Google Calendar.
 * - deleteCalendarEvent - Deletes an event from a specified Google Calendar.
 */

import { ai } from '@/ai/genkit';
import { z } from 'zod';
import { google } from 'googleapis';
import { getGoogleAuth } from '../google-services';

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

const deleteEventInputSchema = z.object({
    eventId: z.string(),
});
export type DeleteEventInput = z.infer<typeof deleteEventInputSchema>;


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

export const deleteCalendarEventFlow = ai.defineFlow(
    {
        name: 'deleteCalendarEventFlow',
        inputSchema: deleteEventInputSchema,
        outputSchema: z.object({ status: z.string() }),
    },
    async (input) => {
        if (!calendarId) {
            throw new Error("ID Kalender (NEXT_PUBLIC_CALENDAR_ID) belum diatur.");
        }
        const auth = await getGoogleAuth(['https://www.googleapis.com/auth/calendar']);
        const calendar = google.calendar({ version: 'v3', auth });

        try {
            await calendar.events.delete({
                calendarId,
                eventId: input.eventId,
            });
            return { status: 'deleted' };
        } catch (error: any) {
             if (error.code === 410) { // Gone, already deleted
                console.log(`Event ${input.eventId} sudah dihapus sebelumnya.`);
                return { status: 'already_deleted' };
            }
            throw new Error(`Gagal menghapus acara dari Google Calendar: ${error.message}`);
        }
    }
);


// Wrapper function to call the flow
export async function createCalendarEvent(input: CreateEventInput): Promise<CalendarEvent> {
    return createCalendarEventFlow(input);
}

// Wrapper function to call the flow
export async function updateCalendarEvent(input: UpdateEventInput): Promise<CalendarEvent> {
    return updateCalendarEventFlow(input);
}

// Wrapper function to call the flow
export async function deleteCalendarEvent(input: DeleteEventInput): Promise<{ status: string }> {
    return deleteCalendarEventFlow(input);
}
