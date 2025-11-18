# Google Calendar OAuth Integration Setup

This guide explains how to set up and use the Google Calendar OAuth integration for your Steam Power Cleaning booking system.

## Overview

Your application now has two Google Calendar integrations:

1. **Service Account (JWT)** - `server/googleCalendar.ts` - Creates and writes events to a business calendar
2. **OAuth User Auth** - `server/googleCalendarOAuth.ts` - Reads events from a user's calendar via OAuth

## Setup Instructions

### 1. Prepare Your OAuth Credentials

You should have a `credentials.json` file already created with your OAuth 2.0 credentials. The structure should look like:

```json
{
  "installed": {
    "client_id": "YOUR_CLIENT_ID.apps.googleusercontent.com",
    "client_secret": "YOUR_CLIENT_SECRET",
    "auth_uri": "https://accounts.google.com/o/oauth2/auth",
    "token_uri": "https://oauth2.googleapis.com/token",
    "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
    "redirect_uris": [
      "http://localhost:3000",
      "http://localhost:4000",
      "urn:ietf:wg:oauth:2.0:oob"
    ]
  }
}
```

This file is in the root directory: `/credentials.json`

### 2. First-Time Authentication

When you first run the server and call any calendar endpoint:

1. The server will prompt you to open a Google sign-in page in your browser
2. Click the link provided in the console output
3. Authorize the app to access your calendar
4. You'll be redirected with an authorization code
5. Paste the code back in the terminal when prompted
6. A `token.json` file will be created automatically to cache the authorization

**Important:** The `token.json` file is automatically added to `.gitignore` for security. Never commit it to version control.

## API Endpoints

### 1. Get Upcoming Events

**Endpoint:** `GET /api/calendar/events`

**Response:**
```json
{
  "events": [
    {
      "id": "event-id-1",
      "summary": "Event Title",
      "start": "2025-11-17T09:00:00Z",
      "end": "2025-11-17T10:00:00Z",
      "description": "Event description"
    }
  ]
}
```

**Example Usage:**
```bash
curl http://localhost:4000/api/calendar/events
```

### 2. Get Available Time Slots

**Endpoint:** `GET /api/calendar/available-slots`

**Query Parameters:**
- `date` (required) - ISO 8601 date string (e.g., `2025-11-17`)
- `businessHoursStart` (optional) - Start hour in 24h format, default: 9
- `businessHoursEnd` (optional) - End hour in 24h format, default: 17
- `slotDuration` (optional) - Duration of each slot in minutes, default: 60

**Response:**
```json
{
  "date": "2025-11-17",
  "slots": [
    {
      "start": "2025-11-17T09:00:00Z",
      "end": "2025-11-17T10:00:00Z",
      "available": true
    },
    {
      "start": "2025-11-17T10:00:00Z",
      "end": "2025-11-17T11:00:00Z",
      "available": false
    }
  ]
}
```

**Example Usage:**
```bash
curl "http://localhost:4000/api/calendar/available-slots?date=2025-11-17&businessHoursStart=9&businessHoursEnd=17&slotDuration=60"
```

### 3. Check Specific Time Slot Availability

**Endpoint:** `POST /api/calendar/check-availability`

**Request Body:**
```json
{
  "startTime": "2025-11-17T09:00:00Z",
  "endTime": "2025-11-17T10:00:00Z"
}
```

**Response:**
```json
{
  "available": true,
  "startTime": "2025-11-17T09:00:00Z",
  "endTime": "2025-11-17T10:00:00Z"
}
```

**Example Usage:**
```bash
curl -X POST http://localhost:4000/api/calendar/check-availability \
  -H "Content-Type: application/json" \
  -d '{
    "startTime": "2025-11-17T09:00:00Z",
    "endTime": "2025-11-17T10:00:00Z"
  }'
```

## How It Works

### Authentication Flow

1. **First Request:** User calls any OAuth calendar endpoint
2. **Authorization Required:** Server checks if `token.json` exists
3. **If No Token:** Browser opens Google login URL
4. **User Grants Permission:** Authorization code is exchanged for tokens
5. **Token Cached:** `token.json` is saved for future requests
6. **Subsequent Requests:** Use cached token automatically

### Automatic Caching

The module caches both:
- Authentication client (`cachedAuth`)
- Calendar API client (`cachedCalendar`)

This improves performance by reusing the same authenticated connection.

## Frontend Integration

You can now use these endpoints in your React components to:

### Display Available Time Slots
```typescript
const fetchAvailableSlots = async (date: string) => {
  const response = await fetch(`/api/calendar/available-slots?date=${date}`);
  const data = await response.json();
  return data.slots;
};
```

### Display Upcoming Events
```typescript
const fetchUpcomingEvents = async () => {
  const response = await fetch('/api/calendar/events');
  const data = await response.json();
  return data.events;
};
```

### Check Before Booking
```typescript
const checkAvailability = async (startTime: string, endTime: string) => {
  const response = await fetch('/api/calendar/check-availability', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ startTime, endTime }),
  });
  const data = await response.json();
  return data.available;
};
```

## Dual Calendar System

Your system now uses **both** calendar methods:

| Feature | Service Account | OAuth User |
|---------|-----------------|-----------|
| **Purpose** | Create bookings | Read calendar |
| **Authentication** | JWT (automatic) | OAuth (user login) |
| **Read Events** | ❌ | ✅ |
| **Write Events** | ✅ | ❌ |
| **Use Case** | Auto-create appointments | Display availability |

The existing `/api/bookings` endpoint continues to use the Service Account to create events automatically.

## Troubleshooting

### "Credentials file not found"
- Ensure `credentials.json` exists in the root directory
- Download it from Google Cloud Console

### "Token expired"
- Delete `token.json` and restart the server
- You'll be prompted to re-authenticate

### "Permission denied"
- Re-authenticate and ensure you grant "Google Calendar" permission
- Check that the Google account has access to the calendar you want to read

### "No events found"
- Ensure the calendar has events
- Check that the date range is correct

## Security Notes

- ✅ `credentials.json` is in `.gitignore` locally (but you have it)
- ✅ `token.json` is in `.gitignore` and never committed
- ✅ Tokens are cached locally and refreshed automatically
- ✅ No sensitive data is logged
- ⚠️  Keep `credentials.json` private (never commit to Git)

## Files Added/Modified

### New Files:
- `server/googleCalendarOAuth.ts` - OAuth calendar operations
- `credentials.json` - Google OAuth credentials (in .gitignore)
- `GOOGLE_CALENDAR_SETUP.md` - This file

### Modified Files:
- `server/index.ts` - Added OAuth calendar endpoints
- `.gitignore` - Added token.json and credentials.json
- `package.json` - Added @google-cloud/local-auth dependency

## Next Steps

1. Start your server: `npm run server`
2. The first call to any calendar endpoint will trigger OAuth authentication
3. Integrate the endpoints into your frontend booking UI
4. Test with your actual Google Calendar

## References

- [Google Calendar API Documentation](https://developers.google.com/workspace/calendar/api)
- [Google OAuth 2.0 Guide](https://developers.google.com/identity/protocols/oauth2)
- [@google-cloud/local-auth NPM Package](https://www.npmjs.com/package/@google-cloud/local-auth)
