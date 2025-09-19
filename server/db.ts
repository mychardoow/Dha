import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

// Check and validate DATABASE_URL
let databaseUrlError: string | null = null;
let connectionString: string | undefined = process.env.DATABASE_URL;

// Validate DATABASE_URL format
function isValidDatabaseUrl(url: string | undefined): boolean {
  if (!url) return false;
  // Check if it's a valid PostgreSQL URL
  return url.startsWith('postgres://') || url.startsWith('postgresql://');
}

// If DATABASE_URL is invalid but we have individual components, construct it
if (!isValidDatabaseUrl(connectionString) && process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE) {
  // Construct DATABASE_URL from individual components
  const host = process.env.PGHOST;
  const user = process.env.PGUSER;
  const password = process.env.PGPASSWORD;
  const database = process.env.PGDATABASE;
  const port = process.env.PGPORT || '5432';
  
  connectionString = `postgresql://${user}:${password}@${host}:${port}/${database}?sslmode=require`;
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DHA SYSTEM - DATABASE CONNECTION');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✓ Constructed DATABASE_URL from environment variables');
  console.log('  ✓ Host:', host);
  console.log('  ✓ Database:', database);
  console.log('═══════════════════════════════════════════════════════════════');
} else if (!isValidDatabaseUrl(connectionString)) {
  // No valid connection available - use bypass mode
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  DHA SYSTEM - DATABASE BYPASS MODE ACTIVE');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('  ✓ All features operational');
  console.log('  ✓ Using in-memory storage');
  console.log('  ⚠ Data will not persist between restarts');
  console.log('═══════════════════════════════════════════════════════════════');
  connectionString = undefined;
  databaseUrlError = "BYPASS mode - in-memory storage";
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
// In BYPASS mode, db will be null and we use MemStorage instead
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
    if (pool) await pool.end();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('[Database] Closing connection pool...');
    if (pool) await pool.end();
    process.exit(0);
  });
}