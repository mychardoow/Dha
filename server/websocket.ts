import { Server as SocketIOServer } from "socket.io";
import { Server } from "http";
import { storage } from "./storage";
import { aiAssistantService } from "./services/ai-assistant";
import { notificationService } from "./services/notification-service";
import { adminNotificationService } from "./services/admin-notification-service";
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
        
        const JWT_SECRET = process.env.JWT_SECRET || 'dev-jwt-secret-key-for-testing-only-12345678901234567890123456789012';
        if (!process.env.JWT_SECRET && process.env.NODE_ENV === 'production') {
          return next(new Error('CRITICAL SECURITY ERROR: JWT_SECRET environment variable is required for WebSocket authentication in production'));
        }
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
      
      // ===================== NOTIFICATION HANDLERS =====================
      
      // Mark notification as read
      socket.on("notification:markRead", async (data: { notificationId: string }) => {
        try {
          const notification = await storage.getNotification(data.notificationId);
          if (notification && notification.userId === authSocket.userId) {
            await notificationService.markAsRead(data.notificationId);
            socket.emit("notification:marked", { notificationId: data.notificationId });
          } else {
            socket.emit("notification:error", { error: "Notification not found" });
          }
        } catch (error) {
          console.error("Mark notification error:", error);
          socket.emit("notification:error", { error: "Failed to mark notification" });
        }
      });

      // Get unread notification count
      socket.on("notification:getUnreadCount", async () => {
        try {
          const count = await notificationService.getUnreadCount(authSocket.userId);
          socket.emit("notification:unreadCount", { count });
        } catch (error) {
          console.error("Get unread count error:", error);
          socket.emit("notification:error", { error: "Failed to get notification count" });
        }
      });

      // Subscribe to notifications
      socket.on("notification:subscribe", async (data?: { categories?: string[] }) => {
        try {
          // Join notification channels
          socket.join(`notifications:${authSocket.userId}`);
          if (authSocket.role === "admin") {
            socket.join("admin:notifications");
          }
          
          // Send initial notification count
          const count = await notificationService.getUnreadCount(authSocket.userId);
          socket.emit("notification:subscribed", { count });
        } catch (error) {
          console.error("Subscribe notifications error:", error);
          socket.emit("notification:error", { error: "Failed to subscribe to notifications" });
        }
      });

      // ===================== ADMIN NOTIFICATION HANDLERS =====================
      
      if (authSocket.role === "admin") {
        // Get active admin alerts
        socket.on("admin:getActiveAlerts", async () => {
          try {
            const alerts = await adminNotificationService.getActiveAlerts();
            socket.emit("admin:activeAlerts", { alerts });
          } catch (error) {
            console.error("Get active alerts error:", error);
            socket.emit("admin:error", { error: "Failed to get active alerts" });
          }
        });

        // Resolve admin alert
        socket.on("admin:resolveAlert", async (data: { alertId: string; resolution?: string }) => {
          try {
            await adminNotificationService.resolveAlert(data.alertId, authSocket.userId, data.resolution);
            socket.emit("admin:alertResolved", { alertId: data.alertId });
            // Broadcast to other admins
            socket.to("admin:notifications").emit("admin:alertResolved", { 
              alertId: data.alertId, 
              resolvedBy: authSocket.userId 
            });
          } catch (error) {
            console.error("Resolve alert error:", error);
            socket.emit("admin:error", { error: "Failed to resolve alert" });
          }
        });

        // Assign admin alert
        socket.on("admin:assignAlert", async (data: { alertId: string; adminId: string }) => {
          try {
            await adminNotificationService.assignAlert(data.alertId, data.adminId);
            socket.emit("admin:alertAssigned", data);
            // Broadcast to other admins
            socket.to("admin:notifications").emit("admin:alertAssigned", data);
          } catch (error) {
            console.error("Assign alert error:", error);
            socket.emit("admin:error", { error: "Failed to assign alert" });
          }
        });

        // Send system-wide notification
        socket.on("admin:sendSystemNotification", async (data: {
          category: string;
          priority: string;
          title: string;
          message: string;
          targetRole?: string;
        }) => {
          try {
            const notifications = await notificationService.sendSystemNotification({
              ...data,
              eventType: "admin.system_notification",
              createdBy: authSocket.userId
            }, data.targetRole);
            
            socket.emit("admin:systemNotificationSent", { count: notifications.length });
          } catch (error) {
            console.error("Send system notification error:", error);
            socket.emit("admin:error", { error: "Failed to send system notification" });
          }
        });

        // Get system metrics
        socket.on("admin:getSystemMetrics", async () => {
          try {
            const { monitoringService } = await import("./services/monitoring");
            const [systemHealth, securityMetrics, errorStats] = await Promise.all([
              monitoringService.getSystemHealth(),
              monitoringService.getSecurityMetrics(),
              errorTrackingService.getErrorStats(1)
            ]);
            
            socket.emit("admin:systemMetrics", {
              health: systemHealth,
              security: securityMetrics,
              errors: errorStats,
              timestamp: new Date()
            });
          } catch (error) {
            console.error("Get system metrics error:", error);
            socket.emit("admin:error", { error: "Failed to get system metrics" });
          }
        });
      }

      // ===================== STATUS UPDATE HANDLERS =====================
      
      // Subscribe to status updates for specific entities
      socket.on("status:subscribe", async (data: { entityType: string; entityId: string }) => {
        try {
          const channel = `status:${data.entityType}:${data.entityId}`;
          socket.join(channel);
          
          // Send current status
          const latestStatus = await storage.getLatestStatusUpdate(data.entityType, data.entityId);
          if (latestStatus) {
            socket.emit("status:current", { 
              entityType: data.entityType, 
              entityId: data.entityId,
              status: latestStatus 
            });
          }
          
          socket.emit("status:subscribed", { entityType: data.entityType, entityId: data.entityId });
        } catch (error) {
          console.error("Subscribe status error:", error);
          socket.emit("status:error", { error: "Failed to subscribe to status updates" });
        }
      });

      // Unsubscribe from status updates
      socket.on("status:unsubscribe", (data: { entityType: string; entityId: string }) => {
        const channel = `status:${data.entityType}:${data.entityId}`;
        socket.leave(channel);
        socket.emit("status:unsubscribed", { entityType: data.entityType, entityId: data.entityId });
      });

      // ===================== CHAT HANDLERS =====================

      // Join chat session
      socket.on("chat:joinSession", async (data: { sessionId: string }) => {
        try {
          const session = await storage.getChatSession(data.sessionId);
          if (!session) {
            socket.emit("chat:error", { error: "Chat session not found" });
            return;
          }

          // Check permission
          const hasAccess = authSocket.role === "admin" || session.userId === authSocket.userId;
          if (!hasAccess) {
            socket.emit("chat:error", { error: "Access denied to chat session" });
            return;
          }

          socket.join(`chat:${data.sessionId}`);
          socket.emit("chat:joined", { sessionId: data.sessionId });

          // Notify other participants
          socket.to(`chat:${data.sessionId}`).emit("chat:userJoined", {
            userId: authSocket.userId,
            username: authSocket.username,
            role: authSocket.role
          });
        } catch (error) {
          console.error("Join chat session error:", error);
          socket.emit("chat:error", { error: "Failed to join chat session" });
        }
      });

      // Leave chat session
      socket.on("chat:leaveSession", (data: { sessionId: string }) => {
        socket.leave(`chat:${data.sessionId}`);
        socket.to(`chat:${data.sessionId}`).emit("chat:userLeft", {
          userId: authSocket.userId,
          username: authSocket.username
        });
        socket.emit("chat:left", { sessionId: data.sessionId });
      });

      // Send chat message
      socket.on("chat:sendMessage", async (data: { 
        sessionId: string; 
        content: string; 
        messageType?: string 
      }) => {
        try {
          const session = await storage.getChatSession(data.sessionId);
          if (!session) {
            socket.emit("chat:error", { error: "Chat session not found" });
            return;
          }

          const hasAccess = authSocket.role === "admin" || session.userId === authSocket.userId;
          if (!hasAccess) {
            socket.emit("chat:error", { error: "Access denied to chat session" });
            return;
          }

          const message = await storage.createChatMessage({
            chatSessionId: data.sessionId,
            senderId: authSocket.userId,
            content: data.content,
            messageType: data.messageType || "text"
          });

          // Broadcast to all session participants
          this.io.to(`chat:${data.sessionId}`).emit("chat:newMessage", {
            message,
            senderUsername: authSocket.username,
            senderRole: authSocket.role
          });

          // Send notification to offline participants
          const targetUserId = authSocket.role === "admin" ? session.userId : session.adminId;
          if (targetUserId) {
            await notificationService.createNotification({
              userId: targetUserId,
              category: "user",
              eventType: "chat.new_message",
              priority: "medium",
              title: "New Chat Message",
              message: `${authSocket.username}: ${data.content.substring(0, 100)}...`,
              actionUrl: `/chat/${data.sessionId}`,
              actionLabel: "View Chat"
            });
          }
        } catch (error) {
          console.error("Send chat message error:", error);
          socket.emit("chat:error", { error: "Failed to send message" });
        }
      });

      // ===================== DOCUMENT PROCESSING HANDLERS =====================

      // Subscribe to document processing updates
      socket.on("document:subscribe", async (data: { documentId: string }) => {
        try {
          const document = await storage.getDocument(data.documentId);
          if (!document || (document.userId !== authSocket.userId && authSocket.role !== "admin")) {
            socket.emit("document:error", { error: "Document not found or access denied" });
            return;
          }

          socket.join(`document:${data.documentId}`);
          socket.emit("document:subscribed", { 
            documentId: data.documentId,
            status: document.processingStatus 
          });
        } catch (error) {
          console.error("Subscribe document error:", error);
          socket.emit("document:error", { error: "Failed to subscribe to document updates" });
        }
      });

      // Get processing status
      socket.on("document:getStatus", async (data: { documentId: string }) => {
        try {
          const document = await storage.getDocument(data.documentId);
          if (document && (document.userId === authSocket.userId || authSocket.role === "admin")) {
            socket.emit("document:status", {
              documentId: data.documentId,
              status: document.processingStatus,
              verificationStatus: document.isVerified,
              updatedAt: document.updatedAt
            });
          } else {
            socket.emit("document:error", { error: "Document not found or access denied" });
          }
        } catch (error) {
          console.error("Get document status error:", error);
          socket.emit("document:error", { error: "Failed to get document status" });
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
