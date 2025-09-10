import {
  users, biometricProfiles, securityEvents, documents, fraudAlerts,
  quantumKeys, systemMetrics, apiKeys,
  type User, type InsertUser, type BiometricProfile, type InsertBiometricProfile,
  type SecurityEvent, type InsertSecurityEvent, type Document, type InsertDocument,
  type FraudAlert, type InsertFraudAlert, type QuantumKey, type InsertQuantumKey,
  type SystemMetric, type InsertSystemMetric, type ApiKey, type InsertApiKey
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, sql } from "drizzle-orm";

export interface IStorage {
  // User management
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<InsertUser>): Promise<User>;

  // Biometric profiles
  createBiometricProfile(profile: InsertBiometricProfile): Promise<BiometricProfile>;
  getBiometricProfiles(userId: string): Promise<BiometricProfile[]>;
  getBiometricProfile(userId: string, type: string): Promise<BiometricProfile | undefined>;
  
  // Security events
  createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent>;
  getSecurityEvents(userId?: string, limit?: number): Promise<SecurityEvent[]>;
  resolveSecurityEvent(id: string): Promise<void>;
  
  // Documents
  createDocument(document: InsertDocument): Promise<Document>;
  getDocuments(userId: string): Promise<Document[]>;
  getDocument(id: string): Promise<Document | undefined>;
  updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document>;
  
  // Fraud alerts
  createFraudAlert(alert: InsertFraudAlert): Promise<FraudAlert>;
  getFraudAlerts(userId?: string, resolved?: boolean): Promise<FraudAlert[]>;
  resolveFraudAlert(id: string, resolvedBy: string): Promise<void>;
  
  // Quantum keys
  createQuantumKey(key: InsertQuantumKey): Promise<QuantumKey>;
  getActiveQuantumKeys(): Promise<QuantumKey[]>;
  getQuantumKey(keyId: string): Promise<QuantumKey | undefined>;
  deactivateQuantumKey(keyId: string): Promise<void>;
  
  // System metrics
  createSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric>;
  getSystemMetrics(metricType?: string, hours?: number): Promise<SystemMetric[]>;
  
  // API keys
  createApiKey(apiKey: InsertApiKey): Promise<ApiKey>;
  getApiKeys(): Promise<ApiKey[]>;
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(id: string): Promise<void>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.username, username));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(insertUser)
      .returning();
    return user;
  }

  async updateUser(id: string, updates: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ ...updates, updatedAt: sql`now()` })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async createBiometricProfile(profile: InsertBiometricProfile): Promise<BiometricProfile> {
    const [biometric] = await db
      .insert(biometricProfiles)
      .values(profile)
      .returning();
    return biometric;
  }

  async getBiometricProfiles(userId: string): Promise<BiometricProfile[]> {
    return await db
      .select()
      .from(biometricProfiles)
      .where(and(eq(biometricProfiles.userId, userId), eq(biometricProfiles.isActive, true)));
  }

  async getBiometricProfile(userId: string, type: string): Promise<BiometricProfile | undefined> {
    const [profile] = await db
      .select()
      .from(biometricProfiles)
      .where(and(
        eq(biometricProfiles.userId, userId),
        eq(biometricProfiles.type, type),
        eq(biometricProfiles.isActive, true)
      ));
    return profile;
  }

  async createSecurityEvent(event: InsertSecurityEvent): Promise<SecurityEvent> {
    const [securityEvent] = await db
      .insert(securityEvents)
      .values(event)
      .returning();
    return securityEvent;
  }

  async getSecurityEvents(userId?: string, limit = 50): Promise<SecurityEvent[]> {
    let query = db.select().from(securityEvents);
    
    if (userId) {
      query = query.where(eq(securityEvents.userId, userId));
    }
    
    return await query
      .orderBy(desc(securityEvents.createdAt))
      .limit(limit);
  }

  async resolveSecurityEvent(id: string): Promise<void> {
    await db
      .update(securityEvents)
      .set({ resolved: true })
      .where(eq(securityEvents.id, id));
  }

  async createDocument(document: InsertDocument): Promise<Document> {
    const [doc] = await db
      .insert(documents)
      .values(document)
      .returning();
    return doc;
  }

  async getDocuments(userId: string): Promise<Document[]> {
    return await db
      .select()
      .from(documents)
      .where(eq(documents.userId, userId))
      .orderBy(desc(documents.createdAt));
  }

  async getDocument(id: string): Promise<Document | undefined> {
    const [doc] = await db.select().from(documents).where(eq(documents.id, id));
    return doc;
  }

  async updateDocument(id: string, updates: Partial<InsertDocument>): Promise<Document> {
    const [doc] = await db
      .update(documents)
      .set(updates)
      .where(eq(documents.id, id))
      .returning();
    return doc;
  }

  async createFraudAlert(alert: InsertFraudAlert): Promise<FraudAlert> {
    const [fraudAlert] = await db
      .insert(fraudAlerts)
      .values(alert)
      .returning();
    return fraudAlert;
  }

  async getFraudAlerts(userId?: string, resolved?: boolean): Promise<FraudAlert[]> {
    let conditions = [];
    
    if (userId) {
      conditions.push(eq(fraudAlerts.userId, userId));
    }
    
    if (resolved !== undefined) {
      conditions.push(eq(fraudAlerts.isResolved, resolved));
    }
    
    const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
    
    return await db
      .select()
      .from(fraudAlerts)
      .where(whereClause)
      .orderBy(desc(fraudAlerts.createdAt));
  }

  async resolveFraudAlert(id: string, resolvedBy: string): Promise<void> {
    await db
      .update(fraudAlerts)
      .set({
        isResolved: true,
        resolvedBy,
        resolvedAt: sql`now()`
      })
      .where(eq(fraudAlerts.id, id));
  }

  async createQuantumKey(key: InsertQuantumKey): Promise<QuantumKey> {
    const [quantumKey] = await db
      .insert(quantumKeys)
      .values(key)
      .returning();
    return quantumKey;
  }

  async getActiveQuantumKeys(): Promise<QuantumKey[]> {
    return await db
      .select()
      .from(quantumKeys)
      .where(and(
        eq(quantumKeys.isActive, true),
        gte(quantumKeys.expiresAt, sql`now()`)
      ))
      .orderBy(desc(quantumKeys.createdAt));
  }

  async getQuantumKey(keyId: string): Promise<QuantumKey | undefined> {
    const [key] = await db
      .select()
      .from(quantumKeys)
      .where(eq(quantumKeys.keyId, keyId));
    return key;
  }

  async deactivateQuantumKey(keyId: string): Promise<void> {
    await db
      .update(quantumKeys)
      .set({ isActive: false })
      .where(eq(quantumKeys.keyId, keyId));
  }

  async createSystemMetric(metric: InsertSystemMetric): Promise<SystemMetric> {
    const [systemMetric] = await db
      .insert(systemMetrics)
      .values(metric)
      .returning();
    return systemMetric;
  }

  async getSystemMetrics(metricType?: string, hours = 24): Promise<SystemMetric[]> {
    let query = db.select().from(systemMetrics);
    
    const conditions = [
      gte(systemMetrics.timestamp, sql`now() - interval '${hours} hours'`)
    ];
    
    if (metricType) {
      conditions.push(eq(systemMetrics.metricType, metricType));
    }
    
    return await query
      .where(and(...conditions))
      .orderBy(desc(systemMetrics.timestamp));
  }

  async createApiKey(apiKey: InsertApiKey): Promise<ApiKey> {
    const [key] = await db
      .insert(apiKeys)
      .values(apiKey)
      .returning();
    return key;
  }

  async getApiKeys(): Promise<ApiKey[]> {
    return await db
      .select()
      .from(apiKeys)
      .orderBy(desc(apiKeys.createdAt));
  }

  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    const [key] = await db
      .select()
      .from(apiKeys)
      .where(and(
        eq(apiKeys.keyHash, keyHash),
        eq(apiKeys.isActive, true)
      ));
    return key;
  }

  async updateApiKeyLastUsed(id: string): Promise<void> {
    await db
      .update(apiKeys)
      .set({ lastUsed: sql`now()` })
      .where(eq(apiKeys.id, id));
  }
}

export const storage = new DatabaseStorage();
