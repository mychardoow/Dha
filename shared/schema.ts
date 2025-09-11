import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"),
  isActive: boolean("is_active").notNull().default(true),
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
  severity: text("severity").notNull(), // 'low', 'medium', 'high'
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

export const quantumKeys = pgTable("quantum_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyId: text("key_id").notNull().unique(),
  algorithm: text("algorithm").notNull(),
  keyData: text("key_data").notNull(),
  entropy: integer("entropy").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const errorLogs = pgTable("error_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
  errorType: text("error_type").notNull(), // database, api, validation, authentication, etc.
  message: text("message").notNull(),
  stack: text("stack"),
  userId: varchar("user_id").references(() => users.id),
  requestUrl: text("request_url"),
  requestMethod: text("request_method"),
  statusCode: integer("status_code"),
  severity: text("severity").notNull(), // low, medium, high, critical
  context: jsonb("context"), // Additional error context
  environment: text("environment").notNull().default("development"),
  isResolved: boolean("is_resolved").notNull().default(false),
  resolvedBy: varchar("resolved_by").references(() => users.id),
  resolvedAt: timestamp("resolved_at"),
  userAgent: text("user_agent"),
  ipAddress: text("ip_address"),
  sessionId: text("session_id"),
  errorCount: integer("error_count").notNull().default(1), // For tracking repeated errors
});

