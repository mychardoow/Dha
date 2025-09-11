import { 
  type User, type InsertUser, type Conversation, type InsertConversation, type Message, type InsertMessage, 
  type Document, type InsertDocument, type SecurityEvent, type InsertSecurityEvent, type FraudAlert, type InsertFraudAlert, 
  type SystemMetric, type InsertSystemMetric, type QuantumKey, type InsertQuantumKey, type ErrorLog, type InsertErrorLog, 
  type BiometricProfile, type InsertBiometricProfile, type ApiKey, type InsertApiKey, type Certificate, type InsertCertificate, 
  type Permit, type InsertPermit, type DocumentTemplate, type InsertDocumentTemplate,
  type BirthCertificate, type InsertBirthCertificate, type MarriageCertificate, type InsertMarriageCertificate,
  type Passport, type InsertPassport, type DeathCertificate, type InsertDeathCertificate,
  type WorkPermit, type InsertWorkPermit, type PermanentVisa, type InsertPermanentVisa,
  type IdCard, type InsertIdCard, type DocumentVerification, type InsertDocumentVerification,
  users, conversations, messages, documents, securityEvents, fraudAlerts, systemMetrics, quantumKeys, errorLogs, 
  biometricProfiles, apiKeys, certificates, permits, documentTemplates, birthCertificates, marriageCertificates,
  passports, deathCertificates, workPermits, permanentVisas, idCards, documentVerifications
} from "@shared/schema";
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

  // Biometric profile methods
  getBiometricProfile(userId: string, type: string): Promise<BiometricProfile | undefined>;
  getBiometricProfiles(userId: string): Promise<BiometricProfile[]>;
  createBiometricProfile(profile: InsertBiometricProfile): Promise<BiometricProfile>;

  // API key methods
  getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined>;
  updateApiKeyLastUsed(keyId: string): Promise<void>;

  // Certificate methods
  getCertificate(id: string): Promise<Certificate | undefined>;
  getCertificates(userId: string): Promise<Certificate[]>;
  getCertificateByVerificationCode(verificationCode: string): Promise<Certificate | undefined>;
  createCertificate(certificate: InsertCertificate): Promise<Certificate>;
  updateCertificate(id: string, updates: Partial<Certificate>): Promise<void>;

  // Permit methods
  getPermit(id: string): Promise<Permit | undefined>;
  getPermits(userId: string): Promise<Permit[]>;
  getPermitByVerificationCode(verificationCode: string): Promise<Permit | undefined>;
  createPermit(permit: InsertPermit): Promise<Permit>;
  updatePermit(id: string, updates: Partial<Permit>): Promise<void>;

  // Document template methods
  getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined>;
  getDocumentTemplates(type?: 'certificate' | 'permit' | 'birth_certificate' | 'marriage_certificate' | 'passport' | 'death_certificate' | 'work_permit' | 'permanent_visa' | 'id_card'): Promise<DocumentTemplate[]>;
  createDocumentTemplate(template: InsertDocumentTemplate): Promise<DocumentTemplate>;
  updateDocumentTemplate(id: string, updates: Partial<DocumentTemplate>): Promise<void>;

  // Birth certificate methods
  getBirthCertificate(id: string): Promise<BirthCertificate | undefined>;
  getBirthCertificates(userId: string): Promise<BirthCertificate[]>;
  getBirthCertificateByVerificationCode(verificationCode: string): Promise<BirthCertificate | undefined>;
  createBirthCertificate(certificate: InsertBirthCertificate): Promise<BirthCertificate>;
  updateBirthCertificate(id: string, updates: Partial<BirthCertificate>): Promise<void>;

  // Marriage certificate methods
  getMarriageCertificate(id: string): Promise<MarriageCertificate | undefined>;
  getMarriageCertificates(userId: string): Promise<MarriageCertificate[]>;
  getMarriageCertificateByVerificationCode(verificationCode: string): Promise<MarriageCertificate | undefined>;
  createMarriageCertificate(certificate: InsertMarriageCertificate): Promise<MarriageCertificate>;
  updateMarriageCertificate(id: string, updates: Partial<MarriageCertificate>): Promise<void>;

  // Passport methods
  getPassport(id: string): Promise<Passport | undefined>;
  getPassports(userId: string): Promise<Passport[]>;
  getPassportByVerificationCode(verificationCode: string): Promise<Passport | undefined>;
  createPassport(passport: InsertPassport): Promise<Passport>;
  updatePassport(id: string, updates: Partial<Passport>): Promise<void>;

  // Death certificate methods
  getDeathCertificate(id: string): Promise<DeathCertificate | undefined>;
  getDeathCertificates(userId: string): Promise<DeathCertificate[]>;
  getDeathCertificateByVerificationCode(verificationCode: string): Promise<DeathCertificate | undefined>;
  createDeathCertificate(certificate: InsertDeathCertificate): Promise<DeathCertificate>;
  updateDeathCertificate(id: string, updates: Partial<DeathCertificate>): Promise<void>;

  // Work permit methods
  getWorkPermit(id: string): Promise<WorkPermit | undefined>;
  getWorkPermits(userId: string): Promise<WorkPermit[]>;
  getWorkPermitByVerificationCode(verificationCode: string): Promise<WorkPermit | undefined>;
  createWorkPermit(permit: InsertWorkPermit): Promise<WorkPermit>;
  updateWorkPermit(id: string, updates: Partial<WorkPermit>): Promise<void>;

  // Permanent visa methods
  getPermanentVisa(id: string): Promise<PermanentVisa | undefined>;
  getPermanentVisas(userId: string): Promise<PermanentVisa[]>;
  getPermanentVisaByVerificationCode(verificationCode: string): Promise<PermanentVisa | undefined>;
  createPermanentVisa(visa: InsertPermanentVisa): Promise<PermanentVisa>;
  updatePermanentVisa(id: string, updates: Partial<PermanentVisa>): Promise<void>;

  // ID card methods
  getIdCard(id: string): Promise<IdCard | undefined>;
  getIdCards(userId: string): Promise<IdCard[]>;
  getIdCardByVerificationCode(verificationCode: string): Promise<IdCard | undefined>;
  createIdCard(idCard: InsertIdCard): Promise<IdCard>;
  updateIdCard(id: string, updates: Partial<IdCard>): Promise<void>;

  // Document verification methods
  getDocumentVerification(id: string): Promise<DocumentVerification | undefined>;
  getDocumentVerifications(documentType?: string, documentId?: string): Promise<DocumentVerification[]>;
  createDocumentVerification(verification: InsertDocumentVerification): Promise<DocumentVerification>;
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
  private biometricProfiles: Map<string, BiometricProfile>;
  private apiKeys: Map<string, ApiKey>;
  private certificates: Map<string, Certificate>;
  private permits: Map<string, Permit>;
  private documentTemplates: Map<string, DocumentTemplate>;
  private birthCertificates: Map<string, BirthCertificate>;
  private marriageCertificates: Map<string, MarriageCertificate>;
  private passports: Map<string, Passport>;
  private deathCertificates: Map<string, DeathCertificate>;
  private workPermits: Map<string, WorkPermit>;
  private permanentVisas: Map<string, PermanentVisa>;
  private idCards: Map<string, IdCard>;
  private documentVerifications: Map<string, DocumentVerification>;

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
    this.biometricProfiles = new Map();
    this.apiKeys = new Map();
    this.certificates = new Map();
    this.permits = new Map();
    this.documentTemplates = new Map();
    this.birthCertificates = new Map();
    this.marriageCertificates = new Map();
    this.passports = new Map();
    this.deathCertificates = new Map();
    this.workPermits = new Map();
    this.permanentVisas = new Map();
    this.idCards = new Map();
    this.documentVerifications = new Map();
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

  // Biometric profile methods
  async getBiometricProfile(userId: string, type: string): Promise<BiometricProfile | undefined> {
    return Array.from(this.biometricProfiles.values())
      .find(profile => profile.userId === userId && profile.type === type && profile.isActive);
  }

  async getBiometricProfiles(userId: string): Promise<BiometricProfile[]> {
    return Array.from(this.biometricProfiles.values())
      .filter(profile => profile.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createBiometricProfile(insertProfile: InsertBiometricProfile): Promise<BiometricProfile> {
    const id = randomUUID();
    const profile: BiometricProfile = {
      ...insertProfile,
      id,
      isVerified: insertProfile.isVerified || false,
      lastUsed: insertProfile.lastUsed || null,
      isActive: insertProfile.isActive !== undefined ? insertProfile.isActive : true,
      metadata: insertProfile.metadata || null,
      enrollmentDate: insertProfile.enrollmentDate || new Date(),
      createdAt: new Date()
    };
    this.biometricProfiles.set(id, profile);
    return profile;
  }

  // API key methods
  async getApiKeyByHash(keyHash: string): Promise<ApiKey | undefined> {
    return Array.from(this.apiKeys.values())
      .find(key => key.keyHash === keyHash && key.isActive);
  }

  async updateApiKeyLastUsed(keyId: string): Promise<void> {
    const key = this.apiKeys.get(keyId);
    if (key) {
      key.lastUsed = new Date();
      this.apiKeys.set(keyId, key);
    }
  }

  // Certificate methods
  async getCertificate(id: string): Promise<Certificate | undefined> {
    return this.certificates.get(id);
  }

  async getCertificates(userId: string): Promise<Certificate[]> {
    return Array.from(this.certificates.values())
      .filter(cert => cert.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getCertificateByVerificationCode(verificationCode: string): Promise<Certificate | undefined> {
    return Array.from(this.certificates.values())
      .find(cert => cert.verificationCode === verificationCode);
  }

  async createCertificate(insertCertificate: InsertCertificate): Promise<Certificate> {
    const id = randomUUID();
    const certificate: Certificate = {
      ...insertCertificate,
      id,
      data: insertCertificate.data || null,
      expiresAt: insertCertificate.expiresAt || null,
      status: insertCertificate.status || 'active',
      qrCodeUrl: insertCertificate.qrCodeUrl || null,
      documentUrl: insertCertificate.documentUrl || null,
      digitalSignature: insertCertificate.digitalSignature || null,
      isRevoked: insertCertificate.isRevoked || false,
      issuedAt: insertCertificate.issuedAt || new Date(),
      createdAt: new Date()
    };
    this.certificates.set(id, certificate);
    return certificate;
  }

  async updateCertificate(id: string, updates: Partial<Certificate>): Promise<void> {
    const certificate = this.certificates.get(id);
    if (certificate) {
      this.certificates.set(id, { ...certificate, ...updates });
    }
  }

  // Permit methods
  async getPermit(id: string): Promise<Permit | undefined> {
    return this.permits.get(id);
  }

  async getPermits(userId: string): Promise<Permit[]> {
    return Array.from(this.permits.values())
      .filter(permit => permit.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPermitByVerificationCode(verificationCode: string): Promise<Permit | undefined> {
    return Array.from(this.permits.values())
      .find(permit => permit.verificationCode === verificationCode);
  }

  async createPermit(insertPermit: InsertPermit): Promise<Permit> {
    const id = randomUUID();
    const permit: Permit = {
      ...insertPermit,
      id,
      data: insertPermit.data || null,
      expiresAt: insertPermit.expiresAt || null,
      status: insertPermit.status || 'active',
      qrCodeUrl: insertPermit.qrCodeUrl || null,
      documentUrl: insertPermit.documentUrl || null,
      conditions: insertPermit.conditions || null,
      isRevoked: insertPermit.isRevoked || false,
      issuedAt: insertPermit.issuedAt || new Date(),
      createdAt: new Date()
    };
    this.permits.set(id, permit);
    return permit;
  }

  async updatePermit(id: string, updates: Partial<Permit>): Promise<void> {
    const permit = this.permits.get(id);
    if (permit) {
      this.permits.set(id, { ...permit, ...updates });
    }
  }

  // Document template methods
  async getDocumentTemplate(id: string): Promise<DocumentTemplate | undefined> {
    return this.documentTemplates.get(id);
  }

  async getDocumentTemplates(type?: 'certificate' | 'permit'): Promise<DocumentTemplate[]> {
    let templates = Array.from(this.documentTemplates.values())
      .filter(template => template.isActive);
    
    if (type) {
      templates = templates.filter(template => template.type === type);
    }
    
    return templates.sort((a, b) => a.name.localeCompare(b.name));
  }

  async createDocumentTemplate(insertTemplate: InsertDocumentTemplate): Promise<DocumentTemplate> {
    const id = randomUUID();
    const template: DocumentTemplate = {
      ...insertTemplate,
      id,
      officialLayout: insertTemplate.officialLayout || null,
      isActive: insertTemplate.isActive !== undefined ? insertTemplate.isActive : true,
      createdAt: new Date()
    };
    this.documentTemplates.set(id, template);
    return template;
  }

  async updateDocumentTemplate(id: string, updates: Partial<DocumentTemplate>): Promise<void> {
    const template = this.documentTemplates.get(id);
    if (template) {
      this.documentTemplates.set(id, { ...template, ...updates });
    }
  }

  // Birth certificate methods
  async getBirthCertificate(id: string): Promise<BirthCertificate | undefined> {
    return this.birthCertificates.get(id);
  }

  async getBirthCertificates(userId: string): Promise<BirthCertificate[]> {
    return Array.from(this.birthCertificates.values())
      .filter(cert => cert.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getBirthCertificateByVerificationCode(verificationCode: string): Promise<BirthCertificate | undefined> {
    return Array.from(this.birthCertificates.values())
      .find(cert => cert.verificationCode === verificationCode);
  }

  async createBirthCertificate(insertCertificate: InsertBirthCertificate): Promise<BirthCertificate> {
    const id = randomUUID();
    const certificate: BirthCertificate = {
      ...insertCertificate,
      id,
      registrationDate: insertCertificate.registrationDate || new Date(),
      watermarkData: insertCertificate.watermarkData || null,
      officialSeal: insertCertificate.officialSeal || null,
      createdAt: new Date()
    };
    this.birthCertificates.set(id, certificate);
    return certificate;
  }

  async updateBirthCertificate(id: string, updates: Partial<BirthCertificate>): Promise<void> {
    const certificate = this.birthCertificates.get(id);
    if (certificate) {
      this.birthCertificates.set(id, { ...certificate, ...updates });
    }
  }

  // Marriage certificate methods
  async getMarriageCertificate(id: string): Promise<MarriageCertificate | undefined> {
    return this.marriageCertificates.get(id);
  }

  async getMarriageCertificates(userId: string): Promise<MarriageCertificate[]> {
    return Array.from(this.marriageCertificates.values())
      .filter(cert => cert.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getMarriageCertificateByVerificationCode(verificationCode: string): Promise<MarriageCertificate | undefined> {
    return Array.from(this.marriageCertificates.values())
      .find(cert => cert.verificationCode === verificationCode);
  }

  async createMarriageCertificate(insertCertificate: InsertMarriageCertificate): Promise<MarriageCertificate> {
    const id = randomUUID();
    const certificate: MarriageCertificate = {
      ...insertCertificate,
      id,
      officialSignatures: insertCertificate.officialSignatures || null,
      createdAt: new Date()
    };
    this.marriageCertificates.set(id, certificate);
    return certificate;
  }

  async updateMarriageCertificate(id: string, updates: Partial<MarriageCertificate>): Promise<void> {
    const certificate = this.marriageCertificates.get(id);
    if (certificate) {
      this.marriageCertificates.set(id, { ...certificate, ...updates });
    }
  }

  // Passport methods
  async getPassport(id: string): Promise<Passport | undefined> {
    return this.passports.get(id);
  }

  async getPassports(userId: string): Promise<Passport[]> {
    return Array.from(this.passports.values())
      .filter(passport => passport.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPassportByVerificationCode(verificationCode: string): Promise<Passport | undefined> {
    return Array.from(this.passports.values())
      .find(passport => passport.verificationCode === verificationCode);
  }

  async createPassport(insertPassport: InsertPassport): Promise<Passport> {
    const id = randomUUID();
    const passport: Passport = {
      ...insertPassport,
      id,
      issueDate: insertPassport.issueDate || new Date(),
      height: insertPassport.height || null,
      eyeColor: insertPassport.eyeColor || null,
      photoUrl: insertPassport.photoUrl || null,
      signatureUrl: insertPassport.signatureUrl || null,
      machineReadableZone: insertPassport.machineReadableZone || null,
      rfidChipData: insertPassport.rfidChipData || null,
      createdAt: new Date()
    };
    this.passports.set(id, passport);
    return passport;
  }

  async updatePassport(id: string, updates: Partial<Passport>): Promise<void> {
    const passport = this.passports.get(id);
    if (passport) {
      this.passports.set(id, { ...passport, ...updates });
    }
  }

  // Death certificate methods
  async getDeathCertificate(id: string): Promise<DeathCertificate | undefined> {
    return this.deathCertificates.get(id);
  }

  async getDeathCertificates(userId: string): Promise<DeathCertificate[]> {
    return Array.from(this.deathCertificates.values())
      .filter(cert => cert.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getDeathCertificateByVerificationCode(verificationCode: string): Promise<DeathCertificate | undefined> {
    return Array.from(this.deathCertificates.values())
      .find(cert => cert.verificationCode === verificationCode);
  }

  async createDeathCertificate(insertCertificate: InsertDeathCertificate): Promise<DeathCertificate> {
    const id = randomUUID();
    const certificate: DeathCertificate = {
      ...insertCertificate,
      id,
      registrationDate: insertCertificate.registrationDate || new Date(),
      mannerOfDeath: insertCertificate.mannerOfDeath || null,
      medicalExaminerSignature: insertCertificate.medicalExaminerSignature || null,
      informantName: insertCertificate.informantName || null,
      relationshipToDeceased: insertCertificate.relationshipToDeceased || null,
      createdAt: new Date()
    };
    this.deathCertificates.set(id, certificate);
    return certificate;
  }

  async updateDeathCertificate(id: string, updates: Partial<DeathCertificate>): Promise<void> {
    const certificate = this.deathCertificates.get(id);
    if (certificate) {
      this.deathCertificates.set(id, { ...certificate, ...updates });
    }
  }

  // Work permit methods
  async getWorkPermit(id: string): Promise<WorkPermit | undefined> {
    return this.workPermits.get(id);
  }

  async getWorkPermits(userId: string): Promise<WorkPermit[]> {
    return Array.from(this.workPermits.values())
      .filter(permit => permit.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getWorkPermitByVerificationCode(verificationCode: string): Promise<WorkPermit | undefined> {
    return Array.from(this.workPermits.values())
      .find(permit => permit.verificationCode === verificationCode);
  }

  async createWorkPermit(insertPermit: InsertWorkPermit): Promise<WorkPermit> {
    const id = randomUUID();
    const permit: WorkPermit = {
      ...insertPermit,
      id,
      issueDate: insertPermit.issueDate || new Date(),
      jobDescription: insertPermit.jobDescription || null,
      workRestrictions: insertPermit.workRestrictions || null,
      sponsorDetails: insertPermit.sponsorDetails || null,
      createdAt: new Date()
    };
    this.workPermits.set(id, permit);
    return permit;
  }

  async updateWorkPermit(id: string, updates: Partial<WorkPermit>): Promise<void> {
    const permit = this.workPermits.get(id);
    if (permit) {
      this.workPermits.set(id, { ...permit, ...updates });
    }
  }

  // Permanent visa methods
  async getPermanentVisa(id: string): Promise<PermanentVisa | undefined> {
    return this.permanentVisas.get(id);
  }

  async getPermanentVisas(userId: string): Promise<PermanentVisa[]> {
    return Array.from(this.permanentVisas.values())
      .filter(visa => visa.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getPermanentVisaByVerificationCode(verificationCode: string): Promise<PermanentVisa | undefined> {
    return Array.from(this.permanentVisas.values())
      .find(visa => visa.verificationCode === verificationCode);
  }

  async createPermanentVisa(insertVisa: InsertPermanentVisa): Promise<PermanentVisa> {
    const id = randomUUID();
    const visa: PermanentVisa = {
      ...insertVisa,
      id,
      issueDate: insertVisa.issueDate || new Date(),
      expiryDate: insertVisa.expiryDate || null,
      portOfEntry: insertVisa.portOfEntry || null,
      immigrationStamps: insertVisa.immigrationStamps || null,
      sponsorInformation: insertVisa.sponsorInformation || null,
      photoUrl: insertVisa.photoUrl || null,
      fingerprintData: insertVisa.fingerprintData || null,
      createdAt: new Date()
    };
    this.permanentVisas.set(id, visa);
    return visa;
  }

  async updatePermanentVisa(id: string, updates: Partial<PermanentVisa>): Promise<void> {
    const visa = this.permanentVisas.get(id);
    if (visa) {
      this.permanentVisas.set(id, { ...visa, ...updates });
    }
  }

  // ID card methods
  async getIdCard(id: string): Promise<IdCard | undefined> {
    return this.idCards.get(id);
  }

  async getIdCards(userId: string): Promise<IdCard[]> {
    return Array.from(this.idCards.values())
      .filter(card => card.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getIdCardByVerificationCode(verificationCode: string): Promise<IdCard | undefined> {
    return Array.from(this.idCards.values())
      .find(card => card.verificationCode === verificationCode);
  }

  async createIdCard(insertCard: InsertIdCard): Promise<IdCard> {
    const id = randomUUID();
    const card: IdCard = {
      ...insertCard,
      id,
      issueDate: insertCard.issueDate || new Date(),
      photoUrl: insertCard.photoUrl || null,
      signatureUrl: insertCard.signatureUrl || null,
      rfidChipData: insertCard.rfidChipData || null,
      parentNames: insertCard.parentNames || null,
      emergencyContact: insertCard.emergencyContact || null,
      createdAt: new Date()
    };
    this.idCards.set(id, card);
    return card;
  }

  async updateIdCard(id: string, updates: Partial<IdCard>): Promise<void> {
    const card = this.idCards.get(id);
    if (card) {
      this.idCards.set(id, { ...card, ...updates });
    }
  }

  // Document verification methods
  async getDocumentVerification(id: string): Promise<DocumentVerification | undefined> {
    return this.documentVerifications.get(id);
  }

  async getDocumentVerifications(documentType?: string, documentId?: string): Promise<DocumentVerification[]> {
    return Array.from(this.documentVerifications.values())
      .filter(verification => {
        if (documentType && verification.documentType !== documentType) return false;
        if (documentId && verification.documentId !== documentId) return false;
        return true;
      })
      .sort((a, b) => b.verifiedAt.getTime() - a.verifiedAt.getTime());
  }

  async createDocumentVerification(insertVerification: InsertDocumentVerification): Promise<DocumentVerification> {
    const id = randomUUID();
    const verification: DocumentVerification = {
      ...insertVerification,
      id,
      verifierIpAddress: insertVerification.verifierIpAddress || null,
      verifierUserAgent: insertVerification.verifierUserAgent || null,
      verificationDetails: insertVerification.verificationDetails || null,
      verifiedAt: insertVerification.verifiedAt || new Date()
    };
    this.documentVerifications.set(id, verification);
    return verification;
  }
}

export const storage = new MemStorage();
