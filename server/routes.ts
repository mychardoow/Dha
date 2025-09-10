import express, { type Request, type Response, type NextFunction } from "express";
import { storage } from "./storage";
import { insertUserSchema, insertConversationSchema, insertMessageSchema, insertErrorLogSchema } from "@shared/schema";
import { z } from "zod";
import { aiAssistantService } from "./services/ai-assistant";
import jwt from "jsonwebtoken";
import { createServer } from "http";
import { errorTrackingService } from "./services/error-tracking";

export function registerRoutes(app: express.Application) {
  // Default JSON limit for most routes (1mb is reasonable for most API calls)
  app.use(express.json({ limit: "1mb" }));

  // Performance monitoring middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    
    res.on('finish', () => {
      const duration = Date.now() - start;
      errorTrackingService.recordPerformanceMetric(`${req.method} ${req.path}`, duration);
    });
    
    next();
  });

  const JWT_SECRET = process.env.JWT_SECRET || "military-grade-jwt-secret-change-in-production";

  // Middleware to verify JWT token
  const authenticateToken = async (req: Request, res: Response, next: any) => {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: "Access token required" });
    }

    try {
      const decoded = jwt.verify(token, JWT_SECRET) as any;
      const user = await storage.getUser(decoded.id);
      
      if (!user || !user.isActive) {
        return res.status(401).json({ error: "User not found or inactive" });
      }
      
      req.user = user;
      next();
    } catch (error) {
      return res.status(403).json({ error: "Invalid or expired token" });
    }
  };

  // Auth routes
  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const userData = insertUserSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ error: "Username already exists" });
      }
      
      const user = await storage.createUser({
        ...userData,
        role: userData.role || "user"
      });
      
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        }, 
        token 
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(400).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const { username, password } = req.body;
      
      const user = await storage.getUserByUsername(username);
      if (!user || user.password !== password) {
        return res.status(401).json({ error: "Invalid credentials" });
      }
      
      if (!user.isActive) {
        return res.status(401).json({ error: "Account is inactive" });
      }
      
      const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "24h" });
      
      // Log login event
      await storage.createSecurityEvent({
        userId: user.id,
        eventType: "user_login",
        severity: "low",
        details: { username: user.username },
        ipAddress: req.ip,
        userAgent: req.headers["user-agent"]
      });
      
      res.json({ 
        user: { 
          id: user.id, 
          username: user.username, 
          role: user.role 
        }, 
        token 
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  // Conversation routes
  app.get("/api/conversations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const conversations = await storage.getConversations(req.user.id);
      res.json(conversations);
    } catch (error) {
      console.error("Get conversations error:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });

  app.post("/api/conversations", authenticateToken, async (req: Request, res: Response) => {
    try {
      const conversationData = insertConversationSchema.parse({
        ...req.body,
        userId: req.user.id
      });
      
      const conversation = await storage.createConversation(conversationData);
      res.json(conversation);
    } catch (error) {
      console.error("Create conversation error:", error);
      res.status(400).json({ error: "Failed to create conversation" });
    }
  });

  app.delete("/api/conversations/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.userId !== req.user.id) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      await storage.deleteConversation(req.params.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Delete conversation error:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });

  // Message routes
  app.get("/api/conversations/:id/messages", authenticateToken, async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.userId !== req.user.id) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const messages = await storage.getMessages(req.params.id);
      res.json(messages);
    } catch (error) {
      console.error("Get messages error:", error);
      res.status(500).json({ error: "Failed to fetch messages" });
    }
  });

  app.post("/api/conversations/:id/messages", authenticateToken, async (req: Request, res: Response) => {
    try {
      const conversation = await storage.getConversation(req.params.id);
      
      if (!conversation || conversation.userId !== req.user.id) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      
      const messageData = insertMessageSchema.parse({
        ...req.body,
        conversationId: req.params.id
      });
      
      // Create user message
      const userMessage = await storage.createMessage(messageData);
      
      // Generate AI response
      const aiResponse = await aiAssistantService.generateResponse(
        messageData.content,
        req.user.id,
        req.params.id
      );
      
      if (aiResponse.success && aiResponse.content) {
        // Create AI message
        const aiMessage = await storage.createMessage({
          conversationId: req.params.id,
          role: "assistant",
          content: aiResponse.content,
          metadata: aiResponse.metadata
        });
        
        res.json({ userMessage, aiMessage });
      } else {
        res.json({ 
          userMessage, 
          error: aiResponse.error || "AI service unavailable" 
        });
      }
      
    } catch (error) {
      console.error("Create message error:", error);
      res.status(400).json({ error: "Failed to create message" });
    }
  });

  // AI Assistant routes
  app.post("/api/ai/analyze-security", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { data } = req.body;
      
      if (!data) {
        return res.status(400).json({ error: "Security data required" });
      }
      
      const analysis = await aiAssistantService.analyzeSecurityData(data);
      res.json(analysis);
    } catch (error) {
      console.error("Security analysis error:", error);
      res.status(500).json({ error: "Failed to analyze security data" });
    }
  });

  app.post("/api/ai/generate-title", authenticateToken, async (req: Request, res: Response) => {
    try {
      const { message } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message required" });
      }
      
      const title = await aiAssistantService.generateTitle(message);
      res.json({ title });
    } catch (error) {
      console.error("Generate title error:", error);
      res.status(500).json({ error: "Failed to generate title" });
    }
  });

  // System status routes
  app.get("/api/system/status", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Import services dynamically to avoid circular dependencies
      const { monitoringService } = await import("./services/monitoring");
      const { quantumEncryptionService } = await import("./services/quantum-encryption");
      
      const [systemHealth, securityMetrics, quantumStatus] = await Promise.all([
        monitoringService.getSystemHealth(),
        monitoringService.getSecurityMetrics(),
        quantumEncryptionService.getSystemStatus()
      ]);
      
      res.json({
        health: systemHealth,
        security: securityMetrics,
        quantum: quantumStatus
      });
    } catch (error) {
      console.error("Get system status error:", error);
      res.status(500).json({ error: "Failed to fetch system status" });
    }
  });

  app.get("/api/security/alerts", authenticateToken, async (req: Request, res: Response) => {
    try {
      const resolved = req.query.resolved === 'true';
      const alerts = await storage.getFraudAlerts(req.user.id, resolved);
      res.json(alerts);
    } catch (error) {
      console.error("Get alerts error:", error);
      res.status(500).json({ error: "Failed to fetch security alerts" });
    }
  });

  app.get("/api/documents", authenticateToken, async (req: Request, res: Response) => {
    try {
      const documents = await storage.getDocuments(req.user.id);
      res.json(documents);
    } catch (error) {
      console.error("Get documents error:", error);
      res.status(500).json({ error: "Failed to fetch documents" });
    }
  });

  // Debug and Error Tracking Routes
  
  // Helper function to truncate stack traces and validate payload size
  const sanitizeErrorPayload = (data: any) => {
    const MAX_STACK_LENGTH = 5000;
    const MAX_MESSAGE_LENGTH = 1000;
    const MAX_CONTEXT_SIZE = 50000; // 50KB for context object
    
    // Truncate stack trace
    if (data.stack && typeof data.stack === 'string' && data.stack.length > MAX_STACK_LENGTH) {
      data.stack = data.stack.substring(0, MAX_STACK_LENGTH) + '\n[Stack trace truncated]';
    }
    
    // Truncate component stack
    if (data.componentStack && typeof data.componentStack === 'string' && data.componentStack.length > MAX_STACK_LENGTH) {
      data.componentStack = data.componentStack.substring(0, MAX_STACK_LENGTH) + '\n[Component stack truncated]';
    }
    
    // Truncate message
    if (data.message && typeof data.message === 'string' && data.message.length > MAX_MESSAGE_LENGTH) {
      data.message = data.message.substring(0, MAX_MESSAGE_LENGTH) + '...';
    }
    
    // Validate context size
    if (data.context) {
      const contextStr = JSON.stringify(data.context);
      if (contextStr.length > MAX_CONTEXT_SIZE) {
        // Keep only essential context fields
        data.context = {
          userAgent: data.context.userAgent,
          sessionId: data.context.sessionId,
          anonymous: data.context.anonymous,
          truncated: true,
          originalSize: contextStr.length
        };
      }
    }
    
    return data;
  };
  
  // Unauthenticated client error reporting endpoint with IP-based rate limiting
  app.post("/api/debug/client-errors", 
    express.json({ limit: "100kb" }), // Small limit for public endpoint to prevent DoS
    async (req: Request, res: Response) => {
    try {
      const clientIp = req.ip || req.connection.remoteAddress || "unknown";
      
      // Use consolidated rate limiting from error-tracking service
      if (errorTrackingService.shouldRateLimitIP(clientIp)) {
        return res.status(429).json({ 
          error: "Too many error reports. Please try again later.",
          retryAfter: 60 // 1 minute
        });
      }
      
      // Sanitize and validate payload size
      const sanitizedData = sanitizeErrorPayload(req.body);
      const { message, stack, componentStack, userAgent, url, errorType, severity, context } = sanitizedData;
      
      // Validate request body using the schema
      const errorLogData = insertErrorLogSchema.parse({
        errorType: errorType || "client_anonymous",
        message: message || "Unknown client error",
        stack: stack || componentStack,
        userId: null, // Anonymous errors don't have userId
        requestUrl: url || req.headers.referer,
        requestMethod: "CLIENT",
        severity: severity || "medium", // Default to medium for anonymous errors
        context: {
          clientStack: stack,
          componentStack,
          userAgent: userAgent || req.headers["user-agent"],
          anonymous: true,
          ...context
        },
        environment: process.env.NODE_ENV || "development",
        userAgent: userAgent || req.headers["user-agent"] as string,
        ipAddress: clientIp,
        sessionId: context?.sessionId
      });
      
      // Store error in database
      const errorLog = await storage.createErrorLog(errorLogData);
      
      res.json({ success: true, errorId: errorLog.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid error data", 
          details: error.errors 
        });
      }
      console.error("Failed to log anonymous client error:", error);
      res.status(500).json({ error: "Failed to log error" });
    }
  });
  
  // Log client-side errors (authenticated)
  app.post("/api/debug/errors", 
    authenticateToken,
    express.json({ limit: "100kb" }), // Reasonable limit for error reporting
    async (req: Request, res: Response) => {
    try {
      // Sanitize and validate payload size
      const sanitizedData = sanitizeErrorPayload(req.body);
      const { message, stack, componentStack, userAgent, url, errorType, severity, context } = sanitizedData;
      
      // Validate request body using the schema
      const errorLogData = insertErrorLogSchema.parse({
        errorType: errorType || "client",
        message: message || "Unknown client error",
        stack: stack || componentStack, // Preserve client-provided stack
        userId: req.user.id,
        requestUrl: url || req.headers.referer,
        requestMethod: "CLIENT",
        severity: severity || "high",
        context: {
          clientStack: stack, // Preserve original client stack
          componentStack,
          userAgent: userAgent || req.headers["user-agent"],
          ...context
        },
        environment: process.env.NODE_ENV || "development",
        userAgent: userAgent || req.headers["user-agent"] as string,
        ipAddress: req.ip,
        sessionId: context?.sessionId
      });
      
      // Store error in database
      const errorLog = await storage.createErrorLog(errorLogData);
      
      res.json({ success: true, errorId: errorLog.id });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          error: "Invalid error data", 
          details: error.errors 
        });
      }
      console.error("Failed to log client error:", error);
      res.status(500).json({ error: "Failed to log error" });
    }
  });

  // Get error logs (admin only)
  app.get("/api/debug/errors", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { severity, errorType, startDate, endDate, limit = 100, resolved } = req.query;
      
      const errors = await storage.getErrorLogs({
        severity: severity as string,
        errorType: errorType as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        isResolved: resolved === "true" ? true : resolved === "false" ? false : undefined,
        limit: parseInt(limit as string)
      });
      
      res.json(errors);
    } catch (error) {
      console.error("Get error logs error:", error);
      res.status(500).json({ error: "Failed to fetch error logs" });
    }
  });

  // Mark error as resolved
  app.patch("/api/debug/errors/:id", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      await storage.markErrorResolved(req.params.id, req.user.id);
      res.json({ success: true });
    } catch (error) {
      console.error("Mark error resolved error:", error);
      res.status(500).json({ error: "Failed to mark error as resolved" });
    }
  });

  // Get system metrics
  app.get("/api/debug/metrics", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const hours = parseInt(req.query.hours as string) || 24;
      
      const [errorStats, performanceReport] = await Promise.all([
        storage.getErrorStats(hours),
        Promise.resolve(errorTrackingService.getPerformanceReport())
      ]);
      
      res.json({
        errors: errorStats,
        performance: performanceReport,
        timestamp: new Date()
      });
    } catch (error) {
      console.error("Get metrics error:", error);
      res.status(500).json({ error: "Failed to fetch metrics" });
    }
  });

  // Get recent application logs
  app.get("/api/debug/logs", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const hours = parseInt(req.query.hours as string) || 1;
      const limit = parseInt(req.query.limit as string) || 100;
      
      const recentErrors = await storage.getRecentErrors(hours, limit);
      res.json(recentErrors);
    } catch (error) {
      console.error("Get logs error:", error);
      res.status(500).json({ error: "Failed to fetch logs" });
    }
  });

  // Toggle debug mode
  app.post("/api/debug/toggle", authenticateToken, async (req: Request, res: Response) => {
    try {
      // Check if user is admin
      if (req.user.role !== "admin") {
        return res.status(403).json({ error: "Admin access required" });
      }
      
      const { enabled } = req.body;
      errorTrackingService.setDebugMode(enabled);
      
      res.json({ 
        success: true, 
        debugMode: errorTrackingService.isDebugEnabled() 
      });
    } catch (error) {
      console.error("Toggle debug error:", error);
      res.status(500).json({ error: "Failed to toggle debug mode" });
    }
  });

  // Global error handling middleware (must be last)
  app.use(async (err: any, req: Request, res: Response, next: NextFunction) => {
    console.error("Unhandled error:", err);
    
    // Determine severity based on error type and status code
    let severity = "high";
    const statusCode = err.statusCode || err.status || 500;
    
    if (err.name === "ValidationError" || err.name === "ZodError") {
      severity = "medium";
    } else if (err.name === "UnauthorizedError" || statusCode === 401 || statusCode === 403) {
      severity = "low";
    } else if (statusCode >= 500) {
      severity = "critical";
    }
    
    // Log error using errorTrackingService for better tracking
    try {
      await errorTrackingService.logError({
        error: err,
        errorType: err.name || "api_error",
        severity,
        context: {
          userId: (req as any).user?.id || null,
          requestUrl: req.originalUrl || req.url,
          requestMethod: req.method,
          statusCode,
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.headers["user-agent"],
          sessionId: (req as any).sessionID
        }
      });
    } catch (logError) {
      console.error("Failed to log error:", logError);
      // Fallback to direct database logging
      try {
        await storage.createErrorLog({
          errorType: err.name || "api_error",
          message: err.message,
          stack: err.stack,
          userId: (req as any).user?.id,
          requestUrl: req.originalUrl || req.url,
          requestMethod: req.method,
          statusCode,
          severity,
          context: {
            body: req.body,
            query: req.query,
            params: req.params
          },
          environment: process.env.NODE_ENV || "development",
          userAgent: req.headers["user-agent"] as string,
          ipAddress: req.ip,
          sessionId: (req as any).sessionID
        });
      } catch (fallbackError) {
        console.error("Failed to log error to database:", fallbackError);
      }
    }
    
    // Send response to client
    const message = process.env.NODE_ENV === "development" 
      ? err.message 
      : "Internal Server Error";
    
    res.status(statusCode).json({ 
      error: message,
      ...(process.env.NODE_ENV === "development" && { 
        stack: err.stack,
        details: err.details 
      })
    });
  });

  return createServer(app);
}
