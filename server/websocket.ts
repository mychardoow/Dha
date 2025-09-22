import { Server as SocketIOServer } from 'socket.io';
import { type Server as HTTPServer } from 'http';
import jwt from 'jsonwebtoken';
import { LRUCache } from 'lru-cache'; // Keep this import from the original file if it's used elsewhere or might be needed.
import { storage } from "./storage"; // Keep imports that are still necessary
import { aiAssistantService } from "./services/ai-assistant"; // Keep imports that are still necessary
import { notificationService } from "./services/notification-service"; // Keep imports that are still necessary
import { adminNotificationService } from "./services/admin-notification-service"; // Keep imports that are still necessary
import { errorTrackingService } from "./services/error-tracking"; // Keep imports that are still necessary
import { privacyProtectionService } from "./services/privacy-protection"; // Keep imports that are still necessary
import { getConfigService, getConfig } from "./middleware/provider-config"; // Keep imports that are still necessary


// Optional imports with fallbacks - keeping them as per original structure
let enhancedMonitoringService: any = null;
let webSocketSubscriptionService: any = null;

// Function to initialize optional services - keeping this structure
async function initializeOptionalServices() {
  try {
    const monitoring = await import("./services/enhanced-monitoring-service");
    enhancedMonitoringService = monitoring.enhancedMonitoringService;
  } catch (e) {
    console.log("Enhanced monitoring service not available");
  }

  try {
    const wsService = await import("./services/websocket-subscription-service");
    webSocketSubscriptionService = wsService.webSocketSubscriptionService;
  } catch (e) {
    console.log("WebSocket subscription service not available");
  }
}


let io: SocketIOServer | null = null;

export interface AuthenticatedSocket extends Socket {
  userId?: string;
  userRole?: string;
}

export class WebSocketService {
  private io: SocketIOServer;
  private authenticatedSockets = new Map<string, AuthenticatedSocket>();

  constructor(server: HTTPServer) {
    this.io = new SocketIOServer(server, {
      cors: {
        origin: getConfigService().getCorsOrigins(),
        methods: ["GET", "POST"],
        credentials: true
      },
      path: "/ws"
    });

    this.setupAuthentication();
    this.setupEventHandlers();
    this.setupErrorTracking();
  }

  /**
   * Validate JWT secret with strict production enforcement aligned with provider-config
   * CRITICAL: Must match provider-config 64+ character requirement for government-grade security
   */
  private validateJWTSecret(): string | null {
    const value = getConfig().JWT_SECRET;

    if (!value) {
      const errorMessage = 'CRITICAL SECURITY ERROR: JWT_SECRET environment variable is required for WebSocket authentication';
      if (getConfigService().isProduction()) {
        console.error(errorMessage);
        return null;
      }
      console.error(errorMessage);
      // SECURITY: No development fallbacks - must be configured properly
      return null;
    }

    // ALIGNED: Validate 64+ character requirement to match provider-config standards
    if (value.length < 64) {
      console.error('CRITICAL SECURITY ERROR: JWT_SECRET must be at least 64 characters for government-grade security');
      return null;
    }

    return value;
  }

