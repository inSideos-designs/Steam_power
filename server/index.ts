import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVICES } from '../data/services';
import { calculateCartTotals, resolveCartItems } from './services';
import {
  hasGoogleCalendarConfig,
  createCalendarBooking,
} from './googleCalendar';
import { listUpcomingEvents, getAvailableSlots, isTimeSlotAvailable } from './googleCalendarOAuth';
import { hasEmailConfig, sendBookingConfirmation } from './email';
import {
  isValidBookingTime,
  suggestAlternativeTimes,
  formatSuggestedTimes,
} from './availability';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.PORT || process.env.API_PORT || 4000);

if (!hasGoogleCalendarConfig()) {
  console.warn(
    '[calendar] Google Calendar service account is not fully configured — POST /api/bookings will fail until credentials are provided.',
  );
}

if (!hasEmailConfig()) {
  console.warn('[email] SMTP configuration is missing — booking confirmations will not be sent.');
}

app.use(cors());
app.use(express.json());

const distPath = path.resolve(__dirname, '../dist');
app.use(express.static(distPath));

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/services', (_req, res) => {
  res.json({ services: getServiceListForApi() });
});

// OAuth Calendar endpoints
app.get('/api/calendar/events', async (_req, res) => {
  try {
    const events = await listUpcomingEvents(10);
    res.json(events);
  } catch (error) {
    console.error('[calendar] Error listing events', error);
    res.status(500).json({
      error: 'Unable to fetch calendar events. Make sure you have authenticated with Google Calendar.',
    });
  }
});

app.get('/api/calendar/available-slots', async (req, res) => {
  try {
    const date = req.query.date as string;
    if (!date) {
      return res.status(400).json({ error: 'date query parameter is required (ISO 8601 format)' });
    }

    const businessHoursStart = req.query.businessHoursStart
      ? Number(req.query.businessHoursStart)
      : 9;
    const businessHoursEnd = req.query.businessHoursEnd ? Number(req.query.businessHoursEnd) : 17;
    const slotDuration = req.query.slotDuration ? Number(req.query.slotDuration) : 60;

    const slots = await getAvailableSlots(date, businessHoursStart, businessHoursEnd, slotDuration);
    res.json(slots);
  } catch (error) {
    console.error('[calendar] Error getting available slots', error);
    res.status(500).json({
      error: 'Unable to fetch available slots. Make sure you have authenticated with Google Calendar.',
    });
  }
});

app.post('/api/calendar/check-availability', async (req, res) => {
  try {
    const { startTime, endTime } = req.body;

    if (!startTime || !endTime) {
      return res.status(400).json({ error: 'startTime and endTime are required' });
    }

    const available = await isTimeSlotAvailable(startTime, endTime);
    res.json({ available, startTime, endTime });
  } catch (error) {
    console.error('[calendar] Error checking availability', error);
    res.status(500).json({
      error: 'Unable to check availability. Make sure you have authenticated with Google Calendar.',
    });
  }
});

app.get('/api/calendar/booked-times', async (req, res) => {
  try {
    const dateString = req.query.date as string;
    if (!dateString) {
      return res.status(400).json({ error: 'date query parameter required (YYYY-MM-DD)' });
    }

    // Parse the date
    const date = new Date(`${dateString}T00:00:00Z`);
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Get booked events for this day
    const events = await listUpcomingEvents(100);

    const bookedTimes = events.events
      .filter((event) => {
        const eventDate = new Date(event.start || '');
        return (
          eventDate >= startOfDay &&
          eventDate < new Date(endOfDay.getTime() + 1000)
        );
      })
      .map((event) => ({
        start: event.start,
        end: event.end,
        summary: event.summary,
      }));

    res.json({
      date: dateString,
      bookedTimes,
    });
  } catch (error) {
    console.error('[calendar] Error fetching booked times:', error instanceof Error ? error.message : error);
    // Return empty array gracefully - conflicts will still be checked at booking time
    res.json({
      date: req.query.date as string,
      bookedTimes: [],
      warning: 'Could not fetch calendar, showing all times as available',
    });
  }
});

