import { drizzle } from 'drizzle-orm/postgres-js';
import { migrate } from 'drizzle-orm/postgres-js/migrator';
import postgres from 'postgres';
import { fileURLToPath } from 'url';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/dha_database';

// For migrations
const migrationClient = postgres(databaseUrl, { max: 1 });

async function main() {
  try {
    await migrate(drizzle(migrationClient), {
      migrationsFolder: path.join(__dirname, '..', '..', 'migrations')
    });
    console.log('Migration complete');
    process.exit(0);
  } catch (error) {
    console.error('Migration failed:', error);
    process.exit(1);
  }
}

main();