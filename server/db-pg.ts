import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "@shared/schema";

// Get DATABASE_URL from environment - critical for Railway deployment
let databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ CRITICAL ERROR: DATABASE_URL environment variable is not set');
  console.error('This is required for PostgreSQL connection and Railway deployment');
  process.exit(1);
}

// Fix DATABASE_URL format if it's missing the protocol separator
if (databaseUrl.startsWith('postgresql:') && !databaseUrl.includes('://')) {
  // The URL is in the format postgresql:username:password@host... 
  // Convert it to postgresql://username:password@host...
  const urlParts = databaseUrl.substring('postgresql:'.length);
  databaseUrl = `postgresql://${urlParts}`;
  console.log('🔧 Fixed DATABASE_URL format for proper connection');
}

console.log('🔗 Connecting to PostgreSQL database using pg driver...');

// Create PostgreSQL pool using pg
const pool = new Pool({
  connectionString: databaseUrl,
  ssl: databaseUrl.includes('localhost') || databaseUrl.includes('127.0.0.1') 
    ? false 
    : { rejectUnauthorized: false },
  max: 10,
  idleTimeoutMillis: 20000,
  connectionTimeoutMillis: 10000
});

// Create Drizzle database instance with schema
export const db = drizzle(pool, { schema });

// Connection health check function
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  status: string;
  error?: string;
}> {
  try {
    // Test connection with a simple query
    const client = await pool.connect();
    await client.query('SELECT 1 as test');
    client.release();
    return { connected: true, status: 'healthy' };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Database connection failed:', errorMessage);
    return { 
      connected: false, 
      status: 'error', 
      error: errorMessage 
    };
  }
}

// Alias for compatibility with self-healing services
export const getConnectionStatus = checkDatabaseConnection;

// Initialize database connection and log status
async function initializeDatabase() {
  try {
    const connectionStatus = await checkDatabaseConnection();
    if (connectionStatus.connected) {
      console.log('✅ PostgreSQL database connected successfully (using pg driver)');
      console.log('🔗 Database URL configured from environment variable');
    } else {
      console.error('❌ PostgreSQL database connection failed:', connectionStatus.error);
      throw new Error(`Database connection failed: ${connectionStatus.error}`);
    }
  } catch (error) {
    console.error('❌ CRITICAL: Database initialization failed:', error instanceof Error ? error.message : String(error));
    throw error;
  }
}

// Initialize connection immediately (non-blocking for self-healing services)
initializeDatabase().catch((error) => {
  console.warn('⚠️ Database connection not available at startup - services will run in fallback mode');
  console.warn('This is acceptable for self-healing architecture testing');
});

// Export the pool for direct access if needed
export { pool };

export default db;