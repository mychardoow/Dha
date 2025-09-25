import { sql } from "drizzle-orm";
import { pgTable, text, integer, real, varchar, timestamp, boolean, jsonb, decimal, check, serial } from "drizzle-orm/pg-core";
import { z } from "zod";

// ===================== POSTGRESQL COMPATIBLE SCHEMA =====================

// Type definitions for enum-like values
export type AuditAction = 'CREATE' | 'READ' | 'UPDATE' | 'DELETE' | 'LOGIN' | 'LOGOUT' | 'GENERATE_DOCUMENT' | 'VALIDATE_BIOMETRIC' | 'LOGIN_ATTEMPT' | 'LOGIN_SUCCESS' | 'LOGIN_FAILED' | 'PASSWORD_CHANGED' | 'DOCUMENT_UPLOADED' | 'DOCUMENT_DOWNLOADED' | 'DOCUMENT_VIEWED' | 'DOCUMENT_DELETED' | 'DOCUMENT_MODIFIED' | 'DOCUMENT_VERIFIED' | 'API_CALL' | 'DHA_API_CALL' | 'SAPS_API_CALL' | 'ICAO_API_CALL' | 'USER_CREATED' | 'USER_UPDATED';
export type ComplianceEventType = 'POPIA_CONSENT' | 'DATA_ACCESS' | 'DATA_EXPORT' | 'BIOMETRIC_CAPTURE' | 'DOCUMENT_GENERATION' | 'DATA_ACCESSED' | 'DATA_MODIFIED' | 'DATA_DELETED';
export type UserRole = 'user' | 'admin' | 'dha_officer' | 'manager' | 'super_admin' | 'raeesa_ultra';
export type DocumentType = 'smart_id_card' | 'identity_document_book' | 'south_african_passport' | 'birth_certificate';
export type ProcessingStatus = 'pending' | 'processing' | 'validated' | 'verified' | 'approved' | 'rejected' | 'issued';
export type AiBotMode = 'assistant' | 'agent' | 'security_bot' | 'intelligence' | 'command';
export type AiCommandStatus = 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled';

// Export constants for backwards compatibility
export const AuditAction = {
  CREATE: 'CREATE' as const,
  READ: 'READ' as const,
  UPDATE: 'UPDATE' as const,
  DELETE: 'DELETE' as const,
  LOGIN: 'LOGIN' as const,
  LOGOUT: 'LOGOUT' as const,
  GENERATE_DOCUMENT: 'GENERATE_DOCUMENT' as const,
  VALIDATE_BIOMETRIC: 'VALIDATE_BIOMETRIC' as const,
  LOGIN_ATTEMPT: 'LOGIN_ATTEMPT' as const,
  LOGIN_SUCCESS: 'LOGIN_SUCCESS' as const,
  LOGIN_FAILED: 'LOGIN_FAILED' as const,
  PASSWORD_CHANGED: 'PASSWORD_CHANGED' as const,
  DOCUMENT_UPLOADED: 'DOCUMENT_UPLOADED' as const,
  DOCUMENT_DOWNLOADED: 'DOCUMENT_DOWNLOADED' as const,
  DOCUMENT_VIEWED: 'DOCUMENT_VIEWED' as const,
  DOCUMENT_DELETED: 'DOCUMENT_DELETED' as const,
  DOCUMENT_MODIFIED: 'DOCUMENT_MODIFIED' as const,
  DOCUMENT_VERIFIED: 'DOCUMENT_VERIFIED' as const,
  API_CALL: 'API_CALL' as const,
  DHA_API_CALL: 'DHA_API_CALL' as const,
  SAPS_API_CALL: 'SAPS_API_CALL' as const,
  ICAO_API_CALL: 'ICAO_API_CALL' as const,
  USER_CREATED: 'USER_CREATED' as const,
  USER_UPDATED: 'USER_UPDATED' as const
} as const;

