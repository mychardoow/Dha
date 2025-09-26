#!/usr/bin/env tsx
/**
 * Direct database connection test
 */

import postgres from 'postgres';

let databaseUrl = process.env.DATABASE_URL;

console.log('DATABASE_URL available:', !!databaseUrl);
console.log('DATABASE_URL starts with:', databaseUrl?.substring(0, 20));

if (!databaseUrl) {
  console.error('❌ DATABASE_URL is not set');
  process.exit(1);
}

// Fix malformed DATABASE_URL - ensure it has proper schema format
if (databaseUrl.startsWith('postgresql:') && !databaseUrl.startsWith('postgresql://')) {
  databaseUrl = databaseUrl.replace('postgresql:', 'postgresql://');
  console.log('🔧 Fixed DATABASE_URL format (added missing //)');
}

async function testConnection() {
  try {
    console.log('🔧 Creating postgres client...');
    const client = postgres(databaseUrl, {
      max: 1,
      ssl: 'require',
      connect_timeout: 10
    });
    
    console.log('🔧 Testing connection with simple query...');
    const result = await client`SELECT version() as version, current_database() as database`;
    console.log('✅ Connection successful!');
    console.log('Database:', result[0].database);
    console.log('Version:', result[0].version);
    
    // Check if DHA tables exist
    console.log('\n🔧 Checking for DHA tables...');
    const tables = await client`
      SELECT tablename 
      FROM pg_tables 
      WHERE schemaname = 'public' 
      AND tablename LIKE 'dha_%'
      ORDER BY tablename
    `;
    
    console.log('DHA tables found:', tables.length);
    tables.forEach(t => console.log(`  - ${t.tablename}`));
    
    await client.end();
    console.log('\n✅ Database connection test completed successfully');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

testConnection();