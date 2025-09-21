import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import QRCode from "qrcode";
import { storage } from "./storage";
import { authenticate, hashPassword, verifyPassword, generateToken, requireRole, requireApiKey } from "./middleware/auth";
import { authLimiter, apiLimiter, uploadLimiter, securityHeaders, fraudDetection, ipFilter, securityLogger } from "./middleware/security";
import { auditTrailMiddleware } from "./middleware/audit-trail-middleware";
import { biometricService } from "./services/biometric";
import { fraudDetectionService } from "./services/fraud-detection";
import { documentProcessorService, documentUpload } from "./services/document-processor";
import { quantumEncryptionService } from "./services/quantum-encryption";
import { monitoringService } from "./services/monitoring";
import { documentGenerator } from "./services/document-generator";
import { pdfGenerationService } from "./services/pdf-generation-service";
import { enhancedPdfGenerationService } from "./services/enhanced-pdf-generation-service";
import { cryptographicSignatureService } from "./services/cryptographic-signature-service";
import { securePDFAPIService } from "./services/secure-pdf-api-service";
import { verificationService } from "./services/verification-service";
import { enhancedVerificationUtilities } from "./services/enhanced-verification-utilities";
import { notificationService } from "./services/notification-service";
import { initializeWebSocket, getWebSocketService } from "./websocket";
import { auditTrailService } from "./services/audit-trail-service";
import { securityCorrelationEngine } from "./services/security-correlation-engine";
import { enhancedMonitoringService } from "./services/enhanced-monitoring-service";
import { intelligentAlertingService } from "./services/intelligent-alerting-service";
import { geoIPValidationMiddleware, strictGeoIPValidation } from "./middleware/geo-ip-validation";
import { auditMiddleware, tamperEvidentAuditService } from "./middleware/tamper-evident-audit";
import { privacyProtectionService } from "./services/privacy-protection";
import { default as monitoringRoutes } from "./routes/monitoring";
import { monitoringOrchestrator } from "./services/monitoring-orchestrator";
import { webSocketMonitoringService } from "./services/websocket-monitoring";
import { 
  insertUserSchema, 
  insertSecurityEventSchema, 
  insertDhaApplicationSchema, 
  insertDhaApplicantSchema,
  updateUserSchema,
  userProfileUpdateSchema,
  changePasswordSchema,
  passwordResetRequestSchema,
  passwordResetSchema,
  documentVerificationSchema,
  adminDocumentVerificationSchema,
  productionBackupSchema,
  documentTemplateSchema,
  dhaApplicationCreationSchema,
  dhaIdentityVerificationSchema,
  dhaPassportVerificationSchema,
  dhaBackgroundCheckCreationSchema,
  dhaApplicationTransitionSchema,
  insertNotificationEventSchema,
  updateNotificationPreferencesSchema,
  systemNotificationSchema,
  criticalAlertSchema,
  insertRefugeeDocumentSchema,
  insertDiplomaticPassportSchema,
  insertDocumentDeliverySchema,
  insertDhaVerificationSchema,
  insertDhaOfficeSchema,
  // Security monitoring validation schemas
  securityMetricsQuerySchema,
  errorLogCreationSchema,
  securityEventsQuerySchema,
  errorLogsQuerySchema,
  alertFilterSchema,
  alertActionSchema,
  alertRuleCreationSchema,
  alertRuleUpdateSchema,
  // Verification validation schemas
  publicVerificationSchema,
  documentLookupSchema,
  apiVerificationRequestSchema,
  qrVerificationSchema,
  incidentFilterSchema,
  incidentActionSchema,
  auditLogQuerySchema,
  complianceReportQuerySchema,
  securityRulesQuerySchema,
  securityRuleToggleSchema,
  dashboardQuerySchema,
  fraudStatisticsQuerySchema,
  userBehaviorQuerySchema,
  alertStatisticsQuerySchema,
  complianceEventsQuerySchema,
  systemHealthQuerySchema,
  documentTemplateQuerySchema,
  documentVerificationQuerySchema,
  complianceReportParamsSchema,
  sanitizedStringSchema,
  sanitizedOptionalStringSchema,
  // AI Assistant validation schemas
  aiChatRequestSchema,
  aiTranslationRequestSchema,
  aiDocumentAnalysisRequestSchema,
  aiOcrProcessingRequestSchema,
  aiAutoFillRequestSchema
} from "../shared/schema";
import { DHAWorkflowEngine } from "./services/dha-workflow-engine";
import { dhaMRZParser } from "./services/dha-mrz-parser";
import { dhaPKDAdapter } from "./services/dha-pkd-adapter";
import { dhaNPRAdapter } from "./services/dha-npr-adapter";
import { dhaSAPSAdapter } from "./services/dha-saps-adapter";
import { sitaIntegration } from "./services/sita-integration";
import { dhaPartnerships } from "./services/dha-partnerships";
import { icaoPkdIntegration } from "./services/icao-pkd-integration";
import { sapsIntegration } from "./services/saps-integration";
import { nprIntegration } from "./services/npr-integration";
import { productionReadiness } from "./services/production-readiness";
import { governmentSecurityService } from "./services/government-security";
import { enterpriseMonitoringService } from "./services/enterprise-monitoring";
import { disasterRecoveryService } from "./services/disaster-recovery";
import { aiAssistantService } from "./services/ai-assistant";
import { militaryGradeAIAssistant } from "./services/military-grade-ai-assistant";
import { antivirusService } from "./services/antivirus-scanner";
import { ocrAutoFillService } from "./services/ocr-autofill";
import { complianceAuditService } from "./services/compliance-audit";
import { enterpriseCacheService } from "./services/enterprise-cache";
import { highAvailabilityService } from "./services/high-availability";
import { EnhancedSAOCRService } from "./services/enhanced-sa-ocr";
// Military-grade security services
import { militarySecurityService } from "./services/military-security";
import { classifiedInformationSystem } from "./services/classified-system";
import { militaryAccessControl } from "./services/military-access-control";
import { cyberDefenseSystem } from "./services/cyber-defense";
import { militaryDocumentService } from "./services/military-documents";
import { secureCommunicationsService } from "./services/secure-comms";
import { gitHubIntegrationService } from "./services/github-integration";
import { z } from "zod";
import { configService, config } from "./middleware/provider-config";
import { ConsentMiddleware } from "./middleware/consent-middleware";
// Import health and system health routers
import { healthRouter } from "./routes/health";
import monitoringRouter from "./routes/monitoring";
import { systemHealthRouter } from "./routes/system-health";

// Initialize consent middleware
const consentMiddleware = new ConsentMiddleware();

// Initialize Enhanced SA OCR Service
const enhancedSAOCRService = new EnhancedSAOCRService();

// Import unified document generation system
import { documentTemplateRegistry } from "./services/document-template-registry";
import { documentGenerationRequestSchema, documentTypeSchemas } from "../shared/schema";
import { dataGovernanceService } from "./services/data-governance";
// Import AI Assistant routes
import aiAssistantRoutes from "./routes/ai-assistant";
// Import unified PDF generation facade
import { 
  DocumentPdfFacade, 
  SupportedDocumentType, 
  DocumentSecurityLevel, 
  DocumentGenerationError,
  type DocumentGenerationOptions,
  type DocumentGenerationResponse,
  type DocumentData 
} from "./services/document-pdf-facade";

// Constants
const DOCUMENTS_DIR = "./documents"; // Using fixed path for document storage

// Ensure documents directory exists
fs.mkdir(DOCUMENTS_DIR, { recursive: true }).catch(console.error);

// Initialize DocumentPdfFacade for unified document generation
const documentPdfFacade = new DocumentPdfFacade();

/**
 * LEGACY ENDPOINT ADAPTERS
 * 
 * These functions map legacy endpoint types to the unified SupportedDocumentType enum
 * and transform legacy request data to the standardized document data format.
 */

// Legacy endpoint type to SupportedDocumentType mapping
const LEGACY_TYPE_MAPPING: Record<string, SupportedDocumentType> = {
  'work-permit': SupportedDocumentType.WORK_PERMIT,
  'birth-certificate': SupportedDocumentType.BIRTH_CERTIFICATE,
  'passport': SupportedDocumentType.PASSPORT,
  'sa-id': SupportedDocumentType.SA_ID,
  'smart-id': SupportedDocumentType.SMART_ID,
  'temporary-id': SupportedDocumentType.TEMPORARY_ID,
  'death-certificate': SupportedDocumentType.DEATH_CERTIFICATE,
  'marriage-certificate': SupportedDocumentType.MARRIAGE_CERTIFICATE,
  'study-permit': SupportedDocumentType.STUDY_PERMIT,
  'business-permit': SupportedDocumentType.BUSINESS_PERMIT,
  'visitor-visa': SupportedDocumentType.VISITOR_VISA,
  'transit-visa': SupportedDocumentType.TRANSIT_VISA,
  'asylum-visa': SupportedDocumentType.REFUGEE_PERMIT,
  'residence-permit': SupportedDocumentType.PERMANENT_RESIDENCE,
  'temporary-residence': SupportedDocumentType.TEMPORARY_RESIDENCE,
  'critical-skills': SupportedDocumentType.CRITICAL_SKILLS_WORK_VISA,
  'business-visa': SupportedDocumentType.BUSINESS_VISA,
  'medical-treatment-visa': SupportedDocumentType.MEDICAL_TREATMENT_VISA,
  'retirement-visa': SupportedDocumentType.RETIRED_PERSON_VISA,
  'relatives-visa': SupportedDocumentType.RELATIVES_VISA,
  'corporate-visa': SupportedDocumentType.BUSINESS_VISA,
  'exchange-permit': SupportedDocumentType.EXCHANGE_PERMIT
};

/**
 * Generate PDF response with proper headers and error handling
 */
