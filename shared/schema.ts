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

// Refugee and Asylum Documentation Tables
export const refugeeDocuments = pgTable("refugee_documents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  documentType: text("document_type").notNull(), // 'section22_permit', 'asylum_permit', 'refugee_id', 'refugee_travel'
  unhcrNumber: text("unhcr_number"),
  countryOfOrigin: text("country_of_origin").notNull(),
  dateOfEntry: timestamp("date_of_entry").notNull(),
  campLocation: text("camp_location"),
  dependents: jsonb("dependents"), // Array of dependent information
  permitNumber: text("permit_number"),
  permitExpiryDate: timestamp("permit_expiry_date"),
  maroonPassportNumber: text("maroon_passport_number"),
  integrationStatus: text("integration_status"), // 'pending', 'approved', 'rejected'
  biometricCaptured: boolean("biometric_captured").notNull().default(false),
  verificationStatus: text("verification_status").notNull().default("pending"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at"),
});

// Diplomatic Passport Table
export const diplomaticPassports = pgTable("diplomatic_passports", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  passportNumber: text("passport_number").unique(),
  diplomaticNoteNumber: text("diplomatic_note_number").notNull(),
  embassy: text("embassy").notNull(),
  consulate: text("consulate"),
  diplomaticRank: text("diplomatic_rank").notNull(),
  immunityStatus: text("immunity_status").notNull(), // 'full', 'partial', 'none'
  viennaConventionCompliant: boolean("vienna_convention_compliant").notNull().default(true),
  specialClearance: jsonb("special_clearance"), // Security clearance details
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  countryOfAccreditation: text("country_of_accreditation").notNull(),
  previousDiplomaticPassports: jsonb("previous_diplomatic_passports"),
  emergencyContactEmbassy: text("emergency_contact_embassy"),
  status: text("status").notNull().default("pending"), // 'pending', 'approved', 'active', 'revoked'
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Document Delivery Tracking Table
export const documentDelivery = pgTable("document_delivery", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  documentType: text("document_type").notNull(),
  userId: varchar("user_id").notNull().references(() => users.id),
  deliveryMethod: text("delivery_method").notNull(), // 'collection', 'courier', 'registered_mail'
  collectionPoint: text("collection_point"), // DHA office location
  courierTrackingNumber: text("courier_tracking_number"),
  deliveryAddress: jsonb("delivery_address"),
  printStatus: text("print_status").notNull().default("queued"), // 'queued', 'printing', 'printed', 'quality_check', 'ready'
  printQueuePosition: integer("print_queue_position"),
  printedAt: timestamp("printed_at"),
  qualityCheckPassed: boolean("quality_check_passed"),
  estimatedDeliveryDate: timestamp("estimated_delivery_date"),
  actualDeliveryDate: timestamp("actual_delivery_date"),
  deliveryStatus: text("delivery_status").notNull().default("pending"), // 'pending', 'in_transit', 'delivered', 'failed'
  recipientName: text("recipient_name"),
  recipientIdNumber: text("recipient_id_number"),
  recipientSignature: text("recipient_signature"), // Base64 encoded signature
  notificationPreferences: jsonb("notification_preferences"), // SMS, Email preferences
  deliveryAttempts: integer("delivery_attempts").notNull().default(0),
  deliveryNotes: text("delivery_notes"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at"),
});

// AMS Certificate Table (Asylum Management System)
export const amsCertificates = pgTable("ams_certificates", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id),
  certificateNumber: text("certificate_number").unique(),
  certificateType: text("certificate_type").notNull(), // 'refugee_status', 'asylum_seeker', 'temporary_protection', 'permanent_protection'
  applicantName: text("applicant_name").notNull(),
  nationality: text("nationality").notNull(),
  unhcrNumber: text("unhcr_number"),
  asylumClaimNumber: text("asylum_claim_number"),
  status: text("status").notNull().default("pending_verification"), // 'pending_verification', 'verified', 'expired', 'revoked', 'suspended'
  issueDate: timestamp("issue_date"),
  expiryDate: timestamp("expiry_date"),
  verificationDate: timestamp("verification_date"),
  verifiedBy: varchar("verified_by").references(() => users.id),
  rejectionReason: text("rejection_reason"),
  suspensionReason: text("suspension_reason"),
  revocationReason: text("revocation_reason"),
  documentUrl: text("document_url"),
  qrCodeUrl: text("qr_code_url"),
  digitalSignature: text("digital_signature"),
  biometricData: jsonb("biometric_data"),
  endorsements: jsonb("endorsements"),
  restrictions: jsonb("restrictions"),
  renewalEligible: boolean("renewal_eligible").notNull().default(false),
  renewalDate: timestamp("renewal_date"),
  previousCertificateId: varchar("previous_certificate_id"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at"),
});

