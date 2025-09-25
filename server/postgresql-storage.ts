import { db } from "./db";
import { 
  users, conversations, messages, documents, securityEvents, fraudAlerts, 
  systemMetrics, auditLogs, complianceEvents, userBehaviorProfiles,
  type User, type InsertUser,
  type Conversation, type InsertConversation,
  type Message, type InsertMessage,
  type Document, type InsertDocument,
  type SecurityEvent, type InsertSecurityEvent,
  type FraudAlert, type InsertFraudAlert,
  type SystemMetric, type InsertSystemMetric,
  type AuditLog, type InsertAuditLog,
  type ComplianceEvent, type InsertComplianceEvent,
  type UserBehaviorProfile, type InsertUserBehaviorProfile
} from "@shared/schema";
import { eq, desc, and, gte, sql, or, isNull, count } from "drizzle-orm";
// Storage interface definition for PostgreSQL implementation
export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  getUsers(): Promise<User[]>;

  // Conversation management
  getConversation(id: string): Promise<Conversation | undefined>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  getConversations(): Promise<Conversation[]>;

  // Message management
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Document management
  getDocument(id: string): Promise<Document | undefined>;
  getUserDocuments(userId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;
  getDocuments(): Promise<Document[]>;

  // Security management
  createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent>;
  getSecurityEvents(userId: string): Promise<SecurityEvent[]>;
  getAllSecurityEvents(): Promise<SecurityEvent[]>;

  // System metrics
  createSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric>;
  getSystemMetrics(): Promise<SystemMetric[]>;

  // Audit and compliance methods
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogs(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]>;
  createComplianceEvent(event: InsertComplianceEvent): Promise<ComplianceEvent>;
  getComplianceReport(regulation: string, startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    complianceRate: number;
    events: ComplianceEvent[];
  }>;
  
  // User behavior profile methods
  getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | undefined>;
  createUserBehaviorProfile(profile: InsertUserBehaviorProfile): Promise<UserBehaviorProfile>;
  updateUserBehaviorProfile(userId: string, updates: Partial<UserBehaviorProfile>): Promise<UserBehaviorProfile | undefined>;

  // Statistics
  getStats(): Promise<{ users: number; conversations: number; messages: number; documents: number; securityEvents: number; systemMetrics: number; auditLogs: number; complianceEvents: number; userBehaviorProfiles: number; }>;
}
import * as bcrypt from "bcryptjs";

/**
 * PostgreSQL Storage Implementation using Drizzle ORM
 * Replaces MemStorage with persistent database storage for Railway deployment
 */
export class PostgreSQLStorage implements IStorage {

