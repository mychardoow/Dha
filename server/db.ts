import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check if DATABASE_URL is set and valid
let databaseUrlError: string | null = null;
let connectionString: string | undefined = process.env.DATABASE_URL;

// Validate DATABASE_URL format
function isValidDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  // Check if it's a valid PostgreSQL URL
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

if (!connectionString) {
  databaseUrlError = "DATABASE_URL must be set. Did you forget to provision a database?";
  console.error(`[Database] ${databaseUrlError}`);
} else if (!isValidDatabaseUrl(connectionString)) {
  // DATABASE_URL is set but appears to be encrypted/encoded
  console.error('[Database] CRITICAL: DATABASE_URL is invalid or encrypted');
  console.error('[Database] Current value appears to be encrypted/encoded (starts with:', connectionString.substring(0, 30), '...)');
  console.error('[Database] Please set the correct PostgreSQL URL in Replit Secrets');
  console.error('[Database] Expected format: postgres://user:password@host:port/database');
  databaseUrlError = 'Invalid DATABASE_URL format - appears to be encrypted';
  connectionString = undefined; // Disable connection attempts
}

// Create pool only if we have a valid connection string
let pool: Pool | null = null;

if (connectionString && isValidDatabaseUrl(connectionString)) {
  try {
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
    
    pool = new Pool(poolConfig);
    console.log('[Database] Pool created successfully');
  } catch (error) {
    console.error('[Database] Failed to create pool:', error);
    databaseUrlError = 'Failed to create database pool';
    pool = null;
  }
} else {
  console.warn('[Database] Running without database connection (in-memory mode)');
  pool = null;
}

export { pool };

// Connection health monitoring
let connectionHealthy = pool !== null;
let lastHealthCheck = Date.now();

// Monitor pool health (only if pool exists)
if (pool) {
  pool.on('error', (err: Error) => {
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

// Automatic connection health check (only if pool exists and is valid)
if (pool && connectionString && isValidDatabaseUrl(connectionString)) {
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

// Create drizzle instance only if pool exists
export const db = pool ? drizzle({ client: pool, schema }) : null;

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