  private setupAuthentication() {
    this.io.use(async (socket, next) => {
      try {
        const token = socket.handshake.auth.token;

        // SECURITY: Production-ready authentication only
        // No development mode bypasses or mock user support
        if (!token) {
          return next(new Error("Authentication token required"));
        }

        const JWT_SECRET = this.validateJWTSecret();
        if (!JWT_SECRET) {
          return next(new Error('CRITICAL SECURITY ERROR: JWT_SECRET validation failed'));
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
    this.io.on("connection", (socket: any) => { // Changed socket type to any to match edited snippet's usage
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

      // Handle system context requests with role-based authorization
      socket.on("system:getContext", async () => {
        try {
          // Restrict sensitive system context to admin/security roles only
          if (!['admin', 'security_officer'].includes(authSocket.role)) {
            socket.emit("system:contextError", { error: "Insufficient permissions for system context" });
            return;
          }

          // Import dynamically for specific handlers to keep main imports clean
          const { monitoringService } = await import("./services/monitoring");
          const { quantumEncryptionService } = await import("./services/quantum-encryption");

          const [systemHealth, securityMetrics, quantumStatus, recentAlerts] = await Promise.all([
            monitoringService.getSystemHealth(),
            monitoringService.getSecurityMetrics(),
            quantumEncryptionService.getSystemStatus(),
            storage.getFraudAlerts(authSocket.userId, false) // Assuming this is the correct way to get alerts for context
          ]);

          // Sanitize sensitive system data before sending
          const sanitizedContext = {
            health: {
              cpu: systemHealth.cpu,
              memory: systemHealth.memory,
              network: systemHealth.network,
              storage: systemHealth.storage,
              timestamp: systemHealth.timestamp
              // Remove sensitive internal metrics
            },
            security: {
              threatsBlocked: securityMetrics.threatsBlocked,
              suspiciousActivities: securityMetrics.suspiciousActivities,
              falsePositives: securityMetrics.falsePositives,
              detectionRate: securityMetrics.detectionRate,
              timestamp: securityMetrics.timestamp
              // Remove detailed security patterns, thresholds, internal data
            },
            quantum: {
              activeKeys: quantumStatus.activeKeys,
              algorithms: quantumStatus.algorithms,
              averageEntropy: quantumStatus.averageEntropy,
              nextRotation: quantumStatus.nextRotation,
              quantumReadiness: quantumStatus.quantumReadiness
              // Remove sensitive key data, entropy details
            },
            alerts: recentAlerts.slice(0, 5).map(alert => ({
              id: alert.id,
              type: alert.alertType,
              severity: alert.riskScore > 80 ? "high" : alert.riskScore > 50 ? "medium" : "low",
              timestamp: alert.createdAt
              // Remove sensitive details, user data, investigation notes
            }))
          };

          socket.emit("system:context", sanitizedContext);
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

      // ===================== SECURITY ALERT SUBSCRIPTION HANDLERS =====================

      // Subscribe to security alerts with enhanced role-based validation
      socket.on("security:subscribe", async (data: { eventTypes: string[]; severity?: string; userId?: string }) => {
        try {
          // Import and validate subscription data with strict validation
          const { webSocketSubscriptionSchema } = await import("@shared/schema");
          const validatedData = webSocketSubscriptionSchema.parse(data);

          // Enhanced deny-by-default security for sensitive alert types
          const highPrivilegeAlerts = ['fraud_alert', 'incident_update', 'system_status'];
          const hasHighPrivilegeRequest = validatedData.eventTypes.some(type =>
            highPrivilegeAlerts.includes(type)
          );

          if (hasHighPrivilegeRequest && !['admin', 'security_officer'].includes(authSocket.role)) {
            socket.emit("security:subscriptionError", {
              error: "Insufficient permissions for sensitive security alerts",
              requiredRole: "admin or security_officer"
            });

            // Log unauthorized subscription attempt
            await storage.createSecurityEvent(privacyProtectionService.anonymizeSecurityEvent({
              userId: authSocket.userId,
              eventType: "unauthorized_alert_subscription_attempt",
              severity: "medium",
              details: {
                requestedEventTypes: validatedData.eventTypes,
                userRole: authSocket.role,
                deniedAlertTypes: validatedData.eventTypes.filter(type => highPrivilegeAlerts.includes(type))
              },
              ipAddress: socket.handshake.address,
              userAgent: socket.handshake.headers["user-agent"] as string
            }) as any);
            return;
          }

          // Users can only subscribe to their own alerts unless they're admin/security_officer
          if (validatedData.userId && validatedData.userId !== authSocket.userId) {
            if (!['admin', 'security_officer'].includes(authSocket.role)) {
              socket.emit("security:subscriptionError", {
                error: "Cannot subscribe to other users' alerts",
                scope: "own_alerts_only"
              });
              return;
            }
          }

          // Apply tenant/user scoping based on role and permissions
          const scopedEventTypes = validatedData.eventTypes.map(eventType => {
            if (['admin', 'security_officer'].includes(authSocket.role)) {
              // Admin/security officers can receive global alerts
              return eventType;
            } else {
              // Regular users only receive their own alerts
              return `${eventType}:user:${authSocket.userId}`;
            }
          });

          // Join appropriate channels with scoped permissions
          scopedEventTypes.forEach(eventType => {
            const channelSuffix = validatedData.userId && ['admin', 'security_officer'].includes(authSocket.role)
              ? `:${validatedData.userId}`
              : '';
            socket.join(`security:${eventType}${channelSuffix}`);
          });

          // If severity filter specified, join severity-specific channels with role check
          if (validatedData.severity) {
            const severityChannel = ['admin', 'security_officer'].includes(authSocket.role)
              ? `security:severity:${validatedData.severity}`
              : `security:severity:${validatedData.severity}:user:${authSocket.userId}`;
            socket.join(severityChannel);
          }

          socket.emit("security:subscribed", {
            eventTypes: validatedData.eventTypes,
            severity: validatedData.severity,
            userId: validatedData.userId,
            scope: ['admin', 'security_officer'].includes(authSocket.role) ? 'global' : 'user_only'
          });

          // Log security alert subscription with enhanced details
          await storage.createSecurityEvent(privacyProtectionService.anonymizeSecurityEvent({
            userId: authSocket.userId,
            eventType: "security_alert_subscription",
            severity: "low",
            details: {
              subscribedEventTypes: validatedData.eventTypes,
              severity: validatedData.severity,
              targetUserId: validatedData.userId,
              scope: ['admin', 'security_officer'].includes(authSocket.role) ? 'global' : 'user_only',
              channels: scopedEventTypes
            },
            ipAddress: socket.handshake.address,
            userAgent: socket.handshake.headers["user-agent"] as string
          }) as any);

        } catch (error) {
          console.error("Security subscription error:", error);
          if (error instanceof Error && error.name === 'ZodError') {
            socket.emit("security:subscriptionError", { error: "Invalid subscription data", details: (error as any).errors });
          } else {
            socket.emit("security:subscriptionError", { error: "Failed to subscribe to security alerts" });
          }
        }
      });

      // Unsubscribe from security alerts
      socket.on("security:unsubscribe", async (data: { eventTypes: string[] }) => {
        try {
          const { webSocketSubscriptionSchema } = await import("@shared/schema");
          const validatedData = webSocketSubscriptionSchema.parse(data);

          // Leave the specified channels
          validatedData.eventTypes.forEach(eventType => {
            socket.leave(`security:${eventType}`);
            socket.leave(`security:${eventType}:${authSocket.userId}`);
          });

          socket.emit("security:unsubscribed", { eventTypes: validatedData.eventTypes });

        } catch (error) {
          console.error("Security unsubscribe error:", error);
          socket.emit("security:subscriptionError", { error: "Failed to unsubscribe from security alerts" });
        }
      });

      // ===================== ADMIN NOTIFICATION HANDLERS =====================

      if (authSocket.role === "admin" || authSocket.role === "security_officer") {
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
              eventType: "admin.system_notification",
              createdBy: authSocket.userId,
              category: data.category as "SYSTEM" | "SECURITY" | "DOCUMENT" | "USER" | "ADMIN" | "FRAUD" | "BIOMETRIC",
              priority: data.priority as "LOW" | "MEDIUM" | "HIGH" | "CRITICAL",
              title: data.title,
              message: data.message
            }, data.targetRole as "user" | "admin" | undefined);

            socket.emit("admin:systemNotificationSent", { count: notifications.length });
          } catch (error) {
            console.error("Send system notification error:", error);
            socket.emit("admin:error", { error: "Failed to send system notification" });
          }
        });

        // Get system metrics
        socket.on("admin:getSystemMetrics", async () => {
          try {
            // Import dynamically for specific handlers
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
              category: "USER",
              eventType: "chat.new_message",
              priority: "MEDIUM",
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
              createdAt: document.createdAt
            });
          } else {
            socket.emit("document:error", { error: "Document not found or access denied" });
          }
        } catch (error) {
          console.error("Get document status error:", error);
          socket.emit("document:error", { error: "Failed to get document status" });
        }
      });

      socket.on("disconnect", async (reason) => { // Explicitly typed 'reason'
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

export function initializeWebSocket(server: HTTPServer): WebSocketService {
  if (!websocketService) {
    websocketService = new WebSocketService(server);
    initializeOptionalServices(); // Call the function to initialize optional services
  }
  return websocketService;
}

export function getWebSocketService(): WebSocketService | null {
  return websocketService;
}

export { io }; // Export io instance