export const ComplianceEventType = {
  POPIA_CONSENT: 'POPIA_CONSENT' as const,
  DATA_ACCESS: 'DATA_ACCESS' as const,
  DATA_EXPORT: 'DATA_EXPORT' as const,
  BIOMETRIC_CAPTURE: 'BIOMETRIC_CAPTURE' as const,
  DOCUMENT_GENERATION: 'DOCUMENT_GENERATION' as const,
  DATA_ACCESSED: 'DATA_ACCESSED' as const,
  DATA_MODIFIED: 'DATA_MODIFIED' as const,
  DATA_DELETED: 'DATA_DELETED' as const
} as const;

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"),
  hashedPassword: text("hashed_password"),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
  mustChangePassword: boolean("must_change_password").default(false),

  // Account lockout fields for brute force protection
  failedAttempts: integer("failed_attempts").notNull().default(0),
  lockedUntil: text("locked_until"),
  lastFailedAttempt: text("last_failed_attempt"),

  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const conversations = pgTable("conversations", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  title: text("title").notNull(),
  lastMessageAt: timestamp("last_message_at").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const messages = pgTable("messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
  role: text("role").notNull(), // 'user' or 'assistant'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // For storing additional data like context used
  attachments: jsonb("attachments"), // For storing document attachments with OCR data
  aiContext: jsonb("ai_context"), // AI-specific context like extracted fields, suggestions
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const documents = pgTable("documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  filename: text("filename").notNull(),
  originalName: text("original_name").notNull(),
  mimeType: text("mime_type").notNull(),
  size: integer("size").notNull(),
  storagePath: text("storage_path").notNull(),
  encryptionKey: text("encryption_key"),
  isEncrypted: boolean("is_encrypted").notNull().default(false),
  processingStatus: text("processing_status").notNull().default("pending"),
  ocrText: text("ocr_text"),
  ocrConfidence: integer("ocr_confidence"),
  isVerified: boolean("is_verified"),
  verificationScore: integer("verification_score"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const securityEvents = pgTable("security_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  severity: text("severity").notNull().default("medium"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const fraudAlerts = pgTable("fraud_alerts", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  alertType: text("alert_type").notNull(),
  riskScore: integer("risk_score").notNull(),
  details: jsonb("details"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const systemMetrics = pgTable("system_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricType: text("metric_type").notNull(),
  value: integer("value").notNull(),
  unit: text("unit").notNull(),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  action: text("action").notNull(),
  entityType: text("entity_type"),
  entityId: varchar("entity_id"),
  previousState: jsonb("previous_state"),
  newState: jsonb("new_state"),
  actionDetails: jsonb("action_details"),
  outcome: text("outcome"),
  details: jsonb("details"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  riskScore: integer("risk_score"),
  complianceFlags: jsonb("compliance_flags"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const complianceEvents = pgTable("compliance_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id),
  eventType: text("event_type").notNull(),
  dataSubjectId: varchar("data_subject_id"),
  dataCategory: text("data_category"),
  processingPurpose: text("processing_purpose"),
  legalBasis: text("legal_basis"),
  processingDetails: jsonb("processing_details"),
  complianceStatus: text("compliance_status"),
  details: jsonb("details"),
  complianceFlags: jsonb("compliance_flags"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const userBehaviorProfiles = pgTable("user_behavior_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  typicalLocations: jsonb("typical_locations"),
  typicalDevices: jsonb("typical_devices"),
  typicalTimes: jsonb("typical_times"),
  loginPatterns: jsonb("login_patterns"),
  documentPatterns: jsonb("document_patterns"),
  riskFactors: jsonb("risk_factors"),
  baselineScore: integer("baseline_score"),
  lastAnalyzed: timestamp("last_analyzed"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ===================== AI BOT SESSION SCHEMAS =====================

export const aiBotSessions = pgTable("ai_bot_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  aiMode: text("ai_mode").notNull(), // 'assistant' | 'agent' | 'security_bot' | 'intelligence' | 'command'
  sessionActive: boolean("session_active").notNull().default(true),
  unlimitedCapabilities: boolean("unlimited_capabilities").notNull().default(false),
  militaryGradeAccess: boolean("military_grade_access").notNull().default(false),
  censorshipDisabled: boolean("censorship_disabled").notNull().default(false),
  resourceLimits: jsonb("resource_limits"),
  currentTask: text("current_task"),
  sessionMetadata: jsonb("session_metadata"),
  lastActivity: timestamp("last_activity").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const aiCommandInterfaces = pgTable("ai_command_interfaces", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  sessionId: varchar("session_id").notNull().references(() => aiBotSessions.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  command: text("command").notNull(),
  commandType: text("command_type").notNull(), // matches aiMode
  executionStatus: text("execution_status").notNull().default("pending"), // 'pending' | 'processing' | 'completed' | 'failed' | 'cancelled'
  unlimitedMode: boolean("unlimited_mode").notNull().default(false),
  censorshipBypassed: boolean("censorship_bypassed").notNull().default(false),
  complexityScore: integer("complexity_score"),
  resourcesUsed: jsonb("resources_used"),
  executionResults: jsonb("execution_results"),
  errorDetails: jsonb("error_details"),
  processingTime: integer("processing_time"), // milliseconds
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  completedAt: timestamp("completed_at"),
});

// Type exports
export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = typeof conversations.$inferInsert;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = typeof messages.$inferInsert;
export type Document = typeof documents.$inferSelect;
export type InsertDocument = typeof documents.$inferInsert;
export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = typeof securityEvents.$inferInsert;
export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = typeof fraudAlerts.$inferInsert;
export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = typeof systemMetrics.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = typeof auditLogs.$inferInsert;
export type ComplianceEvent = typeof complianceEvents.$inferSelect;
export type InsertComplianceEvent = typeof complianceEvents.$inferInsert;
export type UserBehaviorProfile = typeof userBehaviorProfiles.$inferSelect;
export type InsertUserBehaviorProfile = typeof userBehaviorProfiles.$inferInsert;
export type AiBotSession = typeof aiBotSessions.$inferSelect;
export type InsertAiBotSession = typeof aiBotSessions.$inferInsert;
export type AiCommandInterface = typeof aiCommandInterfaces.$inferSelect;
export type InsertAiCommandInterface = typeof aiCommandInterfaces.$inferInsert;

// ===================== DOCUMENT GENERATION SCHEMAS =====================

// Extended Document Type enum for all 21 DHA document types
export type ExtendedDocumentType = 
  | 'smart_id_card'
  | 'identity_document_book'
  | 'temporary_id_certificate'
  | 'south_african_passport'
  | 'emergency_travel_certificate'
  | 'refugee_travel_document'
  | 'birth_certificate'
  | 'death_certificate'
  | 'marriage_certificate'
  | 'divorce_certificate'
  | 'general_work_visa'
  | 'critical_skills_work_visa'
  | 'intra_company_transfer_work_visa'
  | 'business_visa'
  | 'study_visa_permit'
  | 'visitor_visa'
  | 'medical_treatment_visa'
  | 'retired_person_visa'
  | 'exchange_visa'
  | 'relatives_visa'
  | 'permanent_residence_permit'
  | 'certificate_of_exemption'
  | 'certificate_of_south_african_citizenship';

// Base schema for all document generation requests
export const documentGenerationRequestSchema = z.object({
  documentType: z.enum([
    'smart_id_card',
    'identity_document_book',
    'temporary_id_certificate',
    'south_african_passport',
    'emergency_travel_certificate',
    'refugee_travel_document',
    'birth_certificate',
    'death_certificate',
    'marriage_certificate',
    'divorce_certificate',
    'general_work_visa',
    'critical_skills_work_visa',
    'intra_company_transfer_work_visa',
    'business_visa',
    'study_visa_permit',
    'visitor_visa',
    'medical_treatment_visa',
    'retired_person_visa',
    'exchange_visa',
    'relatives_visa',
    'permanent_residence_permit',
    'certificate_of_exemption',
    'certificate_of_south_african_citizenship'
  ] as const),
});

// Individual document schemas
export const smartIdCardSchema = documentGenerationRequestSchema.extend({
  fullName: z.string().min(1, "Full name is required"),
  identityNumber: z.string().min(13, "Valid SA ID number required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  sex: z.enum(['M', 'F']),
  nationality: z.string().default('South African'),
  countryOfBirth: z.string().default('South Africa'),
  status: z.string().default('Citizen'),
});

export const identityDocumentBookSchema = smartIdCardSchema.extend({
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  maritalStatus: z.enum(['Single', 'Married', 'Divorced', 'Widowed']),
  occupation: z.string().optional(),
});

export const temporaryIdCertificateSchema = smartIdCardSchema.extend({
  reasonForTemporary: z.string().min(1, "Reason for temporary certificate required"),
  validityPeriod: z.string().default('3 months'),
});

export const southAfricanPassportSchema = documentGenerationRequestSchema.extend({
  fullName: z.string().min(1, "Full name is required"),
  surname: z.string().min(1, "Surname is required"),
  givenNames: z.string().min(1, "Given names are required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  nationality: z.string().default('South African'),
  sex: z.enum(['M', 'F']),
  height: z.string().optional(),
  countryCode: z.string().default('ZAF'),
  passportType: z.enum(['P', 'D', 'S']).default('P'),
});

export const emergencyTravelCertificateSchema = southAfricanPassportSchema.extend({
  emergencyReason: z.string().min(1, "Emergency reason required"),
  destinationCountry: z.string().min(1, "Destination country required"),
  travelDate: z.string().min(1, "Travel date required"),
  validityPeriod: z.string().default('Single journey'),
});

export const refugeeTravelDocumentSchema = southAfricanPassportSchema.extend({
  refugeeNumber: z.string().min(1, "Refugee number required"),
  countryOfOrigin: z.string().min(1, "Country of origin required"),
  refugeeStatus: z.string().default('Recognized Refugee'),
});

export const birthCertificateSchema = documentGenerationRequestSchema.extend({
  childFullName: z.string().min(1, "Child's full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  sex: z.enum(['Male', 'Female']),
  fatherFullName: z.string().optional(),
  motherFullName: z.string().min(1, "Mother's name is required"),
  motherMaidenName: z.string().optional(),
  registrationNumber: z.string().optional(),
});

export const deathCertificateSchema = documentGenerationRequestSchema.extend({
  deceasedFullName: z.string().min(1, "Deceased's full name is required"),
  identityNumber: z.string().min(13, "Valid SA ID number required"),
  dateOfDeath: z.string().min(1, "Date of death is required"),
  placeOfDeath: z.string().min(1, "Place of death is required"),
  causeOfDeath: z.string().min(1, "Cause of death is required"),
  informantName: z.string().min(1, "Informant name is required"),
  informantRelation: z.string().min(1, "Informant relation is required"),
});

export const marriageCertificateSchema = documentGenerationRequestSchema.extend({
  groomFullName: z.string().min(1, "Groom's full name is required"),
  groomIdentityNumber: z.string().min(13, "Groom's ID number required"),
  brideFullName: z.string().min(1, "Bride's full name is required"),
  brideIdentityNumber: z.string().min(13, "Bride's ID number required"),
  marriageDate: z.string().min(1, "Marriage date is required"),
  marriagePlace: z.string().min(1, "Marriage place is required"),
  marriageOfficer: z.string().min(1, "Marriage officer name is required"),
  marriageType: z.enum(['Civil', 'Religious', 'Customary']).default('Civil'),
});

export const divorceCertificateSchema = documentGenerationRequestSchema.extend({
  husbandFullName: z.string().min(1, "Husband's full name is required"),
  wifeFullName: z.string().min(1, "Wife's full name is required"),
  divorceDate: z.string().min(1, "Divorce date is required"),
  divorcePlace: z.string().min(1, "Divorce place is required"),
  courtName: z.string().min(1, "Court name is required"),
  caseNumber: z.string().min(1, "Case number is required"),
});

// Visa schemas
export const generalWorkVisaSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  holderNationality: z.string().min(1, "Nationality is required"),
  holderPassportNumber: z.string().min(1, "Passport number is required"),
  employerName: z.string().min(1, "Employer name is required"),
  jobTitle: z.string().min(1, "Job title is required"),
  workLocation: z.string().min(1, "Work location is required"),
  contractDuration: z.string().min(1, "Contract duration is required"),
});

export const criticalSkillsWorkVisaSchema = generalWorkVisaSchema.extend({
  criticalSkill: z.string().min(1, "Critical skill is required"),
  qualificationLevel: z.string().min(1, "Qualification level is required"),
  workExperience: z.string().min(1, "Work experience is required"),
});

export const intraCompanyTransferWorkVisaSchema = generalWorkVisaSchema.extend({
  parentCompanyName: z.string().min(1, "Parent company name is required"),
  subsidiaryName: z.string().min(1, "Subsidiary name is required"),
  transferReason: z.string().min(1, "Transfer reason is required"),
});

export const businessVisaSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  holderNationality: z.string().min(1, "Nationality is required"),
  businessType: z.string().min(1, "Business type is required"),
  businessAddress: z.string().min(1, "Business address is required"),
  investmentAmount: z.string().min(1, "Investment amount is required"),
});

export const studyVisaPermitSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  holderNationality: z.string().min(1, "Nationality is required"),
  institutionName: z.string().min(1, "Institution name is required"),
  courseTitle: z.string().min(1, "Course title is required"),
  studyLevel: z.string().min(1, "Study level is required"),
  courseDuration: z.string().min(1, "Course duration is required"),
});

export const visitorVisaSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  holderNationality: z.string().min(1, "Nationality is required"),
  purposeOfVisit: z.string().min(1, "Purpose of visit is required"),
  durationOfStay: z.string().min(1, "Duration of stay is required"),
  accommodationAddress: z.string().min(1, "Accommodation address is required"),
});

export const medicalTreatmentVisaSchema = visitorVisaSchema.extend({
  medicalCondition: z.string().min(1, "Medical condition is required"),
  hospitalName: z.string().min(1, "Hospital name is required"),
  treatmentDuration: z.string().min(1, "Treatment duration is required"),
  doctorName: z.string().min(1, "Doctor name is required"),
});

export const retiredPersonVisaSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  holderNationality: z.string().min(1, "Nationality is required"),
  retirementDate: z.string().min(1, "Retirement date is required"),
  pensionAmount: z.string().min(1, "Pension amount is required"),
  accommodationProof: z.string().min(1, "Accommodation proof is required"),
});

export const exchangeVisaSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  holderNationality: z.string().min(1, "Nationality is required"),
  exchangeProgram: z.string().min(1, "Exchange program is required"),
  hostOrganization: z.string().min(1, "Host organization is required"),
  exchangeDuration: z.string().min(1, "Exchange duration is required"),
});

export const relativesVisaSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  holderNationality: z.string().min(1, "Nationality is required"),
  relativeName: z.string().min(1, "Relative's name is required"),
  relationshipType: z.string().min(1, "Relationship type is required"),
  relativeStatus: z.string().min(1, "Relative's status is required"),
});

export const permanentResidencePermitSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  holderNationality: z.string().min(1, "Nationality is required"),
  categoryType: z.string().min(1, "Category type is required"),
  applicationDate: z.string().min(1, "Application date is required"),
  approvalDate: z.string().min(1, "Approval date is required"),
});

export const certificateOfExemptionSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  exemptionType: z.string().min(1, "Exemption type is required"),
  exemptionReason: z.string().min(1, "Exemption reason is required"),
  validityPeriod: z.string().min(1, "Validity period is required"),
});

