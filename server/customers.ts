import { Router } from 'express';
import { query, transaction, hasDatabaseConfig } from './database.js';

const router = Router();

// Types
interface Customer {
  id: string;
  email: string | null;
  phone: string | null;
  name: string;
  created_at: Date;
  updated_at: Date;
}

interface Address {
  id: string;
  customer_id: string;
  label: string | null;
  street: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  is_default: boolean;
  created_at: Date;
}

interface Room {
  id: string;
  customer_id: string;
  address_id: string | null;
  surface_type: string;
  room_name: string | null;
  square_feet: number;
  notes: string | null;
  created_at: Date;
  updated_at: Date;
}

interface Booking {
  id: string;
  customer_id: string;
  address_id: string | null;
  google_event_id: string | null;
  scheduled_at: Date | null;
  total_cents: number | null;
  status: string;
  notes: string | null;
  created_at: Date;
}

// Middleware to check database availability
function requireDatabase(req: any, res: any, next: any) {
  if (!hasDatabaseConfig()) {
    return res.status(503).json({
      error: 'Customer database not configured',
      message: 'The customer tracking feature is not yet available.'
    });
  }
  next();
}

// GET /api/customers/lookup - Find customer by email or phone
router.get('/lookup', requireDatabase, async (req, res) => {
  try {
    const { email, phone } = req.query;

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required for lookup' });
    }

    let customer: Customer | null = null;

    if (email) {
      const result = await query<Customer>(
        'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)',
        [email]
      );
      customer = result.rows[0] || null;
    }

    if (!customer && phone) {
      // Normalize phone number (remove non-digits for comparison)
      const normalizedPhone = String(phone).replace(/\D/g, '');
      const result = await query<Customer>(
        `SELECT * FROM customers WHERE REGEXP_REPLACE(phone, '\\D', '', 'g') = $1`,
        [normalizedPhone]
      );
      customer = result.rows[0] || null;
    }

    if (!customer) {
      return res.json({ found: false, customer: null });
    }

    // Fetch related data
    const [addressesResult, roomsResult, bookingsResult] = await Promise.all([
      query<Address>('SELECT * FROM addresses WHERE customer_id = $1 ORDER BY is_default DESC, created_at DESC', [customer.id]),
      query<Room>('SELECT * FROM rooms WHERE customer_id = $1 ORDER BY created_at DESC', [customer.id]),
      query<Booking>('SELECT * FROM bookings WHERE customer_id = $1 ORDER BY scheduled_at DESC LIMIT 10', [customer.id]),
    ]);

    res.json({
      found: true,
      customer: {
        ...customer,
        addresses: addressesResult.rows,
        rooms: roomsResult.rows,
        recentBookings: bookingsResult.rows,
      },
    });
  } catch (error) {
    console.error('[customers] Lookup error:', error);
    res.status(500).json({ error: 'Failed to lookup customer' });
  }
});

// POST /api/customers - Create new customer
router.post('/', requireDatabase, async (req, res) => {
  try {
    const { name, email, phone } = req.body;

    if (!name?.trim()) {
      return res.status(400).json({ error: 'Name is required' });
    }

    if (!email && !phone) {
      return res.status(400).json({ error: 'Email or phone is required' });
    }

    const result = await query<Customer>(
      `INSERT INTO customers (name, email, phone)
       VALUES ($1, $2, $3)
       RETURNING *`,
      [name.trim(), email?.trim() || null, phone?.trim() || null]
    );

    res.status(201).json({ customer: result.rows[0] });
  } catch (error: any) {
    console.error('[customers] Create error:', error);

    // Handle unique constraint violations
    if (error.code === '23505') {
      if (error.constraint?.includes('email')) {
        return res.status(409).json({ error: 'A customer with this email already exists' });
      }
      if (error.constraint?.includes('phone')) {
        return res.status(409).json({ error: 'A customer with this phone already exists' });
      }
    }

    res.status(500).json({ error: 'Failed to create customer' });
  }
});

// PUT /api/customers/:id - Update customer
router.put('/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone } = req.body;

    const result = await query<Customer>(
      `UPDATE customers
       SET name = COALESCE($2, name),
           email = COALESCE($3, email),
           phone = COALESCE($4, phone),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, name?.trim(), email?.trim(), phone?.trim()]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Customer not found' });
    }

    res.json({ customer: result.rows[0] });
  } catch (error) {
    console.error('[customers] Update error:', error);
    res.status(500).json({ error: 'Failed to update customer' });
  }
});

// POST /api/customers/:id/addresses - Add address
router.post('/:id/addresses', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const { label, street, city, state, zip, is_default } = req.body;

    // If this is set as default, unset other defaults first
    if (is_default) {
      await query('UPDATE addresses SET is_default = false WHERE customer_id = $1', [id]);
    }

    const result = await query<Address>(
      `INSERT INTO addresses (customer_id, label, street, city, state, zip, is_default)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [id, label, street, city, state, zip, is_default || false]
    );

    res.status(201).json({ address: result.rows[0] });
  } catch (error) {
    console.error('[customers] Add address error:', error);
    res.status(500).json({ error: 'Failed to add address' });
  }
});

