import express, { type Request, type Response } from "express";
import { storage } from "./storage";
import { insertUserSchema, insertConversationSchema, insertMessageSchema } from "@shared/schema";
import { z } from "zod";
import { aiAssistantService } from "./services/ai-assistant";
import jwt from "jsonwebtoken";
import { createServer } from "http";

export function registerRoutes(app: express.Application) {
  app.use(express.json({ limit: "50mb" }));

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

  return createServer(app);
}
