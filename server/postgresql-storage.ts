import { db } from "./db";
import { 
  users, conversations, messages, documents, securityEvents, fraudAlerts, 
  systemMetrics, auditLogs, complianceEvents, userBehaviorProfiles,
  selfHealingActions, securityIncidents, systemHealthSnapshots, errorCorrections,
  healthCheckResults, failoverEvents, performanceBaselines, alertRules,
  circuitBreakerStates, uptimeIncidents, autonomousOperations, maintenanceTasks,
  governmentComplianceAudits, securityMetrics, biometricProfiles,
  dhaApplicants, dhaDocuments, dhaDocumentVerifications,
  aiBotSessions, aiCommandInterfaces,
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
  type SelfHealingAction, type InsertSelfHealingAction,
  type SecurityIncident, type InsertSecurityIncident,
  type SystemHealthSnapshot, type InsertSystemHealthSnapshot,
  type ErrorCorrection, type InsertErrorCorrection,
  type HealthCheckResult, type InsertHealthCheckResult,
  type FailoverEvent, type InsertFailoverEvent,
  type PerformanceBaseline, type InsertPerformanceBaseline,
  type AlertRule, type InsertAlertRule,
  type CircuitBreakerState, type InsertCircuitBreakerState,
  type UptimeIncident, type InsertUptimeIncident,
  type AutonomousOperation, type InsertAutonomousOperation,
  type MaintenanceTask, type InsertMaintenanceTask,
  type GovernmentComplianceAudit, type InsertGovernmentComplianceAudit,
  type SecurityMetric, type InsertSecurityMetric,
  type BiometricProfile, type InsertBiometricProfile,
  type DhaApplicant, type InsertDhaApplicant,
  type DhaDocument, type InsertDhaDocument,
  type DhaDocumentVerification, type InsertDhaDocumentVerification,
  type AiBotSession, type InsertAiBotSession,
  type AiCommandInterface, type InsertAiCommandInterface
} from "@shared/schema";
import { eq, desc, and, gte, sql, or, isNull, count } from "drizzle-orm";
import { PostgresJsDatabase } from "drizzle-orm/postgres-js";
import * as schema from "./schema/tables";

export class PostgreSQLStorage {
  public readonly query: PostgresJsDatabase<typeof schema>;

