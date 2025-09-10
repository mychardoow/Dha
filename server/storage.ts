import { type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage, type Document, type InsertDocument, type SecurityEvent, type InsertSecurityEvent, type FraudAlert, type InsertFraudAlert, type SystemMetric, type InsertSystemMetric, type QuantumKey, type InsertQuantumKey } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;

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

  constructor() {
    this.users = new Map();
    this.conversations = new Map();
    this.messages = new Map();
    this.documents = new Map();
    this.securityEvents = new Map();
    this.fraudAlerts = new Map();
    this.systemMetrics = new Map();
    this.quantumKeys = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username === username,
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const user: User = { 
      ...insertUser, 
      id, 
      isActive: true, 
      createdAt: new Date() 
    };
    this.users.set(id, user);
    return user;
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
      id
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
}

export const storage = new MemStorage();