// Permit Status Change Table
export const permitStatusChanges = pgTable("permit_status_changes", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  permitId: varchar("permit_id").notNull(),
  permitType: text("permit_type").notNull(), // 'work', 'study', 'visitor', 'permanent_residence', 'refugee'
  previousStatus: text("previous_status").notNull(),
  newStatus: text("new_status").notNull(), // 'applied', 'processing', 'approved', 'rejected', 'issued', 'active', 'expired', 'renewed'
  changedBy: varchar("changed_by").notNull().references(() => users.id),
  changeReason: text("change_reason").notNull(),
  changeNotes: text("change_notes"),
  endorsementsAdded: jsonb("endorsements_added"),
  endorsementsRemoved: jsonb("endorsements_removed"),
  conditionsModified: jsonb("conditions_modified"),
  gracePeriodDays: integer("grace_period_days"),
  renewalStatus: text("renewal_status"), // 'eligible', 'pending', 'approved', 'rejected'
  renewalDeadline: timestamp("renewal_deadline"),
  effectiveDate: timestamp("effective_date").notNull(),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Document Verification Status Table
export const documentVerificationStatus = pgTable("document_verification_status", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  documentType: text("document_type").notNull(),
  currentStatus: text("current_status").notNull(), // 'submitted', 'validated', 'authenticated', 'approved', 'printed', 'delivered', 'rejected'
  previousStatus: text("previous_status"),
  statusChangeReason: text("status_change_reason"),
  verificationStage: text("verification_stage").notNull(), // 'initial', 'document_check', 'biometric_check', 'background_check', 'final_review'
  verificationScore: integer("verification_score"),
  authenticityCheckPassed: boolean("authenticity_check_passed"),
  biometricCheckPassed: boolean("biometric_check_passed"),
  backgroundCheckPassed: boolean("background_check_passed"),
  rejectionReasons: jsonb("rejection_reasons"),
  resubmissionAllowed: boolean("resubmission_allowed").notNull().default(true),
  resubmissionCount: integer("resubmission_count").notNull().default(0),
  qrCodeVerified: boolean("qr_code_verified"),
  qrCodeVerificationDate: timestamp("qr_code_verification_date"),
  estimatedCompletionDate: timestamp("estimated_completion_date"),
  actualCompletionDate: timestamp("actual_completion_date"),
  notificationsSent: jsonb("notifications_sent"),
  updatedBy: varchar("updated_by").references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at"),
});

