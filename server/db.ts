
import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { sql, type SQL } from "drizzle-orm";
import * as schema from "../shared/schema.js";

// Database configuration
interface DatabaseConfig {
  host: string;
  port: number;
  database: string;
  username: string;
  password: string;
  ssl: boolean;
}

// Global database instances
let pool: postgres.Sql | null = null;
let db: ReturnType<typeof drizzle> | null = null;

// Parse DATABASE_URL if available
function parseDatabaseUrl(url: string): DatabaseConfig | null {
  try {
    if (!url || url.trim() === '') return null;
    
    const parsed = new URL(url);
    return {
      host: parsed.hostname,
      port: parseInt(parsed.port) || 5432,
      database: parsed.pathname.slice(1),
      username: parsed.username,
      password: parsed.password,
      ssl: parsed.searchParams.get('sslmode') !== 'disable'
    };
  } catch (error) {
    console.error('[Database] Failed to parse DATABASE_URL:', error);
    return null;
  }
}

// Initialize database connection
export async function initializeDatabase(): Promise<void> {
  console.log('[Database] Initializing database connection...');

  const databaseUrl = process.env.DATABASE_URL;
  
  if (!databaseUrl || databaseUrl.trim() === '') {
    console.log('[Database] No DATABASE_URL provided - running in memory mode');
    return;
  }

  const config = parseDatabaseUrl(databaseUrl);
  if (!config) {
    console.warn('[Database] Invalid DATABASE_URL format - running in memory mode');
    return;
  }

  try {
    // Create PostgreSQL connection
    pool = postgres(databaseUrl, {
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
      prepare: false,
      ssl: config.ssl ? 'require' : false,
      onnotice: () => {}, // Suppress notices
    });

    // Create Drizzle instance
    db = drizzle(pool, { schema });

    // Test connection
    await pool`SELECT 1 as test`;
    console.log('[Database] ✅ Database connection established successfully');

    // Run migrations
    try {
      console.log('[Database] Running database migrations...');
      await migrate(db, { migrationsFolder: './drizzle' });
      console.log('[Database] ✅ Database migrations completed');
    } catch (migrationError) {
      console.warn('[Database] Migration failed (this may be normal for new databases):', migrationError);
    }

  } catch (error) {
    console.error('[Database] Failed to initialize database:', error);
    
    // Clean up failed connections
    if (pool) {
      await pool.end();
      pool = null;
    }
    db = null;
    
    console.log('[Database] Falling back to memory mode due to connection failure');
  }
}

// Health check function
export async function checkDatabaseHealth(): Promise<{
  status: 'healthy' | 'unhealthy' | 'unavailable';
  latency?: number;
  error?: string;
}> {
  if (!pool || !db) {
    return { status: 'unavailable' };
  }

  try {
    const start = Date.now();
    await pool`SELECT 1 as health_check`;
    const latency = Date.now() - start;
    
    return { status: 'healthy', latency };
  } catch (error) {
    return {
      status: 'unhealthy',
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Graceful shutdown
export async function closeDatabaseConnection(): Promise<void> {
  if (pool) {
    console.log('[Database] Closing database connection...');
    await pool.end();
    pool = null;
    db = null;
    console.log('[Database] ✅ Database connection closed');
  }
}

// Export instances
export { pool, db };

// Default export for compatibility
export default {
  pool,
  db,
  initializeDatabase,
  checkDatabaseHealth,
  closeDatabaseConnection
};