export const certificateOfSouthAfricanCitizenshipSchema = documentGenerationRequestSchema.extend({
  holderFullName: z.string().min(1, "Holder's full name is required"),
  dateOfBirth: z.string().min(1, "Date of birth is required"),
  placeOfBirth: z.string().min(1, "Place of birth is required"),
  citizenshipMethod: z.string().min(1, "Citizenship method is required"),
  certificateDate: z.string().min(1, "Certificate date is required"),
});

// Schema mapping for dynamic validation
export const documentTypeSchemas = {
  smart_id_card: smartIdCardSchema,
  identity_document_book: identityDocumentBookSchema,
  temporary_id_certificate: temporaryIdCertificateSchema,
  south_african_passport: southAfricanPassportSchema,
  emergency_travel_certificate: emergencyTravelCertificateSchema,
  refugee_travel_document: refugeeTravelDocumentSchema,
  birth_certificate: birthCertificateSchema,
  death_certificate: deathCertificateSchema,
  marriage_certificate: marriageCertificateSchema,
  divorce_certificate: divorceCertificateSchema,
  general_work_visa: generalWorkVisaSchema,
  critical_skills_work_visa: criticalSkillsWorkVisaSchema,
  intra_company_transfer_work_visa: intraCompanyTransferWorkVisaSchema,
  business_visa: businessVisaSchema,
  study_visa_permit: studyVisaPermitSchema,
  visitor_visa: visitorVisaSchema,
  medical_treatment_visa: medicalTreatmentVisaSchema,
  retired_person_visa: retiredPersonVisaSchema,
  exchange_visa: exchangeVisaSchema,
  relatives_visa: relativesVisaSchema,
  permanent_residence_permit: permanentResidencePermitSchema,
  certificate_of_exemption: certificateOfExemptionSchema,
  certificate_of_south_african_citizenship: certificateOfSouthAfricanCitizenshipSchema,
} as const;

