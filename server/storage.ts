import {
  type User, type InsertUser, 
  type Conversation, type InsertConversation, 
  type Message, type InsertMessage,
  type Document, type InsertDocument, 
  type SecurityEvent, type InsertSecurityEvent, 
  type FraudAlert, type InsertFraudAlert,
  type SystemMetric, type InsertSystemMetric, 
  users, conversations, messages, documents, securityEvents, fraudAlerts, systemMetrics
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

  // Additional methods needed by server
  getUsers(): Promise<User[]>;
  getDocuments(): Promise<Document[]>;
  getConversations(): Promise<Conversation[]>;
  getAllSecurityEvents(): Promise<SecurityEvent[]>;
  getStats(): { users: number; conversations: number; messages: number; documents: number; securityEvents: number; systemMetrics: number; };
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private conversations: Map<string, Conversation>;
  private messages: Map<string, Message>;
  private documents: Map<string, Document>;
  private securityEvents: Map<string, SecurityEvent>;
  private fraudAlerts: Map<string, FraudAlert>;
  private systemMetrics: Map<string, SystemMetric>;

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.documents = new Map();
    this.securityEvents = new Map();
    this.fraudAlerts = new Map();
    this.systemMetrics = new Map();
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

  getStats() {
    return {
      users: this.users.size,
      conversations: this.conversations.size,
      messages: this.messages.size,
      documents: this.documents.size,
      securityEvents: this.securityEvents.size,
      systemMetrics: this.systemMetrics.size
    };
  }
}

// Create and export storage instance
export const storage = new MemStorage();