// Document Verification History Table
export const documentVerificationHistory = pgTable("document_verification_history", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  documentType: text("document_type").notNull(),
  action: text("action").notNull(), // 'status_change', 'verification_complete', 'rejection', 'resubmission', 'approval'
  previousValue: text("previous_value"),
  newValue: text("new_value"),
  actionBy: varchar("action_by").references(() => users.id),
  actionReason: text("action_reason"),
  actionNotes: text("action_notes"),
  metadata: jsonb("metadata"),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Document Verification Workflow Table
export const verificationWorkflow = pgTable("verification_workflow", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  documentId: varchar("document_id").notNull(),
  documentType: text("document_type").notNull(),
  currentStep: text("current_step").notNull(), // 'application_review', 'biometric_capture', 'document_verification', 'security_clearance', 'quality_check', 'approval'
  applicationReviewStatus: text("application_review_status"),
  applicationReviewNotes: text("application_review_notes"),
  applicationReviewedBy: varchar("application_reviewed_by").references(() => users.id),
  applicationReviewedAt: timestamp("application_reviewed_at"),
  biometricCaptureStatus: text("biometric_capture_status"),
  biometricQualityScore: integer("biometric_quality_score"),
  biometricCapturedAt: timestamp("biometric_captured_at"),
  documentVerificationStatus: text("document_verification_status"),
  documentVerificationScore: integer("document_verification_score"),
  documentVerifiedBy: varchar("document_verified_by").references(() => users.id),
  documentVerifiedAt: timestamp("document_verified_at"),
  securityClearanceStatus: text("security_clearance_status"),
  securityClearanceLevel: text("security_clearance_level"),
  securityClearedBy: varchar("security_cleared_by").references(() => users.id),
  securityClearedAt: timestamp("security_cleared_at"),
  qualityCheckStatus: text("quality_check_status"),
  qualityCheckScore: integer("quality_check_score"),
  qualityCheckedBy: varchar("quality_checked_by").references(() => users.id),
  qualityCheckedAt: timestamp("quality_checked_at"),
  approvalStatus: text("approval_status"),
  approvedBy: varchar("approved_by").references(() => users.id),
  approvedAt: timestamp("approved_at"),
  rejectionReason: text("rejection_reason"),
  estimatedCompletionTime: timestamp("estimated_completion_time"),
  actualCompletionTime: timestamp("actual_completion_time"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at"),
});

// DHA Office Locations Table
export const dhaOffices = pgTable("dha_offices", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  officeName: text("office_name").notNull(),
  officeCode: text("office_code").notNull().unique(),
  province: text("province").notNull(),
  city: text("city").notNull(),
  address: text("address").notNull(),
  postalCode: text("postal_code"),
  phoneNumber: text("phone_number"),
  emailAddress: text("email_address"),
  operatingHours: jsonb("operating_hours"), // Mon-Fri hours
  servicesOffered: text().array(), // Array of services
  hasRefugeeServices: boolean("has_refugee_services").notNull().default(false),
  hasDiplomaticServices: boolean("has_diplomatic_services").notNull().default(false),
  collectionAvailable: boolean("collection_available").notNull().default(true),
  wheelchairAccessible: boolean("wheelchair_accessible").notNull().default(false),
  coordinates: jsonb("coordinates"), // Lat/Long for mapping
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
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

// New table insert schemas
export const insertRefugeeDocumentSchema = createInsertSchema(refugeeDocuments).omit({
  id: true,
  createdAt: true,
});

export const insertDiplomaticPassportSchema = createInsertSchema(diplomaticPassports).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentDeliverySchema = createInsertSchema(documentDelivery).omit({
  id: true,
  createdAt: true,
});

export const insertVerificationWorkflowSchema = createInsertSchema(verificationWorkflow).omit({
  id: true,
  createdAt: true,
});

export const insertDhaOfficeSchema = createInsertSchema(dhaOffices).omit({
  id: true,
  createdAt: true,
});

// AMS Certificate and Status Management insert schemas
export const insertAmsCertificateSchema = createInsertSchema(amsCertificates).omit({
  id: true,
  createdAt: true,
});

export const insertPermitStatusChangeSchema = createInsertSchema(permitStatusChanges).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentVerificationStatusSchema = createInsertSchema(documentVerificationStatus).omit({
  id: true,
  createdAt: true,
});

export const insertDocumentVerificationHistorySchema = createInsertSchema(documentVerificationHistory).omit({
  id: true,
  createdAt: true,
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

// New table types
export type RefugeeDocument = typeof refugeeDocuments.$inferSelect;
export type InsertRefugeeDocument = z.infer<typeof insertRefugeeDocumentSchema>;

export type DiplomaticPassport = typeof diplomaticPassports.$inferSelect;
export type InsertDiplomaticPassport = z.infer<typeof insertDiplomaticPassportSchema>;

export type DocumentDelivery = typeof documentDelivery.$inferSelect;
export type InsertDocumentDelivery = z.infer<typeof insertDocumentDeliverySchema>;

export type VerificationWorkflow = typeof verificationWorkflow.$inferSelect;
export type InsertVerificationWorkflow = z.infer<typeof insertVerificationWorkflowSchema>;

export type DhaOffice = typeof dhaOffices.$inferSelect;
export type InsertDhaOffice = z.infer<typeof insertDhaOfficeSchema>;

// AMS Certificate and Status Management types
export type AmsCertificate = typeof amsCertificates.$inferSelect;
export type InsertAmsCertificate = z.infer<typeof insertAmsCertificateSchema>;

export type PermitStatusChange = typeof permitStatusChanges.$inferSelect;
export type InsertPermitStatusChange = z.infer<typeof insertPermitStatusChangeSchema>;

export type DocumentVerificationStatus = typeof documentVerificationStatus.$inferSelect;
export type InsertDocumentVerificationStatus = z.infer<typeof insertDocumentVerificationStatusSchema>;

export type DocumentVerificationHistory = typeof documentVerificationHistory.$inferSelect;
export type InsertDocumentVerificationHistory = z.infer<typeof insertDocumentVerificationHistorySchema>;

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

// ===================== ENHANCED SECURITY MONITORING SCHEMA =====================

// Audit Trail System - Comprehensive logging of all user actions
export const auditLogs = pgTable("audit_logs", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").references(() => users.id), // null for system actions
  sessionId: text("session_id"), // Session identifier
  action: text("action").notNull(), // Standardized action type
  entityType: text("entity_type"), // What was acted upon
  entityId: varchar("entity_id"), // ID of entity
  previousState: jsonb("previous_state"), // State before action
  newState: jsonb("new_state"), // State after action
  actionDetails: jsonb("action_details").notNull(), // Detailed action information
  outcome: text("outcome").notNull(), // success, failure, partial
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  location: text("location"),
  riskScore: integer("risk_score"), // Action risk assessment 0-100
  complianceFlags: jsonb("compliance_flags"), // POPIA compliance markers
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Security Incidents - Automated incident management
export const securityIncidents = pgTable("security_incidents", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  incidentType: text("incident_type").notNull(), // fraud, breach, suspicious_activity, policy_violation
  severity: text("severity").notNull(), // low, medium, high, critical
  status: text("status").notNull().default("open"), // open, investigating, resolved, closed
  title: text("title").notNull(),
  description: text("description").notNull(),
  triggeredBy: text("triggered_by").notNull(), // system, user, admin, automated_rule
  affectedUsers: jsonb("affected_users"), // Array of affected user IDs
  evidenceIds: jsonb("evidence_ids"), // Array of evidence document IDs
  correlatedEvents: jsonb("correlated_events"), // Array of related security event IDs
  investigationNotes: jsonb("investigation_notes"), // Array of investigation updates
  assignedTo: varchar("assigned_to").references(() => users.id), // Assigned investigator
  riskAssessment: jsonb("risk_assessment"), // Risk analysis details
  containmentActions: jsonb("containment_actions"), // Actions taken to contain
  resolution: text("resolution"), // How incident was resolved
  lessonsLearned: text("lessons_learned"), // Post-incident analysis
  openedAt: timestamp("opened_at").notNull().default(sql`now()`),
  resolvedAt: timestamp("resolved_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// User Behavior Analytics - Track user patterns for fraud detection
export const userBehaviorProfiles = pgTable("user_behavior_profiles", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id).unique(),
  typicalLocations: jsonb("typical_locations"), // Array of common locations
  typicalDevices: jsonb("typical_devices"), // Array of device fingerprints
  typicalTimes: jsonb("typical_times"), // Common activity times
  loginPatterns: jsonb("login_patterns"), // Login behavior analysis
  documentPatterns: jsonb("document_patterns"), // Document interaction patterns
  riskFactors: jsonb("risk_factors"), // Identified risk factors
  baselineScore: integer("baseline_score").notNull().default(0), // Normal behavior score
  lastAnalyzed: timestamp("last_analyzed").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Security Rules Engine - Dynamic security rule management
export const securityRules = pgTable("security_rules", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull().unique(),
  description: text("description").notNull(),
  category: text("category").notNull(), // fraud, access, document, authentication
  ruleType: text("rule_type").notNull(), // threshold, pattern, correlation, ml_model
  conditions: jsonb("conditions").notNull(), // Rule conditions in structured format
  actions: jsonb("actions").notNull(), // Actions to take when rule triggered
  severity: text("severity").notNull(), // low, medium, high, critical
  isActive: boolean("is_active").notNull().default(true),
  triggeredCount: integer("triggered_count").notNull().default(0),
  lastTriggered: timestamp("last_triggered"),
  falsePositiveCount: integer("false_positive_count").notNull().default(0),
  effectivenessScore: integer("effectiveness_score"), // 0-100 rule effectiveness
  createdBy: varchar("created_by").notNull().references(() => users.id),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
  updatedAt: timestamp("updated_at").notNull().default(sql`now()`),
});

// Compliance Tracking - POPIA and regulatory compliance monitoring
export const complianceEvents = pgTable("compliance_events", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  eventType: text("event_type").notNull(), // data_access, data_modification, consent_given, consent_withdrawn, data_export, data_deletion
  regulation: text("regulation").notNull(), // POPIA, GDPR, etc.
  userId: varchar("user_id").references(() => users.id),
  dataSubjectId: varchar("data_subject_id").references(() => users.id), // The person whose data is being processed
  dataCategory: text("data_category").notNull(), // personal, biometric, document, health
  processingPurpose: text("processing_purpose").notNull(),
  legalBasis: text("legal_basis").notNull(),
  consentId: varchar("consent_id"), // Reference to consent record
  dataRetentionPeriod: integer("data_retention_period"), // In days
  processingDetails: jsonb("processing_details"), // Detailed processing information
  complianceStatus: text("compliance_status").notNull(), // compliant, non_compliant, under_review
  reviewNotes: text("review_notes"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// Security Metrics - Real-time security KPIs
export const securityMetrics = pgTable("security_metrics", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  metricName: text("metric_name").notNull(),
  metricValue: integer("metric_value").notNull(),
  metricUnit: text("metric_unit").notNull(), // count, percentage, score, rate
  timeWindow: text("time_window").notNull(), // hour, day, week, month
  aggregationType: text("aggregation_type").notNull(), // sum, avg, max, min, count
  dimensions: jsonb("dimensions"), // Additional metric dimensions
  threshold: jsonb("threshold"), // Alert thresholds
  isAlert: boolean("is_alert").notNull().default(false),
  calculatedAt: timestamp("calculated_at").notNull().default(sql`now()`),
  createdAt: timestamp("created_at").notNull().default(sql`now()`),
});

// ===================== SECURITY MONITORING INSERT SCHEMAS =====================

export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  createdAt: true,
});

export const insertSecurityIncidentSchema = createInsertSchema(securityIncidents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  openedAt: true,
});

export const insertUserBehaviorProfileSchema = createInsertSchema(userBehaviorProfiles).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  lastAnalyzed: true,
});

export const insertSecurityRuleSchema = createInsertSchema(securityRules).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  triggeredCount: true,
  falsePositiveCount: true,
});

