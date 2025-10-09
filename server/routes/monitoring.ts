import { Router } from "express";
import { autonomousMonitoringBot } from "../services/autonomous-monitoring-bot.js";
import { selfHealingService } from "../services/self-healing-service.js";
import { enhancedErrorDetectionService } from "../services/enhanced-error-detection.js";
import { proactiveMaintenanceService } from "../services/proactive-maintenance-service.js";
import { intelligentAlertingService } from "../services/intelligent-alerting-service.js";
import { webSocketMonitoringService } from "../services/websocket-monitoring.js";
import { storage } from "../storage.js";

const router = Router();

/**
 * GET /api/monitoring/health
 * Get current system health status
 */
router.get("/health", async (req, res) => {
  try {
    const systemHealth = await autonomousMonitoringBot.getSystemHealthStatus();
    res.json(systemHealth);
  } catch (error) {
    console.error("Error getting system health:", error);
    res.status(500).json({ 
      error: "Failed to get system health",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/autonomous-actions
 * Get autonomous actions history
 */
router.get("/autonomous-actions", async (req, res) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const actions = await autonomousMonitoringBot.getAutonomousOperationsHistory(limit);
    res.json(actions);
  } catch (error) {
    console.error("Error getting autonomous actions:", error);
    res.status(500).json({ 
      error: "Failed to get autonomous actions",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/alert-rules
 * Get alert rules configuration
 */
router.get("/alert-rules", async (req, res) => {
  try {
    const rules = await storage.getAlertRules({ isEnabled: true });
    res.json(rules);
  } catch (error) {
    console.error("Error getting alert rules:", error);
    res.status(500).json({ 
      error: "Failed to get alert rules",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * PATCH /api/monitoring/alert-rules/:id
 * Update alert rule
 */
router.patch("/alert-rules/:id", async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    
    await storage.updateAlertRule(id, updates);
    res.json({ success: true, message: "Alert rule updated" });
  } catch (error) {
    console.error("Error updating alert rule:", error);
    res.status(500).json({ 
      error: "Failed to update alert rule",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/circuit-breakers
 * Get circuit breaker status
 */
router.get("/circuit-breakers", async (req, res) => {
  try {
    const circuitBreakers = await storage.getAllCircuitBreakerStates();
    const serviceHealth = selfHealingService.getServiceHealth();
    
    const circuitBreakerStatus = circuitBreakers.map(cb => ({
      service: cb.serviceName,
      state: cb.state,
      failureCount: cb.failureCount,
      successRate: cb.totalRequests > 0 ? 
        ((cb.totalRequests - cb.totalFailures) / cb.totalRequests) * 100 : 0,
      lastFailure: cb.lastFailureAt
    }));
    
    res.json(circuitBreakerStatus);
  } catch (error) {
    console.error("Error getting circuit breakers:", error);
    res.status(500).json({ 
      error: "Failed to get circuit breakers",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/metrics-history
 * Get historical metrics data
 */
router.get("/metrics-history", async (req, res) => {
  try {
    const timeRange = req.query.timeRange as string || '1h';
    
    // Calculate time range
    let startDate: Date;
    switch (timeRange) {
      case '1h':
        startDate = new Date(Date.now() - 60 * 60 * 1000);
        break;
      case '6h':
        startDate = new Date(Date.now() - 6 * 60 * 60 * 1000);
        break;
      case '24h':
        startDate = new Date(Date.now() - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
        break;
      default:
        startDate = new Date(Date.now() - 60 * 60 * 1000);
    }
    
    // Get system health snapshots
    const snapshots = await storage.getSystemHealthSnapshots({
      startDate,
      limit: 200
    });
    
    // Transform data for charts
    const metricsHistory = {
      resources: snapshots.map(snapshot => ({
        timestamp: snapshot.timestamp.toISOString(),
        cpu: parseFloat(snapshot.cpuUsage || '0'),
        memory: parseFloat(snapshot.memoryUsage || '0'),
        disk: parseFloat(snapshot.diskUsage || '0'),
        network: snapshot.networkLatency || 0
      })),
      responseTime: snapshots.map(snapshot => ({
        timestamp: snapshot.timestamp.toISOString(),
        average: snapshot.responseTime || 0
      })),
      errorRate: snapshots.map(snapshot => ({
        timestamp: snapshot.timestamp.toISOString(),
        rate: snapshot.errorRate || 0
      })),
      throughput: snapshots.map(snapshot => ({
        timestamp: snapshot.timestamp.toISOString(),
        requests: snapshot.throughput || 0
      }))
    };
    
    res.json(metricsHistory);
  } catch (error) {
    console.error("Error getting metrics history:", error);
    res.status(500).json({ 
      error: "Failed to get metrics history",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/monitoring/autonomous-bot/start
 * Start the autonomous monitoring bot
 */
router.post("/autonomous-bot/start", async (req, res) => {
  try {
    await autonomousMonitoringBot.start();
    res.json({ success: true, message: "Autonomous monitoring bot started" });
  } catch (error) {
    console.error("Error starting autonomous bot:", error);
    res.status(500).json({ 
      error: "Failed to start autonomous bot",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/monitoring/autonomous-bot/stop
 * Stop the autonomous monitoring bot
 */
router.post("/autonomous-bot/stop", async (req, res) => {
  try {
    await autonomousMonitoringBot.stop();
    res.json({ success: true, message: "Autonomous monitoring bot stopped" });
  } catch (error) {
    console.error("Error stopping autonomous bot:", error);
    res.status(500).json({ 
      error: "Failed to stop autonomous bot",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/monitoring/autonomous-bot/restart
 * Restart the autonomous monitoring bot
 */
router.post("/autonomous-bot/restart", async (req, res) => {
  try {
    await autonomousMonitoringBot.stop();
    await new Promise(resolve => setTimeout(resolve, 2000)); // Wait 2 seconds
    await autonomousMonitoringBot.start();
    res.json({ success: true, message: "Autonomous monitoring bot restarted" });
  } catch (error) {
    console.error("Error restarting autonomous bot:", error);
    res.status(500).json({ 
      error: "Failed to restart autonomous bot",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/monitoring/trigger-healing
 * Trigger manual healing action
 */
router.post("/trigger-healing", async (req, res) => {
  try {
    const { service, actionType } = req.body;
    
    if (!service) {
      return res.status(400).json({ error: "Service name is required" });
    }
    
    await selfHealingService.triggerHealing(service, actionType);
    res.json({ success: true, message: `Healing triggered for ${service}` });
  } catch (error) {
    console.error("Error triggering healing:", error);
    res.status(500).json({ 
      error: "Failed to trigger healing",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/service-health
 * Get detailed service health information
 */
router.get("/service-health", async (req, res) => {
  try {
    const serviceHealth = selfHealingService.getServiceHealth();
    const healingStats = selfHealingService.getHealingStats();
    
    res.json({
      services: serviceHealth instanceof Map ? 
        Object.fromEntries(serviceHealth) : serviceHealth,
      healingStats
    });
  } catch (error) {
    console.error("Error getting service health:", error);
    res.status(500).json({ 
      error: "Failed to get service health",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/error-statistics
 * Get error detection statistics
 */
router.get("/error-statistics", async (req, res) => {
  try {
    const timeWindow = parseInt(req.query.timeWindow as string) || 24;
    const statistics = await enhancedErrorDetectionService.getErrorStatistics(timeWindow);
    
    // Convert Maps to Objects for JSON serialization
    const serializedStats = {
      ...statistics,
      errorsByCategory: Object.fromEntries(statistics.errorsByCategory),
      errorsBySeverity: Object.fromEntries(statistics.errorsBySeverity),
      topPatterns: Object.fromEntries(statistics.topPatterns)
    };
    
    res.json(serializedStats);
  } catch (error) {
    console.error("Error getting error statistics:", error);
    res.status(500).json({ 
      error: "Failed to get error statistics",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/maintenance-schedule
 * Get maintenance schedule and history
 */
router.get("/maintenance-schedule", async (req, res) => {
  try {
    const schedules = proactiveMaintenanceService.getMaintenanceSchedules();
    const history = proactiveMaintenanceService.getMaintenanceHistory();
    const capacityPlans = proactiveMaintenanceService.getCapacityPlans();
    
    res.json({
      schedules,
      recentHistory: history.slice(0, 20),
      capacityPlans
    });
  } catch (error) {
    console.error("Error getting maintenance schedule:", error);
    res.status(500).json({ 
      error: "Failed to get maintenance schedule",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/monitoring/maintenance/execute/:taskId
 * Execute manual maintenance task
 */
router.post("/maintenance/execute/:taskId", async (req, res) => {
  try {
    const { taskId } = req.params;
    
    const result = await proactiveMaintenanceService.executeManualMaintenance(taskId);
    
    if (result) {
      res.json({ success: true, result });
    } else {
      res.status(404).json({ error: "Maintenance task not found" });
    }
  } catch (error) {
    console.error("Error executing maintenance:", error);
    res.status(500).json({ 
      error: "Failed to execute maintenance",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/alerts
 * Get intelligent alerts
 */
router.get("/alerts", async (req, res) => {
  try {
    const notifications = await storage.getNotifications(undefined, {
      limit: 50,
      isArchived: false
    });
    
    const alerts = notifications.map(notification => ({
      id: notification.id,
      title: notification.title,
      description: notification.description,
      severity: notification.priority,
      category: notification.category,
      timestamp: notification.createdAt,
      resolved: notification.isRead,
      requiresAction: notification.requiresAction
    }));
    
    res.json(alerts);
  } catch (error) {
    console.error("Error getting alerts:", error);
    res.status(500).json({ 
      error: "Failed to get alerts",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/incidents
 * Get active incidents
 */
router.get("/incidents", async (req, res) => {
  try {
    const status = req.query.status as string;
    const incidents = await storage.getIncidents({ 
      status: status || 'open',
      limit: 100
    });
    
    res.json(incidents);
  } catch (error) {
    console.error("Error getting incidents:", error);
    res.status(500).json({ 
      error: "Failed to get incidents",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/compliance-status
 * Get government compliance status
 */
router.get("/compliance-status", async (req, res) => {
  try {
    const recentAudits = await storage.getComplianceAudits({
      startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
      limit: 100
    });
    
    const complianceStatus = {
      totalAudits: recentAudits.length,
      compliantAudits: recentAudits.filter(audit => audit.complianceStatus === 'compliant').length,
      nonCompliantAudits: recentAudits.filter(audit => audit.complianceStatus === 'non_compliant').length,
      partiallyCompliantAudits: recentAudits.filter(audit => audit.complianceStatus === 'partial').length,
      overallScore: recentAudits.length > 0 ? 
        (recentAudits.filter(audit => audit.complianceStatus === 'compliant').length / recentAudits.length) * 100 : 100,
      recentAudits: recentAudits.slice(0, 10)
    };
    
    res.json(complianceStatus);
  } catch (error) {
    console.error("Error getting compliance status:", error);
    res.status(500).json({ 
      error: "Failed to get compliance status",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * GET /api/monitoring/status
 * Get overall monitoring system status
 */
router.get("/status", async (req, res) => {
  try {
    const status = {
      autonomousBot: autonomousMonitoringBot.getStatus(),
      selfHealing: selfHealingService.getStatus(),
      errorDetection: enhancedErrorDetectionService.getServiceStatus(),
      proactiveMaintenance: proactiveMaintenanceService.getServiceStatus(),
      intelligentAlerting: { status: 'active', alerts: 'operational' },
      webSocketService: webSocketMonitoringService.getStatus(),
      timestamp: new Date().toISOString()
    };
    
    res.json(status);
  } catch (error) {
    console.error("Error getting monitoring status:", error);
    res.status(500).json({ 
      error: "Failed to get monitoring status",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/monitoring/force-health-check
 * Force immediate health check
 */
router.post("/force-health-check", async (req, res) => {
  try {
    // Trigger immediate health check by emitting event
    autonomousMonitoringBot.emit('forceHealthCheck', { 
      timestamp: new Date(),
      triggeredBy: 'api_request'
    });
    
    res.json({ success: true, message: "Health check triggered" });
  } catch (error) {
    console.error("Error forcing health check:", error);
    res.status(500).json({ 
      error: "Failed to force health check",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

/**
 * POST /api/monitoring/test-websocket
 * Test WebSocket broadcasting (for development)
 */
router.post("/test-websocket", async (req, res) => {
  try {
    const { channel, data } = req.body;
    
    if (!channel) {
      return res.status(400).json({ error: "Channel is required" });
    }
    
    webSocketMonitoringService.forceBroadcast(channel, data || {
      test: true,
      message: "Test broadcast from API",
      timestamp: new Date().toISOString()
    });
    
    res.json({ success: true, message: `Test broadcast sent to ${channel}` });
  } catch (error) {
    console.error("Error testing WebSocket:", error);
    res.status(500).json({ 
      error: "Failed to test WebSocket",
      details: error instanceof Error ? error.message : String(error)
    });
  }
});

export default router;