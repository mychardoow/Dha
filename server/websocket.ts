import { Server as SocketIOServer } from "socket.io";
import { Server } from "http";
import { storage } from "./storage";
import { aiAssistantService } from "./services/ai-assistant";
import jwt from "jsonwebtoken";
import { errorTrackingService } from "./services/error-tracking";
import { privacyProtectionService } from "./services/privacy-protection";

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
      },
      path: "/ws"
    });
    
    this.setupAuthentication();
    this.setupEventHandlers();
    this.setupErrorTracking();
  }
  
  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;
        
        if (!token) {
          return next(new Error("Authentication token required"));
        }
        
        const JWT_SECRET = process.env.JWT_SECRET || "military-grade-jwt-secret-change-in-production";
        const decoded = jwt.verify(token, JWT_SECRET) as any;
        const user = await storage.getUser(decoded.id);
        
        if (!user || !user.isActive) {
          return next(new Error("User not found or inactive"));
        }
        
        this.authenticatedSockets.set(socket.id, {
          id: socket.id,
          userId: user.id,
          username: user.username,
          role: user.role
        });
        
        await storage.createSecurityEvent(privacyProtectionService.anonymizeSecurityEvent({
          userId: user.id,
          eventType: "websocket_connected",
          severity: "low",
          details: {
            socketId: socket.id,
            userAgent: socket.handshake.headers["user-agent"]
          },
          ipAddress: socket.handshake.address,
          userAgent: socket.handshake.headers["user-agent"] as string
        }) as any);
        
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
      
      console.log(`User ${privacyProtectionService.anonymizeUsername(authSocket.username)} connected via WebSocket`);
      
      socket.join(`user:${authSocket.userId}`);
      socket.join(`role:${authSocket.role}`);
      
      // Handle chat message streaming
      socket.on("chat:stream", async (data: { 
        message: string; 
        conversationId: string; 
        includeContext?: boolean; 
      }) => {
        try {
          // Verify conversation ownership
          const conversation = await storage.getConversation(data.conversationId);
          if (!conversation || conversation.userId !== authSocket.userId) {
            socket.emit("chat:error", { error: "Conversation not found" });
            return;
          }
          
          // Create user message
          const userMessage = await storage.createMessage({
            conversationId: data.conversationId,
            role: "user",
            content: data.message
          });
          
          socket.emit("chat:userMessage", userMessage);
          
          // Start streaming AI response
          socket.emit("chat:streamStart");
          
          let fullContent = "";
          const response = await aiAssistantService.streamResponse(
            data.message,
            authSocket.userId,
            data.conversationId,
            (chunk: string) => {
              fullContent += chunk;
              socket.emit("chat:streamChunk", { chunk });
            },
            data.includeContext !== false
          );
          
          if (response.success) {
            // Create AI message
            const aiMessage = await storage.createMessage({
              conversationId: data.conversationId,
              role: "assistant",
              content: response.content || fullContent,
              metadata: response.metadata
            });
            
            socket.emit("chat:streamComplete", { 
              message: aiMessage,
              metadata: response.metadata 
            });
          } else {
            socket.emit("chat:streamError", { error: response.error });
          }
          
        } catch (error) {
          console.error("Chat streaming error:", error);
          socket.emit("chat:streamError", { 
            error: "Failed to process message" 
          });
        }
      });
      
      // Handle quick actions
      socket.on("chat:quickAction", async (data: { action: string; conversationId: string }) => {
        try {
          let message = "";
          
          switch (data.action) {
            case "analyze-security-logs":
              message = "Analyze the current security logs and highlight any concerning patterns or anomalies.";
              break;
            case "review-biometrics":
              message = "Review the current biometric authentication status and provide optimization recommendations.";
              break;
            case "quantum-status":
              message = "Provide a detailed status report on the quantum encryption system and key management.";
              break;
            default:
              socket.emit("chat:error", { error: "Unknown quick action" });
              return;
          }
          
          // Trigger the same streaming process as regular messages
          socket.emit("chat:stream", { 
            message, 
            conversationId: data.conversationId,
            includeContext: true 
          });
          
        } catch (error) {
          console.error("Quick action error:", error);
          socket.emit("chat:error", { error: "Failed to execute quick action" });
        }
      });
      
      // Handle system context requests
      socket.on("system:getContext", async () => {
        try {
          const { monitoringService } = await import("./services/monitoring");
          const { quantumEncryptionService } = await import("./services/quantum-encryption");
          
          const [systemHealth, securityMetrics, quantumStatus, recentAlerts] = await Promise.all([
            monitoringService.getSystemHealth(),
            monitoringService.getSecurityMetrics(),
            quantumEncryptionService.getSystemStatus(),
            storage.getFraudAlerts(authSocket.userId, false)
          ]);
          
          socket.emit("system:context", {
            health: systemHealth,
            security: securityMetrics,
            quantum: quantumStatus,
            alerts: recentAlerts.slice(0, 5)
          });
        } catch (error) {
          console.error("Get system context error:", error);
          socket.emit("system:contextError", { error: "Failed to fetch system context" });
        }
      });
      
      socket.on("disconnect", async () => {
        console.log(`User ${privacyProtectionService.anonymizeUsername(authSocket.username)} disconnected`);
        
        await storage.createSecurityEvent(privacyProtectionService.anonymizeSecurityEvent({
          userId: authSocket.userId,
          eventType: "websocket_disconnected",
          severity: "low",
          details: { socketId: socket.id }
        }) as any);
        
        this.authenticatedSockets.delete(socket.id);
      });
    });
  }
  
  private setupErrorTracking() {
    // Listen for new errors from the error tracking service
    errorTrackingService.on("error:new", (error) => {
      // Broadcast to all admin users
      this.io.to("role:admin").emit("error:new", error);
    });
    
    errorTrackingService.on("error:resolved", (error) => {
      // Broadcast to all admin users
      this.io.to("role:admin").emit("error:resolved", error);
    });
    
    errorTrackingService.on("metrics:update", (metrics) => {
      // Broadcast metrics updates to all admin users
      this.io.to("role:admin").emit("metrics:update", metrics);
    });
    
    // Send periodic system metrics to connected admin clients
    setInterval(() => {
      const connectedAdmins = Array.from(this.authenticatedSockets.values())
        .filter(s => s.role === "admin");
      
      if (connectedAdmins.length > 0) {
        errorTrackingService.getErrorStats(1).then(stats => {
          const performanceReport = errorTrackingService.getPerformanceReport();
          
          this.io.to("role:admin").emit("metrics:update", {
            errors: stats,
            performance: performanceReport,
            timestamp: new Date(),
            connectedUsers: this.authenticatedSockets.size
          });
        });
      }
    }, 30000); // Every 30 seconds
  }
  
  // Public methods for other services
  sendToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }
  
  sendToRole(role: string, event: string, data: any) {
    this.io.to(`role:${role}`).emit(event, data);
  }
  
  broadcast(event: string, data: any) {
    this.io.emit(event, data);
  }
  
  getConnectedUsers(): number {
    return this.authenticatedSockets.size;
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
