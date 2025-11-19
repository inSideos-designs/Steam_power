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

const CALENDAR_SCOPES = ['https://www.googleapis.com/auth/calendar'];

let calendarClient: calendar_v3.Calendar | null = null;
let authClient: InstanceType<typeof google.auth.JWT> | null = null;

const getCalendarConfig = (): CalendarConfig => ({
  clientEmail: process.env.GOOGLE_CLIENT_EMAIL,
  privateKey: process.env.GOOGLE_PRIVATE_KEY,
  calendarId: process.env.GOOGLE_CALENDAR_ID,
});

export const hasGoogleCalendarConfig = () => {
  const { clientEmail, privateKey, calendarId } = getCalendarConfig();
  return Boolean(clientEmail && privateKey && calendarId);
};

const sanitisePrivateKey = (key?: string) => {
  if (!key) return undefined;

  // If the key is Base64 encoded, decode it
  if (key.startsWith('LS0tQkVHSU4')) {
    try {
      return Buffer.from(key, 'base64').toString('utf-8');
    } catch {
      // Not base64, continue with other methods
    }
  }

  // Replace escaped newlines with actual newlines
  return key.replace(/\\n/g, '\n');
};

const getAuthClient = () => {
  if (!hasGoogleCalendarConfig()) {
    throw new Error('Google Calendar configuration is incomplete.');
  }

  if (authClient) {
    return authClient;
  }

  const { clientEmail, privateKey } = getCalendarConfig();

  authClient = new google.auth.JWT({
    email: clientEmail,
    key: sanitisePrivateKey(privateKey),
    scopes: CALENDAR_SCOPES,
  });

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