// POST /api/customers/:id/rooms - Add room
router.post('/:id/rooms', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const { address_id, surface_type, room_name, square_feet, notes } = req.body;

    if (!surface_type) {
      return res.status(400).json({ error: 'Surface type is required' });
    }

    if (!square_feet || square_feet < 1) {
      return res.status(400).json({ error: 'Square feet is required and must be positive' });
    }

    const result = await query<Room>(
      `INSERT INTO rooms (customer_id, address_id, surface_type, room_name, square_feet, notes)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [id, address_id || null, surface_type, room_name, square_feet, notes]
    );

    res.status(201).json({ room: result.rows[0] });
  } catch (error) {
    console.error('[customers] Add room error:', error);
    res.status(500).json({ error: 'Failed to add room' });
  }
});

// PUT /api/rooms/:id - Update room
router.put('/rooms/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const { surface_type, room_name, square_feet, notes } = req.body;

    const result = await query<Room>(
      `UPDATE rooms
       SET surface_type = COALESCE($2, surface_type),
           room_name = COALESCE($3, room_name),
           square_feet = COALESCE($4, square_feet),
           notes = COALESCE($5, notes),
           updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [id, surface_type, room_name, square_feet, notes]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ room: result.rows[0] });
  } catch (error) {
    console.error('[customers] Update room error:', error);
    res.status(500).json({ error: 'Failed to update room' });
  }
});

// DELETE /api/rooms/:id - Delete room
router.delete('/rooms/:id', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;

    const result = await query('DELETE FROM rooms WHERE id = $1 RETURNING id', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found' });
    }

    res.json({ deleted: true });
  } catch (error) {
    console.error('[customers] Delete room error:', error);
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// GET /api/customers/:id/bookings - Get booking history
router.get('/:id/bookings', requireDatabase, async (req, res) => {
  try {
    const { id } = req.params;
    const limit = Math.min(Number(req.query.limit) || 20, 100);

    const result = await query<Booking>(
      `SELECT b.*,
              json_agg(json_build_object(
                'service_id', bi.service_id,
                'service_title', bi.service_title,
                'quantity', bi.quantity,
                'price_cents', bi.price_cents,
                'square_feet', bi.square_feet
              )) as items
       FROM bookings b
       LEFT JOIN booking_items bi ON bi.booking_id = b.id
       WHERE b.customer_id = $1
       GROUP BY b.id
       ORDER BY b.scheduled_at DESC
       LIMIT $2`,
      [id, limit]
    );

    res.json({ bookings: result.rows });
  } catch (error) {
    console.error('[customers] Get bookings error:', error);
    res.status(500).json({ error: 'Failed to get bookings' });
  }
});

// Helper: Find or create customer (used by booking flow)
export async function findOrCreateCustomer(data: {
  name: string;
  email?: string;
  phone?: string;
}): Promise<Customer | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  try {
    // Try to find existing customer
    let customer: Customer | null = null;

    if (data.email) {
      const result = await query<Customer>(
        'SELECT * FROM customers WHERE LOWER(email) = LOWER($1)',
        [data.email]
      );
      customer = result.rows[0] || null;
    }

    if (!customer && data.phone) {
      const normalizedPhone = data.phone.replace(/\D/g, '');
      const result = await query<Customer>(
        `SELECT * FROM customers WHERE REGEXP_REPLACE(phone, '\\D', '', 'g') = $1`,
        [normalizedPhone]
      );
      customer = result.rows[0] || null;
    }

    // Create new customer if not found
    if (!customer) {
      const result = await query<Customer>(
        `INSERT INTO customers (name, email, phone)
         VALUES ($1, $2, $3)
         RETURNING *`,
        [data.name, data.email || null, data.phone || null]
      );
      customer = result.rows[0];
    } else {
      // Update name if it changed
      if (customer.name !== data.name) {
        await query(
          'UPDATE customers SET name = $2, updated_at = NOW() WHERE id = $1',
          [customer.id, data.name]
        );
        customer.name = data.name;
      }
    }

    return customer;
  } catch (error) {
    console.error('[customers] findOrCreateCustomer error:', error);
    return null;
  }
}

// Helper: Save booking to database
export async function saveBooking(data: {
  customerId: string;
  addressId?: string;
  googleEventId: string;
  scheduledAt: Date;
  totalCents: number;
  notes?: string;
  items: Array<{
    serviceId: string;
    serviceTitle: string;
    quantity: number;
    priceCents: number;
    squareFeet?: number;
    roomId?: string;
  }>;
}): Promise<Booking | null> {
  if (!hasDatabaseConfig()) {
    return null;
  }

  try {
    return await transaction(async (client) => {
      // Create booking
      const bookingResult = await client.query<Booking>(
        `INSERT INTO bookings (customer_id, address_id, google_event_id, scheduled_at, total_cents, notes, status)
         VALUES ($1, $2, $3, $4, $5, $6, 'upcoming')
         RETURNING *`,
        [data.customerId, data.addressId || null, data.googleEventId, data.scheduledAt, data.totalCents, data.notes || null]
      );

      const booking = bookingResult.rows[0];

      // Create booking items
      for (const item of data.items) {
        await client.query(
          `INSERT INTO booking_items (booking_id, room_id, service_id, service_title, quantity, price_cents, square_feet)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [booking.id, item.roomId || null, item.serviceId, item.serviceTitle, item.quantity, item.priceCents, item.squareFeet || null]
        );
      }

      return booking;
    });
  } catch (error) {
    console.error('[customers] saveBooking error:', error);
    return null;
  }
}

export default router;
