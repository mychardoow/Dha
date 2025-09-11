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
  type DhaApplicant, type InsertDhaApplicant, type DhaApplication, type InsertDhaApplication,
  type DhaVerification, type InsertDhaVerification, type DhaAuditEvent, type InsertDhaAuditEvent,
  type DhaConsentRecord, type InsertDhaConsentRecord, type DhaBackgroundCheck, type InsertDhaBackgroundCheck,
  type NotificationEvent, type InsertNotificationEvent, type UserNotificationPreferences, type InsertUserNotificationPreferences,
  type StatusUpdate, type InsertStatusUpdate, type WebSocketSession, type InsertWebSocketSession,
  type ChatSession, type InsertChatSession, type ChatMessage, type InsertChatMessage,
  type AuditLog, type InsertAuditLog, type SecurityIncident, type InsertSecurityIncident,
  type UserBehaviorProfile, type InsertUserBehaviorProfile, type SecurityRule, type InsertSecurityRule,
  type ComplianceEvent, type InsertComplianceEvent, type SecurityMetric, type InsertSecurityMetric,
  type RefugeeDocument, type InsertRefugeeDocument, type DiplomaticPassport, type InsertDiplomaticPassport,
  type DocumentDelivery, type InsertDocumentDelivery, type VerificationWorkflow, type InsertVerificationWorkflow,
  type DhaOffice, type InsertDhaOffice,
  type AmsCertificate, type InsertAmsCertificate, type PermitStatusChange, type InsertPermitStatusChange,
  type DocumentVerificationStatus, type InsertDocumentVerificationStatus, 
  type DocumentVerificationHistory, type InsertDocumentVerificationHistory,
  users, conversations, messages, documents, securityEvents, fraudAlerts, systemMetrics, quantumKeys, errorLogs, 
  biometricProfiles, apiKeys, certificates, permits, documentTemplates, birthCertificates, marriageCertificates,
  passports, deathCertificates, workPermits, permanentVisas, idCards, documentVerifications,
  dhaApplicants, dhaApplications, dhaVerifications, dhaAuditEvents, dhaConsentRecords, dhaBackgroundChecks,
  notificationEvents, userNotificationPreferences, statusUpdates, webSocketSessions, chatSessions, chatMessages,
  auditLogs, securityIncidents, userBehaviorProfiles, securityRules, complianceEvents, securityMetrics,
  refugeeDocuments, diplomaticPassports, documentDelivery, verificationWorkflow, dhaOffices,
  amsCertificates, permitStatusChanges, documentVerificationStatus, documentVerificationHistory
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
  getAllUsers(): Promise<User[]>;

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
  getAllDocuments(): Promise<Document[]>;
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
  getAllApiKeys(): Promise<ApiKey[]>;
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

  // Refugee Document methods
  getRefugeeDocument(id: string): Promise<RefugeeDocument | undefined>;
  getRefugeeDocuments(userId?: string): Promise<RefugeeDocument[]>;
  createRefugeeDocument(document: InsertRefugeeDocument): Promise<RefugeeDocument>;
  updateRefugeeDocument(id: string, updates: Partial<RefugeeDocument>): Promise<void>;

  // Diplomatic Passport methods
  getDiplomaticPassport(id: string): Promise<DiplomaticPassport | undefined>;
  getDiplomaticPassports(userId?: string): Promise<DiplomaticPassport[]>;
  createDiplomaticPassport(passport: InsertDiplomaticPassport): Promise<DiplomaticPassport>;
  updateDiplomaticPassport(id: string, updates: Partial<DiplomaticPassport>): Promise<void>;

  // Document Delivery methods
  getDocumentDelivery(id: string): Promise<DocumentDelivery | undefined>;
  getDocumentDeliveries(userId?: string): Promise<DocumentDelivery[]>;
  createDocumentDelivery(delivery: InsertDocumentDelivery): Promise<DocumentDelivery>;
  updateDocumentDelivery(id: string, updates: Partial<DocumentDelivery>): Promise<void>;

  // Verification Workflow methods
  getVerificationWorkflow(id: string): Promise<VerificationWorkflow | undefined>;
  getVerificationWorkflows(documentId?: string): Promise<VerificationWorkflow[]>;
  createVerificationWorkflow(workflow: InsertVerificationWorkflow): Promise<VerificationWorkflow>;
  updateVerificationWorkflow(id: string, updates: Partial<VerificationWorkflow>): Promise<void>;

  // DHA Office methods
  getDhaOffice(id: string): Promise<DhaOffice | undefined>;
  getDhaOffices(province?: string): Promise<DhaOffice[]>;
  createDhaOffice(office: InsertDhaOffice): Promise<DhaOffice>;
  updateDhaOffice(id: string, updates: Partial<DhaOffice>): Promise<void>;

  // AMS Certificate methods
  getAmsCertificate(id: string): Promise<AmsCertificate | undefined>;
  getAmsCertificates(userId?: string, status?: string): Promise<AmsCertificate[]>;
  getAmsCertificateByNumber(certificateNumber: string): Promise<AmsCertificate | undefined>;
  createAmsCertificate(certificate: InsertAmsCertificate): Promise<AmsCertificate>;
  updateAmsCertificate(id: string, updates: Partial<AmsCertificate>): Promise<void>;
  verifyAmsCertificate(id: string, verifiedBy: string): Promise<void>;
  revokeAmsCertificate(id: string, reason: string): Promise<void>;
  suspendAmsCertificate(id: string, reason: string): Promise<void>;
  renewAmsCertificate(id: string, newExpiryDate: Date): Promise<AmsCertificate>;

  // Permit Status Change methods
  getPermitStatusChanges(permitId: string): Promise<PermitStatusChange[]>;
  createPermitStatusChange(change: InsertPermitStatusChange): Promise<PermitStatusChange>;
  getLatestPermitStatus(permitId: string): Promise<PermitStatusChange | undefined>;
  updatePermitStatus(permitId: string, newStatus: string, changedBy: string, reason: string): Promise<PermitStatusChange>;

  // Document Verification Status methods
  getDocumentVerificationStatus(documentId: string): Promise<DocumentVerificationStatus | undefined>;
  getDocumentVerificationStatuses(documentType?: string): Promise<DocumentVerificationStatus[]>;
  createDocumentVerificationStatus(status: InsertDocumentVerificationStatus): Promise<DocumentVerificationStatus>;
  updateDocumentVerificationStatus(id: string, updates: Partial<DocumentVerificationStatus>): Promise<void>;
  updateDocumentStatus(documentId: string, newStatus: string, updatedBy: string, reason?: string): Promise<void>;

  // Document Verification History methods
  getDocumentVerificationHistory(documentId: string): Promise<DocumentVerificationHistory[]>;
  createDocumentVerificationHistory(history: InsertDocumentVerificationHistory): Promise<DocumentVerificationHistory>;
  getVerificationHistoryByType(documentType: string, limit?: number): Promise<DocumentVerificationHistory[]>;

  // Document verification methods
  getDocumentVerification(id: string): Promise<DocumentVerification | undefined>;
  getDocumentVerifications(documentType?: string, documentId?: string): Promise<DocumentVerification[]>;
  createDocumentVerification(verification: InsertDocumentVerification): Promise<DocumentVerification>;

  // DHA integration methods
  getDhaApplicant(id: string): Promise<DhaApplicant | undefined>;
  getDhaApplicants(userId: string): Promise<DhaApplicant[]>;
  createDhaApplicant(applicant: InsertDhaApplicant): Promise<DhaApplicant>;
  updateDhaApplicant(id: string, updates: Partial<DhaApplicant>): Promise<void>;

  getDhaApplication(id: string): Promise<DhaApplication | undefined>;
  getDhaApplications(applicantId?: string, userId?: string): Promise<DhaApplication[]>;
  createDhaApplication(application: InsertDhaApplication): Promise<DhaApplication>;
  updateDhaApplication(id: string, updates: Partial<DhaApplication>): Promise<void>;

  getDhaVerification(id: string): Promise<DhaVerification | undefined>;
  getDhaVerifications(filters?: {
    applicantId?: string;
    applicationId?: string;
    verificationType?: string;
  }): Promise<DhaVerification[]>;
  createDhaVerification(verification: InsertDhaVerification): Promise<DhaVerification>;

  getDhaAuditEvents(filters?: {
    applicationId?: string;
    applicantId?: string;
    userId?: string;
    eventType?: string;
    limit?: number;
  }): Promise<DhaAuditEvent[]>;
  createDhaAuditEvent(event: InsertDhaAuditEvent): Promise<DhaAuditEvent>;

  getDhaConsentRecord(id: string): Promise<DhaConsentRecord | undefined>;
  getDhaConsentRecords(applicantId: string): Promise<DhaConsentRecord[]>;
  createDhaConsentRecord(record: InsertDhaConsentRecord): Promise<DhaConsentRecord>;
  updateDhaConsentRecord(id: string, updates: Partial<DhaConsentRecord>): Promise<void>;

  getDhaBackgroundCheck(id: string): Promise<DhaBackgroundCheck | undefined>;
  getDhaBackgroundChecks(filters?: {
    applicantId?: string;
    applicationId?: string;
    checkType?: string;
  }): Promise<DhaBackgroundCheck[]>;
  createDhaBackgroundCheck(check: InsertDhaBackgroundCheck): Promise<DhaBackgroundCheck>;
  updateDhaBackgroundCheck(id: string, updates: Partial<DhaBackgroundCheck>): Promise<void>;

  // ===================== NOTIFICATION METHODS =====================

  // Notification Events
  getNotifications(userId?: string, filters?: {
    category?: string;
    priority?: string;
    isRead?: boolean;
    isArchived?: boolean;
    requiresAction?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationEvent[]>;
  getNotification(id: string): Promise<NotificationEvent | undefined>;
  createNotification(notification: InsertNotificationEvent): Promise<NotificationEvent>;
  markNotificationAsRead(id: string): Promise<void>;
  markAllNotificationsAsRead(userId: string): Promise<void>;
  archiveNotification(id: string): Promise<void>;
  deleteNotification(id: string): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;
  
  // User Notification Preferences
  getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | undefined>;
  createUserNotificationPreferences(preferences: InsertUserNotificationPreferences): Promise<UserNotificationPreferences>;
  updateUserNotificationPreferences(userId: string, updates: Partial<UserNotificationPreferences>): Promise<void>;
  
  // Status Updates
  getStatusUpdates(filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    isPublic?: boolean;
    limit?: number;
  }): Promise<StatusUpdate[]>;
  getLatestStatusUpdate(entityType: string, entityId: string): Promise<StatusUpdate | undefined>;
  createStatusUpdate(update: InsertStatusUpdate): Promise<StatusUpdate>;
  
  // WebSocket Sessions
  getWebSocketSessions(userId?: string): Promise<WebSocketSession[]>;
  getWebSocketSession(socketId: string): Promise<WebSocketSession | undefined>;
  createWebSocketSession(session: InsertWebSocketSession): Promise<WebSocketSession>;
  updateWebSocketSession(id: string, updates: Partial<WebSocketSession>): Promise<void>;
  deactivateWebSocketSession(socketId: string): Promise<void>;
  updateWebSocketLastSeen(socketId: string): Promise<void>;
  
  // Chat Sessions
  getChatSessions(userId?: string, adminId?: string): Promise<ChatSession[]>;
  getChatSession(id: string): Promise<ChatSession | undefined>;
  createChatSession(session: InsertChatSession): Promise<ChatSession>;
  updateChatSession(id: string, updates: Partial<ChatSession>): Promise<void>;
  assignChatSessionToAdmin(sessionId: string, adminId: string): Promise<void>;
  closeChatSession(sessionId: string): Promise<void>;
  
  // Chat Messages
  getChatMessages(chatSessionId: string): Promise<ChatMessage[]>;
  createChatMessage(message: InsertChatMessage): Promise<ChatMessage>;
  markChatMessageAsRead(messageId: string): Promise<void>;
  markAllChatMessagesAsRead(chatSessionId: string, userId: string): Promise<void>;
  
  // ===================== ENHANCED SECURITY MONITORING METHODS =====================
  
  // Audit Log methods
  getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]>;
  createAuditLog(auditLog: InsertAuditLog): Promise<AuditLog>;
  getAuditLogById(id: string): Promise<AuditLog | undefined>;
  
  // Security Incident methods
  getSecurityIncidents(filters?: {
    status?: string;
    severity?: string;
    incidentType?: string;
    assignedTo?: string;
    limit?: number;
  }): Promise<SecurityIncident[]>;
  getSecurityIncident(id: string): Promise<SecurityIncident | undefined>;
  createSecurityIncident(incident: InsertSecurityIncident): Promise<SecurityIncident>;
  updateSecurityIncident(id: string, updates: Partial<SecurityIncident>): Promise<void>;
  assignIncidentTo(incidentId: string, assignedTo: string): Promise<void>;
  resolveIncident(incidentId: string, resolution: string, resolvedBy: string): Promise<void>;
  closeIncident(incidentId: string, closedBy: string): Promise<void>;
  
  // User Behavior Profile methods
  getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | undefined>;
  createUserBehaviorProfile(profile: InsertUserBehaviorProfile): Promise<UserBehaviorProfile>;
  updateUserBehaviorProfile(userId: string, updates: Partial<UserBehaviorProfile>): Promise<void>;
  analyzeUserBehavior(userId: string): Promise<{
    riskScore: number;
    anomalies: string[];
    recommendations: string[];
  }>;
  
  // Security Rule methods
  getSecurityRules(filters?: {
    category?: string;
    isActive?: boolean;
    ruleType?: string;
  }): Promise<SecurityRule[]>;
  getSecurityRule(id: string): Promise<SecurityRule | undefined>;
  createSecurityRule(rule: InsertSecurityRule): Promise<SecurityRule>;
  updateSecurityRule(id: string, updates: Partial<SecurityRule>): Promise<void>;
  activateSecurityRule(id: string): Promise<void>;
  deactivateSecurityRule(id: string): Promise<void>;
  incrementRuleTriggeredCount(id: string): Promise<void>;
  
  // Compliance Event methods
  getComplianceEvents(filters?: {
    regulation?: string;
    eventType?: string;
    dataSubjectId?: string;
    complianceStatus?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ComplianceEvent[]>;
  createComplianceEvent(event: InsertComplianceEvent): Promise<ComplianceEvent>;
  getComplianceEvent(id: string): Promise<ComplianceEvent | undefined>;
  updateComplianceEventStatus(id: string, status: string, reviewNotes?: string, reviewedBy?: string): Promise<void>;
  getComplianceReport(regulation: string, startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    compliantEvents: number;
    nonCompliantEvents: number;
    eventsByType: Record<string, number>;
    dataByCategory: Record<string, number>;
  }>;
  
  // Security Metrics methods
  getSecurityMetrics(filters?: {
    metricName?: string;
    timeWindow?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SecurityMetric[]>;
  createSecurityMetric(metric: InsertSecurityMetric): Promise<SecurityMetric>;
  getLatestSecurityMetrics(metricNames: string[]): Promise<SecurityMetric[]>;
  getSecurityMetricTrends(metricName: string, timeWindow: string, periods: number): Promise<SecurityMetric[]>;
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
  
  // DHA integration storage
  private dhaApplicants: Map<string, DhaApplicant>;
  private dhaApplications: Map<string, DhaApplication>;
  private dhaVerifications: Map<string, DhaVerification>;
  private dhaAuditEvents: Map<string, DhaAuditEvent>;
  private dhaConsentRecords: Map<string, DhaConsentRecord>;
  private dhaBackgroundChecks: Map<string, DhaBackgroundCheck>;
  
  // Notification system storage
  private notificationEvents: Map<string, NotificationEvent>;
  private userNotificationPreferences: Map<string, UserNotificationPreferences>;
  private statusUpdates: Map<string, StatusUpdate>;
  private webSocketSessions: Map<string, WebSocketSession>;
  private chatSessions: Map<string, ChatSession>;
  private chatMessages: Map<string, ChatMessage>;
  
  // Enhanced security monitoring storage
  private auditLogs: Map<string, AuditLog>;
  private securityIncidents: Map<string, SecurityIncident>;
  private userBehaviorProfiles: Map<string, UserBehaviorProfile>;
  private securityRules: Map<string, SecurityRule>;
  private complianceEvents: Map<string, ComplianceEvent>;
  private securityMetricsStorage: Map<string, SecurityMetric>;
  
  // New document management storage
  private refugeeDocuments: Map<string, RefugeeDocument>;
  private diplomaticPassports: Map<string, DiplomaticPassport>;
  private documentDelivery: Map<string, DocumentDelivery>;
  private verificationWorkflow: Map<string, VerificationWorkflow>;
  private dhaOffices: Map<string, DhaOffice>;
  
  // AMS Certificate and Status Management storage
  private amsCertificates: Map<string, AmsCertificate>;
  private permitStatusChanges: Map<string, PermitStatusChange>;
  private documentVerificationStatusMap: Map<string, DocumentVerificationStatus>;
  private documentVerificationHistoryMap: Map<string, DocumentVerificationHistory>;

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
    
    // Initialize DHA storage
    this.dhaApplicants = new Map();
    this.dhaApplications = new Map();
    this.dhaVerifications = new Map();
    this.dhaAuditEvents = new Map();
    this.dhaConsentRecords = new Map();
    this.dhaBackgroundChecks = new Map();
    
    // Initialize notification system storage
    this.notificationEvents = new Map();
    this.userNotificationPreferences = new Map();
    this.statusUpdates = new Map();
    this.webSocketSessions = new Map();
    this.chatSessions = new Map();
    this.chatMessages = new Map();
    
    // Initialize enhanced security monitoring storage
    this.auditLogs = new Map();
    this.securityIncidents = new Map();
    this.userBehaviorProfiles = new Map();
    this.securityRules = new Map();
    this.complianceEvents = new Map();
    this.securityMetricsStorage = new Map();
    
    // Initialize new document management storage
    this.refugeeDocuments = new Map();
    this.diplomaticPassports = new Map();
    this.documentDelivery = new Map();
    this.verificationWorkflow = new Map();
    this.dhaOffices = new Map();
    
    // Initialize AMS Certificate and Status Management storage
    this.amsCertificates = new Map();
    this.permitStatusChanges = new Map();
    this.documentVerificationStatusMap = new Map();
    this.documentVerificationHistoryMap = new Map();
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

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values())
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
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

  async getAllDocuments(): Promise<Document[]> {
    return Array.from(this.documents.values())
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

  async getAllApiKeys(): Promise<ApiKey[]> {
    return Array.from(this.apiKeys.values())
      .filter(key => key.isActive);
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
      status: insertCertificate.status ?? "active",
      documentUrl: insertCertificate.documentUrl ?? null,
      qrCodeUrl: insertCertificate.qrCodeUrl ?? null,
      digitalSignature: insertCertificate.digitalSignature ?? null,
      isRevoked: insertCertificate.isRevoked ?? false,
      securityFeatures: insertCertificate.securityFeatures ?? null,
      motherMaidenName: insertCertificate.motherMaidenName ?? null,
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
      status: insertCertificate.status ?? "active",
      documentUrl: insertCertificate.documentUrl ?? null,
      qrCodeUrl: insertCertificate.qrCodeUrl ?? null,
      digitalSignature: insertCertificate.digitalSignature ?? null,
      isRevoked: insertCertificate.isRevoked ?? false,
      securityFeatures: insertCertificate.securityFeatures ?? null,
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
      status: insertPassport.status ?? "active",
      documentUrl: insertPassport.documentUrl ?? null,
      qrCodeUrl: insertPassport.qrCodeUrl ?? null,
      digitalSignature: insertPassport.digitalSignature ?? null,
      isRevoked: insertPassport.isRevoked ?? false,
      securityFeatures: insertPassport.securityFeatures ?? null,
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
      status: insertCertificate.status ?? "active",
      documentUrl: insertCertificate.documentUrl ?? null,
      qrCodeUrl: insertCertificate.qrCodeUrl ?? null,
      digitalSignature: insertCertificate.digitalSignature ?? null,
      isRevoked: insertCertificate.isRevoked ?? false,
      securityFeatures: insertCertificate.securityFeatures ?? null,
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
      status: insertPermit.status ?? "active",
      documentUrl: insertPermit.documentUrl ?? null,
      qrCodeUrl: insertPermit.qrCodeUrl ?? null,
      digitalSignature: insertPermit.digitalSignature ?? null,
      isRevoked: insertPermit.isRevoked ?? false,
      securityFeatures: insertPermit.securityFeatures ?? null,
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
      status: insertVisa.status ?? "active",
      documentUrl: insertVisa.documentUrl ?? null,
      qrCodeUrl: insertVisa.qrCodeUrl ?? null,
      digitalSignature: insertVisa.digitalSignature ?? null,
      isRevoked: insertVisa.isRevoked ?? false,
      securityFeatures: insertVisa.securityFeatures ?? null,
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
      status: insertCard.status ?? "active",
      documentUrl: insertCard.documentUrl ?? null,
      qrCodeUrl: insertCard.qrCodeUrl ?? null,
      digitalSignature: insertCard.digitalSignature ?? null,
      isRevoked: insertCard.isRevoked ?? false,
      securityFeatures: insertCard.securityFeatures ?? null,
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

  // ===================== DHA INTEGRATION METHODS =====================

  // DHA Applicant methods
  async getDhaApplicant(id: string): Promise<DhaApplicant | undefined> {
    return this.dhaApplicants.get(id);
  }

  async getDhaApplicants(userId: string): Promise<DhaApplicant[]> {
    return Array.from(this.dhaApplicants.values())
      .filter(applicant => applicant.userId === userId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDhaApplicant(insertApplicant: InsertDhaApplicant): Promise<DhaApplicant> {
    const id = randomUUID();
    const applicant: DhaApplicant = {
      ...insertApplicant,
      id,
      isVerified: insertApplicant.isVerified ?? false,
      postalAddress: insertApplicant.postalAddress || null,
      idNumber: insertApplicant.idNumber || null,
      passportNumber: insertApplicant.passportNumber || null,
      previousPassportNumbers: insertApplicant.previousPassportNumbers || null,
      citizenshipAcquisitionDate: insertApplicant.citizenshipAcquisitionDate || null,
      citizenshipAcquisitionMethod: insertApplicant.citizenshipAcquisitionMethod || null,
      motherFullName: insertApplicant.motherFullName || null,
      motherMaidenName: insertApplicant.motherMaidenName || null,
      motherIdNumber: insertApplicant.motherIdNumber || null,
      fatherFullName: insertApplicant.fatherFullName || null,
      fatherIdNumber: insertApplicant.fatherIdNumber || null,
      biometricTemplates: insertApplicant.biometricTemplates || null,
      biometricQualityScores: insertApplicant.biometricQualityScores || null,
      photoUrl: insertApplicant.photoUrl || null,
      signatureUrl: insertApplicant.signatureUrl || null,
      verificationScore: insertApplicant.verificationScore || null,
      verificationNotes: insertApplicant.verificationNotes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.dhaApplicants.set(id, applicant);
    return applicant;
  }

  async updateDhaApplicant(id: string, updates: Partial<DhaApplicant>): Promise<void> {
    const applicant = this.dhaApplicants.get(id);
    if (applicant) {
      this.dhaApplicants.set(id, { ...applicant, ...updates, updatedAt: new Date() });
    }
  }

  // DHA Application methods
  async getDhaApplication(id: string): Promise<DhaApplication | undefined> {
    return this.dhaApplications.get(id);
  }

  async getDhaApplications(applicantId?: string, userId?: string): Promise<DhaApplication[]> {
    return Array.from(this.dhaApplications.values())
      .filter(application => {
        if (applicantId && application.applicantId !== applicantId) return false;
        if (userId && application.userId !== userId) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDhaApplication(insertApplication: InsertDhaApplication): Promise<DhaApplication> {
    const id = randomUUID();
    const application: DhaApplication = {
      ...insertApplication,
      id,
      currentState: insertApplication.currentState ?? "submitted",
      priorityLevel: insertApplication.priorityLevel ?? "normal",
      applicationSubtype: insertApplication.applicationSubtype || null,
      previousStates: insertApplication.previousStates || null,
      documentsSubmitted: insertApplication.documentsSubmitted || null,
      processingFee: insertApplication.processingFee || null,
      paymentStatus: insertApplication.paymentStatus || "pending",
      paymentReference: insertApplication.paymentReference || null,
      assignedOfficer: insertApplication.assignedOfficer || null,
      assignedOffice: insertApplication.assignedOffice || null,
      assignedDate: insertApplication.assignedDate || null,
      identityVerificationResult: insertApplication.identityVerificationResult || null,
      eligibilityCheckResult: insertApplication.eligibilityCheckResult || null,
      backgroundVerificationResult: insertApplication.backgroundVerificationResult || null,
      decisionStatus: insertApplication.decisionStatus || null,
      decisionDate: insertApplication.decisionDate || null,
      decisionReason: insertApplication.decisionReason || null,
      decisionNotes: insertApplication.decisionNotes || null,
      issuedDocumentNumber: insertApplication.issuedDocumentNumber || null,
      issuedDate: insertApplication.issuedDate || null,
      expiryDate: insertApplication.expiryDate || null,
      collectionMethod: insertApplication.collectionMethod || null,
      collectionOffice: insertApplication.collectionOffice || null,
      collectionDate: insertApplication.collectionDate || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.dhaApplications.set(id, application);
    return application;
  }

  async updateDhaApplication(id: string, updates: Partial<DhaApplication>): Promise<void> {
    const application = this.dhaApplications.get(id);
    if (application) {
      this.dhaApplications.set(id, { ...application, ...updates, updatedAt: new Date() });
    }
  }

  // DHA Verification methods
  async getDhaVerification(id: string): Promise<DhaVerification | undefined> {
    return this.dhaVerifications.get(id);
  }

  async getDhaVerifications(filters?: {
    applicantId?: string;
    applicationId?: string;
    verificationType?: string;
  }): Promise<DhaVerification[]> {
    return Array.from(this.dhaVerifications.values())
      .filter(verification => {
        if (filters?.applicantId && verification.applicantId !== filters.applicantId) return false;
        if (filters?.applicationId && verification.applicationId !== filters.applicationId) return false;
        if (filters?.verificationType && verification.verificationType !== filters.verificationType) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDhaVerification(insertVerification: InsertDhaVerification): Promise<DhaVerification> {
    const id = randomUUID();
    const verification: DhaVerification = {
      ...insertVerification,
      id,
      requestTimestamp: insertVerification.requestTimestamp ?? new Date(),
      retryCount: insertVerification.retryCount ?? 0,
      verificationMethod: insertVerification.verificationMethod || null,
      requestData: insertVerification.requestData || null,
      responseData: insertVerification.responseData || null,
      responseTimestamp: insertVerification.responseTimestamp || null,
      responseTime: insertVerification.responseTime || null,
      verificationResult: insertVerification.verificationResult || null,
      confidenceScore: insertVerification.confidenceScore || null,
      matchScore: insertVerification.matchScore || null,
      nprPersonId: insertVerification.nprPersonId || null,
      nprMatchLevel: insertVerification.nprMatchLevel || null,
      abisMatchId: insertVerification.abisMatchId || null,
      abisBiometricType: insertVerification.abisBiometricType || null,
      sapsReferenceNumber: insertVerification.sapsReferenceNumber || null,
      sapsClearanceStatus: insertVerification.sapsClearanceStatus || null,
      pkdCertificateStatus: insertVerification.pkdCertificateStatus || null,
      pkdIssuerCountry: insertVerification.pkdIssuerCountry || null,
      pkdCertificateSerial: insertVerification.pkdCertificateSerial || null,
      mrzValidationResult: insertVerification.mrzValidationResult || null,
      mrzParsedData: insertVerification.mrzParsedData || null,
      errorCode: insertVerification.errorCode || null,
      errorMessage: insertVerification.errorMessage || null,
      errorDetails: insertVerification.errorDetails || null,
      lastRetryAt: insertVerification.lastRetryAt || null,
      createdAt: new Date()
    };
    this.dhaVerifications.set(id, verification);
    return verification;
  }

  // DHA Audit Event methods
  async getDhaAuditEvents(filters?: {
    applicationId?: string;
    applicantId?: string;
    userId?: string;
    eventType?: string;
    limit?: number;
  }): Promise<DhaAuditEvent[]> {
    let events = Array.from(this.dhaAuditEvents.values())
      .filter(event => {
        if (filters?.applicationId && event.applicationId !== filters.applicationId) return false;
        if (filters?.applicantId && event.applicantId !== filters.applicantId) return false;
        if (filters?.userId && event.userId !== filters.userId) return false;
        if (filters?.eventType && event.eventType !== filters.eventType) return false;
        return true;
      })
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    if (filters?.limit) {
      events = events.slice(0, filters.limit);
    }

    return events;
  }

  async createDhaAuditEvent(insertEvent: InsertDhaAuditEvent): Promise<DhaAuditEvent> {
    const id = randomUUID();
    const event: DhaAuditEvent = {
      ...insertEvent,
      id,
      applicationId: insertEvent.applicationId || null,
      applicantId: insertEvent.applicantId || null,
      userId: insertEvent.userId || null,
      actorId: insertEvent.actorId || null,
      actorName: insertEvent.actorName || null,
      contextData: insertEvent.contextData || null,
      beforeState: insertEvent.beforeState || null,
      afterState: insertEvent.afterState || null,
      requestSource: insertEvent.requestSource || null,
      ipAddress: insertEvent.ipAddress || null,
      userAgent: insertEvent.userAgent || null,
      sessionId: insertEvent.sessionId || null,
      complianceFlags: insertEvent.complianceFlags || null,
      dataProcessingPurpose: insertEvent.dataProcessingPurpose || null,
      timestamp: insertEvent.timestamp || new Date()
    };
    this.dhaAuditEvents.set(id, event);
    return event;
  }

  // DHA Consent Record methods
  async getDhaConsentRecord(id: string): Promise<DhaConsentRecord | undefined> {
    return this.dhaConsentRecords.get(id);
  }

  async getDhaConsentRecords(applicantId: string): Promise<DhaConsentRecord[]> {
    return Array.from(this.dhaConsentRecords.values())
      .filter(record => record.applicantId === applicantId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDhaConsentRecord(insertRecord: InsertDhaConsentRecord): Promise<DhaConsentRecord> {
    const id = randomUUID();
    const record: DhaConsentRecord = {
      ...insertRecord,
      id,
      consentLanguage: insertRecord.consentLanguage ?? "en",
      consentStatus: insertRecord.consentStatus ?? "active",
      consentGivenAt: insertRecord.consentGivenAt ?? new Date(),
      popiaCompliant: insertRecord.popiaCompliant ?? true,
      dataSubjectNotified: insertRecord.dataSubjectNotified ?? false,
      applicationId: insertRecord.applicationId || null,
      consentScope: insertRecord.consentScope || null,
      lawfulnessAssessment: insertRecord.lawfulnessAssessment || null,
      consentExpiresAt: insertRecord.consentExpiresAt || null,
      consentWithdrawnAt: insertRecord.consentWithdrawnAt || null,
      consentEvidence: insertRecord.consentEvidence || null,
      consentWitness: insertRecord.consentWitness || null,
      dataSubjectRights: insertRecord.dataSubjectRights || null,
      withdrawalMethod: insertRecord.withdrawalMethod || null,
      processingStartDate: insertRecord.processingStartDate || null,
      processingEndDate: insertRecord.processingEndDate || null,
      dataRetentionPeriod: insertRecord.dataRetentionPeriod || null,
      complianceNotes: insertRecord.complianceNotes || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.dhaConsentRecords.set(id, record);
    return record;
  }

  async updateDhaConsentRecord(id: string, updates: Partial<DhaConsentRecord>): Promise<void> {
    const record = this.dhaConsentRecords.get(id);
    if (record) {
      this.dhaConsentRecords.set(id, { ...record, ...updates, updatedAt: new Date() });
    }
  }

  // DHA Background Check methods
  async getDhaBackgroundCheck(id: string): Promise<DhaBackgroundCheck | undefined> {
    return this.dhaBackgroundChecks.get(id);
  }

  async getDhaBackgroundChecks(filters?: {
    applicantId?: string;
    applicationId?: string;
    checkType?: string;
  }): Promise<DhaBackgroundCheck[]> {
    return Array.from(this.dhaBackgroundChecks.values())
      .filter(check => {
        if (filters?.applicantId && check.applicantId !== filters.applicantId) return false;
        if (filters?.applicationId && check.applicationId !== filters.applicationId) return false;
        if (filters?.checkType && check.checkType !== filters.checkType) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDhaBackgroundCheck(insertCheck: InsertDhaBackgroundCheck): Promise<DhaBackgroundCheck> {
    const id = randomUUID();
    const check: DhaBackgroundCheck = {
      ...insertCheck,
      id,
      requestDate: insertCheck.requestDate ?? new Date(),
      checkStatus: insertCheck.checkStatus ?? "pending",
      isExpired: insertCheck.isExpired ?? false,
      appealSubmitted: insertCheck.appealSubmitted ?? false,
      appealable: insertCheck.appealable ?? false,
      verificationId: insertCheck.verificationId || null,
      requestReason: insertCheck.requestReason ?? "background_verification",
      consentRecordId: insertCheck.consentRecordId || null,
      consentDate: insertCheck.consentDate || null,
      resultStatus: insertCheck.resultStatus || null,
      sapsPolicyNumber: insertCheck.sapsPolicyNumber || null,
      sapsResultCode: insertCheck.sapsResultCode || null,
      sapsResultDescription: insertCheck.sapsResultDescription || null,
      criminalRecords: insertCheck.criminalRecords || null,
      checkResults: insertCheck.checkResults || null,
      riskAssessment: insertCheck.riskAssessment || null,
      riskFactors: insertCheck.riskFactors || null,
      processingStartDate: insertCheck.processingStartDate || null,
      processingCompletedDate: insertCheck.processingCompletedDate || null,
      processingDuration: insertCheck.processingDuration || null,
      validFromDate: insertCheck.validFromDate || null,
      validUntilDate: insertCheck.validUntilDate || null,
      verifiedBy: insertCheck.verifiedBy || null,
      verificationDate: insertCheck.verificationDate || null,
      verificationNotes: insertCheck.verificationNotes || null,
      appealDeadline: insertCheck.appealDeadline || null,
      appealOutcome: insertCheck.appealOutcome || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.dhaBackgroundChecks.set(id, check);
    return check;
  }

  async updateDhaBackgroundCheck(id: string, updates: Partial<DhaBackgroundCheck>): Promise<void> {
    const check = this.dhaBackgroundChecks.get(id);
    if (check) {
      this.dhaBackgroundChecks.set(id, { ...check, ...updates, updatedAt: new Date() });
    }
  }

  // ===================== NOTIFICATION METHODS IMPLEMENTATION =====================

  // Notification Events
  async getNotifications(userId?: string, filters?: {
    category?: string;
    priority?: string;
    isRead?: boolean;
    isArchived?: boolean;
    requiresAction?: boolean;
    limit?: number;
    offset?: number;
  }): Promise<NotificationEvent[]> {
    const notifications = Array.from(this.notificationEvents.values())
      .filter(notification => {
        if (userId && notification.userId !== userId) return false;
        if (filters?.category && notification.category !== filters.category) return false;
        if (filters?.priority && notification.priority !== filters.priority) return false;
        if (typeof filters?.isRead === 'boolean' && notification.isRead !== filters.isRead) return false;
        if (typeof filters?.isArchived === 'boolean' && notification.isArchived !== filters.isArchived) return false;
        if (typeof filters?.requiresAction === 'boolean' && notification.requiresAction !== filters.requiresAction) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    // Apply pagination
    const offset = filters?.offset || 0;
    const limit = filters?.limit || 50;
    return notifications.slice(offset, offset + limit);
  }

  async getNotification(id: string): Promise<NotificationEvent | undefined> {
    return this.notificationEvents.get(id);
  }

  async createNotification(insertNotification: InsertNotificationEvent): Promise<NotificationEvent> {
    const id = randomUUID();
    const notification: NotificationEvent = {
      ...insertNotification,
      id,
      userId: insertNotification.userId || null,
      expiresAt: insertNotification.expiresAt || null,
      isRead: false,
      isArchived: false,
      payload: insertNotification.payload || null,
      requiresAction: insertNotification.requiresAction ?? false,
      actionData: insertNotification.actionData || null,
      actionUrl: insertNotification.actionUrl || null,
      createdBy: insertNotification.createdBy || null,
      metadata: insertNotification.metadata || null,
      relatedEntityType: insertNotification.relatedEntityType || null,
      relatedEntityId: insertNotification.relatedEntityId || null,
      createdAt: new Date(),
      deliveredAt: null,
      readAt: null
    };
    this.notificationEvents.set(id, notification);
    return notification;
  }

  async markNotificationAsRead(id: string): Promise<void> {
    const notification = this.notificationEvents.get(id);
    if (notification) {
      this.notificationEvents.set(id, { 
        ...notification, 
        isRead: true,
        readAt: new Date()
      });
    }
  }

  async markAllNotificationsAsRead(userId: string): Promise<void> {
    Array.from(this.notificationEvents.values())
      .filter(notification => notification.userId === userId && !notification.isRead)
      .forEach(notification => {
        this.notificationEvents.set(notification.id, {
          ...notification,
          isRead: true,
          readAt: new Date()
        });
      });
  }

  async archiveNotification(id: string): Promise<void> {
    const notification = this.notificationEvents.get(id);
    if (notification) {
      this.notificationEvents.set(id, { 
        ...notification, 
        isArchived: true 
      });
    }
  }

  async deleteNotification(id: string): Promise<void> {
    this.notificationEvents.delete(id);
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notificationEvents.values())
      .filter(notification => 
        notification.userId === userId && 
        !notification.isRead && 
        !notification.isArchived
      ).length;
  }

  // User Notification Preferences
  async getUserNotificationPreferences(userId: string): Promise<UserNotificationPreferences | undefined> {
    return Array.from(this.userNotificationPreferences.values())
      .find(pref => pref.userId === userId);
  }

  async createUserNotificationPreferences(insertPreferences: InsertUserNotificationPreferences): Promise<UserNotificationPreferences> {
    const id = randomUUID();
    const preferences: UserNotificationPreferences = {
      ...insertPreferences,
      id,
      emailNotifications: insertPreferences.emailNotifications ?? true,
      pushNotifications: insertPreferences.pushNotifications ?? false,
      smsNotifications: insertPreferences.smsNotifications ?? false,
      categories: insertPreferences.categories || null,
      quietHours: insertPreferences.quietHours || null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.userNotificationPreferences.set(id, preferences);
    return preferences;
  }

  async updateUserNotificationPreferences(userId: string, updates: Partial<UserNotificationPreferences>): Promise<void> {
    const existing = Array.from(this.userNotificationPreferences.values())
      .find(pref => pref.userId === userId);
    
    if (existing) {
      this.userNotificationPreferences.set(existing.id, {
        ...existing,
        ...updates,
        updatedAt: new Date()
      });
    }
  }

  // Status Updates
  async getStatusUpdates(filters?: {
    entityType?: string;
    entityId?: string;
    userId?: string;
    isPublic?: boolean;
    limit?: number;
  }): Promise<StatusUpdate[]> {
    const updates = Array.from(this.statusUpdates.values())
      .filter(update => {
        if (filters?.entityType && update.entityType !== filters.entityType) return false;
        if (filters?.entityId && update.entityId !== filters.entityId) return false;
        if (filters?.userId && update.userId !== filters.userId) return false;
        if (typeof filters?.isPublic === 'boolean' && update.isPublic !== filters.isPublic) return false;
        return true;
      })
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

    const limit = filters?.limit || 50;
    return updates.slice(0, limit);
  }

  async getLatestStatusUpdate(entityType: string, entityId: string): Promise<StatusUpdate | undefined> {
    return Array.from(this.statusUpdates.values())
      .filter(update => update.entityType === entityType && update.entityId === entityId)
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  }

  async createStatusUpdate(insertUpdate: InsertStatusUpdate): Promise<StatusUpdate> {
    const id = randomUUID();
    const update: StatusUpdate = {
      ...insertUpdate,
      id,
      userId: insertUpdate.userId || null,
      previousStatus: insertUpdate.previousStatus || null,
      updatedBy: insertUpdate.updatedBy || null,
      statusDetails: insertUpdate.statusDetails || null,
      progressPercentage: insertUpdate.progressPercentage || null,
      estimatedCompletion: insertUpdate.estimatedCompletion || null,
      isPublic: insertUpdate.isPublic ?? false,
      createdAt: new Date(),
    };
    this.statusUpdates.set(id, update);
    return update;
  }

  // WebSocket Sessions
  async getWebSocketSessions(userId?: string): Promise<WebSocketSession[]> {
    return Array.from(this.webSocketSessions.values())
      .filter(session => !userId || session.userId === userId)
      .sort((a, b) => b.lastSeen.getTime() - a.lastSeen.getTime());
  }

  async getWebSocketSession(socketId: string): Promise<WebSocketSession | undefined> {
    return Array.from(this.webSocketSessions.values())
      .find(session => session.socketId === socketId);
  }

  async createWebSocketSession(insertSession: InsertWebSocketSession): Promise<WebSocketSession> {
    const id = randomUUID();
    const session: WebSocketSession = {
      ...insertSession,
      id,
      isActive: true,
      ipAddress: insertSession.ipAddress || null,
      userAgent: insertSession.userAgent || null,
      sessionData: insertSession.sessionData || null,
      subscribedEvents: insertSession.subscribedEvents || null,
      lastSeen: insertSession.lastSeen || new Date(),
      createdAt: new Date(),
    };
    this.webSocketSessions.set(id, session);
    return session;
  }

  async updateWebSocketSession(id: string, updates: Partial<WebSocketSession>): Promise<void> {
    const session = this.webSocketSessions.get(id);
    if (session) {
      this.webSocketSessions.set(id, { ...session, ...updates });
    }
  }

  async deactivateWebSocketSession(socketId: string): Promise<void> {
    const session = Array.from(this.webSocketSessions.values())
      .find(s => s.socketId === socketId);
    
    if (session) {
      this.webSocketSessions.set(session.id, {
        ...session,
        isActive: false
      });
    }
  }

  async updateWebSocketLastSeen(socketId: string): Promise<void> {
    const session = Array.from(this.webSocketSessions.values())
      .find(s => s.socketId === socketId);
    
    if (session) {
      this.webSocketSessions.set(session.id, {
        ...session,
        lastSeen: new Date()
      });
    }
  }

  // Chat Sessions
  async getChatSessions(userId?: string, adminId?: string): Promise<ChatSession[]> {
    return Array.from(this.chatSessions.values())
      .filter(session => {
        if (userId && session.userId !== userId) return false;
        if (adminId && session.adminId !== adminId) return false;
        return true;
      })
      .sort((a, b) => b.lastMessageAt.getTime() - a.lastMessageAt.getTime());
  }

  async getChatSession(id: string): Promise<ChatSession | undefined> {
    return this.chatSessions.get(id);
  }

  async createChatSession(insertSession: InsertChatSession): Promise<ChatSession> {
    const id = randomUUID();
    const session: ChatSession = {
      ...insertSession,
      id,
      status: insertSession.status || 'active',
      metadata: insertSession.metadata || null,
      priority: insertSession.priority || 'normal',
      adminId: insertSession.adminId || null,
      sessionType: insertSession.sessionType || 'user',
      subject: insertSession.subject || null,
      lastMessageAt: insertSession.lastMessageAt || new Date(),
      closedAt: insertSession.closedAt || null,
      createdAt: new Date(),
    };
    this.chatSessions.set(id, session);
    return session;
  }

  async updateChatSession(id: string, updates: Partial<ChatSession>): Promise<void> {
    const session = this.chatSessions.get(id);
    if (session) {
      this.chatSessions.set(id, { ...session, ...updates });
    }
  }

  async assignChatSessionToAdmin(sessionId: string, adminId: string): Promise<void> {
    const session = this.chatSessions.get(sessionId);
    if (session) {
      this.chatSessions.set(sessionId, {
        ...session,
        adminId
      });
    }
  }

  async closeChatSession(sessionId: string): Promise<void> {
    const session = this.chatSessions.get(sessionId);
    if (session) {
      this.chatSessions.set(sessionId, {
        ...session,
        status: 'closed',
        closedAt: new Date()
      });
    }
  }

  // Chat Messages
  async getChatMessages(chatSessionId: string): Promise<ChatMessage[]> {
    return Array.from(this.chatMessages.values())
      .filter(message => message.chatSessionId === chatSessionId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createChatMessage(insertMessage: InsertChatMessage): Promise<ChatMessage> {
    const id = randomUUID();
    const message: ChatMessage = {
      ...insertMessage,
      id,
      metadata: insertMessage.metadata || null,
      isRead: insertMessage.isRead ?? false,
      messageType: insertMessage.messageType || 'text',
      readAt: null,
      editedAt: null,
      createdAt: new Date(),
    };
    this.chatMessages.set(id, message);
    
    // Update last message time in chat session
    const session = this.chatSessions.get(insertMessage.chatSessionId);
    if (session) {
      this.chatSessions.set(session.id, {
        ...session,
        lastMessageAt: new Date()
      });
    }
    
    return message;
  }

  async markChatMessageAsRead(messageId: string): Promise<void> {
    const message = this.chatMessages.get(messageId);
    if (message) {
      this.chatMessages.set(messageId, {
        ...message,
        isRead: true,
        readAt: new Date()
      });
    }
  }

  async markAllChatMessagesAsRead(chatSessionId: string, userId: string): Promise<void> {
    Array.from(this.chatMessages.values())
      .filter(message => 
        message.chatSessionId === chatSessionId && 
        message.senderId !== userId && 
        !message.isRead
      )
      .forEach(message => {
        this.chatMessages.set(message.id, {
          ...message,
          isRead: true,
          readAt: new Date()
        });
      });
  }

  // ===================== ENHANCED SECURITY MONITORING IMPLEMENTATIONS =====================

  // Audit Log methods
  async getAuditLogs(filters?: {
    userId?: string;
    action?: string;
    entityType?: string;
    entityId?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<AuditLog[]> {
    let logs = Array.from(this.auditLogs.values());

    if (filters) {
      logs = logs.filter(log => {
        if (filters.userId && log.userId !== filters.userId) return false;
        if (filters.action && log.action !== filters.action) return false;
        if (filters.entityType && log.entityType !== filters.entityType) return false;
        if (filters.entityId && log.entityId !== filters.entityId) return false;
        if (filters.startDate && log.createdAt < filters.startDate) return false;
        if (filters.endDate && log.createdAt > filters.endDate) return false;
        return true;
      });
    }

    const limit = filters?.limit || 100;
    return logs
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createAuditLog(insertAuditLog: InsertAuditLog): Promise<AuditLog> {
    const id = randomUUID();
    const auditLog: AuditLog = {
      ...insertAuditLog,
      id,
      userId: insertAuditLog.userId || null,
      ipAddress: insertAuditLog.ipAddress || null,
      userAgent: insertAuditLog.userAgent || null,
      location: insertAuditLog.location || null,
      riskScore: insertAuditLog.riskScore || null,
      sessionId: insertAuditLog.sessionId || null,
      entityType: insertAuditLog.entityType || null,
      entityId: insertAuditLog.entityId || null,
      actionDetails: insertAuditLog.actionDetails || null,
      metadata: insertAuditLog.metadata || null,
      complianceFlags: insertAuditLog.complianceFlags || null,
      createdAt: new Date()
    };
    this.auditLogs.set(id, auditLog);
    return auditLog;
  }

  async getAuditLogById(id: string): Promise<AuditLog | undefined> {
    return this.auditLogs.get(id);
  }

  // Security Incident methods
  async getSecurityIncidents(filters?: {
    status?: string;
    severity?: string;
    incidentType?: string;
    assignedTo?: string;
    limit?: number;
  }): Promise<SecurityIncident[]> {
    let incidents = Array.from(this.securityIncidents.values());

    if (filters) {
      incidents = incidents.filter(incident => {
        if (filters.status && incident.status !== filters.status) return false;
        if (filters.severity && incident.severity !== filters.severity) return false;
        if (filters.incidentType && incident.incidentType !== filters.incidentType) return false;
        if (filters.assignedTo && incident.assignedTo !== filters.assignedTo) return false;
        return true;
      });
    }

    const limit = filters?.limit || 50;
    return incidents
      .sort((a, b) => b.openedAt.getTime() - a.openedAt.getTime())
      .slice(0, limit);
  }

  async getSecurityIncident(id: string): Promise<SecurityIncident | undefined> {
    return this.securityIncidents.get(id);
  }

  async createSecurityIncident(insertIncident: InsertSecurityIncident): Promise<SecurityIncident> {
    const id = randomUUID();
    const incident: SecurityIncident = {
      ...insertIncident,
      id,
      status: insertIncident.status || 'open',
      resolvedAt: insertIncident.resolvedAt || null,
      riskAssessment: insertIncident.riskAssessment || null,
      closedAt: insertIncident.closedAt || null,
      affectedUsers: insertIncident.affectedUsers || null,
      investigationNotes: insertIncident.investigationNotes || null,
      containmentActions: insertIncident.containmentActions || null,
      assignedTo: insertIncident.assignedTo || null,
      resolution: insertIncident.resolution || null,
      lessonsLearned: insertIncident.lessonsLearned || null,
      openedAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.securityIncidents.set(id, incident);
    return incident;
  }

  async updateSecurityIncident(id: string, updates: Partial<SecurityIncident>): Promise<void> {
    const incident = this.securityIncidents.get(id);
    if (incident) {
      this.securityIncidents.set(id, {
        ...incident,
        ...updates,
        updatedAt: new Date()
      });
    }
  }

  async assignIncidentTo(incidentId: string, assignedTo: string): Promise<void> {
    await this.updateSecurityIncident(incidentId, { assignedTo });
  }

  async resolveIncident(incidentId: string, resolution: string, resolvedBy: string): Promise<void> {
    await this.updateSecurityIncident(incidentId, {
      status: 'resolved',
      resolution,
      resolvedAt: new Date()
    });
  }

  async closeIncident(incidentId: string, closedBy: string): Promise<void> {
    await this.updateSecurityIncident(incidentId, {
      status: 'closed',
      closedAt: new Date()
    });
  }

  // User Behavior Profile methods
  async getUserBehaviorProfile(userId: string): Promise<UserBehaviorProfile | undefined> {
    return Array.from(this.userBehaviorProfiles.values())
      .find(profile => profile.userId === userId);
  }

  async createUserBehaviorProfile(insertProfile: InsertUserBehaviorProfile): Promise<UserBehaviorProfile> {
    const id = randomUUID();
    const profile: UserBehaviorProfile = {
      ...insertProfile,
      id,
      riskFactors: insertProfile.riskFactors || null,
      typicalLocations: insertProfile.typicalLocations || null,
      typicalDevices: insertProfile.typicalDevices || null,
      typicalTimes: insertProfile.typicalTimes || null,
      loginPatterns: insertProfile.loginPatterns || null,
      documentPatterns: insertProfile.documentPatterns || null,
      baselineScore: insertProfile.baselineScore || 0,
      lastAnalyzed: new Date(),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.userBehaviorProfiles.set(id, profile);
    return profile;
  }

  async updateUserBehaviorProfile(userId: string, updates: Partial<UserBehaviorProfile>): Promise<void> {
    const profile = Array.from(this.userBehaviorProfiles.values())
      .find(p => p.userId === userId);
    
    if (profile) {
      this.userBehaviorProfiles.set(profile.id, {
        ...profile,
        ...updates,
        updatedAt: new Date()
      });
    }
  }

  async analyzeUserBehavior(userId: string): Promise<{
    riskScore: number;
    anomalies: string[];
    recommendations: string[];
  }> {
    // Simplified behavior analysis implementation
    const profile = await this.getUserBehaviorProfile(userId);
    const recentEvents = await this.getSecurityEvents(userId, 10);
    
    let riskScore = 0;
    const anomalies: string[] = [];
    const recommendations: string[] = [];

    if (!profile) {
      riskScore = 30;
      anomalies.push("No established behavior baseline");
      recommendations.push("Monitor user activity to establish baseline");
    }

    // Analyze recent security events
    const highSeverityEvents = recentEvents.filter(e => e.severity === 'high' || e.severity === 'critical');
    if (highSeverityEvents.length > 0) {
      riskScore += 40;
      anomalies.push("Recent high-severity security events");
      recommendations.push("Review recent security activities");
    }

    return { riskScore: Math.min(riskScore, 100), anomalies, recommendations };
  }

  // Security Rule methods
  async getSecurityRules(filters?: {
    category?: string;
    isActive?: boolean;
    ruleType?: string;
  }): Promise<SecurityRule[]> {
    let rules = Array.from(this.securityRules.values());

    if (filters) {
      rules = rules.filter(rule => {
        if (filters.category && rule.category !== filters.category) return false;
        if (typeof filters.isActive === 'boolean' && rule.isActive !== filters.isActive) return false;
        if (filters.ruleType && rule.ruleType !== filters.ruleType) return false;
        return true;
      });
    }

    return rules.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getSecurityRule(id: string): Promise<SecurityRule | undefined> {
    return this.securityRules.get(id);
  }

  async createSecurityRule(insertRule: InsertSecurityRule): Promise<SecurityRule> {
    const id = randomUUID();
    const rule: SecurityRule = {
      ...insertRule,
      id,
      isActive: insertRule.isActive ?? true,
      triggeredCount: 0,
      falsePositiveCount: 0,
      lastTriggered: insertRule.lastTriggered || null,
      effectivenessScore: insertRule.effectivenessScore || null,
      createdAt: new Date(),
      updatedAt: new Date()
    };
    this.securityRules.set(id, rule);
    return rule;
  }

  async updateSecurityRule(id: string, updates: Partial<SecurityRule>): Promise<void> {
    const rule = this.securityRules.get(id);
    if (rule) {
      this.securityRules.set(id, {
        ...rule,
        ...updates,
        updatedAt: new Date()
      });
    }
  }

  async activateSecurityRule(id: string): Promise<void> {
    await this.updateSecurityRule(id, { isActive: true });
  }

  async deactivateSecurityRule(id: string): Promise<void> {
    await this.updateSecurityRule(id, { isActive: false });
  }

  async incrementRuleTriggeredCount(id: string): Promise<void> {
    const rule = this.securityRules.get(id);
    if (rule) {
      await this.updateSecurityRule(id, {
        triggeredCount: (rule.triggeredCount || 0) + 1,
        lastTriggered: new Date()
      });
    }
  }

  // Compliance Event methods
  async getComplianceEvents(filters?: {
    regulation?: string;
    eventType?: string;
    dataSubjectId?: string;
    complianceStatus?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<ComplianceEvent[]> {
    let events = Array.from(this.complianceEvents.values());

    if (filters) {
      events = events.filter(event => {
        if (filters.regulation && event.regulation !== filters.regulation) return false;
        if (filters.eventType && event.eventType !== filters.eventType) return false;
        if (filters.dataSubjectId && event.dataSubjectId !== filters.dataSubjectId) return false;
        if (filters.complianceStatus && event.complianceStatus !== filters.complianceStatus) return false;
        if (filters.startDate && event.createdAt < filters.startDate) return false;
        if (filters.endDate && event.createdAt > filters.endDate) return false;
        return true;
      });
    }

    const limit = filters?.limit || 100;
    return events
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }

  async createComplianceEvent(insertEvent: InsertComplianceEvent): Promise<ComplianceEvent> {
    const id = randomUUID();
    const event: ComplianceEvent = {
      ...insertEvent,
      id,
      userId: insertEvent.userId || null,
      dataRetentionPeriod: insertEvent.dataRetentionPeriod || null,
      dataSubjectId: insertEvent.dataSubjectId || null,
      reviewNotes: insertEvent.reviewNotes || null,
      reviewedBy: insertEvent.reviewedBy || null,
      reviewedAt: insertEvent.reviewedAt || null,
      createdAt: new Date()
    };
    this.complianceEvents.set(id, event);
    return event;
  }

  async getComplianceEvent(id: string): Promise<ComplianceEvent | undefined> {
    return this.complianceEvents.get(id);
  }

  async updateComplianceEventStatus(id: string, status: string, reviewNotes?: string, reviewedBy?: string): Promise<void> {
    const event = this.complianceEvents.get(id);
    if (event) {
      this.complianceEvents.set(id, {
        ...event,
        complianceStatus: status,
        reviewNotes: reviewNotes || null,
        reviewedBy: reviewedBy || null,
        reviewedAt: reviewedBy ? new Date() : null
      });
    }
  }

  async getComplianceReport(regulation: string, startDate: Date, endDate: Date): Promise<{
    totalEvents: number;
    compliantEvents: number;
    nonCompliantEvents: number;
    eventsByType: Record<string, number>;
    dataByCategory: Record<string, number>;
  }> {
    const events = await this.getComplianceEvents({
      regulation,
      startDate,
      endDate
    });

    const compliantEvents = events.filter(e => e.complianceStatus === 'compliant').length;
    const nonCompliantEvents = events.filter(e => e.complianceStatus === 'non_compliant').length;

    const eventsByType: Record<string, number> = {};
    const dataByCategory: Record<string, number> = {};

    events.forEach(event => {
      eventsByType[event.eventType] = (eventsByType[event.eventType] || 0) + 1;
      dataByCategory[event.dataCategory] = (dataByCategory[event.dataCategory] || 0) + 1;
    });

    return {
      totalEvents: events.length,
      compliantEvents,
      nonCompliantEvents,
      eventsByType,
      dataByCategory
    };
  }

  // Security Metrics methods
  async getSecurityMetrics(filters?: {
    metricName?: string;
    timeWindow?: string;
    startDate?: Date;
    endDate?: Date;
    limit?: number;
  }): Promise<SecurityMetric[]> {
    let metrics = Array.from(this.securityMetricsStorage.values());

    if (filters) {
      metrics = metrics.filter(metric => {
        if (filters.metricName && metric.metricName !== filters.metricName) return false;
        if (filters.timeWindow && metric.timeWindow !== filters.timeWindow) return false;
        if (filters.startDate && metric.calculatedAt < filters.startDate) return false;
        if (filters.endDate && metric.calculatedAt > filters.endDate) return false;
        return true;
      });
    }

    const limit = filters?.limit || 100;
    return metrics
      .sort((a, b) => b.calculatedAt.getTime() - a.calculatedAt.getTime())
      .slice(0, limit);
  }

  async createSecurityMetric(insertMetric: InsertSecurityMetric): Promise<SecurityMetric> {
    const id = randomUUID();
    const metric: SecurityMetric = {
      ...insertMetric,
      id,
      dimensions: insertMetric.dimensions || null,
      threshold: insertMetric.threshold || null,
      isAlert: insertMetric.isAlert ?? false,
      calculatedAt: new Date(),
      createdAt: new Date()
    };
    this.securityMetricsStorage.set(id, metric);
    return metric;
  }

  async getLatestSecurityMetrics(metricNames: string[]): Promise<SecurityMetric[]> {
    const results: SecurityMetric[] = [];
    
    for (const metricName of metricNames) {
      const metrics = await this.getSecurityMetrics({ metricName, limit: 1 });
      if (metrics.length > 0) {
        results.push(metrics[0]);
      }
    }
    
    return results;
  }

  async getSecurityMetricTrends(metricName: string, timeWindow: string, periods: number): Promise<SecurityMetric[]> {
    const metrics = await this.getSecurityMetrics({ metricName, timeWindow, limit: periods });
    return metrics.slice(0, periods);
  }

  // ===================== REFUGEE DOCUMENT METHODS =====================
  
  async getRefugeeDocument(id: string): Promise<RefugeeDocument | undefined> {
    return this.refugeeDocuments.get(id);
  }

  async getRefugeeDocuments(userId?: string): Promise<RefugeeDocument[]> {
    let docs = Array.from(this.refugeeDocuments.values());
    if (userId) {
      docs = docs.filter(doc => doc.userId === userId);
    }
    return docs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createRefugeeDocument(document: InsertRefugeeDocument): Promise<RefugeeDocument> {
    const id = randomUUID();
    const refugeeDoc: RefugeeDocument = {
      ...document,
      id,
      unhcrNumber: document.unhcrNumber || null,
      campLocation: document.campLocation || null,
      dependents: document.dependents || null,
      permitNumber: document.permitNumber || null,
      permitExpiryDate: document.permitExpiryDate || null,
      maroonPassportNumber: document.maroonPassportNumber || null,
      integrationStatus: document.integrationStatus || null,
      biometricCaptured: document.biometricCaptured ?? false,
      verificationStatus: document.verificationStatus || 'pending',
      createdAt: new Date(),
      updatedAt: null
    };
    this.refugeeDocuments.set(id, refugeeDoc);
    return refugeeDoc;
  }

  async updateRefugeeDocument(id: string, updates: Partial<RefugeeDocument>): Promise<void> {
    const doc = this.refugeeDocuments.get(id);
    if (doc) {
      const updated = { ...doc, ...updates, updatedAt: new Date() };
      this.refugeeDocuments.set(id, updated);
    }
  }

  // ===================== DIPLOMATIC PASSPORT METHODS =====================
  
  async getDiplomaticPassport(id: string): Promise<DiplomaticPassport | undefined> {
    return this.diplomaticPassports.get(id);
  }

  async getDiplomaticPassports(userId?: string): Promise<DiplomaticPassport[]> {
    let passports = Array.from(this.diplomaticPassports.values());
    if (userId) {
      passports = passports.filter(p => p.userId === userId);
    }
    return passports.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDiplomaticPassport(passport: InsertDiplomaticPassport): Promise<DiplomaticPassport> {
    const id = randomUUID();
    const dipPassport: DiplomaticPassport = {
      ...passport,
      id,
      passportNumber: passport.passportNumber || null,
      consulate: passport.consulate || null,
      viennaConventionCompliant: passport.viennaConventionCompliant ?? true,
      specialClearance: passport.specialClearance || null,
      issueDate: passport.issueDate || null,
      expiryDate: passport.expiryDate || null,
      previousDiplomaticPassports: passport.previousDiplomaticPassports || null,
      emergencyContactEmbassy: passport.emergencyContactEmbassy || null,
      status: passport.status || 'pending',
      createdAt: new Date()
    };
    this.diplomaticPassports.set(id, dipPassport);
    return dipPassport;
  }

  async updateDiplomaticPassport(id: string, updates: Partial<DiplomaticPassport>): Promise<void> {
    const passport = this.diplomaticPassports.get(id);
    if (passport) {
      const updated = { ...passport, ...updates };
      this.diplomaticPassports.set(id, updated);
    }
  }

  // ===================== DOCUMENT DELIVERY METHODS =====================
  
  async getDocumentDelivery(id: string): Promise<DocumentDelivery | undefined> {
    return this.documentDelivery.get(id);
  }

  async getDocumentDeliveries(userId?: string): Promise<DocumentDelivery[]> {
    let deliveries = Array.from(this.documentDelivery.values());
    if (userId) {
      deliveries = deliveries.filter(d => d.userId === userId);
    }
    return deliveries.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDocumentDelivery(delivery: InsertDocumentDelivery): Promise<DocumentDelivery> {
    const id = randomUUID();
    const docDelivery: DocumentDelivery = {
      ...delivery,
      id,
      deliveryStatus: delivery.deliveryStatus || 'pending',
      collectionPoint: delivery.collectionPoint || null,
      courierTrackingNumber: delivery.courierTrackingNumber || null,
      deliveryAddress: delivery.deliveryAddress || null,
      printStatus: delivery.printStatus || 'queued',
      printQueuePosition: delivery.printQueuePosition || null,
      printedAt: delivery.printedAt || null,
      qualityCheckPassed: delivery.qualityCheckPassed || null,
      estimatedDeliveryDate: delivery.estimatedDeliveryDate || null,
      actualDeliveryDate: delivery.actualDeliveryDate || null,
      recipientName: delivery.recipientName || null,
      recipientIdNumber: delivery.recipientIdNumber || null,
      recipientSignature: delivery.recipientSignature || null,
      deliveryAttempts: delivery.deliveryAttempts || 0,
      collectionDateTime: delivery.collectionDateTime || null,
      proofOfDelivery: delivery.proofOfDelivery || null,
      returnReason: delivery.returnReason || null,
      notificationPreferences: delivery.notificationPreferences || null,
      deliveryNotes: delivery.deliveryNotes || null,
      createdAt: new Date(),
      updatedAt: null
    };
    this.documentDelivery.set(id, docDelivery);
    return docDelivery;
  }

  async updateDocumentDelivery(id: string, updates: Partial<DocumentDelivery>): Promise<void> {
    const delivery = this.documentDelivery.get(id);
    if (delivery) {
      const updated = { ...delivery, ...updates, updatedAt: new Date() };
      this.documentDelivery.set(id, updated);
    }
  }

  // ===================== VERIFICATION WORKFLOW METHODS =====================
  
  async getVerificationWorkflow(id: string): Promise<VerificationWorkflow | undefined> {
    return this.verificationWorkflow.get(id);
  }

  async getVerificationWorkflows(documentId?: string): Promise<VerificationWorkflow[]> {
    let workflows = Array.from(this.verificationWorkflow.values());
    if (documentId) {
      workflows = workflows.filter(w => w.documentId === documentId);
    }
    return workflows.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createVerificationWorkflow(workflow: InsertVerificationWorkflow): Promise<VerificationWorkflow> {
    const id = randomUUID();
    const verWorkflow: VerificationWorkflow = {
      ...workflow,
      id,
      rejectionReason: workflow.rejectionReason || null,
      updatedAt: workflow.updatedAt || null,
      applicationReviewStatus: workflow.applicationReviewStatus || null,
      documentVerificationStatus: workflow.documentVerificationStatus || null,
      supervisorReviewStatus: workflow.supervisorReviewStatus || null,
      managerApprovalStatus: workflow.managerApprovalStatus || null,
      dataValidationStatus: workflow.dataValidationStatus || null,
      complianceCheckStatus: workflow.complianceCheckStatus || null,
      auditReviewStatus: workflow.auditReviewStatus || null,
      riskAssessmentStatus: workflow.riskAssessmentStatus || null,
      priorityLevel: workflow.priorityLevel || null,
      escalationLevel: workflow.escalationLevel || null,
      processingDeadline: workflow.processingDeadline || null,
      actualProcessingTime: workflow.actualProcessingTime || null,
      slaMetStatus: workflow.slaMetStatus || null,
      processingNotes: workflow.processingNotes || null,
      automatedCheckResults: workflow.automatedCheckResults || null,
      manualCheckResults: workflow.manualCheckResults || null,
      exceptionFlags: workflow.exceptionFlags || null,
      exceptionResolution: workflow.exceptionResolution || null,
      processingErrors: workflow.processingErrors || null,
      retryCount: workflow.retryCount || null,
      lastRetryAt: workflow.lastRetryAt || null,
      nextActionRequired: workflow.nextActionRequired || null,
      processedBy: workflow.processedBy || null,
      processedAt: workflow.processedAt || null,
      processingStartTime: workflow.processingStartTime || null,
      processingEndTime: workflow.processingEndTime || null,
      estimatedCompletionTime: workflow.estimatedCompletionTime || null,
      actualCompletionTime: workflow.actualCompletionTime || null,
      createdAt: new Date()
    };
    this.verificationWorkflow.set(id, verWorkflow);
    return verWorkflow;
  }

  async updateVerificationWorkflow(id: string, updates: Partial<VerificationWorkflow>): Promise<void> {
    const workflow = this.verificationWorkflow.get(id);
    if (workflow) {
      const updated = { ...workflow, ...updates, updatedAt: new Date() };
      this.verificationWorkflow.set(id, updated);
    }
  }

  // ===================== DHA OFFICE METHODS =====================
  
  async getDhaOffice(id: string): Promise<DhaOffice | undefined> {
    return this.dhaOffices.get(id);
  }

  async getDhaOffices(province?: string): Promise<DhaOffice[]> {
    let offices = Array.from(this.dhaOffices.values());
    if (province) {
      offices = offices.filter(o => o.province === province);
    }
    return offices.sort((a, b) => a.officeName.localeCompare(b.officeName));
  }

  async createDhaOffice(office: InsertDhaOffice): Promise<DhaOffice> {
    const id = randomUUID();
    const dhaOffice: DhaOffice = {
      ...office,
      id,
      phoneNumber: office.phoneNumber || null,
      emailAddress: office.emailAddress || null,
      postalCode: office.postalCode || null,
      coordinates: office.coordinates || null,
      operatingHours: office.operatingHours || null,
      servicesOffered: office.servicesOffered || null,
      bankingDetails: office.bankingDetails || null,
      managedBy: office.managedBy || null,
      capacity: office.capacity || null,
      specialAccommodations: office.specialAccommodations || null,
      publicTransportAccess: office.publicTransportAccess || null,
      onlineBookingAvailable: office.onlineBookingAvailable ?? false,
      appointmentRequired: office.appointmentRequired ?? false,
      createdAt: new Date()
    };
    this.dhaOffices.set(id, dhaOffice);
    return dhaOffice;
  }

  async updateDhaOffice(id: string, updates: Partial<DhaOffice>): Promise<void> {
    const office = this.dhaOffices.get(id);
    if (office) {
      const updated = { ...office, ...updates, updatedAt: new Date() };
      this.dhaOffices.set(id, updated);
    }
  }

  // ===================== AMS CERTIFICATE METHODS =====================
  
  async getAmsCertificate(id: string): Promise<AmsCertificate | undefined> {
    return this.amsCertificates.get(id);
  }

  async getAmsCertificates(userId?: string, status?: string): Promise<AmsCertificate[]> {
    let certificates = Array.from(this.amsCertificates.values());
    if (userId) {
      certificates = certificates.filter(cert => cert.userId === userId);
    }
    if (status) {
      certificates = certificates.filter(cert => cert.status === status);
    }
    return certificates.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async getAmsCertificateByNumber(certificateNumber: string): Promise<AmsCertificate | undefined> {
    return Array.from(this.amsCertificates.values()).find(cert => cert.certificateNumber === certificateNumber);
  }

  async createAmsCertificate(certificate: InsertAmsCertificate): Promise<AmsCertificate> {
    const id = randomUUID();
    const amsCert: AmsCertificate = {
      ...certificate,
      id,
      certificateNumber: certificate.certificateNumber || `AMS-${randomUUID().substring(0, 8).toUpperCase()}`,
      unhcrNumber: certificate.unhcrNumber || null,
      asylumClaimNumber: certificate.asylumClaimNumber || null,
      status: certificate.status || 'pending_verification',
      issueDate: certificate.issueDate || null,
      expiryDate: certificate.expiryDate || null,
      verificationDate: certificate.verificationDate || null,
      verifiedBy: certificate.verifiedBy || null,
      rejectionReason: certificate.rejectionReason || null,
      suspensionReason: certificate.suspensionReason || null,
      revocationReason: certificate.revocationReason || null,
      documentUrl: certificate.documentUrl || null,
      qrCodeUrl: certificate.qrCodeUrl || null,
      digitalSignature: certificate.digitalSignature || null,
      biometricData: certificate.biometricData || null,
      endorsements: certificate.endorsements || null,
      restrictions: certificate.restrictions || null,
      renewalEligible: certificate.renewalEligible ?? false,
      renewalDate: certificate.renewalDate || null,
      previousCertificateId: certificate.previousCertificateId || null,
      metadata: certificate.metadata || null,
      createdAt: new Date(),
      updatedAt: null
    };
    this.amsCertificates.set(id, amsCert);
    return amsCert;
  }

  async updateAmsCertificate(id: string, updates: Partial<AmsCertificate>): Promise<void> {
    const cert = this.amsCertificates.get(id);
    if (cert) {
      const updated = { ...cert, ...updates, updatedAt: new Date() };
      this.amsCertificates.set(id, updated);
    }
  }

  async verifyAmsCertificate(id: string, verifiedBy: string): Promise<void> {
    const cert = this.amsCertificates.get(id);
    if (cert) {
      const updated = {
        ...cert,
        status: 'verified' as const,
        verificationDate: new Date(),
        verifiedBy,
        updatedAt: new Date()
      };
      this.amsCertificates.set(id, updated);
    }
  }

  async revokeAmsCertificate(id: string, reason: string): Promise<void> {
    const cert = this.amsCertificates.get(id);
    if (cert) {
      const updated = {
        ...cert,
        status: 'revoked' as const,
        revocationReason: reason,
        updatedAt: new Date()
      };
      this.amsCertificates.set(id, updated);
    }
  }

  async suspendAmsCertificate(id: string, reason: string): Promise<void> {
    const cert = this.amsCertificates.get(id);
    if (cert) {
      const updated = {
        ...cert,
        status: 'suspended' as const,
        suspensionReason: reason,
        updatedAt: new Date()
      };
      this.amsCertificates.set(id, updated);
    }
  }

  async renewAmsCertificate(id: string, newExpiryDate: Date): Promise<AmsCertificate> {
    const oldCert = this.amsCertificates.get(id);
    if (!oldCert) {
      throw new Error('Certificate not found');
    }
    
    const newCert = await this.createAmsCertificate({
      ...oldCert,
      id: undefined as any,
      certificateNumber: `AMS-${randomUUID().substring(0, 8).toUpperCase()}`,
      previousCertificateId: id,
      expiryDate: newExpiryDate,
      renewalDate: new Date(),
      status: 'verified',
      issueDate: new Date()
    });
    
    return newCert;
  }

  // ===================== PERMIT STATUS CHANGE METHODS =====================
  
  async getPermitStatusChanges(permitId: string): Promise<PermitStatusChange[]> {
    const changes = Array.from(this.permitStatusChanges.values())
      .filter(change => change.permitId === permitId);
    return changes.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createPermitStatusChange(change: InsertPermitStatusChange): Promise<PermitStatusChange> {
    const id = randomUUID();
    const statusChange: PermitStatusChange = {
      ...change,
      id,
      changeNotes: change.changeNotes || null,
      endorsementsAdded: change.endorsementsAdded || null,
      endorsementsRemoved: change.endorsementsRemoved || null,
      conditionsModified: change.conditionsModified || null,
      gracePeriodDays: change.gracePeriodDays || null,
      renewalStatus: change.renewalStatus || null,
      renewalDeadline: change.renewalDeadline || null,
      createdAt: new Date()
    };
    this.permitStatusChanges.set(id, statusChange);
    return statusChange;
  }

  async getLatestPermitStatus(permitId: string): Promise<PermitStatusChange | undefined> {
    const changes = await this.getPermitStatusChanges(permitId);
    return changes[0];
  }

  async updatePermitStatus(permitId: string, newStatus: string, changedBy: string, reason: string): Promise<PermitStatusChange> {
    // Get the current status
    const latestChange = await this.getLatestPermitStatus(permitId);
    const previousStatus = latestChange ? latestChange.newStatus : 'unknown';
    
    // Create new status change
    const statusChange = await this.createPermitStatusChange({
      permitId,
      permitType: latestChange?.permitType || 'work',
      previousStatus,
      newStatus,
      changedBy,
      changeReason: reason,
      effectiveDate: new Date()
    });
    
    return statusChange;
  }

  // ===================== DOCUMENT VERIFICATION STATUS METHODS =====================
  
  async getDocumentVerificationStatus(documentId: string): Promise<DocumentVerificationStatus | undefined> {
    return Array.from(this.documentVerificationStatusMap.values())
      .find(status => status.documentId === documentId);
  }

  async getDocumentVerificationStatuses(documentType?: string): Promise<DocumentVerificationStatus[]> {
    let statuses = Array.from(this.documentVerificationStatusMap.values());
    if (documentType) {
      statuses = statuses.filter(status => status.documentType === documentType);
    }
    return statuses.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDocumentVerificationStatus(status: InsertDocumentVerificationStatus): Promise<DocumentVerificationStatus> {
    const id = randomUUID();
    const verStatus: DocumentVerificationStatus = {
      ...status,
      id,
      previousStatus: status.previousStatus || null,
      statusChangeReason: status.statusChangeReason || null,
      verificationScore: status.verificationScore || null,
      authenticityCheckPassed: status.authenticityCheckPassed || null,
      biometricCheckPassed: status.biometricCheckPassed || null,
      backgroundCheckPassed: status.backgroundCheckPassed || null,
      rejectionReasons: status.rejectionReasons || null,
      resubmissionAllowed: status.resubmissionAllowed ?? true,
      resubmissionCount: status.resubmissionCount || 0,
      qrCodeVerified: status.qrCodeVerified || null,
      qrCodeVerificationDate: status.qrCodeVerificationDate || null,
      estimatedCompletionDate: status.estimatedCompletionDate || null,
      actualCompletionDate: status.actualCompletionDate || null,
      notificationsSent: status.notificationsSent || null,
      updatedBy: status.updatedBy || null,
      createdAt: new Date(),
      updatedAt: null
    };
    this.documentVerificationStatusMap.set(id, verStatus);
    return verStatus;
  }

  async updateDocumentVerificationStatus(id: string, updates: Partial<DocumentVerificationStatus>): Promise<void> {
    const status = this.documentVerificationStatusMap.get(id);
    if (status) {
      const updated = { ...status, ...updates, updatedAt: new Date() };
      this.documentVerificationStatusMap.set(id, updated);
    }
  }

  async updateDocumentStatus(documentId: string, newStatus: string, updatedBy: string, reason?: string): Promise<void> {
    const status = await this.getDocumentVerificationStatus(documentId);
    if (status) {
      await this.updateDocumentVerificationStatus(status.id, {
        previousStatus: status.currentStatus,
        currentStatus: newStatus,
        statusChangeReason: reason || null,
        updatedBy,
        updatedAt: new Date()
      });
      
      // Create history entry
      await this.createDocumentVerificationHistory({
        documentId,
        documentType: status.documentType,
        action: 'status_change',
        previousValue: status.currentStatus,
        newValue: newStatus,
        actionBy: updatedBy,
        actionReason: reason || null,
        actionNotes: null,
        metadata: null,
        ipAddress: null,
        userAgent: null
      });
    }
  }

  // ===================== DOCUMENT VERIFICATION HISTORY METHODS =====================
  
  async getDocumentVerificationHistory(documentId: string): Promise<DocumentVerificationHistory[]> {
    const history = Array.from(this.documentVerificationHistoryMap.values())
      .filter(entry => entry.documentId === documentId);
    return history.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createDocumentVerificationHistory(history: InsertDocumentVerificationHistory): Promise<DocumentVerificationHistory> {
    const id = randomUUID();
    const historyEntry: DocumentVerificationHistory = {
      ...history,
      id,
      previousValue: history.previousValue || null,
      newValue: history.newValue || null,
      actionBy: history.actionBy || null,
      actionReason: history.actionReason || null,
      actionNotes: history.actionNotes || null,
      metadata: history.metadata || null,
      ipAddress: history.ipAddress || null,
      userAgent: history.userAgent || null,
      createdAt: new Date()
    };
    this.documentVerificationHistoryMap.set(id, historyEntry);
    return historyEntry;
  }

  async getVerificationHistoryByType(documentType: string, limit: number = 100): Promise<DocumentVerificationHistory[]> {
    const history = Array.from(this.documentVerificationHistoryMap.values())
      .filter(entry => entry.documentType === documentType);
    return history
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .slice(0, limit);
  }
}

export const storage = new MemStorage();
