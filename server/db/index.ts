// Database configuration and connection
import { drizzle } from 'drizzle-orm/node-postgres';
import { Pool } from 'pg';
import { ENV_CONFIG } from '../config/environment';

const pool = new Pool({
  connectionString: ENV_CONFIG.DATABASE_URL,
  ssl: ENV_CONFIG.NODE_ENV === 'production' ? { rejectUnauthorized: false } : undefined,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

export const db = drizzle(pool);
export default db;