  // ===================== USER MANAGEMENT =====================
  async getUser(id: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user:', error);
      return undefined;
    }
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.email, email)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user by email:', error);
      return undefined;
    }
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    try {
      const result = await db.select().from(users).where(eq(users.username, username)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user by username:', error);
      return undefined;
    }
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    try {
      const result = await db.insert(users).values({
        ...insertUser,
        createdAt: new Date(),
        isActive: insertUser.isActive ?? true,
        failedAttempts: insertUser.failedAttempts || 0,
        role: insertUser.role || "user"
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating user:', error);
      throw new Error('Failed to create user');
    }
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    try {
      const result = await db.update(users)
        .set(updates)
        .where(eq(users.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating user:', error);
      return undefined;
    }
  }

  async getUsers(): Promise<User[]> {
    try {
      return await db.select().from(users).orderBy(desc(users.createdAt));
    } catch (error) {
      console.error('Error getting users:', error);
      return [];
    }
  }

  // ===================== CONVERSATION MANAGEMENT =====================
  async getConversation(id: string): Promise<Conversation | undefined> {
    try {
      const result = await db.select().from(conversations).where(eq(conversations.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting conversation:', error);
      return undefined;
    }
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    try {
      return await db.select().from(conversations)
        .where(eq(conversations.userId, userId))
        .orderBy(desc(conversations.lastMessageAt));
    } catch (error) {
      console.error('Error getting user conversations:', error);
      return [];
    }
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    try {
      const result = await db.insert(conversations).values({
        ...insertConversation,
        createdAt: new Date(),
        lastMessageAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw new Error('Failed to create conversation');
    }
  }

  async getConversations(): Promise<Conversation[]> {
    try {
      return await db.select().from(conversations).orderBy(desc(conversations.lastMessageAt));
    } catch (error) {
      console.error('Error getting conversations:', error);
      return [];
    }
  }

  // ===================== MESSAGE MANAGEMENT =====================
  async getMessages(conversationId: string): Promise<Message[]> {
    try {
      return await db.select().from(messages)
        .where(eq(messages.conversationId, conversationId))
        .orderBy(messages.createdAt);
    } catch (error) {
      console.error('Error getting messages:', error);
      return [];
    }
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    try {
      const result = await db.insert(messages).values({
        ...insertMessage,
        createdAt: new Date(),
        metadata: insertMessage.metadata || null
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating message:', error);
      throw new Error('Failed to create message');
    }
  }

  // ===================== DOCUMENT MANAGEMENT =====================
  async getDocument(id: string): Promise<Document | undefined> {
    try {
      const result = await db.select().from(documents).where(eq(documents.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting document:', error);
      return undefined;
    }
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    try {
      return await db.select().from(documents)
        .where(eq(documents.userId, userId))
        .orderBy(desc(documents.createdAt));
    } catch (error) {
      console.error('Error getting user documents:', error);
      return [];
    }
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    try {
      const result = await db.insert(documents).values({
        ...insertDocument,
        createdAt: new Date(),
        processingStatus: insertDocument.processingStatus || "pending",
        isEncrypted: insertDocument.isEncrypted || false
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating document:', error);
      throw new Error('Failed to create document');
    }
  }

  async getDocuments(): Promise<Document[]> {
    try {
      return await db.select().from(documents).orderBy(desc(documents.createdAt));
    } catch (error) {
      console.error('Error getting documents:', error);
      return [];
    }
  }

  // ===================== SECURITY MANAGEMENT =====================
  async createSecurityEvent(insertEvent: InsertSecurityEvent): Promise<SecurityEvent> {
    try {
      const result = await db.insert(securityEvents).values({
        ...insertEvent,
        createdAt: new Date(),
        severity: insertEvent.severity || "medium"
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating security event:', error);
      throw new Error('Failed to create security event');
    }
  }

  async getSecurityEvents(userId: string): Promise<SecurityEvent[]> {
    try {
      return await db.select().from(securityEvents)
        .where(eq(securityEvents.userId, userId))
        .orderBy(desc(securityEvents.createdAt));
    } catch (error) {
      console.error('Error getting security events:', error);
      return [];
    }
  }

  async getAllSecurityEvents(): Promise<SecurityEvent[]> {
    try {
      return await db.select().from(securityEvents).orderBy(desc(securityEvents.createdAt));
    } catch (error) {
      console.error('Error getting all security events:', error);
      return [];
    }
  }

  // ===================== SYSTEM METRICS =====================
  async createSystemMetric(insertMetric: InsertSystemMetric): Promise<SystemMetric> {
    try {
      const result = await db.insert(systemMetrics).values({
        ...insertMetric,
        timestamp: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating system metric:', error);
      throw new Error('Failed to create system metric');
    }
  }

  async getSystemMetrics(): Promise<SystemMetric[]> {
    try {
      return await db.select().from(systemMetrics).orderBy(desc(systemMetrics.timestamp));
    } catch (error) {
      console.error('Error getting system metrics:', error);
      return [];
    }
  }

  // ===================== AUDIT AND COMPLIANCE =====================
  async createAuditLog(insertAudit: InsertAuditLog): Promise<AuditLog> {
    try {
      const result = await db.insert(auditLogs).values({
        ...insertAudit,
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating audit log:', error);
      throw new Error('Failed to create audit log');
    }
  }

  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    try {
      // Apply filters
      const conditions = [];
      if (filters.userId) conditions.push(eq(auditLogs.userId, filters.userId));
      if (filters.action) conditions.push(eq(auditLogs.action, filters.action));
      if (filters.entityType) conditions.push(eq(auditLogs.entityType, filters.entityType));
      if (filters.startDate) conditions.push(gte(auditLogs.createdAt, filters.startDate));
      if (filters.endDate) conditions.push(sql`${auditLogs.createdAt} <= ${filters.endDate}`);
      
      if (conditions.length > 0) {
        return await db.select().from(auditLogs)
          .where(and(...conditions))
          .orderBy(desc(auditLogs.createdAt))
          .limit(filters.limit || 1000);
      } else {
        return await db.select().from(auditLogs)
          .orderBy(desc(auditLogs.createdAt))
          .limit(filters.limit || 1000);
      }
    } catch (error) {
      console.error('Error getting audit logs:', error);
      return [];
    }
  }

  async createComplianceEvent(insertEvent: InsertComplianceEvent): Promise<ComplianceEvent> {
    try {
      const result = await db.insert(complianceEvents).values({
        ...insertEvent,
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating compliance event:', error);
      throw new Error('Failed to create compliance event');
    }
  }

  async getComplianceReport(regulation: string, startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    complianceRate: number;
    events: ComplianceEvent[];
  }> {
    try {
      // Note: regulation parameter is kept for interface compatibility but not used in query
      // since the schema doesn't have a regulation field
      const events = await db.select().from(complianceEvents)
        .where(and(
          gte(complianceEvents.createdAt, startDate),
          sql`${complianceEvents.createdAt} <= ${endDate}`
        ))
        .orderBy(desc(complianceEvents.createdAt));

      const eventsByType: Record<string, number> = {};
      events.forEach(event => {
        eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      });

      return {
        totalEvents: events.length,
        eventsByType,
        complianceRate: events.length > 0 ? (events.filter(e => e.complianceStatus === 'COMPLIANT').length / events.length) * 100 : 100,
        events
      };
    } catch (error) {
      console.error('Error getting compliance report:', error);
      return { totalEvents: 0, eventsByType: {}, complianceRate: 0, events: [] };
    }
  }

  // ===================== USER BEHAVIOR PROFILES =====================
  async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | undefined> {
    try {
      const result = await db.select().from(userBehaviorProfiles)
        .where(eq(userBehaviorProfiles.userId, userId)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting user behavior profile:', error);
      return undefined;
    }
  }

  async createUserBehaviorProfile(insertProfile: InsertUserBehaviorProfile): Promise<UserBehaviorProfile> {
    try {
      const result = await db.insert(userBehaviorProfiles).values({
        ...insertProfile
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating user behavior profile:', error);
      throw new Error('Failed to create user behavior profile');
    }
  }

  async updateUserBehaviorProfile(userId: string, updates: Partial<UserBehaviorProfile>): Promise<UserBehaviorProfile | undefined> {
    try {
      const result = await db.update(userBehaviorProfiles)
        .set({ ...updates })
        .where(eq(userBehaviorProfiles.userId, userId))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating user behavior profile:', error);
      return undefined;
    }
  }

  // ===================== STATISTICS =====================
  async getStats(): Promise<{ 
    users: number; 
    conversations: number; 
    messages: number; 
    documents: number; 
    securityEvents: number; 
    systemMetrics: number; 
    auditLogs: number; 
    complianceEvents: number; 
    userBehaviorProfiles: number; 
  }> {
    return await this.getStatsAsync();
  }

  // Async version for getting actual stats
  async getStatsAsync(): Promise<{ 
    users: number; 
    conversations: number; 
    messages: number; 
    documents: number; 
    securityEvents: number; 
    systemMetrics: number; 
    auditLogs: number; 
    complianceEvents: number; 
    userBehaviorProfiles: number; 
  }> {
    try {
      const [
        usersCount,
        conversationsCount,
        messagesCount,
        documentsCount,
        securityEventsCount,
        systemMetricsCount,
        auditLogsCount,
        complianceEventsCount,
        userBehaviorProfilesCount
      ] = await Promise.all([
        db.select({ count: count() }).from(users),
        db.select({ count: count() }).from(conversations),
        db.select({ count: count() }).from(messages),
        db.select({ count: count() }).from(documents),
        db.select({ count: count() }).from(securityEvents),
        db.select({ count: count() }).from(systemMetrics),
        db.select({ count: count() }).from(auditLogs),
        db.select({ count: count() }).from(complianceEvents),
        db.select({ count: count() }).from(userBehaviorProfiles)
      ]);

      return {
        users: usersCount[0].count,
        conversations: conversationsCount[0].count,
        messages: messagesCount[0].count,
        documents: documentsCount[0].count,
        securityEvents: securityEventsCount[0].count,
        systemMetrics: systemMetricsCount[0].count,
        auditLogs: auditLogsCount[0].count,
        complianceEvents: complianceEventsCount[0].count,
        userBehaviorProfiles: userBehaviorProfilesCount[0].count
      };
    } catch (error) {
      console.error('Error getting stats:', error);
      return {
        users: 0,
        conversations: 0,
        messages: 0,
        documents: 0,
        securityEvents: 0,
        systemMetrics: 0,
        auditLogs: 0,
        complianceEvents: 0,
        userBehaviorProfiles: 0
      };
    }
  }
}