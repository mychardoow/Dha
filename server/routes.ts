import type { Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authenticate, hashPassword, verifyPassword, generateToken, requireRole, requireApiKey } from "./middleware/auth";
import { authLimiter, apiLimiter, uploadLimiter, securityHeaders, fraudDetection, ipFilter, securityLogger } from "./middleware/security";
import { biometricService } from "./services/biometric";
import { fraudDetectionService } from "./services/fraud-detection";
import { documentProcessorService, documentUpload } from "./services/document-processor";
import { quantumEncryptionService } from "./services/quantum-encryption";
import { monitoringService } from "./services/monitoring";
import { documentGenerator } from "./services/document-generator";
import { initializeWebSocket, getWebSocketService } from "./websocket";
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
  dhaApplicationTransitionSchema
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
      wsService?.sendToUser(req.user.id, "biometric:result", {
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
      const { type, template, userId } = req.body;

      if (!type || !template) {
        return res.status(400).json({ error: "Biometric type and template required" });
      }

      const result = await biometricService.verifyBiometric(
        template, 
        type, 
        userId || req.user.id
      );

      const wsService = getWebSocketService();
      wsService?.sendToUser(req.user.id, "biometric:result", {
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
      const profiles = await biometricService.getUserBiometrics(req.user.id);
      res.json(profiles);
    } catch (error) {
      console.error("Get biometric profiles error:", error);
      res.status(500).json({ error: "Failed to get biometric profiles" });
    }
  });

  app.get("/api/fraud/alerts", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { resolved } = req.query;
      const userId = req.user.role === "admin" ? undefined : req.user.id;

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
      await fraudDetectionService.resolveFraudAlert(req.params.id, req.user.id);

      const wsService = getWebSocketService();
      wsService?.sendToRole("admin", "fraud:alert", {
        type: "resolved",
        alertId: req.params.id,
        resolvedBy: req.user.id
      });

      res.json({ message: "Fraud alert resolved" });
    } catch (error) {
      console.error("Resolve fraud alert error:", error);
      res.status(500).json({ error: "Failed to resolve fraud alert" });
    }
  });

  app.post("/api/documents/upload", authenticate, uploadLimiter, documentUpload.single("document"), async (req: Request, res: Response) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: "No file uploaded" });
      }

      const options = {
        performOCR: req.body.performOCR === "true",
        verifyAuthenticity: req.body.verifyAuthenticity === "true",
        extractData: req.body.extractData === "true",
        encrypt: req.body.encrypt === "true"
      };

      const result = await documentProcessorService.processDocument(
        req.file,
        req.user.id,
        options
      );

      if (!result.success) {
        return res.status(400).json({ error: result.error });
      }

      const wsService = getWebSocketService();
      wsService?.sendToUser(req.user.id, "document:processed", {
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
      const documents = await documentProcessorService.getUserDocuments(req.user.id);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to get documents" });
    }
  });

  app.get("/api/documents/:id", authenticate, async (req: Request, res: Response) => {
    try {
      const result = await documentProcessorService.getDocument(req.params.id, req.user.id);

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
      const { type, hours } = req.query;
      const metrics = await monitoringService.getMetricsHistory(
        type as string,
        hours ? parseInt(hours as string) : 24
      );
      res.json(metrics);
    } catch (error) {
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
      const { documentType, documentId } = req.query;
      const verifications = await storage.getDocumentVerifications(
        documentType as string,
        documentId as string
      );
      res.json(verifications);
    } catch (error) {
      console.error("Get document verifications error:", error);
      res.status(500).json({ error: "Failed to get document verifications" });
    }
  });

  // Admin routes - Document Templates
  app.get("/api/admin/document-templates", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { type } = req.query;
      const templates = await storage.getDocumentTemplates(type as any);
      res.json(templates);
    } catch (error) {
      console.error("Get document templates error:", error);
      res.status(500).json({ error: "Failed to get document templates" });
    }
  });

  // Admin routes - Error Logs
  app.get("/api/admin/error-logs", authenticate, requireRole(["admin"]), apiLimiter, async (req: Request, res: Response) => {
    try {
      const { limit, severity, errorType, isResolved } = req.query;
      const errorLogs = await storage.getErrorLogs({
        severity: severity as string,
        errorType: errorType as string, 
        isResolved: isResolved === 'true' ? true : isResolved === 'false' ? false : undefined,
        limit: limit ? parseInt(limit as string) : 20
      });
      res.json(errorLogs);
    } catch (error) {
      console.error("Get error logs error:", error);
      res.status(500).json({ error: "Failed to get error logs" });
    }
  });

  // Security events routes
  app.get("/api/security/events", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { limit } = req.query;
      const userId = req.user.role === "admin" ? undefined : req.user.id;

      const events = await storage.getSecurityEvents(
        userId,
        limit ? parseInt(limit as string) : 50
      );

      res.json(events);
    } catch (error) {
      console.error("Get security events error:", error);
      res.status(500).json({ error: "Failed to get security events" });
    }
  });

  // Error logging endpoint
  app.post("/api/monitoring/error", authenticate, async (req: Request, res: Response) => {
    try {
      const { message, stack, componentStack, timestamp, userAgent, url } = req.body;

      await storage.createSecurityEvent({
        userId: req.user.id,
        eventType: "client_error",
        severity: "medium",
        details: {
          message,
          stack,
          componentStack,
          timestamp,
          url,
          browser: userAgent
        },
        ipAddress: req.ip,
        userAgent
      });

      res.json({ message: "Error logged successfully" });
    } catch (error) {
      console.error("Error logging client error:", error);
      res.status(500).json({ error: "Failed to log error" });
    }
  });

  // Document generation routes
  
  // Generate certificate
  app.post("/api/certificates", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const { type, templateType, title, description, data, expiresAt } = req.body;

      if (!type || !templateType || !title || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const result = await documentGenerator.generateCertificate(req.user.id, type, {
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
        userId: req.user.id,
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
      const certificates = await storage.getCertificates(req.user.id);
      res.json(certificates);
    } catch (error) {
      console.error("Get certificates error:", error);
      res.status(500).json({ error: "Failed to retrieve certificates" });
    }
  });

  // Get specific certificate
  app.get("/api/certificates/:id", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const certificate = await storage.getCertificate(req.params.id);
      
      if (!certificate) {
        return res.status(404).json({ error: "Certificate not found" });
      }

      // Check ownership or admin role
      if (certificate.userId !== req.user.id && req.user.role !== "admin") {
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
      const { type, templateType, title, description, data, conditions, expiresAt } = req.body;

      if (!type || !templateType || !title || !description) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      const result = await documentGenerator.generatePermit(req.user.id, type, {
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
        userId: req.user.id,
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
      const permits = await storage.getPermits(req.user.id);
      res.json(permits);
    } catch (error) {
      console.error("Get permits error:", error);
      res.status(500).json({ error: "Failed to retrieve permits" });
    }
  });

  // Get specific permit
  app.get("/api/permits/:id", authenticate, apiLimiter, async (req: Request, res: Response) => {
    try {
      const permit = await storage.getPermit(req.params.id);
      
      if (!permit) {
        return res.status(404).json({ error: "Permit not found" });
      }

      // Check ownership or admin role
      if (permit.userId !== req.user.id && req.user.role !== "admin") {
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
        applicationType,
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
      const { id } = req.params;
      
      const application = await storage.getDhaApplication(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Check access permissions
      if (application.userId !== req.user.id && req.user.role !== "admin") {
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
      const applicants = await storage.getDhaApplicants(req.user.id);
      res.json(applicants);
    } catch (error) {
      console.error("Get DHA applicants error:", error);
      res.status(500).json({ error: "Failed to get applicants" });
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
      const { id } = req.params;
      const validatedData = dhaApplicationTransitionSchema.parse(req.body);
      const { targetState, reason, data } = validatedData;

      const application = await storage.getDhaApplication(id);
      if (!application) {
        return res.status(404).json({ error: "Application not found" });
      }

      // Check permissions
      if (application.userId !== req.user.id && req.user.role !== "admin") {
        return res.status(403).json({ error: "Access denied" });
      }

      const result = await dhaWorkflowEngine.processWorkflowTransition({
        applicationId: id,
        applicantId: application.applicantId,
        userId: req.user.id,
        currentState: application.currentState as any,
        targetState,
        triggerReason: reason || 'Manual transition',
        actorId: req.user.id,
        actorName: req.user.username,
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

  const httpServer = createServer(app);

  // Initialize WebSocket
  initializeWebSocket(httpServer);

  return httpServer;
}
