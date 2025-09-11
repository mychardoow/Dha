import { type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage, type Document, type InsertDocument, type SecurityEvent, type InsertSecurityEvent, type FraudAlert, type InsertFraudAlert, type SystemMetric, type InsertSystemMetric, type QuantumKey, type InsertQuantumKey, type ErrorLog, type InsertErrorLog, users, conversations, messages, documents, securityEvents, fraudAlerts, systemMetrics, quantumKeys, errorLogs } from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, gte, sql, or, isNull } from "drizzle-orm";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<void>;

  // Conversation methods
  getConversations(userId: string): Promise<Conversation[]>;
  getConversation(id: string): Promise<Conversation | undefined>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;
  updateConversation(id: string, updates: Partial<Conversation>): Promise<void>;
  deleteConversation(id: string): Promise<void>;

  // Message methods
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Document methods
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  createDocument(document: InsertDocument): Promise<Document>;
  updateDocument(id: string, updates: Partial<Document>): Promise<void>;

  // Security methods
  getSecurityEvents(userId?: string, limit?: number): Promise<SecurityEvent[]>;
  createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent>;

  // Fraud methods
  getFraudAlerts(userId?: string, resolved?: boolean): Promise<FraudAlert[]>;
  createFraudAlert(alert: InsertFraudAlert): Promise<FraudAlert>;
  resolveFraudAlert(alertId: string, resolvedBy: string): Promise<void>;

  // System metrics
  getSystemMetrics(metricType?: string, hours?: number): Promise<SystemMetric[]>;
  createSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric>;

  // Quantum keys
  getQuantumKey(keyId: string): Promise<QuantumKey | undefined>;
  getActiveQuantumKeys(): Promise<QuantumKey[]>;
  createQuantumKey(key: InsertQuantumKey): Promise<QuantumKey>;
  deactivateQuantumKey(keyId: string): Promise<void>;

  // Error logging methods
  createErrorLog(error: InsertErrorLog): Promise<ErrorLog>;
  getErrorLogs(filters?: {
    severity?: string;
    errorType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    isResolved?: boolean;
    limit?: number;
  }): Promise<ErrorLog[]>;
  getErrorLogById(id: string): Promise<ErrorLog | undefined>;
  getRecentErrors(hours?: number, limit?: number): Promise<ErrorLog[]>;
  markErrorResolved(errorId: string, resolvedBy: string): Promise<void>;
  getErrorStats(hours?: number): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byType: Record<string, number>;
  }>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private documents: Map<string, Document>;
  private securityEvents: Map<string, SecurityEvent>;
  private fraudAlerts: Map<string, FraudAlert>;
  private systemMetrics: Map<string, SystemMetric>;
  private quantumKeys: Map<string, QuantumKey>;
  private errorLogs: Map<string, ErrorLog>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.documents = new Map();
    this.securityEvents = new Map();
    this.fraudAlerts = new Map();
    this.systemMetrics = new Map();
    this.quantumKeys = new Map();
    this.errorLogs = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email === email,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      role: insertUser.role || 'user',
      isActive: true, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<void> {
    const user = this.users.get(id);
    if (user) {
      this.users.set(id, { ...user, ...updates });
    }
  }

  async getConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      lastMessageAt: new Date(),
      createdAt: new Date()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async updateConversation(id: string, updates: Partial<Conversation>): Promise<void> {
    const conversation = this.conversations.get(id);
    if (conversation) {
      this.conversations.set(id, { ...conversation, ...updates });
    }
  }

  async deleteConversation(id: string): Promise<void> {
    this.conversations.delete(id);
    // Also delete associated messages
    Array.from(this.messages.entries())
      .filter(([_, message]) => message.conversationId === id)
      .forEach(([messageId]) => this.messages.delete(messageId));
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(message => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      metadata: insertMessage.metadata || null,
      createdAt: new Date()
    };
    this.messages.set(id, message);

    // Update conversation's last message time
    const conversation = this.conversations.get(insertMessage.conversationId);
    if (conversation) {
      conversation.lastMessageAt = new Date();
      this.conversations.set(conversation.id, conversation);
    }

    return message;
  }

  async getDocuments(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      encryptionKey: insertDocument.encryptionKey || null,
      isEncrypted: insertDocument.isEncrypted || false,
      ocrText: insertDocument.ocrText || null,
      ocrConfidence: insertDocument.ocrConfidence || null,
      isVerified: insertDocument.isVerified || false,
      verificationScore: insertDocument.verificationScore || null,
      processingStatus: insertDocument.processingStatus || 'pending',
      createdAt: new Date()
    };
    this.documents.set(id, document);
    return document;
  }

  async updateDocument(id: string, updates: Partial<Document>): Promise<void> {
    const document = this.documents.get(id);
    if (document) {
      this.documents.set(id, { ...document, ...updates });
    }
  }

  async getSecurityEvents(userId?: string, limit = 100): Promise<SecurityEvent[]> {
    let events = Array.from(this.securityEvents.values());
    
    if (userId) {
      events = events.filter(event => event.userId === userId);
    }
    
    return events
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createSecurityEvent(insertEvent: InsertSecurityEvent): Promise<SecurityEvent> {
    const id = randomUUID();
    const event: SecurityEvent = {
      ...insertEvent,
      id,
      userId: insertEvent.userId || null,
      userAgent: insertEvent.userAgent || null,
      ipAddress: insertEvent.ipAddress || null,
      details: insertEvent.details || null,
      location: insertEvent.location || null,
      createdAt: new Date()
    };
    this.securityEvents.set(id, event);
    return event;
  }

  async getFraudAlerts(userId?: string, resolved?: boolean): Promise<FraudAlert[]> {
    let alerts = Array.from(this.fraudAlerts.values());
    
    if (userId) {
      alerts = alerts.filter(alert => alert.userId === userId);
    }
    
    if (resolved !== undefined) {
      alerts = alerts.filter(alert => alert.isResolved === resolved);
    }
    
    return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createFraudAlert(insertAlert: InsertFraudAlert): Promise<FraudAlert> {
    const id = randomUUID();
    const alert: FraudAlert = {
      ...insertAlert,
      id,
      details: insertAlert.details || null,
      isResolved: false,
      resolvedBy: null,
      resolvedAt: null,
      createdAt: new Date()
    };
    this.fraudAlerts.set(id, alert);
    return alert;
  }

  async resolveFraudAlert(alertId: string, resolvedBy: string): Promise<void> {
    const alert = this.fraudAlerts.get(alertId);
    if (alert) {
      alert.isResolved = true;
      alert.resolvedBy = resolvedBy;
      alert.resolvedAt = new Date();
      this.fraudAlerts.set(alertId, alert);
    }
  }

  async getSystemMetrics(metricType?: string, hours = 24): Promise<SystemMetric[]> {
    const cutoff = new Date(Date.now() - hours * 60 * 60 * 1000);
    let metrics = Array.from(this.systemMetrics.values())
      .filter(metric => metric.timestamp >= cutoff);
    
    if (metricType) {
      metrics = metrics.filter(metric => metric.metricType === metricType);
    }
    
    return metrics.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  async createSystemMetric(insertMetric: InsertSystemMetric): Promise<SystemMetric> {
    const id = randomUUID();
    const metric: SystemMetric = {
      ...insertMetric,
      id,
      timestamp: insertMetric.timestamp || new Date()
    };
    this.systemMetrics.set(id, metric);
    return metric;
  }

  async getQuantumKey(keyId: string): Promise<QuantumKey | undefined> {
    return Array.from(this.quantumKeys.values())
      .find(key => key.keyId === keyId);
  }

  async getActiveQuantumKeys(): Promise<QuantumKey[]> {
    return Array.from(this.quantumKeys.values())
      .filter(key => key.isActive && key.expiresAt > new Date())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createQuantumKey(insertKey: InsertQuantumKey): Promise<QuantumKey> {
    const id = randomUUID();
    const key: QuantumKey = {
      ...insertKey,
      id,
      isActive: insertKey.isActive !== undefined ? insertKey.isActive : true,
      createdAt: new Date()
    };
    this.quantumKeys.set(id, key);
    return key;
  }

  async deactivateQuantumKey(keyId: string): Promise<void> {
    const key = Array.from(this.quantumKeys.values())
      .find(k => k.keyId === keyId);
    if (key) {
      key.isActive = false;
      this.quantumKeys.set(key.id, key);
    }
  }

  async createErrorLog(insertError: InsertErrorLog): Promise<ErrorLog> {
    const [errorLog] = await db.insert(errorLogs).values(insertError).returning();
    return errorLog;
  }

  async getErrorLogs(filters?: {
    severity?: string;
    errorType?: string;
    userId?: string;
    startDate?: Date;
    endDate?: Date;
    isResolved?: boolean;
    limit?: number;
  }): Promise<ErrorLog[]> {
    const conditions = [];
    
    if (filters) {
      if (filters.severity) {
        conditions.push(eq(errorLogs.severity, filters.severity));
      }
      if (filters.errorType) {
        conditions.push(eq(errorLogs.errorType, filters.errorType));
      }
      if (filters.userId) {
        conditions.push(eq(errorLogs.userId, filters.userId));
      }
      if (filters.startDate) {
        conditions.push(gte(errorLogs.timestamp, filters.startDate));
      }
      if (filters.endDate) {
        conditions.push(sql`${errorLogs.timestamp} <= ${filters.endDate}`);
      }
      if (filters.isResolved !== undefined) {
        conditions.push(eq(errorLogs.isResolved, filters.isResolved));
      }
    }
    
    let query: any = db.select().from(errorLogs);
    
    if (conditions.length > 0) {
      query = query.where(and(...conditions)) as any;
    }
    
    query = query.orderBy(desc(errorLogs.timestamp)) as any;
    
    if (filters?.limit) {
      query = query.limit(filters.limit) as any;
    }
    
    return await query;
  }

  async getErrorLogById(id: string): Promise<ErrorLog | undefined> {
    const [errorLog] = await db.select().from(errorLogs).where(eq(errorLogs.id, id));
    return errorLog;
  }

  async getRecentErrors(hours = 24, limit = 100): Promise<ErrorLog[]> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    return await db.select()
      .from(errorLogs)
      .where(gte(errorLogs.timestamp, cutoff))
      .orderBy(desc(errorLogs.timestamp))
      .limit(limit);
  }

  async markErrorResolved(errorId: string, resolvedBy: string): Promise<void> {
    await db.update(errorLogs)
      .set({
        isResolved: true,
        resolvedBy,
        resolvedAt: new Date()
      })
      .where(eq(errorLogs.id, errorId));
  }

  async getErrorStats(hours = 24): Promise<{
    total: number;
    critical: number;
    high: number;
    medium: number;
    low: number;
    byType: Record<string, number>;
  }> {
    const cutoff = new Date();
    cutoff.setHours(cutoff.getHours() - hours);
    
    const errors = await db.select()
      .from(errorLogs)
      .where(gte(errorLogs.timestamp, cutoff));
    
    const stats = {
      total: errors.length,
      critical: 0,
      high: 0,
      medium: 0,
      low: 0,
      byType: {} as Record<string, number>
    };
    
    errors.forEach(error => {
      switch (error.severity) {
        case 'critical':
          stats.critical++;
          break;
        case 'high':
          stats.high++;
          break;
        case 'medium':
          stats.medium++;
          break;
        case 'low':
          stats.low++;
          break;
      }
      
      if (!stats.byType[error.errorType]) {
        stats.byType[error.errorType] = 0;
      }
      stats.byType[error.errorType]++;
    });
    
    return stats;
  }
}

export const storage = new MemStorage();
