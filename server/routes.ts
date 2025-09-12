import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
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
import { verificationService } from "./services/verification-service";
import { notificationService } from "./services/notification-service";
import { initializeWebSocket, getWebSocketService } from "./websocket";
import { auditTrailService } from "./services/audit-trail-service";
import { securityCorrelationEngine } from "./services/security-correlation-engine";
import { enhancedMonitoringService } from "./services/enhanced-monitoring-service";
import { intelligentAlertingService } from "./services/intelligent-alerting-service";
import { 
  insertUserSchema, 
  insertSecurityEventSchema, 
  insertDhaApplicationSchema, 
  insertDhaApplicantSchema,
  updateUserSchema,
  documentVerificationSchema,
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
  insertVerificationWorkflowSchema,
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
  sanitizedOptionalStringSchema
} from "@shared/schema";
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
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Initialize DHA workflow engine
  const dhaWorkflowEngine = new DHAWorkflowEngine();

  // Apply security middleware
  app.use(securityHeaders);
  app.use(ipFilter);
  app.use(securityLogger);
  
  // Apply audit trail middleware for comprehensive action logging
  app.use(auditTrailMiddleware.auditRequestMiddleware);

  // Public health endpoint for testing (Phase 0)
  app.get("/api/health", (req: Request, res: Response) => {
    res.json({
      status: "healthy",
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      environment: process.env.NODE_ENV || "development",
      version: "1.0.0"
    });
  });

  // Registration
  app.post("/api/auth/register", authLimiter, async (req: Request, res: Response) => {
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
  });

  // Login
  app.post("/api/auth/login", authLimiter, fraudDetection, async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body;

      if (!email || !password) {
        return res.status(400).json({ error: "Email and password required" });
      }

      // Get user
      const user = await storage.getUserByEmail(email);
      if (!user || !user.isActive) {
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
  });

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
      wsService?.sendToUser(user.id, "biometric:result", {
        verificationType: "verification",
        ...result
      });

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
      wsService?.sendToRole("admin", "fraud:alert", {
        type: "resolved",
        alertId: req.params.id,
        resolvedBy: user.id
      });

      res.json({ message: "Fraud alert resolved" });
    } catch (error) {
      console.error("Resolve fraud alert error:", error);
      res.status(500).json({ error: "Failed to resolve fraud alert" });
    }
  });

  app.post("/api/documents/upload", authenticate, uploadLimiter, documentUpload.single("document"), async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

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
  });

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
      const validatedData = documentVerificationSchema.parse(req.body);
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

  app.get("/api/verification/history/:documentId", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const history = await storage.getDocumentVerificationHistory(documentId);
      res.json(history);
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
        documentId,
        documentType,
        action,
        previousValue,
        newValue,
        actionBy: req.user!.id,
        actionReason: reason,
        actionNotes: notes,
        metadata: req.body.metadata,
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
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

  // Document verification endpoint (public)
  app.get("/api/verify/:verificationCode", async (req: Request, res: Response) => {
    try {
      const { verificationCode } = req.params;

      if (!verificationCode || verificationCode.length !== 32) {
        return res.status(400).json({ error: "Invalid verification code format" });
      }

      const verificationResult = await documentGenerator.verifyDocument(verificationCode);

      if (!verificationResult.isValid) {
        return res.status(404).json({ error: verificationResult.error || "Document not found or invalid" });
      }

      // Log verification attempt
      await storage.createSecurityEvent({
        eventType: "document_verified",
        severity: "low",
        details: { 
          verificationCode, 
          documentType: verificationResult.type,
          documentId: verificationResult.document?.id
        },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      res.json({
        isValid: true,
        type: verificationResult.type,
        document: {
          title: verificationResult.document?.title,
          description: verificationResult.document?.description,
          issuedAt: verificationResult.document?.issuedAt,
          expiresAt: verificationResult.document?.expiresAt,
          status: verificationResult.document?.status
        }
      });

    } catch (error) {
      console.error("Document verification error:", error);
      res.status(500).json({ error: "Verification failed" });
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

  // Birth Certificate Generation
  app.post("/api/documents/birth-certificate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const documentData = req.body;

      // Validate required fields
      if (!documentData.childFullName || !documentData.dateOfBirth || !documentData.placeOfBirth) {
        return res.status(400).json({ error: "Missing required fields for birth certificate" });
      }

      const birthCertificate = await documentGenerator.generateBirthCertificate(
        user.id,
        documentData
      );

      res.json({
        message: "Birth certificate generated successfully",
        document: birthCertificate,
        downloadUrl: `/documents/${birthCertificate.documentId}.pdf`
      });

    } catch (error) {
      console.error("Birth certificate generation error:", error);
      res.status(500).json({ error: "Birth certificate generation failed" });
    }
  });

  // Marriage Certificate Generation
  app.post("/api/documents/marriage-certificate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const documentData = req.body;

      // Validate required fields
      if (!documentData.partner1FullName || !documentData.partner2FullName || !documentData.marriageDate) {
        return res.status(400).json({ error: "Missing required fields for marriage certificate" });
      }

      const marriageCertificate = await documentGenerator.generateMarriageCertificate(
        user.id,
        documentData
      );

      res.json({
        message: "Marriage certificate generated successfully",
        document: marriageCertificate,
        downloadUrl: `/documents/${marriageCertificate.documentId}.pdf`
      });

    } catch (error) {
      console.error("Marriage certificate generation error:", error);
      res.status(500).json({ error: "Marriage certificate generation failed" });
    }
  });

  // Passport Generation
  app.post("/api/documents/passport", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const documentData = req.body;

      // Validate required fields
      if (!documentData.fullName || !documentData.dateOfBirth || !documentData.nationality) {
        return res.status(400).json({ error: "Missing required fields for passport" });
      }

      const passport = await documentGenerator.generatePassport(
        user.id,
        documentData
      );

      res.json({
        message: "Passport generated successfully",
        document: passport,
        downloadUrl: `/documents/${passport.documentId}.pdf`
      });

    } catch (error) {
      console.error("Passport generation error:", error);
      res.status(500).json({ error: "Passport generation failed" });
    }
  });

  // Death Certificate Generation
  app.post("/api/documents/death-certificate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const documentData = req.body;

      // Validate required fields
      if (!documentData.deceasedFullName || !documentData.dateOfDeath || !documentData.causeOfDeath) {
        return res.status(400).json({ error: "Missing required fields for death certificate" });
      }

      const deathCertificate = await documentGenerator.generateDeathCertificate(
        user.id,
        documentData
      );

      res.json({
        message: "Death certificate generated successfully",
        document: deathCertificate,
        downloadUrl: `/documents/${deathCertificate.documentId}.pdf`
      });

    } catch (error) {
      console.error("Death certificate generation error:", error);
      res.status(500).json({ error: "Death certificate generation failed" });
    }
  });

  // Work Permit Generation
  app.post("/api/documents/work-permit", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const documentData = req.body;

      // Validate required fields
      if (!documentData.employeeFullName || !documentData.employerName || !documentData.jobTitle) {
        return res.status(400).json({ error: "Missing required fields for work permit" });
      }

      const workPermit = await documentGenerator.generateWorkPermit(
        user.id,
        documentData
      );

      res.json({
        message: "Work permit generated successfully",
        document: workPermit,
        downloadUrl: `/documents/${workPermit.documentId}.pdf`
      });

    } catch (error) {
      console.error("Work permit generation error:", error);
      res.status(500).json({ error: "Work permit generation failed" });
    }
  });

  // Permanent Visa Generation
  app.post("/api/documents/permanent-visa", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const documentData = req.body;

      // Validate required fields
      if (!documentData.holderFullName || !documentData.visaType || !documentData.countryOfIssue) {
        return res.status(400).json({ error: "Missing required fields for permanent visa" });
      }

      const permanentVisa = await documentGenerator.generatePermanentVisa(
        user.id,
        documentData
      );

      res.json({
        message: "Permanent visa generated successfully",
        document: permanentVisa,
        downloadUrl: `/documents/${permanentVisa.documentId}.pdf`
      });

    } catch (error) {
      console.error("Permanent visa generation error:", error);
      res.status(500).json({ error: "Permanent visa generation failed" });
    }
  });

  // ID Card Generation
  app.post("/api/documents/id-card", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const documentData = req.body;

      // Validate required fields
      if (!documentData.fullName || !documentData.dateOfBirth || !documentData.address) {
        return res.status(400).json({ error: "Missing required fields for ID card" });
      }

      const idCard = await documentGenerator.generateIdCard(
        user.id,
        documentData
      );

      res.json({
        message: "ID card generated successfully",
        document: idCard,
        downloadUrl: `/documents/${idCard.documentId}.pdf`
      });

    } catch (error) {
      console.error("ID card generation error:", error);
      res.status(500).json({ error: "ID card generation failed" });
    }
  });

  // ==================== DOCUMENT RETRIEVAL ENDPOINTS ====================

  // Get Birth Certificates
  app.get("/api/documents/birth-certificates", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const birthCertificates = await storage.getBirthCertificates(user.id);
      res.json(birthCertificates);
    } catch (error) {
      console.error("Get birth certificates error:", error);
      res.status(500).json({ error: "Failed to retrieve birth certificates" });
    }
  });

  // Get Marriage Certificates
  app.get("/api/documents/marriage-certificates", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const marriageCertificates = await storage.getMarriageCertificates(user.id);
      res.json(marriageCertificates);
    } catch (error) {
      console.error("Get marriage certificates error:", error);
      res.status(500).json({ error: "Failed to retrieve marriage certificates" });
    }
  });

  // Get Passports
  app.get("/api/documents/passports", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const passports = await storage.getPassports(user.id);
      res.json(passports);
    } catch (error) {
      console.error("Get passports error:", error);
      res.status(500).json({ error: "Failed to retrieve passports" });
    }
  });

  // Get Death Certificates
  app.get("/api/documents/death-certificates", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const deathCertificates = await storage.getDeathCertificates(user.id);
      res.json(deathCertificates);
    } catch (error) {
      console.error("Get death certificates error:", error);
      res.status(500).json({ error: "Failed to retrieve death certificates" });
    }
  });

  // Get Work Permits
  app.get("/api/documents/work-permits", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const workPermits = await storage.getWorkPermits(user.id);
      res.json(workPermits);
    } catch (error) {
      console.error("Get work permits error:", error);
      res.status(500).json({ error: "Failed to retrieve work permits" });
    }
  });

  // Get Permanent Visas
  app.get("/api/documents/permanent-visas", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const permanentVisas = await storage.getPermanentVisas(user.id);
      res.json(permanentVisas);
    } catch (error) {
      console.error("Get permanent visas error:", error);
      res.status(500).json({ error: "Failed to retrieve permanent visas" });
    }
  });

  // Get ID Cards
  app.get("/api/documents/id-cards", authenticate, async (req: Request, res: Response) => {
    try {
      const user = (req as any).user;
      const idCards = await storage.getIdCards(user.id);
      res.json(idCards);
    } catch (error) {
      console.error("Get ID cards error:", error);
      res.status(500).json({ error: "Failed to retrieve ID cards" });
    }
  });

  // ==================== DOCUMENT VERIFICATION ENDPOINTS ====================

  // Verify Document by Verification Code
  app.post("/api/verify/document", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { verificationCode, documentType } = req.body;

      if (!verificationCode || !documentType) {
        return res.status(400).json({ error: "Verification code and document type required" });
      }

      let document = null;
      let isValid = false;

      // Check each document type
      switch (documentType) {
        case 'birth_certificate':
          document = await storage.getBirthCertificateByVerificationCode(verificationCode);
          break;
        case 'marriage_certificate':
          document = await storage.getMarriageCertificateByVerificationCode(verificationCode);
          break;
        case 'passport':
          document = await storage.getPassportByVerificationCode(verificationCode);
          break;
        case 'death_certificate':
          document = await storage.getDeathCertificateByVerificationCode(verificationCode);
          break;
        case 'work_permit':
          document = await storage.getWorkPermitByVerificationCode(verificationCode);
          break;
        case 'permanent_visa':
          document = await storage.getPermanentVisaByVerificationCode(verificationCode);
          break;
        case 'id_card':
          document = await storage.getIdCardByVerificationCode(verificationCode);
          break;
        default:
          return res.status(400).json({ error: "Invalid document type" });
      }

      isValid = document !== undefined;

      // Log verification attempt
      await storage.createDocumentVerification({
        documentType,
        documentId: document?.id || '',
        verificationCode,
        verificationResult: isValid ? 'valid' : 'invalid',
        verifierIpAddress: req.ip,
        verifierUserAgent: req.get("User-Agent")
      });

      if (isValid && document) {
        res.json({
          isValid: true,
          document: {
            id: document.id,
            type: documentType,
            verificationCode: document.verificationCode,
            createdAt: document.createdAt,
            status: 'verified'
          },
          verificationTimestamp: new Date()
        });
      } else {
        res.json({
          isValid: false,
          message: "Document not found or verification code invalid",
          verificationTimestamp: new Date()
        });
      }

    } catch (error) {
      console.error("Document verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Get Verification History
  app.get("/api/verify/history", authenticate, requireRole(["admin"]), async (req: Request, res: Response) => {
    try {
      const { documentType, documentId } = req.query;
      const verifications = await storage.getDocumentVerifications(
        documentType as string, 
        documentId as string
      );
      res.json(verifications);
    } catch (error) {
      console.error("Get verification history error:", error);
      res.status(500).json({ error: "Failed to retrieve verification history" });
    }
  });

  // Public Verification Portal (no authentication required)
  app.get("/api/verify/public/:verificationCode", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { verificationCode } = req.params;
      
      if (!verificationCode) {
        return res.status(400).json({ error: "Verification code required" });
      }

      // Check all document types for the verification code
      const documentTypes = ['birth_certificate', 'marriage_certificate', 'passport', 'death_certificate', 'work_permit', 'permanent_visa', 'id_card'];
      
      for (const docType of documentTypes) {
        let document = null;
        
        switch (docType) {
          case 'birth_certificate':
            document = await storage.getBirthCertificateByVerificationCode(verificationCode);
            break;
          case 'marriage_certificate':
            document = await storage.getMarriageCertificateByVerificationCode(verificationCode);
            break;
          case 'passport':
            document = await storage.getPassportByVerificationCode(verificationCode);
            break;
          case 'death_certificate':
            document = await storage.getDeathCertificateByVerificationCode(verificationCode);
            break;
          case 'work_permit':
            document = await storage.getWorkPermitByVerificationCode(verificationCode);
            break;
          case 'permanent_visa':
            document = await storage.getPermanentVisaByVerificationCode(verificationCode);
            break;
          case 'id_card':
            document = await storage.getIdCardByVerificationCode(verificationCode);
            break;
        }

        if (document) {
          // Log public verification
          await storage.createDocumentVerification({
            documentType: docType,
            documentId: document.id,
            verificationCode,
            verificationResult: 'valid',
            verifierIpAddress: req.ip,
            verifierUserAgent: req.get("User-Agent")
          });

          return res.json({
            isValid: true,
            documentType: docType,
            verificationCode,
            issuedDate: document.createdAt,
            status: 'verified',
            verificationTimestamp: new Date()
          });
        }
      }

      // No document found
      await storage.createDocumentVerification({
        documentType: 'unknown',
        documentId: '',
        verificationCode,
        verificationResult: 'invalid',
        verifierIpAddress: req.ip,
        verifierUserAgent: req.get("User-Agent")
      });

      res.json({
        isValid: false,
        message: "Document not found",
        verificationTimestamp: new Date()
      });

    } catch (error) {
      console.error("Public verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // ==================== DHA API ROUTES ====================

  // Create DHA applicant profile
  app.post("/api/dha/applicants", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const applicantData = insertDhaApplicantSchema.parse(req.body);
      
      const applicant = await storage.createDhaApplicant({
        ...applicantData,
        userId: req.user.id
      });

      await storage.createSecurityEvent({
        userId: req.user.id,
        eventType: "dha_applicant_created",
        severity: "low",
        details: { applicantId: applicant.id },
        ipAddress: req.ip,
        userAgent: req.get("User-Agent") || ""
      });

      res.status(201).json({
        message: "DHA applicant profile created successfully",
        applicant
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid applicant data", details: error.errors });
      }
      console.error("Create DHA applicant error:", error);
      res.status(500).json({ error: "Failed to create applicant profile" });
    }
  });

  // Create DHA application
  app.post("/api/dha/applications", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const validatedData = dhaApplicationCreationSchema.parse(req.body);
      const { applicantId, applicationType, applicationData } = validatedData;

      // Verify applicant belongs to user
      const applicant = await storage.getDhaApplicant(applicantId);
      if (!applicant || applicant.userId !== req.user.id) {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await dhaWorkflowEngine.submitApplication(
        applicantId,
        req.user.id,
        applicationType as any,
        applicationData
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.status(201).json({
        message: "DHA application submitted successfully",
        applicationId: result.applicationId
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Create DHA application error:", error);
      res.status(500).json({ error: "Failed to create application" });
    }
  });

  // Get DHA application status
  app.get("/api/dha/applications/:id", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { id } = req.params;
      
      const application = await storage.getDhaApplication(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Check access permissions
      if (application.userId !== req.user.id && (req.user as any).role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      // Get related applicant and verifications
      const [applicant, verifications, backgroundChecks] = await Promise.all([
        storage.getDhaApplicant(application.applicantId),
        storage.getDhaVerifications({ applicationId: application.id }),
        storage.getDhaBackgroundChecks({ applicationId: application.id })
      ]);

      res.json({
        application,
        applicant,
        verifications,
        backgroundChecks,
        statusHistory: typeof application.previousStates === 'string' ? JSON.parse(application.previousStates) : []
      });

    } catch (error) {
      console.error("Get DHA application error:", error);
      res.status(500).json({ error: "Failed to get application" });
    }
  });

  // NPR Identity Verification
  app.post("/api/dha/verify/identity", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedData = dhaIdentityVerificationSchema.parse(req.body);
      const { applicantId, applicationId, idNumber, fullName, dateOfBirth, placeOfBirth } = validatedData;

      const result = await dhaNPRAdapter.verifyPerson({
        applicantId,
        applicationId,
        idNumber,
        fullName,
        surname: fullName.split(' ').pop() || '',
        dateOfBirth: dateOfBirth ? new Date(dateOfBirth) : new Date(),
        placeOfBirth: placeOfBirth || '',
        verificationMethod: 'combined'
      });

      res.json({
        success: true,
        verificationResult: result,
        message: "Identity verification completed"
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("NPR identity verification error:", error);
      res.status(500).json({ error: "Identity verification failed" });
    }
  });

  // Passport MRZ and PKD Verification  
  app.post("/api/dha/verify/passport", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedData = dhaPassportVerificationSchema.parse(req.body);
      const { applicantId, applicationId, mrzLine1, mrzLine2, passportImage } = validatedData;

      // Parse MRZ data
      const mrzResult = await dhaMRZParser.parseMRZ({
        applicantId,
        applicationId,
        mrzLine1,
        mrzLine2,
        validateChecksums: true,
        strictValidation: true
      });

      let pkdResult = null;
      if (passportImage && mrzResult.success) {
        // Verify passport security features via PKD
        pkdResult = await dhaPKDAdapter.validatePassportCertificates({
          applicantId,
          applicationId,
          passportNumber: mrzResult.parsedData?.passportNumber || '',
          documentSOD: passportImage,
          certificates: [],
          validationLevel: 'basic',
          checkRevocation: true
        });
      }

      res.json({
        success: true,
        mrzVerification: mrzResult,
        pkdVerification: pkdResult,
        message: "Passport verification completed"
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Passport verification error:", error);
      res.status(500).json({ error: "Passport verification failed" });
    }
  });

  // SAPS Background Check
  app.post("/api/dha/background-check", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const validatedData = dhaBackgroundCheckCreationSchema.parse(req.body);
      const { applicantId, applicationId, purpose, consentGiven } = validatedData;

      if (!consentGiven) {
        return res.status(400).json({ error: "Consent required for background check" });
      }

      const result = await dhaSAPSAdapter.performCriminalRecordCheck({
        applicantId,
        applicationId,
        idNumber: '',
        fullName: '',
        dateOfBirth: new Date(),
        purposeOfCheck: purpose as any,
        checkType: 'basic',
        consentGiven: true,
        requestedBy: req.user.id
      });

      res.json({
        success: true,
        backgroundCheck: result,
        message: "Background check completed"
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("Background check error:", error);
      res.status(500).json({ error: "Background check failed" });
    }
  });

  // Get user's DHA applications
  app.get("/api/dha/applications", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { status, type } = req.query;
      
      const filters: any = { userId: req.user.id };
      if (status) filters.currentState = status;
      if (type) filters.applicationType = type;

      const applications = await storage.getDhaApplications(undefined, req.user.id);
      
      res.json(applications);

    } catch (error) {
      console.error("Get DHA applications error:", error);
      res.status(500).json({ error: "Failed to get applications" });
    }
  });

  // DHA Public Verification Portal
  app.get("/api/dha/verify/:verificationCode", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { verificationCode } = req.params;
      
      if (!verificationCode) {
        return res.status(400).json({ error: "Verification code required" });
      }

      // Check DHA applications by verification code (if implemented in schema)
      // Connect to real DHA document verification system
      try {
        const verificationResponse = await fetch(`${process.env.DHA_API_BASE_URL}/verify-document`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.DHA_API_KEY}`,
            'X-API-Version': '2025.1'
          },
          body: JSON.stringify({
            verificationCode,
            requestId: crypto.randomUUID(),
            timestamp: new Date().toISOString()
          })
        });
        
        const result = await verificationResponse.json();
        
        if (result.isValid) {
          await storage.createSecurityEvent({
            eventType: "dha_document_verification_success",
            severity: "low",
            details: { verificationCode, documentType: result.documentType },
            ipAddress: req.ip,
            userAgent: req.get("User-Agent") || ""
          });
        }

        res.json({
          isValid: result.isValid,
          documentType: result.documentType,
          verificationCode,
          status: result.status,
          verificationTimestamp: new Date(),
          message: result.isValid ? "Document verified by DHA" : "Invalid verification code",
          issuer: result.issuer,
          documentDetails: result.documentDetails
        });
      } catch (error) {
        // If real API fails, return error
        res.json({
          isValid: false,
          message: "Document verification system temporarily unavailable",
          verificationTimestamp: new Date()
        });
      }

    } catch (error) {
      console.error("DHA public verification error:", error);
      res.status(500).json({ error: "Verification failed" });
    }
  });

  // Get DHA applicant profiles
  app.get("/api/dha/applicants", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const applicants = await storage.getDhaApplicants(req.user.id);
      res.json(applicants);
    } catch (error) {
      console.error("Get DHA applicants error:", error);
      res.status(500).json({ error: "Failed to get applicants" });
    }
  });

  // PDF Generation Routes
  // Generate Work Permit PDF
  app.post("/api/pdf/work-permit", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const { 
        personal, 
        permitNumber, 
        permitType, 
        employer, 
        occupation, 
        validFrom, 
        validUntil, 
        conditions, 
        endorsements,
        portOfEntry,
        dateOfEntry,
        controlNumber 
      } = req.body;

      const pdfBuffer = await pdfGenerationService.generateWorkPermitPDF({
        personal,
        permitNumber: permitNumber || `WP-${Date.now()}`,
        permitType: permitType || "Section 19(1)",
        employer,
        occupation,
        validFrom,
        validUntil,
        conditions,
        endorsements,
        portOfEntry,
        dateOfEntry,
        controlNumber
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="work-permit-${permitNumber || Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Work permit PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate work permit PDF" });
    }
  });

  // Generate Asylum Visa PDF
  app.post("/api/pdf/asylum-visa", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const {
        personal,
        permitNumber,
        fileReference,
        unhcrNumber,
        countryOfOrigin,
        dateOfApplication,
        validFrom,
        validUntil,
        conditions,
        dependents
      } = req.body;

      const pdfBuffer = await pdfGenerationService.generateAsylumVisaPDF({
        personal,
        permitNumber: permitNumber || `AS-${Date.now()}`,
        fileReference: fileReference || `REF-${Date.now()}`,
        unhcrNumber,
        countryOfOrigin,
        dateOfApplication,
        validFrom,
        validUntil,
        conditions,
        dependents
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="asylum-visa-${permitNumber || Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Asylum visa PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate asylum visa PDF" });
    }
  });

  // Generate Residence Permit PDF
  app.post("/api/pdf/residence-permit", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const {
        personal,
        permitNumber,
        permitCategory,
        validFrom,
        validUntil,
        conditions,
        endorsements,
        previousPermitNumber,
        spouseName,
        dependents
      } = req.body;

      const pdfBuffer = await pdfGenerationService.generateResidencePermitPDF({
        personal,
        permitNumber: permitNumber || `PR-${Date.now()}`,
        permitCategory: permitCategory || "Permanent Residence",
        validFrom,
        validUntil,
        conditions,
        endorsements,
        previousPermitNumber,
        spouseName,
        dependents
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="residence-permit-${permitNumber || Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Residence permit PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate residence permit PDF" });
    }
  });

  // Generate Birth Certificate PDF
  app.post("/api/pdf/birth-certificate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const {
        registrationNumber,
        fullName,
        dateOfBirth,
        placeOfBirth,
        gender,
        idNumber,
        mother,
        father,
        dateOfRegistration,
        registrationOffice
      } = req.body;

      const pdfBuffer = await pdfGenerationService.generateBirthCertificatePDF({
        registrationNumber: registrationNumber || `BC-${Date.now()}`,
        fullName,
        dateOfBirth,
        placeOfBirth,
        gender,
        idNumber,
        mother,
        father,
        dateOfRegistration: dateOfRegistration || new Date().toLocaleDateString('en-ZA'),
        registrationOffice: registrationOffice || "Pretoria Home Affairs"
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="birth-certificate-${registrationNumber || Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Birth certificate PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate birth certificate PDF" });
    }
  });

  // Generate Passport PDF
  app.post("/api/pdf/passport", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const {
        personal,
        passportNumber,
        passportType,
        dateOfIssue,
        dateOfExpiry,
        placeOfIssue,
        machineReadableZone,
        previousPassportNumber
      } = req.body;

      const pdfBuffer = await pdfGenerationService.generatePassportPDF({
        personal,
        passportNumber: passportNumber || `A${Math.floor(Math.random() * 90000000 + 10000000)}`,
        passportType: passportType || "Ordinary",
        dateOfIssue: dateOfIssue || new Date().toLocaleDateString('en-ZA'),
        dateOfExpiry: dateOfExpiry || new Date(Date.now() + 10 * 365 * 24 * 60 * 60 * 1000).toLocaleDateString('en-ZA'),
        placeOfIssue: placeOfIssue || "Pretoria",
        machineReadableZone,
        previousPassportNumber
      });

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="passport-${passportNumber || Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Passport PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate passport PDF" });
    }
  });

  // Generate Exceptional Skills Permit PDF
  app.post("/api/pdf/exceptional-skills", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateExceptionalSkillsPermitPDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="exceptional-skills-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Exceptional skills PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate exceptional skills permit PDF" });
    }
  });

  // Generate Study Permit PDF
  app.post("/api/pdf/study-permit", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateStudyPermitPDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="study-permit-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Study permit PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate study permit PDF" });
    }
  });

  // Generate DHA-84 Visitor's/Transit Visa PDF
  app.post("/api/pdf/visitor-visa", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateVisitorVisaPDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="visitor-visa-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Visitor visa PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate visitor visa PDF" });
    }
  });

  // Generate DHA-1738 Temporary Residence Permit PDF
  app.post("/api/pdf/temporary-residence", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateTemporaryResidencePDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="temporary-residence-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Temporary residence PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate temporary residence PDF" });
    }
  });

  // Generate BI-947 General Work Permit PDF
  app.post("/api/pdf/general-work", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateGeneralWorkPermitPDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="general-work-permit-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("General work permit PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate general work permit PDF" });
    }
  });

  // Generate Medical Certificate PDF
  app.post("/api/pdf/medical-certificate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateMedicalCertificatePDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="medical-certificate-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Medical certificate PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate medical certificate PDF" });
    }
  });

  // Generate Radiological Report PDF
  app.post("/api/pdf/radiological-report", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateRadiologicalReportPDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="radiological-report-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Radiological report PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate radiological report PDF" });
    }
  });

  // Generate Critical Skills Visa PDF
  app.post("/api/pdf/critical-skills", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateCriticalSkillsVisaPDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="critical-skills-visa-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Critical skills visa PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate critical skills visa PDF" });
    }
  });

  // Generate Business Visa PDF
  app.post("/api/pdf/business-visa", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateBusinessVisaPDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="business-visa-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Business visa PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate business visa PDF" });
    }
  });

  // Generate Retirement Visa PDF
  app.post("/api/pdf/retirement-visa", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      const pdfBuffer = await pdfGenerationService.generateRetirementVisaPDF(req.body);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="retirement-visa-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Retirement visa PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate retirement visa PDF" });
    }
  });

  // Generate Relatives Visa PDF (using visitor visa template with modifications)
  app.post("/api/pdf/relatives-visa", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Modify data to indicate relatives visa type
      const relativesVisaData = {
        ...req.body,
        visaType: "Relatives",
        purposeOfVisit: req.body.purposeOfVisit || "Visiting family members in South Africa"
      };

      const pdfBuffer = await pdfGenerationService.generateVisitorVisaPDF(relativesVisaData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="relatives-visa-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Relatives visa PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate relatives visa PDF" });
    }
  });

  // Generate Corporate Visa PDF (using business visa template with modifications)
  app.post("/api/pdf/corporate-visa", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }

      // Modify data to indicate corporate visa type
      const corporateVisaData = {
        ...req.body,
        visaType: "Corporate",
        businessDetails: {
          ...req.body.businessDetails,
          businessType: req.body.businessDetails?.businessType || "Corporate Entity"
        }
      };

      const pdfBuffer = await pdfGenerationService.generateBusinessVisaPDF(corporateVisaData);

      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="corporate-visa-${Date.now()}.pdf"`);
      res.send(pdfBuffer);

    } catch (error) {
      console.error("Corporate visa PDF generation error:", error);
      res.status(500).json({ error: "Failed to generate corporate visa PDF" });
    }
  });

  // DHA Admin Routes (for admin users only)
  app.get("/api/dha/admin/applications", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { status, type, office } = req.query;
      const filters: any = {};
      
      if (status) filters.currentState = status;
      if (type) filters.applicationType = type;
      if (office) filters.assignedOffice = office;

      const applications = await storage.getDhaApplications();
      res.json(applications);

    } catch (error) {
      console.error("Get admin DHA applications error:", error);
      res.status(500).json({ error: "Failed to get applications" });
    }
  });

  // DHA Workflow State Transition (for processing applications)
  app.post("/api/dha/applications/:id/transition", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      if (!req.user) {
        return res.status(401).json({ error: "Authentication required" });
      }
      const { id } = req.params;
      const validatedData = dhaApplicationTransitionSchema.parse(req.body);
      const { targetState, reason, data } = validatedData;

      const application = await storage.getDhaApplication(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Check permissions
      if (application.userId !== req.user.id && (req.user as any).role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await dhaWorkflowEngine.processWorkflowTransition({
        applicationId: id,
        applicantId: application.applicantId,
        userId: req.user.id,
        currentState: application.currentState as any,
        targetState: targetState as any,
        triggerReason: reason || 'Manual transition',
        actorId: req.user.id,
        actorName: (req.user as any).username || (req.user as any).email,
        documentData: data || {}
      });

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      res.json({
        success: true,
        newState: result.nextState,
        processingTime: result.processingTime,
        message: "State transition completed successfully"
      });

    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid input", details: error.errors });
      }
      console.error("DHA workflow transition error:", error);
      res.status(500).json({ error: "Workflow transition failed" });
    }
  });

  // ===================== NOTIFICATION API ROUTES =====================

  // Get user notifications with optional filtering
  app.get("/api/notifications", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { category, priority, isRead, limit, offset } = req.query;
      
      const filters: any = {};
      if (category) filters.category = String(category);
      if (priority) filters.priority = String(priority);
      if (isRead !== undefined) filters.isRead = isRead === 'true';
      if (limit) filters.limit = parseInt(String(limit), 10);
      if (offset) filters.offset = parseInt(String(offset), 10);
      
      const notifications = await notificationService.getNotifications(userId, filters);
      res.json(notifications);
    } catch (error) {
      console.error("Get notifications error:", error);
      res.status(500).json({ error: "Failed to retrieve notifications" });
    }
  });

  // Get unread notification count
  app.get("/api/notifications/count", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const count = await notificationService.getUnreadCount(userId);
      res.json({ count });
    } catch (error) {
      console.error("Get notification count error:", error);
      res.status(500).json({ error: "Failed to retrieve notification count" });
    }
  });

  // Mark notification as read
  app.post("/api/notifications/:id/read", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Verify notification belongs to user
      const notification = await storage.getNotification(id);
      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      await notificationService.markAsRead(id);
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Mark notification as read error:", error);
      res.status(500).json({ error: "Failed to mark notification as read" });
    }
  });

  // Mark all notifications as read
  app.post("/api/notifications/mark-all-read", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      await notificationService.markAllAsRead(userId);
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      console.error("Mark all notifications as read error:", error);
      res.status(500).json({ error: "Failed to mark all notifications as read" });
    }
  });

  // Archive notification
  app.post("/api/notifications/:id/archive", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { id } = req.params;
      const userId = (req as any).user.id;
      
      // Verify notification belongs to user
      const notification = await storage.getNotification(id);
      if (!notification || notification.userId !== userId) {
        return res.status(404).json({ error: "Notification not found" });
      }
      
      await storage.archiveNotification(id);
      res.json({ message: "Notification archived" });
    } catch (error) {
      console.error("Archive notification error:", error);
      res.status(500).json({ error: "Failed to archive notification" });
    }
  });

  // Get user notification preferences
  app.get("/api/notifications/preferences", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const preferences = await notificationService.getUserPreferences(userId);
      res.json(preferences);
    } catch (error) {
      console.error("Get notification preferences error:", error);
      res.status(500).json({ error: "Failed to retrieve notification preferences" });
    }
  });

  // Update user notification preferences
  app.patch("/api/notifications/preferences", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const updates = updateNotificationPreferencesSchema.parse(req.body);
      
      await notificationService.updateUserPreferences(userId, updates);
      res.json({ message: "Notification preferences updated" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid preferences data", details: error.errors });
      }
      console.error("Update notification preferences error:", error);
      res.status(500).json({ error: "Failed to update notification preferences" });
    }
  });

  // Create notification (admin only)
  app.post("/api/notifications", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      const notificationData = insertNotificationEventSchema.parse(req.body);
      
      // Clean up null values for notification service
      const cleanedData = {
        ...notificationData,
        userId: notificationData.userId || undefined,
        expiresAt: notificationData.expiresAt || undefined,
        payload: notificationData.payload || undefined,
        category: notificationData.category as any,
        createdBy: adminId
      };
      const notification = await notificationService.createNotification(cleanedData);
      
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid notification data", details: error.errors });
      }
      console.error("Create notification error:", error);
      res.status(500).json({ error: "Failed to create notification" });
    }
  });

  // Send system-wide notification (admin only)
  app.post("/api/notifications/system", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      const validatedData = systemNotificationSchema.parse(req.body);
      const { targetRole, ...notificationData } = validatedData;
      
      // Clean up null values for notification service
      const cleanedData = {
        ...notificationData,
        expiresAt: notificationData.expiresAt || undefined,
        payload: notificationData.payload || undefined,
        category: notificationData.category as any,
        createdBy: adminId
      };
      const notifications = await notificationService.sendSystemNotification(
        cleanedData,
        targetRole
      );
      
      res.status(201).json({ 
        message: `Sent ${notifications.length} notifications`,
        notifications: notifications.length 
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid notification data", details: error.errors });
      }
      console.error("Send system notification error:", error);
      res.status(500).json({ error: "Failed to send system notification" });
    }
  });

  // Send critical alert (admin only)
  app.post("/api/notifications/critical", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      const validatedData = criticalAlertSchema.parse(req.body);
      
      // Set critical alert properties
      const notificationData = {
        ...validatedData,
        priority: "CRITICAL" as const,
        category: "SECURITY" as const
      };
      
      // Clean up payload for notification service
      const cleanedData = {
        ...notificationData,
        payload: (notificationData.payload || undefined) as any,
        createdBy: adminId
      };
      const notification = await notificationService.sendCriticalAlert(cleanedData);
      
      res.status(201).json(notification);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid alert data", details: error.errors });
      }
      console.error("Send critical alert error:", error);
      res.status(500).json({ error: "Failed to send critical alert" });
    }
  });

  // ===================== STATUS UPDATE API ROUTES =====================

  // Get status updates for an entity
  app.get("/api/status/:entityType/:entityId", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      const { limit } = req.query;
      
      const statusUpdates = await storage.getStatusUpdates({
        entityType,
        entityId,
        isPublic: true,
        limit: limit ? parseInt(String(limit), 10) : 20
      });
      
      res.json(statusUpdates);
    } catch (error) {
      console.error("Get status updates error:", error);
      res.status(500).json({ error: "Failed to retrieve status updates" });
    }
  });

  // Get latest status for an entity
  app.get("/api/status/latest/:entityType/:entityId", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { entityType, entityId } = req.params;
      
      const latestStatus = await storage.getLatestStatusUpdate(entityType, entityId);
      res.json(latestStatus);
    } catch (error) {
      console.error("Get latest status error:", error);
      res.status(500).json({ error: "Failed to retrieve latest status" });
    }
  });

  // Create status update (admin only)
  app.post("/api/status", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const adminId = (req as any).user.id;
      const statusData = req.body;
      
      const statusUpdate = await notificationService.createStatusUpdate({
        ...statusData,
        updatedBy: adminId
      });
      
      res.status(201).json(statusUpdate);
    } catch (error) {
      console.error("Create status update error:", error);
      res.status(500).json({ error: "Failed to create status update" });
    }
  });

  // ===================== CHAT API ROUTES =====================

  // Get user's chat sessions
  app.get("/api/chat/sessions", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      
      let sessions;
      if (userRole === 'admin') {
        const { userId: filterUserId } = req.query;
        sessions = await storage.getChatSessions(filterUserId ? String(filterUserId) : undefined, userId);
      } else {
        sessions = await storage.getChatSessions(userId);
      }
      
      res.json(sessions);
    } catch (error) {
      console.error("Get chat sessions error:", error);
      res.status(500).json({ error: "Failed to retrieve chat sessions" });
    }
  });

  // Create new chat session
  app.post("/api/chat/sessions", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const userId = (req as any).user.id;
      const { subject, priority } = req.body;
      
      const session = await storage.createChatSession({
        userId,
        subject: subject || "Support Request",
        priority: priority || "medium",
        sessionType: "support",
        status: "active"
      });
      
      res.status(201).json(session);
    } catch (error) {
      console.error("Create chat session error:", error);
      res.status(500).json({ error: "Failed to create chat session" });
    }
  });

  // Get messages in a chat session
  app.get("/api/chat/sessions/:sessionId/messages", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      
      // Verify access to session
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      
      if (userRole !== 'admin' && session.userId !== userId) {
        return res.status(403).json({ error: "Access denied to chat session" });
      }
      
      const messages = await storage.getChatMessages(sessionId);
      res.json(messages);
    } catch (error) {
      console.error("Get chat messages error:", error);
      res.status(500).json({ error: "Failed to retrieve chat messages" });
    }
  });

  // Send message in chat session
  app.post("/api/chat/sessions/:sessionId/messages", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { sessionId } = req.params;
      const { content, messageType } = req.body;
      const userId = (req as any).user.id;
      const userRole = (req as any).user.role;
      
      // Verify access to session
      const session = await storage.getChatSession(sessionId);
      if (!session) {
        return res.status(404).json({ error: "Chat session not found" });
      }
      
      if (userRole !== 'admin' && session.userId !== userId) {
        return res.status(403).json({ error: "Access denied to chat session" });
      }
      
      const message = await storage.createChatMessage({
        chatSessionId: sessionId,
        senderId: userId,
        content,
        messageType: messageType || "text"
      });
      
      // Send real-time notification via WebSocket
      const wsService = getWebSocketService();
      if (wsService) {
        const targetUserId = userRole === 'admin' ? session.userId : session.adminId;
        if (targetUserId) {
          wsService.sendToUser(targetUserId, "chat:new_message", {
            sessionId,
            message
          });
        }
      }
      
      res.status(201).json(message);
    } catch (error) {
      console.error("Send chat message error:", error);
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  // =================== AI ASSISTANT AND INTELLIGENCE API ROUTES ===================
  
  // AI Chat - Generate response
  app.post("/api/ai/chat", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { message, conversationId, includeContext } = req.body;
      const userId = (req as any).user.id;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }
      
      const response = await aiAssistantService.generateResponse(
        message,
        userId,
        conversationId || "default",
        includeContext !== false
      );
      
      res.json(response);
    } catch (error) {
      console.error("AI chat error:", error);
      res.status(500).json({ error: "AI service unavailable" });
    }
  });
  
  // AI Translation
  app.post("/api/ai/translate", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { text, targetLanguage, sourceLanguage } = req.body;
      
      if (!text || !targetLanguage) {
        return res.status(400).json({ error: "Text and target language are required" });
      }
      
      const result = await aiAssistantService.translateMessage(text, targetLanguage, sourceLanguage);
      res.json(result);
    } catch (error) {
      console.error("Translation error:", error);
      res.status(500).json({ error: "Translation service unavailable" });
    }
  });
  
  // AI Document Analysis
  app.post("/api/ai/analyze-document", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentContent, documentType } = req.body;
      
      if (!documentContent || !documentType) {
        return res.status(400).json({ error: "Document content and type are required" });
      }
      
      const result = await aiAssistantService.analyzeDocument(documentContent, documentType);
      res.json(result);
    } catch (error) {
      console.error("Document analysis error:", error);
      res.status(500).json({ error: "Document analysis service unavailable" });
    }
  });
  
  // AI Document Requirements
  app.post("/api/ai/document-requirements", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentType, userContext } = req.body;
      
      if (!documentType) {
        return res.status(400).json({ error: "Document type is required" });
      }
      
      const result = await aiAssistantService.getDocumentRequirements(documentType, userContext);
      res.json(result);
    } catch (error) {
      console.error("Document requirements error:", error);
      res.status(500).json({ error: "Requirements service unavailable" });
    }
  });
  
  // AI Form Assistant
  app.post("/api/ai/form-assist", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { formType, userInput, formData } = req.body;
      
      if (!formType || !userInput) {
        return res.status(400).json({ error: "Form type and user input are required" });
      }
      
      const result = await aiAssistantService.generateFormResponse(formType, userInput, formData);
      res.json(result);
    } catch (error) {
      console.error("Form assistance error:", error);
      res.status(500).json({ error: "Form assistance unavailable" });
    }
  });
  
  // AI Processing Time Prediction
  app.post("/api/ai/predict-processing-time", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentType, currentQueue, historicalData } = req.body;
      
      if (!documentType) {
        return res.status(400).json({ error: "Document type is required" });
      }
      
      const result = await aiAssistantService.predictProcessingTime(
        documentType,
        currentQueue || 0,
        historicalData
      );
      res.json(result);
    } catch (error) {
      console.error("Processing time prediction error:", error);
      res.status(500).json({ error: "Prediction service unavailable" });
    }
  });
  
  // AI Anomaly Detection
  app.post("/api/ai/detect-anomalies", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { data, dataType } = req.body;
      
      if (!data || !dataType) {
        return res.status(400).json({ error: "Data and data type are required" });
      }
      
      const result = await aiAssistantService.detectAnomalies(data, dataType);
      res.json(result);
    } catch (error) {
      console.error("Anomaly detection error:", error);
      res.status(500).json({ error: "Anomaly detection service unavailable" });
    }
  });

  // =================== COMPREHENSIVE SECURITY MONITORING API ROUTES ===================

  // Security Dashboard - Get comprehensive security dashboard data
  app.get("/api/security/dashboard", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const dashboard = await enhancedMonitoringService.getSecurityDashboard();
      res.json(dashboard);
    } catch (error) {
      console.error("Security dashboard error:", error);
      res.status(500).json({ error: "Failed to get security dashboard data" });
    }
  });

  // Security Metrics - Get current security metrics
  app.get("/api/security/metrics", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const metrics = await enhancedMonitoringService.getSecurityMetrics();
      res.json(metrics);
    } catch (error) {
      console.error("Security metrics error:", error);
      res.status(500).json({ error: "Failed to get security metrics" });
    }
  });

  // Security Trends - Get security trends for specified timeframe
  app.get("/api/security/trends/:timeframe", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { timeframe } = req.params;
      if (!['1h', '24h', '7d', '30d'].includes(timeframe)) {
        return res.status(400).json({ error: "Invalid timeframe. Use: 1h, 24h, 7d, or 30d" });
      }
      
      const trends = await enhancedMonitoringService.getSecurityTrends(timeframe as any);
      res.json(trends);
    } catch (error) {
      console.error("Security trends error:", error);
      res.status(500).json({ error: "Failed to get security trends" });
    }
  });

  // Security Alerts - Get security alerts with filtering
  app.get("/api/security/alerts", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = alertFilterSchema.parse({
        severity: req.query.severity,
        status: req.query.status,
        userId: req.query.userId,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      });
      
      const alertsData = await intelligentAlertingService.getAlerts(validatedQuery);
      res.json(alertsData);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Security alerts error:", error);
      res.status(500).json({ error: "Failed to get security alerts" });
    }
  });

  // Acknowledge Alert
  app.post("/api/security/alerts/:alertId/acknowledge", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const validatedData = alertActionSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      if (!alertId || !/^[a-zA-Z0-9_-]+$/.test(alertId)) {
        return res.status(400).json({ error: "Invalid alert ID format" });
      }
      
      await intelligentAlertingService.acknowledgeAlert(alertId, userId, validatedData.notes);
      res.json({ message: "Alert acknowledged successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Acknowledge alert error:", error);
      res.status(500).json({ error: "Failed to acknowledge alert" });
    }
  });

  // Resolve Alert
  app.post("/api/security/alerts/:alertId/resolve", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const validatedData = alertActionSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      if (!alertId || !/^[a-zA-Z0-9_-]+$/.test(alertId)) {
        return res.status(400).json({ error: "Invalid alert ID format" });
      }
      
      if (!validatedData.resolution) {
        return res.status(400).json({ error: "Resolution description is required" });
      }
      
      await intelligentAlertingService.resolveAlert(alertId, userId, validatedData.resolution);
      res.json({ message: "Alert resolved successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Resolve alert error:", error);
      res.status(500).json({ error: "Failed to resolve alert" });
    }
  });

  // Escalate Alert
  app.post("/api/security/alerts/:alertId/escalate", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { alertId } = req.params;
      const validatedData = alertActionSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      if (!alertId || !/^[a-zA-Z0-9_-]+$/.test(alertId)) {
        return res.status(400).json({ error: "Invalid alert ID format" });
      }
      
      if (!validatedData.reason) {
        return res.status(400).json({ error: "Escalation reason is required" });
      }
      
      await intelligentAlertingService.escalateAlert(alertId, userId, validatedData.reason);
      res.json({ message: "Alert escalated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Escalate alert error:", error);
      res.status(500).json({ error: "Failed to escalate alert" });
    }
  });

  // Audit Trail - Get audit logs with comprehensive filtering
  app.get("/api/security/audit", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = auditLogQuerySchema.parse({
        userId: req.query.userId,
        action: req.query.action,
        entityType: req.query.entityType,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        outcome: req.query.outcome
      });
      
      const filters = {
        userId: validatedQuery.userId,
        action: validatedQuery.action,
        entityType: validatedQuery.entityType,
        dateRange: validatedQuery.startDate && validatedQuery.endDate ? {
          start: new Date(validatedQuery.startDate),
          end: new Date(validatedQuery.endDate)
        } : undefined,
        limit: validatedQuery.limit || 100
      };
      
      const auditLogs = await auditTrailService.getAuditLogs(filters);
      res.json(auditLogs);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Audit trail error:", error);
      res.status(500).json({ error: "Failed to get audit logs" });
    }
  });

  // Compliance Reports - Get POPIA compliance report
  app.get("/api/security/compliance/:regulation", authenticate, requireRole(['admin', 'security_officer', 'compliance_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedParams = complianceReportParamsSchema.parse({
        regulation: req.params.regulation?.toUpperCase(),
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
      
      const period = {
        start: new Date(validatedParams.startDate),
        end: new Date(validatedParams.endDate)
      };
      
      const report = await auditTrailService.generateComplianceReport(validatedParams.regulation as any, period);
      res.json(report);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request parameters", details: error.errors });
      }
      console.error("Compliance report error:", error);
      res.status(500).json({ error: "Failed to generate compliance report" });
    }
  });

  // Security Incidents - Get security incidents with filtering
  app.get("/api/security/incidents", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = incidentFilterSchema.parse({
        status: req.query.status,
        severity: req.query.severity,
        assignedTo: req.query.assignedTo,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined,
        startDate: req.query.startDate,
        endDate: req.query.endDate
      });
      
      const incidents = await storage.getSecurityIncidents({
        status: validatedQuery.status,
        severity: validatedQuery.severity,
        assignedTo: validatedQuery.assignedTo,
        limit: validatedQuery.limit || 50
      });
      res.json(incidents);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Security incidents error:", error);
      res.status(500).json({ error: "Failed to get security incidents" });
    }
  });

  // Get Security Incident Details
  app.get("/api/security/incidents/:incidentId", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { incidentId } = req.params;
      const incident = await storage.getSecurityIncident(incidentId);
      
      if (!incident) {
        return res.status(404).json({ error: "Security incident not found" });
      }
      
      res.json(incident);
    } catch (error) {
      console.error("Get security incident error:", error);
      res.status(500).json({ error: "Failed to get security incident" });
    }
  });

  // Assign Security Incident
  app.post("/api/security/incidents/:incidentId/assign", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { incidentId } = req.params;
      const validatedData = incidentActionSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      if (!incidentId || !/^[a-zA-Z0-9_-]+$/.test(incidentId)) {
        return res.status(400).json({ error: "Invalid incident ID format" });
      }
      
      if (!validatedData.assignedTo) {
        return res.status(400).json({ error: "Assigned user ID is required" });
      }
      
      await storage.assignIncidentTo(incidentId, validatedData.assignedTo);
      
      // Log the assignment
      await auditTrailService.logAdminAction(
        'security_incident_assigned',
        userId,
        'security_incident',
        incidentId,
        { actionDetails: { assignedTo: validatedData.assignedTo } }
      );
      
      res.json({ message: "Security incident assigned successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Assign security incident error:", error);
      res.status(500).json({ error: "Failed to assign security incident" });
    }
  });

  // Resolve Security Incident
  app.post("/api/security/incidents/:incidentId/resolve", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { incidentId } = req.params;
      const validatedData = incidentActionSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      if (!incidentId || !/^[a-zA-Z0-9_-]+$/.test(incidentId)) {
        return res.status(400).json({ error: "Invalid incident ID format" });
      }
      
      if (!validatedData.resolution) {
        return res.status(400).json({ error: "Resolution description is required" });
      }
      
      await storage.resolveIncident(incidentId, validatedData.resolution, userId);
      res.json({ message: "Security incident resolved successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid request data", details: error.errors });
      }
      console.error("Resolve security incident error:", error);
      res.status(500).json({ error: "Failed to resolve security incident" });
    }
  });

  // Fraud Detection - Get fraud statistics and trends
  app.get("/api/security/fraud/statistics", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = fraudStatisticsQuerySchema.parse({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        userId: req.query.userId,
        riskThreshold: req.query.riskThreshold ? parseInt(req.query.riskThreshold as string) : undefined
      });
      
      const timeRange = {
        start: validatedQuery.startDate ? new Date(validatedQuery.startDate) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        end: validatedQuery.endDate ? new Date(validatedQuery.endDate) : new Date()
      };
      
      const statistics = await fraudDetectionService.getFraudStatistics(timeRange);
      res.json(statistics);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Fraud statistics error:", error);
      res.status(500).json({ error: "Failed to get fraud statistics" });
    }
  });

  // Get User Behavior Analysis
  app.get("/api/security/users/:userId/behavior", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { userId } = req.params;
      const validatedQuery = userBehaviorQuerySchema.parse({
        userId,
        includeProfile: req.query.includeProfile === 'true',
        includeAnalysis: req.query.includeAnalysis === 'true',
        includeDevicePatterns: req.query.includeDevicePatterns === 'true',
        timeframe: req.query.timeframe
      });
      
      if (!validatedQuery.userId || !/^[a-zA-Z0-9_-]+$/.test(validatedQuery.userId)) {
        return res.status(400).json({ error: "Invalid user ID format" });
      }
      
      const results: any = {};
      
      if (validatedQuery.includeProfile !== false) {
        results.profile = await storage.getUserBehaviorProfile(validatedQuery.userId);
      }
      
      if (validatedQuery.includeAnalysis !== false) {
        results.analysis = await storage.analyzeUserBehavior(validatedQuery.userId);
      }
      
      if (validatedQuery.includeDevicePatterns !== false) {
        results.devicePatterns = await fraudDetectionService.analyzeDevicePatterns(validatedQuery.userId);
      }
      
      res.json(results);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("User behavior analysis error:", error);
      res.status(500).json({ error: "Failed to analyze user behavior" });
    }
  });

  // Security Rules - Get security rules and patterns
  app.get("/api/security/rules", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { category, isActive, ruleType } = req.query;
      
      const filters = {
        category: category as string,
        isActive: isActive !== undefined ? isActive === 'true' : undefined,
        ruleType: ruleType as string
      };
      
      const rules = await storage.getSecurityRules(filters);
      res.json(rules);
    } catch (error) {
      console.error("Security rules error:", error);
      res.status(500).json({ error: "Failed to get security rules" });
    }
  });

  // Toggle Security Rule
  app.post("/api/security/rules/:ruleId/toggle", authenticate, requireRole(['admin']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const { enabled } = req.body;
      const userId = (req as any).user.id;
      
      if (enabled) {
        await storage.activateSecurityRule(ruleId);
      } else {
        await storage.deactivateSecurityRule(ruleId);
      }
      
      // Log the rule toggle
      await auditTrailService.logAdminAction(
        'security_rule_toggled',
        userId,
        'security_rule',
        ruleId,
        { actionDetails: { enabled, timestamp: new Date().toISOString() } }
      );
      
      res.json({ message: `Security rule ${enabled ? 'activated' : 'deactivated'} successfully` });
    } catch (error) {
      console.error("Toggle security rule error:", error);
      res.status(500).json({ error: "Failed to toggle security rule" });
    }
  });

  // Alert Statistics - Get alert statistics and trends
  app.get("/api/security/alerts/statistics", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = alertStatisticsQuerySchema.parse({
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        severity: req.query.severity,
        status: req.query.status
      });
      
      const timeRange = validatedQuery.startDate && validatedQuery.endDate ? {
        start: new Date(validatedQuery.startDate),
        end: new Date(validatedQuery.endDate)
      } : undefined;
      
      const statistics = await intelligentAlertingService.getAlertStatistics(timeRange);
      res.json(statistics);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Alert statistics error:", error);
      res.status(500).json({ error: "Failed to get alert statistics" });
    }
  });

  // ===================== DOCUMENT VERIFICATION ENDPOINTS =====================
  
  // Register a new document in the verification system
  app.post("/api/documents/register", authenticate, requireRole(['admin', 'officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentType, documentNumber, documentData } = req.body;
      const userId = (req as any).user.id;
      
      if (!documentType || !documentNumber || !documentData) {
        return res.status(400).json({ error: "Missing required fields" });
      }
      
      const verification = await verificationService.registerDocument(
        documentType,
        documentNumber,
        documentData,
        userId
      );
      
      res.status(201).json({
        message: "Document registered successfully",
        verificationCode: verification.code,
        verificationUrl: verification.url,
        hashtags: verification.hashtags,
        documentHash: verification.hash
      });
    } catch (error) {
      console.error("Document registration error:", error);
      res.status(500).json({ error: "Failed to register document" });
    }
  });
  
  // Verify document authenticity by code
  app.get("/api/verify/:code", async (req: Request, res: Response) => {
    try {
      const { code } = req.params;
      
      if (!code) {
        return res.status(400).json({ error: "Verification code required" });
      }
      
      const result = await verificationService.verifyDocument({
        code: code.toUpperCase(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent'),
        location: req.get('CF-IPCountry') || 'Unknown'
      });
      
      res.json(result);
    } catch (error) {
      console.error("Document verification error:", error);
      res.status(500).json({ error: "Failed to verify document" });
    }
  });
  
  // Get verification status and history for a document
  app.get("/api/verification/status/:documentId", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      
      if (!documentId) {
        return res.status(400).json({ error: "Document ID required" });
      }
      
      const status = await verificationService.getVerificationStatus(documentId);
      
      if (!status.success) {
        return res.status(404).json({ error: status.message });
      }
      
      res.json(status);
    } catch (error) {
      console.error("Verification status error:", error);
      res.status(500).json({ error: "Failed to get verification status" });
    }
  });
  
  // Log a verification scan attempt
  app.post("/api/verification/scan", apiLimiter, async (req: Request, res: Response) => {
    try {
      const { code, location, deviceInfo } = req.body;
      
      if (!code) {
        return res.status(400).json({ error: "Verification code required" });
      }
      
      const result = await verificationService.verifyDocument({
        code: code.toUpperCase(),
        ipAddress: req.ip,
        userAgent: req.get('User-Agent') || deviceInfo?.userAgent,
        location: location || req.get('CF-IPCountry') || 'Unknown'
      });
      
      // Log the scan attempt
      await storage.createSecurityEvent({
        eventType: 'document_verification_scan',
        severity: result.isValid ? 'low' : 'medium',
        details: {
          code,
          isValid: result.isValid,
          documentType: result.documentType,
          location,
          deviceInfo
        },
        ipAddress: req.ip,
        userAgent: req.get('User-Agent')
      });
      
      res.json({
        success: true,
        verification: result
      });
    } catch (error) {
      console.error("Verification scan error:", error);
      res.status(500).json({ error: "Failed to process verification scan" });
    }
  });
  
  // Revoke a document's verification
  app.post("/api/verification/revoke/:documentId", authenticate, requireRole(['admin']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { documentId } = req.params;
      const { reason } = req.body;
      const userId = (req as any).user.id;
      
      if (!documentId) {
        return res.status(400).json({ error: "Document ID required" });
      }
      
      const success = await verificationService.revokeDocument(documentId, reason);
      
      if (!success) {
        return res.status(404).json({ error: "Document not found" });
      }
      
      // Log the revocation
      await auditTrailService.logAdminAction(
        'document_revoked',
        userId,
        'document_verification',
        documentId,
        { reason }
      );
      
      res.json({
        message: "Document verification revoked successfully"
      });
    } catch (error) {
      console.error("Document revocation error:", error);
      res.status(500).json({ error: "Failed to revoke document" });
    }
  });

  // ===================== ALERT RULE MANAGEMENT ENDPOINTS =====================

  // Create Alert Rule
  app.post("/api/security/alert-rules", authenticate, requireRole(['admin']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedData = alertRuleCreationSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      // Create a new alert rule in the intelligent alerting service
      const ruleId = `rule_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      const alertRule = {
        id: ruleId,
        ...validatedData,
        createdBy: userId,
        createdAt: new Date()
      };
      
      // Add rule to intelligent alerting service
      await intelligentAlertingService.addAlertRule(alertRule);
      
      // Log the rule creation
      await auditTrailService.logAdminAction(
        'alert_rule_created',
        userId,
        'alert_rule',
        ruleId,
        { actionDetails: { name: validatedData.name, severity: validatedData.severity } }
      );
      
      res.status(201).json({
        message: "Alert rule created successfully",
        ruleId,
        rule: alertRule
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid alert rule data", details: error.errors });
      }
      console.error("Create alert rule error:", error);
      res.status(500).json({ error: "Failed to create alert rule" });
    }
  });

  // Get Alert Rules
  app.get("/api/security/alert-rules", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = securityRulesQuerySchema.parse({
        category: req.query.category,
        isActive: req.query.isActive === 'true' ? true : req.query.isActive === 'false' ? false : undefined,
        ruleType: req.query.ruleType,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      });
      
      const rules = await intelligentAlertingService.getAlertRules(validatedQuery);
      res.json(rules);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Get alert rules error:", error);
      res.status(500).json({ error: "Failed to get alert rules" });
    }
  });

  // Update Alert Rule
  app.put("/api/security/alert-rules/:ruleId", authenticate, requireRole(['admin']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const validatedData = alertRuleUpdateSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      if (!ruleId || !/^[a-zA-Z0-9_-]+$/.test(ruleId)) {
        return res.status(400).json({ error: "Invalid rule ID format" });
      }
      
      await intelligentAlertingService.updateAlertRule(ruleId, validatedData);
      
      // Log the rule update
      await auditTrailService.logAdminAction(
        'alert_rule_updated',
        userId,
        'alert_rule',
        ruleId,
        { actionDetails: validatedData }
      );
      
      res.json({ message: "Alert rule updated successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid alert rule data", details: error.errors });
      }
      console.error("Update alert rule error:", error);
      res.status(500).json({ error: "Failed to update alert rule" });
    }
  });

  // Delete Alert Rule
  app.delete("/api/security/alert-rules/:ruleId", authenticate, requireRole(['admin']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const userId = (req as any).user.id;
      
      if (!ruleId || !/^[a-zA-Z0-9_-]+$/.test(ruleId)) {
        return res.status(400).json({ error: "Invalid rule ID format" });
      }
      
      await intelligentAlertingService.deleteAlertRule(ruleId);
      
      // Log the rule deletion
      await auditTrailService.logAdminAction(
        'alert_rule_deleted',
        userId,
        'alert_rule',
        ruleId,
        { actionDetails: { deletedAt: new Date().toISOString() } }
      );
      
      res.json({ message: "Alert rule deleted successfully" });
    } catch (error) {
      console.error("Delete alert rule error:", error);
      res.status(500).json({ error: "Failed to delete alert rule" });
    }
  });

  // Toggle Alert Rule Status
  app.post("/api/security/alert-rules/:ruleId/toggle", authenticate, requireRole(['admin']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { ruleId } = req.params;
      const validatedData = securityRuleToggleSchema.parse(req.body);
      const userId = (req as any).user.id;
      
      if (!ruleId || !/^[a-zA-Z0-9_-]+$/.test(ruleId)) {
        return res.status(400).json({ error: "Invalid rule ID format" });
      }
      
      await intelligentAlertingService.toggleAlertRule(ruleId, validatedData.enabled);
      
      // Log the rule toggle
      await auditTrailService.logAdminAction(
        'alert_rule_toggled',
        userId,
        'alert_rule',
        ruleId,
        { actionDetails: { enabled: validatedData.enabled, timestamp: new Date().toISOString() } }
      );
      
      res.json({ message: `Alert rule ${validatedData.enabled ? 'enabled' : 'disabled'} successfully` });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid toggle data", details: error.errors });
      }
      console.error("Toggle alert rule error:", error);
      res.status(500).json({ error: "Failed to toggle alert rule" });
    }
  });

  // Compliance Events - Get compliance events with filtering
  app.get("/api/security/compliance/events", authenticate, requireRole(['admin', 'security_officer', 'compliance_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const validatedQuery = complianceEventsQuerySchema.parse({
        regulation: req.query.regulation,
        eventType: req.query.eventType,
        complianceStatus: req.query.complianceStatus,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        limit: req.query.limit ? parseInt(req.query.limit as string) : undefined,
        offset: req.query.offset ? parseInt(req.query.offset as string) : undefined
      });
      
      const filters = {
        regulation: validatedQuery.regulation,
        eventType: validatedQuery.eventType,
        complianceStatus: validatedQuery.complianceStatus,
        startDate: validatedQuery.startDate ? new Date(validatedQuery.startDate) : undefined,
        endDate: validatedQuery.endDate ? new Date(validatedQuery.endDate) : undefined,
        limit: validatedQuery.limit || 100
      };
      
      const events = await storage.getComplianceEvents(filters);
      res.json(events);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: "Invalid query parameters", details: error.errors });
      }
      console.error("Compliance events error:", error);
      res.status(500).json({ error: "Failed to get compliance events" });
    }
  });

  // System Health - Get comprehensive system health status
  app.get("/api/security/system/health", authenticate, requireRole(['admin', 'security_officer']), apiLimiter, async (req: Request, res: Response) => {
    try {
      const dashboard = await enhancedMonitoringService.getSecurityDashboard();
      
      const healthStatus = {
        status: dashboard.systemStatus,
        metrics: dashboard.metrics.system,
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        lastUpdated: dashboard.lastUpdated,
        integrations: dashboard.metrics.system.integrationStatus,
        performanceScore: dashboard.metrics.system.performanceScore
      };
      
      res.json(healthStatus);
    } catch (error) {
      console.error("System health error:", error);
      res.status(500).json({ error: "Failed to get system health status" });
    }
  });

  // =================== END SECURITY MONITORING API ROUTES ===================

  const httpServer = createServer(app);

  // Initialize WebSocket
  initializeWebSocket(httpServer);

  return httpServer;
}
