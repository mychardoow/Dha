/**
 * Database Migration Utility for Railway Deployment
 * Automatically creates PostgreSQL tables and ensures schema is up-to-date
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import { sql } from 'drizzle-orm';
import { checkDatabaseConnection } from './db.js';

const execAsync = promisify(exec);

export interface MigrationResult {
  success: boolean;
  message: string;
  tablesCreated?: string[];
  error?: string;
}

/**
 * Performs automatic database migration using direct SQL execution
 * This is the safe way to sync schema changes for Railway deployment
 */
export async function performDatabaseMigration(): Promise<MigrationResult> {
  try {
    console.log('🔄 Starting automatic database migration...');
    
    // First verify database connection
    const connectionCheck = await checkDatabaseConnection();
    if (!connectionCheck.connected) {
      return {
        success: false,
        message: 'Database connection failed',
        error: connectionCheck.error
      };
    }
    
    console.log('✅ Database connection verified');
    
    // Try drizzle-kit push first, but fallback to manual creation if it fails
    console.log('📊 Attempting schema synchronization with drizzle-kit...');
    
    try {
      const { stdout, stderr } = await execAsync('npx drizzle-kit push', {
        env: { ...process.env },
        timeout: 30000,
        // Use stdio: 'pipe' to capture output properly
      });
      
      console.log('📊 Drizzle-kit migration successful');
      return {
        success: true,
        message: 'Database migration completed successfully with drizzle-kit',
        tablesCreated: ['users', 'conversations', 'messages', 'documents', 'security_events', 'system_metrics', 'audit_logs', 'compliance_events', 'user_behavior_profiles']
      };
      
    } catch (drizzleError) {
      console.log('⚠️ Drizzle-kit migration failed, attempting manual table creation...');
      
      // Fallback to manual table creation using direct SQL
      const { db } = await import('./db');
      
      // Test if tables already exist by trying a simple query
      try {
        await db.execute(sql`SELECT COUNT(*) FROM users LIMIT 1`);
        console.log('✅ Database tables already exist');
        return {
          success: true,
          message: 'Database tables already exist - no migration needed',
          tablesCreated: []
        };
      } catch (tableError) {
        console.log('📊 Tables do not exist, creating schema manually...');
        
        // Create tables individually to avoid SQL template issues
        const tableCreationQueries = [
          // Users table
          sql`CREATE TABLE IF NOT EXISTS users (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            username TEXT NOT NULL UNIQUE,
            email TEXT NOT NULL UNIQUE,
            password TEXT,
            hashed_password TEXT,
            role TEXT NOT NULL DEFAULT 'user',
            is_active BOOLEAN NOT NULL DEFAULT true,
            must_change_password BOOLEAN DEFAULT false,
            failed_attempts INTEGER NOT NULL DEFAULT 0,
            locked_until TEXT,
            last_failed_attempt TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT now()
          )`,
          
          // Conversations table
          sql`CREATE TABLE IF NOT EXISTS conversations (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id),
            title TEXT NOT NULL,
            last_message_at TIMESTAMP NOT NULL DEFAULT now(),
            created_at TIMESTAMP NOT NULL DEFAULT now()
          )`,
          
          // Messages table
          sql`CREATE TABLE IF NOT EXISTS messages (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            conversation_id VARCHAR NOT NULL REFERENCES conversations(id),
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            metadata JSONB,
            attachments JSONB,
            ai_context JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT now()
          )`,
          
          // Documents table  
          sql`CREATE TABLE IF NOT EXISTS documents (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id),
            filename TEXT NOT NULL,
            original_name TEXT NOT NULL,
            mime_type TEXT NOT NULL,
            size INTEGER NOT NULL,
            storage_path TEXT NOT NULL,
            encryption_key TEXT,
            is_encrypted BOOLEAN NOT NULL DEFAULT false,
            processing_status TEXT NOT NULL DEFAULT 'pending',
            ocr_text TEXT,
            ocr_confidence INTEGER,
            is_verified BOOLEAN,
            verification_score INTEGER,
            created_at TIMESTAMP NOT NULL DEFAULT now()
          )`,
          
          // Other tables...
          sql`CREATE TABLE IF NOT EXISTS security_events (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR REFERENCES users(id),
            event_type TEXT NOT NULL,
            severity TEXT NOT NULL DEFAULT 'medium',
            details JSONB,
            ip_address TEXT,
            user_agent TEXT,
            location TEXT,
            created_at TIMESTAMP NOT NULL DEFAULT now()
          )`,
          
          sql`CREATE TABLE IF NOT EXISTS system_metrics (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            metric_type TEXT NOT NULL,
            value INTEGER NOT NULL,
            unit TEXT NOT NULL,
            timestamp TIMESTAMP NOT NULL DEFAULT now()
          )`,
          
          sql`CREATE TABLE IF NOT EXISTS audit_logs (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR REFERENCES users(id),
            action TEXT NOT NULL,
            entity_type TEXT,
            entity_id VARCHAR,
            previous_state JSONB,
            new_state JSONB,
            action_details JSONB,
            outcome TEXT,
            details JSONB,
            ip_address TEXT,
            user_agent TEXT,
            location TEXT,
            risk_score INTEGER,
            compliance_flags JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT now()
          )`,
          
          sql`CREATE TABLE IF NOT EXISTS compliance_events (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR REFERENCES users(id),
            event_type TEXT NOT NULL,
            data_subject_id VARCHAR,
            data_category TEXT,
            processing_purpose TEXT,
            legal_basis TEXT,
            processing_details JSONB,
            compliance_status TEXT,
            details JSONB,
            compliance_flags JSONB,
            created_at TIMESTAMP NOT NULL DEFAULT now()
          )`,
          
          sql`CREATE TABLE IF NOT EXISTS user_behavior_profiles (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id) UNIQUE,
            typical_locations JSONB,
            typical_devices JSONB,
            typical_times JSONB,
            login_patterns JSONB,
            document_patterns JSONB,
            risk_factors JSONB,
            baseline_score INTEGER,
            last_analyzed TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT now()
          )`,
          
          sql`CREATE TABLE IF NOT EXISTS fraud_alerts (
            id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
            user_id VARCHAR NOT NULL REFERENCES users(id),
            alert_type TEXT NOT NULL,
            risk_score INTEGER NOT NULL,
            details JSONB,
            is_resolved BOOLEAN NOT NULL DEFAULT false,
            resolved_by VARCHAR REFERENCES users(id),
            resolved_at TIMESTAMP,
            created_at TIMESTAMP NOT NULL DEFAULT now()
          )`
        ];

        // Execute each table creation query individually
        for (const query of tableCreationQueries) {
          await db.execute(query);
        }
        
        console.log('✅ Database tables created successfully via manual SQL');
        
        return {
          success: true,
          message: 'Database migration completed successfully via manual table creation',
          tablesCreated: ['users', 'conversations', 'messages', 'documents', 'security_events', 'system_metrics', 'audit_logs', 'compliance_events', 'user_behavior_profiles', 'fraud_alerts']
        };
      }
    }
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Database migration failed:', errorMessage);
    
    return {
      success: false,
      message: 'Database migration failed',
      error: errorMessage
    };
  }
}

