import {
  type User, type InsertUser, 
  type Conversation, type InsertConversation, 
  type Message, type InsertMessage,
  type Document, type InsertDocument, 
  type SecurityEvent, type InsertSecurityEvent, 
  type FraudAlert, type InsertFraudAlert,
  type SystemMetric, type InsertSystemMetric,
  type AuditLog, type InsertAuditLog,
  type ComplianceEvent, type InsertComplianceEvent,
  type UserBehaviorProfile, type InsertUserBehaviorProfile,
  users, conversations, messages, documents, securityEvents, fraudAlerts, systemMetrics, auditLogs, complianceEvents, userBehaviorProfiles
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db } from "./db";
import { eq, desc, and, gte, sql, or, isNull } from "drizzle-orm";
import * as bcrypt from "bcryptjs";

// Basic storage interface for core functionality
export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;

  // Conversation management
  getConversation(id: string): Promise<Conversation | undefined>;
  getUserConversations(userId: string): Promise<Conversation[]>;
  createConversation(conversation: InsertConversation): Promise<Conversation>;

  // Message management
  getMessages(conversationId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;

  // Document management
  getDocument(id: string): Promise<Document | undefined>;
  getUserDocuments(userId: string): Promise<Document[]>;
  createDocument(document: InsertDocument): Promise<Document>;

  // Security management
  createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent>;
  getSecurityEvents(userId: string): Promise<SecurityEvent[]>;

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

  // Additional methods needed by server
  getUsers(): Promise<User[]>;
  getDocuments(): Promise<Document[]>;
  getConversations(): Promise<Conversation[]>;
  getAllSecurityEvents(): Promise<SecurityEvent[]>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getStats(): { users: number; conversations: number; messages: number; documents: number; securityEvents: number; systemMetrics: number; auditLogs: number; complianceEvents: number; userBehaviorProfiles: number; };
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private documents: Map<string, Document>;
  private securityEvents: Map<string, SecurityEvent>;
  private fraudAlerts: Map<string, FraudAlert>;
  private systemMetrics: Map<string, SystemMetric>;
  private auditLogs: Map<string, AuditLog>;
  private complianceEvents: Map<string, ComplianceEvent>;
  private userBehaviorProfiles: Map<string, UserBehaviorProfile>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.documents = new Map();
    this.securityEvents = new Map();
    this.fraudAlerts = new Map();
    this.systemMetrics = new Map();
    this.auditLogs = new Map();
    this.complianceEvents = new Map();
    this.userBehaviorProfiles = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = {
      ...insertUser,
      id,
      password: insertUser.password || null,
      hashedPassword: insertUser.hashedPassword || null,
      role: insertUser.role || "user",
      createdAt: new Date(),
      isActive: insertUser.isActive ?? true,
      failedAttempts: insertUser.failedAttempts || 0,
      lastFailedAttempt: insertUser.lastFailedAttempt || null,
      lockedUntil: insertUser.lockedUntil || null,
      mustChangePassword: insertUser.mustChangePassword || false
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (!user) return undefined;
    
    const updatedUser = { ...user, ...updates };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async getConversation(id: string): Promise<Conversation | undefined> {
    return this.conversations.get(id);
  }

  async getUserConversations(userId: string): Promise<Conversation[]> {
    return Array.from(this.conversations.values())
      .filter(conv => conv.userId === userId)
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  async createConversation(insertConversation: InsertConversation): Promise<Conversation> {
    const id = randomUUID();
    const conversation: Conversation = {
      ...insertConversation,
      id,
      createdAt: new Date(),
      lastMessageAt: new Date()
    };
    this.conversations.set(id, conversation);
    return conversation;
  }

  async getMessages(conversationId: string): Promise<Message[]> {
    return Array.from(this.messages.values())
      .filter(msg => msg.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(insertMessage: InsertMessage): Promise<Message> {
    const id = randomUUID();
    const message: Message = {
      ...insertMessage,
      id,
      metadata: insertMessage.metadata || null,
      attachments: insertMessage.attachments || null,
      aiContext: insertMessage.aiContext || null,
      createdAt: new Date()
    };
    this.messages.set(id, message);
    return message;
  }

  async getDocument(id: string): Promise<Document | undefined> {
    return this.documents.get(id);
  }

  async getUserDocuments(userId: string): Promise<Document[]> {
    return Array.from(this.documents.values())
      .filter(doc => doc.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDocument(insertDocument: InsertDocument): Promise<Document> {
    const id = randomUUID();
    const document: Document = {
      ...insertDocument,
      id,
      encryptionKey: insertDocument.encryptionKey || null,
      isEncrypted: insertDocument.isEncrypted || false,
      processingStatus: insertDocument.processingStatus || "pending",
      ocrText: insertDocument.ocrText || null,
      ocrConfidence: insertDocument.ocrConfidence || null,
      isVerified: insertDocument.isVerified || null,
      verificationScore: insertDocument.verificationScore || null,
      createdAt: new Date()
    };
    this.documents.set(id, document);
    return document;
  }

  async createSecurityEvent(insertEvent: InsertSecurityEvent): Promise<SecurityEvent> {
    const id = randomUUID();
    const event: SecurityEvent = {
      ...insertEvent,
      id,
      userId: insertEvent.userId || null,
      severity: insertEvent.severity || "medium",
      details: insertEvent.details || null,
      ipAddress: insertEvent.ipAddress || null,
      userAgent: insertEvent.userAgent || null,
      location: insertEvent.location || null,
      createdAt: new Date()
    };
    this.securityEvents.set(id, event);
    return event;
  }

  async getSecurityEvents(userId: string): Promise<SecurityEvent[]> {
    return Array.from(this.securityEvents.values())
      .filter(event => event.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createSystemMetric(insertMetric: InsertSystemMetric): Promise<SystemMetric> {
    const id = randomUUID();
    const metric: SystemMetric = {
      ...insertMetric,
      id,
      timestamp: new Date()
    };
    this.systemMetrics.set(id, metric);
    return metric;
  }

  async getSystemMetrics(): Promise<SystemMetric[]> {
    return Array.from(this.systemMetrics.values())
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async getUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async getDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values());
  }

  async getConversations(): Promise<Conversation[]> {
    return Array.from(this.conversations.values());
  }

  async getAllSecurityEvents(): Promise<SecurityEvent[]> {
    return Array.from(this.securityEvents.values());
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = {
      ...insertAuditLog,
      id,
      userId: insertAuditLog.userId || null,
      entityType: insertAuditLog.entityType || null,
      entityId: insertAuditLog.entityId || null,
      previousState: insertAuditLog.previousState || null,
      newState: insertAuditLog.newState || null,
      actionDetails: insertAuditLog.actionDetails || null,
      outcome: insertAuditLog.outcome || null,
      details: insertAuditLog.details || null,
      ipAddress: insertAuditLog.ipAddress || null,
      userAgent: insertAuditLog.userAgent || null,
      location: insertAuditLog.location || null,
      riskScore: insertAuditLog.riskScore || null,
      complianceFlags: insertAuditLog.complianceFlags || null,
      createdAt: new Date()
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  async getAuditLogs(filters: {
    userId?: string;
    action?: string;
    entityType?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());

    if (filters.userId) {
      logs = logs.filter(log => log.userId === filters.userId);
    }
    if (filters.action) {
      logs = logs.filter(log => log.action === filters.action);
    }
    if (filters.entityType) {
      logs = logs.filter(log => log.entityType === filters.entityType);
    }
    if (filters.startDate) {
      logs = logs.filter(log => log.createdAt >= filters.startDate!);
    }
    if (filters.endDate) {
      logs = logs.filter(log => log.createdAt <= filters.endDate!);
    }

    logs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    
    if (filters.limit && filters.limit > 0) {
      logs = logs.slice(0, filters.limit);
    }

    return logs;
  }

  async createComplianceEvent(insertEvent: InsertComplianceEvent): Promise<ComplianceEvent> {
    const id = randomUUID();
    const event: ComplianceEvent = {
      ...insertEvent,
      id,
      userId: insertEvent.userId || null,
      dataSubjectId: insertEvent.dataSubjectId || null,
      dataCategory: insertEvent.dataCategory || null,
      processingPurpose: insertEvent.processingPurpose || null,
      legalBasis: insertEvent.legalBasis || null,
      processingDetails: insertEvent.processingDetails || null,
      complianceStatus: insertEvent.complianceStatus || null,
      details: insertEvent.details || null,
      complianceFlags: insertEvent.complianceFlags || null,
      createdAt: new Date()
    };
    this.complianceEvents.set(id, event);
    return event;
  }

  async getComplianceReport(regulation: string, startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    eventsByType: Record<string, number>;
    complianceRate: number;
    events: ComplianceEvent[];
  }> {
    const events = Array.from(this.complianceEvents.values())
      .filter(event => 
        event.createdAt >= startDate && 
        event.createdAt <= endDate
      );

    const eventsByType: Record<string, number> = {};
    let compliantEvents = 0;

    for (const event of events) {
      if (eventsByType[event.eventType]) {
        eventsByType[event.eventType]++;
      } else {
        eventsByType[event.eventType] = 1;
      }

      if (event.complianceStatus === 'compliant') {
        compliantEvents++;
      }
    }

    return {
      totalEvents: events.length,
      eventsByType,
      complianceRate: events.length > 0 ? compliantEvents / events.length : 1.0,
      events: events.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
    };
  }

  async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | undefined> {
    return Array.from(this.userBehaviorProfiles.values())
      .find(profile => profile.userId === userId);
  }

  async createUserBehaviorProfile(insertProfile: InsertUserBehaviorProfile): Promise<UserBehaviorProfile> {
    const id = randomUUID();
    const profile: UserBehaviorProfile = {
      ...insertProfile,
      id,
      typicalLocations: insertProfile.typicalLocations || null,
      typicalDevices: insertProfile.typicalDevices || null,
      typicalTimes: insertProfile.typicalTimes || null,
      loginPatterns: insertProfile.loginPatterns || null,
      documentPatterns: insertProfile.documentPatterns || null,
      riskFactors: insertProfile.riskFactors || null,
      baselineScore: insertProfile.baselineScore || null,
      lastAnalyzed: insertProfile.lastAnalyzed || null,
      createdAt: new Date()
    };
    this.userBehaviorProfiles.set(id, profile);
    return profile;
  }

  async updateUserBehaviorProfile(userId: string, updates: Partial<UserBehaviorProfile>): Promise<UserBehaviorProfile | undefined> {
    const existingProfile = await this.getUserBehaviorProfile(userId);
    if (!existingProfile) return undefined;
    
    const updatedProfile = { ...existingProfile, ...updates };
    this.userBehaviorProfiles.set(existingProfile.id, updatedProfile);
    return updatedProfile;
  }

  getStats() {
    return {
      users: this.users.size,
      conversations: this.conversations.size,
      messages: this.messages.size,
      documents: this.documents.size,
      securityEvents: this.securityEvents.size,
      systemMetrics: this.systemMetrics.size,
      auditLogs: this.auditLogs.size,
      complianceEvents: this.complianceEvents.size,
      userBehaviorProfiles: this.userBehaviorProfiles.size
    };
  }
}

// Create and export storage instance
export const storage = new MemStorage();