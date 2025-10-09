import { pgTable, varchar, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const verificationSessions = pgTable("verification_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: text("session_id").notNull().unique(),
  userId: varchar("user_id"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  status: text("status").notNull().default("active"),
  currentVerifications: integer("current_verifications").notNull().default(0),
  lastActivity: timestamp("last_activity").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});