const { pgTable, text, integer, timestamp, boolean, varchar, serial, jsonb } = require('drizzle-orm/pg-core');
const { sql } = require('drizzle-orm');

// Users table
const users = pgTable('users', {
  id: serial('id').primaryKey(),
  username: varchar('username', { length: 255 }).notNull().unique(),
  email: varchar('email', { length: 255 }).notNull().unique(),
  password: varchar('password', { length: 255 }),
  hashedPassword: varchar('hashed_password', { length: 255 }),
  role: varchar('role', { length: 50 }).default('user'),
  isActive: boolean('is_active').default(true),
  mustChangePassword: boolean('must_change_password').default(false),
  failedAttempts: integer('failed_attempts').default(0),
  lockedUntil: timestamp('locked_until'),
  lastFailedAttempt: timestamp('last_failed_attempt'),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

// Documents table
const documents = pgTable('documents', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending'),
  data: jsonb('data'),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

// Conversations table
const conversations = pgTable('conversations', {
  id: serial('id').primaryKey(),
  title: varchar('title', { length: 255 }),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`),
  updatedAt: timestamp('updated_at').default(sql`CURRENT_TIMESTAMP`)
});

// Messages table
const messages = pgTable('messages', {
  id: serial('id').primaryKey(),
  conversationId: integer('conversation_id').references(() => conversations.id),
  role: varchar('role', { length: 20 }).notNull(),
  content: text('content').notNull(),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`)
});

// Security events table
const securityEvents = pgTable('security_events', {
  id: serial('id').primaryKey(),
  type: varchar('type', { length: 100 }).notNull(),
  description: text('description'),
  ipAddress: varchar('ip_address', { length: 45 }),
  userAgent: text('user_agent'),
  userId: integer('user_id').references(() => users.id),
  createdAt: timestamp('created_at').default(sql`CURRENT_TIMESTAMP`)
});

// System metrics table
const systemMetrics = pgTable('system_metrics', {
  id: serial('id').primaryKey(),
  metricType: varchar('metric_type', { length: 100 }).notNull(),
  value: text('value'),
  timestamp: timestamp('timestamp').default(sql`CURRENT_TIMESTAMP`)
});

module.exports = {
  users,
  documents,
  conversations,
  messages,
  securityEvents,
  systemMetrics
};