  constructor() {
    this.query = db;
  }
}

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

  // Self-Healing Architecture methods
  createSelfHealingAction(action: InsertSelfHealingAction): Promise<SelfHealingAction>;
  getSelfHealingActions(filters?: any): Promise<SelfHealingAction[]>;
  updateSelfHealingAction(id: string, updates: Partial<SelfHealingAction>): Promise<SelfHealingAction | undefined>;
  
  createSystemHealthSnapshot(snapshot: InsertSystemHealthSnapshot): Promise<SystemHealthSnapshot>;
  getSystemHealthSnapshots(limit?: number): Promise<SystemHealthSnapshot[]>;
  getLatestSystemHealthSnapshot(): Promise<SystemHealthSnapshot | undefined>;
  
  createSecurityIncident(incident: InsertSecurityIncident): Promise<SecurityIncident>;
  getSecurityIncidents(filters?: any): Promise<SecurityIncident[]>;
  updateSecurityIncident(id: string, updates: Partial<SecurityIncident>): Promise<SecurityIncident | undefined>;
  
  createErrorCorrection(correction: InsertErrorCorrection): Promise<ErrorCorrection>;
  getErrorCorrections(filters?: any): Promise<ErrorCorrection[]>;
  updateErrorCorrection(id: string, updates: Partial<ErrorCorrection>): Promise<ErrorCorrection | undefined>;
  
  createHealthCheckResult(result: InsertHealthCheckResult): Promise<HealthCheckResult>;
  getHealthCheckResults(checkId?: string): Promise<HealthCheckResult[]>;
  
  createFailoverEvent(event: InsertFailoverEvent): Promise<FailoverEvent>;
  getFailoverEvents(serviceId?: string): Promise<FailoverEvent[]>;
  updateFailoverEvent(id: string, updates: Partial<FailoverEvent>): Promise<FailoverEvent | undefined>;
  
  createPerformanceBaseline(baseline: InsertPerformanceBaseline): Promise<PerformanceBaseline>;
  getPerformanceBaselines(serviceName?: string): Promise<PerformanceBaseline[]>;
  updatePerformanceBaseline(id: string, updates: Partial<PerformanceBaseline>): Promise<PerformanceBaseline | undefined>;
  
  createAlertRule(rule: InsertAlertRule): Promise<AlertRule>;
  getAlertRules(): Promise<AlertRule[]>;
  updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule | undefined>;
  
  createCircuitBreakerState(state: InsertCircuitBreakerState): Promise<CircuitBreakerState>;
  getCircuitBreakerState(serviceName: string): Promise<CircuitBreakerState | undefined>;
  updateCircuitBreakerState(serviceName: string, updates: Partial<CircuitBreakerState>): Promise<CircuitBreakerState | undefined>;
  
  createUptimeIncident(incident: InsertUptimeIncident): Promise<UptimeIncident>;
  getUptimeIncidents(serviceId?: string): Promise<UptimeIncident[]>;
  updateUptimeIncident(id: string, updates: Partial<UptimeIncident>): Promise<UptimeIncident | undefined>;
  
  createAutonomousOperation(operation: InsertAutonomousOperation): Promise<AutonomousOperation>;
  getAutonomousOperations(filters?: any): Promise<AutonomousOperation[]>;
  updateAutonomousOperation(id: string, updates: Partial<AutonomousOperation>): Promise<AutonomousOperation | undefined>;
  
  createMaintenanceTask(task: InsertMaintenanceTask): Promise<MaintenanceTask>;
  getMaintenanceTasks(filters?: any): Promise<MaintenanceTask[]>;
  updateMaintenanceTask(id: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | undefined>;
  
  createGovernmentComplianceAudit(audit: InsertGovernmentComplianceAudit): Promise<GovernmentComplianceAudit>;
  getGovernmentComplianceAudits(auditType?: string): Promise<GovernmentComplianceAudit[]>;
  updateGovernmentComplianceAudit(id: string, updates: Partial<GovernmentComplianceAudit>): Promise<GovernmentComplianceAudit | undefined>;
  
  // Additional methods for specific functionality
  getFraudAlerts(userId?: string, resolved?: boolean): Promise<FraudAlert[]>;
  createSecurityMetric(metric: InsertSecurityMetric): Promise<SecurityMetric>;
  getSecurityMetrics(filters?: any): Promise<SecurityMetric[]>;
  createBiometricProfile(profile: InsertBiometricProfile): Promise<BiometricProfile>;
  getBiometricProfile(userId: string): Promise<BiometricProfile | undefined>;
  updateBiometricProfile(userId: string, updates: Partial<BiometricProfile>): Promise<BiometricProfile | undefined>;

  // Statistics
  getStats(): Promise<{ users: number; conversations: number; messages: number; documents: number; securityEvents: number; systemMetrics: number; auditLogs: number; complianceEvents: number; userBehaviorProfiles: number; }>;
}
import * as bcrypt from "bcryptjs";

/**
 * PostgreSQL Storage Implementation using Drizzle ORM
 * Replaces MemStorage with persistent database storage for Railway deployment
 */
export class PostgreSQLStorage implements IStorage {
  getDocumentVerificationHistory: any;

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

