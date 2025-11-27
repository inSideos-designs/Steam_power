import pg from 'pg';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const { Pool } = pg;

// Database connection pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
});

// Test connection on startup
pool.on('connect', () => {
  console.log('[database] Connected to PostgreSQL');
});

pool.on('error', (err) => {
  console.error('[database] Unexpected error on idle client', err);
});

export function hasDatabaseConfig(): boolean {
  return Boolean(process.env.DATABASE_URL);
}

// Helper for running queries
export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  const start = Date.now();
  const result = await pool.query<T>(text, params);
  const duration = Date.now() - start;
  if (process.env.NODE_ENV !== 'production') {
    console.log('[database] Query executed', { text: text.substring(0, 50), duration, rows: result.rowCount });
  }
  return result;
}

// Transaction helper
export async function transaction<T>(callback: (client: pg.PoolClient) => Promise<T>): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// Initialize database schema
export async function initializeDatabase(): Promise<void> {
  if (!hasDatabaseConfig()) {
    console.warn('[database] DATABASE_URL not configured - skipping initialization');
    return;
  }

  try {
    // Create tables if they don't exist
    await query(`
      -- Customers table
      CREATE TABLE IF NOT EXISTS customers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255),
        phone VARCHAR(20),
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        CONSTRAINT customers_email_unique UNIQUE (email),
        CONSTRAINT customers_phone_unique UNIQUE (phone),
        CONSTRAINT customers_has_contact CHECK (email IS NOT NULL OR phone IS NOT NULL)
      );

      -- Addresses table
      CREATE TABLE IF NOT EXISTS addresses (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        label VARCHAR(50),
        street VARCHAR(255),
        city VARCHAR(100),
        state VARCHAR(50),
        zip VARCHAR(20),
        is_default BOOLEAN DEFAULT false,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Saved rooms table
      CREATE TABLE IF NOT EXISTS rooms (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
        surface_type VARCHAR(50) NOT NULL,
        room_name VARCHAR(100),
        square_feet INTEGER NOT NULL,
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Bookings table
      CREATE TABLE IF NOT EXISTS bookings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        customer_id UUID NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
        address_id UUID REFERENCES addresses(id) ON DELETE SET NULL,
        google_event_id VARCHAR(255),
        scheduled_at TIMESTAMP WITH TIME ZONE,
        total_cents INTEGER,
        status VARCHAR(50) DEFAULT 'upcoming',
        notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      -- Booking line items
      CREATE TABLE IF NOT EXISTS booking_items (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        booking_id UUID NOT NULL REFERENCES bookings(id) ON DELETE CASCADE,
        room_id UUID REFERENCES rooms(id) ON DELETE SET NULL,
        service_id VARCHAR(100) NOT NULL,
        service_title VARCHAR(255),
        quantity INTEGER DEFAULT 1,
        price_cents INTEGER,
        square_feet INTEGER
      );

      -- Indexes for faster lookups
      CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
      CREATE INDEX IF NOT EXISTS idx_customers_phone ON customers(phone);
      CREATE INDEX IF NOT EXISTS idx_addresses_customer ON addresses(customer_id);
      CREATE INDEX IF NOT EXISTS idx_rooms_customer ON rooms(customer_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_customer ON bookings(customer_id);
      CREATE INDEX IF NOT EXISTS idx_bookings_status ON bookings(status);
      CREATE INDEX IF NOT EXISTS idx_booking_items_booking ON booking_items(booking_id);
    `);

    console.log('[database] Schema initialized successfully');
  } catch (error) {
    console.error('[database] Failed to initialize schema:', error);
    throw error;
  }
}

export default pool;
