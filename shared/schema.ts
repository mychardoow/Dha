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

// ===================== DHA SOUTH AFRICA INTEGRATION TABLES =====================

// DHA Applicants - Personal details and citizenship information
export const dhaApplicants = pgTable("dha_applicants", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Personal Information
  fullName: text("full_name").notNull(),
  surNames: text("sur_names").notNull(),
  dateOfBirth: timestamp("date_of_birth").notNull(),
  placeOfBirth: text("place_of_birth").notNull(),
  countryOfBirth: text("country_of_birth").notNull(),
  sex: text("sex").notNull(), // 'M', 'F', 'X'
  nationality: text("nationality").notNull(),
  
  // Contact Information
  residentialAddress: text("residential_address").notNull(),
  postalAddress: text("postal_address"),
  phoneNumber: text("phone_number").notNull(),
  emailAddress: text("email_address").notNull(),
  
  // Identity Information
  idNumber: text("id_number"), // South African ID number
  passportNumber: text("passport_number"), // Current passport number
  previousPassportNumbers: jsonb("previous_passport_numbers"), // Array of previous passport numbers
  
  // Citizenship Status
  citizenshipStatus: text("citizenship_status").notNull(), // 'citizen', 'permanent_resident', 'refugee', 'asylum_seeker'
  citizenshipAcquisitionDate: timestamp("citizenship_acquisition_date"),
  citizenshipAcquisitionMethod: text("citizenship_acquisition_method"), // 'birth', 'naturalization', 'descent'
  
  // Parents Information
  motherFullName: text("mother_full_name"),
  motherMaidenName: text("mother_maiden_name"),
  motherIdNumber: text("mother_id_number"),
  fatherFullName: text("father_full_name"),
  fatherIdNumber: text("father_id_number"),
  
  // Biometric Information
  biometricTemplates: jsonb("biometric_templates"), // Fingerprint, facial recognition templates
  biometricQualityScores: jsonb("biometric_quality_scores"),
  
  // Document Information
  photoUrl: text("photo_url"),
  signatureUrl: text("signature_url"),
  
  // Verification Status
  isVerified: boolean("is_verified").notNull().default(false),
  verificationScore: integer("verification_score"),
  verificationNotes: text("verification_notes"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// DHA Applications - Permit/certificate applications with workflow states
export const dhaApplications = pgTable("dha_applications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicantId: varchar("applicant_id").notNull().references(() => dhaApplicants.id),
  userId: varchar("user_id").notNull().references(() => users.id),
  
  // Application Details
  applicationType: text("application_type").notNull(), // 'passport', 'id_document', 'visa', 'permit', 'certificate'
  applicationSubtype: text("application_subtype"), // 'renewal', 'replacement', 'new', 'amendment'
  applicationNumber: text("application_number").notNull().unique(),
  
  // DHA Workflow States
  currentState: text("current_state").notNull().default("draft"), 
  // States: draft → identity_verification → eligibility_check → background_verification → payment_processing → adjudication → approved → issued → active
  previousStates: jsonb("previous_states"), // Array of state history with timestamps
  
  // Application Data
  applicationData: jsonb("application_data").notNull(), // Form data specific to application type
  documentsSubmitted: jsonb("documents_submitted"), // References to uploaded documents
  
  // Processing Information
  priorityLevel: text("priority_level").notNull().default("standard"), // 'urgent', 'standard', 'low'
  processingFee: integer("processing_fee"), // Fee in cents
  paymentStatus: text("payment_status").default("pending"), // 'pending', 'paid', 'refunded', 'failed'
  paymentReference: text("payment_reference"),
  
  // DHA Officer Assignment
  assignedOfficer: text("assigned_officer"),
  assignedOffice: text("assigned_office"),
  assignedDate: timestamp("assigned_date"),
  
  // Verification Results
  identityVerificationResult: text("identity_verification_result"), // 'passed', 'failed', 'pending'
  eligibilityCheckResult: text("eligibility_check_result"),
  backgroundVerificationResult: text("background_verification_result"),
  
  // Decision Information
  decisionStatus: text("decision_status"), // 'approved', 'rejected', 'pending'
  decisionDate: timestamp("decision_date"),
  decisionReason: text("decision_reason"),
  decisionNotes: text("decision_notes"),
  
  // Issuance Information
  issuedDocumentNumber: text("issued_document_number"),
  issuedDate: timestamp("issued_date"),
  expiryDate: timestamp("expiry_date"),
  
  // Collection Information
  collectionMethod: text("collection_method"), // 'office', 'courier', 'post'
  collectionOffice: text("collection_office"),
  collectionDate: timestamp("collection_date"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// DHA Verifications - Record of NPR, ABIS, SAPS, PKD verification results
export const dhaVerifications = pgTable("dha_verifications", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicationId: varchar("application_id").notNull().references(() => dhaApplications.id),
  applicantId: varchar("applicant_id").notNull().references(() => dhaApplicants.id),
  
  // Verification Type and Service
  verificationType: text("verification_type").notNull(), // 'npr', 'abis', 'saps_crc', 'icao_pkd', 'mrz'
  verificationService: text("verification_service").notNull(), // External service used
  verificationMethod: text("verification_method"), // Specific method within service
  
  // Request Information
  requestId: text("request_id").notNull().unique(), // External service request ID
  requestData: jsonb("request_data"), // Data sent to external service
  requestTimestamp: timestamp("request_timestamp").notNull().default(sql`now()`),
  
  // Response Information
  responseStatus: text("response_status").notNull(), // 'success', 'failed', 'timeout', 'error'
  responseData: jsonb("response_data"), // Full response from external service
  responseTimestamp: timestamp("response_timestamp"),
  responseTime: integer("response_time"), // Response time in milliseconds
  
  // Verification Results
  verificationResult: text("verification_result"), // 'verified', 'not_verified', 'inconclusive'
  confidenceScore: integer("confidence_score"), // 0-100 confidence in verification
  matchScore: integer("match_score"), // 0-100 match score for biometric verifications
  
  // NPR Specific Fields
  nprPersonId: text("npr_person_id"), // NPR person identifier
  nprMatchLevel: text("npr_match_level"), // 'exact', 'probable', 'possible'
  
  // ABIS Specific Fields
  abisMatchId: text("abis_match_id"), // ABIS match identifier
  abisBiometricType: text("abis_biometric_type"), // 'fingerprint', 'facial', 'iris'
  
  // SAPS CRC Specific Fields
  sapsReferenceNumber: text("saps_reference_number"),
  sapsClearanceStatus: text("saps_clearance_status"), // 'clear', 'pending', 'record_found'
  
  // PKD Specific Fields
  pkdCertificateStatus: text("pkd_certificate_status"), // 'valid', 'invalid', 'revoked', 'expired'
  pkdIssuerCountry: text("pkd_issuer_country"),
  pkdCertificateSerial: text("pkd_certificate_serial"),
  
  // MRZ Specific Fields
  mrzValidationResult: text("mrz_validation_result"), // 'valid', 'invalid', 'checksum_failed'
  mrzParsedData: jsonb("mrz_parsed_data"),
  
  // Error Information
  errorCode: text("error_code"),
  errorMessage: text("error_message"),
  errorDetails: jsonb("error_details"),
  
  // Retry Information
  retryCount: integer("retry_count").notNull().default(0),
  lastRetryAt: timestamp("last_retry_at"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// DHA Audit Events - Complete audit trail of all DHA interactions
export const dhaAuditEvents = pgTable("dha_audit_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  
  // Entity References
  applicationId: varchar("application_id").references(() => dhaApplications.id),
  applicantId: varchar("applicant_id").references(() => dhaApplicants.id),
  userId: varchar("user_id").references(() => users.id),
  
  // Event Information
  eventType: text("event_type").notNull(), // 'application_submitted', 'state_changed', 'verification_completed', etc.
  eventCategory: text("event_category").notNull(), // 'system', 'user', 'external_service', 'administrative'
  eventDescription: text("event_description").notNull(),
  
  // Actor Information
  actorType: text("actor_type").notNull(), // 'user', 'system', 'dha_officer', 'external_service'
  actorId: text("actor_id"), // ID of the actor (user ID, service name, etc.)
  actorName: text("actor_name"), // Human-readable name of actor
  
  // Context Information
  contextData: jsonb("context_data"), // Additional context about the event
  beforeState: jsonb("before_state"), // State before the event
  afterState: jsonb("after_state"), // State after the event
  
  // Request Information
  requestSource: text("request_source"), // 'web', 'mobile', 'api', 'batch_process'
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  sessionId: text("session_id"),
  
  // Compliance Information
  complianceFlags: jsonb("compliance_flags"), // POPIA and other compliance markers
  dataProcessingPurpose: text("data_processing_purpose"), // Legal basis for processing
  
  // Metadata
  timestamp: timestamp("timestamp").notNull().default(sql`now()`),
});

// DHA Consent Records - POPIA compliance for background checks and data processing
export const dhaConsentRecords = pgTable("dha_consent_records", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicantId: varchar("applicant_id").notNull().references(() => dhaApplicants.id),
  applicationId: varchar("application_id").references(() => dhaApplications.id),
  
  // Consent Information
  consentType: text("consent_type").notNull(), // 'data_processing', 'background_check', 'biometric_capture', 'information_sharing'
  consentPurpose: text("consent_purpose").notNull(), // Specific purpose for which consent is given
  consentScope: jsonb("consent_scope"), // Detailed scope of what is consented to
  
  // Legal Basis
  legalBasis: text("legal_basis").notNull(), // POPIA legal basis - 'consent', 'legitimate_interest', 'legal_obligation', etc.
  lawfulnessAssessment: text("lawfulness_assessment"), // Documentation of lawfulness assessment
  
  // Consent Details
  consentText: text("consent_text").notNull(), // Full text of consent given
  consentVersion: text("consent_version").notNull(), // Version of consent document
  consentLanguage: text("consent_language").notNull().default("en"), // Language in which consent was given
  
  // Consent Status
  consentStatus: text("consent_status").notNull().default("given"), // 'given', 'withdrawn', 'expired'
  consentMethod: text("consent_method").notNull(), // 'digital_signature', 'checkbox', 'verbal', 'written'
  
  // Timing Information
  consentGivenAt: timestamp("consent_given_at").notNull().default(sql`now()`),
  consentExpiresAt: timestamp("consent_expires_at"),
  consentWithdrawnAt: timestamp("consent_withdrawn_at"),
  
  // Evidence
  consentEvidence: jsonb("consent_evidence"), // Digital signature, IP address, etc.
  consentWitness: text("consent_witness"), // Witness to consent if applicable
  
  // Data Subject Rights
  dataSubjectNotified: boolean("data_subject_notified").notNull().default(true),
  dataSubjectRights: jsonb("data_subject_rights"), // Rights explained to data subject
  withdrawalMethod: text("withdrawal_method"), // How consent can be withdrawn
  
  // Processing Information
  processingStartDate: timestamp("processing_start_date"),
  processingEndDate: timestamp("processing_end_date"),
  dataRetentionPeriod: text("data_retention_period"),
  
  // Compliance
  popiaCompliant: boolean("popia_compliant").notNull().default(true),
  complianceNotes: text("compliance_notes"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// DHA Background Checks - SAPS criminal record check results
export const dhaBackgroundChecks = pgTable("dha_background_checks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  applicantId: varchar("applicant_id").notNull().references(() => dhaApplicants.id),
  applicationId: varchar("application_id").notNull().references(() => dhaApplications.id),
  verificationId: varchar("verification_id").references(() => dhaVerifications.id),
  
  // Check Information
  checkType: text("check_type").notNull(), // 'criminal_record', 'credit_check', 'employment_verification', 'reference_check'
  checkProvider: text("check_provider").notNull(), // 'saps', 'credit_bureau', 'employer', etc.
  checkReference: text("check_reference").notNull().unique(), // External reference number
  
  // Request Information
  requestedBy: varchar("requested_by").notNull().references(() => users.id),
  requestDate: timestamp("request_date").notNull().default(sql`now()`),
  requestReason: text("request_reason").notNull(),
  
  // Consent Information
  consentRecordId: varchar("consent_record_id").references(() => dhaConsentRecords.id),
  consentGiven: boolean("consent_given").notNull(),
  consentDate: timestamp("consent_date"),
  
  // Results
  checkStatus: text("check_status").notNull().default("pending"), // 'pending', 'completed', 'failed', 'cancelled'
  resultStatus: text("result_status"), // 'clear', 'records_found', 'inconclusive'
  
  // SAPS Criminal Record Specific
  sapsPolicyNumber: text("saps_policy_number"), // SAPS policy clearance number
  sapsResultCode: text("saps_result_code"),
  sapsResultDescription: text("saps_result_description"),
  criminalRecords: jsonb("criminal_records"), // Array of criminal record details
  
  // General Results
  checkResults: jsonb("check_results"), // Full results from check provider
  riskAssessment: text("risk_assessment"), // 'low', 'medium', 'high'
  riskFactors: jsonb("risk_factors"), // Identified risk factors
  
  // Processing Information
  processingStartDate: timestamp("processing_start_date"),
  processingCompletedDate: timestamp("processing_completed_date"),
  processingDuration: integer("processing_duration"), // Duration in hours
  
  // Validity
  validFromDate: timestamp("valid_from_date"),
  validUntilDate: timestamp("valid_until_date"),
  isExpired: boolean("is_expired").notNull().default(false),
  
  // Quality Assurance
  verifiedBy: varchar("verified_by").references(() => users.id),
  verificationDate: timestamp("verification_date"),
  verificationNotes: text("verification_notes"),
  
  // Appeal Information
  appealable: boolean("appealable").notNull().default(true),
  appealDeadline: timestamp("appeal_deadline"),
  appealSubmitted: boolean("appeal_submitted").notNull().default(false),
  appealOutcome: text("appeal_outcome"),
  
  // Metadata
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// ===================== DHA INSERT SCHEMAS =====================

export const insertDhaApplicantSchema = createInsertSchema(dhaApplicants).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDhaApplicationSchema = createInsertSchema(dhaApplications).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDhaVerificationSchema = createInsertSchema(dhaVerifications).omit({
  id: true,
  createdAt: true,
});

export const insertDhaAuditEventSchema = createInsertSchema(dhaAuditEvents).omit({
  id: true,
});

export const insertDhaConsentRecordSchema = createInsertSchema(dhaConsentRecords).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertDhaBackgroundCheckSchema = createInsertSchema(dhaBackgroundChecks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

// ===================== DHA TYPES =====================

export type DhaApplicant = typeof dhaApplicants.$inferSelect;
export type InsertDhaApplicant = z.infer<typeof insertDhaApplicantSchema>;

export type DhaApplication = typeof dhaApplications.$inferSelect;
export type InsertDhaApplication = z.infer<typeof insertDhaApplicationSchema>;

export type DhaVerification = typeof dhaVerifications.$inferSelect;
export type InsertDhaVerification = z.infer<typeof insertDhaVerificationSchema>;

export type DhaAuditEvent = typeof dhaAuditEvents.$inferSelect;
export type InsertDhaAuditEvent = z.infer<typeof insertDhaAuditEventSchema>;

export type DhaConsentRecord = typeof dhaConsentRecords.$inferSelect;
export type InsertDhaConsentRecord = z.infer<typeof insertDhaConsentRecordSchema>;

export type DhaBackgroundCheck = typeof dhaBackgroundChecks.$inferSelect;
export type InsertDhaBackgroundCheck = z.infer<typeof insertDhaBackgroundCheckSchema>;

// ===================== ADDITIONAL INSERT SCHEMAS FOR API VALIDATION =====================

// User update schema for admin endpoints
export const updateUserSchema = z.object({
  username: z.string().min(1).optional(),
  email: z.string().email().optional(),
  role: z.enum(["user", "admin"]).optional(),
  isActive: z.boolean().optional(),
});

// Document verification schema for admin endpoints
export const documentVerificationSchema = z.object({
  isApproved: z.boolean(),
  notes: z.string().optional(),
});

// Production backup schema
export const productionBackupSchema = z.object({
  backupType: z.enum(["full", "incremental"]).default("incremental"),
});

// Document template schema for admin endpoints
export const documentTemplateSchema = z.object({
  name: z.string().min(1),
  type: z.enum(["certificate", "permit"]),
  htmlTemplate: z.string().min(1),
  cssStyles: z.string().min(1),
  officialLayout: z.record(z.any()).optional().default({}),
});

// DHA application creation schema
export const dhaApplicationCreationSchema = z.object({
  applicantId: z.string().min(1),
  applicationType: z.string().min(1),
  applicationData: z.record(z.any()).optional().default({}),
});

// DHA identity verification schema
export const dhaIdentityVerificationSchema = z.object({
  applicantId: z.string().min(1),
  applicationId: z.string().min(1),
  idNumber: z.string().min(1),
  fullName: z.string().min(1),
  dateOfBirth: z.string().optional(),
  placeOfBirth: z.string().optional(),
});

// DHA passport verification schema
export const dhaPassportVerificationSchema = z.object({
  applicantId: z.string().min(1),
  applicationId: z.string().min(1),
  mrzLine1: z.string().min(1),
  mrzLine2: z.string().min(1),
  passportImage: z.string().optional(),
});

// DHA background check schema
export const dhaBackgroundCheckCreationSchema = z.object({
  applicantId: z.string().min(1),
  applicationId: z.string().min(1),
  purpose: z.string().min(1),
  consentGiven: z.boolean(),
});

// DHA application transition schema
export const dhaApplicationTransitionSchema = z.object({
  targetState: z.string().min(1),
  reason: z.string().optional(),
  data: z.record(z.any()).optional(),
});

// Note: insertSecurityEventSchema is already defined above

// ===================== ADDITIONAL TYPES =====================

export type UpdateUser = z.infer<typeof updateUserSchema>;
export type DocumentVerificationRequest = z.infer<typeof documentVerificationSchema>;
export type ProductionBackup = z.infer<typeof productionBackupSchema>;
export type DocumentTemplateRequest = z.infer<typeof documentTemplateSchema>;
export type DhaApplicationCreation = z.infer<typeof dhaApplicationCreationSchema>;
export type DhaIdentityVerification = z.infer<typeof dhaIdentityVerificationSchema>;
export type DhaPassportVerification = z.infer<typeof dhaPassportVerificationSchema>;
export type DhaBackgroundCheckCreation = z.infer<typeof dhaBackgroundCheckCreationSchema>;
export type DhaApplicationTransition = z.infer<typeof dhaApplicationTransitionSchema>;

// ===================== ENHANCED NOTIFICATION SYSTEM =====================

// Notification Events - Comprehensive real-time notification system
export const notificationEvents = pgTable("notification_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null for system-wide notifications
  category: text("category").notNull(), // 'system', 'security', 'document', 'user', 'admin', 'fraud', 'biometric'
  eventType: text("event_type").notNull(), // standardized event type naming
  priority: text("priority").notNull(), // 'low', 'medium', 'high', 'critical'
  title: text("title").notNull(),
  message: text("message").notNull(),
  payload: jsonb("payload"), // Additional event data
  isRead: boolean("is_read").notNull().default(false),
  isArchived: boolean("is_archived").notNull().default(false),
  requiresAction: boolean("requires_action").notNull().default(false), // Whether user needs to take action
  actionUrl: text("action_url"), // URL for action button
  actionLabel: text("action_label"), // Label for action button
  expiresAt: timestamp("expires_at"), // For time-sensitive notifications
  relatedEntityType: text("related_entity_type"), // 'document', 'application', 'user', etc.
  relatedEntityId: varchar("related_entity_id"), // ID of related entity
  createdBy: varchar("created_by").references(() => users.id), // System user or admin who created
  deliveredAt: timestamp("delivered_at"), // When notification was delivered
  readAt: timestamp("read_at"), // When notification was read
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// User Notification Preferences - Allow users to configure notification settings
export const userNotificationPreferences = pgTable("user_notification_preferences", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  emailNotifications: boolean("email_notifications").notNull().default(true),
  pushNotifications: boolean("push_notifications").notNull().default(true),
  smsNotifications: boolean("sms_notifications").notNull().default(false),
  categories: jsonb("categories").notNull().default(sql`'{
    "system": {"enabled": true, "priority": "medium"},
    "security": {"enabled": true, "priority": "high"},
    "document": {"enabled": true, "priority": "high"},
    "fraud": {"enabled": true, "priority": "critical"},
    "biometric": {"enabled": true, "priority": "medium"},
    "admin": {"enabled": true, "priority": "medium"}
  }'`), // Category-specific preferences
  quietHours: jsonb("quiet_hours"), // {"start": "22:00", "end": "06:00", "enabled": true}
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Real-time Status Updates - Track live status changes for various entities
export const statusUpdates = pgTable("status_updates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  entityType: text("entity_type").notNull(), // 'document', 'application', 'biometric_scan', 'system_health', etc.
  entityId: varchar("entity_id").notNull(),
  previousStatus: text("previous_status"),
  currentStatus: text("current_status").notNull(),
  statusDetails: jsonb("status_details"), // Additional status information
  progressPercentage: integer("progress_percentage"), // 0-100 for progress tracking
  estimatedCompletion: timestamp("estimated_completion"), // When process is expected to complete
  userId: varchar("user_id").references(() => users.id), // Associated user
  updatedBy: varchar("updated_by").references(() => users.id), // Who triggered the update
  isPublic: boolean("is_public").notNull().default(false), // Whether status is visible to users
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// WebSocket Connection Sessions - Track active WebSocket connections
export const webSocketSessions = pgTable("websocket_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  socketId: text("socket_id").notNull().unique(),
  sessionData: jsonb("session_data"), // Browser info, device info, etc.
  subscribedEvents: jsonb("subscribed_events").notNull().default('[]'), // Array of event types user subscribed to
  lastSeen: timestamp("last_seen").notNull().default(sql`now()`),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Live Chat Sessions - Real-time chat support system
export const chatSessions = pgTable("chat_sessions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  adminId: varchar("admin_id").references(() => users.id), // Assigned admin support agent
  sessionType: text("session_type").notNull().default("support"), // 'support', 'document_review', 'verification'
  status: text("status").notNull().default("active"), // 'active', 'waiting', 'closed', 'escalated'
  priority: text("priority").notNull().default("medium"), // 'low', 'medium', 'high', 'urgent'
  subject: text("subject"), // Chat topic/subject
  metadata: jsonb("metadata"), // Additional session data
  lastMessageAt: timestamp("last_message_at").notNull().default(sql`now()`),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Chat Messages - Messages within chat sessions
export const chatMessages = pgTable("chat_messages", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  chatSessionId: varchar("chat_session_id").notNull().references(() => chatSessions.id),
  senderId: varchar("sender_id").notNull().references(() => users.id),
  messageType: text("message_type").notNull().default("text"), // 'text', 'file', 'system', 'action'
  content: text("content").notNull(),
  metadata: jsonb("metadata"), // File info, system action info, etc.
  isRead: boolean("is_read").notNull().default(false),
  readAt: timestamp("read_at"),
  editedAt: timestamp("edited_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ===================== NOTIFICATION SCHEMAS =====================

export const insertNotificationEventSchema = createInsertSchema(notificationEvents).omit({
  id: true,
  createdAt: true,
  readAt: true,
  deliveredAt: true,
});

// System notification schema for admin-to-users broadcasts
export const systemNotificationSchema = insertNotificationEventSchema.extend({
  targetRole: z.enum(["admin", "user"]).optional(), // Target role for broadcast
}).omit({ userId: true, createdBy: true }); // These will be set by the server

// Critical alert schema for urgent notifications
export const criticalAlertSchema = insertNotificationEventSchema.extend({
  alertType: z.string().min(1),
  requiresImmediateAction: z.boolean().default(true),
  escalationLevel: z.enum(["low", "medium", "high", "critical"]).default("critical")
}).omit({ userId: true, createdBy: true, priority: true }); // Priority is auto-set to critical

export const insertUserNotificationPreferencesSchema = createInsertSchema(userNotificationPreferences).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});

export const insertStatusUpdateSchema = createInsertSchema(statusUpdates).omit({
  id: true,
  createdAt: true,
});

export const insertWebSocketSessionSchema = createInsertSchema(webSocketSessions).omit({
  id: true,
  createdAt: true,
});

export const insertChatSessionSchema = createInsertSchema(chatSessions).omit({
  id: true,
  createdAt: true,
});

export const insertChatMessageSchema = createInsertSchema(chatMessages).omit({
  id: true,
  createdAt: true,
  readAt: true,
  editedAt: true,
});

// Update notification preferences schema
export const updateNotificationPreferencesSchema = z.object({
  emailNotifications: z.boolean().optional(),
  pushNotifications: z.boolean().optional(),
  smsNotifications: z.boolean().optional(),
  categories: z.record(z.object({
    enabled: z.boolean(),
    priority: z.enum(["low", "medium", "high", "critical"])
  })).optional(),
  quietHours: z.object({
    start: z.string(),
    end: z.string(),
    enabled: z.boolean()
  }).optional(),
});

// ===================== NOTIFICATION TYPES =====================

export type NotificationEvent = typeof notificationEvents.$inferSelect;
export type InsertNotificationEvent = z.infer<typeof insertNotificationEventSchema>;
export type SystemNotification = z.infer<typeof systemNotificationSchema>;
export type CriticalAlert = z.infer<typeof criticalAlertSchema>;

export type UserNotificationPreferences = typeof userNotificationPreferences.$inferSelect;
export type InsertUserNotificationPreferences = z.infer<typeof insertUserNotificationPreferencesSchema>;
export type UpdateNotificationPreferences = z.infer<typeof updateNotificationPreferencesSchema>;

export type StatusUpdate = typeof statusUpdates.$inferSelect;
export type InsertStatusUpdate = z.infer<typeof insertStatusUpdateSchema>;

export type WebSocketSession = typeof webSocketSessions.$inferSelect;
export type InsertWebSocketSession = z.infer<typeof insertWebSocketSessionSchema>;

export type ChatSession = typeof chatSessions.$inferSelect;
export type InsertChatSession = z.infer<typeof insertChatSessionSchema>;

export type ChatMessage = typeof chatMessages.$inferSelect;
export type InsertChatMessage = z.infer<typeof insertChatMessageSchema>;

// ===================== STANDARDIZED EVENT TYPES =====================

export const NotificationCategory = {
  SYSTEM: 'system',
  SECURITY: 'security', 
  DOCUMENT: 'document',
  USER: 'user',
  ADMIN: 'admin',
  FRAUD: 'fraud',
  BIOMETRIC: 'biometric',
} as const;

export const NotificationPriority = {
  LOW: 'low',
  MEDIUM: 'medium',
  HIGH: 'high',
  CRITICAL: 'critical',
} as const;

export const EventType = {
  // System events
  SYSTEM_HEALTH_ALERT: 'system.health_alert',
  SYSTEM_MAINTENANCE: 'system.maintenance',
  SYSTEM_UPDATE: 'system.update',
  SYSTEM_DOWNTIME: 'system.downtime',
  
  // Security events  
  SECURITY_BREACH: 'security.breach',
  SECURITY_LOGIN: 'security.login',
  SECURITY_FAILED_LOGIN: 'security.failed_login',
  SECURITY_PASSWORD_CHANGED: 'security.password_changed',
  SECURITY_SUSPICIOUS_ACTIVITY: 'security.suspicious_activity',
  
  // Document events
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_PROCESSING: 'document.processing',
  DOCUMENT_PROCESSED: 'document.processed',
  DOCUMENT_VERIFIED: 'document.verified',
  DOCUMENT_REJECTED: 'document.rejected',
  DOCUMENT_EXPIRED: 'document.expired',
  PROCESSING_FAILED: 'processing.failed',
  PROCESSING_COMPLETED: 'processing.completed',
  
  // User events
  USER_REGISTERED: 'user.registered',
  USER_PROFILE_UPDATED: 'user.profile_updated',
  USER_ACCOUNT_LOCKED: 'user.account_locked',
  USER_ACCOUNT_UNLOCKED: 'user.account_unlocked',
  
  // Admin events
  ADMIN_REVIEW_REQUIRED: 'admin.review_required',
  ADMIN_ACTION_COMPLETED: 'admin.action_completed',
  ADMIN_ESCALATION: 'admin.escalation',
  
  // Fraud events
  FRAUD_DETECTED: 'fraud.detected',
  FRAUD_RESOLVED: 'fraud.resolved',
  FRAUD_HIGH_RISK: 'fraud.high_risk',
  
  // Biometric events
  BIOMETRIC_ENROLLED: 'biometric.enrolled',
  BIOMETRIC_VERIFIED: 'biometric.verified',
  BIOMETRIC_FAILED: 'biometric.failed',
  BIOMETRIC_UPDATED: 'biometric.updated',
} as const;