  // ===================== SELF-HEALING ACTIONS =====================
  async createSelfHealingAction(insertAction: InsertSelfHealingAction): Promise<SelfHealingAction> {
    try {
      const result = await db.insert(selfHealingActions).values({
        ...insertAction,
        startTime: insertAction.startTime || new Date(),
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating self-healing action:', error);
      throw new Error('Failed to create self-healing action');
    }
  }

  async getSelfHealingActions(filters?: any): Promise<SelfHealingAction[]> {
    try {
      const query = db.select().from(selfHealingActions).orderBy(desc(selfHealingActions.createdAt));
      
      if (filters?.limit) {
        return await query.limit(filters.limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting self-healing actions:', error);
      return [];
    }
  }

  async updateSelfHealingAction(id: string, updates: Partial<SelfHealingAction>): Promise<SelfHealingAction | undefined> {
    try {
      const result = await db.update(selfHealingActions)
        .set(updates)
        .where(eq(selfHealingActions.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating self-healing action:', error);
      return undefined;
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
  // This is the main getStats implementation that is called later
  // Removed duplicate implementation here to avoid conflict

  // ===================== SYSTEM HEALTH SNAPSHOTS =====================
  async createSystemHealthSnapshot(insertSnapshot: InsertSystemHealthSnapshot): Promise<SystemHealthSnapshot> {
    try {
      const result = await db.insert(systemHealthSnapshots).values({
        ...insertSnapshot,
        timestamp: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating system health snapshot:', error);
      throw new Error('Failed to create system health snapshot');
    }
  }

  async getSystemHealthSnapshots(limit: number = 100): Promise<SystemHealthSnapshot[]> {
    try {
      return await db.select().from(systemHealthSnapshots)
        .orderBy(desc(systemHealthSnapshots.timestamp))
        .limit(limit);
    } catch (error) {
      console.error('Error getting system health snapshots:', error);
      return [];
    }
  }

  async getLatestSystemHealthSnapshot(): Promise<SystemHealthSnapshot | undefined> {
    try {
      const result = await db.select().from(systemHealthSnapshots)
        .orderBy(desc(systemHealthSnapshots.timestamp))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting latest system health snapshot:', error);
      return undefined;
    }
  }

  // ===================== SECURITY INCIDENTS =====================
  async createSecurityIncident(insertIncident: InsertSecurityIncident): Promise<SecurityIncident> {
    try {
      const result = await db.insert(securityIncidents).values({
        ...insertIncident,
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating security incident:', error);
      throw new Error('Failed to create security incident');
    }
  }

  async getSecurityIncidents(filters?: any): Promise<SecurityIncident[]> {
    try {
      const query = db.select().from(securityIncidents).orderBy(desc(securityIncidents.createdAt));
      
      if (filters?.limit) {
        return await query.limit(filters.limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting security incidents:', error);
      return [];
    }
  }

  async updateSecurityIncident(id: string, updates: Partial<SecurityIncident>): Promise<SecurityIncident | undefined> {
    try {
      const result = await db.update(securityIncidents)
        .set(updates)
        .where(eq(securityIncidents.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating security incident:', error);
      return undefined;
    }
  }

  // ===================== ERROR CORRECTIONS =====================
  async createErrorCorrection(insertCorrection: InsertErrorCorrection): Promise<ErrorCorrection> {
    try {
      const result = await db.insert(errorCorrections).values({
        ...insertCorrection,
        startTime: insertCorrection.startTime || new Date(),
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating error correction:', error);
      throw new Error('Failed to create error correction');
    }
  }

  async getErrorCorrections(filters?: any): Promise<ErrorCorrection[]> {
    try {
      const query = db.select().from(errorCorrections).orderBy(desc(errorCorrections.createdAt));
      
      if (filters?.limit) {
        return await query.limit(filters.limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting error corrections:', error);
      return [];
    }
  }

  async updateErrorCorrection(id: string, updates: Partial<ErrorCorrection>): Promise<ErrorCorrection | undefined> {
    try {
      const result = await db.update(errorCorrections)
        .set(updates)
        .where(eq(errorCorrections.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating error correction:', error);
      return undefined;
    }
  }

  // ===================== HEALTH CHECK RESULTS =====================
  async createHealthCheckResult(insertResult: InsertHealthCheckResult): Promise<HealthCheckResult> {
    try {
      const result = await db.insert(healthCheckResults).values({
        ...insertResult,
        timestamp: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating health check result:', error);
      throw new Error('Failed to create health check result');
    }
  }

  async getHealthCheckResults(checkId?: string): Promise<HealthCheckResult[]> {
    try {
      const query = db.select().from(healthCheckResults).orderBy(desc(healthCheckResults.timestamp));
      
      if (checkId) {
        return await query.where(eq(healthCheckResults.checkId, checkId));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting health check results:', error);
      return [];
    }
  }

  // ===================== FAILOVER EVENTS =====================
  async createFailoverEvent(insertEvent: InsertFailoverEvent): Promise<FailoverEvent> {
    try {
      const result = await db.insert(failoverEvents).values({
        ...insertEvent,
        triggerTime: insertEvent.triggerTime || new Date(),
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating failover event:', error);
      throw new Error('Failed to create failover event');
    }
  }

  async getFailoverEvents(serviceId?: string): Promise<FailoverEvent[]> {
    try {
      const query = db.select().from(failoverEvents).orderBy(desc(failoverEvents.createdAt));
      
      if (serviceId) {
        return await query.where(eq(failoverEvents.serviceId, serviceId));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting failover events:', error);
      return [];
    }
  }

  async updateFailoverEvent(id: string, updates: Partial<FailoverEvent>): Promise<FailoverEvent | undefined> {
    try {
      const result = await db.update(failoverEvents)
        .set(updates)
        .where(eq(failoverEvents.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating failover event:', error);
      return undefined;
    }
  }

  // ===================== PERFORMANCE BASELINES =====================
  async createPerformanceBaseline(insertBaseline: InsertPerformanceBaseline): Promise<PerformanceBaseline> {
    try {
      const result = await db.insert(performanceBaselines).values({
        ...insertBaseline,
        lastUpdated: new Date(),
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating performance baseline:', error);
      throw new Error('Failed to create performance baseline');
    }
  }

  async getPerformanceBaselines(serviceName?: string): Promise<PerformanceBaseline[]> {
    try {
      const query = db.select().from(performanceBaselines).orderBy(desc(performanceBaselines.createdAt));
      
      if (serviceName) {
        return await query.where(eq(performanceBaselines.serviceName, serviceName));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting performance baselines:', error);
      return [];
    }
  }

  async updatePerformanceBaseline(id: string, updates: Partial<PerformanceBaseline>): Promise<PerformanceBaseline | undefined> {
    try {
      const result = await db.update(performanceBaselines)
        .set(updates)
        .where(eq(performanceBaselines.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating performance baseline:', error);
      return undefined;
    }
  }

  // ===================== ALERT RULES =====================
  async createAlertRule(insertRule: InsertAlertRule): Promise<AlertRule> {
    try {
      const result = await db.insert(alertRules).values({
        ...insertRule,
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating alert rule:', error);
      throw new Error('Failed to create alert rule');
    }
  }

  async getAlertRules(): Promise<AlertRule[]> {
    try {
      return await db.select().from(alertRules).orderBy(desc(alertRules.createdAt));
    } catch (error) {
      console.error('Error getting alert rules:', error);
      return [];
    }
  }

  async updateAlertRule(id: string, updates: Partial<AlertRule>): Promise<AlertRule | undefined> {
    try {
      const result = await db.update(alertRules)
        .set(updates)
        .where(eq(alertRules.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating alert rule:', error);
      return undefined;
    }
  }

  // ===================== CIRCUIT BREAKER STATES =====================
  async createCircuitBreakerState(insertState: InsertCircuitBreakerState): Promise<CircuitBreakerState> {
    try {
      const result = await db.insert(circuitBreakerStates).values({
        ...insertState,
        lastStateChange: new Date(),
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating circuit breaker state:', error);
      throw new Error('Failed to create circuit breaker state');
    }
  }

  async getCircuitBreakerState(serviceName: string): Promise<CircuitBreakerState | undefined> {
    try {
      const result = await db.select().from(circuitBreakerStates)
        .where(eq(circuitBreakerStates.serviceName, serviceName))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting circuit breaker state:', error);
      return undefined;
    }
  }

  async updateCircuitBreakerState(serviceName: string, updates: Partial<CircuitBreakerState>): Promise<CircuitBreakerState | undefined> {
    try {
      const result = await db.update(circuitBreakerStates)
        .set(updates)
        .where(eq(circuitBreakerStates.serviceName, serviceName))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating circuit breaker state:', error);
      return undefined;
    }
  }

  // ===================== UPTIME INCIDENTS =====================
  async createUptimeIncident(insertIncident: InsertUptimeIncident): Promise<UptimeIncident> {
    try {
      const result = await db.insert(uptimeIncidents).values({
        ...insertIncident,
        startTime: insertIncident.startTime || new Date(),
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating uptime incident:', error);
      throw new Error('Failed to create uptime incident');
    }
  }

  async getUptimeIncidents(serviceId?: string): Promise<UptimeIncident[]> {
    try {
      const query = db.select().from(uptimeIncidents).orderBy(desc(uptimeIncidents.createdAt));
      
      if (serviceId) {
        return await query.where(eq(uptimeIncidents.serviceId, serviceId));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting uptime incidents:', error);
      return [];
    }
  }

  async updateUptimeIncident(id: string, updates: Partial<UptimeIncident>): Promise<UptimeIncident | undefined> {
    try {
      const result = await db.update(uptimeIncidents)
        .set(updates)
        .where(eq(uptimeIncidents.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating uptime incident:', error);
      return undefined;
    }
  }

  // ===================== AUTONOMOUS OPERATIONS =====================
  async createAutonomousOperation(insertOperation: InsertAutonomousOperation): Promise<AutonomousOperation> {
    try {
      const result = await db.insert(autonomousOperations).values({
        ...insertOperation,
        startTime: insertOperation.startTime || new Date(),
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating autonomous operation:', error);
      throw new Error('Failed to create autonomous operation');
    }
  }

  async getAutonomousOperations(filters?: any): Promise<AutonomousOperation[]> {
    try {
      const query = db.select().from(autonomousOperations).orderBy(desc(autonomousOperations.createdAt));
      
      if (filters?.limit) {
        return await query.limit(filters.limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting autonomous operations:', error);
      return [];
    }
  }

  async updateAutonomousOperation(id: string, updates: Partial<AutonomousOperation>): Promise<AutonomousOperation | undefined> {
    try {
      const result = await db.update(autonomousOperations)
        .set(updates)
        .where(eq(autonomousOperations.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating autonomous operation:', error);
      return undefined;
    }
  }

  // ===================== MAINTENANCE TASKS =====================
  async createMaintenanceTask(insertTask: InsertMaintenanceTask): Promise<MaintenanceTask> {
    try {
      const result = await db.insert(maintenanceTasks).values({
        ...insertTask,
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating maintenance task:', error);
      throw new Error('Failed to create maintenance task');
    }
  }

  async getMaintenanceTasks(filters?: any): Promise<MaintenanceTask[]> {
    try {
      const query = db.select().from(maintenanceTasks).orderBy(desc(maintenanceTasks.createdAt));
      
      if (filters?.limit) {
        return await query.limit(filters.limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting maintenance tasks:', error);
      return [];
    }
  }

  async updateMaintenanceTask(id: string, updates: Partial<MaintenanceTask>): Promise<MaintenanceTask | undefined> {
    try {
      const result = await db.update(maintenanceTasks)
        .set(updates)
        .where(eq(maintenanceTasks.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating maintenance task:', error);
      return undefined;
    }
  }

  // ===================== GOVERNMENT COMPLIANCE AUDITS =====================
  async createGovernmentComplianceAudit(insertAudit: InsertGovernmentComplianceAudit): Promise<GovernmentComplianceAudit> {
    try {
      const result = await db.insert(governmentComplianceAudits).values({
        ...insertAudit,
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating government compliance audit:', error);
      throw new Error('Failed to create government compliance audit');
    }
  }

  async getGovernmentComplianceAudits(auditType?: string): Promise<GovernmentComplianceAudit[]> {
    try {
      const query = db.select().from(governmentComplianceAudits).orderBy(desc(governmentComplianceAudits.createdAt));
      
      if (auditType) {
        return await query.where(eq(governmentComplianceAudits.auditType, auditType));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting government compliance audits:', error);
      return [];
    }
  }

  async updateGovernmentComplianceAudit(id: string, updates: Partial<GovernmentComplianceAudit>): Promise<GovernmentComplianceAudit | undefined> {
    try {
      const result = await db.update(governmentComplianceAudits)
        .set(updates)
        .where(eq(governmentComplianceAudits.id, id))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating government compliance audit:', error);
      return undefined;
    }
  }

  // ===================== FRAUD ALERTS =====================
  async getFraudAlerts(userId?: string, resolved?: boolean): Promise<FraudAlert[]> {
    try {
      const query = db.select().from(fraudAlerts).orderBy(desc(fraudAlerts.createdAt));
      
      const conditions = [];
      if (userId) conditions.push(eq(fraudAlerts.userId, userId));
      if (resolved !== undefined) conditions.push(eq(fraudAlerts.isResolved, resolved));
      
      if (conditions.length > 0) {
        return await query.where(and(...conditions));
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting fraud alerts:', error);
      return [];
    }
  }

  // ===================== SECURITY METRICS =====================
  async createSecurityMetric(insertMetric: InsertSecurityMetric): Promise<SecurityMetric> {
    try {
      const result = await db.insert(securityMetrics).values({
        ...insertMetric,
        timestamp: new Date(),
        createdAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating security metric:', error);
      throw new Error('Failed to create security metric');
    }
  }

  async getSecurityMetrics(filters?: any): Promise<SecurityMetric[]> {
    try {
      const query = db.select().from(securityMetrics).orderBy(desc(securityMetrics.timestamp));
      
      if (filters?.limit) {
        return await query.limit(filters.limit);
      }
      
      return await query;
    } catch (error) {
      console.error('Error getting security metrics:', error);
      return [];
    }
  }

  // ===================== BIOMETRIC PROFILES =====================
  async createBiometricProfile(insertProfile: InsertBiometricProfile): Promise<BiometricProfile> {
    try {
      const result = await db.insert(biometricProfiles).values({
        ...insertProfile,
        createdAt: new Date(),
        updatedAt: new Date()
      }).returning();
      
      return result[0];
    } catch (error) {
      console.error('Error creating biometric profile:', error);
      throw new Error('Failed to create biometric profile');
    }
  }

  async getBiometricProfile(userId: string): Promise<BiometricProfile | undefined> {
    try {
      const result = await db.select().from(biometricProfiles)
        .where(eq(biometricProfiles.userId, userId))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting biometric profile:', error);
      return undefined;
    }
  }

  async updateBiometricProfile(userId: string, updates: Partial<BiometricProfile>): Promise<BiometricProfile | undefined> {
    try {
      const result = await db.update(biometricProfiles)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(biometricProfiles.userId, userId))
        .returning();
      
      return result[0];
    } catch (error) {
      console.error('Error updating biometric profile:', error);
      return undefined;
    }
  }

  // ===================== DHA DOCUMENT MANAGEMENT =====================
  
  async getDhaApplicant(id: string): Promise<DhaApplicant | undefined> {
    try {
      const result = await db.select().from(dhaApplicants).where(eq(dhaApplicants.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting DHA applicant:', error);
      return undefined;
    }
  }

  async getDhaApplicantByIdNumber(idNumber: string): Promise<DhaApplicant | undefined> {
    try {
      const result = await db.select().from(dhaApplicants)
        .where(eq(dhaApplicants.idNumber, idNumber))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting DHA applicant by ID number:', error);
      return undefined;
    }
  }

  async getDhaApplicantByPassport(passportNumber: string): Promise<DhaApplicant | undefined> {
    try {
      const result = await db.select().from(dhaApplicants)
        .where(eq(dhaApplicants.passportNumber, passportNumber))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting DHA applicant by passport:', error);
      return undefined;
    }
  }

  async createDhaApplicant(applicant: InsertDhaApplicant): Promise<DhaApplicant> {
    try {
      const result = await db.insert(dhaApplicants).values(applicant).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating DHA applicant:', error);
      throw new Error('Failed to create DHA applicant');
    }
  }

  async updateDhaApplicant(id: string, updates: Partial<DhaApplicant>): Promise<DhaApplicant | undefined> {
    try {
      const result = await db.update(dhaApplicants)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(dhaApplicants.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating DHA applicant:', error);
      return undefined;
    }
  }

  async getDhaApplicants(): Promise<DhaApplicant[]> {
    try {
      return await db.select().from(dhaApplicants);
    } catch (error) {
      console.error('Error getting DHA applicants:', error);
      return [];
    }
  }

  async getDhaDocument(id: string): Promise<DhaDocument | undefined> {
    try {
      const result = await db.select().from(dhaDocuments).where(eq(dhaDocuments.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting DHA document:', error);
      return undefined;
    }
  }

  async getDhaDocumentByNumber(documentNumber: string): Promise<DhaDocument | undefined> {
    try {
      const result = await db.select().from(dhaDocuments)
        .where(eq(dhaDocuments.documentNumber, documentNumber))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting DHA document by number:', error);
      return undefined;
    }
  }

  async getApplicantDhaDocuments(applicantId: string): Promise<DhaDocument[]> {
    try {
      return await db.select().from(dhaDocuments)
        .where(eq(dhaDocuments.applicantId, applicantId));
    } catch (error) {
      console.error('Error getting applicant DHA documents:', error);
      return [];
    }
  }

  async createDhaDocument(document: InsertDhaDocument): Promise<DhaDocument> {
    try {
      const result = await db.insert(dhaDocuments).values(document).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating DHA document:', error);
      throw new Error('Failed to create DHA document');
    }
  }

  async updateDhaDocument(id: string, updates: Partial<DhaDocument>): Promise<DhaDocument | undefined> {
    try {
      const result = await db.update(dhaDocuments)
        .set({ ...updates, updatedAt: new Date() })
        .where(eq(dhaDocuments.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating DHA document:', error);
      return undefined;
    }
  }

  async getDhaDocuments(): Promise<DhaDocument[]> {
    try {
      return await db.select().from(dhaDocuments);
    } catch (error) {
      console.error('Error getting DHA documents:', error);
      return [];
    }
  }

  async getDhaDocumentVerification(id: string): Promise<DhaDocumentVerification | undefined> {
    try {
      const result = await db.select().from(dhaDocumentVerifications)
        .where(eq(dhaDocumentVerifications.id, id))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting DHA document verification:', error);
      return undefined;
    }
  }

  async getDhaDocumentVerificationByCode(verificationCode: string): Promise<DhaDocumentVerification | undefined> {
    try {
      const result = await db.select().from(dhaDocumentVerifications)
        .where(eq(dhaDocumentVerifications.verificationCode, verificationCode))
        .limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting DHA document verification by code:', error);
      return undefined;
    }
  }

  async createDhaDocumentVerification(verification: InsertDhaDocumentVerification): Promise<DhaDocumentVerification> {
    try {
      const result = await db.insert(dhaDocumentVerifications).values(verification).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating DHA document verification:', error);
      throw new Error('Failed to create DHA document verification');
    }
  }

  async updateDhaDocumentVerification(id: string, updates: Partial<DhaDocumentVerification>): Promise<DhaDocumentVerification | undefined> {
    try {
      const result = await db.update(dhaDocumentVerifications)
        .set(updates)
        .where(eq(dhaDocumentVerifications.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating DHA document verification:', error);
      return undefined;
    }
  }

  // ===================== AI BOT SESSIONS =====================
  
  async getAiBotSession(id: string): Promise<AiBotSession | undefined> {
    try {
      const result = await db.select().from(aiBotSessions).where(eq(aiBotSessions.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting AI bot session:', error);
      return undefined;
    }
  }

  async getUserAiBotSessions(userId: string): Promise<AiBotSession[]> {
    try {
      return await db.select().from(aiBotSessions)
        .where(eq(aiBotSessions.userId, userId))
        .orderBy(desc(aiBotSessions.createdAt));
    } catch (error) {
      console.error('Error getting user AI bot sessions:', error);
      return [];
    }
  }

  async createAiBotSession(session: InsertAiBotSession): Promise<AiBotSession> {
    try {
      const result = await db.insert(aiBotSessions).values({
        ...session,
        createdAt: new Date(),
        lastActivity: new Date()
      }).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating AI bot session:', error);
      throw new Error('Failed to create AI bot session');
    }
  }

  async updateAiBotSession(id: string, updates: Partial<AiBotSession>): Promise<AiBotSession | undefined> {
    try {
      const result = await db.update(aiBotSessions)
        .set({ ...updates, lastActivity: new Date() })
        .where(eq(aiBotSessions.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating AI bot session:', error);
      return undefined;
    }
  }

  async deactivateAiBotSession(id: string): Promise<AiBotSession | undefined> {
    try {
      const result = await db.update(aiBotSessions)
        .set({ sessionActive: false, lastActivity: new Date() })
        .where(eq(aiBotSessions.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error deactivating AI bot session:', error);
      return undefined;
    }
  }

  // ===================== AI COMMAND INTERFACES =====================
  
  async getAiCommandInterface(id: string): Promise<AiCommandInterface | undefined> {
    try {
      const result = await db.select().from(aiCommandInterfaces).where(eq(aiCommandInterfaces.id, id)).limit(1);
      return result[0];
    } catch (error) {
      console.error('Error getting AI command interface:', error);
      return undefined;
    }
  }

  async getSessionAiCommands(sessionId: string): Promise<AiCommandInterface[]> {
    try {
      return await db.select().from(aiCommandInterfaces)
        .where(eq(aiCommandInterfaces.sessionId, sessionId))
        .orderBy(desc(aiCommandInterfaces.createdAt));
    } catch (error) {
      console.error('Error getting session AI commands:', error);
      return [];
    }
  }

  async createAiCommandInterface(command: InsertAiCommandInterface): Promise<AiCommandInterface> {
    try {
      const result = await db.insert(aiCommandInterfaces).values({
        ...command,
        createdAt: new Date()
      }).returning();
      return result[0];
    } catch (error) {
      console.error('Error creating AI command interface:', error);
      throw new Error('Failed to create AI command interface');
    }
  }

  async updateAiCommandInterface(id: string, updates: Partial<AiCommandInterface>): Promise<AiCommandInterface | undefined> {
    try {
      const result = await db.update(aiCommandInterfaces)
        .set(updates)
        .where(eq(aiCommandInterfaces.id, id))
        .returning();
      return result[0];
    } catch (error) {
      console.error('Error updating AI command interface:', error);
      return undefined;
    }
  }

  async getAiCommandsByStatus(status: string): Promise<AiCommandInterface[]> {
    try {
      return await db.select().from(aiCommandInterfaces)
        .where(eq(aiCommandInterfaces.executionStatus, status as any))
        .orderBy(desc(aiCommandInterfaces.createdAt));
    } catch (error) {
      console.error('Error getting AI commands by status:', error);
      return [];
    }
  }

  // ===================== ADDITIONAL METHODS =====================
  
  async getAllCircuitBreakerStates(): Promise<CircuitBreakerState[]> {
    try {
      return await db.select().from(circuitBreakerStates).orderBy(desc(circuitBreakerStates.createdAt));
    } catch (error) {
      console.error('Error getting all circuit breaker states:', error);
      return [];
    }
  }

  // These methods don't have corresponding tables but are in the interface
  // They return empty implementations for now
  async createErrorLog(errorLog: any): Promise<any> {
    console.warn('createErrorLog: No errorLogs table exists, returning stub');
    return { id: Date.now().toString(), ...errorLog };
  }

  async getErrorLogs(filters?: any): Promise<any[]> {
    console.warn('getErrorLogs: No errorLogs table exists, returning empty array');
    return [];
  }

  async createSecurityRule(rule: any): Promise<any> {
    console.warn('createSecurityRule: No securityRules table exists, returning stub');
    return { id: Date.now().toString(), ...rule };
  }

  async getSecurityRules(): Promise<any[]> {
    console.warn('getSecurityRules: No securityRules table exists, returning empty array');
    return [];
  }

  async updateSecurityRule(id: string, updates: any): Promise<any> {
    console.warn('updateSecurityRule: No securityRules table exists, returning stub');
    return { id, ...updates };
  }

  // Main getStats implementation
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
    return this.getStatsAsync();
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