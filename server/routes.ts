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
import { initializeWebSocket, getWebSocketService } from "./websocket";
import { insertUserSchema, insertSecurityEventSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Apply security middleware
  app.use(securityHeaders);
  app.use(ipFilter);
  app.use(securityLogger);

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
    try {
      const { type, template } = req.body;

      if (!type || !template) {
        return res.status(400).json({ error: "Biometric type and template required" });
      }

      const result = await biometricService.registerBiometric({
        userId: req.user.id,
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

  const httpServer = createServer(app);

  // Initialize WebSocket
  initializeWebSocket(httpServer);

  return httpServer;
}
