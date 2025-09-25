import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@shared/schema";

// Get DATABASE_URL from environment - critical for Railway deployment
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ CRITICAL ERROR: DATABASE_URL environment variable is not set');
  console.error('This is required for PostgreSQL connection and Railway deployment');
  process.exit(1);
}

console.log('🔗 Connecting to PostgreSQL database...');

// Create PostgreSQL client with connection pooling
// Enhanced for Railway/Replit PostgreSQL connection
const client = postgres(databaseUrl, {
  max: 10, // Maximum connection pool size
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: databaseUrl.includes('localhost') ? false : 'require', // Enable SSL for production
  transform: {
    undefined: null // Handle undefined values properly
  }
});

// Create Drizzle database instance with schema
export const db = drizzle(client, { schema });

// Connection health check function
export async function checkDatabaseConnection(): Promise<{
  connected: boolean;
  status: string;
  error?: string;
}> {
  try {
    // Test connection with a simple query
    await client`SELECT 1 as test`;
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

// Initialize database connection and log status
async function initializeDatabase() {
  try {
    const connectionStatus = await checkDatabaseConnection();
    if (connectionStatus.connected) {
      console.log('✅ PostgreSQL database connected successfully');
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

// Initialize connection immediately
initializeDatabase().catch((error) => {
  console.error('❌ CRITICAL: Failed to initialize database connection');
  console.error('This will prevent Railway deployment from working properly');
  process.exit(1);
});

export default db;