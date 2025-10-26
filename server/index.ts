import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import crypto from 'crypto';
import { getServiceById } from './services';
import { SERVICES } from '../data/services';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = Number(process.env.API_PORT || 4000);
const SQUARE_ACCESS_TOKEN = process.env.SQUARE_ACCESS_TOKEN;
const SQUARE_LOCATION_ID = process.env.SQUARE_LOCATION_ID;

if (!SQUARE_ACCESS_TOKEN) {
  console.warn('[square] Missing SQUARE_ACCESS_TOKEN in .env — POST /api/square/checkout will fail until it is provided.');
}
if (!SQUARE_LOCATION_ID) {
  console.warn('[square] Missing SQUARE_LOCATION_ID in .env — POST /api/square/checkout will fail until it is provided.');
}

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

app.get('/api/services', (_req, res) => {
  res.json({ services: getServiceListForApi() });
});

app.post('/api/square/checkout', async (req, res) => {
  if (!SQUARE_ACCESS_TOKEN || !SQUARE_LOCATION_ID) {
    return res.status(500).json({ error: 'Square credentials are missing on the server.' });
  }

  const { token, serviceId } = req.body ?? {};
  if (typeof token !== 'string' || typeof serviceId !== 'string') {
    return res.status(400).json({ error: 'token and serviceId are required.' });
  }

  const service = getServiceById(serviceId);
  if (!service) {
    return res.status(404).json({ error: 'Service not found.' });
  }
  if (!service.priceCents || service.priceCents <= 0) {
    return res.status(400).json({ error: 'This service requires a custom quote. Use the hosted Square link instead.' });
  }

  const amountMoney = {
    amount: service.priceCents,
    currency: 'USD' as const,
  };

  try {
    const orderResponse = await fetch('https://connect.squareupsandbox.com/v2/orders', {
      method: 'POST',
      headers: squareHeaders(SQUARE_ACCESS_TOKEN),
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        order: {
          location_id: SQUARE_LOCATION_ID,
          line_items: [buildLineItem(service, amountMoney)],
        },
      }),
    });

    const orderPayload = await orderResponse.json();
    if (!orderResponse.ok) {
      return res.status(orderResponse.status).json(formatSquareError(orderPayload));
    }

    const orderId = orderPayload?.order?.id;
    const paymentResponse = await fetch('https://connect.squareupsandbox.com/v2/payments', {
      method: 'POST',
      headers: squareHeaders(SQUARE_ACCESS_TOKEN),
      body: JSON.stringify({
        idempotency_key: crypto.randomUUID(),
        source_id: token,
        location_id: SQUARE_LOCATION_ID,
        amount_money: amountMoney,
        order_id: orderId,
        note: `Steam Powered — ${service.title}`,
        autocomplete: true,
      }),
    });

    const paymentPayload = await paymentResponse.json();
    if (!paymentResponse.ok) {
      return res.status(paymentResponse.status).json(formatSquareError(paymentPayload));
    }

    return res.json({ payment: paymentPayload.payment, order: orderPayload.order });
  } catch (error) {
    console.error('[square] Error creating payment', error);
    return res.status(500).json({ error: 'Server error while talking to Square' });
  }
});

app.listen(PORT, () => {
  console.log(`Steam Powered API listening on http://localhost:${PORT}`);
});

function squareHeaders(accessToken: string) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${accessToken}`,
    'Square-Version': '2024-09-18',
  };
}

function buildLineItem(service: ReturnType<typeof getServiceById>, amountMoney: { amount: number; currency: 'USD' }) {
  const lineItem: Record<string, unknown> = {
    name: service?.title,
    quantity: '1',
    base_price_money: amountMoney,
  };

  if (service?.squareItemVariationId) {
    lineItem.catalog_object_id = service.squareItemVariationId;
    lineItem.item_type = 'ITEM';
  }

  return lineItem;
}

function getServiceListForApi() {
  return SERVICES.map(({ id, title, price, priceCents }) => ({ id, title, price, priceCents }));
}

function formatSquareError(payload: any) {
  if (payload?.errors?.length) {
    return {
      error: payload.errors.map((err: any) => err.detail || err.message || err.code).join('; '),
      errors: payload.errors,
    };
  }
  return { error: 'Unexpected Square API error', details: payload };
}