export const insertComplianceEventSchema = createInsertSchema(complianceEvents).omit({
  id: true,
  createdAt: true,
});

export const insertSecurityMetricSchema = createInsertSchema(securityMetrics).omit({
  id: true,
  createdAt: true,
  calculatedAt: true,
});

// ===================== SECURITY MONITORING TYPES =====================

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type SecurityIncident = typeof securityIncidents.$inferSelect;
export type InsertSecurityIncident = z.infer<typeof insertSecurityIncidentSchema>;

export type UserBehaviorProfile = typeof userBehaviorProfiles.$inferSelect;
export type InsertUserBehaviorProfile = z.infer<typeof insertUserBehaviorProfileSchema>;

export type SecurityRule = typeof securityRules.$inferSelect;
export type InsertSecurityRule = z.infer<typeof insertSecurityRuleSchema>;

export type ComplianceEvent = typeof complianceEvents.$inferSelect;
export type InsertComplianceEvent = z.infer<typeof insertComplianceEventSchema>;

export type SecurityMetric = typeof securityMetrics.$inferSelect;
export type InsertSecurityMetric = z.infer<typeof insertSecurityMetricSchema>;

// ===================== SECURITY ACTION TYPES =====================

export const AuditAction = {
  // Authentication actions
  LOGIN_ATTEMPT: 'auth.login_attempt',
  LOGIN_SUCCESS: 'auth.login_success',
  LOGIN_FAILED: 'auth.login_failed',
  LOGOUT: 'auth.logout',
  PASSWORD_CHANGED: 'auth.password_changed',
  ACCOUNT_LOCKED: 'auth.account_locked',
  
  // Document actions
  DOCUMENT_VIEWED: 'document.viewed',
  DOCUMENT_DOWNLOADED: 'document.downloaded',
  DOCUMENT_UPLOADED: 'document.uploaded',
  DOCUMENT_DELETED: 'document.deleted',
  DOCUMENT_MODIFIED: 'document.modified',
  DOCUMENT_VERIFIED: 'document.verified',
  
  // User management actions
  USER_CREATED: 'user.created',
  USER_UPDATED: 'user.updated',
  USER_DELETED: 'user.deleted',
  USER_DEACTIVATED: 'user.deactivated',
  USER_ROLE_CHANGED: 'user.role_changed',
  
  // Admin actions
  ADMIN_LOGIN: 'admin.login',
  ADMIN_ACTION: 'admin.action',
  SYSTEM_CONFIG_CHANGED: 'admin.config_changed',
  
  // API actions
  API_CALL: 'api.call',
  API_KEY_USED: 'api.key_used',
  
  // Integration actions
  DHA_API_CALL: 'integration.dha_call',
  SAPS_API_CALL: 'integration.saps_call',
  ICAO_API_CALL: 'integration.icao_call',
} as const;

