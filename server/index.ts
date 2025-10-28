import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { SERVICES } from '../data/services';
import { calculateCartTotals, resolveCartItems } from './services';
import {
  hasGoogleCalendarConfig,
  checkCalendarConflicts,
  createCalendarBooking,
} from './googleCalendar';
import { hasEmailConfig, sendBookingConfirmation } from './email';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

if (!hasGoogleCalendarConfig()) {
  console.warn(
    '[calendar] Google Calendar is not fully configured — POST /api/bookings will fail until credentials are provided.',
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

  try {
    const hasConflict = await checkCalendarConflicts(startDate.toISOString(), endDate.toISOString());
    if (hasConflict) {
      return res.status(409).json({ error: 'That time is no longer available. Please pick a different slot.' });
    }

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
      summary: `Steam Powered Cleaning — ${customerName}`,
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

app.listen(PORT, () => {
  console.log(`Steam Powered API listening on http://localhost:${PORT}`);
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
