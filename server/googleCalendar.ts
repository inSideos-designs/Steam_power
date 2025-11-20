import { google, calendar_v3 } from 'googleapis';
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
  bookingId?: string;
}

const CALENDAR_SCOPES = 'https://www.googleapis.com/auth/calendar';

let calendarClient: calendar_v3.Calendar | null = null;
let authClient: any = null;

const normalisePrivateKey = (key: string) => {
  let normalised = key;

  // Handle escaped newlines (\\n -> \n)
  if (normalised.includes('\\n')) {
    normalised = normalised.replace(/\\n/g, '\n');
  }

  // Ensure Windows-style newlines or stray carriage returns don't break OpenSSL parsing
  normalised = normalised.replace(/\r\n?/g, '\n');

  // Ensure BEGIN and END markers are on their own lines
  normalised = normalised
    .replace(/-----BEGIN[^-]*-----\s*/g, (match) => match.trim() + '\n')
    .replace(/\s*-----END[^-]*-----/, (match) => '\n' + match.trim());

  // Clean up any multiple blank lines
  normalised = normalised.replace(/\n\s*\n+/g, '\n');

  return normalised.trim();
};

const getEnvCredentials = () => {
  const clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;
  const projectId = process.env.GOOGLE_PROJECT_ID || process.env.GOOGLE_PROJECT_NUMBER;

  if (!clientEmail || !privateKey) {
    return null;
  }

  return {
    clientEmail,
    privateKey: normalisePrivateKey(privateKey),
    projectId,
  };
};

// Get the service account key file path
const getKeyFilePath = (): string | null => {
  const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH;

  if (keyPath && fs.existsSync(keyPath)) {
    console.log('[calendar] Found key file at:', keyPath);
    return keyPath;
  }

  if (keyPath) {
    console.warn('[calendar] GOOGLE_SERVICE_ACCOUNT_KEY_PATH set but file not found:', keyPath);
  }

  return null;
};

export const hasGoogleCalendarConfig = () => {
  const calendarId = process.env.GOOGLE_CALENDAR_ID;

  if (!calendarId) {
    return false;
  }

  const keyPath = getKeyFilePath();

  if (keyPath && fs.existsSync(keyPath)) {
    return true;
  }

  return Boolean(getEnvCredentials());
};

const getAuthClient = async () => {
  if (authClient) {
    return authClient;
  }

  const keyPath = getKeyFilePath();

  if (keyPath && fs.existsSync(keyPath)) {
    console.log('[calendar] Using GoogleAuth with keyFile:', keyPath);
    authClient = new google.auth.GoogleAuth({
      keyFile: keyPath,
      scopes: CALENDAR_SCOPES,
    });

    return authClient;
  }

  const envCredentials = getEnvCredentials();

  if (envCredentials) {
    console.log('[calendar] Using GoogleAuth from environment variables');
    authClient = new google.auth.GoogleAuth({
      credentials: {
        client_email: envCredentials.clientEmail,
        private_key: envCredentials.privateKey,
        project_id: envCredentials.projectId,
      },
      scopes: CALENDAR_SCOPES,
    });

    return authClient;
  }

  console.error('[calendar] ERROR: No Google service account credentials found.');
  console.error('[calendar] GOOGLE_SERVICE_ACCOUNT_KEY_PATH env var:', process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH);
  throw new Error(
    'Google Calendar credentials not found. ' +
    'Set GOOGLE_SERVICE_ACCOUNT_KEY_PATH to a service account JSON file or configure GOOGLE_CLIENT_EMAIL and GOOGLE_PRIVATE_KEY.'
  );
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

/**
 * Check for conflicts across primary calendar and shared calendars.
 * Prevents double booking on any calendar the service account has access to.
 */
export const checkCalendarConflicts = async (
  startIso: string,
  endIso: string
) => {
  try {
    const { calendar, calendarId } = await getCalendarClient();

    // Get all calendars the service account has access to
    const calendarsList = await calendar.calendarList.list();
    const calendars = calendarsList.data.items ?? [];

    console.log(`[calendar] Checking conflicts across ${calendars.length} calendar(s)`);

    // Check each calendar for conflicts
    for (const cal of calendars) {
      if (!cal.id) continue;

      try {
        const response = await calendar.events.list({
          calendarId: cal.id,
          timeMin: startIso,
          timeMax: endIso,
          singleEvents: true,
          orderBy: 'startTime',
          maxResults: 1,
        });

        const items = response.data.items ?? [];
        const hasConflict = items.some((event) => event.status !== 'cancelled');

        if (hasConflict) {
          console.log(`[calendar] Conflict found in calendar: ${cal.summary || cal.id}`);
          return true;
        }
      } catch (calError) {
        // Log but continue checking other calendars
        console.warn(
          `[calendar] Could not check calendar ${cal.summary || cal.id}:`,
          calError instanceof Error ? calError.message : 'Unknown error'
        );
      }
    }

    console.log('[calendar] No conflicts found across all calendars');
    return false;
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
      extendedProperties: normaliseExtendedProperties(
        payload.extendedProperties
      ),
    };

    console.log('[calendar] Creating event with calendarId:', calendarId);

    // Use requestId to prevent duplicate events if the request is retried
    // This makes the operation idempotent - same requestId = same event
    const requestId = payload.bookingId || `booking-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    const response = await calendar.events.insert({
      calendarId,
      requestBody: request,
      requestId,
      sendUpdates: 'none',
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