export const ComplianceEventType = {
  DATA_ACCESSED: 'data.accessed',
  DATA_MODIFIED: 'data.modified',
  DATA_EXPORTED: 'data.exported',
  DATA_DELETED: 'data.deleted',
  CONSENT_GIVEN: 'consent.given',
  CONSENT_WITHDRAWN: 'consent.withdrawn',
  DATA_BREACH_DETECTED: 'breach.detected',
  DATA_RETENTION_EXPIRED: 'retention.expired',
} as const;

// ===================== SECURITY MONITORING VALIDATION SCHEMAS =====================

// Security Metrics Query Schema
export const securityMetricsQuerySchema = z.object({
  type: z.string().optional(),
  hours: z.number().min(1).max(8760).optional(), // max 1 year
  timeframe: z.enum(['1h', '24h', '7d', '30d']).optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional()
});

// Error Logging Schema
export const errorLogCreationSchema = z.object({
  message: z.string().min(1).max(2000),
  stack: z.string().max(10000).optional(),
  componentStack: z.string().max(5000).optional(),
  timestamp: z.string().optional(),
  userAgent: z.string().max(500).optional(),
  url: z.string().max(500).optional()
});

// Security Events Query Schema  
export const securityEventsQuerySchema = z.object({
  limit: z.number().min(1).max(500).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  eventType: z.string().max(100).optional(),
  userId: z.string().uuid().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Error Logs Query Schema
export const errorLogsQuerySchema = z.object({
  limit: z.number().min(1).max(500).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  errorType: z.string().max(100).optional(),
  isResolved: z.boolean().optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

// Alert Management Schemas
export const alertFilterSchema = z.object({
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved', 'escalated']).optional(),
  userId: z.string().uuid().optional(),
  limit: z.number().min(1).max(500).optional(),
  offset: z.number().min(0).optional()
});

export const alertActionSchema = z.object({
  notes: z.string().max(1000).optional(),
  resolution: z.string().min(1).max(1000).optional(),
  reason: z.string().min(1).max(500).optional()
});

// Alert Rule Creation Schema
export const alertRuleCreationSchema = z.object({
  name: z.string().min(1).max(200),
  description: z.string().min(1).max(1000),
  conditions: z.array(z.object({
    field: z.string().min(1).max(100),
    operator: z.enum(['gt', 'lt', 'eq', 'gte', 'lte', 'contains', 'pattern']),
    value: z.union([z.string(), z.number(), z.boolean()]),
    timeWindow: z.number().min(1).max(1440).optional() // max 24 hours
  })).min(1).max(10),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  channels: z.array(z.object({
    type: z.enum(['email', 'sms', 'webhook', 'dashboard', 'websocket']),
    target: z.string().min(1).max(500),
    enabled: z.boolean()
  })).min(1).max(10),
  enabled: z.boolean(),
  cooldown: z.number().min(1).max(1440), // max 24 hours
  tags: z.array(z.string().max(50)).max(20)
});

export const alertRuleUpdateSchema = alertRuleCreationSchema.partial();

// Incident Management Schemas
export const incidentFilterSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed']).optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  assignedTo: z.string().uuid().optional(),
  limit: z.number().min(1).max(500).optional(),
  offset: z.number().min(0).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional()
});

export const incidentActionSchema = z.object({
  assignedTo: z.string().uuid().optional(),
  resolution: z.string().min(1).max(2000).optional(),
  notes: z.string().max(1000).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional()
});

// Audit Log Query Schema
export const auditLogQuerySchema = z.object({
  userId: z.string().uuid().optional(),
  action: z.string().max(100).optional(),
  entityType: z.string().max(100).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(1000).optional(),
  offset: z.number().min(0).optional(),
  outcome: z.enum(['success', 'failure']).optional()
});

// Compliance Report Query Schema
export const complianceReportQuerySchema = z.object({
  regulation: z.enum(['POPIA', 'GDPR']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime(),
  eventType: z.string().max(100).optional(),
  complianceStatus: z.enum(['compliant', 'non_compliant', 'under_review']).optional()
});

// Security Rules Query Schema
export const securityRulesQuerySchema = z.object({
  category: z.string().max(100).optional(),
  isActive: z.boolean().optional(),
  ruleType: z.string().max(100).optional(),
  limit: z.number().min(1).max(500).optional(),
  offset: z.number().min(0).optional()
});

export const securityRuleToggleSchema = z.object({
  enabled: z.boolean()
});

// Dashboard Query Schema
export const dashboardQuerySchema = z.object({
  timeframe: z.enum(['1h', '24h', '7d', '30d']).optional(),
  includeAlerts: z.boolean().optional(),
  includeTrends: z.boolean().optional(),
  includeMetrics: z.boolean().optional()
});

// Fraud Statistics Query Schema
export const fraudStatisticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  userId: z.string().uuid().optional(),
  riskThreshold: z.number().min(0).max(100).optional()
});

// User Behavior Analysis Query Schema
export const userBehaviorQuerySchema = z.object({
  userId: z.string().uuid(),
  includeProfile: z.boolean().optional(),
  includeAnalysis: z.boolean().optional(),
  includeDevicePatterns: z.boolean().optional(),
  timeframe: z.enum(['24h', '7d', '30d']).optional()
});

// Alert Statistics Query Schema
export const alertStatisticsQuerySchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  status: z.enum(['active', 'acknowledged', 'resolved', 'escalated']).optional()
});

