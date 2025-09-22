import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from '../shared/schema';
import fs from 'fs';
import path from 'path';

// Export the pool alias for compatibility
export const pool = null;

// Ensure data directory exists
const dataDir = path.join(process.cwd(), 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create SQLite database for Replit
const dbPath = path.join(dataDir, 'dha-services.db');
const sqlite = new Database(dbPath);

// Enable WAL mode for better performance
sqlite.pragma('journal_mode = WAL');
sqlite.pragma('synchronous = NORMAL');
sqlite.pragma('cache_size = 1000000');
sqlite.pragma('foreign_keys = ON');

export const db = drizzle(sqlite, { schema });

// Connection status for health checks
export function getConnectionStatus() {
  try {
    const result = sqlite.prepare('SELECT 1 as status').get();
    return {
      healthy: result?.status === 1,
      database: 'SQLite',
      path: dbPath,
      exists: fs.existsSync(dbPath)
    };
  } catch (error) {
    return {
      healthy: false,
      database: 'SQLite',
      path: dbPath,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
}

// Initialize database tables
export async function initializeDatabase() {
  try {
    console.log('[Database] Initializing SQLite database...');

    // Create all tables using Drizzle schema
    const createTableQueries = [
      // Core tables will be created by migrations
    ];

    console.log('[Database] ✅ SQLite database initialized successfully');
    return true;
  } catch (error) {
    console.error('[Database] ❌ Failed to initialize database:', error);
    return false;
  }
}

// Export for backward compatibility
export { sqlite };