app.post('/api/bookings', async (req, res) => {
  if (!hasGoogleCalendarConfig()) {
    return res.status(500).json({ error: 'Google Calendar credentials are missing on the server.' });
  }

  const body = req.body ?? {};

  const rawItems: { serviceId: string; quantity: number }[] = Array.isArray(body.items)
    ? body.items
      .filter((item: any) => typeof item?.serviceId === 'string')
      .map((item: any) => ({
        serviceId: item.serviceId,
        quantity: Number.isFinite(item.quantity) ? item.quantity : 1,
      }))
    : typeof body.serviceId === 'string'
      ? [
        {
          serviceId: body.serviceId,
          quantity: Number.isFinite(body.quantity) ? body.quantity : 1,
        },
      ]
      : [];

  if (!rawItems.length) {
    return res.status(400).json({ error: 'At least one service selection is required.' });
  }

  let cartItems;
  try {
    cartItems = resolveCartItems(rawItems);
  } catch (error) {
    return res.status(404).json({
      error: error instanceof Error ? error.message : 'One or more services could not be found.',
    });
  }

  const customerName: string | undefined = body.customer?.name ?? body.name;
  const customerEmail: string | undefined = body.customer?.email ?? body.email;
  const customerPhone: string | undefined = body.customer?.phone ?? body.phone;
  const notes: string | undefined = body.notes ?? body.customer?.notes ?? body.details;

  if (typeof customerName !== 'string' || !customerName.trim()) {
    return res.status(400).json({ error: 'A customer name is required.' });
  }

  if (typeof customerEmail !== 'string' || !customerEmail.trim()) {
    return res.status(400).json({ error: 'A customer email is required.' });
  }

  const requestedStart: string | undefined = body.requestedStart ?? body.startTime;
  if (typeof requestedStart !== 'string') {
    return res.status(400).json({ error: 'requestedStart must be an ISO-8601 string.' });
  }

  const startDate = new Date(requestedStart);
  if (Number.isNaN(startDate.getTime())) {
    return res.status(400).json({ error: 'Invalid requestedStart format.' });
  }

  const { totalPriceCents, totalDurationMinutes } = calculateCartTotals(cartItems);
  const durationMinutes = totalDurationMinutes > 0 ? totalDurationMinutes : 60;
  const endDate = new Date(startDate.getTime() + durationMinutes * 60 * 1000);

  if (endDate <= startDate) {
    return res.status(400).json({ error: 'Unable to calculate booking duration.' });
  }

  const timeZone = typeof body.timeZone === 'string' && body.timeZone ? body.timeZone : 'UTC';

  // Check if booking is within allowed days and business hours
  const bookingValidation = isValidBookingTime(startDate, endDate);
  if (!bookingValidation.valid) {
    const suggestions = suggestAlternativeTimes(startDate, endDate, durationMinutes);
    const suggestedTimesText = formatSuggestedTimes(suggestions);
    return res.status(400).json({
      error: bookingValidation.reason || 'Invalid booking time.',
      suggestedTimes: suggestions.map((s) => ({
        date: s.start.toISOString(),
        dayName: s.dayName,
        timeRange: s.timeRange,
      })),
      suggestedTimesText,
    });
  }

  // Double bookings are allowed, so we skip the conflict check.
  // const hasConflict = await checkCalendarConflicts(startDate.toISOString(), endDate.toISOString());
  // if (hasConflict) { ... }

  try {
    const serviceSummaryLines = cartItems.map(
      (item) => `${item.quantity} × ${item.service.title} (${item.service.price})`,
    );

    const descriptionLines = [
      `Customer: ${customerName}`,
      `Email: ${customerEmail}`,
      customerPhone ? `Phone: ${customerPhone}` : null,
      '',
      'Services:',
      ...serviceSummaryLines,
      '',
      totalPriceCents ? `Estimated total: ${formatCurrency(totalPriceCents)}` : null,
      notes ? `Notes: ${notes}` : null,
    ].filter(Boolean) as string[];

    const event = await createCalendarBooking({
      summary: `Steam Power Cleaning — ${customerName}`,
      description: descriptionLines.join('\n'),
      startTime: startDate.toISOString(),
      endTime: endDate.toISOString(),
      timeZone,
      attendeeEmail: customerEmail,
      attendeeName: customerName,
      extendedProperties: {
        cart: cartItems.map((item) => `${item.service.id}:${item.quantity}`).join(','),
        phone: customerPhone,
        notes,
        totalPriceCents,
      },
    });

    let emailSent = false;
    try {
      emailSent = await sendBookingConfirmation({
        to: customerEmail,
        customerName,
        scheduledStartIso: startDate.toISOString(),
        timeZone,
        totalPriceCents,
        totalDurationMinutes: durationMinutes,
        items: cartItems.map((item) => ({
          title: item.service.title,
          quantity: item.quantity,
          price: item.service.price,
          serviceType: item.service.serviceType,
        })),
        notes,
        phone: customerPhone,
      });
    } catch (emailError) {
      console.error('[email] Failed to send booking confirmation', emailError);
    }

    return res.json({
      eventId: event.id,
      calendarUrl: event.htmlLink,
      durationMinutes,
      totalPriceCents,
      emailSent,
      startTime: startDate.toISOString(),
      timeZone,
      items: cartItems.map((item) => ({
        serviceId: item.service.id,
        title: item.service.title,
        quantity: item.quantity,
        price: item.service.price,
        priceCents: item.service.priceCents ?? 0,
        serviceType: item.service.serviceType,
      })),
    });
  } catch (error) {
    console.error('[calendar] Error creating booking', error);
    return res.status(500).json({ error: 'Unable to create calendar event on the server.' });
  }
});

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api')) {
    return next();
  }

  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Steam Power API listening on port ${PORT}`);
});

function getServiceListForApi() {
  return SERVICES.map(({ id, title, price, priceCents }) => ({ id, title, price, priceCents }));
}

function formatCurrency(cents: number) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
  }).format(cents / 100);
}
