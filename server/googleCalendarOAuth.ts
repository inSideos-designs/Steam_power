import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'url';
import { authenticate } from '@google-cloud/local-auth';
import { google, calendar_v3 } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// The scope for reading calendar events.
const SCOPES = ['https://www.googleapis.com/auth/calendar'];

// The path to the credentials file.
const CREDENTIALS_PATH = path.join(__dirname, '../credentials.json');

// The path to the token file (cached authorization).
const TOKEN_PATH = path.join(__dirname, '../token.json');

let cachedAuth: any = null;
let cachedCalendar: calendar_v3.Calendar | null = null;

/**
 * Reads previously authorized credentials from the save file.
 */
async function loadSavedCredentials() {
  try {
    const fs = await import('fs/promises');
    const content = await fs.readFile(TOKEN_PATH, 'utf8');
    const credentials = JSON.parse(content);
    return google.auth.fromJSON(credentials);
  } catch (err) {
    return null;
  }
}

/**
 * Serializes credentials to a file compatible with GoogleAuth.fromJSON.
 */
async function saveCredentials(auth: any) {
  const fs = await import('fs/promises');
  const key = auth.key || (await auth.getCredentials());
  const content = await fs.readFile(CREDENTIALS_PATH, 'utf8');
  const keys = JSON.parse(content);
  const payload = JSON.stringify({
    type: 'authorized_user',
    client_id: keys.installed.client_id,
    client_secret: keys.installed.client_secret,
    refresh_token: auth.credentials.refresh_token,
  });
  await fs.writeFile(TOKEN_PATH, payload);
}

/**
 * Load or create an authorization and return an authorized OAuth2 client.
 * If the scopes have changed, delete the token file.
 */
async function authorize() {
  if (cachedAuth) {
    return cachedAuth;
  }

  let auth = await loadSavedCredentials();
  if (auth) {
    cachedAuth = auth;
    return auth;
  }

  auth = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });

  if (auth.credentials) {
    await saveCredentials(auth);
  }

  cachedAuth = auth;
  return auth;
}

/**
 * Get the authenticated calendar client.
 */
async function getCalendarClient(): Promise<calendar_v3.Calendar> {
  if (cachedCalendar) {
    return cachedCalendar;
  }

  const auth = await authorize();
  cachedCalendar = google.calendar({ version: 'v3', auth });
  return cachedCalendar;
}

/**
 * Lists the next N events on the user's primary calendar.
 */
export async function listUpcomingEvents(maxResults: number = 10) {
  const calendar = await getCalendarClient();

  const result = await calendar.events.list({
    calendarId: 'primary',
    timeMin: new Date().toISOString(),
    maxResults,
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = result.data.items;

  if (!events || events.length === 0) {
    return { events: [] };
  }

  return {
    events: events.map((event) => ({
      id: event.id,
      summary: event.summary,
      start: event.start?.dateTime || event.start?.date,
      end: event.end?.dateTime || event.end?.date,
      description: event.description,
    })),
  };
}

/**
 * Get available time slots for a given date.
 * Returns busy and free periods based on calendar events.
 */
export async function getAvailableSlots(
  date: string,
  businessHoursStart: number = 9,
  businessHoursEnd: number = 17,
  slotDurationMinutes: number = 60,
) {
  const calendar = await getCalendarClient();
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);

  const result = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startOfDay.toISOString(),
    timeMax: endOfDay.toISOString(),
    singleEvents: true,
    orderBy: 'startTime',
  });

  const events = result.data.items || [];

  // Generate all possible slots for the day
  const slots = [];
  const slotStartTime = new Date(startOfDay);
  slotStartTime.setHours(businessHoursStart, 0, 0, 0);

  const slotEndTime = new Date(startOfDay);
  slotEndTime.setHours(businessHoursEnd, 0, 0, 0);

  while (slotStartTime < slotEndTime) {
    const slotEnd = new Date(slotStartTime);
    slotEnd.setMinutes(slotEnd.getMinutes() + slotDurationMinutes);

    // Check if this slot conflicts with any event
    const isBooked = events.some((event) => {
      const eventStart = new Date(event.start?.dateTime || event.start?.date || 0);
      const eventEnd = new Date(event.end?.dateTime || event.end?.date || 0);
      return slotStart < eventEnd && slotEnd > eventStart;
    });

    slots.push({
      start: slotStartTime.toISOString(),
      end: slotEnd.toISOString(),
      available: !isBooked,
    });

    slotStartTime.setMinutes(slotStartTime.getMinutes() + slotDurationMinutes);
  }

  return { date, slots };
}

/**
 * Create a calendar event.
 */
export async function createEvent(eventDetails: {
  summary: string;
  description?: string;
  startTime: string;
  endTime: string;
  attendees?: Array<{ email: string; displayName?: string }>;
}) {
  const calendar = await getCalendarClient();

  const event: calendar_v3.Schema$Event = {
    summary: eventDetails.summary,
    description: eventDetails.description,
    start: {
      dateTime: eventDetails.startTime,
    },
    end: {
      dateTime: eventDetails.endTime,
    },
    attendees: eventDetails.attendees,
  };

  const result = await calendar.events.insert({
    calendarId: 'primary',
    requestBody: event,
    sendUpdates: 'all',
  });

  return result.data;
}

/**
 * Check if a time slot is available.
 */
export async function isTimeSlotAvailable(startTime: string, endTime: string) {
  const calendar = await getCalendarClient();

  const result = await calendar.events.list({
    calendarId: 'primary',
    timeMin: startTime,
    timeMax: endTime,
    singleEvents: true,
  });

  const events = result.data.items || [];
  return events.length === 0;
}
