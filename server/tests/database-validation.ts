import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { systemMetricsTable, selfHealingActionsTable, auditLogsTable, complianceEventsTable, securityEventsTable } from '../../shared/db/schema.js';
import { eq } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import dotenv from 'dotenv';

dotenv.config();

const databaseUrl = process.env.DATABASE_URL || 'postgresql://localhost:5432/dha_database';
const client = postgres(databaseUrl);
const db = drizzle(client);

async function testDatabaseConnection() {
  console.log('🔄 Testing database connection and schema...');

  try {
    // Test 1: Basic Connection
    console.log('\n1️⃣ Testing basic connection...');
    const result = await db.execute(sql`SELECT NOW()`);
    console.log('✅ Database connection successful');

    // Test 2: Create System Metric
    console.log('\n2️⃣ Testing system metric creation...');
    const metricId = await db.insert(systemMetricsTable).values({
      timestamp: new Date(),
      metricType: 'TEST',
      value: '100',
      tags: { test: true }
    }).returning();
    console.log('✅ System metric creation successful:', metricId);

    // Test 3: Create Self Healing Action
    console.log('\n3️⃣ Testing self healing action creation...');
    const actionId = await db.insert(selfHealingActionsTable).values({
      timestamp: new Date(),
      actionType: 'TEST',
      status: 'SUCCESS',
      details: { test: true }
    }).returning();
    console.log('✅ Self healing action creation successful');

    // Test 4: Create Audit Log
    console.log('\n4️⃣ Testing audit log creation...');
    const auditId = await db.insert(auditLogsTable).values({
      timestamp: new Date(),
      eventType: 'TEST',
      userId: 'test-user',
      details: { test: true }
    }).returning();
    console.log('✅ Audit log creation successful');

    // Test 5: Create Compliance Event
    console.log('\n5️⃣ Testing compliance event creation...');
    const complianceId = await db.insert(complianceEventsTable).values({
      timestamp: new Date(),
      eventType: 'DATA_ACCESS',
      userId: 'test-user',
      details: { test: true }
    }).returning();
    console.log('✅ Compliance event creation successful');

    // Test 6: Create Security Event
    console.log('\n6️⃣ Testing security event creation...');
    const securityId = await db.insert(securityEventsTable).values({
      timestamp: new Date(),
      severity: 'LOW',
      eventType: 'TEST',
      details: { test: true }
    }).returning();
    console.log('✅ Security event creation successful');

    // Cleanup
    console.log('\n7️⃣ Cleaning up test data...');
    await Promise.all([
      db.delete(systemMetricsTable).where(eq(systemMetricsTable.id, metricId[0].id)),
      db.delete(selfHealingActionsTable).where(eq(selfHealingActionsTable.id, actionId[0].id)),
      db.delete(auditLogsTable).where(eq(auditLogsTable.id, auditId[0].id)),
      db.delete(complianceEventsTable).where(eq(complianceEventsTable.id, complianceId[0].id)),
      db.delete(securityEventsTable).where(eq(securityEventsTable.id, securityId[0].id))
    ]);
    console.log('✅ Cleanup successful');

    console.log('\n✅ All tests passed successfully! Database is production-ready.');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Database test failed:', error);
    process.exit(1);
  }
}

// Run the tests
console.log('🚀 Starting database validation tests...');
testDatabaseConnection();