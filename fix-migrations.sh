#!/bin/bash
set -e

echo "🔧 Fixing database migrations and configurations..."

# Create SQLite-compatible migrations
cat > drizzle/0000_sqlite_enums.sql << EOL
-- Create tables for enum-like functionality in SQLite
CREATE TABLE IF NOT EXISTS compliance_event_type (
    value TEXT PRIMARY KEY
);

-- Insert enum values
INSERT OR IGNORE INTO compliance_event_type (value) VALUES
    ('DATA_ACCESS'),
    ('DATA_MODIFICATION'),
    ('SECURITY_VIOLATION'),
    ('POLICY_VIOLATION'),
    ('AUDIT_TRAIL');

-- Add other enum tables as needed here
EOL

# Update database configuration
cat > server/config/database-config.ts << EOL
export const databaseConfig = {
    type: process.env.DATABASE_TYPE || 'sqlite',
    url: process.env.DATABASE_URL,
    sqliteFile: process.env.SQLITE_FILE || 'data/production.sqlite',
    maxPoolSize: parseInt(process.env.DB_POOL_SIZE || '20'),
    sslMode: process.env.DB_SSL_MODE || 'require',
    retryAttempts: 5,
    retryDelay: 2000,
    fallbackToSQLite: true
};
EOL

echo "✅ Migration fixes created!"