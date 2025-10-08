/**
 * 🚂 RAILWAY DATABASE CONFIGURATION
 * 
 * PostgreSQL database configuration for Railway deployment
 * Seamlessly switches between SQLite (development) and PostgreSQL (production)
 */

import { drizzle } from 'drizzle-orm/postgres-js';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import postgres from 'postgres';
import * as schema from '../../shared/schema';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import { migrate as migrateSQLite } from 'drizzle-orm/better-sqlite3/migrator';
import { join } from 'path';

export interface DatabaseConfig {
  isProduction: boolean;
  isRailway: boolean;
  connectionString?: string;
  db: any;
  type: 'postgresql' | 'sqlite';
}

/**
 * Initialize database connection based on environment
 */
export async function initializeDatabase(): Promise<DatabaseConfig> {
  const isProduction = process.env.NODE_ENV === 'production';
  const isRailway = !!process.env.RAILWAY_ENVIRONMENT || !!process.env.DATABASE_URL;
  const databaseUrl = process.env.DATABASE_URL;

  console.log('🔧 Initializing database...');
  console.log(`   Environment: ${process.env.NODE_ENV}`);
  console.log(`   Railway: ${isRailway ? '✅' : '❌'}`);
  console.log(`   Database URL: ${databaseUrl ? '✅ Provided' : '❌ Not provided'}`);

  if (isRailway && databaseUrl) {
    return initializePostgreSQL(databaseUrl);
  } else {
    return initializeSQLite();
  }
}

/**
 * Initialize PostgreSQL connection for Railway
 */
async function initializePostgreSQL(databaseUrl: string): Promise<DatabaseConfig> {
  try {
    console.log('🐘 Connecting to PostgreSQL (Railway)...');
    
    // Create PostgreSQL connection with proper SSL configuration
    const client = postgres(databaseUrl, {
      ssl: 'prefer',
      max: 10,
      idle_timeout: 20,
      connect_timeout: 10,
    });

    const db = drizzle(client, { schema });

    // Run migrations automatically on Railway
    try {
      console.log('🔄 Running database migrations...');
      await migrate(db, { migrationsFolder: './migrations' });
      console.log('✅ Database migrations completed');
    } catch (migrationError) {
      console.warn('⚠️ Migration warning (may be expected on fresh deployment):', migrationError);
      // Don't fail deployment if migrations have issues - let the app start
    }

    // Test connection
    await testPostgreSQLConnection(client);

    console.log('✅ PostgreSQL connected successfully');
    
    return {
      isProduction: true,
      isRailway: true,
      connectionString: databaseUrl,
      db,
      type: 'postgresql',
    };
  } catch (error) {
    console.error('❌ PostgreSQL connection failed:', error);
    
    // Fallback to SQLite if PostgreSQL fails
    console.log('🔄 Falling back to SQLite...');
    return initializeSQLite();
  }
}

/**
 * Initialize SQLite connection for development/fallback
 */
function initializeSQLite(): DatabaseConfig {
  try {
    console.log('📦 Connecting to SQLite...');
    
    const dbPath = join(process.cwd(), 'dha_database.sqlite');
    const sqliteDB = new Database(dbPath);
    const db = drizzleSQLite(sqliteDB, { schema });

    // Run SQLite migrations
    try {
      migrateSQLite(db, { migrationsFolder: './migrations' });
      console.log('✅ SQLite migrations completed');
    } catch (migrationError) {
      console.warn('⚠️ SQLite migration warning:', migrationError);
    }

    // Create essential tables for SQLite fallback
    initializeSQLiteTables(sqliteDB);

    console.log('✅ SQLite connected successfully');
    
    return {
      isProduction: false,
      isRailway: false,
      connectionString: dbPath,
      db,
      type: 'sqlite',
    };
  } catch (error) {
    console.error('❌ SQLite connection failed:', error);
    throw new Error('Database initialization failed completely');
  }
}

/**
 * Test PostgreSQL connection
 */
async function testPostgreSQLConnection(client: postgres.Sql): Promise<void> {
  try {
    const result = await client`SELECT NOW() as current_time`;
    console.log(`🕐 PostgreSQL server time: ${result[0]?.current_time}`);
  } catch (error) {
    throw new Error(`PostgreSQL connection test failed: ${error}`);
  }
}

/**
 * Initialize essential SQLite tables for fallback
 */
function initializeSQLiteTables(db: Database.Database): void {
  try {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        username TEXT UNIQUE NOT NULL,
        email TEXT UNIQUE,
        password TEXT NOT NULL,
        role TEXT DEFAULT 'user',
        is_active BOOLEAN DEFAULT true,
        failed_attempts INTEGER DEFAULT 0,
        locked_until DATETIME,
        last_failed_attempt DATETIME,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS conversations (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT NOT NULL REFERENCES users(id),
        title TEXT NOT NULL,
        last_message_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS messages (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        conversation_id TEXT NOT NULL REFERENCES conversations(id),
        content TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS documents (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT REFERENCES users(id),
        type TEXT NOT NULL,
        status TEXT DEFAULT 'generated',
        content BLOB,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS security_events (
        id TEXT PRIMARY KEY DEFAULT (hex(randomblob(16))),
        user_id TEXT REFERENCES users(id),
        event_type TEXT NOT NULL,
        severity TEXT DEFAULT 'medium',
        description TEXT NOT NULL,
        metadata TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Insert default admin user if not exists
    const adminExists = db.prepare('SELECT COUNT(*) as count FROM users WHERE username = ?').get('admin');
    if (!adminExists || adminExists.count === 0) {
      db.prepare(`
        INSERT INTO users (username, email, password, role) 
        VALUES (?, ?, ?, ?)
      `).run('admin', 'admin@dha.gov.za', 'admin123', 'super_admin');
      
      console.log('👤 Default admin user created');
    }

    console.log('📋 SQLite tables initialized');
  } catch (error) {
    console.error('❌ SQLite table initialization failed:', error);
    throw error;
  }
}

/**
 * Health check for database connection
 */
export async function checkDatabaseHealth(config: DatabaseConfig): Promise<{
  healthy: boolean;
  type: string;
  connectionString?: string;
  error?: string;
}> {
  try {
    if (config.type === 'postgresql') {
      // PostgreSQL health check
      const result = await config.db.execute('SELECT 1 as health_check');
      return {
        healthy: true,
        type: 'PostgreSQL (Railway)',
        connectionString: config.connectionString?.replace(/:[^:]*@/, ':***@'), // Hide password
      };
    } else {
      // SQLite health check
      const result = config.db.all('SELECT 1 as health_check');
      return {
        healthy: true,
        type: 'SQLite (Local)',
        connectionString: config.connectionString,
      };
    }
  } catch (error) {
    return {
      healthy: false,
      type: config.type,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Export the initialized database configuration
 */
let databaseConfig: DatabaseConfig;

export async function getDatabaseConfig(): Promise<DatabaseConfig> {
  if (!databaseConfig) {
    databaseConfig = await initializeDatabase();
  }
  return databaseConfig;
}

// Initialize database on module load
initializeDatabase()
  .then(config => {
    databaseConfig = config;
    console.log(`🎯 Database ready: ${config.type.toUpperCase()}`);
  })
  .catch(error => {
    console.error('💥 Database initialization failed:', error);
    process.exit(1);
  });