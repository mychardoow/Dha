import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";

neonConfig.webSocketConstructor = ws;

if (!process.env.DATABASE_URL) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

// Enhanced connection pool configuration with automatic reconnection
const poolConfig = {
  connectionString: process.env.DATABASE_URL,
  max: parseInt(process.env.DB_POOL_MAX || '20'), // Maximum connections
  min: parseInt(process.env.DB_POOL_MIN || '2'),  // Minimum connections
  idleTimeoutMillis: 30000,                       // Close idle connections after 30s
  connectionTimeoutMillis: 10000,                 // Connection timeout 10s
  maxUses: 7500,                                   // Close connection after 7500 uses
  allowExitOnIdle: false,                         // Keep pool alive
};

export const pool = new Pool(poolConfig);

// Connection health monitoring
let connectionHealthy = true;
let lastHealthCheck = Date.now();

// Monitor pool health
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

// Automatic connection health check
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

// Create drizzle instance with pool
export const db = drizzle({ client: pool, schema });

// Export connection status
export const getConnectionStatus = () => ({
  healthy: connectionHealthy,
  lastHealthCheck: new Date(lastHealthCheck),
  poolSize: pool.totalCount || 0,
  idleCount: pool.idleCount || 0,
  waitingCount: pool.waitingCount || 0
});

// Graceful shutdown
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