// Compliance Events Query Schema
export const complianceEventsQuerySchema = z.object({
  regulation: z.string().max(50).optional(),
  eventType: z.string().max(100).optional(),
  complianceStatus: z.enum(['compliant', 'non_compliant', 'under_review']).optional(),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  limit: z.number().min(1).max(500).optional(),
  offset: z.number().min(0).optional()
});

// System Health Query Schema
export const systemHealthQuerySchema = z.object({
  includeMetrics: z.boolean().optional(),
  includeIntegrations: z.boolean().optional(),
  includePerformance: z.boolean().optional()
});

// Document Template Query Schema
export const documentTemplateQuerySchema = z.object({
  type: z.enum(['birth_certificate', 'passport', 'id_card', 'permit', 'certificate', 'visa']).optional()
});

// Document Verification Query Schema  
export const documentVerificationQuerySchema = z.object({
  documentType: z.enum(['birth_certificate', 'passport', 'id_card', 'permit', 'certificate', 'visa']).optional(),
  documentId: z.string().uuid().optional()
});

// Compliance Report Parameter Schema (for URL params)
export const complianceReportParamsSchema = z.object({
  regulation: z.enum(['POPIA', 'GDPR']),
  startDate: z.string().datetime(),
  endDate: z.string().datetime()
});

