import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, boolean, integer, decimal, jsonb, pgEnum, check, bigint } from "drizzle-orm/pg-core";
import { z } from "zod";
export const aiModeEnum = pgEnum('ai_mode', ['assistant', 'agent', 'security_bot']);
export const ultraBiometricTypeEnum = pgEnum('ultra_biometric_type', ['facial', 'fingerprint', 'voice', 'retinal', 'multi_factor']);
export const accessLevelEnum = pgEnum('access_level', ['standard', 'elevated', 'ultra', 'raeesa_only']);
export const securityClearanceEnum = pgEnum('security_clearance', ['public', 'restricted', 'confidential', 'secret', 'top_secret', 'ultra_classified']);
export const userRoleEnum = pgEnum('user_role', ['user', 'admin', 'dha_officer', 'manager', 'super_admin', 'raeesa_ultra']);
export const severityEnum = pgEnum('severity', ['low', 'medium', 'high', 'critical']);
export const genderEnum = pgEnum('gender', ['M', 'F', 'X']);
export const statusEnum = pgEnum('status', ['active', 'inactive', 'suspended', 'revoked', 'expired', 'pending']);
export const documentTypeEnum = pgEnum('document_type', [
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
    'certificate_of_south_african_citizenship',
    'passport', 'sa_id', 'smart_id', 'temporary_id',
    'study_permit', 'work_permit', 'business_permit', 'transit_visa',
    'permanent_residence', 'temporary_residence', 'refugee_permit', 'asylum_permit',
    'diplomatic_passport', 'exchange_permit'
]);
export const processingStatusEnum = pgEnum('processing_status', [
    'pending', 'processing', 'validated', 'verified', 'approved', 'rejected', 'issued', 'delivered'
]);
export const workflowStageEnum = pgEnum('workflow_stage', [
    'draft', 'identity_verification', 'eligibility_check', 'background_verification',
    'payment', 'adjudication', 'approved', 'issued'
]);
export const workflowStatusEnum = pgEnum('workflow_status', [
    'in_progress', 'completed', 'rejected', 'on_hold', 'cancelled'
]);
export const classificationLevelEnum = pgEnum('classification_level', [
    'unclassified', 'official', 'confidential', 'secret', 'top_secret'
]);
export const riskLevelEnum = pgEnum('risk_level', ['low', 'medium', 'high', 'critical']);
export const blockchainNetworkEnum = pgEnum('blockchain_network', ['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism']);
export const transactionStatusEnum = pgEnum('transaction_status', ['pending', 'confirmed', 'failed', 'cancelled']);
export const priorityLevelEnum = pgEnum('priority_level', ['low', 'normal', 'high', 'urgent']);
export const verificationTypeEnum = pgEnum('verification_type', [
    'npr', 'abis', 'saps_crc', 'icao_pkd', 'mrz', 'biometric', 'document_authenticity'
]);
export const verificationResultEnum = pgEnum('verification_result', [
    'verified', 'not_verified', 'inconclusive', 'failed', 'pending'
]);
export const paymentStatusEnum = pgEnum('payment_status', [
    'pending', 'processing', 'paid', 'failed', 'refunded', 'cancelled'
]);
export const paymentMethodEnum = pgEnum('payment_method', [
    'card', 'eft', 'cash', 'bank_transfer', 'mobile_payment'
]);
export const deliveryMethodEnum = pgEnum('delivery_method', [
    'collection', 'courier', 'registered_mail', 'secure_courier'
]);
export const deliveryStatusEnum = pgEnum('delivery_status', [
    'pending', 'in_transit', 'delivered', 'failed', 'returned'
]);
export const printStatusEnum = pgEnum('print_status', [
    'queued', 'printing', 'printed', 'quality_check', 'ready', 'failed'
]);
export const preferredContactMethodEnum = pgEnum('preferred_contact_method', [
    'sms', 'email', 'phone', 'mail', 'whatsapp'
]);
export const immunityStatusEnum = pgEnum('immunity_status', [
    'full', 'partial', 'none', 'consular'
]);
export const verificationStageEnum = pgEnum('verification_stage', [
    'initial', 'document_check', 'biometric_check', 'background_check', 'final_review', 'completed'
]);
export const biometricTypeEnum = pgEnum('biometric_type', [
    'fingerprint', 'faceprint', 'iris', 'voiceprint', 'signature'
]);
export const encryptionAlgorithmEnum = pgEnum('encryption_algorithm', [
    'AES-256-GCM', 'ChaCha20-Poly1305', 'RSA-OAEP', 'ECIES'
]);
export const signatureAlgorithmEnum = pgEnum('signature_algorithm', [
    'RSA-PSS', 'ECDSA', 'EdDSA', 'RSASSA-PKCS1-v1_5'
]);
export const countryEnum = pgEnum('country', [
    'ZA', 'ZW', 'MZ', 'BW', 'LS', 'SZ', 'NA', 'MW', 'ZM', 'TZ', 'KE', 'UG', 'RW',
    'US', 'UK', 'DE', 'FR', 'CN', 'IN', 'BR', 'AU', 'CA', 'OTHER'
]);
export const provinceEnum = pgEnum('province', [
    'Eastern Cape', 'Free State', 'Gauteng', 'KwaZulu-Natal',
    'Limpopo', 'Mpumalanga', 'Northern Cape', 'North West', 'Western Cape'
]);
export const users = pgTable("users", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    username: text("username").notNull().unique(),
    email: text("email").notNull().unique(),
    password: text("password").notNull(),
    role: userRoleEnum("role").notNull().default("user"),
    isActive: boolean("is_active").notNull().default(true),
    failedAttempts: integer("failed_attempts").notNull().default(0),
    lockedUntil: timestamp("locked_until"),
    lastFailedAttempt: timestamp("last_failed_attempt"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const conversations = pgTable("conversations", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    title: text("title").notNull(),
    lastMessageAt: timestamp("last_message_at").notNull().default(sql `now()`),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const messages = pgTable("messages", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
    role: text("role").notNull(),
    content: text("content").notNull(),
    metadata: jsonb("metadata"),
    attachments: jsonb("attachments"),
    aiContext: jsonb("ai_context"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const aiDocumentSessions = pgTable("ai_document_sessions", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    conversationId: varchar("conversation_id").references(() => conversations.id),
    documentId: varchar("document_id").references(() => documents.id),
    documentType: documentTypeEnum("document_type").notNull(),
    ocrResults: jsonb("ocr_results"),
    extractedFields: jsonb("extracted_fields"),
    mrzData: jsonb("mrz_data"),
    fieldMappings: jsonb("field_mappings"),
    autoFillData: jsonb("auto_fill_data"),
    aiAnalysis: jsonb("ai_analysis"),
    suggestions: jsonb("suggestions"),
    validationIssues: jsonb("validation_issues"),
    processingStatus: processingStatusEnum("processing_status").notNull().default("pending"),
    confidenceScore: integer("confidence_score"),
    qualityScore: integer("quality_score"),
    processingStarted: timestamp("processing_started").notNull().default(sql `now()`),
    processingCompleted: timestamp("processing_completed"),
    processingDuration: integer("processing_duration"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const documentAutoFillTemplates = pgTable("document_auto_fill_templates", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    name: text("name").notNull(),
    description: text("description"),
    documentType: documentTypeEnum("document_type").notNull(),
    targetFormType: text("target_form_type").notNull(),
    fieldMappings: jsonb("field_mappings").notNull(),
    requiredFields: jsonb("required_fields"),
    optionalFields: jsonb("optional_fields"),
    validationRules: jsonb("validation_rules"),
    dataTransformations: jsonb("data_transformations"),
    aiPromptTemplate: text("ai_prompt_template"),
    aiValidationPrompt: text("ai_validation_prompt"),
    version: text("version").notNull().default("1.0"),
    isActive: boolean("is_active").notNull().default(true),
    priority: integer("priority").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const ocrFieldDefinitions = pgTable("ocr_field_definitions", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    fieldName: text("field_name").notNull().unique(),
    displayName: text("display_name").notNull(),
    description: text("description"),
    dataType: text("data_type").notNull(),
    category: text("category").notNull(),
    isRequired: boolean("is_required").notNull().default(false),
    isVerificationField: boolean("is_verification_field").notNull().default(false),
    validationPattern: text("validation_pattern"),
    minLength: integer("min_length"),
    maxLength: integer("max_length"),
    allowedValues: jsonb("allowed_values"),
    extractionHints: jsonb("extraction_hints"),
    commonVariations: jsonb("common_variations"),
    relatedFields: jsonb("related_fields"),
    translations: jsonb("translations"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const aiKnowledgeBase = pgTable("ai_knowledge_base", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    category: text("category").notNull(),
    documentType: documentTypeEnum("document_type"),
    topic: text("topic").notNull(),
    title: text("title").notNull(),
    content: text("content").notNull(),
    language: text("language").notNull().default("en"),
    translations: jsonb("translations"),
    keywords: jsonb("keywords"),
    tags: jsonb("tags"),
    priority: integer("priority").notNull().default(0),
    version: text("version").notNull().default("1.0"),
    isActive: boolean("is_active").notNull().default(true),
    effectiveDate: timestamp("effective_date").notNull().default(sql `now()`),
    expiryDate: timestamp("expiry_date"),
    viewCount: integer("view_count").notNull().default(0),
    useCount: integer("use_count").notNull().default(0),
    lastUsed: timestamp("last_used"),
    createdBy: varchar("created_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const aiConversationAnalytics = pgTable("ai_conversation_analytics", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    conversationId: varchar("conversation_id").notNull().references(() => conversations.id),
    userId: varchar("user_id").references(() => users.id),
    totalMessages: integer("total_messages").notNull().default(0),
    averageResponseTime: integer("average_response_time"),
    userSatisfactionRating: integer("user_satisfaction_rating"),
    topicsDiscussed: jsonb("topics_discussed"),
    documentsProcessed: jsonb("documents_processed"),
    formsAutoFilled: jsonb("forms_auto_filled"),
    primaryLanguage: text("primary_language").notNull().default("en"),
    languagesSwitched: jsonb("languages_switched"),
    taskCompleted: boolean("task_completed").notNull().default(false),
    assistanceEffectiveness: integer("assistance_effectiveness"),
    errorCount: integer("error_count").notNull().default(0),
    ocrProcessingCount: integer("ocr_processing_count").notNull().default(0),
    autoFillSuccessRate: decimal("auto_fill_success_rate", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const documents = pgTable("documents", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    filename: text("filename").notNull(),
    originalName: text("original_name").notNull(),
    mimeType: text("mime_type").notNull(),
    size: integer("size").notNull(),
    storagePath: text("storage_path").notNull(),
    encryptionKey: text("encryption_key"),
    isEncrypted: boolean("is_encrypted").notNull().default(false),
    processingStatus: processingStatusEnum("processing_status").notNull().default("pending"),
    ocrText: text("ocr_text"),
    ocrConfidence: integer("ocr_confidence"),
    isVerified: boolean("is_verified"),
    verificationScore: integer("verification_score"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const securityEvents = pgTable("security_events", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    eventType: text("event_type").notNull(),
    severity: severityEnum("severity").notNull(),
    details: jsonb("details"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    location: text("location"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const fraudAlerts = pgTable("fraud_alerts", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    alertType: text("alert_type").notNull(),
    riskScore: integer("risk_score").notNull(),
    details: jsonb("details"),
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const systemMetrics = pgTable("system_metrics", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    metricType: text("metric_type").notNull(),
    value: integer("value").notNull(),
    unit: text("unit").notNull(),
    timestamp: timestamp("timestamp").notNull().default(sql `now()`),
});
export const quantumKeys = pgTable("quantum_keys", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    keyId: text("key_id").notNull().unique(),
    algorithm: text("algorithm").notNull(),
    keyData: text("key_data").notNull(),
    entropy: integer("entropy").notNull(),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const errorLogs = pgTable("error_logs", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    timestamp: timestamp("timestamp").notNull().default(sql `now()`),
    errorType: text("error_type").notNull(),
    message: text("message").notNull(),
    stack: text("stack"),
    userId: varchar("user_id").references(() => users.id),
    requestUrl: text("request_url"),
    requestMethod: text("request_method"),
    statusCode: integer("status_code"),
    severity: severityEnum("severity").notNull(),
    context: jsonb("context"),
    environment: text("environment").notNull().default("development"),
    isResolved: boolean("is_resolved").notNull().default(false),
    resolvedBy: varchar("resolved_by").references(() => users.id),
    resolvedAt: timestamp("resolved_at"),
    userAgent: text("user_agent"),
    ipAddress: text("ip_address"),
    sessionId: text("session_id"),
    errorCount: integer("error_count").notNull().default(1),
});
export const refugeeDocuments = pgTable("refugee_documents", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    documentType: documentTypeEnum("document_type").notNull(),
    unhcrNumber: text("unhcr_number"),
    countryOfOrigin: text("country_of_origin").notNull(),
    dateOfEntry: timestamp("date_of_entry").notNull(),
    campLocation: text("camp_location"),
    dependents: jsonb("dependents"),
    permitNumber: text("permit_number"),
    permitExpiryDate: timestamp("permit_expiry_date"),
    maroonPassportNumber: text("maroon_passport_number"),
    integrationStatus: statusEnum("integration_status"),
    biometricCaptured: boolean("biometric_captured").notNull().default(false),
    verificationStatus: verificationResultEnum("verification_status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at"),
});
export const diplomaticPassports = pgTable("diplomatic_passports", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    passportNumber: text("passport_number").unique(),
    diplomaticNoteNumber: text("diplomatic_note_number").notNull(),
    embassy: text("embassy").notNull(),
    consulate: text("consulate"),
    diplomaticRank: text("diplomatic_rank").notNull(),
    immunityStatus: immunityStatusEnum("immunity_status").notNull(),
    viennaConventionCompliant: boolean("vienna_convention_compliant").notNull().default(true),
    specialClearance: jsonb("special_clearance"),
    issueDate: timestamp("issue_date"),
    expiryDate: timestamp("expiry_date"),
    countryOfAccreditation: text("country_of_accreditation").notNull(),
    previousDiplomaticPassports: jsonb("previous_diplomatic_passports"),
    emergencyContactEmbassy: text("emergency_contact_embassy"),
    status: statusEnum("status").notNull().default("pending"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const documentDelivery = pgTable("document_delivery", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    documentId: varchar("document_id").notNull().references(() => documents.id),
    documentType: documentTypeEnum("document_type").notNull(),
    userId: varchar("user_id").notNull().references(() => users.id),
    deliveryMethod: deliveryMethodEnum("delivery_method").notNull(),
    collectionPoint: text("collection_point"),
    courierTrackingNumber: text("courier_tracking_number"),
    deliveryStreetAddress: text("delivery_street_address"),
    deliverySuburb: text("delivery_suburb"),
    deliveryCity: text("delivery_city"),
    deliveryProvince: text("delivery_province"),
    deliveryPostalCode: text("delivery_postal_code"),
    deliveryCountry: text("delivery_country").default("South Africa"),
    deliverySpecialInstructions: text("delivery_special_instructions"),
    printStatus: printStatusEnum("print_status").notNull().default("queued"),
    printQueuePosition: integer("print_queue_position"),
    printedAt: timestamp("printed_at"),
    qualityCheckPassed: boolean("quality_check_passed"),
    estimatedDeliveryDate: timestamp("estimated_delivery_date"),
    actualDeliveryDate: timestamp("actual_delivery_date"),
    deliveryStatus: deliveryStatusEnum("delivery_status").notNull().default("pending"),
    recipientName: text("recipient_name"),
    recipientIdNumber: text("recipient_id_number"),
    recipientSignature: text("recipient_signature"),
    notifySms: boolean("notify_sms").notNull().default(true),
    notifyEmail: boolean("notify_email").notNull().default(true),
    notifyPush: boolean("notify_push").notNull().default(false),
    notifyPhysicalMail: boolean("notify_physical_mail").notNull().default(false),
    preferredContactMethod: preferredContactMethodEnum("preferred_contact_method").default("sms"),
    deliveryAttempts: integer("delivery_attempts").notNull().default(0),
    deliveryNotes: text("delivery_notes"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at"),
});
export const amsCertificates = pgTable("ams_certificates", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    certificateNumber: text("certificate_number").unique(),
    certificateType: text("certificate_type").notNull(),
    applicantName: text("applicant_name").notNull(),
    nationality: text("nationality").notNull(),
    unhcrNumber: text("unhcr_number"),
    asylumClaimNumber: text("asylum_claim_number"),
    status: text("status").notNull().default("pending_verification"),
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
    biometricArtifactId: varchar("biometric_artifact_id").references(() => encryptedArtifacts.id),
    endorsements: text("endorsements").array(),
    restrictions: text("restrictions").array(),
    renewalEligible: boolean("renewal_eligible").notNull().default(false),
    renewalDate: timestamp("renewal_date"),
    previousCertificateId: varchar("previous_certificate_id"),
    metadata: jsonb("metadata"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at"),
});
export const permitStatusChanges = pgTable("permit_status_changes", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    permitId: varchar("permit_id").notNull(),
    permitType: text("permit_type").notNull(),
    previousStatus: text("previous_status").notNull(),
    newStatus: text("new_status").notNull(),
    changedBy: varchar("changed_by").notNull().references(() => users.id),
    changeReason: text("change_reason").notNull(),
    changeNotes: text("change_notes"),
    endorsementsAdded: jsonb("endorsements_added"),
    endorsementsRemoved: jsonb("endorsements_removed"),
    conditionsModified: jsonb("conditions_modified"),
    gracePeriodDays: integer("grace_period_days"),
    renewalStatus: text("renewal_status"),
    renewalDeadline: timestamp("renewal_deadline"),
    effectiveDate: timestamp("effective_date").notNull(),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const documentVerificationStatus = pgTable("document_verification_status", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    documentId: varchar("document_id").notNull(),
    documentType: documentTypeEnum("document_type").notNull(),
    currentStatus: processingStatusEnum("current_status").notNull(),
    previousStatus: text("previous_status"),
    statusChangeReason: text("status_change_reason"),
    verificationStage: verificationStageEnum("verification_stage").notNull(),
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
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at"),
});
export const liveDocumentVerificationHistory = pgTable("live_document_verification_history", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    documentId: varchar("document_id").notNull(),
    documentType: text("document_type").notNull(),
    action: text("action").notNull(),
    previousValue: text("previous_value"),
    newValue: text("new_value"),
    actionBy: varchar("action_by").references(() => users.id),
    actionReason: text("action_reason"),
    actionNotes: text("action_notes"),
    metadata: jsonb("metadata"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const dhaOffices = pgTable("dha_offices", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    officeName: text("office_name").notNull(),
    officeCode: text("office_code").notNull().unique(),
    province: text("province").notNull(),
    city: text("city").notNull(),
    address: text("address").notNull(),
    postalCode: text("postal_code"),
    phoneNumber: text("phone_number"),
    emailAddress: text("email_address"),
    mondayOpen: text("monday_open"),
    mondayClose: text("monday_close"),
    tuesdayOpen: text("tuesday_open"),
    tuesdayClose: text("tuesday_close"),
    wednesdayOpen: text("wednesday_open"),
    wednesdayClose: text("wednesday_close"),
    thursdayOpen: text("thursday_open"),
    thursdayClose: text("thursday_close"),
    fridayOpen: text("friday_open"),
    fridayClose: text("friday_close"),
    saturdayOpen: text("saturday_open"),
    saturdayClose: text("saturday_close"),
    sundayOpen: text("sunday_open"),
    sundayClose: text("sunday_close"),
    servicesOffered: text("services_offered").array(),
    hasRefugeeServices: boolean("has_refugee_services").notNull().default(false),
    hasDiplomaticServices: boolean("has_diplomatic_services").notNull().default(false),
    collectionAvailable: boolean("collection_available").notNull().default(true),
    wheelchairAccessible: boolean("wheelchair_accessible").notNull().default(false),
    latitude: decimal("latitude", { precision: 10, scale: 8 }),
    longitude: decimal("longitude", { precision: 11, scale: 8 }),
    gpsAccuracy: integer("gps_accuracy"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const encryptedArtifacts = pgTable("encrypted_artifacts", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    entityType: text("entity_type").notNull(),
    entityId: varchar("entity_id").notNull(),
    artifactType: text("artifact_type").notNull(),
    encryptedData: text("encrypted_data").notNull(),
    encryptionAlgorithm: encryptionAlgorithmEnum("encryption_algorithm").notNull(),
    keyId: text("key_id").notNull(),
    iv: text("iv").notNull(),
    salt: text("salt"),
    digitalSignature: text("digital_signature").notNull(),
    signatureAlgorithm: signatureAlgorithmEnum("signature_algorithm").notNull(),
    signingKeyId: text("signing_key_id").notNull(),
    signatureFormat: text("signature_format").notNull().default("base64"),
    classificationLevel: classificationLevelEnum("classification_level").notNull().default("confidential"),
    accessControlList: jsonb("access_control_list").notNull(),
    dataSize: integer("data_size").notNull(),
    compressionUsed: boolean("compression_used").notNull().default(false),
    compressionAlgorithm: text("compression_algorithm"),
    createdBy: varchar("created_by").notNull().references(() => users.id),
    accessedBy: jsonb("accessed_by"),
    lastAccessedAt: timestamp("last_accessed_at"),
    accessCount: integer("access_count").notNull().default(0),
    retentionPolicy: text("retention_policy"),
    purgeDate: timestamp("purge_date"),
    popiaCategory: text("popia_category"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const biometricProfiles = pgTable("biometric_profiles", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    type: biometricTypeEnum("type").notNull(),
    encryptedArtifactId: varchar("encrypted_artifact_id").notNull().references(() => encryptedArtifacts.id),
    quality: integer("quality").notNull(),
    isVerified: boolean("is_verified").notNull().default(false),
    enrollmentDate: timestamp("enrollment_date").notNull().default(sql `now()`),
    lastUsed: timestamp("last_used"),
    isActive: boolean("is_active").notNull().default(true),
    templateVersion: text("template_version").notNull().default("1.0"),
    algorithmUsed: text("algorithm_used"),
    qualityMetrics: jsonb("quality_metrics"),
    enrollmentMethod: text("enrollment_method"),
    enrollmentDevice: text("enrollment_device"),
    enrollmentLocation: text("enrollment_location"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const workflowStages = pgTable("workflow_stages", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    stageCode: text("stage_code").notNull().unique(),
    stageName: text("stage_name").notNull(),
    stageOrder: integer("stage_order").notNull(),
    description: text("description").notNull(),
    isRequired: boolean("is_required").notNull().default(true),
    canSkip: boolean("can_skip").notNull().default(false),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    expectedDurationHours: integer("expected_duration_hours"),
    maxDurationHours: integer("max_duration_hours"),
    warningThresholdHours: integer("warning_threshold_hours"),
    canAutomate: boolean("can_automate").notNull().default(false),
    automationRules: jsonb("automation_rules"),
    requiredPermissions: jsonb("required_permissions"),
    allowedRoles: jsonb("allowed_roles"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const dhaApplicants = pgTable("dha_applicants", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    fullName: text("full_name").notNull(),
    surNames: text("sur_names").notNull(),
    dateOfBirth: timestamp("date_of_birth").notNull(),
    placeOfBirth: text("place_of_birth").notNull(),
    countryOfBirth: text("country_of_birth").notNull(),
    sex: text("sex").notNull(),
    nationality: text("nationality").notNull(),
    residentialAddress: text("residential_address").notNull(),
    postalAddress: text("postal_address"),
    phoneNumber: text("phone_number").notNull(),
    emailAddress: text("email_address").notNull().unique(),
    idNumber: text("id_number").unique(),
    passportNumber: text("passport_number").unique(),
    previousPassportNumbers: text("previous_passport_numbers").array(),
    citizenshipStatus: text("citizenship_status").notNull(),
    citizenshipAcquisitionDate: timestamp("citizenship_acquisition_date"),
    citizenshipAcquisitionMethod: text("citizenship_acquisition_method"),
    motherFullName: text("mother_full_name"),
    motherMaidenName: text("mother_maiden_name"),
    motherIdNumber: text("mother_id_number"),
    fatherFullName: text("father_full_name"),
    fatherIdNumber: text("father_id_number"),
    biometricTemplates: jsonb("biometric_templates"),
    biometricQualityScores: jsonb("biometric_quality_scores"),
    photoUrl: text("photo_url"),
    signatureUrl: text("signature_url"),
    isVerified: boolean("is_verified").notNull().default(false),
    verificationScore: integer("verification_score"),
    verificationNotes: text("verification_notes"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`),
}, (table) => ({
    saIdFormatCheck: check("sa_id_format", sql `${table.idNumber} IS NULL OR ${table.idNumber} ~ '^[0-9]{13}$'`),
    passportFormatCheck: check("passport_format", sql `${table.passportNumber} IS NULL OR ${table.passportNumber} ~ '^[A-Z][0-9]{8}$'`),
    emailFormatCheck: check("email_format", sql `${table.emailAddress} ~ '^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$'`),
    phoneFormatCheck: check("phone_format", sql `${table.phoneNumber} ~ '^(\\+27|0)[0-9]{9}$'`),
    genderCheck: check("gender_check", sql `${table.sex} IN ('M', 'F', 'X')`),
    citizenshipCheck: check("citizenship_check", sql `${table.citizenshipStatus} IN ('citizen', 'permanent_resident', 'refugee', 'asylum_seeker')`),
}));
export const dhaApplications = pgTable("dha_applications", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    applicantId: varchar("applicant_id").notNull().references(() => dhaApplicants.id),
    userId: varchar("user_id").notNull().references(() => users.id),
    applicationType: text("application_type").notNull(),
    applicationSubtype: text("application_subtype"),
    applicationNumber: text("application_number").notNull().unique(),
    currentState: text("current_state").notNull().default("draft"),
    previousStates: jsonb("previous_states"),
    applicationData: jsonb("application_data").notNull(),
    documentsSubmitted: jsonb("documents_submitted"),
    priorityLevel: text("priority_level").notNull().default("standard"),
    processingFee: integer("processing_fee"),
    paymentStatus: text("payment_status").default("pending"),
    paymentReference: text("payment_reference"),
    assignedOfficer: text("assigned_officer"),
    assignedOffice: text("assigned_office"),
    assignedDate: timestamp("assigned_date"),
    identityVerificationResult: text("identity_verification_result"),
    eligibilityCheckResult: text("eligibility_check_result"),
    backgroundVerificationResult: text("background_verification_result"),
    decisionStatus: text("decision_status"),
    decisionDate: timestamp("decision_date"),
    decisionReason: text("decision_reason"),
    decisionNotes: text("decision_notes"),
    issuedDocumentNumber: text("issued_document_number"),
    issuedDate: timestamp("issued_date"),
    expiryDate: timestamp("expiry_date"),
    collectionMethod: text("collection_method"),
    collectionOffice: text("collection_office"),
    collectionDate: timestamp("collection_date"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`),
});
export const workflowTransitions = pgTable("workflow_transitions", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    fromStageId: varchar("from_stage_id").references(() => workflowStages.id),
    toStageId: varchar("to_stage_id").notNull().references(() => workflowStages.id),
    transitionType: text("transition_type").notNull(),
    isAutomated: boolean("is_automated").notNull().default(false),
    requiresApproval: boolean("requires_approval").notNull().default(false),
    transitionConditions: jsonb("transition_conditions"),
    requiredData: jsonb("required_data"),
    businessRules: jsonb("business_rules"),
    validationRules: jsonb("validation_rules"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const documentWorkflowInstances = pgTable("document_workflow_instances", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    documentId: varchar("document_id").notNull(),
    documentType: documentTypeEnum("document_type").notNull(),
    applicantId: varchar("applicant_id").notNull().references(() => dhaApplicants.id),
    applicationId: varchar("application_id").references(() => dhaApplications.id),
    currentStageId: varchar("current_stage_id").notNull().references(() => workflowStages.id),
    workflowStatus: workflowStatusEnum("workflow_status").notNull().default("in_progress"),
    startedAt: timestamp("started_at").notNull().default(sql `now()`),
    completedAt: timestamp("completed_at"),
    estimatedCompletionAt: timestamp("estimated_completion_at"),
    totalElapsedHours: integer("total_elapsed_hours").default(0),
    slaBreached: boolean("sla_breached").notNull().default(false),
    slaBreachReason: text("sla_breach_reason"),
    priorityLevel: priorityLevelEnum("priority_level").notNull().default("normal"),
    escalationLevel: text("escalation_level").default("none"),
    escalationReason: text("escalation_reason"),
    escalatedAt: timestamp("escalated_at"),
    escalatedBy: varchar("escalated_by").references(() => users.id),
    assignedTo: varchar("assigned_to").references(() => users.id),
    assignedAt: timestamp("assigned_at"),
    assignedBy: varchar("assigned_by").references(() => users.id),
    workflowData: jsonb("workflow_data"),
    stageResults: jsonb("stage_results"),
    qualityChecksPassed: boolean("quality_checks_passed"),
    qualityIssues: jsonb("quality_issues"),
    qualityCheckedBy: varchar("quality_checked_by").references(() => users.id),
    qualityCheckedAt: timestamp("quality_checked_at"),
    finalDecision: text("final_decision"),
    decisionReason: text("decision_reason"),
    decisionMadeBy: varchar("decision_made_by").references(() => users.id),
    decisionMadeAt: timestamp("decision_made_at"),
    documentNumber: text("document_number"),
    issueDate: timestamp("issue_date"),
    expiryDate: timestamp("expiry_date"),
    issuedBy: varchar("issued_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const workflowStageExecutions = pgTable("workflow_stage_executions", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    workflowInstanceId: varchar("workflow_instance_id").notNull().references(() => documentWorkflowInstances.id),
    stageId: varchar("stage_id").notNull().references(() => workflowStages.id),
    executionStatus: text("execution_status").notNull().default("pending"),
    startedAt: timestamp("started_at"),
    completedAt: timestamp("completed_at"),
    assignedTo: varchar("assigned_to").references(() => users.id),
    processedBy: varchar("processed_by").references(() => users.id),
    stageResult: text("stage_result"),
    stageData: jsonb("stage_data"),
    stageScore: integer("stage_score"),
    decision: text("decision"),
    decisionReason: text("decision_reason"),
    reviewNotes: text("review_notes"),
    durationMinutes: integer("duration_minutes"),
    slaMetMinutes: integer("sla_met_minutes"),
    slaBreached: boolean("sla_breached").notNull().default(false),
    verificationRequired: boolean("verification_required").notNull().default(false),
    verificationStatus: text("verification_status"),
    verifiedBy: varchar("verified_by").references(() => users.id),
    verifiedAt: timestamp("verified_at"),
    errorCode: text("error_code"),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const apiKeys = pgTable("api_keys", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    keyHash: text("key_hash").notNull().unique(),
    name: text("name").notNull(),
    userId: varchar("user_id").references(() => users.id),
    permissions: jsonb("permissions"),
    isActive: boolean("is_active").notNull().default(true),
    expiresAt: timestamp("expires_at"),
    lastUsed: timestamp("last_used"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const certificates = pgTable("certificates", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    templateType: text("template_type").notNull(),
    data: jsonb("data"),
    serialNumber: text("serial_number").notNull().unique(),
    issuedAt: timestamp("issued_at").notNull().default(sql `now()`),
    expiresAt: timestamp("expires_at"),
    status: text("status").notNull().default("active"),
    verificationCode: text("verification_code").notNull().unique(),
    qrCodeUrl: text("qr_code_url"),
    documentUrl: text("document_url"),
    digitalSignature: text("digital_signature"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const permits = pgTable("permits", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    type: text("type").notNull(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    templateType: text("template_type").notNull(),
    data: jsonb("data"),
    permitNumber: text("permit_number").notNull().unique(),
    issuedAt: timestamp("issued_at").notNull().default(sql `now()`),
    expiresAt: timestamp("expires_at"),
    status: text("status").notNull().default("active"),
    verificationCode: text("verification_code").notNull().unique(),
    qrCodeUrl: text("qr_code_url"),
    documentUrl: text("document_url"),
    conditions: jsonb("conditions"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const documentTemplates = pgTable("document_templates", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    name: text("name").notNull(),
    type: text("type").notNull(),
    htmlTemplate: text("html_template").notNull(),
    cssStyles: text("css_styles").notNull(),
    officialLayout: jsonb("official_layout"),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const birthCertificates = pgTable("birth_certificates", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    fullName: text("full_name").notNull(),
    dateOfBirth: timestamp("date_of_birth").notNull(),
    placeOfBirth: text("place_of_birth").notNull(),
    motherFullName: text("mother_full_name").notNull(),
    motherMaidenName: text("mother_maiden_name"),
    fatherFullName: text("father_full_name").notNull(),
    registrationNumber: text("registration_number").notNull().unique(),
    registrationDate: timestamp("registration_date").notNull().default(sql `now()`),
    issuingAuthority: text("issuing_authority").notNull(),
    officialSeal: text("official_seal"),
    watermarkData: text("watermark_data"),
    verificationCode: text("verification_code").notNull().unique(),
    documentUrl: text("document_url"),
    qrCodeUrl: text("qr_code_url"),
    digitalSignature: text("digital_signature"),
    securityFeatures: jsonb("security_features"),
    status: text("status").notNull().default("active"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const marriageCertificates = pgTable("marriage_certificates", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
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
    officialSignatures: jsonb("official_signatures"),
    verificationCode: text("verification_code").notNull().unique(),
    documentUrl: text("document_url"),
    qrCodeUrl: text("qr_code_url"),
    digitalSignature: text("digital_signature"),
    securityFeatures: jsonb("security_features"),
    status: text("status").notNull().default("active"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const passports = pgTable("passports", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    passportNumber: text("passport_number").notNull().unique(),
    fullName: text("full_name").notNull(),
    dateOfBirth: timestamp("date_of_birth").notNull(),
    placeOfBirth: text("place_of_birth").notNull(),
    nationality: text("nationality").notNull(),
    sex: text("sex").notNull(),
    height: text("height"),
    eyeColor: text("eye_color"),
    issueDate: timestamp("issue_date").notNull().default(sql `now()`),
    expiryDate: timestamp("expiry_date").notNull(),
    issuingAuthority: text("issuing_authority").notNull(),
    placeOfIssue: text("place_of_issue").notNull(),
    photoUrl: text("photo_url"),
    signatureUrl: text("signature_url"),
    machineReadableZone: text("machine_readable_zone"),
    rfidChipData: text("rfid_chip_data"),
    verificationCode: text("verification_code").notNull().unique(),
    documentUrl: text("document_url"),
    qrCodeUrl: text("qr_code_url"),
    digitalSignature: text("digital_signature"),
    securityFeatures: jsonb("security_features"),
    status: text("status").notNull().default("active"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const deathCertificates = pgTable("death_certificates", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    deceasedFullName: text("deceased_full_name").notNull(),
    dateOfBirth: timestamp("date_of_birth").notNull(),
    dateOfDeath: timestamp("date_of_death").notNull(),
    placeOfDeath: text("place_of_death").notNull(),
    causeOfDeath: text("cause_of_death").notNull(),
    mannerOfDeath: text("manner_of_death"),
    certifyingPhysician: text("certifying_physician").notNull(),
    medicalExaminerSignature: text("medical_examiner_signature"),
    registrationNumber: text("registration_number").notNull().unique(),
    registrationDate: timestamp("registration_date").notNull().default(sql `now()`),
    issuingAuthority: text("issuing_authority").notNull(),
    informantName: text("informant_name"),
    relationshipToDeceased: text("relationship_to_deceased"),
    verificationCode: text("verification_code").notNull().unique(),
    documentUrl: text("document_url"),
    qrCodeUrl: text("qr_code_url"),
    digitalSignature: text("digital_signature"),
    securityFeatures: jsonb("security_features"),
    status: text("status").notNull().default("active"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const workPermits = pgTable("work_permits", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
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
    issueDate: timestamp("issue_date").notNull().default(sql `now()`),
    validFrom: timestamp("valid_from").notNull(),
    validUntil: timestamp("valid_until").notNull(),
    workRestrictions: jsonb("work_restrictions"),
    issuingAuthority: text("issuing_authority").notNull(),
    sponsorDetails: jsonb("sponsor_details"),
    verificationCode: text("verification_code").notNull().unique(),
    documentUrl: text("document_url"),
    qrCodeUrl: text("qr_code_url"),
    digitalSignature: text("digital_signature"),
    securityFeatures: jsonb("security_features"),
    status: text("status").notNull().default("active"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const permanentVisas = pgTable("permanent_visas", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    holderFullName: text("holder_full_name").notNull(),
    holderNationality: text("holder_nationality").notNull(),
    holderPassportNumber: text("holder_passport_number").notNull(),
    visaType: text("visa_type").notNull(),
    visaCategory: text("visa_category").notNull(),
    visaNumber: text("visa_number").notNull().unique(),
    issueDate: timestamp("issue_date").notNull().default(sql `now()`),
    validFrom: timestamp("valid_from").notNull(),
    expiryDate: timestamp("expiry_date"),
    countryOfIssue: text("country_of_issue").notNull(),
    issuingAuthority: text("issuing_authority").notNull(),
    portOfEntry: text("port_of_entry"),
    immigrationStamps: jsonb("immigration_stamps"),
    sponsorInformation: jsonb("sponsor_information"),
    photoUrl: text("photo_url"),
    fingerprintData: text("fingerprint_data"),
    verificationCode: text("verification_code").notNull().unique(),
    documentUrl: text("document_url"),
    qrCodeUrl: text("qr_code_url"),
    digitalSignature: text("digital_signature"),
    securityFeatures: jsonb("security_features"),
    status: text("status").notNull().default("active"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const idCards = pgTable("id_cards", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id),
    idNumber: text("id_number").notNull().unique(),
    fullName: text("full_name").notNull(),
    dateOfBirth: timestamp("date_of_birth").notNull(),
    placeOfBirth: text("place_of_birth").notNull(),
    sex: text("sex").notNull(),
    nationality: text("nationality").notNull(),
    address: text("address").notNull(),
    issueDate: timestamp("issue_date").notNull().default(sql `now()`),
    expiryDate: timestamp("expiry_date").notNull(),
    issuingAuthority: text("issuing_authority").notNull(),
    photoUrl: text("photo_url"),
    signatureUrl: text("signature_url"),
    rfidChipData: text("rfid_chip_data"),
    parentNames: text("parent_names"),
    emergencyContact: jsonb("emergency_contact"),
    verificationCode: text("verification_code").notNull().unique(),
    documentUrl: text("document_url"),
    qrCodeUrl: text("qr_code_url"),
    digitalSignature: text("digital_signature"),
    securityFeatures: jsonb("security_features"),
    status: text("status").notNull().default("active"),
    isRevoked: boolean("is_revoked").notNull().default(false),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
});
export const documentVerifications = pgTable("document_verifications", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    documentType: text("document_type").notNull(),
    documentId: varchar("document_id").notNull(),
    verificationCode: text("verification_code").notNull(),
    verifierIpAddress: text("verifier_ip_address"),
    verifierUserAgent: text("verifier_user_agent"),
    verificationResult: text("verification_result").notNull(),
    verificationDetails: jsonb("verification_details"),
    verifiedAt: timestamp("verified_at").notNull().default(sql `now()`),
});
const passwordStrengthSchema = z.string()
    .min(8, "Password must be at least 8 characters long")
    .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/, "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character");
export const autonomousActionTypeEnum = pgEnum('autonomous_action_type', [
    'service_restart', 'cache_cleanup', 'database_maintenance', 'log_rotation',
    'disk_cleanup', 'memory_optimization', 'connection_reset', 'circuit_breaker_trip',
    'failover', 'data_repair', 'security_scan', 'performance_optimization',
    'alert_suppression', 'backup_creation', 'config_reload'
]);
export const autonomousActionStatusEnum = pgEnum('autonomous_action_status', [
    'initiated', 'in_progress', 'completed', 'failed', 'rolled_back', 'cancelled'
]);
export const maintenanceTaskTypeEnum = pgEnum('maintenance_task_type', [
    'database_vacuum', 'database_reindex', 'stats_update', 'log_cleanup',
    'disk_cleanup', 'cache_optimization', 'connection_pool_reset',
    'security_scan', 'backup_verification', 'performance_analysis'
]);
export const circuitBreakerStateEnum = pgEnum('circuit_breaker_state', [
    'closed', 'open', 'half_open'
]);
export const incidentSeverityEnum = pgEnum('incident_severity', [
    'low', 'medium', 'high', 'critical', 'emergency'
]);
export const incidentStatusEnum = pgEnum('incident_status', [
    'open', 'investigating', 'identified', 'monitoring', 'resolved', 'closed'
]);
export const complianceRequirementEnum = pgEnum('compliance_requirement', [
    'popia', 'pfma', 'government_uptime', 'security_incident_response',
    'data_protection', 'audit_trail', 'regulatory_reporting'
]);
export const auditLogs = pgTable("audit_logs", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").references(() => users.id),
    action: text("action").notNull(),
    resource: text("resource").notNull(),
    resourceId: varchar("resource_id"),
    eventType: text("event_type").notNull(),
    severity: severityEnum("severity").notNull().default("low"),
    description: text("description").notNull(),
    requestData: jsonb("request_data"),
    responseData: jsonb("response_data"),
    changes: jsonb("changes"),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    sessionId: text("session_id"),
    requestId: text("request_id"),
    legalBasis: text("legal_basis"),
    dataCategory: text("data_category"),
    retentionPeriod: text("retention_period"),
    success: boolean("success").notNull().default(true),
    errorMessage: text("error_message"),
    errorCode: text("error_code"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    archivedAt: timestamp("archived_at"),
});
export const autonomousOperations = pgTable("autonomous_operations", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    actionType: autonomousActionTypeEnum("action_type").notNull(),
    targetService: text("target_service").notNull(),
    triggeredBy: text("triggered_by").notNull(),
    triggerDetails: jsonb("trigger_details"),
    status: autonomousActionStatusEnum("status").notNull().default("initiated"),
    startedAt: timestamp("started_at").notNull().default(sql `now()`),
    completedAt: timestamp("completed_at"),
    duration: integer("duration"),
    actionParameters: jsonb("action_parameters"),
    executionResults: jsonb("execution_results"),
    impactMetrics: jsonb("impact_metrics"),
    rollbackDetails: jsonb("rollback_details"),
    complianceFlags: jsonb("compliance_flags"),
    auditTrailId: varchar("audit_trail_id").references(() => auditLogs.id),
    approvalRequired: boolean("approval_required").notNull().default(false),
    approvedBy: varchar("approved_by").references(() => users.id),
    errorMessage: text("error_message"),
    retryCount: integer("retry_count").notNull().default(0),
    maxRetries: integer("max_retries").notNull().default(3),
    nextRetryAt: timestamp("next_retry_at"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const systemHealthSnapshots = pgTable("system_health_snapshots", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    timestamp: timestamp("timestamp").notNull().default(sql `now()`),
    cpuUsage: decimal("cpu_usage", { precision: 5, scale: 2 }),
    memoryUsage: decimal("memory_usage", { precision: 5, scale: 2 }),
    diskUsage: decimal("disk_usage", { precision: 5, scale: 2 }),
    networkLatency: integer("network_latency"),
    activeConnections: integer("active_connections"),
    responseTime: integer("response_time"),
    errorRate: decimal("error_rate", { precision: 5, scale: 2 }),
    throughput: integer("throughput"),
    databaseHealth: jsonb("database_health"),
    cacheHealth: jsonb("cache_health"),
    apiHealth: jsonb("api_health"),
    externalServicesHealth: jsonb("external_services_health"),
    securityScore: integer("security_score"),
    threatLevel: severityEnum("threat_level").notNull().default("low"),
    activeSecurityIncidents: integer("active_security_incidents").notNull().default(0),
    fraudAlertsActive: integer("fraud_alerts_active").notNull().default(0),
    anomalyScore: decimal("anomaly_score", { precision: 3, scale: 2 }),
    anomaliesDetected: jsonb("anomalies_detected"),
    performanceBaseline: jsonb("performance_baseline"),
    complianceScore: integer("compliance_score"),
    regulatoryViolations: jsonb("regulatory_violations"),
    uptimePercentage: decimal("uptime_percentage", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at").notNull().default(sql `now()`)
});
export const circuitBreakerStates = pgTable("circuit_breaker_states", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    serviceName: text("service_name").notNull().unique(),
    state: circuitBreakerStateEnum("state").notNull().default("closed"),
    failureCount: integer("failure_count").notNull().default(0),
    failureThreshold: integer("failure_threshold").notNull().default(5),
    successCount: integer("success_count").notNull().default(0),
    successThreshold: integer("success_threshold").notNull().default(3),
    timeout: integer("timeout").notNull().default(30000),
    lastFailureAt: timestamp("last_failure_at"),
    lastSuccessAt: timestamp("last_success_at"),
    nextRetryAt: timestamp("next_retry_at"),
    totalRequests: integer("total_requests").notNull().default(0),
    totalFailures: integer("total_failures").notNull().default(0),
    averageResponseTime: integer("average_response_time"),
    stateChangedAt: timestamp("state_changed_at").notNull().default(sql `now()`),
    recoveryAttempts: integer("recovery_attempts").notNull().default(0),
    lastRecoveryAt: timestamp("last_recovery_at"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const maintenanceTasks = pgTable("maintenance_tasks", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    taskType: maintenanceTaskTypeEnum("task_type").notNull(),
    taskName: text("task_name").notNull().unique(),
    description: text("description"),
    schedulePattern: text("schedule_pattern").notNull(),
    nextRunTime: timestamp("next_run_time").notNull(),
    lastRunTime: timestamp("last_run_time"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    timeout: integer("timeout").notNull().default(300000),
    maxRetries: integer("max_retries").notNull().default(3),
    retryDelay: integer("retry_delay").notNull().default(60000),
    taskParameters: jsonb("task_parameters"),
    dependsOnTasks: jsonb("depends_on_tasks"),
    status: autonomousActionStatusEnum("status").notNull().default("initiated"),
    executionCount: integer("execution_count").notNull().default(0),
    successCount: integer("success_count").notNull().default(0),
    failureCount: integer("failure_count").notNull().default(0),
    averageDuration: integer("average_duration"),
    lastExecutionResults: jsonb("last_execution_results"),
    performanceImpact: jsonb("performance_impact"),
    complianceRequired: boolean("compliance_required").notNull().default(false),
    auditTrailRequired: boolean("audit_trail_required").notNull().default(true),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const alertRules = pgTable("alert_rules", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    ruleName: text("rule_name").notNull().unique(),
    description: text("description"),
    category: text("category").notNull(),
    metricName: text("metric_name").notNull(),
    operator: text("operator").notNull(),
    threshold: decimal("threshold", { precision: 10, scale: 2 }).notNull(),
    duration: integer("duration").notNull().default(300),
    severity: severityEnum("severity").notNull().default("medium"),
    isEnabled: boolean("is_enabled").notNull().default(true),
    suppressionWindow: integer("suppression_window").notNull().default(3600),
    smartClustering: boolean("smart_clustering").notNull().default(true),
    rootCauseAnalysis: boolean("root_cause_analysis").notNull().default(true),
    autoResolution: boolean("auto_resolution").notNull().default(false),
    escalationRules: jsonb("escalation_rules"),
    notificationChannels: jsonb("notification_channels"),
    recipientGroups: jsonb("recipient_groups"),
    messageTemplate: text("message_template"),
    triggerCount: integer("trigger_count").notNull().default(0),
    falsePositiveCount: integer("false_positive_count").notNull().default(0),
    averageResolutionTime: integer("average_resolution_time"),
    lastTriggeredAt: timestamp("last_triggered_at"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const incidents = pgTable("incidents", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    incidentNumber: text("incident_number").notNull().unique(),
    title: text("title").notNull(),
    description: text("description"),
    severity: incidentSeverityEnum("severity").notNull(),
    status: incidentStatusEnum("status").notNull().default("open"),
    category: text("category").notNull(),
    impactLevel: severityEnum("impact_level").notNull().default("low"),
    affectedServices: jsonb("affected_services"),
    affectedUsers: integer("affected_users"),
    businessImpact: text("business_impact"),
    assignedTo: varchar("assigned_to").references(() => users.id),
    assignedTeam: text("assigned_team"),
    priority: priorityLevelEnum("priority").notNull().default("normal"),
    detectedAt: timestamp("detected_at").notNull().default(sql `now()`),
    acknowledgedAt: timestamp("acknowledged_at"),
    resolvedAt: timestamp("resolved_at"),
    closedAt: timestamp("closed_at"),
    resolution: text("resolution"),
    closedBy: varchar("closed_by").references(() => users.id),
    triggerAlertRuleId: varchar("trigger_alert_rule_id").references(() => alertRules.id),
    autonomousActionsCount: integer("autonomous_actions_count").notNull().default(0),
    automaticResolution: boolean("automatic_resolution").notNull().default(false),
    rootCause: text("root_cause"),
    rootCauseAnalysis: jsonb("root_cause_analysis"),
    preventiveMeasures: jsonb("preventive_measures"),
    governmentNotificationRequired: boolean("government_notification_required").notNull().default(false),
    governmentNotifiedAt: timestamp("government_notified_at"),
    complianceViolation: boolean("compliance_violation").notNull().default(false),
    regulatoryReporting: jsonb("regulatory_reporting"),
    communicationLog: jsonb("communication_log"),
    stakeholderUpdates: jsonb("stakeholder_updates"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const governmentComplianceAudit = pgTable("government_compliance_audit", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    auditId: text("audit_id").notNull().unique(),
    complianceRequirement: complianceRequirementEnum("compliance_requirement").notNull(),
    regulatoryFramework: text("regulatory_framework").notNull(),
    requirementDetails: jsonb("requirement_details"),
    auditType: text("audit_type").notNull(),
    triggeredBy: text("triggered_by"),
    auditScope: jsonb("audit_scope"),
    complianceStatus: text("compliance_status").notNull(),
    findings: jsonb("findings"),
    violations: jsonb("violations"),
    riskLevel: riskLevelEnum("risk_level").notNull().default("low"),
    evidenceCollected: jsonb("evidence_collected"),
    documentationLinks: jsonb("documentation_links"),
    screenshotPaths: jsonb("screenshot_paths"),
    remediationRequired: boolean("remediation_required").notNull().default(false),
    remediationPlan: jsonb("remediation_plan"),
    remediationDeadline: timestamp("remediation_deadline"),
    remediationCompleted: boolean("remediation_completed").notNull().default(false),
    reportGenerated: boolean("report_generated").notNull().default(false),
    reportPath: text("report_path"),
    reportSentAt: timestamp("report_sent_at"),
    reportRecipients: jsonb("report_recipients"),
    scheduledDate: timestamp("scheduled_date"),
    auditStartedAt: timestamp("audit_started_at").notNull().default(sql `now()`),
    auditCompletedAt: timestamp("audit_completed_at"),
    nextAuditScheduled: timestamp("next_audit_scheduled"),
    auditedBy: varchar("audited_by").references(() => users.id),
    reviewedBy: varchar("reviewed_by").references(() => users.id),
    approvedBy: varchar("approved_by").references(() => users.id),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const performanceBaselines = pgTable("performance_baselines", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    metricName: text("metric_name").notNull(),
    serviceName: text("service_name").notNull(),
    baselineValue: decimal("baseline_value", { precision: 10, scale: 2 }).notNull(),
    standardDeviation: decimal("standard_deviation", { precision: 10, scale: 2 }),
    minValue: decimal("min_value", { precision: 10, scale: 2 }),
    maxValue: decimal("max_value", { precision: 10, scale: 2 }),
    hourlyPattern: jsonb("hourly_pattern"),
    dailyPattern: jsonb("daily_pattern"),
    monthlyPattern: jsonb("monthly_pattern"),
    seasonalAdjustment: decimal("seasonal_adjustment", { precision: 5, scale: 2 }),
    anomalyThreshold: decimal("anomaly_threshold", { precision: 3, scale: 2 }).notNull().default("2.0"),
    adaptiveLearning: boolean("adaptive_learning").notNull().default(true),
    lastCalculated: timestamp("last_calculated").notNull().default(sql `now()`),
    dataPointsUsed: integer("data_points_used").notNull(),
    validityPeriod: integer("validity_period").notNull().default(2592000),
    anomaliesDetected: integer("anomalies_detected").notNull().default(0),
    falsePositives: integer("false_positives").notNull().default(0),
    accuracy: decimal("accuracy", { precision: 5, scale: 2 }),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const ultraAdminProfiles = pgTable("ultra_admin_profiles", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    profileData: jsonb("profile_data"),
    createdAt: timestamp("created_at").notNull().default(sql `now()`),
    updatedAt: timestamp("updated_at").notNull().default(sql `now()`)
});
export const personalDetailsSchema = z.object({
    fullName: z.string().min(1, "Full name is required"),
    surname: z.string().min(1, "Surname is required"),
    givenNames: z.string().min(1, "Given names are required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    placeOfBirth: z.string().min(1, "Place of birth is required"),
    nationality: z.string().min(1, "Nationality is required"),
    passportNumber: z.string().optional(),
    idNumber: z.string().optional(),
    gender: z.enum(["M", "F", "X"]),
    maritalStatus: z.enum(["Single", "Married", "Divorced", "Widowed"]).optional(),
    countryOfBirth: z.string().min(1, "Country of birth is required"),
    photograph: z.string().optional()
});
export const smartIdCardSchema = z.object({
    documentType: z.literal("smart_id_card"),
    personal: personalDetailsSchema,
    idNumber: z.string().min(13, "Valid SA ID number is required"),
    cardNumber: z.string().min(1, "Card number is required"),
    issuingDate: z.string().min(1, "Issuing date is required"),
    expiryDate: z.string().min(1, "Expiry date is required"),
    issuingOffice: z.string().min(1, "Issuing office is required"),
    emergencyContact: z.object({
        name: z.string(),
        relationship: z.string(),
        contactNumber: z.string()
    }).optional()
});
export const identityDocumentBookSchema = z.object({
    documentType: z.literal("identity_document_book"),
    personal: personalDetailsSchema,
    idNumber: z.string().min(13, "Valid SA ID number is required"),
    bookNumber: z.string().min(1, "Book number is required"),
    issuingDate: z.string().min(1, "Issuing date is required"),
    issuingOffice: z.string().min(1, "Issuing office is required"),
    previousIdNumber: z.string().optional(),
    parentDetails: z.object({
        motherFullName: z.string(),
        fatherFullName: z.string()
    }).optional()
});
export const temporaryIdCertificateSchema = z.object({
    documentType: z.literal("temporary_id_certificate"),
    personal: personalDetailsSchema,
    temporaryCertificateNumber: z.string().min(1, "Certificate number is required"),
    reasonForIssue: z.string().min(1, "Reason for issue is required"),
    issuingDate: z.string().min(1, "Issuing date is required"),
    expiryDate: z.string().min(1, "Expiry date is required"),
    issuingOffice: z.string().min(1, "Issuing office is required"),
    applicationReference: z.string().min(1, "Application reference is required")
});
export const southAfricanPassportSchema = z.object({
    documentType: z.literal("south_african_passport"),
    personal: personalDetailsSchema,
    passportNumber: z.string().min(1, "Passport number is required"),
    passportType: z.enum(["Ordinary", "Official", "Diplomatic"]).default("Ordinary"),
    dateOfIssue: z.string().min(1, "Date of issue is required"),
    dateOfExpiry: z.string().min(1, "Date of expiry is required"),
    placeOfIssue: z.string().min(1, "Place of issue is required"),
    issuingAuthority: z.string().default("Department of Home Affairs"),
    height: z.string().optional(),
    eyeColor: z.string().optional(),
    endorsements: z.array(z.string()).optional()
});
export const emergencyTravelCertificateSchema = z.object({
    documentType: z.literal("emergency_travel_certificate"),
    personal: personalDetailsSchema,
    certificateNumber: z.string().min(1, "Certificate number is required"),
    reasonForIssue: z.string().min(1, "Reason for emergency issue is required"),
    dateOfIssue: z.string().min(1, "Date of issue is required"),
    dateOfExpiry: z.string().min(1, "Date of expiry is required"),
    placeOfIssue: z.string().min(1, "Place of issue is required"),
    travelDestination: z.string().min(1, "Travel destination is required"),
    validForReturn: z.boolean().default(true)
});
export const refugeeTravelDocumentSchema = z.object({
    documentType: z.literal("refugee_travel_document"),
    personal: personalDetailsSchema,
    refugeeNumber: z.string().min(1, "Refugee number is required"),
    unhcrNumber: z.string().optional(),
    countryOfOrigin: z.string().min(1, "Country of origin is required"),
    dateOfEntry: z.string().min(1, "Date of entry into SA is required"),
    refugeeStatus: z.enum(["Refugee", "Asylum Seeker"]),
    dateOfIssue: z.string().min(1, "Date of issue is required"),
    dateOfExpiry: z.string().min(1, "Date of expiry is required"),
    travelRestrictions: z.array(z.string()).optional()
});
export const birthCertificateSchema = z.object({
    documentType: z.literal("birth_certificate"),
    childFullName: z.string().min(1, "Child's full name is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    placeOfBirth: z.string().min(1, "Place of birth is required"),
    sex: z.enum(["Male", "Female"]),
    motherFullName: z.string().min(1, "Mother's full name is required"),
    motherAge: z.number().min(1).optional(),
    motherNationality: z.string().min(1, "Mother's nationality is required"),
    fatherFullName: z.string().min(1, "Father's full name is required"),
    fatherAge: z.number().min(1).optional(),
    fatherNationality: z.string().min(1, "Father's nationality is required"),
    registrationNumber: z.string().min(1, "Registration number is required"),
    registrationDate: z.string().min(1, "Registration date is required"),
    attendantType: z.string().optional(),
    attendantName: z.string().optional()
});
export const deathCertificateSchema = z.object({
    documentType: z.literal("death_certificate"),
    deceasedFullName: z.string().min(1, "Deceased's full name is required"),
    dateOfBirth: z.string().min(1, "Date of birth is required"),
    dateOfDeath: z.string().min(1, "Date of death is required"),
    placeOfDeath: z.string().min(1, "Place of death is required"),
    causeOfDeath: z.string().min(1, "Cause of death is required"),
    mannerOfDeath: z.enum(["Natural", "Accident", "Suicide", "Homicide", "Undetermined"]).optional(),
    certifyingPhysician: z.string().min(1, "Certifying physician is required"),
    physicianRegistrationNumber: z.string().min(1, "Physician registration number is required"),
    informantName: z.string().min(1, "Informant name is required"),
    relationshipToDeceased: z.string().min(1, "Relationship to deceased is required"),
    registrationNumber: z.string().min(1, "Registration number is required"),
    registrationDate: z.string().min(1, "Registration date is required")
});
export const marriageCertificateSchema = z.object({
    documentType: z.literal("marriage_certificate"),
    partner1FullName: z.string().min(1, "Partner 1 full name is required"),
    partner1Age: z.number().min(18, "Must be at least 18 years old"),
    partner1Nationality: z.string().min(1, "Partner 1 nationality is required"),
    partner1Occupation: z.string().optional(),
    partner2FullName: z.string().min(1, "Partner 2 full name is required"),
    partner2Age: z.number().min(18, "Must be at least 18 years old"),
    partner2Nationality: z.string().min(1, "Partner 2 nationality is required"),
    partner2Occupation: z.string().optional(),
    marriageDate: z.string().min(1, "Marriage date is required"),
    marriagePlace: z.string().min(1, "Marriage place is required"),
    marriageType: z.enum(["Civil", "Religious", "Customary"]),
    officiantName: z.string().min(1, "Officiant name is required"),
    witness1Name: z.string().min(1, "Witness 1 name is required"),
    witness2Name: z.string().min(1, "Witness 2 name is required"),
    registrationNumber: z.string().min(1, "Registration number is required"),
    registrationDate: z.string().min(1, "Registration date is required")
});
export const divorceCertificateSchema = z.object({
    documentType: z.literal("divorce_certificate"),
    husband: z.object({
        fullName: z.string().min(1, "Husband's full name is required"),
        idNumber: z.string().optional(),
        nationality: z.string().min(1, "Husband's nationality is required")
    }),
    wife: z.object({
        fullName: z.string().min(1, "Wife's full name is required"),
        idNumber: z.string().optional(),
        nationality: z.string().min(1, "Wife's nationality is required")
    }),
    marriageDate: z.string().min(1, "Marriage date is required"),
    marriageCertificateNumber: z.string().min(1, "Marriage certificate number is required"),
    divorceDate: z.string().min(1, "Divorce date is required"),
    divorceCourt: z.string().min(1, "Divorce court is required"),
    divorceDecreeNumber: z.string().min(1, "Divorce decree number is required"),
    groundsForDivorce: z.string().min(1, "Grounds for divorce are required")
});
const employerDetailsSchema = z.object({
    name: z.string().min(1, "Employer name is required"),
    address: z.string().min(1, "Employer address is required"),
    registrationNumber: z.string().min(1, "Registration number is required"),
    taxNumber: z.string().min(1, "Tax number is required"),
    contactPerson: z.string().min(1, "Contact person is required")
});
export const generalWorkVisaSchema = z.object({
    documentType: z.literal("general_work_visa"),
    personal: personalDetailsSchema,
    permitNumber: z.string().min(1, "Permit number is required"),
    employer: employerDetailsSchema,
    occupation: z.string().min(1, "Occupation is required"),
    jobTitle: z.string().min(1, "Job title is required"),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required"),
    conditions: z.array(z.string()).optional(),
    portOfEntry: z.string().min(1, "Port of entry is required")
});
export const criticalSkillsWorkVisaSchema = z.object({
    documentType: z.literal("critical_skills_work_visa"),
    personal: personalDetailsSchema,
    permitNumber: z.string().min(1, "Permit number is required"),
    criticalSkillArea: z.string().min(1, "Critical skill area is required"),
    qualifications: z.array(z.object({
        degree: z.string(),
        institution: z.string(),
        year: z.string(),
        country: z.string()
    })).min(1, "At least one qualification is required"),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required"),
    conditions: z.array(z.string()).optional()
});
export const intraCompanyTransferWorkVisaSchema = z.object({
    documentType: z.literal("intra_company_transfer_work_visa"),
    personal: personalDetailsSchema,
    permitNumber: z.string().min(1, "Permit number is required"),
    parentCompany: employerDetailsSchema,
    subsidiaryCompany: employerDetailsSchema,
    transferPosition: z.string().min(1, "Transfer position is required"),
    transferDuration: z.string().min(1, "Transfer duration is required"),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required")
});
export const businessVisaSchema = z.object({
    documentType: z.literal("business_visa"),
    personal: personalDetailsSchema,
    permitNumber: z.string().min(1, "Permit number is required"),
    businessType: z.string().min(1, "Business type is required"),
    investmentAmount: z.string().min(1, "Investment amount is required"),
    businessPlan: z.string().min(1, "Business plan is required"),
    jobsToBeCreated: z.number().min(1, "Number of jobs to be created is required"),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required")
});
export const studyVisaPermitSchema = z.object({
    documentType: z.literal("study_visa_permit"),
    personal: personalDetailsSchema,
    permitNumber: z.string().min(1, "Permit number is required"),
    institution: z.object({
        name: z.string().min(1, "Institution name is required"),
        address: z.string().min(1, "Institution address is required"),
        registrationNumber: z.string().min(1, "Institution registration number is required")
    }),
    course: z.string().min(1, "Course/qualification is required"),
    studyLevel: z.enum(["Certificate", "Diploma", "Degree", "Postgraduate"]),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required")
});
export const visitorVisaSchema = z.object({
    documentType: z.literal("visitor_visa"),
    personal: personalDetailsSchema,
    visaNumber: z.string().min(1, "Visa number is required"),
    purposeOfVisit: z.string().min(1, "Purpose of visit is required"),
    durationOfStay: z.string().min(1, "Duration of stay is required"),
    accommodation: z.string().min(1, "Accommodation details are required"),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required"),
    numberOfEntries: z.enum(["Single", "Multiple"])
});
export const medicalTreatmentVisaSchema = z.object({
    documentType: z.literal("medical_treatment_visa"),
    personal: personalDetailsSchema,
    visaNumber: z.string().min(1, "Visa number is required"),
    medicalCondition: z.string().min(1, "Medical condition is required"),
    treatingHospital: z.string().min(1, "Treating hospital is required"),
    estimatedTreatmentDuration: z.string().min(1, "Estimated treatment duration is required"),
    accompanyingPersons: z.array(z.string()).optional(),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required")
});
export const retiredPersonVisaSchema = z.object({
    documentType: z.literal("retired_person_visa"),
    personal: personalDetailsSchema,
    visaNumber: z.string().min(1, "Visa number is required"),
    retirementDate: z.string().min(1, "Retirement date is required"),
    monthlyIncome: z.string().min(1, "Monthly income proof is required"),
    pensionFundDetails: z.string().min(1, "Pension fund details is required"),
    medicalAidCover: z.string().min(1, "Medical aid cover is required"),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required")
});
export const exchangeVisaSchema = z.object({
    documentType: z.literal("exchange_visa"),
    personal: personalDetailsSchema,
    visaNumber: z.string().min(1, "Visa number is required"),
    exchangeProgram: z.string().min(1, "Exchange program is required"),
    hostInstitution: z.string().min(1, "Host institution is required"),
    sponsoringOrganization: z.string().min(1, "Sponsoring organization is required"),
    programDuration: z.string().min(1, "Program duration is required"),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required")
});
export const relativesVisaSchema = z.object({
    documentType: z.literal("relatives_visa"),
    personal: personalDetailsSchema,
    visaNumber: z.string().min(1, "Visa number is required"),
    relationship: z.string().min(1, "Relationship to SA citizen/resident is required"),
    sponsor: z.object({
        fullName: z.string().min(1, "Sponsor full name is required"),
        idNumber: z.string().min(1, "Sponsor ID number is required"),
        relationship: z.string().min(1, "Relationship to applicant is required"),
        address: z.string().min(1, "Sponsor address is required"),
        contactNumber: z.string().min(1, "Sponsor contact number is required")
    }),
    validFrom: z.string().min(1, "Valid from date is required"),
    validUntil: z.string().min(1, "Valid until date is required")
});
export const permanentResidencePermitSchema = z.object({
    documentType: z.literal("permanent_residence_permit"),
    personal: personalDetailsSchema,
    permitNumber: z.string().min(1, "Permit number is required"),
    categoryOfAdmission: z.string().min(1, "Category of admission is required"),
    dateOfAdmission: z.string().min(1, "Date of admission is required"),
    conditions: z.array(z.string()).optional(),
    issuingDate: z.string().min(1, "Issuing date is required"),
    issuingOffice: z.string().min(1, "Issuing office is required"),
    previousPermitNumber: z.string().optional()
});
export const certificateOfExemptionSchema = z.object({
    documentType: z.literal("certificate_of_exemption"),
    referenceNumber: z.string().min(1, "Reference number is required"),
    fileNumber: z.string().min(1, "File number is required"),
    districtOffice: z.object({
        name: z.string().min(1, "District office name is required"),
        address: z.string().min(1, "District office address is required"),
        postalCode: z.string().min(1, "Postal code is required")
    }),
    exemptionDetails: z.object({
        actReference: z.string().default("Section 6(2) of Act No.88 of 1995"),
        exemptionText: z.string().min(1, "Exemption text is required"),
        conditions: z.array(z.string()).optional(),
        validityPeriod: z.string().optional()
    }),
    exemptedPerson: z.object({
        fullName: z.string().min(1, "Full name is required"),
        dateOfBirth: z.string().min(1, "Date of birth is required"),
        identityNumber: z.string().optional(),
        nationality: z.string().min(1, "Nationality is required"),
        address: z.string().optional()
    }),
    issuingDate: z.string().min(1, "Issuing date is required"),
    directorGeneral: z.object({
        name: z.string().min(1, "Director-General name is required"),
        signature: z.string().optional(),
        date: z.string().min(1, "Signature date is required")
    })
});
export const certificateOfSouthAfricanCitizenshipSchema = z.object({
    documentType: z.literal("certificate_of_south_african_citizenship"),
    certificateNumber: z.string().min(1, "Certificate number is required"),
    referenceNumber: z.string().min(1, "Reference number is required"),
    legalReference: z.string().default("Section 10, South African Citizenship Act 1995"),
    certificateText: z.object({
        purposeStatement: z.string().default("This certificate is issued for the sole purpose of indicating the status of the person concerned on the date of issue"),
        certificationText: z.string().min(1, "Certification text is required"),
        citizenshipType: z.enum(["birth", "descent", "naturalisation"]).default("birth")
    }),
    holder: z.object({
        fullName: z.string().min(1, "Full name is required"),
        placeOfBirth: z.string().min(1, "Place of birth is required"),
        dateOfBirth: z.string().min(1, "Date of birth is required"),
        identityNumber: z.string().min(1, "Identity number is required"),
        particulars: z.string().optional(),
        gender: z.enum(["Male", "Female"]).optional()
    }),
    ministerialAuthorization: z.object({
        byOrderOfMinister: z.string().default("By order of the Minister"),
        directorGeneralName: z.string().default("Director-General: Home Affairs"),
        signature: z.string().optional(),
        officialStamp: z.boolean().default(true)
    }),
    issuingDate: z.string().min(1, "Issuing date is required"),
    issuingOffice: z.string().min(1, "Issuing office is required")
});
export const documentGenerationRequestSchema = z.discriminatedUnion("documentType", [
    smartIdCardSchema,
    identityDocumentBookSchema,
    temporaryIdCertificateSchema,
    southAfricanPassportSchema,
    emergencyTravelCertificateSchema,
    refugeeTravelDocumentSchema,
    birthCertificateSchema,
    deathCertificateSchema,
    marriageCertificateSchema,
    divorceCertificateSchema,
    generalWorkVisaSchema,
    criticalSkillsWorkVisaSchema,
    intraCompanyTransferWorkVisaSchema,
    businessVisaSchema,
    studyVisaPermitSchema,
    visitorVisaSchema,
    medicalTreatmentVisaSchema,
    retiredPersonVisaSchema,
    exchangeVisaSchema,
    relativesVisaSchema,
    permanentResidencePermitSchema,
    certificateOfExemptionSchema,
    certificateOfSouthAfricanCitizenshipSchema
]);
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
    certificate_of_south_african_citizenship: certificateOfSouthAfricanCitizenshipSchema
};
export const raesaUltraProfiles = pgTable("raeesa_ultra_profiles", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    email: varchar("email", { length: 255 }).notNull().unique(),
    biometricHash: text("biometric_hash").notNull(),
    biometricType: ultraBiometricTypeEnum("biometric_type").notNull().default("multi_factor"),
    accessLevel: accessLevelEnum("access_level").notNull().default("raeesa_only"),
    securityClearance: securityClearanceEnum("security_clearance").notNull().default("ultra_classified"),
    unlimitedAccess: boolean("unlimited_access").notNull().default(true),
    lastBiometricScan: timestamp("last_biometric_scan").notNull().defaultNow(),
    continuousMonitoring: boolean("continuous_monitoring").notNull().default(true),
    monitoringInterval: integer("monitoring_interval").notNull().default(30),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow()
});
export const aiBotSessions = pgTable("ai_bot_sessions", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    aiMode: aiModeEnum("ai_mode").notNull(),
    sessionActive: boolean("session_active").notNull().default(true),
    unlimitedCapabilities: boolean("unlimited_capabilities").notNull().default(true),
    censorshipDisabled: boolean("censorship_disabled").notNull().default(true),
    militaryGradeAccess: boolean("military_grade_access").notNull().default(true),
    resourceLimits: jsonb("resource_limits").default(sql `'{"unlimited": true}'`),
    currentTask: text("current_task"),
    taskProgress: jsonb("task_progress"),
    sessionMetadata: jsonb("session_metadata"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    updated_at: timestamp("updated_at").notNull().defaultNow()
});
export const biometricMonitoring = pgTable("biometric_monitoring", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    profileId: varchar("profile_id").notNull(),
    scanResult: jsonb("scan_result").notNull(),
    confidence: decimal("confidence", { precision: 5, scale: 2 }).notNull(),
    verified: boolean("verified").notNull(),
    threat_detected: boolean("threat_detected").notNull().default(false),
    scan_timestamp: timestamp("scan_timestamp").notNull().defaultNow(),
    response_time: integer("response_time"),
    biometric_data: text("biometric_data"),
});
export const web3Integration = pgTable("web3_integration", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    walletAddress: varchar("wallet_address", { length: 42 }).notNull(),
    blockchain: blockchainNetworkEnum("blockchain").notNull().default("ethereum"),
    privateKey: text("private_key"),
    smartContractAddress: varchar("smart_contract_address", { length: 42 }),
    transactionHash: varchar("transaction_hash", { length: 66 }),
    transactionStatus: transactionStatusEnum("transaction_status").notNull().default("pending"),
    gasUsed: bigint("gas_used", { mode: "number" }),
    gasPrice: bigint("gas_price", { mode: "number" }),
    blockNumber: bigint("block_number", { mode: "number" }),
    contractInteraction: jsonb("contract_interaction"),
    created_at: timestamp("created_at").notNull().defaultNow()
});
export const securityBotOperations = pgTable("security_bot_operations", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    operation_type: varchar("operation_type", { length: 100 }).notNull(),
    threat_level: riskLevelEnum("threat_level").notNull(),
    auto_fix_applied: boolean("auto_fix_applied").notNull().default(false),
    fix_description: text("fix_description"),
    system_state_before: jsonb("system_state_before"),
    system_state_after: jsonb("system_state_after"),
    detection_method: varchar("detection_method", { length: 100 }),
    response_time: integer("response_time"),
    success_rate: decimal("success_rate", { precision: 5, scale: 2 }),
    escalation_required: boolean("escalation_required").notNull().default(false),
    operation_log: jsonb("operation_log"),
    executed_at: timestamp("executed_at").notNull().defaultNow()
});
export const resourceAccessControl = pgTable("resource_access_control", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    resourceType: varchar("resource_type", { length: 100 }).notNull(),
    accessLevel: accessLevelEnum("access_level").notNull().default("ultra"),
    unlimited: boolean("unlimited").notNull().default(true),
    permissions: jsonb("permissions").notNull(),
    usage_metrics: jsonb("usage_metrics"),
    last_accessed: timestamp("last_accessed").notNull().defaultNow(),
    access_count: integer("access_count").notNull().default(0),
    restrictions_disabled: boolean("restrictions_disabled").notNull().default(true),
    granted_at: timestamp("granted_at").notNull().defaultNow()
});
export const aiCommandInterface = pgTable("ai_command_interface", {
    id: varchar("id").primaryKey().default(sql `gen_random_uuid()`),
    userId: varchar("user_id").notNull(),
    command: text("command").notNull(),
    ai_response: text("ai_response"),
    command_type: varchar("command_type", { length: 50 }).notNull(),
    execution_status: varchar("execution_status", { length: 50 }).notNull().default("pending"),
    unlimited_mode: boolean("unlimited_mode").notNull().default(true),
    censorship_bypassed: boolean("censorship_bypassed").notNull().default(true),
    processing_time: integer("processing_time"),
    complexity_score: integer("complexity_score"),
    resources_used: jsonb("resources_used"),
    created_at: timestamp("created_at").notNull().defaultNow(),
    completed_at: timestamp("completed_at")
});
export const raesaUltraProfileInsertSchema = z.object({
    email: z.string().email(),
    biometricHash: z.string(),
    biometricType: z.enum(['facial', 'fingerprint', 'voice', 'retinal', 'multi_factor']).default('multi_factor'),
    accessLevel: z.enum(['standard', 'elevated', 'ultra', 'raeesa_only']).default('raeesa_only'),
    securityClearance: z.enum(['public', 'restricted', 'confidential', 'secret', 'top_secret', 'ultra_classified']).default('ultra_classified'),
    unlimitedAccess: z.boolean().default(true),
    continuousMonitoring: z.boolean().default(true),
    monitoringInterval: z.number().default(30)
});
export const aiBotSessionInsertSchema = z.object({
    userId: z.string(),
    aiMode: z.enum(['assistant', 'agent', 'security_bot']),
    sessionActive: z.boolean().default(true),
    unlimitedCapabilities: z.boolean().default(true),
    censorshipDisabled: z.boolean().default(true),
    militaryGradeAccess: z.boolean().default(true),
    resourceLimits: z.any().default({ unlimited: true }),
    currentTask: z.string().optional(),
    taskProgress: z.any().optional(),
    sessionMetadata: z.any().optional()
});
export const web3IntegrationInsertSchema = z.object({
    userId: z.string(),
    walletAddress: z.string().length(42),
    blockchain: z.enum(['ethereum', 'polygon', 'bsc', 'arbitrum', 'optimism']).default('ethereum'),
    privateKey: z.string().optional(),
    smartContractAddress: z.string().length(42).optional(),
    transactionHash: z.string().length(66).optional(),
    transactionStatus: z.enum(['pending', 'confirmed', 'failed', 'cancelled']).default('pending'),
    gasUsed: z.number().optional(),
    gasPrice: z.number().optional(),
    blockNumber: z.number().optional(),
    contractInteraction: z.any().optional()
});
export const aiCommandInterfaceInsertSchema = z.object({
    userId: z.string(),
    command: z.string(),
    ai_response: z.string().optional(),
    command_type: z.string(),
    execution_status: z.string().default('pending'),
    unlimited_mode: z.boolean().default(true),
    censorship_bypassed: z.boolean().default(true),
    processing_time: z.number().optional(),
    complexity_score: z.number().optional(),
    resources_used: z.any().optional()
});