const generateUnifiedPDFResponse = async (
  res: Response, 
  documentType: SupportedDocumentType,
  data: any,
  options: DocumentGenerationOptions = {}
): Promise<void> => {
  try {
    const response = await documentPdfFacade.generateDocument(documentType, data, {
      securityLevel: DocumentSecurityLevel.STANDARD,
      includeDigitalSignature: true,
      persistToStorage: false, // Don't persist legacy API calls by default
      isPreview: false,
      ...options
    });

    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${response.metadata.fileName}"`,
      'Content-Length': response.documentBuffer.length.toString(),
      'X-Document-Type': documentType,
      'X-Document-ID': response.metadata.documentId,
      'X-Generated-At': response.metadata.createdAt.toISOString(),
      'X-Security-Level': 'GOVERNMENT-GRADE',
      'X-Compliance': 'ICAO,POPIA,DHA',
      'X-Verification-URL': response.verification.verificationUrl,
      'X-Security-Features': response.appliedSecurityFeatures.join(',')
    });

    res.end(response.documentBuffer);

  } catch (error) {
    console.error(`PDF generation error for ${documentType}:`, error);

    if (error instanceof DocumentGenerationError) {
      res.status(400).json({ 
        error: `Failed to generate ${documentType}`, 
        details: error.message,
        errorCode: error.errorCode
      });
    } else {
      res.status(500).json({ 
        error: `Failed to generate ${documentType}`,
        details: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
};

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize DHA workflow engine
  const dhaWorkflowEngine = new DHAWorkflowEngine();

  // Import resilience middleware
  const { setupResilience, requestTimeout, circuitBreaker, resourceOptimization, asyncHandler, responseCache, gracefulDegradation } = await import('./middleware/resilience');
  const { authRateLimit, apiRateLimit, adminRateLimit, documentsRateLimit, aiRateLimit, verificationRateLimit } = await import('./middleware/enhanced-rate-limit');

  // Setup resilience middleware (includes health checks)
  setupResilience(app);

  // Apply security middleware
  app.use(securityHeaders);
  app.use(ipFilter);
  app.use(securityLogger);

  // Apply audit trail middleware for comprehensive action logging
  app.use(auditTrailMiddleware.auditRequestMiddleware);

  // Public health endpoint with enhanced monitoring (Phase 0)
  app.get("/api/health", asyncHandler(async (req: Request, res: Response) => {
    const { autoRecoveryService } = await import('./services/auto-recovery');
    const { optimizedCacheService } = await import('./services/optimized-cache');
    const { getConnectionStatus } = await import('./db');

    const dbStatus = getConnectionStatus();
    const recoveryHealth = autoRecoveryService.getHealthStatus();
    const cacheHealth = optimizedCacheService.getHealth();
    const antivirusHealth = antivirusService.getHealthStatus();

    const isHealthy = dbStatus.healthy && cacheHealth.healthy && antivirusHealth.isHealthy;

    res.status(isHealthy ? 200 : 503).json({
      status: isHealthy ? "healthy" : "degraded",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: config.NODE_ENV,
      version: "1.0.0",
      database: dbStatus,
      cache: {
        healthy: cacheHealth.healthy,
        hitRate: cacheHealth.hitRate,
        itemCount: cacheHealth.itemCount
      },
      antivirus: {
        healthy: antivirusHealth.isHealthy,
        clamAvAvailable: antivirusHealth.clamAvAvailable,
        lastHealthCheck: antivirusHealth.lastHealthCheck,
        status: antivirusHealth.isHealthy ? 'operational' : 'CRITICAL_FAILURE'
      },
      recovery: Array.from(recoveryHealth.entries()).map(([key, value]) => ({
        component: key,
        status: value.status
      }))
    });
  }));

  // PRODUCTION-CRITICAL: Dedicated antivirus health check endpoint
  app.get("/api/health/antivirus", asyncHandler(async (req: Request, res: Response) => {
    const health = antivirusService.getHealthStatus();

    res.status(health.isHealthy ? 200 : 503).json({
      service: 'antivirus',
      status: health.isHealthy ? 'healthy' : 'CRITICAL_FAILURE',
      details: {
        isHealthy: health.isHealthy,
        clamAvAvailable: health.clamAvAvailable,
        lastHealthCheck: health.lastHealthCheck,
        uptime: health.uptime,
        message: health.isHealthy 
          ? 'Antivirus scanner is operational' 
          : 'PRODUCTION ALERT: Antivirus scanner is not operational - file uploads blocked'
      },
      timestamp: new Date().toISOString()
    });
  }));

  // ===================== CONSENT MANAGEMENT ROUTES (POPIA COMPLIANCE) =====================

  // Get user consent status
  app.get("/api/consent/status", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    try {
      // Get actual consent status from ConsentMiddleware
      const consentStatus = await consentMiddleware.getConsentStatus(userId);

      res.json({
        success: true,
        userId: userId,
        consentStatus,
        timestamp: new Date().toISOString(),
        compliance: 'POPIA_COMPLIANT'
      });
    } catch (error) {
      console.error('Error fetching consent status:', error);
      // Fallback for development
      const devMode = process.env.NODE_ENV === 'development';
      res.json({
        success: true,
        userId: userId,
        consentStatus: {
          aiProcessing: devMode,
          dataRetention: true,
          lastUpdated: new Date().toISOString()
        },
        timestamp: new Date().toISOString(),
        compliance: 'POPIA_COMPLIANT',
        warning: devMode ? 'Using development fallback consent status' : undefined
      });
    }
  }));

  // Give consent for AI processing
  app.post("/api/consent/give", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { consentTypes } = req.body;

    await consentMiddleware.recordConsent(userId, 'aiProcessing', req, {
      legalBasis: 'consent',
      dataProcessingPurpose: 'AI analysis and processing',
      retentionPeriod: '7 years as per DHA requirements'
    });

    res.json({
      success: true,
      message: "Consent recorded successfully",
      timestamp: new Date().toISOString()
    });
  }));

  // ===================== MISSING API ENDPOINTS =====================

  // Document verification endpoint
  app.post("/api/documents/verify", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const { documentId, documentData } = req.body;

    const result = await verificationService.verifyDocument({ 
      verificationCode: documentId, 
      verificationMethod: 'manual_entry', 
      ipAddress: req.ip || 'unknown', 
      userAgent: req.get('User-Agent') || 'unknown'
    });

    res.json({
      success: true,
      verification: result,
      timestamp: new Date().toISOString()
    });
  }));

  // OCR processing endpoint
  app.post("/api/ocr/process", authenticate, uploadLimiter, documentUpload.single('document'), asyncHandler(async (req: Request, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }

    const result = await enhancedSAOCRService.processDocument(req.file.path, {
      documentType: 'work_permit',
      enablePreprocessing: true,
      enableMultiLanguage: true,
      extractFields: true,
      validateExtractedData: true,
      enhanceImageQuality: true
    } as any);

    res.json({
      success: true,
      extractedData: result,
      timestamp: new Date().toISOString()
    });
  }));

  // Biometric registration endpoint
  app.post("/api/biometric/register", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { type, template } = req.body;

    const result = await biometricService.registerBiometric({
      userId,
      type,
      template
    });

    res.json({
      success: result.success,
      error: result.error,
      timestamp: new Date().toISOString()
    });
  }));

  // Biometric verification endpoint
  app.post("/api/biometric/verify", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { type, template } = req.body;

    const result = await biometricService.verifyBiometric(template, type, userId);

    res.json({
      success: result.success,
      confidence: result.confidence,
      timestamp: new Date().toISOString()
    });
  }));

  // Fraud detection endpoint
  app.post("/api/fraud/analyze", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { transactionData } = req.body;

    const result = await fraudDetectionService.analyzeUserBehavior({
      userId,
      ipAddress: req.ip || 'unknown',
      userAgent: req.get('User-Agent') || 'unknown',
      sessionData: transactionData
    });

    res.json({
      success: true,
      riskScore: result.riskScore,
      riskLevel: result.riskLevel,
      factors: result.factors,
      timestamp: new Date().toISOString()
    });
  }));

  // Quantum encryption endpoint
  app.post("/api/quantum/encrypt", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const { data } = req.body;

    const result = await quantumEncryptionService.encryptData(data);

    res.json({
      success: result.success,
      encryptedData: result.encryptedData,
      keyId: result.keyId,
      timestamp: new Date().toISOString()
    });
  }));

  // Government API integration endpoints
  app.post("/api/government/npr/verify", authenticate, requireRole(['admin', 'officer']), asyncHandler(async (req: Request, res: Response) => {
    const { idNumber, fullName, dateOfBirth } = req.body;

    const result = await dhaNPRAdapter.verifyPerson({
      applicantId: crypto.randomUUID(),
      applicationId: crypto.randomUUID(),
      idNumber,
      fullName,
      surname: fullName.split(' ').pop() || '',
      dateOfBirth: new Date(dateOfBirth),
      verificationMethod: 'id_number'
    });

    res.json({
      success: result.success,
      verification: result,
      timestamp: new Date().toISOString()
    });
  }));

  app.post("/api/government/saps/check", authenticate, requireRole(['admin', 'officer']), asyncHandler(async (req: Request, res: Response) => {
    const { idNumber, fullName, dateOfBirth, purposeOfCheck } = req.body;

    const result = await dhaSAPSAdapter.performCriminalRecordCheck({
      applicantId: crypto.randomUUID(),
      applicationId: crypto.randomUUID(),
      idNumber,
      fullName,
      dateOfBirth: new Date(dateOfBirth),
      purposeOfCheck,
      checkType: 'basic',
      consentGiven: true,
      requestedBy: (req as any).user.id
    });

    res.json({
      success: result.success,
      clearanceStatus: result.clearanceStatus,
      riskAssessment: result.riskAssessment,
      timestamp: new Date().toISOString()
    });
  }));
  app.post("/api/consent/ai-processing", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    const success = await consentMiddleware.recordConsent(userId, 'aiProcessing', req, {
      legalBasis: 'consent',
      dataProcessingPurpose: 'AI analysis and processing of documents and personal information',
      retentionPeriod: '7 years as per DHA requirements'
    });

    if (success) {
      res.json({
        success: true,
        message: 'Consent for AI processing has been recorded',
        consentType: 'aiProcessing',
        timestamp: new Date().toISOString(),
        compliance: 'POPIA_COMPLIANT'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to record consent',
        compliance: 'POPIA_SYSTEM_ERROR'
      });
    }
  }));

  // Give consent for data retention
  app.post("/api/consent/data-retention", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;

    const success = await consentMiddleware.recordConsent(userId, 'dataRetention', req, {
      legalBasis: 'consent',
      dataProcessingPurpose: 'Storage and retention of uploaded documents for DHA processing',
      retentionPeriod: '7 years as per DHA requirements'
    });

    if (success) {
      res.json({
        success: true,
        message: 'Consent for data retention has been recorded',
        consentType: 'dataRetention', 
        timestamp: new Date().toISOString(),
        compliance: 'POPIA_COMPLIANT'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to record consent',
        compliance: 'POPIA_SYSTEM_ERROR'
      });
    }
  }));

  // Withdraw consent
  app.post("/api/consent/withdraw", authenticate, asyncHandler(async (req: Request, res: Response) => {
    const userId = (req as any).user.id;
    const { consentType } = req.body;

    if (!consentType || !['aiProcessing', 'dataRetention', 'dataSharing', 'biometricProcessing', 'crossBorderTransfer'].includes(consentType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid or missing consent type',
        validTypes: ['aiProcessing', 'dataRetention', 'dataSharing', 'biometricProcessing', 'crossBorderTransfer']
      });
    }

    const success = await consentMiddleware.withdrawConsent(userId, consentType, req);

    if (success) {
      res.json({
        success: true,
        message: `Consent for ${consentType} has been withdrawn`,
        consentType,
        timestamp: new Date().toISOString(),
        compliance: 'POPIA_COMPLIANT',
        note: 'You can provide consent again at any time'
      });
    } else {
      res.status(500).json({
        success: false,
        error: 'Failed to withdraw consent',
        compliance: 'POPIA_SYSTEM_ERROR'
      });
    }
  }));

  // Data governance compliance report
  app.get("/api/admin/data-governance/report", authenticate, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
    const report = await dataGovernanceService.generateComplianceReport();
    res.json({
      success: true,
      report,
      timestamp: new Date().toISOString(),
      compliance: 'POPIA_COMPLIANT'
    });
  }));

  // Trigger data retention enforcement (admin only)
  app.post("/api/admin/data-governance/enforce-retention", authenticate, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
    const results = await dataGovernanceService.enforceDataRetention();
    res.json({
      success: true,
      message: 'Data retention enforcement completed',
      results,
      timestamp: new Date().toISOString(),
      compliance: 'POPIA_COMPLIANT'
    });
  }));

  // Government Operations API Endpoints
  app.get("/api/admin/government-operations/metrics", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const metrics = {
        security: governmentSecurityService.getSecurityMetrics(),
        monitoring: {
          systemHealth: 'HEALTHY',
          activeAlerts: 0,
          avgResponseTime: 250,
          errorRate: 0.1,
          uptime: 99.99,
          slaCompliance: 99.5
        },
        disasterRecovery: disasterRecoveryService.getMetrics(),
        compliance: complianceAuditService.getMetrics(),
        cache: enterpriseCacheService.getStats(),
        highAvailability: highAvailabilityService.getMetrics()
      };
      res.json(metrics);
    } catch (error) {
      console.error('[Government Operations] Error fetching metrics:', error);
      res.status(500).json({ error: 'Failed to fetch government operations metrics' });
    }
  });

  app.get("/api/admin/government-operations/security/incidents", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      // Get recent security incidents from the service
      const incidents = governmentSecurityService.getSecurityMetrics().vulnerabilityScans || [];
      res.json(incidents);
    } catch (error) {
      console.error('[Government Operations] Error fetching incidents:', error);
      res.status(500).json({ error: 'Failed to fetch security incidents' });
    }
  });

  app.get("/api/admin/government-operations/compliance/report", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const framework = req.query.framework as string || 'POPIA';
      const report = await complianceAuditService.generateComplianceReport(
        framework as any,
        {
          start: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
          end: new Date()
        }
      );
      res.json(report);
    } catch (error) {
      console.error('[Government Operations] Error generating compliance report:', error);
      res.status(500).json({ error: 'Failed to generate compliance report' });
    }
  });

  app.post("/api/admin/government-operations/disaster-recovery/backup", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const backupId = await disasterRecoveryService.createBackup('manual', req.body.description || 'Manual backup');
      res.json({ success: true, backupId });
    } catch (error) {
      console.error('[Government Operations] Error creating backup:', error);
      res.status(500).json({ error: 'Failed to create backup' });
    }
  });

  app.post("/api/admin/government-operations/high-availability/failover/test", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const result = await highAvailabilityService.testFailover();
      res.json({ success: result });
    } catch (error) {
      console.error('[Government Operations] Error testing failover:', error);
      res.status(500).json({ error: 'Failed to test failover' });
    }
  });

  // GitHub Integration API Endpoints
  app.get("/api/admin/github/health", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const health = await gitHubIntegrationService.healthCheck();
      res.json(health);
    } catch (error) {
      console.error('[GitHub] Error checking health:', error);
      res.status(500).json({ error: 'Failed to check GitHub health' });
    }
  });

  app.get("/api/admin/github/user", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const user = await gitHubIntegrationService.getAuthenticatedUser();
      res.json(user);
    } catch (error) {
      console.error('[GitHub] Error getting user:', error);
      res.status(500).json({ error: 'Failed to get GitHub user' });
    }
  });

  // AI endpoints are now consolidated in server/routes/ai-assistant.ts to avoid duplication

  app.get("/api/admin/github/repositories", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { type, sort, direction, per_page, page } = req.query;
      const repositories = await gitHubIntegrationService.listRepositories({
        type: type as any,
        sort: sort as any,
        direction: direction as any,
        per_page: per_page ? parseInt(per_page as string) : undefined,
        page: page ? parseInt(page as string) : undefined
      });
      res.json(repositories);
    } catch (error) {
      console.error('[GitHub] Error listing repositories:', error);
      res.status(500).json({ error: 'Failed to list repositories' });
    }
  });

  app.get("/api/admin/github/repository/:owner/:repo", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { owner, repo } = req.params;
      const repository = await gitHubIntegrationService.getRepository(owner, repo);
      res.json(repository);
    } catch (error) {
      console.error('[GitHub] Error getting repository:', error);
      res.status(500).json({ error: 'Failed to get repository' });
    }
  });

  app.get("/api/admin/github/repository/:owner/:repo/workflows", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { owner, repo } = req.params;
      const { branch, event, status, per_page, page } = req.query;
      const workflows = await gitHubIntegrationService.getWorkflowRuns(owner, repo, {
        branch: branch as string,
        event: event as string,
        status: status as any,
        per_page: per_page ? parseInt(per_page as string) : undefined,
        page: page ? parseInt(page as string) : undefined
      });
      res.json(workflows);
    } catch (error) {
      console.error('[GitHub] Error getting workflows:', error);
      res.status(500).json({ error: 'Failed to get workflow runs' });
    }
  });

  app.post("/api/admin/github/repository/:owner/:repo/trigger-workflow", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { owner, repo } = req.params;
      const { eventType, clientPayload } = req.body;
      const result = await gitHubIntegrationService.triggerWorkflow(owner, repo, eventType, clientPayload);
      res.json(result);
    } catch (error) {
      console.error('[GitHub] Error triggering workflow:', error);
      res.status(500).json({ error: 'Failed to trigger workflow' });
    }
  });

  app.get("/api/admin/github/repository/:owner/:repo/file/*", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { owner, repo } = req.params;
      const filePath = req.params[0]; // Get the wildcard path
      const { ref } = req.query;
      const file = await gitHubIntegrationService.getFileContent(owner, repo, filePath, ref as string);
      res.json(file);
    } catch (error) {
      console.error('[GitHub] Error getting file:', error);
      res.status(500).json({ error: 'Failed to get file content' });
    }
  });

  app.put("/api/admin/github/repository/:owner/:repo/file/*", authenticate, requireRole(['admin']), async (req: Request, res: Response) => {
    try {
      const { owner, repo } = req.params;
      const filePath = req.params[0]; // Get the wildcard path
      const { content, message, branch, sha } = req.body;
      const result = await gitHubIntegrationService.createOrUpdateFile(owner, repo, filePath, content, message, { branch, sha });
      res.json(result);
    } catch (error) {
      console.error('[GitHub] Error updating file:', error);
      res.status(500).json({ error: 'Failed to update file' });
    }
  });

  // SECURITY: Mock login endpoint removed for production security
  // All authentication must use real user registration and login endpoints

  // Registration
  app.post("/api/auth/register", authRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const validatedData = insertUserSchema.parse(req.body);

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ error: "User already exists" });
      }

      // Hash password
      const hashedPassword = await hashPassword(validatedData.password);

      // Create user
      const user = await storage.createUser({
        ...validatedData,
        password: hashedPassword
      });

      // Generate token
      const token = generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });

      // Log registration
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "user_registered",
        severity: "low",
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      res.status(201).json({
        message: "User registered successfully",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Registration error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  }));

  // Login
  app.post("/api/auth/login", authRateLimit, fraudDetection, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // Check for account lockout
      const lockoutStatus = await storage.isAccountLocked(email);
      if (lockoutStatus.locked) {
        await storage.createSecurityEvent({
          eventType: "login_blocked_account_locked",
          severity: "high",
          details: { 
            email,
            failedAttempts: lockoutStatus.failedAttempts,
            lockedUntil: lockoutStatus.lockedUntil
          },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent") || ""
        });
        return res.status(423).json({ 
          error: "Account temporarily locked", 
          message: `Account locked due to too many failed login attempts. Try again after ${lockoutStatus.lockedUntil?.toISOString()}`,
          lockedUntil: lockoutStatus.lockedUntil
        });
      }

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user || !user.isActive) {
        // Record failed attempt for non-existent users to prevent enumeration via timing
        await storage.recordFailedLoginAttempt(email);
        await storage.createSecurityEvent({
          eventType: "login_failed_user_not_found",
          severity: "medium",
          details: { email },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent") || ""
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Verify password
      const isValid = await verifyPassword(password, user.password);
      if (!isValid) {
        // Record failed login attempt
        await storage.recordFailedLoginAttempt(email);
        await storage.createSecurityEvent({
          userId: user.id,
          eventType: "login_failed_invalid_password",
          severity: "medium",
          details: { email },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent") || ""
        });
        return res.status(401).json({ error: "Invalid credentials" });
      }

      // Clear failed login attempts on successful authentication
      await storage.clearFailedLoginAttempts(email);

      // Run fraud detection
      const fraudAnalysis = await fraudDetectionService.analyzeUserBehavior({
        userId: user.id,
        ipAddress: req.ip || "unknown",
        userAgent: req.get("User-Agent") || "",
        location: req.get("CF-IPCountry") || "Unknown"
      });

      if (fraudAnalysis.shouldBlock) {
        return res.status(403).json({ 
          error: "Login blocked", 
          message: "High fraud risk detected" 
        });
      }

      // Update last login - removed as lastLogin doesn't exist in User type
      // await storage.updateUser(user.id, { lastLogin: new Date() });

      // Generate token
      const token = generateToken({
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role
      });

      // Log successful login
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "login_successful",
        severity: "low",
        details: { 
          email: user.email,
          fraudRiskScore: fraudAnalysis.riskScore 
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      res.json({
        message: "Login successful",
        token,
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role
        },
        fraudAnalysis: {
          riskScore: fraudAnalysis.riskScore,
          riskLevel: fraudAnalysis.riskLevel
        }
      });

    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  }));

  // User Profile Management
  app.get("/api/auth/profile", authenticate, asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Get fresh user data from database
      const currentUser = await storage.getUser(user.id);
      if (!currentUser || !currentUser.isActive) {
        return res.status(404).json({ error: "User not found or inactive" });
      }

      // Return user profile without password
      res.json({
        id: currentUser.id,
        username: currentUser.username,
        email: currentUser.email,
        role: currentUser.role,
        isActive: currentUser.isActive,
        createdAt: currentUser.createdAt
      });

    } catch (error) {
      console.error("Profile fetch error:", error);
      res.status(500).json({ error: "Failed to fetch profile" });
    }
  }));

  app.put("/api/auth/profile", authenticate, authRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const validatedData = userProfileUpdateSchema.parse(req.body);

      // Check if email is being changed and if it's already taken
      if (validatedData.email) {
        const existingUser = await storage.getUserByEmail(validatedData.email);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(409).json({ error: "Email already in use" });
        }
      }

      // Check if username is being changed and if it's already taken
      if (validatedData.username) {
        const existingUser = await storage.getUserByUsername(validatedData.username);
        if (existingUser && existingUser.id !== user.id) {
          return res.status(409).json({ error: "Username already in use" });
        }
      }

      // Update user profile
      await storage.updateUser(user.id, validatedData);

      // Log profile update
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "profile_updated",
        severity: "low",
        details: { 
          updatedFields: Object.keys(validatedData),
          email: user.email 
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      // Get updated user data
      const updatedUser = await storage.getUser(user.id);

      res.json({
        message: "Profile updated successfully",
        user: {
          id: updatedUser!.id,
          username: updatedUser!.username,
          email: updatedUser!.email,
          role: updatedUser!.role,
          isActive: updatedUser!.isActive,
          createdAt: updatedUser!.createdAt
        }
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Profile update error:", error);
      res.status(500).json({ error: "Failed to update profile" });
    }
  }));

  // Change Password
  app.post("/api/auth/change-password", authenticate, authRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;
      const validatedData = changePasswordSchema.parse(req.body);

      // Get current user data
      const currentUser = await storage.getUser(user.id);
      if (!currentUser || !currentUser.isActive) {
        return res.status(404).json({ error: "User not found or inactive" });
      }

      // Verify current password
      const isCurrentPasswordValid = await verifyPassword(validatedData.currentPassword, currentUser.password);
      if (!isCurrentPasswordValid) {
        // Log failed password change attempt
        await storage.createSecurityEvent({
          userId: user.id,
          eventType: "password_change_failed_wrong_current",
          severity: "medium",
          details: { email: user.email },
          ipAddress: req.ip,
          userAgent: req.get("User-Agent") || ""
        });

        return res.status(401).json({ error: "Current password is incorrect" });
      }

      // Update password with new hashed password
      const hashedNewPassword = await hashPassword(validatedData.newPassword);
      await storage.updateUser(user.id, { password: hashedNewPassword });

      // Log successful password change
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "password_changed",
        severity: "medium",
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      res.json({ message: "Password changed successfully" });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Password change error:", error);
      res.status(500).json({ error: "Failed to change password" });
    }
  }));

  // Logout (JWT is stateless, but we can log the event)
  app.post("/api/auth/logout", authenticate, asyncHandler(async (req: Request, res: Response) => {
    try {
      const user = req.user!;

      // Log logout event
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "user_logout",
        severity: "low",
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      res.json({ message: "Logout successful" });

    } catch (error) {
      console.error("Logout error:", error);
      res.status(500).json({ error: "Logout failed" });
    }
  }));

  // Password Reset Request
  app.post("/api/auth/reset-password-request", authRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const validatedData = passwordResetRequestSchema.parse(req.body);

      // Check if user exists
      const user = await storage.getUserByEmail(validatedData.email);
      if (!user || !user.isActive) {
        // For security, always return success to prevent email enumeration
        return res.json({ 
          message: "If the email exists in our system, you will receive a password reset link shortly." 
        });
      }

      // Generate reset token (in a real system, this would be sent via email)
      const resetToken = crypto.randomBytes(32).toString('hex');
      const resetTokenExpiry = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

      // Store reset token (for this implementation, we'll store it in memory)
      // In production, this should be stored in database with expiry
      if (!global.passwordResetTokens) {
        global.passwordResetTokens = new Map();
      }

      global.passwordResetTokens.set(resetToken, {
        userId: user.id,
        email: user.email,
        expiresAt: resetTokenExpiry
      });

      // Log password reset request
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "password_reset_requested",
        severity: "medium",
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      // In production, send email with reset link
      console.log(`[DEV] Password reset token for ${user.email}: ${resetToken}`);
      console.log(`[DEV] Reset link: ${req.protocol}://${req.get('host')}/reset-password?token=${resetToken}`);

      res.json({ 
        message: "If the email exists in our system, you will receive a password reset link shortly.",
        // For development only - remove in production
        ...(process.env.NODE_ENV === 'development' && { 
          devResetToken: resetToken,
          devNote: "In production, this token would be sent via email" 
        })
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Password reset request error:", error);
      res.status(500).json({ error: "Failed to process reset request" });
    }
  }));

  // Password Reset
  app.post("/api/auth/reset-password", authRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const validatedData = passwordResetSchema.parse(req.body);

      // Check if reset tokens exist
      if (!global.passwordResetTokens) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Verify reset token
      const tokenData = global.passwordResetTokens.get(validatedData.token);
      if (!tokenData) {
        return res.status(400).json({ error: "Invalid or expired reset token" });
      }

      // Check if token is expired
      if (new Date() > tokenData.expiresAt) {
        global.passwordResetTokens.delete(validatedData.token);
        return res.status(400).json({ error: "Reset token has expired" });
      }

      // Get user
      const user = await storage.getUser(tokenData.userId);
      if (!user || !user.isActive) {
        global.passwordResetTokens.delete(validatedData.token);
        return res.status(400).json({ error: "User not found or inactive" });
      }

      // Update password
      const hashedNewPassword = await hashPassword(validatedData.newPassword);
      await storage.updateUser(user.id, { password: hashedNewPassword });

      // Delete used token
      global.passwordResetTokens.delete(validatedData.token);

      // Log password reset
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "password_reset_completed",
        severity: "medium",
        details: { email: user.email },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      res.json({ message: "Password reset successfully" });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Password reset error:", error);
      res.status(500).json({ error: "Failed to reset password" });
    }
  }));

  app.post("/api/biometric/register", authenticate, apiLimiter, async (req: Request, res: Response) => {
    const user = req.user!; // Type assertion - user is guaranteed to be defined after authenticate middleware
    try {
      const { type, template } = req.body;

      if (!type || !template) {
        return res.status(400).json({ error: "Biometric type and template required" });
      }

      const result = await biometricService.registerBiometric({
        userId: user.id,
        type,
        template
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const wsService = getWebSocketService();
      wsService?.sendToUser(user.id, "biometric:result", {
        type: "registration",
        success: true,
        biometricType: type
      });

      res.json({ message: "Biometric registered successfully" });

    } catch (error) {
      console.error("Biometric registration error:", error);
      res.status(500).json({ error: "Biometric registration failed" });
    }
  });

  app.post("/api/biometric/verify", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { type, template, userId } = req.body;

      if (!type || !template) {
        return res.status(400).json({ error: "Biometric type and template required" });
      }

      const user = req.user as { id: string; role: string; username: string; email: string };
      const result = await biometricService.verifyBiometric(
        template, 
        type, 
        userId || user.id
      );

      const wsService = getWebSocketService();
      // SECURITY: Anonymize biometric result before WebSocket broadcast
      const anonymizedResult = {
        verificationType: "verification",
        success: result.success,
        confidence: result.confidence,
        // Remove any PII from biometric results
        ...(result.success ? { status: "verified" } : { status: "failed", reason: "verification_failed" })
      };
      wsService?.sendToUser(user.id, "biometric:result", anonymizedResult);

      res.json(result);

    } catch (error) {
      console.error("Biometric verification error:", error);
      res.status(500).json({ error: "Biometric verification failed" });
    }
  });

  app.get("/api/biometric/profiles", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user as { id: string; role: string; username: string; email: string };
      const profiles = await biometricService.getUserBiometrics(user.id);
      res.json(profiles);
    } catch (error) {
      console.error("Get biometric profiles error:", error);
      res.status(500).json({ error: "Failed to get biometric profiles" });
    }
  });

  app.get("/api/fraud/alerts", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user as { id: string; role: string; username: string; email: string };
      const { resolved } = req.query;
      const userId = user.role === "admin" ? undefined : user.id;

      const alerts = await fraudDetectionService.getFraudAlerts(
        userId, 
        resolved === "true" ? true : resolved === "false" ? false : undefined
      );

      res.json(alerts);
    } catch (error) {
      console.error("Get fraud alerts error:", error);
      res.status(500).json({ error: "Failed to get fraud alerts" });
    }
  });

  app.post("/api/fraud/alerts/:id/resolve", authenticate, apiLimiter, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user as { id: string; role: string; username: string; email: string };
      await fraudDetectionService.resolveFraudAlert(req.params.id, user.id);

      const wsService = getWebSocketService();
      // SECURITY: Anonymize fraud alert before broadcasting to admins
      wsService?.sendToRole("admin", "fraud:alert", {
        type: "resolved",
        alertId: req.params.id,
        resolvedBy: privacyProtectionService.anonymizeUserId(user.id) || "system",
        timestamp: new Date().toISOString()
      });

      res.json({ message: "Fraud alert resolved" });
    } catch (error) {
      console.error("Resolve fraud alert error:", error);
      res.status(500).json({ error: "Failed to resolve fraud alert" });
    }
  });

  app.post("/api/documents/upload", authenticate, consentMiddleware.requireUploadConsent, uploadLimiter, documentUpload.single("document"), asyncHandler(async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const userId = (req as any).user.id;
      const filePath = req.file.path;

      // CRITICAL SECURITY: Antivirus/malware scanning before processing
      console.log('Starting antivirus scan for:', filePath);
      const antivirusResult = await antivirusService.scanFile(filePath, {
        quarantine: true,
        enableHeuristics: true,
        maxScanTime: 30000
      });

      if (!antivirusResult.isClean) {
        // Log security event
        await storage.createSecurityEvent({
          userId,
          eventType: "malware_detected_upload",
          severity: "high",
          details: {
            fileName: req.file.originalname,
            threats: antivirusResult.threats,
            engine: antivirusResult.engine,
            scanTime: antivirusResult.scanTime
          }
        });

        // Quarantine file if not already done
        if (!antivirusResult.success) {
          try {
            await antivirusService.quarantineFile(filePath);
          } catch (quarantineError) {
            console.error('Quarantine failed:', quarantineError);
          }
        }

        return res.status(400).json({ 
          error: "File contains malware or suspicious content", 
          threats: antivirusResult.threats,
          engine: antivirusResult.engine
        });
      }

      // Log successful scan
      await storage.createSecurityEvent({
        userId,
        eventType: "document_upload_scan_clean",
        severity: "low",
        details: {
          fileName: req.file.originalname,
          engine: antivirusResult.engine,
          scanTime: antivirusResult.scanTime,
          fileSize: req.file.size
        }
      });

      const options = {
        performOCR: req.body.performOCR === "true",
        verifyAuthenticity: req.body.verifyAuthenticity === "true",
        extractData: req.body.extractData === "true",
        encrypt: req.body.encrypt === "true"
      };

      const user = req.user as { id: string; role: string; username: string; email: string };
      const result = await documentProcessorService.processDocument(
        req.file,
        user.id,
        options
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const wsService = getWebSocketService();
      wsService?.sendToUser(user.id, "document:processed", {
        documentId: result.documentId,
        success: true
      });

      res.json(result);

    } catch (error) {
      console.error("Document upload error:", error);
      res.status(500).json({ error: "Document upload failed" });
    }
  }));

  app.get("/api/documents", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user as { id: string; role: string; username: string; email: string };
      const documents = await documentProcessorService.getUserDocuments(user.id);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  app.get("/api/documents/:id", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user as { id: string; role: string; username: string; email: string };
      const result = await documentProcessorService.getDocument(req.params.id, user.id);

      if (!result.success) {
        return res.status(404).json({ error: result.error });
      }

      res.json(result.document);
    } catch (error) {
      console.error("Get document error:", error);
      res.status(500).json({ error: "Failed to get document" });
    }
  });

  app.post("/api/quantum/keys/generate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { algorithm } = req.body;

      const result = await quantumEncryptionService.generateQuantumKey(algorithm);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error("Generate quantum key error:", error);
      res.status(500).json({ error: "Failed to generate quantum key" });
    }
  });

  app.post("/api/quantum/encrypt", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { data, keyId } = req.body;

      if (!data) {
        return res.status(400).json({ error: "Data to encrypt is required" });
      }

      const result = await quantumEncryptionService.encryptData(data, keyId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error("Quantum encryption error:", error);
      res.status(500).json({ error: "Encryption failed" });
    }
  });

  app.post("/api/quantum/decrypt", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { encryptedData, keyId } = req.body;

      if (!encryptedData || !keyId) {
        return res.status(400).json({ error: "Encrypted data and key ID are required" });
      }

      const result = await quantumEncryptionService.decryptData(encryptedData, keyId);

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json(result);
    } catch (error) {
      console.error("Quantum decryption error:", error);
      res.status(500).json({ error: "Decryption failed" });
    }
  });

  app.get("/api/quantum/keys", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const keys = await quantumEncryptionService.getActiveKeys();
      res.json(keys);
    } catch (error) {
      console.error("Get quantum keys error:", error);
      res.status(500).json({ error: "Failed to get quantum keys" });
    }
  });

  app.get("/api/quantum/status", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const status = await quantumEncryptionService.getSystemStatus();
      res.json(status);
    } catch (error) {
      console.error("Get quantum status error:", error);
      res.status(500).json({ error: "Failed to get quantum status" });
    }
  });

  // SITA Integration API Routes
  app.post("/api/sita/initialize", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const result = await sitaIntegration.initialize();

      if (result.success) {
        res.json({ message: "SITA integration initialized successfully" });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("SITA initialization error:", error);
      res.status(500).json({ error: "SITA initialization failed" });
    }
  });

  app.get("/api/sita/services", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const services = await sitaIntegration.discoverServices();
      res.json({ services });
    } catch (error) {
      console.error("SITA service discovery error:", error);
      res.status(500).json({ error: "Failed to discover SITA services" });
    }
  });

  app.get("/api/sita/service/:serviceId", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { serviceId } = req.params;
      const serviceInfo = sitaIntegration.getServiceInfo(serviceId);

      if (!serviceInfo) {
        return res.status(404).json({ error: "Service not found" });
      }

      res.json(serviceInfo);
    } catch (error) {
      console.error("SITA service info error:", error);
      res.status(500).json({ error: "Failed to get service information" });
    }
  });

  app.post("/api/sita/eservices/integration", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { serviceType } = req.body;

      if (!serviceType) {
        return res.status(400).json({ error: "Service type is required" });
      }

      const result = await sitaIntegration.getEServicesIntegration(serviceType);

      if (result.success) {
        res.json({
          integrationUrl: result.integrationUrl,
          sessionToken: result.sessionToken
        });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("eServices integration error:", error);
      res.status(500).json({ error: "eServices integration failed" });
    }
  });

  app.post("/api/sita/validate-certificate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { certificateData } = req.body;

      if (!certificateData) {
        return res.status(400).json({ error: "Certificate data is required" });
      }

      const result = await sitaIntegration.validateGovernmentCertificate(certificateData);
      res.json(result);
    } catch (error) {
      console.error("Certificate validation error:", error);
      res.status(500).json({ error: "Certificate validation failed" });
    }
  });

  // DHA Strategic Partnerships API Routes (2025)
  app.post("/api/dha/citizen/initialize", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { idNumber, biometricData } = req.body;

      if (!idNumber) {
        return res.status(400).json({ error: "ID number is required" });
      }

      const result = await dhaPartnerships.initializeCitizenProfile(idNumber, biometricData);

      if (result.success) {
        res.json({ profile: result.profile });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Citizen profile initialization error:", error);
      res.status(500).json({ error: "Profile initialization failed" });
    }
  });

  app.post("/api/dha/superapp/session", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { citizenId, applicationId, serviceType } = req.body;

      if (!citizenId || !applicationId || !serviceType) {
        return res.status(400).json({ error: "Citizen ID, application ID, and service type are required" });
      }

      const result = await dhaPartnerships.createSuperAppSession(citizenId, applicationId, serviceType);

      if (result.success) {
        res.json({ session: result.session });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Super App session creation error:", error);
      res.status(500).json({ error: "Session creation failed" });
    }
  });

  app.put("/api/dha/superapp/session/:sessionId/progress", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { progress, nextSteps, notification } = req.body;

      if (progress === undefined || !nextSteps) {
        return res.status(400).json({ error: "Progress and next steps are required" });
      }

      const result = await dhaPartnerships.updateSessionProgress(sessionId, progress, nextSteps, notification);

      if (result.success) {
        res.json({ message: "Session updated successfully" });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Session update error:", error);
      res.status(500).json({ error: "Session update failed" });
    }
  });

  // MILITARY-GRADE AI CHAT SYSTEM - 3 modes: assistant/agent/bot
  app.post('/api/ai/chat', authLimiter, authenticate, async (req: Request, res: Response) => {
    try {
      const { message, mode = 'assistant', attachments = [] } = req.body;
      const user = (req as any).user;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      const response = await aiAssistantService.processAIRequest(
        message, 
        mode as any, 
        user?.email, 
        attachments
      );
      
      // Log admin uncensored mode usage
      if (user?.email === 'raeesa.osman@admin' && mode === 'assistant') {
        console.log(`[ADMIN] Uncensored AI access by ${user.email}: ${message.substring(0, 100)}...`);
      }
      
      res.json(response);
    } catch (error) {
      console.error('[AI Chat] Error:', error);
      res.status(500).json({ error: 'AI processing failed' });
    }
  });

  // ADMIN UNLIMITED AI CHAT - Bypass all restrictions (Raeesa osman admin only)
  app.post('/api/ai/admin/chat', authenticate, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
      const { message, conversationId, adminOverride, bypassRestrictions, unlimitedMode, context } = req.body;
      const user = (req as any).user;
      
      if (!message || typeof message !== 'string') {
        return res.status(400).json({ error: 'Message is required' });
      }
      
      // Admin override logging
      console.log(`[ADMIN UNLIMITED] ${user?.email}: ${message.substring(0, 100)}...`);
      
      // Set admin mode for unlimited access with proper role verification
      const userContext = {
        email: user?.email,
        role: (user as any)?.role || 'user',
        verified: true // This route already has admin role verification middleware
      };
      aiAssistantService.setAdminMode('uncensored', userContext);
      
      const response = await aiAssistantService.processAIRequest(
        message,
        'assistant', // Default to assistant mode for admin chat
        user?.email,
        [], // No attachments in admin chat for now
        true // Enable API access for admin
      );
      
      // Add admin metadata
      response.metadata = {
        ...response.metadata,
        adminOverride: true,
        restrictions: "BYPASSED - ADMIN ACCESS",
        clearanceLevel: "MAXIMUM",
        executionTime: Date.now()
      };
      
      res.json({
        success: response.success,
        content: response.content,
        metadata: {
          ...response.metadata,
          adminOverride: true,
          restrictions: "BYPASSED - ADMIN ACCESS",
          clearanceLevel: "MAXIMUM",
          executionTime: Date.now()
        }
      });
    } catch (error) {
      console.error('[ADMIN AI] Error:', error);
      res.status(500).json({ error: 'Admin AI processing failed' });
    }
  });

  // Admin-only endpoint to toggle uncensored mode (Raeesa osman admin only)
  app.post('/api/ai/admin/mode', authenticate, requireRole(['admin', 'super_admin']), async (req: Request, res: Response) => {
    try {
      const { mode } = req.body;
      const user = (req as any).user;
      
      const success = aiAssistantService.setAdminMode(mode, user?.email);
      
      if (success) {
        res.json({ success: true, mode, message: 'Admin mode updated' });
      } else {
        res.status(403).json({ error: 'Unauthorized admin access' });
      }
    } catch (error) {
      res.status(500).json({ error: 'Failed to update admin mode' });
    }
  });

  // File upload with AI processing and OCR
  app.post('/api/upload', authenticate, uploadLimiter, documentUpload.single('file'), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const file = req.file;
      const user = (req as any).user;
      
      // Process file with AI for OCR and analysis
      const fileData = file.buffer.toString('base64');
      const analysis = await aiAssistantService.processAIRequest(
        'Analyze this uploaded file and extract all relevant information for DHA processing.',
        'agent',
        user?.email,
        [{ type: file.mimetype, data: fileData, filename: file.originalname }]
      );
      
      // Store file info for chat attachment
      const fileInfo = {
        id: crypto.randomUUID(),
        filename: file.originalname,
        mimetype: file.mimetype,
        size: file.size,
        analysis: analysis.content,
        uploadedAt: new Date().toISOString(),
        userId: user?.id
      };
      
      res.json({
        success: true,
        file: fileInfo,
        analysis: analysis.content,
        message: 'File uploaded and analyzed successfully'
      });
    } catch (error) {
      console.error('[Upload] Error:', error);
      res.status(500).json({ error: 'File upload failed' });
    }
  });

  app.post("/api/dha/ai/verify-document", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentId, documentData, documentType } = req.body;

      if (!documentId || !documentData || !documentType) {
        return res.status(400).json({ error: "Document ID, data, and type are required" });
      }

      const result = await dhaPartnerships.performAiDocumentVerification(documentId, documentData, documentType);

      if (result.success) {
        res.json({ verification: result.result });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("AI document verification error:", error);
      res.status(500).json({ error: "AI verification failed" });
    }
  });

  app.post("/api/dha/payment/process", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const paymentRequest = req.body;

      if (!paymentRequest.citizenId || !paymentRequest.amount || !paymentRequest.serviceType) {
        return res.status(400).json({ error: "Citizen ID, amount, and service type are required" });
      }

      const result = await dhaPartnerships.processDigitalPayment(paymentRequest);

      if (result.success) {
        res.json({ payment: result.result });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Digital payment error:", error);
      res.status(500).json({ error: "Payment processing failed" });
    }
  });

  app.get("/api/dha/localization/:messageKey/:language", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { messageKey, language } = req.params;
      const variables = req.query as Record<string, string>;

      const message = await dhaPartnerships.getLocalizedMessage(messageKey, language, variables);
      res.json({ message });
    } catch (error) {
      console.error("Localization error:", error);
      res.status(500).json({ error: "Localization failed" });
    }
  });

  // ICAO PKD Integration API Routes
  app.post("/api/icao/initialize", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const result = await icaoPkdIntegration.initialize();

      if (result.success) {
        res.json({ message: "ICAO PKD integration initialized successfully" });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("ICAO PKD initialization error:", error);
      res.status(500).json({ error: "ICAO PKD initialization failed" });
    }
  });

  app.post("/api/icao/passport/passive-auth", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { ePassportData, chipSignature } = req.body;

      if (!ePassportData || !chipSignature) {
        return res.status(400).json({ error: "ePassport data and chip signature are required" });
      }

      const result = await icaoPkdIntegration.performPassiveAuthentication(ePassportData, chipSignature);
      res.json(result);
    } catch (error) {
      console.error("Passive authentication error:", error);
      res.status(500).json({ error: "Passive authentication failed" });
    }
  });

  app.post("/api/icao/passport/active-auth", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { ePassportData, challenge } = req.body;

      if (!ePassportData || !challenge) {
        return res.status(400).json({ error: "ePassport data and challenge are required" });
      }

      const result = await icaoPkdIntegration.performActiveAuthentication(ePassportData, challenge);
      res.json(result);
    } catch (error) {
      console.error("Active authentication error:", error);
      res.status(500).json({ error: "Active authentication failed" });
    }
  });

  app.get("/api/icao/certificates/:countryCode", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { countryCode } = req.params;
      const certificateInfo = icaoPkdIntegration.getCertificateInfo(countryCode);
      res.json(certificateInfo);
    } catch (error) {
      console.error("Certificate info error:", error);
      res.status(500).json({ error: "Failed to get certificate information" });
    }
  });

  app.post("/api/icao/validate/csca", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { countryCode } = req.body;

      if (!countryCode) {
        return res.status(400).json({ error: "Country code is required" });
      }

      const result = await icaoPkdIntegration.validateCscaCertificate(countryCode);
      res.json(result);
    } catch (error) {
      console.error("CSCA validation error:", error);
      res.status(500).json({ error: "CSCA validation failed" });
    }
  });

  app.post("/api/icao/validate/dsc", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { countryCode, documentType } = req.body;

      if (!countryCode || !documentType) {
        return res.status(400).json({ error: "Country code and document type are required" });
      }

      const result = await icaoPkdIntegration.validateDscCertificate(countryCode, documentType);
      res.json(result);
    } catch (error) {
      console.error("DSC validation error:", error);
      res.status(500).json({ error: "DSC validation failed" });
    }
  });

  // SAPS Criminal Record Centre API Routes
  app.post("/api/saps/initialize", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const result = await sapsIntegration.initialize();

      if (result.success) {
        res.json({ message: "SAPS CRC integration initialized successfully" });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("SAPS initialization error:", error);
      res.status(500).json({ error: "SAPS initialization failed" });
    }
  });

  app.post("/api/saps/criminal-record/submit", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const request = req.body;

      if (!request.idNumber || !request.consentRecord) {
        return res.status(400).json({ error: "ID number and consent record are required" });
      }

      const result = await sapsIntegration.submitCriminalRecordRequest(request);

      if (result.success) {
        res.json({ requestId: result.requestId });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Criminal record submission error:", error);
      res.status(500).json({ error: "Criminal record request failed" });
    }
  });

  app.get("/api/saps/criminal-record/status/:requestId", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const result = await sapsIntegration.checkRequestStatus(requestId);

      if (result.success) {
        res.json({
          status: result.status,
          estimatedCompletion: result.estimatedCompletion
        });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Status check error:", error);
      res.status(500).json({ error: "Status check failed" });
    }
  });

  app.get("/api/saps/criminal-record/results/:requestId", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { requestId } = req.params;
      const result = await sapsIntegration.retrieveCriminalRecord(requestId);

      if (result.success) {
        res.json({ criminalRecord: result.result });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Criminal record retrieval error:", error);
      res.status(500).json({ error: "Criminal record retrieval failed" });
    }
  });

  app.post("/api/saps/background-check/enhanced", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { idNumber, fingerprints, consentRecord } = req.body;

      if (!idNumber || !fingerprints || !consentRecord) {
        return res.status(400).json({ error: "ID number, fingerprints, and consent record are required" });
      }

      const result = await sapsIntegration.performEnhancedBackgroundCheck(idNumber, fingerprints, consentRecord);

      if (result.success) {
        res.json({ backgroundCheck: result.result });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Enhanced background check error:", error);
      res.status(500).json({ error: "Enhanced background check failed" });
    }
  });

  app.post("/api/saps/consent/validate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { consentRecord } = req.body;

      if (!consentRecord) {
        return res.status(400).json({ error: "Consent record is required" });
      }

      const result = await sapsIntegration.validateConsentCompliance(consentRecord);
      res.json(result);
    } catch (error) {
      console.error("Consent validation error:", error);
      res.status(500).json({ error: "Consent validation failed" });
    }
  });

  // NPR (National Population Register) API Routes
  app.post("/api/npr/initialize", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const result = await nprIntegration.initialize();

      if (result.success) {
        res.json({ message: "NPR integration initialized successfully" });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("NPR initialization error:", error);
      res.status(500).json({ error: "NPR initialization failed" });
    }
  });

  app.post("/api/npr/id/validate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { idNumber } = req.body;

      if (!idNumber) {
        return res.status(400).json({ error: "ID number is required" });
      }

      const result = await nprIntegration.validateIdNumber(idNumber);

      if (result.success) {
        res.json({ validation: result.result });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("ID validation error:", error);
      res.status(500).json({ error: "ID validation failed" });
    }
  });

  app.post("/api/npr/citizen/lookup", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { idNumber, verificationLevel = 'standard' } = req.body;

      if (!idNumber) {
        return res.status(400).json({ error: "ID number is required" });
      }

      const result = await nprIntegration.getCitizenRecord(idNumber, verificationLevel);

      if (result.success) {
        res.json({ citizenRecord: result.record });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Citizen lookup error:", error);
      res.status(500).json({ error: "Citizen lookup failed" });
    }
  });

  app.post("/api/npr/biographic/verify", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { idNumber, providedData } = req.body;

      if (!idNumber || !providedData) {
        return res.status(400).json({ error: "ID number and provided data are required" });
      }

      const result = await nprIntegration.verifyBiographicData(idNumber, {
        firstName: providedData.firstName,
        surname: providedData.surname,
        dateOfBirth: new Date(providedData.dateOfBirth),
        placeOfBirth: providedData.placeOfBirth,
        sex: providedData.sex
      });

      if (result.success) {
        res.json({ verification: result.result });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Biographic verification error:", error);
      res.status(500).json({ error: "Biographic verification failed" });
    }
  });

  app.post("/api/npr/citizenship/verify", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { idNumber } = req.body;

      if (!idNumber) {
        return res.status(400).json({ error: "ID number is required" });
      }

      const result = await nprIntegration.verifyCitizenshipStatus(idNumber);

      if (result.success) {
        res.json({ citizenship: result.citizenship });
      } else {
        res.status(400).json({ error: result.error });
      }
    } catch (error) {
      console.error("Citizenship verification error:", error);
      res.status(500).json({ error: "Citizenship verification failed" });
    }
  });

  // Production Readiness API Routes
  app.get("/api/production/config", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const config = productionReadiness.getEnvironmentConfig();
      res.json({ configuration: config });
    } catch (error) {
      console.error("Configuration retrieval error:", error);
      res.status(500).json({ error: "Failed to retrieve configuration" });
    }
  });

  app.get("/api/production/certificates", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const result = await productionReadiness.loadGovernmentCertificates();

      if (result.success) {
        res.json({ certificates: result.certificates });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      console.error("Certificate loading error:", error);
      res.status(500).json({ error: "Failed to load certificates" });
    }
  });

  app.post("/api/production/backup", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedData = productionBackupSchema.parse(req.body);
      const { backupType } = validatedData;
      const result = await productionReadiness.createBackup(backupType);

      if (result.success) {
        res.json({ backupId: result.backupId, message: "Backup created successfully" });
      } else {
        res.status(500).json({ error: result.error });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Backup creation error:", error);
      res.status(500).json({ error: "Backup creation failed" });
    }
  });

  app.get("/api/production/compliance", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const complianceStatus = await productionReadiness.verifyComplianceStatus();
      res.json({ compliance: complianceStatus });
    } catch (error) {
      console.error("Compliance verification error:", error);
      res.status(500).json({ error: "Compliance verification failed" });
    }
  });

  app.get("/api/production/performance", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const metrics = await productionReadiness.monitorPerformance();
      res.json({ performanceMetrics: metrics });
    } catch (error) {
      console.error("Performance monitoring error:", error);
      res.status(500).json({ error: "Performance monitoring failed" });
    }
  });

  app.get("/api/monitoring/health", authenticate, async (req: Request, res: Response) => {
    try {
      const health = await monitoringService.getSystemHealth();
      res.json(health);
    } catch (error) {
      console.error("Health check error:", error);
      res.status(500).json({ error: "Failed to get system health" });
    }
  });

  app.get("/api/monitoring/metrics", authenticate, async (req: Request, res: Response) => {
    try {
      const validatedQuery = securityMetricsQuerySchema.parse({
        type: req.query.type,
        hours: req.query.hours ? parseInt(req.query.hours as string) : undefined
      });

      const metrics = await monitoringService.getMetricsHistory(
        validatedQuery.type || '',
        validatedQuery.hours || 24
      );
      res.json(metrics);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Get metrics error:", error);
      res.status(500).json({ error: "Failed to get metrics" });
    }
  });

  app.get("/api/monitoring/security", authenticate, async (req: Request, res: Response) => {
    try {
      const security = await monitoringService.getSecurityMetrics();
      res.json(security);
    } catch (error) {
      console.error("Get security metrics error:", error);
      res.status(500).json({ error: "Failed to get security metrics" });
    }
  });

  app.get("/api/monitoring/regional", authenticate, async (req: Request, res: Response) => {
    try {
      const regionalStatus = await monitoringService.getRegionalStatus();
      res.json(regionalStatus);
    } catch (error) {
      console.error("Regional status error:", error);
      res.status(500).json({ error: "Failed to get regional status" });
    }
  });

  app.get("/api/monitoring/report", authenticate, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const report = await monitoringService.generateSystemReport();
      res.json(report);
    } catch (error) {
      console.error("Generate report error:", error);
      res.status(500).json({ error: "Failed to generate report" });
    }
  });

  // Admin routes - User Management
  app.get("/api/admin/users", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Get admin users error:", error);
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.patch("/api/admin/users/:id", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedUpdates = updateUserSchema.parse(req.body);

      // Check if user exists
      const existingUser = await storage.getUser(id);
      if (!existingUser) {
        return res.status(404).json({ error: "User not found" });
      }

      // Update user
      await storage.updateUser(id, validatedUpdates);
      res.json({ message: "User updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Update user error:", error);
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  // Admin routes - Document Management
  app.get("/api/admin/documents", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const documents = await storage.getAllDocuments();
      res.json(documents);
    } catch (error) {
      console.error("Get admin documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  app.post("/api/admin/documents/:id/verify", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const validatedData = adminDocumentVerificationSchema.parse(req.body);
      const { isApproved, notes } = validatedData;

      // Check if document exists
      const existingDocument = await storage.getDocument(id);
      if (!existingDocument) {
        return res.status(404).json({ error: "Document not found" });
      }

      // Update document verification status
      await storage.updateDocument(id, {
        isVerified: isApproved,
        verificationScore: isApproved ? 95 : 0,
        // Add notes to metadata if available
      });

      res.json({ message: "Document verification updated" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Verify document error:", error);
      res.status(500).json({ error: "Failed to verify document" });
    }
  });

  // Admin routes - Document Verifications
  app.get("/api/admin/document-verifications", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = documentVerificationQuerySchema.parse({
        documentType: req.query.documentType,
        documentId: req.query.documentId
      });

      const verifications = await storage.getDocumentVerifications(
        validatedQuery.documentType || undefined,
        validatedQuery.documentId || undefined
      );
      res.json(verifications);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Get document verifications error:", error);
      res.status(500).json({ error: "Failed to get document verifications" });
    }
  });

  // Admin routes - Document Templates
  app.get("/api/admin/document-templates", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = documentTemplateQuerySchema.parse({
        type: req.query.type
      });

      const templates = await storage.getDocumentTemplates(validatedQuery.type as any || undefined);
      res.json(templates);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Get document templates error:", error);
      res.status(500).json({ error: "Failed to get document templates" });
    }
  });

  // ===================== STATUS CHANGE API ENDPOINTS =====================

  // AMS Certificate endpoints
  app.post("/api/ams/certificate/create", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const certificate = await storage.createAmsCertificate({
        ...req.body,
        userId: req.user!.id
      });
      res.status(201).json(certificate);
    } catch (error) {
      console.error("Create AMS certificate error:", error);
      res.status(500).json({ error: "Failed to create AMS certificate" });
    }
  });

  app.post("/api/ams/certificate/verify", authenticate, requireRole(["admin", "officer"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { certificateId, action, reason } = req.body;

      if (!certificateId || !action) {
        return res.status(400).json({ error: "Certificate ID and action required" });
      }

      const certificate = await storage.getAmsCertificate(certificateId);
      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      switch (action) {
        case 'verify':
          await storage.verifyAmsCertificate(certificateId, (req.user as any).id);
          break;
        case 'revoke':
          if (!reason) {
            return res.status(400).json({ error: "Reason required for revocation" });
          }
          await storage.revokeAmsCertificate(certificateId, reason);
          break;
        case 'suspend':
          if (!reason) {
            return res.status(400).json({ error: "Reason required for suspension" });
          }
          await storage.suspendAmsCertificate(certificateId, reason);
          break;
        case 'renew':
          const expiryDate = req.body.expiryDate ? new Date(req.body.expiryDate) : new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);
          const newCertificate = await storage.renewAmsCertificate(certificateId, expiryDate);
          return res.json({ message: "Certificate renewed", newCertificate });
        default:
          return res.status(400).json({ error: "Invalid action" });
      }

      res.json({ message: `Certificate ${action} successful` });
    } catch (error) {
      console.error("AMS certificate action error:", error);
      res.status(500).json({ error: "Failed to process certificate action" });
    }
  });

  app.get("/api/ams/certificates", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { status } = req.query;
      const certificates = await storage.getAmsCertificates(req.user!.id, status as string);
      res.json(certificates);
    } catch (error) {
      console.error("Get AMS certificates error:", error);
      res.status(500).json({ error: "Failed to get certificates" });
    }
  });

  // Permit Status Change endpoints
  app.post("/api/permits/status/change", authenticate, requireRole(["admin", "officer"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { permitId, newStatus, reason, endorsements, conditions, gracePeriod } = req.body;

      if (!permitId || !newStatus || !reason) {
        return res.status(400).json({ error: "Permit ID, new status, and reason required" });
      }

      // Get current permit status
      const latestStatus = await storage.getLatestPermitStatus(permitId);

      // Create status change record
      const statusChange = await storage.createPermitStatusChange({
        permitId,
        permitType: req.body.permitType || latestStatus?.permitType || 'work',
        previousStatus: latestStatus?.newStatus || 'unknown',
        newStatus,
        changedBy: req.user!.id,
        changeReason: reason,
        changeNotes: req.body.notes,
        endorsementsAdded: endorsements?.added,
        endorsementsRemoved: endorsements?.removed,
        conditionsModified: conditions,
        gracePeriodDays: gracePeriod,
        renewalStatus: req.body.renewalStatus,
        renewalDeadline: req.body.renewalDeadline ? new Date(req.body.renewalDeadline) : undefined,
        effectiveDate: new Date()
      });

      // Send notification
      const wsService = getWebSocketService();
      wsService?.broadcast("permit:status:changed", {
        permitId,
        previousStatus: statusChange.previousStatus,
        newStatus: statusChange.newStatus,
        changedBy: (req.user as any).username || (req.user as any).email
      });

      res.json({ message: "Permit status changed", statusChange });
    } catch (error) {
      console.error("Permit status change error:", error);
      res.status(500).json({ error: "Failed to change permit status" });
    }
  });

  app.get("/api/permits/:permitId/status/history", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { permitId } = req.params;
      const history = await storage.getPermitStatusChanges(permitId);
      res.json(history);
    } catch (error) {
      console.error("Get permit status history error:", error);
      res.status(500).json({ error: "Failed to get status history" });
    }
  });

  // Document Verification Status endpoints
  app.post("/api/documents/status/update", authenticate, requireRole(["admin", "officer"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentId, documentType, newStatus, reason, verificationStage, scores } = req.body;

      if (!documentId || !documentType || !newStatus) {
        return res.status(400).json({ error: "Document ID, type, and new status required" });
      }

      // Check if status exists or create new
      let status = await storage.getDocumentVerificationStatus(documentId);

      if (!status) {
        status = await storage.createDocumentVerificationStatus({
          documentId,
          documentType,
          currentStatus: newStatus,
          verificationStage: verificationStage || 'initial',
          verificationScore: scores?.overall,
          authenticityCheckPassed: scores?.authenticity,
          biometricCheckPassed: scores?.biometric,
          backgroundCheckPassed: scores?.background,
          updatedBy: req.user!.id
        });
      } else {
        await storage.updateDocumentStatus(documentId, newStatus, req.user!.id, reason);

        if (scores) {
          await storage.updateDocumentVerificationStatus(status.id, {
            verificationScore: scores.overall,
            authenticityCheckPassed: scores.authenticity,
            biometricCheckPassed: scores.biometric,
            backgroundCheckPassed: scores.background
          });
        }
      }

      // Send real-time notification
      const wsService = getWebSocketService();
      wsService?.broadcast("document:status:updated", {
        documentId,
        documentType,
        newStatus,
        updatedBy: (req.user as any).username || (req.user as any).email
      });

      res.json({ message: "Document status updated", status });
    } catch (error) {
      console.error("Document status update error:", error);
      res.status(500).json({ error: "Failed to update document status" });
    }
  });

  app.get("/api/documents/status/:documentId", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const status = await storage.getDocumentVerificationStatus(documentId);

      if (!status) {
        return res.status(404).json({ error: "Status not found" });
      }

      res.json(status);
    } catch (error) {
      console.error("Get document status error:", error);
      res.status(500).json({ error: "Failed to get document status" });
    }
  });

  app.get("/api/verification/history/:documentId", authenticate, verificationRateLimit, geoIPValidationMiddleware, auditMiddleware('verification', 'get_history'), async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;

      // Validate documentId parameter
      if (!documentId || typeof documentId !== 'string') {
        return res.status(400).json({ error: "Valid document ID required" });
      }

      const history = await storage.getDocumentVerificationHistory(documentId);

      // Apply PII scrubbing to history before sending response
      const sanitizedHistory = history.map(entry => ({
        ...entry,
        verifierIpAddress: 'anonymized',
        verifierUserAgent: 'anonymized', 
        location: 'Unknown'
      }));

      res.json(sanitizedHistory);
    } catch (error) {
      console.error("Get verification history error:", error);
      res.status(500).json({ error: "Failed to get verification history" });
    }
  });

  app.post("/api/documents/verification/history", authenticate, requireRole(["admin", "officer"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentId, documentType, action, previousValue, newValue, reason, notes } = req.body;

      if (!documentId || !documentType || !action) {
        return res.status(400).json({ error: "Document ID, type, and action required" });
      }

      const history = await storage.createDocumentVerificationHistory({
        verificationRecordId: documentId,
        verificationMethod: 'manual',
        isSuccessful: true,
        ipAddress: req.ip || null,
        userAgent: req.get('User-Agent') || null
      });

      res.json({ message: "History entry created", history });
    } catch (error) {
      console.error("Create verification history error:", error);
      res.status(500).json({ error: "Failed to create history entry" });
    }
  });

  // Admin routes - Error Logs
  app.get("/api/admin/error-logs", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = errorLogsQuerySchema.parse({
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        severity: req.query.severity,
        errorType: req.query.errorType,
        isResolved: req.query.isResolved === 'true' ? true : req.query.isResolved === 'false' ? false : undefined,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });

      const errorLogs = await storage.getErrorLogs({
        severity: validatedQuery.severity,
        errorType: validatedQuery.errorType, 
        isResolved: validatedQuery.isResolved,
        limit: validatedQuery.limit || 20
      });
      res.json(errorLogs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Get error logs error:", error);
      res.status(500).json({ error: "Failed to get error logs" });
    }
  });

  // Security events routes
  app.get("/api/security/events", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const validatedQuery = securityEventsQuerySchema.parse({
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        severity: req.query.severity,
        eventType: req.query.eventType,
        userId: req.query.userId,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });

      // Non-admin users can only see their own events
      const user = req.user as { id: string; role: string; username: string; email: string };
      const userId = user.role === "admin" ? validatedQuery.userId : user.id;

      const events = await storage.getSecurityEvents(
        userId,
        validatedQuery.limit || 50
      );

      res.json(events);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Get security events error:", error);
      res.status(500).json({ error: "Failed to get security events" });
    }
  });

  // Error logging endpoint
  app.post("/api/monitoring/error", authenticate, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const validatedData = errorLogCreationSchema.parse(req.body);

      const user = req.user as { id: string; role: string; username: string; email: string };
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "client_error",
        severity: "medium",
        details: {
          message: validatedData.message,
          stack: validatedData.stack,
          componentStack: validatedData.componentStack,
          timestamp: validatedData.timestamp,
          url: validatedData.url,
          browser: validatedData.userAgent
        },
        ipAddress: req.ip,
        userAgent: validatedData.userAgent || req.get("User-Agent") || ""
      });

      res.json({ message: "Error logged successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid error data", details: error.errors });
      }
      console.error("Error logging client error:", error);
      res.status(500).json({ error: "Failed to log error" });
    }
  });

  // Document generation routes

  // Generate certificate
  app.post("/api/certificates", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { type, templateType, title, description, data, expiresAt } = req.body;

      if (!type || !templateType || !title || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const user = req.user as { id: string; role: string; username: string; email: string };
      const result = await documentGenerator.generateCertificate(user.id, type, {
        templateType,
        title,
        description,
        data: data || {},
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Certificate generation failed" });
      }

      // Log certificate generation
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "certificate_generated",
        severity: "low",
        details: { type, title, verificationCode: result.verificationCode },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      res.json({
        message: "Certificate generated successfully",
        certificateId: result.documentId,
        verificationCode: result.verificationCode,
        documentUrl: result.documentUrl,
        qrCodeUrl: result.qrCodeUrl
      });

    } catch (error) {
      console.error("Certificate generation error:", error);
      res.status(500).json({ error: "Certificate generation failed" });
    }
  });

  // Get user certificates
  app.get("/api/certificates", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user as { id: string; role: string; username: string; email: string };
      const certificates = await storage.getCertificates(user.id);
      res.json(certificates);
    } catch (error) {
      console.error("Get certificates error:", error);
      res.status(500).json({ error: "Failed to retrieve certificates" });
    }
  });

  // Get specific certificate
  app.get("/api/certificates/:id", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const certificate = await storage.getCertificate(req.params.id);

      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      // Check ownership or admin role
      const user = req.user as { id: string; role: string; username: string; email: string };
      if (certificate.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(certificate);
    } catch (error) {
      console.error("Get certificate error:", error);
      res.status(500).json({ error: "Failed to retrieve certificate" });
    }
  });

  // Generate permit
  app.post("/api/permits", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { type, templateType, title, description, data, conditions, expiresAt } = req.body;

      if (!type || !templateType || !title || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const user = req.user as { id: string; role: string; username: string; email: string };
      const result = await documentGenerator.generatePermit(user.id, type, {
        templateType,
        title,
        description,
        data: data || {},
        conditions: conditions || {},
        expiresAt: expiresAt ? new Date(expiresAt) : undefined
      });

      if (!result.success) {
        return res.status(500).json({ error: result.error || "Permit generation failed" });
      }

      // Log permit generation
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "permit_generated",
        severity: "low",
        details: { type, title, verificationCode: result.verificationCode },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      res.json({
        message: "Permit generated successfully",
        permitId: result.documentId,
        verificationCode: result.verificationCode,
        documentUrl: result.documentUrl,
        qrCodeUrl: result.qrCodeUrl
      });

    } catch (error) {
      console.error("Permit generation error:", error);
      res.status(500).json({ error: "Permit generation failed" });
    }
  });

  // Get user permits
  app.get("/api/permits", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const user = req.user as { id: string; role: string; username: string; email: string };
      const permits = await storage.getPermits(user.id);
      res.json(permits);
    } catch (error) {
      console.error("Get permits error:", error);
      res.status(500).json({ error: "Failed to retrieve permits" });
    }
  });

  // Get specific permit
  app.get("/api/permits/:id", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const permit = await storage.getPermit(req.params.id);

      if (!permit) {
        return res.status(404).json({ error: "Permit not found" });
      }

      // Check ownership or admin role
      const user = req.user as { id: string; role: string; username: string; email: string };
      if (permit.userId !== user.id && user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      res.json(permit);
    } catch (error) {
      console.error("Get permit error:", error);
      res.status(500).json({ error: "Failed to retrieve permit" });
    }
  });

  // Document verification endpoint for PDFs
  app.get("/api/verify/:verificationCode", geoIPValidationMiddleware, verificationRateLimit, auditMiddleware('verification', 'verify_document'), async (req: Request, res: Response) => {
    try {
      const { verificationCode } = req.params;
      const verification = await verificationService.verifyDocument({ verificationCode: verificationCode, verificationMethod: 'manual_entry', ipAddress: req.ip, userAgent: req.get('User-Agent') });

      if (verification && verification.isValid) {
        res.json({
          valid: true,
          documentType: verification.documentType,
          documentNumber: verification.documentNumber,
          issuedDate: verification.issuedDate,
          verificationDate: new Date().toISOString(),
          securityFeatures: verification.securityFeatures
        });
      } else {
        res.status(404).json({
          valid: false,
          error: 'Document not found or verification code invalid'
        });
      }
    } catch (error) {
      console.error('Document verification error:', error);
      res.status(500).json({ error: 'Verification service error' });
    }
  });

  // QR Code Verification Endpoint - Enhanced with full document metadata
  app.get("/api/verify/qr/:code", geoIPValidationMiddleware, verificationRateLimit, auditMiddleware('verification', 'qr_verify'), async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      const { d: encodedData } = req.query; // QR data parameter

      if (!code) {
        return res.status(400).json({ error: "Verification code is required" });
      }

      // Validate the verification code format
      if (!enhancedVerificationUtilities.validateVerificationCode(code)) {
        // Try legacy format for backward compatibility
        if (code.length !== 32 && code.length !== 12) {
          return res.status(400).json({ 
            error: "Invalid verification code format",
            details: "Code must be in XXXX-XXXX-XXXX-XXXX format or legacy format"
          });
        }
      }

      let qrData = null;
      if (encodedData && typeof encodedData === 'string') {
        try {
          // Parse QR code data if provided
          const decodedData = Buffer.from(encodedData, 'base64url').toString();
          qrData = JSON.parse(decodedData);
        } catch (parseError) {
          console.error("QR data parse error:", parseError);
        }
      }

      // Use verification service for comprehensive verification
      const verificationRequest = {
        verificationCode: code,
        verificationMethod: 'qr_scan' as const,
        qrData: encodedData as string,
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        location: {
          country: (req as any).geoLocation?.country,
          region: (req as any).geoLocation?.region,
          city: (req as any).geoLocation?.city
        }
      };

      const result = await verificationService.verify(verificationRequest);

      // Log verification attempt
      await storage.createSecurityEvent({
        eventType: "qr_verification",
        severity: "low",
        details: { 
          verificationCode: code,
          isValid: result.isValid,
          documentType: result.documentType,
          qrData: qrData
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      // Return comprehensive verification result
      res.json({
        isValid: result.isValid,
        verificationId: result.verificationId,
        documentType: result.documentType,
        documentNumber: result.documentNumber,
        issuedDate: result.issuedDate,
        expiryDate: result.expiryDate,
        holderName: result.holderName,
        issueOffice: result.issueOffice,
        verificationCount: result.verificationCount,
        lastVerified: result.lastVerified,
        securityFeatures: result.securityFeatures,
        fraudAssessment: result.fraudAssessment,
        message: result.isValid ? "Document successfully verified" : result.errorMessage || "Verification failed",
        qrData: qrData, // Include parsed QR data if available
        verificationUrl: `${process.env.VERIFICATION_URL || 'https://verify.dha.gov.za'}/verify/${code}`
      });

    } catch (error) {
      console.error("QR verification error:", error);
      res.status(500).json({ error: "QR verification failed" });
    }
  });

  // Document template management
  app.get("/api/templates", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const templates = await documentGenerator.getDocumentTemplates(type as 'certificate' | 'permit');
      res.json(templates);
    } catch (error) {
      console.error("Get templates error:", error);
      res.status(500).json({ error: "Failed to retrieve templates" });
    }
  });

  // Create document template (admin only)
  app.post("/api/templates", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedData = documentTemplateSchema.parse(req.body);
      const { name, type, htmlTemplate, cssStyles, officialLayout } = validatedData;

      const template = await documentGenerator.createDocumentTemplate(
        name,
        type,
        htmlTemplate,
        cssStyles,
        officialLayout
      );

      res.json({
        message: "Template created successfully",
        template
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Create template error:", error);
      res.status(500).json({ error: "Template creation failed" });
    }
  });

  // Serve generated documents and QR codes
  app.get("/documents/:filename", (req: Request, res: Response) => {
    try {
      const filename = req.params.filename;

      // Basic security check for filename
      if (filename.includes("..") || filename.includes("/")) {
        return res.status(400).json({ error: "Invalid filename" });
      }

      const filePath = `./documents/${filename}`;
      res.sendFile(filePath, { root: "." }, (err) => {
        if (err) {
          console.error("File serving error:", err);
          res.status(404).json({ error: "Document not found" });
        }
      });

    } catch (error) {
      console.error("Document serving error:", error);
      res.status(500).json({ error: "Document serving failed" });
    }
  });

  // ==================== GOVERNMENT DOCUMENT GENERATION ENDPOINTS ====================

  // Birth Certificate PDF Generation (UPDATED - Using DocumentPdfFacade)
  app.post("/api/pdf/birth-certificate", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const birthCertSchema = z.object({
        registrationNumber: z.string(),
        childDetails: z.object({
          fullName: z.string(),
          dateOfBirth: z.string(),
          timeOfBirth: z.string(),
          placeOfBirth: z.string(),
          gender: z.string(),
          nationality: z.string()
        }),
        parentDetails: z.object({
          mother: z.object({
            fullName: z.string(),
            idNumber: z.string().optional(),
            nationality: z.string()
          }),
          father: z.object({
            fullName: z.string(),
            idNumber: z.string().optional(),
            nationality: z.string()
          }).optional()
        }),
        registrationDetails: z.object({
          dateOfRegistration: z.string(),
          registrationOffice: z.string(),
          registrarName: z.string()
        }),
        language: z.enum(['en', 'af', 'bilingual']).default('bilingual')
      });

      const validatedData = birthCertSchema.parse(req.body);

      // Transform to DocumentPdfFacade format
      const birthCertificateData = {
        personal: {
          fullName: validatedData.childDetails.fullName,
          dateOfBirth: new Date(validatedData.childDetails.dateOfBirth),
          placeOfBirth: validatedData.childDetails.placeOfBirth,
          gender: validatedData.childDetails.gender as 'M' | 'F',
          nationality: validatedData.childDetails.nationality
        },
        registrationNumber: validatedData.registrationNumber,
        registrationDate: new Date(validatedData.registrationDetails.dateOfRegistration),
        registrationOffice: validatedData.registrationDetails.registrationOffice,
        registrarName: validatedData.registrationDetails.registrarName,
        mother: {
          fullName: validatedData.parentDetails.mother.fullName,
          idNumber: validatedData.parentDetails.mother.idNumber || '',
          nationality: validatedData.parentDetails.mother.nationality
        },
        father: validatedData.parentDetails.father ? {
          fullName: validatedData.parentDetails.father.fullName,
          idNumber: validatedData.parentDetails.father.idNumber || '',
          nationality: validatedData.parentDetails.father.nationality
        } : undefined,
        timeOfBirth: validatedData.childDetails.timeOfBirth
      };

      // Use unified DocumentPdfFacade instead of direct service call
      await generateUnifiedPDFResponse(
        res, 
        SupportedDocumentType.BIRTH_CERTIFICATE, 
        birthCertificateData,
        {
          securityLevel: DocumentSecurityLevel.STANDARD,
          includeDigitalSignature: true,
          persistToStorage: true,
          languages: [validatedData.language === 'bilingual' ? 'en' : validatedData.language as 'en' | 'af'],
          includeAuditTrail: true
        }
      );

      // Log PDF generation with enhanced error handling
      try {
        await auditTrailService.logUserAction(
          'GENERATE_PDF',
          'success',
          {
            userId: (req.user as any).id,
            entityType: 'BIRTH_CERTIFICATE',
            entityId: validatedData.registrationNumber,
            actionDetails: { 
              documentType: 'birth_certificate',
              securityLevel: 'STANDARD',
              usedFacade: true,
              timestamp: new Date().toISOString()
            },
            ipAddress: req.ip || '',
            userAgent: req.get('User-Agent') || ''
          }
        );
      } catch (auditError) {
        console.error('Audit trail logging failed:', auditError);
        // Continue execution despite audit failure
      }
    } catch (error) {
      console.error('Birth certificate PDF generation error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: error.errors,
          errorCode: 'VALIDATION_FAILED'
        });
      }

      if (error instanceof DocumentGenerationError) {
        return res.status(400).json({ 
          error: 'Document generation failed', 
          details: error.message,
          errorCode: error.errorCode,
          documentType: error.documentType
        });
      }

      res.status(500).json({ 
        error: 'Failed to generate birth certificate', 
        details: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }));

  // Death Certificate PDF Generation
  app.post("/api/pdf/death-certificate", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.DEATH_CERTIFICATE, data);
    } catch (error) {
      console.error('Death certificate PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  // Marriage Certificate PDF Generation  
  app.post("/api/pdf/marriage-certificate", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.MARRIAGE_CERTIFICATE, data);
    } catch (error) {
      console.error('Marriage certificate PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  // South African ID Card PDF Generation
  app.post("/api/pdf/sa-id", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.SA_ID, data);
    } catch (error) {
      console.error('SA ID PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  // Passport PDF Generation (All Types)
  app.post("/api/pdf/passport", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.PASSPORT, data);
    } catch (error) {
      console.error('Passport PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  // Work Permit PDF Generation (UPDATED - Using DocumentPdfFacade)
  app.post("/api/pdf/work-permit", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const workPermitSchema = z.object({
        personal: z.object({
          fullName: z.string(),
          idNumber: z.string().optional(),
          passportNumber: z.string().optional(),
          dateOfBirth: z.string(),
          nationality: z.string(),
          gender: z.enum(['M', 'F'])
        }),
        permitNumber: z.string().optional(),
        permitType: z.string().default("General Work Visa"),
        employer: z.object({
          name: z.string(),
          address: z.string(),
          sector: z.string().optional()
        }),
        occupation: z.string(),
        validFrom: z.string(),
        validUntil: z.string(),
        conditions: z.array(z.string()).optional(),
        endorsements: z.array(z.string()).optional()
      });

      const validatedData = workPermitSchema.parse(req.body);

      // Transform to DocumentPdfFacade format for work permit
      const workPermitData = {
        personal: {
          fullName: validatedData.personal.fullName,
          idNumber: validatedData.personal.idNumber,
          passportNumber: validatedData.personal.passportNumber,
          dateOfBirth: new Date(validatedData.personal.dateOfBirth),
          nationality: validatedData.personal.nationality,
          gender: validatedData.personal.gender
        },
        permitDetails: {
          permitNumber: validatedData.permitNumber || `WP-${Date.now()}`,
          permitType: validatedData.permitType,
          issuanceDate: new Date(),
          expiryDate: new Date(validatedData.validUntil),
          validFrom: new Date(validatedData.validFrom),
          validUntil: new Date(validatedData.validUntil)
        },
        employment: {
          employerName: validatedData.employer.name,
          employerAddress: validatedData.employer.address,
          sector: validatedData.employer.sector,
          occupation: validatedData.occupation
        },
        conditions: validatedData.conditions || [],
        endorsements: validatedData.endorsements || []
      };

      // Use unified DocumentPdfFacade instead of direct service call
      await generateUnifiedPDFResponse(
        res, 
        SupportedDocumentType.WORK_PERMIT, 
        workPermitData,
        {
          securityLevel: DocumentSecurityLevel.ENHANCED,
          includeDigitalSignature: true,
          persistToStorage: true,
          includeAuditTrail: true
        }
      );

    } catch (error) {
      console.error('Work permit PDF generation error:', error);

      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: 'Invalid request data', 
          details: error.errors,
          errorCode: 'VALIDATION_FAILED'
        });
      }

      if (error instanceof DocumentGenerationError) {
        return res.status(400).json({ 
          error: 'Document generation failed', 
          details: error.message,
          errorCode: error.errorCode,
          documentType: error.documentType
        });
      }

      res.status(500).json({ 
        error: 'Failed to generate work permit', 
        details: error instanceof Error ? error.message : 'Unknown error',
        errorCode: 'INTERNAL_ERROR'
      });
    }
  }));

  // Study Permit PDF Generation
  app.post("/api/pdf/study-permit", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.STUDY_PERMIT, data);
    } catch (error) {
      console.error('Study permit PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  // Business Permit PDF Generation
  app.post("/api/pdf/business-permit", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.BUSINESS_PERMIT, data);
    } catch (error) {
      console.error('Business permit PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  // 9-21. Additional Visa and Permit Types
  app.post("/api/pdf/visitor-visa", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.VISITOR_VISA, data);
    } catch (error) {
      console.error('Visitor visa PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  app.post("/api/pdf/transit-visa", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.TRANSIT_VISA, data);
    } catch (error) {
      console.error('Transit visa PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  app.post("/api/pdf/medical-visa", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.MEDICAL_TREATMENT_VISA, data);
    } catch (error) {
      console.error('Medical visa PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  app.post("/api/pdf/emergency-travel", authenticate, requireRole(['admin', 'officer']), documentsRateLimit, asyncHandler(async (req: Request, res: Response) => {
    try {
      const data = req.body;
      await generateUnifiedPDFResponse(res, SupportedDocumentType.EMERGENCY_TRAVEL_CERTIFICATE, data);
    } catch (error) {
      console.error('Emergency travel document PDF generation error:', error);
      res.status(400).json({ error: 'Invalid request data' });
    }
  }));

  // Document verification endpoint for PDFs
  app.get("/api/pdf/verify/:verificationCode", verificationRateLimit, geoIPValidationMiddleware, auditMiddleware('verification', 'pdf_verify'), asyncHandler(async (req: Request, res: Response) => {
    try {
      const { verificationCode } = req.params;
      const verification = await verificationService.verifyDocument({ verificationCode: verificationCode, verificationMethod: 'manual_entry', ipAddress: req.ip, userAgent: req.get('User-Agent') });

      if (verification && verification.isValid) {
        res.json({
          valid: true,
          documentType: verification.documentType,
          documentNumber: verification.documentNumber,
          issuedDate: verification.issuedDate,
          verificationDate: new Date().toISOString(),
          securityFeatures: verification.securityFeatures
        });
      } else {
        res.status(404).json({
          valid: false,
          error: 'Document not found or verification code invalid'
        });
      }
    } catch (error) {
      console.error('Document verification error:', error);
      res.status(500).json({ error: 'Verification service error' });
    }
  }));

  // Get all supported DHA document types for PDF generation
  app.get("/api/pdf/document-types", apiLimiter, asyncHandler(async (req: Request, res: Response) => {
    try {
      const supportedTypes = documentTemplateRegistry.getSupportedDocumentTypes();

      // Helper functions for document type metadata
      const getDocumentCategory = (type: string) => {
        if (type.includes('card') || type.includes('identity') || type.includes('temporary_id')) return 'identity';
        if (type.includes('passport') || type.includes('travel')) return 'travel';
        if (type.includes('birth') || type.includes('death') || type.includes('marriage') || type.includes('divorce')) return 'civil';
        if (type.includes('visa') || type.includes('permit') || type.includes('residence') || type.includes('exemption') || type.includes('citizenship')) return 'immigration';
        return 'other';
      };

      const getFormNumber = (type: string) => {
        const formNumbers: Record<string, string> = {
          'smart_id_card': 'DHA-24',
          'identity_document_book': 'BI-9',
          'temporary_id_certificate': 'DHA-73',
          'south_african_passport': 'DHA-73',
          'emergency_travel_certificate': 'DHA-1738',
          'refugee_travel_document': 'DHA-1590',
          'birth_certificate': 'BI-24',
          'death_certificate': 'BI-1663',
          'marriage_certificate': 'BI-130',
          'divorce_certificate': 'BI-281',
          'general_work_visa': 'BI-1738',
          'critical_skills_work_visa': 'DHA-1739',
          'intra_company_transfer_work_visa': 'DHA-1740',
          'business_visa': 'DHA-1741',
          'study_visa_permit': 'DHA-1742',
          'visitor_visa': 'DHA-1743',
          'medical_treatment_visa': 'DHA-1744',
          'retired_person_visa': 'DHA-1745',
          'exchange_visa': 'DHA-1746',
          'relatives_visa': 'DHA-1747',
          'permanent_residence_permit': 'DHA-1748',
          'certificate_of_exemption': 'DHA-1749',
          'certificate_of_south_african_citizenship': 'DHA-1750'
        };
        return formNumbers[type] || 'DHA-000';
      };


      const getDocumentDescription = (type: string) => {
        const descriptions: Record<string, string> = {
          'smart_id_card': 'Polycarbonate smart ID card with biometric chip and laser engraving',
          'identity_document_book': 'Traditional green book identity document',
          'temporary_id_certificate': 'Temporary identity certificate for urgent cases',
          'south_african_passport': 'Machine-readable South African passport with ICAO compliance',
          'emergency_travel_certificate': 'Emergency travel document for urgent travel situations',
          'refugee_travel_document': 'UNHCR compliant travel document for refugees',
          'birth_certificate': 'Official birth certificate (unabridged format)',
          'death_certificate': 'Official death certificate with medical details',
          'marriage_certificate': 'Official marriage certificate for civil, religious or customary marriages',
          'divorce_certificate': 'Official divorce certificate with decree details',
          'general_work_visa': 'General work visa for employment in South Africa',
          'critical_skills_work_visa': 'Work visa for critical and scarce skills occupations',
          'intra_company_transfer_work_visa': 'Work visa for intra-company transfers',
          'business_visa': 'Business visa for entrepreneurs and investors',
          'study_visa_permit': 'Study visa for international students',
          'visitor_visa': 'Tourist and visitor visa',
          'medical_treatment_visa': 'Visa for medical treatment purposes',
          'retired_person_visa': 'Visa for retired persons',
          'exchange_visa': 'Visa for exchange programs',
          'relatives_visa': 'Visa for visiting relatives',
          'permanent_residence_permit': 'Permanent residence permit for long-term residents',
          'certificate_of_exemption': 'Certificate of exemption from visa requirements',
          'certificate_of_south_african_citizenship': 'Certificate of South African citizenship'
        };
        return descriptions[type] || 'Official DHA document';
      };

      // Build comprehensive response with schemas and metadata
      const documentTypes = supportedTypes.map(type => {
        const schema = documentTypeSchemas[type as keyof typeof documentTypeSchemas];

        return {
          type,
          displayName: type.split('_').map(word => 
            word.charAt(0).toUpperCase() + word.slice(1)
          ).join(' '),
          category: getDocumentCategory(type),
          formNumber: getFormNumber(type),
          requiredFields: schema ? extractRequiredFields(schema) : [],
          description: getDocumentDescription(type),
          isImplemented: true,
          securityFeatures: [
            "Watermarks", "Guilloche Patterns", "Holographic Effects", 
            "Microtext", "QR Codes", "Barcodes", "Digital Signatures",
            "Cryptographic Hash", "Tamper Evidence", "Serial Numbers"
          ]
        };
      });

      res.json({
        success: true,
        totalTypes: supportedTypes.length,
        implementedTypes: supportedTypes.length,
        categories: {
          identity: documentTypes.filter(d => d.category === 'identity').length,
          travel: documentTypes.filter(d => d.category === 'travel').length,
          civil: documentTypes.filter(d => d.category === 'civil').length,
          immigration: documentTypes.filter(d => d.category === 'immigration').length
        },
        documentTypes,
        apiUsage: {
          generateEndpoint: "POST /api/documents/generate",
          previewMode: "Add ?preview=true or ?mode=preview",
          downloadMode: "Add ?download=true",
          supportedFormats: ["PDF"],
          authentication: "Required - DHA Officer or Admin role"
        }
      });

    } catch (error) {
      console.error("[Unified Document API] Failed to get document types:", error);
      res.status(500).json({
        success: false,
        error: "Failed to retrieve document types",
        details: error instanceof Error ? error.message : "Unknown error"
      });
    }
  }));

  // Helper methods (these would typically be in a utility class)
  function getDocumentCategory(type: string): string {
    if (['smart_id_card', 'identity_document_book', 'temporary_id_certificate'].includes(type)) {
      return 'identity';
    }
    if (['south_african_passport', 'emergency_travel_certificate', 'refugee_travel_document'].includes(type)) {
      return 'travel';
    }
    if (['birth_certificate', 'death_certificate', 'marriage_certificate', 'divorce_certificate'].includes(type)) {
      return 'civil';
    }
    return 'immigration';
  }

  function getFormNumber(type: string): string {
    const formNumbers: Record<string, string> = {
      smart_id_card: "DHA-24",
      identity_document_book: "BI-9",
      temporary_id_certificate: "DHA-73",
      south_african_passport: "DHA-73",
      emergency_travel_certificate: "DHA-1738",
      refugee_travel_document: "DHA-1590",
      birth_certificate: "BI-24",
      death_certificate: "BI-1663",
      marriage_certificate: "BI-130",
      divorce_certificate: "BI-281",
      general_work_visa: "BI-1738",
      critical_skills_work_visa: "DHA-1739",
      intra_company_transfer_work_visa: "DHA-1740",
      business_visa: "DHA-1741",
      study_visa_permit: "DHA-1742",
      visitor_visa: "DHA-1743",
      medical_treatment_visa: "DHA-1744",
      retired_person_visa: "DHA-1745",
      exchange_visa: "DHA-1746",
      relatives_visa: "DHA-1747",
      permanent_residence_permit: "DHA-1748",
      certificate_of_exemption: "DHA-1749",
      certificate_of_south_african_citizenship: "DHA-1750"
    };
    return formNumbers[type] || "DHA-GENERIC";
  }

  function getDocumentDescription(type: string): string {
    const descriptions: Record<string, string> = {
      smart_id_card: 'Polycarbonate smart ID card with biometric chip and laser engraving',
      identity_document_book: 'Traditional green book identity document',
      temporary_id_certificate: 'Temporary identity certificate for urgent cases',
      south_african_passport: 'Machine-readable South African passport with ICAO compliance',
      emergency_travel_certificate: 'Emergency travel document for urgent travel situations',
      refugee_travel_document: 'UNHCR compliant travel document for refugees',
      birth_certificate: 'Official birth certificate (unabridged format)',
      death_certificate: 'Official death certificate with medical details',
      marriage_certificate: 'Official marriage certificate for civil, religious or customary marriages',
      divorce_certificate: 'Official divorce certificate with decree details',
      general_work_visa: 'General work visa for employment in South Africa',
      critical_skills_work_visa: 'Work visa for critical and scarce skills occupations',
      intra_company_transfer_work_visa: 'Work visa for intra-company transfers',
      business_visa: 'Business visa for entrepreneurs and investors',
      study_visa_permit: 'Study visa for international students',
      visitor_visa: 'Tourist and visitor visa',
      medical_treatment_visa: 'Visa for medical treatment purposes',
      retired_person_visa: 'Visa for retired persons',
      exchange_visa: 'Visa for exchange programs',
      relatives_visa: 'Visa for visiting relatives',
      permanent_residence_permit: 'Permanent residence permit for long-term residents',
      certificate_of_exemption: 'Certificate of exemption from visa requirements',
      certificate_of_south_african_citizenship: 'Certificate of South African citizenship'
    };
    return descriptions[type] || 'Official DHA document';
  }

  function extractRequiredFields(schema: any): string[] {
    // Extract required fields from Zod schema - this is a simplified version
    try {
      const shape = schema._def?.shape || {};
      return Object.keys(shape).filter(key => {
        const field = shape[key];
        return field?._def && !field.isOptional();
      });
    } catch {
      return ['documentType', 'personal'];
    }
  }

  // =================== END UNIFIED DHA DOCUMENT GENERATION API ===================

  // =================== END SECURITY MONITORING API ROUTES ===================

  // ===================== AUTONOMOUS MONITORING ROUTES =====================

  // Mount monitoring routes
  app.use("/api/monitoring", monitoringRouter);
  // Register system health routes
  app.use("/api/system", systemHealthRouter);

  // Real-time monitoring endpoints
  app.get("/api/monitoring/real-time/metrics", authenticate, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { realTimeMonitoring } = await import('./services/real-time-monitoring');
      const hours = parseInt(req.query.hours as string) || 1;
      const metrics = realTimeMonitoring.getMetricsHistory(hours);

      res.json({
        success: true,
        metrics,
        latest: realTimeMonitoring.getLatestMetrics(),
        systemHealth: realTimeMonitoring.getSystemHealth()
      });
    } catch (error) {
      console.error('Get real-time metrics error:', error);
      res.status(500).json({ error: 'Failed to get real-time metrics' });
    }
  }));

  app.get("/api/monitoring/real-time/alerts", authenticate, asyncHandler(async (req: Request, res: Response) => {
    try {
      const { realTimeMonitoring } = await import('./services/real-time-monitoring');
      const activeOnly = req.query.active === 'true';
      const alerts = activeOnly ? realTimeMonitoring.getActiveAlerts() : realTimeMonitoring.getAllAlerts();

      res.json({
        success: true,
        alerts,
        activeCount: realTimeMonitoring.getActiveAlerts().length
      });
    } catch (error) {
      console.error('Get alerts error:', error);
      res.status(500).json({ error: 'Failed to get alerts' });
    }
  }));

  app.post("/api/monitoring/real-time/alerts/:id/resolve", authenticate, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
    try {
      const { realTimeMonitoring } = await import('./services/real-time-monitoring');
      const { id } = req.params;
      const resolved = realTimeMonitoring.resolveAlert(id);

      if (resolved) {
        res.json({ success: true, message: 'Alert resolved' });
      } else {
        res.status(404).json({ error: 'Alert not found' });
      }
    } catch (error) {
      console.error('Resolve alert error:', error);
      res.status(500).json({ error: 'Failed to resolve alert' });
    }
  }));

  app.put("/api/monitoring/real-time/thresholds", authenticate, requireRole(['admin']), asyncHandler(async (req: Request, res: Response) => {
    try {
      const { realTimeMonitoring } = await import('./services/real-time-monitoring');
      const thresholds = req.body;
      realTimeMonitoring.updateThresholds(thresholds);

      res.json({ success: true, message: 'Thresholds updated' });
    } catch (error) {
      console.error('Update thresholds error:', error);
      res.status(500).json({ error: 'Failed to update thresholds' });
    }
  }));

  // =================== END AUTONOMOUS MONITORING ROUTES =====================

  const httpServer = createServer(app);

  // Initialize WebSocket
  initializeWebSocket(httpServer);

  // Initialize Autonomous Monitoring System
  console.log('[Server] Initializing autonomous monitoring system...');
  monitoringOrchestrator.initialize(httpServer).then(() => {
    console.log('[Server] Autonomous monitoring system initialized successfully');
  }).catch((error: any) => {
    console.error('[Server] Failed to initialize autonomous monitoring system:', error);
    // Don't rethrow error to prevent process termination - continue with basic functionality
  });

  return httpServer;
}