/**
 * Enhanced Monitoring Dashboard API Routes
 * 
 * Provides comprehensive real-time monitoring endpoints with nanosecond precision:
 * - System health and performance metrics
 * - Real-time threat detection data
 * - Request/response timing analysis
 * - Performance alerts and anomaly detection
 * - Queen Raeesa exclusive access monitoring
 * - Historical trend analysis with nanosecond data retention
 */

import { Router, Request, Response } from 'express';
import { enhancedNanosecondMonitoringService } from '../services/enhanced-nanosecond-monitoring-service.js';
import { enhancedSecurityResponseService } from '../services/enhanced-security-response.js';
import { monitoringHooksService } from '../services/monitoring-hooks.js';
import { authenticate } from '../middleware/auth.js';
import { storage } from '../storage.js';

const router = Router();

/**
 * Authentication middleware for Queen Raeesa exclusive endpoints
 */
function requireQueenAccess(req: Request, res: Response, next: any): void {
  if (req.user?.role !== 'raeesa_ultra') {
    res.status(403).json({
      error: 'Access denied',
      message: 'Queen Raeesa exclusive access required',
      timestamp: new Date().toISOString()
    });
    return;
  }
  next();
}

/**
 * GET /api/monitoring/nanosecond/health
 * Get current system health with nanosecond precision metrics
 */
