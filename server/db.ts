import { Pool, neonConfig } from '@neondatabase/serverless';
import { drizzle } from 'drizzle-orm/neon-serverless';
import ws from "ws";
import * as schema from "@shared/schema";
import { configService, config } from './middleware/provider-config';

// Environment detection utility - using centralized config
const isPreviewMode = (): boolean => configService.isPreviewMode();

// Simple shutdown manager for database cleanup
class DatabaseShutdownManager {
  private shutdownHandlers: Array<{ name: string; handler: () => Promise<void> }> = [];

  addShutdownHandler(name: string, handler: () => Promise<void>): void {
    this.shutdownHandlers.push({ name, handler });
  }

  async shutdown(): Promise<void> {
    if (isPreviewMode()) {
      console.log('[Database] Preview mode - skipping shutdown');
      return;
    }

    console.log('[Database] Production mode - performing database shutdown');
    for (const { name, handler } of this.shutdownHandlers) {
      try {
        console.log(`[Database] Running ${name}...`);
        await handler();
        console.log(`[Database] ✓ ${name} completed`);
      } catch (error) {
        console.error(`[Database] ✗ ${name} failed:`, error);
      }
    }
  }
}

const dbShutdownManager = new DatabaseShutdownManager();

neonConfig.webSocketConstructor = ws;

// SECURITY: DATABASE_URL now managed by centralized configuration service
let databaseUrlError: string | null = null;
let connectionString: string | undefined = config.DATABASE_URL;

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
  const healthCheckInterval = setInterval(async () => {
    try {
      // Add timeout to prevent hanging health checks
      const healthCheckPromise = new Promise(async (resolve, reject) => {
        try {
          const client = await pool!.connect();
          await client.query('SELECT 1');
          client.release();
          resolve(true);
        } catch (err) {
          reject(err);
        }
      });

      // Race between health check and timeout
      await Promise.race([
        healthCheckPromise,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Health check timeout')), 5000)
        )
      ]);

      connectionHealthy = true;
      lastHealthCheck = Date.now();
      // Reduce log noise in preview mode
      if (process.env.NODE_ENV !== 'development' && !process.env.REPL_ID) {
        console.log('[Database] Health check passed');
      }
    } catch (error) {
      // Don't spam error logs in preview mode - log less frequently
      if (Date.now() - lastHealthCheck > 300000) { // Only log every 5 minutes
        const errorMessage = error instanceof Error ? error.message : String(error);
        console.warn('[Database] Health check failed (non-critical in preview mode):', errorMessage);
      }
      connectionHealthy = false;
      
      // In preview mode, don't let health check failures kill the server
      if (isPreviewMode()) {
        console.log('[Database] Continuing despite health check failure in preview mode...');
      }
    }
  }, 60000); // Check every 60 seconds instead of 30 to reduce load

  // Store interval reference to prevent garbage collection
  (global as any).__DB_HEALTH_CHECK_INTERVAL = healthCheckInterval;
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

// Register database shutdown handlers
if (pool) {
  dbShutdownManager.addShutdownHandler('database-pool', async () => {
    console.log('[Database] Closing connection pool...');
    if (pool) {
      await pool.end();
      console.log('[Database] Pool closed successfully');
    }
  });
  
  // Also clean up health check interval on shutdown
  const healthCheckInterval = (global as any).__DB_HEALTH_CHECK_INTERVAL;
  if (healthCheckInterval) {
    dbShutdownManager.addShutdownHandler('database-health-check', async () => {
      clearInterval(healthCheckInterval);
      console.log('[Database] Health check interval cleared');
    });
  }

  // Setup signal handlers for database shutdown
  process.on('SIGTERM', () => {
    dbShutdownManager.shutdown().then(() => {
      if (!isPreviewMode()) {
        process.exit(0);
      }
    });
  });

  process.on('SIGINT', () => {
    dbShutdownManager.shutdown().then(() => {
      if (!isPreviewMode()) {
        process.exit(0);
      }
    });
  });
}