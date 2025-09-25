import { sql } from "drizzle-orm";
import { pgTable, text, integer, real, blob, varchar, timestamp, boolean, jsonb, decimal, check, serial } from "drizzle-orm/pg-core";
import { z } from "zod";

// ===================== POSTGRESQL COMPATIBLE SCHEMA =====================

// Type definitions for enum-like values
export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'GENERATE_DOCUMENT' | 'VALIDATE_BIOMETRIC';
export type ComplianceEventType = 'POPIA_CONSENT' | 'DATA_ACCESS' | 'DATA_EXPORT' | 'BIOMETRIC_CAPTURE' | 'DOCUMENT_GENERATION';
export type UserRole = 'user' | 'admin' | 'dha_officer' | 'manager' | 'super_admin' | 'raeesa_ultra';
export type DocumentType = 'smart_id_card' | 'identity_document_book' | 'south_african_passport' | 'birth_certificate';
export type ProcessingStatus = 'pending' | 'processing' | 'validated' | 'verified' | 'approved' | 'rejected' | 'issued';

// Export constants for backwards compatibility
export const AuditAction = {
  CREATE: 'CREATE' as const,
  READ: 'READ' as const,
  UPDATE: 'UPDATE' as const,
  DELETE: 'DELETE' as const,
  LOGIN: 'LOGIN' as const,
  LOGOUT: 'LOGOUT' as const,
  GENERATE_DOCUMENT: 'GENERATE_DOCUMENT' as const,
  VALIDATE_BIOMETRIC: 'VALIDATE_BIOMETRIC' as const
} as const;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  hashedPassword: text("hashed_password"),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").default(false),

  // Account lockout fields for brute force protection
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  lastFailedAttempt: text("last_failed_attempt"),

  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  lastMessageAt: timestamp("last_message_at").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing additional data like context used
  attachments: jsonb("attachments"), // For storing document attachments with OCR data
  aiContext: jsonb("ai_context"), // AI-specific context like extracted fields, suggestions
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  storagePath: text("storage_path").notNull(),
  encryptionKey: text("encryption_key"),
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  processingStatus: text("processing_status").notNull().default("pending"),
  ocrText: text("ocr_text"),
  ocrConfidence: integer("ocr_confidence"),
  isVerified: boolean("is_verified"),
  verificationScore: integer("verification_score"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull().default("medium"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const fraudAlerts = pgTable("fraud_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  alertType: text("alert_type").notNull(),
  riskScore: integer("risk_score").notNull(),
  details: jsonb("details"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: text("metric_type").notNull(),
  value: integer("value").notNull(),
  unit: text("unit").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;
export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = typeof fraudAlerts.$inferInsert;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = typeof systemMetrics.$inferInsert;