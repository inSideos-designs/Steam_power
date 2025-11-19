import { google, calendar_v3 } from 'googleapis';

interface CalendarConfig {
  clientEmail?: string;
  privateKey?: string;
  calendarId?: string;
}

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
let authClient: InstanceType<typeof google.auth.JWT> | null = null;

const getCalendarConfig = (): CalendarConfig => {
  // Try to load from JSON file first (for local development)
  let clientEmail = process.env.GOOGLE_CLIENT_EMAIL;
  let privateKey = process.env.GOOGLE_PRIVATE_KEY;
  let calendarId = process.env.GOOGLE_CALENDAR_ID;

  // If we have all env vars, use them
  if (clientEmail && privateKey && calendarId) {
    return { clientEmail, privateKey, calendarId };
  }

  // Otherwise try to load from service account JSON file
  try {
    const fs = require('fs');
    const path = require('path');
    const keyPath = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_PATH ||
                    path.join(__dirname, '../google-service-account.json');

    if (fs.existsSync(keyPath)) {
      const keyFile = JSON.parse(fs.readFileSync(keyPath, 'utf8'));
      clientEmail = clientEmail || keyFile.client_email;
      privateKey = privateKey || keyFile.private_key;
      calendarId = calendarId || process.env.GOOGLE_CALENDAR_ID;
    }
  } catch (err) {
    // Silently fail - env vars should be set
  }

  return { clientEmail, privateKey, calendarId };
};

export const hasGoogleCalendarConfig = () => {
  const { clientEmail, privateKey, calendarId } = getCalendarConfig();
  return Boolean(clientEmail && privateKey && calendarId);
};

const sanitisePrivateKey = (key?: string) => {
  if (!key) return undefined;

  let cleanKey = key.trim();

  // Remove surrounding quotes if present (both single and double)
  if ((cleanKey.startsWith('"') && cleanKey.endsWith('"')) ||
      (cleanKey.startsWith("'") && cleanKey.endsWith("'"))) {
    cleanKey = cleanKey.slice(1, -1);
  }

  // Handle both escaped newlines (\\n as two chars) and literal newlines
  // First try JSON parsing for properly escaped strings
  if (cleanKey.includes('\\n')) {
    try {
      // Use JSON.parse to handle the escaping properly
      const json = `"${cleanKey.replace(/"/g, '\\"')}"`;
      const parsed = JSON.parse(json);
      if (parsed && parsed.includes('BEGIN PRIVATE KEY') && parsed.includes('END PRIVATE KEY')) {
        console.log('[calendar] Successfully parsed key as escaped JSON string');
        return parsed;
      }
    } catch (err) {
      console.warn('[calendar] Failed to parse as JSON string:', err instanceof Error ? err.message : err);
    }
  }

  // Try replacing literal \\n sequences with newlines
  let result = cleanKey.replace(/\\n/g, '\n');

  // If still no newlines but we have the markers, it might already have real newlines
  if (!result.includes('\n') && result.includes('BEGIN PRIVATE KEY')) {
    result = cleanKey;
  }

  // Verify it's a valid key
  if (!result.includes('BEGIN PRIVATE KEY') || !result.includes('END PRIVATE KEY')) {
    console.error('[calendar] Key does not contain BEGIN/END PRIVATE KEY markers');
    console.error('[calendar] Key starts with:', result.substring(0, 100));
  } else {
    console.log('[calendar] Private key successfully sanitized');
  }

  return result;
};

const getAuthClient = () => {
  if (!hasGoogleCalendarConfig()) {
    throw new Error('Google Calendar configuration is incomplete.');
  }

  if (authClient) {
    return authClient;
  }

  const { clientEmail, privateKey } = getCalendarConfig();
  const sanitizedKey = sanitisePrivateKey(privateKey);

  if (!sanitizedKey) {
    throw new Error('Failed to parse private key - key is empty after sanitization');
  }

  try {
    // Use the positional parameter format which is more reliable
    authClient = new google.auth.JWT(
      clientEmail,
      null,
      sanitizedKey,
      CALENDAR_SCOPES
    );
    console.log('[calendar] JWT auth client created successfully');
  } catch (error) {
    console.error('[calendar] Failed to create JWT auth client:', error instanceof Error ? error.message : error);
    throw error;
  }

  return authClient;
};

const getCalendarClient = async () => {
  if (!hasGoogleCalendarConfig()) {
    throw new Error('Google Calendar configuration is incomplete.');
  }

  const config = getCalendarConfig();
  const auth = getAuthClient();

  await auth.authorize();

  if (!calendarClient) {
    calendarClient = google.calendar({ version: 'v3', auth });
  }

  return { calendar: calendarClient, config };
};

export const checkCalendarConflicts = async (startIso: string, endIso: string) => {
  const { calendar, config } = await getCalendarClient();

  const response = await calendar.events.list({
    calendarId: config.calendarId!,
    timeMin: startIso,
    timeMax: endIso,
    singleEvents: true,
    orderBy: 'startTime',
    maxResults: 1,
  });

  const items = response.data.items ?? [];
  return items.some((event) => event.status !== 'cancelled');
};

const normaliseExtendedProperties = (props?: CalendarBookingPayload['extendedProperties']) => {
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

export const createCalendarBooking = async (payload: CalendarBookingPayload) => {
  const { calendar, config } = await getCalendarClient();

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
    extendedProperties: normaliseExtendedProperties(payload.extendedProperties),
  };

  const response = await calendar.events.insert({
    calendarId: config.calendarId!,
    requestBody: request,
    sendUpdates: 'all',
  });

  if (!response.data) {
    throw new Error('Calendar event creation returned no data.');
  }

  return response.data;
};

