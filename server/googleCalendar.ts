import { google, calendar_v3 } from 'googleapis';
import path from 'path';
import fs from 'fs';

export interface CalendarBookingPayload {
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  timeZone: string;
  attendeeEmail?: string;
  attendeeName?: string;
  extendedProperties?: Record<string, string | number | null | undefined>;
}

const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar';

let calendarClient: calendar_v3.Calendar | null = null;
let authClient: any = null;

// Get the service account key file path
const getKeyFilePath = (): string | null => {
  if (process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH) {
    return process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;
  }

  const localPath = path.join(__dirname, '../google-service-account.json');
  if (fs.existsSync(localPath)) {
    return localPath;
  }

  return null;
};

export const hasGoogleCalendarConfig = () => {
  const keyPath = getKeyFilePath();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (keyPath && fs.existsSync(keyPath) && calendarId) {
    return true;
  }

  // Fallback to env vars
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  return Boolean(clientEmail && privateKey && calendarId);
};

const getAuthClient = async () => {
  if (authClient) {
    return authClient;
  }

  const keyPath = getKeyFilePath();

  if (keyPath && fs.existsSync(keyPath)) {
    // Use GoogleAuth with keyFile (most reliable method)
    console.log('[calendar] Using GoogleAuth with keyFile:', keyPath);
    authClient = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: CALENDAR_SCOPES,
    });
  } else {
    // Fallback to credentials from environment variables
    console.log('[calendar] Using GoogleAuth from environment variables');
    const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
    const privateKey = process.env.GOOGLE_PRIVATE_KEY;

    if (!clientEmail || !privateKey) {
      throw new Error('Google Calendar credentials are not configured.');
    }

    authClient = new google.auth.GoogleAuth({
      credentials: {
        client_email: clientEmail,
        private_key: privateKey.replace(/\\n/g, '\n'),
      },
      scopes: CALENDAR_SCOPES,
    });
  }

  return authClient;
};

const getCalendarClient = async () => {
  const auth = await getAuthClient();
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!calendarId) {
    throw new Error('GOOGLE_CALENDAR_ID is not configured.');
  }

  // Create a new calendar client each time to avoid caching issues
  const calendar = google.calendar({ version: 'v3', auth });

  return { calendar, calendarId };
};

export const checkCalendarConflicts = async (
  startIso: string,
  endIso: string
) => {
  try {
    const { calendar, calendarId } = await getCalendarClient();

    const response = await calendar.events.list({
      calendarId,
      timeMin: startIso,
      timeMax: endIso,
      singleEvents: true,
      orderBy: 'startTime',
      maxResults: 1,
    });

    const items = response.data.items ?? [];
    return items.some((event) => event.status !== 'cancelled');
  } catch (error) {
    console.error('[calendar] Error checking conflicts:', error);
    throw error;
  }
};

const normaliseExtendedProperties = (
  props?: CalendarBookingPayload['extendedProperties']
) => {
  if (!props) {
    return undefined;
  }

  const entries = Object.entries(props)
    .filter(([, value]) => value !== undefined && value !== null)
    .map(([key, value]) => [key, String(value)] as const);

  if (!entries.length) {
    return undefined;
  }

  return {
    private: Object.fromEntries(entries),
  };
};

export const createCalendarBooking = async (
  payload: CalendarBookingPayload
) => {
  try {
    const { calendar, calendarId } = await getCalendarClient();

    const request: calendar_v3.Schema$Event = {
      summary: payload.summary,
      description: payload.description,
      start: {
        dateTime: payload.startTime,
        timeZone: payload.timeZone,
      },
      end: {
        dateTime: payload.endTime,
        timeZone: payload.timeZone,
      },
      attendees:
        payload.attendeeEmail && payload.attendeeName
          ? [
              {
                email: payload.attendeeEmail,
                displayName: payload.attendeeName,
              },
            ]
          : payload.attendeeEmail
          ? [
              {
                email: payload.attendeeEmail,
              },
            ]
          : undefined,
      extendedProperties: normaliseExtendedProperties(
        payload.extendedProperties
      ),
    };

    console.log('[calendar] Creating event with calendarId:', calendarId);

    const response = await calendar.events.insert({
      calendarId,
      requestBody: request,
      sendUpdates: 'all',
    });

    if (!response.data) {
      throw new Error('Calendar event creation returned no data.');
    }

    console.log('[calendar] Event created successfully:', response.data.id);
    return response.data;
  } catch (error) {
    console.error(
      '[calendar] Error creating booking:',
      error instanceof Error ? error.message : error
    );
    throw error;
  }
};