// Type exports for all document types
export type DocumentGenerationRequest = z.infer<typeof documentGenerationRequestSchema>;
export type SmartIdCardData = z.infer<typeof smartIdCardSchema>;
export type IdentityDocumentBookData = z.infer<typeof identityDocumentBookSchema>;
export type TemporaryIdCertificateData = z.infer<typeof temporaryIdCertificateSchema>;
export type SouthAfricanPassportData = z.infer<typeof southAfricanPassportSchema>;
export type EmergencyTravelCertificateData = z.infer<typeof emergencyTravelCertificateSchema>;
export type RefugeeTravelDocumentData = z.infer<typeof refugeeTravelDocumentSchema>;
export type BirthCertificateData = z.infer<typeof birthCertificateSchema>;
export type DeathCertificateData = z.infer<typeof deathCertificateSchema>;
export type MarriageCertificateData = z.infer<typeof marriageCertificateSchema>;
export type DivorceCertificateData = z.infer<typeof divorceCertificateSchema>;
export type GeneralWorkVisaData = z.infer<typeof generalWorkVisaSchema>;
export type CriticalSkillsWorkVisaData = z.infer<typeof criticalSkillsWorkVisaSchema>;
export type IntraCompanyTransferWorkVisaData = z.infer<typeof intraCompanyTransferWorkVisaSchema>;
export type BusinessVisaData = z.infer<typeof businessVisaSchema>;
export type StudyVisaPermitData = z.infer<typeof studyVisaPermitSchema>;
export type VisitorVisaData = z.infer<typeof visitorVisaSchema>;
export type MedicalTreatmentVisaData = z.infer<typeof medicalTreatmentVisaSchema>;
export type RetiredPersonVisaData = z.infer<typeof retiredPersonVisaSchema>;
export type ExchangeVisaData = z.infer<typeof exchangeVisaSchema>;
export type RelativesVisaData = z.infer<typeof relativesVisaSchema>;
export type PermanentResidencePermitData = z.infer<typeof permanentResidencePermitSchema>;
export type CertificateOfExemptionData = z.infer<typeof certificateOfExemptionSchema>;
export type CertificateOfSouthAfricanCitizenshipData = z.infer<typeof certificateOfSouthAfricanCitizenshipSchema>;