export const biometricProfiles = pgTable("biometric_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'fingerprint', 'faceprint', 'voiceprint', etc.
  templateData: text("template_data").notNull(),
  quality: integer("quality").notNull(), // 0-100 quality score
  isVerified: boolean("is_verified").notNull().default(false),
  enrollmentDate: timestamp("enrollment_date").notNull().default(sql`now()`),
  lastUsed: timestamp("last_used"),
  isActive: boolean("is_active").notNull().default(true),
  metadata: jsonb("metadata"), // Additional biometric metadata
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const apiKeys = pgTable("api_keys", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  keyHash: text("key_hash").notNull().unique(),
  name: text("name").notNull(),
  userId: varchar("user_id").references(() => users.id),
  permissions: jsonb("permissions"), // JSON array of permissions
  isActive: boolean("is_active").notNull().default(true),
  expiresAt: timestamp("expires_at"),
  lastUsed: timestamp("last_used"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const certificates = pgTable("certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'completion', 'achievement', 'compliance', etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  templateType: text("template_type").notNull(), // References document template
  data: jsonb("data"), // Certificate-specific data
  serialNumber: text("serial_number").notNull().unique(),
  issuedAt: timestamp("issued_at").notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'expired'
  verificationCode: text("verification_code").notNull().unique(),
  qrCodeUrl: text("qr_code_url"),
  documentUrl: text("document_url"),
  digitalSignature: text("digital_signature"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const permits = pgTable("permits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  type: text("type").notNull(), // 'building', 'business', 'special_event', etc.
  title: text("title").notNull(),
  description: text("description").notNull(),
  templateType: text("template_type").notNull(), // References document template
  data: jsonb("data"), // Permit-specific data
  permitNumber: text("permit_number").notNull().unique(),
  issuedAt: timestamp("issued_at").notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at"),
  status: text("status").notNull().default("active"), // 'active', 'suspended', 'expired'
  verificationCode: text("verification_code").notNull().unique(),
  qrCodeUrl: text("qr_code_url"),
  documentUrl: text("document_url"),
  conditions: jsonb("conditions"), // Terms and conditions specific to permit
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

export const documentTemplates = pgTable("document_templates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  type: text("type").notNull(), // 'certificate', 'permit', 'birth_certificate', 'marriage_certificate', 'passport', 'death_certificate', 'work_permit', 'permanent_visa', 'id_card'
  htmlTemplate: text("html_template").notNull(),
  cssStyles: text("css_styles").notNull(),
  officialLayout: jsonb("official_layout"), // Layout configuration and styling options
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Birth Certificates
export const birthCertificates = pgTable("birth_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  fullName: text("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  placeOfBirth: text("place_of_birth").notNull(),
  motherFullName: text("mother_full_name").notNull(),
  motherMaidenName: text("mother_maiden_name"),
  fatherFullName: text("father_full_name").notNull(),
  registrationNumber: text("registration_number").notNull().unique(),
  registrationDate: timestamp("registration_date").notNull().default(sql`now()`),
  issuingAuthority: text("issuing_authority").notNull(),
  officialSeal: text("official_seal"), // Seal image data or reference
  watermarkData: text("watermark_data"), // Security watermark information
  verificationCode: text("verification_code").notNull().unique(),
  documentUrl: text("document_url"),
  qrCodeUrl: text("qr_code_url"),
  digitalSignature: text("digital_signature"),
  securityFeatures: jsonb("security_features"), // Additional security metadata
  status: text("status").notNull().default("active"), // 'active', 'amended', 'revoked'
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Marriage Certificates
export const marriageCertificates = pgTable("marriage_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  spouseOneFullName: text("spouse_one_full_name").notNull(),
  spouseOneDateOfBirth: timestamp("spouse_one_date_of_birth").notNull(),
  spouseOnePlaceOfBirth: text("spouse_one_place_of_birth").notNull(),
  spouseTwoFullName: text("spouse_two_full_name").notNull(),
  spouseTwoDateOfBirth: timestamp("spouse_two_date_of_birth").notNull(),
  spouseTwoPlaceOfBirth: text("spouse_two_place_of_birth").notNull(),
  marriageDate: timestamp("marriage_date").notNull(),
  marriagePlace: text("marriage_place").notNull(),
  witnessOneName: text("witness_one_name").notNull(),
  witnessTwoName: text("witness_two_name").notNull(),
  officiantName: text("officiant_name").notNull(),
  licenseNumber: text("license_number").notNull().unique(),
  registrationNumber: text("registration_number").notNull().unique(),
  issuingAuthority: text("issuing_authority").notNull(),
  officialSignatures: jsonb("official_signatures"), // Signatures data
  verificationCode: text("verification_code").notNull().unique(),
  documentUrl: text("document_url"),
  qrCodeUrl: text("qr_code_url"),
  digitalSignature: text("digital_signature"),
  securityFeatures: jsonb("security_features"),
  status: text("status").notNull().default("active"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Passports
export const passports = pgTable("passports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  passportNumber: text("passport_number").notNull().unique(),
  fullName: text("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  placeOfBirth: text("place_of_birth").notNull(),
  nationality: text("nationality").notNull(),
  sex: text("sex").notNull(),
  height: text("height"),
  eyeColor: text("eye_color"),
  issueDate: timestamp("issue_date").notNull().default(sql`now()`),
  expiryDate: timestamp("expiry_date").notNull(),
  issuingAuthority: text("issuing_authority").notNull(),
  placeOfIssue: text("place_of_issue").notNull(),
  photoUrl: text("photo_url"), // Passport photo reference
  signatureUrl: text("signature_url"), // Signature reference
  machineReadableZone: text("machine_readable_zone"), // MRZ data
  rfidChipData: text("rfid_chip_data"), // Simulated chip data
  verificationCode: text("verification_code").notNull().unique(),
  documentUrl: text("document_url"),
  qrCodeUrl: text("qr_code_url"),
  digitalSignature: text("digital_signature"),
  securityFeatures: jsonb("security_features"),
  status: text("status").notNull().default("active"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Death Certificates
export const deathCertificates = pgTable("death_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  deceasedFullName: text("deceased_full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  dateOfDeath: timestamp("date_of_death").notNull(),
  placeOfDeath: text("place_of_death").notNull(),
  causeOfDeath: text("cause_of_death").notNull(),
  mannerOfDeath: text("manner_of_death"), // natural, accident, suicide, homicide, undetermined
  certifyingPhysician: text("certifying_physician").notNull(),
  medicalExaminerSignature: text("medical_examiner_signature"),
  registrationNumber: text("registration_number").notNull().unique(),
  registrationDate: timestamp("registration_date").notNull().default(sql`now()`),
  issuingAuthority: text("issuing_authority").notNull(),
  informantName: text("informant_name"), // Person who reported death
  relationshipToDeceased: text("relationship_to_deceased"),
  verificationCode: text("verification_code").notNull().unique(),
  documentUrl: text("document_url"),
  qrCodeUrl: text("qr_code_url"),
  digitalSignature: text("digital_signature"),
  securityFeatures: jsonb("security_features"),
  status: text("status").notNull().default("active"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Work Permits
export const workPermits = pgTable("work_permits", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  employeeFullName: text("employee_full_name").notNull(),
  employeeNationality: text("employee_nationality").notNull(),
  employeePassportNumber: text("employee_passport_number").notNull(),
  employerName: text("employer_name").notNull(),
  employerAddress: text("employer_address").notNull(),
  jobTitle: text("job_title").notNull(),
  jobDescription: text("job_description"),
  workLocation: text("work_location").notNull(),
  permitNumber: text("permit_number").notNull().unique(),
  issueDate: timestamp("issue_date").notNull().default(sql`now()`),
  validFrom: timestamp("valid_from").notNull(),
  validUntil: timestamp("valid_until").notNull(),
  workRestrictions: jsonb("work_restrictions"), // Array of restrictions
  issuingAuthority: text("issuing_authority").notNull(),
  sponsorDetails: jsonb("sponsor_details"), // Sponsor information
  verificationCode: text("verification_code").notNull().unique(),
  documentUrl: text("document_url"),
  qrCodeUrl: text("qr_code_url"),
  digitalSignature: text("digital_signature"),
  securityFeatures: jsonb("security_features"),
  status: text("status").notNull().default("active"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Permanent Visas
export const permanentVisas = pgTable("permanent_visas", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  holderFullName: text("holder_full_name").notNull(),
  holderNationality: text("holder_nationality").notNull(),
  holderPassportNumber: text("holder_passport_number").notNull(),
  visaType: text("visa_type").notNull(), // family, employment, investment, refugee, etc.
  visaCategory: text("visa_category").notNull(),
  visaNumber: text("visa_number").notNull().unique(),
  issueDate: timestamp("issue_date").notNull().default(sql`now()`),
  validFrom: timestamp("valid_from").notNull(),
  expiryDate: timestamp("expiry_date"),
  countryOfIssue: text("country_of_issue").notNull(),
  issuingAuthority: text("issuing_authority").notNull(),
  portOfEntry: text("port_of_entry"),
  immigrationStamps: jsonb("immigration_stamps"), // Entry/exit stamps
  sponsorInformation: jsonb("sponsor_information"),
  photoUrl: text("photo_url"),
  fingerprintData: text("fingerprint_data"), // Biometric data reference
  verificationCode: text("verification_code").notNull().unique(),
  documentUrl: text("document_url"),
  qrCodeUrl: text("qr_code_url"),
  digitalSignature: text("digital_signature"),
  securityFeatures: jsonb("security_features"),
  status: text("status").notNull().default("active"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ID Cards
export const idCards = pgTable("id_cards", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  idNumber: text("id_number").notNull().unique(),
  fullName: text("full_name").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  placeOfBirth: text("place_of_birth").notNull(),
  sex: text("sex").notNull(),
  nationality: text("nationality").notNull(),
  address: text("address").notNull(),
  issueDate: timestamp("issue_date").notNull().default(sql`now()`),
  expiryDate: timestamp("expiry_date").notNull(),
  issuingAuthority: text("issuing_authority").notNull(),
  photoUrl: text("photo_url"),
  signatureUrl: text("signature_url"),
  rfidChipData: text("rfid_chip_data"), // Simulated chip data
  parentNames: text("parent_names"), // Combined parent information
  emergencyContact: jsonb("emergency_contact"),
  verificationCode: text("verification_code").notNull().unique(),
  documentUrl: text("document_url"),
  qrCodeUrl: text("qr_code_url"),
  digitalSignature: text("digital_signature"),
  securityFeatures: jsonb("security_features"),
  status: text("status").notNull().default("active"),
  isRevoked: boolean("is_revoked").notNull().default(false),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Document Verification Audit Trail
export const documentVerifications = pgTable("document_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentType: text("document_type").notNull(), // 'birth_certificate', 'passport', etc.
  documentId: varchar("document_id").notNull(), // Reference to specific document
  verificationCode: text("verification_code").notNull(),
  verifierIpAddress: text("verifier_ip_address"),
  verifierUserAgent: text("verifier_user_agent"),
  verificationResult: text("verification_result").notNull(), // 'valid', 'invalid', 'expired', 'revoked'
  verificationDetails: jsonb("verification_details"), // Additional verification data
  verifiedAt: timestamp("verified_at").notNull().default(sql`now()`),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  password: true,
  role: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  userId: true,
  title: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  role: true,
  content: true,
  metadata: true,
});

export const insertDocumentSchema = createInsertSchema(documents).omit({
  id: true,
  createdAt: true,
});

export const insertSecurityEventSchema = createInsertSchema(securityEvents).omit({
  id: true,
  createdAt: true,
});

export const insertFraudAlertSchema = createInsertSchema(fraudAlerts).omit({
  id: true,
  createdAt: true,
  resolvedAt: true,
});

export const insertSystemMetricSchema = createInsertSchema(systemMetrics).omit({
  id: true,
});

export const insertQuantumKeySchema = createInsertSchema(quantumKeys).omit({
  id: true,
  createdAt: true,
});

export const insertErrorLogSchema = createInsertSchema(errorLogs).omit({
  id: true,
  timestamp: true,
  resolvedAt: true,
});

export const insertBiometricProfileSchema = createInsertSchema(biometricProfiles).omit({
  id: true,
  createdAt: true,
});

export const insertApiKeySchema = createInsertSchema(apiKeys).omit({
  id: true,
  createdAt: true,
});

export const insertCertificateSchema = createInsertSchema(certificates).omit({
  id: true,
  createdAt: true,
});

export const insertPermitSchema = createInsertSchema(permits).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentTemplateSchema = createInsertSchema(documentTemplates).omit({
  id: true,
  createdAt: true,
});

export const insertBirthCertificateSchema = createInsertSchema(birthCertificates).omit({
  id: true,
  createdAt: true,
});

export const insertMarriageCertificateSchema = createInsertSchema(marriageCertificates).omit({
  id: true,
  createdAt: true,
});

export const insertPassportSchema = createInsertSchema(passports).omit({
  id: true,
  createdAt: true,
});

export const insertDeathCertificateSchema = createInsertSchema(deathCertificates).omit({
  id: true,
  createdAt: true,
});

export const insertWorkPermitSchema = createInsertSchema(workPermits).omit({
  id: true,
  createdAt: true,
});

export const insertPermanentVisaSchema = createInsertSchema(permanentVisas).omit({
  id: true,
  createdAt: true,
});

export const insertIdCardSchema = createInsertSchema(idCards).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentVerificationSchema = createInsertSchema(documentVerifications).omit({
  id: true,
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Conversation = typeof conversations.$inferSelect;
export type InsertConversation = z.infer<typeof insertConversationSchema>;

export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;

export type Document = typeof documents.$inferSelect;
export type InsertDocument = z.infer<typeof insertDocumentSchema>;

export type SecurityEvent = typeof securityEvents.$inferSelect;
export type InsertSecurityEvent = z.infer<typeof insertSecurityEventSchema>;

export type FraudAlert = typeof fraudAlerts.$inferSelect;
export type InsertFraudAlert = z.infer<typeof insertFraudAlertSchema>;

export type SystemMetric = typeof systemMetrics.$inferSelect;
export type InsertSystemMetric = z.infer<typeof insertSystemMetricSchema>;

export type QuantumKey = typeof quantumKeys.$inferSelect;
export type InsertQuantumKey = z.infer<typeof insertQuantumKeySchema>;

export type ErrorLog = typeof errorLogs.$inferSelect;
export type InsertErrorLog = z.infer<typeof insertErrorLogSchema>;

export type BiometricProfile = typeof biometricProfiles.$inferSelect;
export type InsertBiometricProfile = z.infer<typeof insertBiometricProfileSchema>;

export type ApiKey = typeof apiKeys.$inferSelect;
export type InsertApiKey = z.infer<typeof insertApiKeySchema>;

export type Certificate = typeof certificates.$inferSelect;
export type InsertCertificate = z.infer<typeof insertCertificateSchema>;

export type Permit = typeof permits.$inferSelect;
export type InsertPermit = z.infer<typeof insertPermitSchema>;

export type DocumentTemplate = typeof documentTemplates.$inferSelect;
export type InsertDocumentTemplate = z.infer<typeof insertDocumentTemplateSchema>;

export type BirthCertificate = typeof birthCertificates.$inferSelect;
export type InsertBirthCertificate = z.infer<typeof insertBirthCertificateSchema>;

export type MarriageCertificate = typeof marriageCertificates.$inferSelect;
export type InsertMarriageCertificate = z.infer<typeof insertMarriageCertificateSchema>;

export type Passport = typeof passports.$inferSelect;
export type InsertPassport = z.infer<typeof insertPassportSchema>;

export type DeathCertificate = typeof deathCertificates.$inferSelect;
export type InsertDeathCertificate = z.infer<typeof insertDeathCertificateSchema>;

export type WorkPermit = typeof workPermits.$inferSelect;
export type InsertWorkPermit = z.infer<typeof insertWorkPermitSchema>;

export type PermanentVisa = typeof permanentVisas.$inferSelect;
export type InsertPermanentVisa = z.infer<typeof insertPermanentVisaSchema>;

export type IdCard = typeof idCards.$inferSelect;
export type InsertIdCard = z.infer<typeof insertIdCardSchema>;

export type DocumentVerification = typeof documentVerifications.$inferSelect;
export type InsertDocumentVerification = z.infer<typeof insertDocumentVerificationSchema>;
