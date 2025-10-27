/**
 * Database Configuration Service
 * Handles database connections and fallback logic
 */

import { drizzle } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool } from 'pg';
import { Database as SQLiteDatabase, open } from 'sqlite3';
import { drizzle as drizzleSQLite } from 'drizzle-orm/better-sqlite3';
import { migrate as migrateSQLite } from 'drizzle-orm/better-sqlite3/migrator';

interface DatabaseConfig {
    type: 'postgres' | 'sqlite';
    url?: string;
    sqliteFile?: string;
    maxPoolSize?: number;
    sslMode?: string;
}

class DatabaseService {
    private static instance: DatabaseService;
    private config: DatabaseConfig;
    private db: any; // Will hold either PostgreSQL or SQLite connection
    private isConnected: boolean = false;

    private constructor() {
        this.config = {
            type: process.env.DATABASE_TYPE === 'postgres' ? 'postgres' : 'sqlite',
            url: process.env.DATABASE_URL,
            sqliteFile: process.env.SQLITE_FILE || 'data/production.sqlite',
            maxPoolSize: parseInt(process.env.DB_POOL_SIZE || '20'),
            sslMode: process.env.DB_SSL_MODE || 'require'
        };
    }

    public static getInstance(): DatabaseService {
        if (!DatabaseService.instance) {
            DatabaseService.instance = new DatabaseService();
        }
        return DatabaseService.instance;
    }

    public async connect(): Promise<void> {
        try {
            if (this.config.type === 'postgres' && this.config.url) {
                await this.connectPostgres();
            } else {
                await this.connectSQLite();
            }
        } catch (error) {
            console.error('Database connection error:', error);
            await this.handleConnectionError(error);
        }
    }

    private async connectPostgres(): Promise<void> {
        try {
            const pool = new Pool({
                connectionString: this.config.url,
                max: this.config.maxPoolSize,
                ssl: this.config.sslMode === 'require' ? {
                    rejectUnauthorized: false
                } : undefined
            });

            this.db = drizzle(pool);
            await migrate(this.db, {
                migrationsFolder: './drizzle'
            });

            console.log('✅ PostgreSQL connected successfully');
            this.isConnected = true;
        } catch (error) {
            console.error('PostgreSQL connection failed:', error);
            throw error;
        }
    }

    private async connectSQLite(): Promise<void> {
        try {
            const sqlite = open(this.config.sqliteFile || 'data/production.sqlite');
            this.db = drizzleSQLite(sqlite);
            
            await migrateSQLite(this.db, {
                migrationsFolder: './drizzle'
            });

            console.log('✅ SQLite connected successfully');
            this.isConnected = true;
        } catch (error) {
            console.error('SQLite connection failed:', error);
            throw error;
        }
    }

    private async handleConnectionError(error: any): Promise<void> {
        console.error('Database connection error, attempting fallback:', error);

        // If PostgreSQL fails, try SQLite
        if (this.config.type === 'postgres') {
            this.config.type = 'sqlite';
            console.log('🔄 Falling back to SQLite...');
            await this.connectSQLite();
        } else {
            throw new Error('All database connections failed');
        }
    }

    public getDB(): any {
        if (!this.isConnected) {
            throw new Error('Database not connected');
        }
        return this.db;
    }

    public isConnectedToDB(): boolean {
        return this.isConnected;
    }

    public getDatabaseType(): string {
        return this.config.type;
    }
}

export default DatabaseService;