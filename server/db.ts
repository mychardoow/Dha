import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is set and valid
let isValidDatabaseUrl = false;
let databaseUrlError: string | null = null;

if (!process.env.DATABASE_URL) {
  databaseUrlError = "DATABASE_URL must be set. Did you forget to provision a database?";
  console.error(`[Database] ${databaseUrlError}`);
} else {
  // Check if DATABASE_URL is a valid PostgreSQL URL
  const urlPattern = /^(postgres|postgresql):\/\/.*/i;
  if (!urlPattern.test(process.env.DATABASE_URL)) {
    databaseUrlError = `DATABASE_URL is not a valid PostgreSQL URL. It appears to be encrypted or encoded. Length: ${process.env.DATABASE_URL.length} chars`;
    console.error(`[Database] ${databaseUrlError}`);
    console.error(`[Database] Expected format: postgresql://user:password@host:port/database`);
    console.error(`[Database] Received format: ${process.env.DATABASE_URL.substring(0, 20)}...`);
  } else {
    isValidDatabaseUrl = true;
  }
}

// If DATABASE_URL is invalid, use a dummy URL to prevent immediate crash
// The monitoring system will handle the connection failure gracefully
const connectionString = isValidDatabaseUrl 
  ? process.env.DATABASE_URL 
  : 'postgresql://dummy:dummy@localhost:5432/dummy';

// Enhanced connection pool configuration with automatic reconnection
const poolConfig = {
  connectionString: connectionString,
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections
  min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum connections
  idleTimeoutMillis: 30000,                       // Close idle connections after 30s
  connectionTimeoutMillis: 10000,                 // Connection timeout 10s
  maxUses: 7500,                                   // Close connection after 7500 uses
  allowExitOnIdle: false,                         // Keep pool alive
};

// Create pool only if we have a valid connection string or dummy fallback
export const pool = isValidDatabaseUrl || connectionString ? new Pool(poolConfig) : null as any;

// Connection health monitoring
let connectionHealthy = true;
let lastHealthCheck = Date.now();

// Monitor pool health (only if pool exists)
if (pool) {
  pool.on('error', (err) => {
    console.error('[Database] Pool error:', err);
    connectionHealthy = false;
  });

  pool.on('connect', () => {
    console.log('[Database] New connection established');
    connectionHealthy = true;
    lastHealthCheck = Date.now();
  });

  pool.on('remove', () => {
    console.log('[Database] Connection removed from pool');
  });
} else {
  console.warn('[Database] Pool not initialized due to invalid DATABASE_URL');
  connectionHealthy = false;
}

// Automatic connection health check (only if pool exists)
if (pool && isValidDatabaseUrl) {
  setInterval(async () => {
    try {
      const client = await pool.connect();
      await client.query('SELECT 1');
      client.release();
      connectionHealthy = true;
      lastHealthCheck = Date.now();
    } catch (error) {
      console.error('[Database] Health check failed:', error);
      connectionHealthy = false;
    }
  }, 30000); // Check every 30 seconds
}

// Create drizzle instance with pool
export const db = drizzle({ client: pool, schema });

// Export connection status
export const getConnectionStatus = () => ({
  healthy: connectionHealthy,
  lastHealthCheck: new Date(lastHealthCheck),
  poolSize: pool ? (pool.totalCount || 0) : 0,
  idleCount: pool ? (pool.idleCount || 0) : 0,
  waitingCount: pool ? (pool.waitingCount || 0) : 0,
  error: databaseUrlError
});

// Graceful shutdown (only if pool exists)
if (pool) {
  process.on('SIGINT', async () => {
    console.log('[Database] Closing connection pool...');
    await pool.end();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('[Database] Closing connection pool...');
    await pool.end();
    process.exit(0);
  });
}