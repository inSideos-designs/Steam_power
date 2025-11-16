import sgMail from '@sendgrid/mail';

export interface BookingEmailLineItem {
  title: string;
  quantity: number;
  price: string;
  serviceType: string;
}

export interface BookingEmailPayload {
  to: string;
  customerName: string;
  scheduledStartIso: string;
  timeZone: string;
  totalPriceCents: number;
  totalDurationMinutes: number;
  items: BookingEmailLineItem[];
  notes?: string;
  phone?: string;
}

const getEmailConfig = () => ({
  apiKey: process.env.SENDGRID_API_KEY,
  from: process.env.EMAIL_FROM,
});

export const hasEmailConfig = () => {
  const { apiKey, from } = getEmailConfig();
  return Boolean(apiKey && from);
};

const initializeSendGrid = () => {
  if (!hasEmailConfig()) {
    throw new Error('SendGrid configuration is incomplete.');
  }

  const { apiKey } = getEmailConfig();
  sgMail.setApiKey(apiKey);
};

export const formatCurrency = (cents: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(cents / 100);

const formatEstimateLabel = (cents: number) =>
  cents > 0 ? formatCurrency(cents) : 'Provided after inspection';

const formatDateTime = (iso: string, timeZone: string) => {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone,
      dateStyle: 'full',
      timeStyle: 'short',
    }).format(new Date(iso));
  } catch {
    return new Date(iso).toLocaleString('en-US');
  }
};

const formatPlaintextSummary = (payload: BookingEmailPayload) => {
  const lines = [
    `Hi ${payload.customerName},`,
    '',
    'Thank you for reserving a cleaning with Steam Power Cleaning! Here are your booking details:',
    '',
    `Appointment window: ${formatDateTime(payload.scheduledStartIso, payload.timeZone)} (${payload.timeZone})`,
    `Estimated duration: ${payload.totalDurationMinutes} minutes`,
    '',
    'Services:',
    ...payload.items.map(
      (item) => ` • ${item.quantity} × ${item.title} (${item.serviceType}) — ${item.price}`,
    ),
    '',
    `Estimated total: ${formatEstimateLabel(payload.totalPriceCents)}`,
  ];

  if (payload.phone) {
    lines.push(`Contact phone: ${payload.phone}`);
  }

  if (payload.notes) {
    lines.push('', 'Notes you shared:', payload.notes);
  }

  lines.push(
    '',
    'You will only be charged after the service is completed. If anything changes, simply reply to this email and we will adjust your appointment.',
    '',
    'We appreciate the opportunity to help keep your spaces spotless!',
    '',
    '— The Steam Power Cleaning Team',
  );

  return lines.join('\n');
};

const formatHtmlSummary = (payload: BookingEmailPayload) => {
  const appointment = formatDateTime(payload.scheduledStartIso, payload.timeZone);
  const itemsList = payload.items
    .map(
      (item) => `
        <tr>
          <td style="padding: 6px 0; font-weight: 600; color: #0f172a;">${item.title}</td>
          <td style="padding: 6px 0; color: #334155;">${item.serviceType}</td>
          <td style="padding: 6px 0; color: #334155; text-align: center;">${item.quantity}</td>
          <td style="padding: 6px 0; text-align: right; color: #0f172a;">${item.price}</td>
        </tr>
      `,
    )
    .join('');

  const notesSection = payload.notes
    ? `
      <p style="margin: 16px 0; color: #334155;">
        <strong style="color: #0f172a;">Notes you shared:</strong><br />
        ${payload.notes.replace(/\n/g, '<br />')}
      </p>
    `
    : '';

  const phoneLine = payload.phone
    ? `<p style="margin: 8px 0; color: #334155;">Contact phone: <strong>${payload.phone}</strong></p>`
    : '';

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 560px; margin: 0 auto; color: #0f172a;">
      <p style="margin: 0 0 16px;">Hi ${payload.customerName},</p>
      <p style="margin: 0 0 16px; color: #334155;">
        Thank you for reserving a cleaning with <strong>Steam Power Cleaning</strong>! Here are your booking details:
      </p>
      <p style="margin: 0 0 8px; color: #334155;"><strong>Appointment window:</strong> ${appointment} (${payload.timeZone})</p>
      <p style="margin: 0 0 16px; color: #334155;"><strong>Estimated duration:</strong> ${payload.totalDurationMinutes} minutes</p>
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
        <thead>
          <tr style="text-align: left; border-bottom: 1px solid #e2e8f0; color: #64748b;">
            <th style="padding: 6px 0;">Service</th>
            <th style="padding: 6px 0;">Focus</th>
            <th style="padding: 6px 0; text-align: center;">Qty</th>
            <th style="padding: 6px 0; text-align: right;">Price</th>
          </tr>
        </thead>
        <tbody>${itemsList}</tbody>
      </table>
      <p style="margin: 8px 0; font-size: 16px; color: #0f172a;">
        <strong>Estimated total: ${formatEstimateLabel(payload.totalPriceCents)}</strong>
      </p>
      ${phoneLine}
      ${notesSection}
      <p style="margin: 16px 0; color: #334155;">
        You will only be charged after the service is complete. If anything changes, simply reply to this email and we will adjust your appointment.
      </p>
      <p style="margin: 0 0 8px; color: #334155;">We appreciate the opportunity to help keep your spaces spotless!</p>
      <p style="margin: 0;">— The Steam Power Cleaning Team</p>
    </div>
  `;
};

export const sendBookingConfirmation = async (payload: BookingEmailPayload) => {
  if (!hasEmailConfig()) {
    return false;
  }

  try {
    initializeSendGrid();
    const { from } = getEmailConfig();
    const msg = {
      to: payload.to,
      from: from || 'noreply@example.com',
      subject: 'Steam Power Cleaning — Booking confirmation',
      text: formatPlaintextSummary(payload),
      html: formatHtmlSummary(payload),
    };

    await sgMail.send(msg);
    console.log('[email] Booking confirmation sent successfully');
    return true;
  } catch (error) {
    console.error('[email] Unable to send booking confirmation', error);
    return false;
  }
};