// Input sanitization helper schemas
export const sanitizedStringSchema = z.string().transform((val) => {
  // Basic XSS prevention - remove HTML tags and escape special chars
  return val.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
            .replace(/[<>]/g, (match) => match === '<' ? '&lt;' : '&gt;')
            .trim();
});

export const sanitizedOptionalStringSchema = sanitizedStringSchema.optional();

// WebSocket Event Schemas
export const webSocketSubscriptionSchema = z.object({
  eventTypes: z.array(z.enum(['security_alert', 'fraud_alert', 'incident_update', 'system_status'])).min(1),
  severity: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  userId: z.string().uuid().optional() // for user-specific alerts
});

// ===================== VALIDATION SCHEMA EXPORTS =====================

export type SecurityMetricsQuery = z.infer<typeof securityMetricsQuerySchema>;
export type ErrorLogCreation = z.infer<typeof errorLogCreationSchema>;
export type SecurityEventsQuery = z.infer<typeof securityEventsQuerySchema>;
export type ErrorLogsQuery = z.infer<typeof errorLogsQuerySchema>;
export type AlertFilter = z.infer<typeof alertFilterSchema>;
export type AlertAction = z.infer<typeof alertActionSchema>;
export type AlertRuleCreation = z.infer<typeof alertRuleCreationSchema>;
export type AlertRuleUpdate = z.infer<typeof alertRuleUpdateSchema>;
export type IncidentFilter = z.infer<typeof incidentFilterSchema>;
export type IncidentAction = z.infer<typeof incidentActionSchema>;
export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
export type ComplianceReportQuery = z.infer<typeof complianceReportQuerySchema>;
export type SecurityRulesQuery = z.infer<typeof securityRulesQuerySchema>;
export type SecurityRuleToggle = z.infer<typeof securityRuleToggleSchema>;
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
export type FraudStatisticsQuery = z.infer<typeof fraudStatisticsQuerySchema>;
export type UserBehaviorQuery = z.infer<typeof userBehaviorQuerySchema>;
export type AlertStatisticsQuery = z.infer<typeof alertStatisticsQuerySchema>;
export type ComplianceEventsQuery = z.infer<typeof complianceEventsQuerySchema>;
export type SystemHealthQuery = z.infer<typeof systemHealthQuerySchema>;
export type DocumentTemplateQuery = z.infer<typeof documentTemplateQuerySchema>;
export type DocumentVerificationQuery = z.infer<typeof documentVerificationQuerySchema>;
export type ComplianceReportParams = z.infer<typeof complianceReportParamsSchema>;
export type WebSocketSubscription = z.infer<typeof webSocketSubscriptionSchema>;