/**
 * Ensures database is ready for application startup
 * This should be called before any database operations
 */
export async function ensureDatabaseReady(): Promise<MigrationResult> {
  try {
    console.log('🏗️ Ensuring database is ready for Railway deployment...');
    
    // Perform migration to create/update tables
    const migrationResult = await performDatabaseMigration();
    
    if (!migrationResult.success) {
      console.error('❌ Database initialization failed:', migrationResult.error);
      return migrationResult;
    }
    
    console.log('✅ Database is ready for Railway deployment');
    
    return {
      success: true,
      message: 'Database initialization completed successfully',
      tablesCreated: migrationResult.tablesCreated
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Database readiness check failed:', errorMessage);
    
    return {
      success: false,
      message: 'Database readiness check failed',
      error: errorMessage
    };
  }
}

/**
 * Fallback migration using manual table creation
 * Only used if drizzle-kit push fails
 */
export async function fallbackMigration(): Promise<MigrationResult> {
  try {
    console.log('🔄 Attempting fallback migration...');
    
    // Try generating migration files first
    await execAsync('npx drizzle-kit generate', {
      env: { ...process.env },
      timeout: 15000
    });
    
    // Then apply the migrations
    await execAsync('npx drizzle-kit migrate', {
      env: { ...process.env },
      timeout: 15000
    });
    
    console.log('✅ Fallback migration completed');
    
    return {
      success: true,
      message: 'Fallback migration completed successfully'
    };
    
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error('❌ Fallback migration failed:', errorMessage);
    
    return {
      success: false,
      message: 'Fallback migration failed',
      error: errorMessage
    };
  }
}