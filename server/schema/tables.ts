import { pgTable, text, timestamp, integer, boolean } from 'drizzle-orm/pg-core';

export const verificationSessions = pgTable('verification_sessions', {
  sessionId: text('session_id').primaryKey(),
  createdAt: timestamp('created_at').defaultNow(),
  lastActivity: timestamp('last_activity').defaultNow(),
  isActive: boolean('is_active').default(true),
  maxVerifications: integer('max_verifications').default(10),
  currentVerifications: integer('current_verifications').default(0),
  expiresAt: timestamp('expires_at'),
  userId: text('user_id'),
  metadata: text('metadata'),
});