import { sql } from "drizzle-orm";
import { pgTable, text, integer, timestamp, boolean, jsonb, varchar } from "drizzle-orm/pg-core";

// Base Types
export interface Coordinates {
  lat: number;
  lng: number;
}

export interface Location {
  country?: string;
  region?: string;
  city?: string;
  coordinates?: Coordinates;
}

// Core Tables
export const dhaDocumentVerifications = pgTable("dha_document_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  verificationCode: text("verification_code").notNull().unique(),
  documentNumber: text("document_number"),
  documentType: text("document_type"),
  issuedAt: timestamp("issued_at"),
  expiresAt: timestamp("expires_at"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
  userId: varchar("user_id"),
  documentData: jsonb("document_data"),
  verificationStatus: text("verification_status").notNull().default("pending"),
  verificationMethod: text("verification_method"),
  verificationResult: jsonb("verification_result"),
  aiScore: integer("ai_score"),
  humanVerified: boolean("human_verified").notNull().default(false),
  lastVerifiedAt: timestamp("last_verified_at"),
  revokedAt: timestamp("revoked_at"),
  revocationReason: text("revocation_reason")
});

export const verificationSessions = pgTable("verification_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id"),
  sessionToken: text("session_token").notNull().unique(),
  status: text("status").notNull().default("active"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at").notNull(),
  lastActivity: timestamp("last_activity"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: jsonb("metadata"),
  currentVerifications: integer("current_verifications").notNull().default(0),
  maxVerifications: integer("max_verifications").notNull().default(100),
  isActive: boolean("is_active").notNull().default(true)
});

export const apiAccess = pgTable("api_access", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  apiKeyId: text("api_key_id").notNull().unique(),
  isActive: boolean("is_active").notNull().default(true),
  hourlyQuota: integer("hourly_quota").notNull().default(1000),
  currentHourlyUsage: integer("current_hourly_usage").notNull().default(0),
  lastResetAt: timestamp("last_reset_at").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  metadata: jsonb("metadata")
});

export const verificationHistory = pgTable("verification_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  verificationId: varchar("verification_id").notNull().references(() => dhaDocumentVerifications.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  ipAddress: text("ip_address"),
  location: jsonb("location"),
  userAgent: text("user_agent"),
  verificationMethod: text("verification_method").notNull(),
  isSuccessful: boolean("is_successful").notNull(),
  metadata: jsonb("metadata")
});

// Type exports
export type DhaDocumentVerification = typeof dhaDocumentVerifications.$inferSelect;
export type InsertDhaDocumentVerification = typeof dhaDocumentVerifications.$inferInsert;

export type VerificationSession = typeof verificationSessions.$inferSelect;
export type InsertVerificationSession = typeof verificationSessions.$inferInsert;

export type ApiAccess = typeof apiAccess.$inferSelect;
export type InsertApiAccess = typeof apiAccess.$inferInsert;

export type VerificationHistory = typeof verificationHistory.$inferSelect;
export type InsertVerificationHistory = typeof verificationHistory.$inferInsert;