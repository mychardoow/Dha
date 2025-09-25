// PostgreSQL Storage Implementation for Railway Deployment
// This replaces the volatile MemStorage with persistent PostgreSQL database

import { PostgreSQLStorage } from "./postgresql-storage";

// Export the storage interface for backward compatibility
export interface IStorage {
  // User management
  getUser(id: string): Promise<any>;
  getUserByEmail(email: string): Promise<any>;
  getUserByUsername(username: string): Promise<any>;
  createUser(user: any): Promise<any>;
  updateUser(id: string, updates: any): Promise<any>;
  getUsers(): Promise<any[]>;

  // Conversation management
  getConversation(id: string): Promise<any>;
  getUserConversations(userId: string): Promise<any[]>;
  createConversation(conversation: any): Promise<any>;
  getConversations(): Promise<any[]>;

  // Message management
  getMessages(conversationId: string): Promise<any[]>;
  createMessage(message: any): Promise<any>;

  // Document management
  getDocument(id: string): Promise<any>;
  getUserDocuments(userId: string): Promise<any[]>;
  createDocument(document: any): Promise<any>;
  getDocuments(): Promise<any[]>;

  // Security management
  createSecurityEvent(event: any): Promise<any>;
  getSecurityEvents(userId: string): Promise<any[]>;
  getAllSecurityEvents(): Promise<any[]>;

  // System metrics
  createSystemMetric(metric: any): Promise<any>;
  getSystemMetrics(): Promise<any[]>;

  // Audit and compliance methods
  createAuditLog(auditLog: any): Promise<any>;
  getAuditLogs(filters: any): Promise<any[]>;
  createComplianceEvent(event: any): Promise<any>;
  getComplianceReport(regulation: string, startDate: Date, endDate: Date): Promise<any>;
  
  // User behavior profile methods
  getUserBehaviorProfile(userId: string): Promise<any>;
  createUserBehaviorProfile(profile: any): Promise<any>;
  updateUserBehaviorProfile(userId: string, updates: any): Promise<any>;

  // AI Bot Session methods
  getAiBotSession(id: string): Promise<any>;
  getUserAiBotSessions(userId: string): Promise<any[]>;
  createAiBotSession(session: any): Promise<any>;
  updateAiBotSession(id: string, updates: any): Promise<any>;
  deactivateAiBotSession(id: string): Promise<any>;

  // AI Command Interface methods
  getAiCommandInterface(id: string): Promise<any>;
  getSessionAiCommands(sessionId: string): Promise<any[]>;
  createAiCommandInterface(command: any): Promise<any>;
  updateAiCommandInterface(id: string, updates: any): Promise<any>;
  getAiCommandsByStatus(status: string): Promise<any[]>;

  // Statistics
  getStats(): Promise<any>;
}

// Create and export PostgreSQL storage instance
// CRITICAL: This replaces MemStorage to enable Railway deployment
export const storage = new PostgreSQLStorage();

console.log('✅ PostgreSQL storage initialized - MemStorage replaced for Railway deployment');

// Re-export types for backward compatibility
export type {
  User, InsertUser,
  Conversation, InsertConversation,
  Message, InsertMessage,
  Document, InsertDocument,
  SecurityEvent, InsertSecurityEvent,
  FraudAlert, InsertFraudAlert,
  SystemMetric, InsertSystemMetric,
  AuditLog, InsertAuditLog,
  ComplianceEvent, InsertComplianceEvent,
  UserBehaviorProfile, InsertUserBehaviorProfile,
  AiBotSession, InsertAiBotSession,
  AiCommandInterface, InsertAiCommandInterface,
  AiBotMode, AiCommandStatus
} from "@shared/schema";