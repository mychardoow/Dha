import { Server as SocketIOServer } from "socket.io";
import { Server } from "http";
import { authenticate } from "./middleware/auth";
import { monitoringService } from "./services/monitoring";
import { storage } from "./storage";

export interface AuthenticatedSocket {
  id: string;
  userId: string;
  username: string;
  role: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private authenticatedSockets = new Map<string, AuthenticatedSocket>();
  
  constructor(server: Server) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: process.env.FRONTEND_URL || "http://localhost:5000",
        methods: ["GET", "POST"],
        credentials: true
      }
    });
    
    this.setupAuthentication();
    this.setupEventHandlers();
    this.startMonitoring();
  }
  
  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error("Authentication token required"));
        }
        
        // Verify token using existing auth middleware logic
        const jwt = require("jsonwebtoken");
        const JWT_SECRET = process.env.JWT_SECRET || "military-grade-jwt-secret-change-in-production";
        
        const decoded = jwt.verify(token, JWT_SECRET);
        const user = await storage.getUser(decoded.id);
        
        if (!user || !user.isActive) {
          return next(new Error("User not found or inactive"));
        }
        
        // Store authenticated socket info
        this.authenticatedSockets.set(socket.id, {
          id: socket.id,
          userId: user.id,
          username: user.username,
          role: user.role
        });
        
        // Log connection
        await storage.createSecurityEvent({
          userId: user.id,
          eventType: "websocket_connected",
          severity: "low",
          details: {
            socketId: socket.id,
            userAgent: socket.handshake.headers["user-agent"]
          },
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers["user-agent"]
        });
        
        next();
      } catch (error) {
        console.error("WebSocket authentication error:", error);
        next(new Error("Authentication failed"));
      }
    });
  }
  
  private setupEventHandlers() {
    this.io.on("connection", (socket) => {
      const authSocket = this.authenticatedSockets.get(socket.id);
      
      if (!authSocket) {
        socket.disconnect();
        return;
      }
      
      console.log(`User ${authSocket.username} connected via WebSocket`);
      
      // Join user-specific room
      socket.join(`user:${authSocket.userId}`);
      
      // Join role-specific room
      socket.join(`role:${authSocket.role}`);
      
      // Send initial status
      this.sendInitialStatus(socket);
      
      // Handle client events
      this.setupClientEventHandlers(socket, authSocket);
      
      // Handle disconnection
      socket.on("disconnect", async () => {
        console.log(`User ${authSocket.username} disconnected`);
        
        // Log disconnection
        await storage.createSecurityEvent({
          userId: authSocket.userId,
          eventType: "websocket_disconnected",
          severity: "low",
          details: { socketId: socket.id }
        });
        
        this.authenticatedSockets.delete(socket.id);
      });
    });
  }
  
  private async sendInitialStatus(socket: any) {
    try {
      const systemHealth = await monitoringService.getSystemHealth();
      const securityMetrics = await monitoringService.getSecurityMetrics();
      const regionalStatus = await monitoringService.getRegionalStatus();
      
      socket.emit("system:status", {
        health: systemHealth,
        security: securityMetrics,
        regional: regionalStatus
      });
    } catch (error) {
      console.error("Error sending initial status:", error);
    }
  }
  
  private setupClientEventHandlers(socket: any, authSocket: AuthenticatedSocket) {
    
    // Request system metrics
    socket.on("system:requestMetrics", async (data: { timeRange?: number }) => {
      try {
        const metrics = await monitoringService.getMetricsHistory(
          undefined, 
          data.timeRange || 24
        );
        socket.emit("system:metrics", metrics);
      } catch (error) {
        socket.emit("error", { message: "Failed to fetch metrics" });
      }
    });
    
    // Request security events
    socket.on("security:requestEvents", async (data: { limit?: number }) => {
      try {
        const events = await storage.getSecurityEvents(
          authSocket.userId, 
          data.limit || 50
        );
        socket.emit("security:events", events);
      } catch (error) {
        socket.emit("error", { message: "Failed to fetch security events" });
      }
    });
    
    // Request fraud alerts
    socket.on("fraud:requestAlerts", async (data: { resolved?: boolean }) => {
      try {
        const alerts = await storage.getFraudAlerts(
          authSocket.userId, 
          data.resolved
        );
        socket.emit("fraud:alerts", alerts);
      } catch (error) {
        socket.emit("error", { message: "Failed to fetch fraud alerts" });
      }
    });
    
    // Resolve fraud alert
    socket.on("fraud:resolveAlert", async (data: { alertId: string }) => {
      try {
        if (authSocket.role !== "admin") {
          socket.emit("error", { message: "Insufficient permissions" });
          return;
        }
        
        await storage.resolveFraudAlert(data.alertId, authSocket.userId);
        
        // Notify all admins
        this.io.to("role:admin").emit("fraud:alertResolved", {
          alertId: data.alertId,
          resolvedBy: authSocket.username
        });
        
      } catch (error) {
        socket.emit("error", { message: "Failed to resolve alert" });
      }
    });
    
    // Request user documents
    socket.on("documents:requestList", async () => {
      try {
        const documents = await storage.getDocuments(authSocket.userId);
        socket.emit("documents:list", documents);
      } catch (error) {
        socket.emit("error", { message: "Failed to fetch documents" });
      }
    });
    
    // Join monitoring channel (admin only)
    socket.on("monitoring:subscribe", () => {
      if (authSocket.role === "admin") {
        socket.join("monitoring");
      }
    });
    
    // Leave monitoring channel
    socket.on("monitoring:unsubscribe", () => {
      socket.leave("monitoring");
    });
  }
  
  private startMonitoring() {
    // Start system monitoring
    monitoringService.startMonitoring(30000); // 30 seconds
    
    // Listen to monitoring events
    monitoringService.on("systemHealth", (health) => {
      this.io.to("monitoring").emit("system:health", health);
    });
    
    monitoringService.on("securityMetrics", (metrics) => {
      this.io.to("monitoring").emit("security:metrics", metrics);
    });
    
    monitoringService.on("alert", (alert) => {
      // Send alerts to all authenticated users
      this.io.emit("system:alert", alert);
    });
  }
  
  // Public methods for other services to send real-time updates
  
  sendSecurityEvent(userId: string, event: any) {
    this.io.to(`user:${userId}`).emit("security:event", event);
  }
  
  sendFraudAlert(userId: string, alert: any) {
    this.io.to(`user:${userId}`).emit("fraud:alert", alert);
    // Also send to admins
    this.io.to("role:admin").emit("fraud:alert", alert);
  }
  
  sendDocumentProcessed(userId: string, document: any) {
    this.io.to(`user:${userId}`).emit("document:processed", document);
  }
  
  sendBiometricResult(userId: string, result: any) {
    this.io.to(`user:${userId}`).emit("biometric:result", result);
  }
  
  sendSystemAlert(alert: any) {
    this.io.emit("system:alert", alert);
  }
  
  getConnectedUsers(): number {
    return this.authenticatedSockets.size;
  }
  
  getUserSockets(userId: string): string[] {
    return Array.from(this.authenticatedSockets.values())
      .filter(socket => socket.userId === userId)
      .map(socket => socket.id);
  }
}

let websocketService: WebSocketService | null = null;

export function initializeWebSocket(server: Server): WebSocketService {
  if (!websocketService) {
    websocketService = new WebSocketService(server);
  }
  return websocketService;
}

export function getWebSocketService(): WebSocketService | null {
  return websocketService;
}
