import { join } from 'path';
import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import * as schema from '../../shared/schema.js';

export async function initializeTestDatabase() {
  const dbPath = join(process.cwd(), 'test_database.sqlite');
  const sqliteDB = new Database(dbPath);
  const db = drizzle(sqliteDB, { schema });

  return {
    isProduction: false,
    isRailway: false,
    connectionString: dbPath,
    db,
    type: 'sqlite' as const
  };
}