router.get('/nanosecond/health', authenticate, async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const systemHealth = enhancedNanosecondMonitoringService.getSystemHealth();
    const monitoringStats = enhancedNanosecondMonitoringService.getMonitoringStats();
    const securityStats = enhancedSecurityResponseService.getSecurityStats();
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000; // Convert to milliseconds
    
    res.json({
      status: 'healthy',
      responseTime: `${responseTime.toFixed(6)}ms`,
      systemHealth,
      monitoring: {
        isRunning: monitoringStats.isRunning,
        activeRequests: monitoringStats.activeRequests,
        completedRequests: monitoringStats.completedRequests,
        threatDetections: monitoringStats.threatDetections,
        activeAlerts: monitoringStats.activeAlerts,
      },
      security: {
        blockedIPs: securityStats.blockedIPs,
        quarantinedIPs: securityStats.quarantinedIPs,
        suspiciousIPs: securityStats.suspiciousIPs,
        activeRateLimits: securityStats.activeRateLimits,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.status(500).json({
      error: 'Failed to get system health',
      responseTime: `${responseTime.toFixed(6)}ms`,
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/nanosecond/metrics/realtime
 * Get real-time performance metrics with nanosecond precision
 */
router.get('/nanosecond/metrics/realtime', authenticate, async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const limit = parseInt(req.query.limit as string) || 100;
    
    const requestMetrics = enhancedNanosecondMonitoringService.getRequestMetrics(limit);
    const threatMetrics = enhancedNanosecondMonitoringService.getThreatMetrics(50);
    const systemHealth = enhancedNanosecondMonitoringService.getSystemHealth();
    
    // Calculate real-time statistics
    const recentRequests = requestMetrics.filter(r => r.endTime && 
      Number(r.endTime) > Date.now() * 1_000_000 - 60_000_000_000n); // Last minute
    
    const avgResponseTime = recentRequests.length > 0 
      ? recentRequests.reduce((sum, r) => sum + (r.duration ? Number(r.duration) / 1_000_000 : 0), 0) / recentRequests.length
      : 0;
    
    const errorRate = recentRequests.length > 0
      ? (recentRequests.filter(r => r.statusCode && r.statusCode >= 400).length / recentRequests.length) * 100
      : 0;
    
    const throughput = recentRequests.length; // Requests per minute
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.json({
      responseTime: `${responseTime.toFixed(6)}ms`,
      metrics: {
        requests: {
          total: requestMetrics.length,
          recentCount: recentRequests.length,
          averageResponseTime: `${avgResponseTime.toFixed(3)}ms`,
          throughput: `${throughput} req/min`,
          errorRate: `${errorRate.toFixed(2)}%`,
        },
        threats: {
          total: threatMetrics.length,
          recent: threatMetrics.filter(t => Number(t.detectionTime) > Date.now() * 1_000_000 - 3600_000_000_000n).length, // Last hour
          averageDetectionTime: threatMetrics.length > 0
            ? `${(threatMetrics.reduce((sum, t) => sum + Number(t.responseTime), 0) / threatMetrics.length / 1_000_000).toFixed(6)}ms`
            : '0ms',
        },
        system: systemHealth ? {
          cpuUsage: `${((systemHealth.cpu.usage.user + systemHealth.cpu.usage.system) / 1000).toFixed(2)}ms`,
          memoryUsage: `${systemHealth.memory.usagePercent.toFixed(2)}%`,
          networkLatency: `${systemHealth.network.latency}ms`,
          databaseLatency: `${systemHealth.database.queryLatency}ms`,
          websocketConnections: systemHealth.websocket.activeConnections,
        } : null,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.status(500).json({
      error: 'Failed to get real-time metrics',
      responseTime: `${responseTime.toFixed(6)}ms`,
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/nanosecond/threats
 * Get real-time threat detection data
 */
router.get('/nanosecond/threats', authenticate, async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const severity = req.query.severity as string;
    
    let threatMetrics = enhancedNanosecondMonitoringService.getThreatMetrics(limit);
    
    // Filter by severity if specified
    if (severity) {
      threatMetrics = threatMetrics.filter(t => t.severity === severity);
    }
    
    // Group threats by IP for pattern analysis
    const ipThreatCounts = new Map<string, number>();
    const threatTypes = new Map<string, number>();
    
    for (const threat of threatMetrics) {
      ipThreatCounts.set(threat.ipAddress, (ipThreatCounts.get(threat.ipAddress) || 0) + 1);
      if (threat.threatType) {
        threatTypes.set(threat.threatType, (threatTypes.get(threat.threatType) || 0) + 1);
      }
    }
    
    // Convert response times to milliseconds
    const threatsWithTiming = threatMetrics.map(threat => ({
      ...threat,
      detectionTimeMs: Number(threat.detectionTime) / 1_000_000,
      responseTimeMs: Number(threat.responseTime) / 1_000_000,
    }));
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.json({
      responseTime: `${responseTime.toFixed(6)}ms`,
      threats: threatsWithTiming,
      analysis: {
        totalThreats: threatMetrics.length,
        uniqueIPs: ipThreatCounts.size,
        repeatOffenders: Array.from(ipThreatCounts.entries())
          .filter(([_, count]) => count > 3)
          .map(([ip, count]) => ({ ip, count })),
        threatTypeDistribution: Object.fromEntries(threatTypes),
        averageResponseTime: threatMetrics.length > 0 
          ? `${(threatMetrics.reduce((sum, t) => sum + Number(t.responseTime), 0) / threatMetrics.length / 1_000_000).toFixed(6)}ms`
          : '0ms',
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.status(500).json({
      error: 'Failed to get threat data',
      responseTime: `${responseTime.toFixed(6)}ms`,
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/nanosecond/alerts
 * Get performance alerts and anomalies
 */
router.get('/nanosecond/alerts', authenticate, async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const resolved = req.query.resolved === 'true';
    const severity = req.query.severity as string;
    
    let alerts = enhancedNanosecondMonitoringService.getPerformanceAlerts(resolved);
    
    // Filter by severity if specified
    if (severity) {
      alerts = alerts.filter(alert => alert.severity === severity);
    }
    
    // Convert timestamps to readable format
    const alertsWithTiming = alerts.map(alert => ({
      ...alert,
      timestampMs: Number(alert.timestamp) / 1_000_000,
      timestampISO: new Date(Number(alert.timestamp) / 1_000_000).toISOString(),
    }));
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.json({
      responseTime: `${responseTime.toFixed(6)}ms`,
      alerts: alertsWithTiming,
      summary: {
        total: alerts.length,
        critical: alerts.filter(a => a.severity === 'critical').length,
        warning: alerts.filter(a => a.severity === 'warning').length,
        autoRemediated: alerts.filter(a => a.autoRemediation).length,
        resolved: alerts.filter(a => a.resolved).length,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.status(500).json({
      error: 'Failed to get alerts',
      responseTime: `${responseTime.toFixed(6)}ms`,
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/monitoring/nanosecond/alerts/:alertId/resolve
 * Resolve a performance alert
 */
router.post('/nanosecond/alerts/:alertId/resolve', authenticate, async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const { alertId } = req.params;
    const resolved = enhancedNanosecondMonitoringService.resolveAlert(alertId);
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    if (resolved) {
      res.json({
        success: true,
        message: `Alert ${alertId} resolved`,
        responseTime: `${responseTime.toFixed(6)}ms`,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(404).json({
        error: 'Alert not found',
        alertId,
        responseTime: `${responseTime.toFixed(6)}ms`,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.status(500).json({
      error: 'Failed to resolve alert',
      responseTime: `${responseTime.toFixed(6)}ms`,
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/nanosecond/queen/access
 * Queen Raeesa exclusive access monitoring (requires Queen access)
 */
router.get('/nanosecond/queen/access', authenticate, requireQueenAccess, async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const queenMetrics = enhancedNanosecondMonitoringService.getQueenAccessMetrics();
    const systemHealth = enhancedNanosecondMonitoringService.getSystemHealth();
    const monitoringStats = enhancedNanosecondMonitoringService.getMonitoringStats();
    
    // Track this Queen access
    enhancedNanosecondMonitoringService.trackQueenAccess('sensitive', {
      endpoint: '/api/monitoring/nanosecond/queen/access',
      method: 'GET',
      userAgent: req.get('user-agent'),
      timestamp: startTime
    });
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.json({
      responseTime: `${responseTime.toFixed(6)}ms`,
      queenAccess: {
        ...queenMetrics,
        lastAccessMs: Number(queenMetrics.lastAccess) / 1_000_000,
        lastAccessISO: new Date(Number(queenMetrics.lastAccess) / 1_000_000).toISOString(),
      },
      systemOverview: {
        totalRequests: monitoringStats.completedRequests,
        activeThreats: monitoringStats.threatDetections,
        systemHealthScore: systemHealth ? 
          100 - systemHealth.memory.usagePercent - (systemHealth.cpu.loadAverage[0] / systemHealth.cpu.cores * 100) : 0,
      },
      exclusiveMetrics: {
        sensitiveEndpointsAccessed: queenMetrics.sensitiveDataAccess,
        systemOverridesUsed: queenMetrics.systemOverrides,
        securityBypassesUsed: queenMetrics.securityBypass,
        currentAccessPattern: queenMetrics.accessPattern,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.status(500).json({
      error: 'Failed to get Queen access metrics',
      responseTime: `${responseTime.toFixed(6)}ms`,
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/nanosecond/historical/:timeRange
 * Historical trend analysis with nanosecond data retention
 */
router.get('/nanosecond/historical/:timeRange', authenticate, async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const { timeRange } = req.params; // e.g., '1h', '6h', '24h', '7d'
    
    // Calculate time range in milliseconds
    let rangeMs: number;
    switch (timeRange) {
      case '1h': rangeMs = 60 * 60 * 1000; break;
      case '6h': rangeMs = 6 * 60 * 60 * 1000; break;
      case '24h': rangeMs = 24 * 60 * 60 * 1000; break;
      case '7d': rangeMs = 7 * 24 * 60 * 60 * 1000; break;
      default: rangeMs = 60 * 60 * 1000; // Default to 1 hour
    }
    
    const startDate = new Date(Date.now() - rangeMs);
    
    // Get historical data
    const requestMetrics = enhancedNanosecondMonitoringService.getRequestMetrics(1000);
    const threatMetrics = enhancedNanosecondMonitoringService.getThreatMetrics(500);
    
    // Filter by time range and process for trends
    const filteredRequests = requestMetrics.filter(r => 
      r.endTime && Number(r.endTime) / 1_000_000 > startDate.getTime()
    );
    
    const filteredThreats = threatMetrics.filter(t =>
      Number(t.detectionTime) / 1_000_000 > startDate.getTime()
    );
    
    // Calculate trends
    const hourlyBuckets = new Map<number, {
      requests: number;
      threats: number;
      avgResponseTime: number;
      errorRate: number;
    }>();
    
    // Group data by hour
    for (const request of filteredRequests) {
      const hour = Math.floor((Number(request.endTime!) / 1_000_000) / (60 * 60 * 1000));
      const bucket = hourlyBuckets.get(hour) || { requests: 0, threats: 0, avgResponseTime: 0, errorRate: 0 };
      
      bucket.requests++;
      bucket.avgResponseTime += request.duration ? Number(request.duration) / 1_000_000 : 0;
      if (request.statusCode && request.statusCode >= 400) {
        bucket.errorRate++;
      }
      
      hourlyBuckets.set(hour, bucket);
    }
    
    for (const threat of filteredThreats) {
      const hour = Math.floor((Number(threat.detectionTime) / 1_000_000) / (60 * 60 * 1000));
      const bucket = hourlyBuckets.get(hour) || { requests: 0, threats: 0, avgResponseTime: 0, errorRate: 0 };
      bucket.threats++;
      hourlyBuckets.set(hour, bucket);
    }
    
    // Finalize averages
    for (const [hour, bucket] of hourlyBuckets) {
      if (bucket.requests > 0) {
        bucket.avgResponseTime = bucket.avgResponseTime / bucket.requests;
        bucket.errorRate = (bucket.errorRate / bucket.requests) * 100;
      }
    }
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.json({
      responseTime: `${responseTime.toFixed(6)}ms`,
      timeRange,
      startDate: startDate.toISOString(),
      endDate: new Date().toISOString(),
      data: {
        totalRequests: filteredRequests.length,
        totalThreats: filteredThreats.length,
        hourlyTrends: Array.from(hourlyBuckets.entries()).map(([hour, data]) => ({
          timestamp: new Date(hour * 60 * 60 * 1000).toISOString(),
          ...data,
          avgResponseTimeMs: `${data.avgResponseTime.toFixed(3)}ms`,
          errorRatePercent: `${data.errorRate.toFixed(2)}%`,
        })),
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.status(500).json({
      error: 'Failed to get historical data',
      responseTime: `${responseTime.toFixed(6)}ms`,
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * POST /api/monitoring/nanosecond/force-gc
 * Force garbage collection (Queen access only)
 */
router.post('/nanosecond/force-gc', authenticate, requireQueenAccess, async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const memoryBefore = process.memoryUsage();
    
    if (global.gc) {
      global.gc();
      const memoryAfter = process.memoryUsage();
      const memoryFreed = memoryBefore.heapUsed - memoryAfter.heapUsed;
      
      // Track Queen access
      enhancedNanosecondMonitoringService.trackQueenAccess('override', {
        action: 'force_garbage_collection',
        memoryFreed: `${Math.round(memoryFreed / 1024 / 1024)}MB`,
        timestamp: startTime
      });
      
      const endTime = process.hrtime.bigint();
      const responseTime = Number(endTime - startTime) / 1_000_000;
      
      res.json({
        success: true,
        message: 'Garbage collection completed',
        responseTime: `${responseTime.toFixed(6)}ms`,
        memoryFreed: `${Math.round(memoryFreed / 1024 / 1024)}MB`,
        memoryBefore: {
          heapUsed: `${Math.round(memoryBefore.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryBefore.heapTotal / 1024 / 1024)}MB`,
        },
        memoryAfter: {
          heapUsed: `${Math.round(memoryAfter.heapUsed / 1024 / 1024)}MB`,
          heapTotal: `${Math.round(memoryAfter.heapTotal / 1024 / 1024)}MB`,
        },
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(500).json({
        error: 'Garbage collection not available',
        message: 'Start with --expose-gc flag to enable manual GC',
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.status(500).json({
      error: 'Failed to perform garbage collection',
      responseTime: `${responseTime.toFixed(6)}ms`,
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

/**
 * GET /api/monitoring/nanosecond/performance/comparison
 * Performance comparison across different time periods
 */
router.get('/nanosecond/performance/comparison', authenticate, async (req: Request, res: Response) => {
  const startTime = process.hrtime.bigint();
  
  try {
    const requestMetrics = enhancedNanosecondMonitoringService.getRequestMetrics(1000);
    const now = Date.now();
    
    // Compare current hour vs previous hour
    const currentHour = requestMetrics.filter(r => 
      r.endTime && Number(r.endTime) / 1_000_000 > now - 3600000
    );
    
    const previousHour = requestMetrics.filter(r =>
      r.endTime && 
      Number(r.endTime) / 1_000_000 > now - 7200000 &&
      Number(r.endTime) / 1_000_000 <= now - 3600000
    );
    
    const calculateMetrics = (requests: typeof requestMetrics) => ({
      count: requests.length,
      avgResponseTime: requests.length > 0 
        ? requests.reduce((sum, r) => sum + (r.duration ? Number(r.duration) / 1_000_000 : 0), 0) / requests.length
        : 0,
      errorRate: requests.length > 0
        ? (requests.filter(r => r.statusCode && r.statusCode >= 400).length / requests.length) * 100
        : 0,
      throughput: requests.length / 60, // requests per minute
    });
    
    const currentMetrics = calculateMetrics(currentHour);
    const previousMetrics = calculateMetrics(previousHour);
    
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.json({
      responseTime: `${responseTime.toFixed(6)}ms`,
      comparison: {
        current: {
          period: 'Last Hour',
          ...currentMetrics,
          avgResponseTimeMs: `${currentMetrics.avgResponseTime.toFixed(3)}ms`,
          errorRatePercent: `${currentMetrics.errorRate.toFixed(2)}%`,
          throughputRpm: `${currentMetrics.throughput.toFixed(1)} req/min`,
        },
        previous: {
          period: 'Previous Hour',
          ...previousMetrics,
          avgResponseTimeMs: `${previousMetrics.avgResponseTime.toFixed(3)}ms`,
          errorRatePercent: `${previousMetrics.errorRate.toFixed(2)}%`,
          throughputRpm: `${previousMetrics.throughput.toFixed(1)} req/min`,
        },
        changes: {
          requestCountChange: currentMetrics.count - previousMetrics.count,
          responseTimeChange: `${((currentMetrics.avgResponseTime - previousMetrics.avgResponseTime) / (previousMetrics.avgResponseTime || 1) * 100).toFixed(2)}%`,
          errorRateChange: `${(currentMetrics.errorRate - previousMetrics.errorRate).toFixed(2)}%`,
          throughputChange: `${((currentMetrics.throughput - previousMetrics.throughput) / (previousMetrics.throughput || 1) * 100).toFixed(2)}%`,
        },
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    const endTime = process.hrtime.bigint();
    const responseTime = Number(endTime - startTime) / 1_000_000;
    
    res.status(500).json({
      error: 'Failed to get performance comparison',
      responseTime: `${responseTime.toFixed(6)}ms`,
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    });
  }
});

export { router as enhancedMonitoringDashboardRouter };