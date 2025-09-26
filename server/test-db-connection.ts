import postgres from "postgres";

// Get DATABASE_URL from environment
let databaseUrl = process.env.DATABASE_URL;

console.log("Raw DATABASE_URL (first 50 chars):", databaseUrl?.substring(0, 50) + "...");

if (!databaseUrl) {
  console.error('❌ CRITICAL ERROR: DATABASE_URL environment variable is not set');
  process.exit(1);
}

// Fix DATABASE_URL format if it's missing the protocol separator
if (databaseUrl.startsWith('postgresql:') && !databaseUrl.includes('://')) {
  // The URL is in the format postgresql:username:password@host... 
  // Convert it to postgresql://username:password@host...
  const urlParts = databaseUrl.substring('postgresql:'.length);
  databaseUrl = `postgresql://${urlParts}`;
  console.log('🔧 Fixed DATABASE_URL format for proper connection');
  console.log("Fixed DATABASE_URL (first 50 chars):", databaseUrl.substring(0, 50) + "...");
}

console.log('🔗 Attempting to connect to PostgreSQL database...');

// Create PostgreSQL client
const client = postgres(databaseUrl, {
  max: 1,
  idle_timeout: 20,
  connect_timeout: 10,
  ssl: 'require',
  transform: {
    undefined: null
  },
  onnotice: () => {},
  prepare: false
});

// Test connection
async function testConnection() {
  try {
    const result = await client`SELECT 1 as test, current_database() as db_name, version() as db_version`;
    console.log('✅ Database connected successfully!');
    console.log('Database:', result[0].db_name);
    console.log('Version:', result[0].db_version?.split(',')[0]);
    
    // Check if DHA tables exist
    const tables = await client`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name LIKE 'dha_%'
      ORDER BY table_name
    `;
    
    if (tables.length > 0) {
      console.log('\n📋 Existing DHA tables:');
      tables.forEach(t => console.log('  -', t.table_name));
    } else {
      console.log('\n⚠️ No DHA tables found in database');
      console.log('Run the seed script to create tables');
    }
    
    await client.end();
    process.exit(0);
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    await client.end();
    process.exit(1);
  }
}

testConnection();