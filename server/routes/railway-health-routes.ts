/**
 * Railway Health Check and Auto-Scaling API Routes
 * 
 * Provides comprehensive API endpoints for Railway deployment monitoring,
 * health checks, auto-scaling, and circuit breaker management.
 */

import { Router, Request, Response } from 'express';
import { railwayHealthCheckSystem } from '../services/railway-health-check-system.js';
import { railwayAutoScalingService } from '../services/railway-auto-scaling-service.js';
import { circuitBreakerSystem } from '../services/circuit-breaker-system.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /api/railway/health - Railway-specific health check endpoint
 * Used by Railway platform for health monitoring
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthStatus = railwayHealthCheckSystem.getOverallHealthStatus();
    
    const response = {
      status: healthStatus.status,
      timestamp: new Date().toISOString(),
      platform: 'railway',
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      railway_environment: process.env.RAILWAY_ENVIRONMENT || 'unknown',
      services: healthStatus.services.map(service => ({
        name: service.service,
        status: service.overall_status,
        uptime: service.uptime_percentage,
        last_healthy: service.last_healthy
      })),
      summary: {
        total_services: healthStatus.services.length,
        healthy_services: healthStatus.services.filter(s => s.overall_status === 'healthy').length,
        degraded_services: healthStatus.services.filter(s => s.overall_status === 'degraded').length,
        critical_services: healthStatus.services.filter(s => s.overall_status === 'critical').length
      }
    };

    // Set appropriate HTTP status code
    const statusCode = healthStatus.status === 'healthy' ? 200 :
                      healthStatus.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      platform: 'railway',
      error: 'Health check failed',
      message: String(error)
    });
  }
});

/**
 * GET /api/railway/health/readiness - Kubernetes-style readiness probe
 */
router.get('/health/readiness', async (req: Request, res: Response) => {
  try {
    const readinessStatus = railwayHealthCheckSystem.getReadinessStatus();
    const readyProbes = Array.from(readinessStatus.values()).filter(probe => probe.status === 'ready');
    const totalProbes = readinessStatus.size;
    
    const isReady = readyProbes.length === totalProbes;
    
    const response = {
      ready: isReady,
      timestamp: new Date().toISOString(),
      probes: Array.from(readinessStatus.values()).map(probe => ({
        name: probe.name,
        status: probe.status,
        consecutive_successes: probe.consecutiveSuccesses,
        consecutive_failures: probe.consecutiveFailures,
        last_check: probe.lastCheck
      })),
      summary: {
        total_probes: totalProbes,
        ready_probes: readyProbes.length,
        not_ready_probes: totalProbes - readyProbes.length
      }
    };

    const statusCode = isReady ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    res.status(503).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
      message: String(error)
    });
  }
});

/**
 * GET /api/railway/health/liveness - Kubernetes-style liveness probe
 */
router.get('/health/liveness', async (req: Request, res: Response) => {
  try {
    const livenessStatus = railwayHealthCheckSystem.getLivenessStatus();
    const aliveProbes = Array.from(livenessStatus.values()).filter(probe => probe.status === 'alive');
    const totalProbes = livenessStatus.size;
    
    const isAlive = aliveProbes.length === totalProbes;
    
    const response = {
      alive: isAlive,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory_usage: process.memoryUsage(),
      probes: Array.from(livenessStatus.values()).map(probe => ({
        name: probe.name,
        status: probe.status,
        consecutive_failures: probe.consecutiveFailures,
        restart_count: probe.restartCount,
        last_check: probe.lastCheck
      })),
      summary: {
        total_probes: totalProbes,
        alive_probes: aliveProbes.length,
        dead_probes: totalProbes - aliveProbes.length
      }
    };

    const statusCode = isAlive ? 200 : 503;
    res.status(statusCode).json(response);
  } catch (error) {
    res.status(503).json({
      alive: false,
      timestamp: new Date().toISOString(),
      error: 'Liveness check failed',
      message: String(error)
    });
  }
});

/**
 * GET /api/railway/health/comprehensive - Detailed health check (requires auth)
 */
router.get('/health/comprehensive', authenticate, async (req: Request, res: Response) => {
  try {
    const comprehensiveHealth = await railwayHealthCheckSystem.performComprehensiveHealthCheck();
    
    res.json({
      timestamp: new Date().toISOString(),
      platform: 'railway',
      comprehensive_health: comprehensiveHealth,
      environment: process.env.NODE_ENV,
      railway_config: {
        port: process.env.PORT,
        database_url: process.env.DATABASE_URL ? 'configured' : 'not_configured',
        railway_environment: process.env.RAILWAY_ENVIRONMENT
      }
    });
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Comprehensive health check failed',
      message: String(error)
    });
  }
});

/**
 * GET /api/railway/scaling/status - Auto-scaling status
 */
router.get('/scaling/status', authenticate, async (req: Request, res: Response) => {
  try {
    const scalingStatus = railwayAutoScalingService.getScalingStatus();
    
    res.json({
      timestamp: new Date().toISOString(),
      auto_scaling: scalingStatus,
      railway_config: {
        min_replicas: 2,
        max_replicas: 10,
        auto_scaling_enabled: process.env.ENABLE_AUTO_SCALING === 'true'
      }
    });
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Failed to get scaling status',
      message: String(error)
    });
  }
});

/**
 * POST /api/railway/scaling/force-evaluation - Force scaling evaluation
 */
router.post('/scaling/force-evaluation', authenticate, async (req: Request, res: Response) => {
  try {
    const decision = await railwayAutoScalingService.forceScalingEvaluation();
    
    res.json({
      timestamp: new Date().toISOString(),
      forced_evaluation: true,
      scaling_decision: decision,
      message: 'Scaling evaluation triggered successfully'
    });
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Failed to force scaling evaluation',
      message: String(error)
    });
  }
});

/**
 * GET /api/railway/circuit-breakers - Circuit breaker status
 */
router.get('/circuit-breakers', authenticate, async (req: Request, res: Response) => {
  try {
    const systemStatus = circuitBreakerSystem.getSystemStatus();
    const allCircuitBreakers = circuitBreakerSystem.getAllCircuitBreakerStatuses();
    
    const circuitBreakers = Array.from(allCircuitBreakers.entries()).map(([name, state]) => ({
      service: name,
      state: state.state,
      consecutive_failures: state.stats.consecutiveFailures,
      failure_rate: state.stats.failureRate,
      fallback_active: state.fallbackActive,
      last_failure: state.stats.lastFailureTime,
      last_success: state.stats.lastSuccessTime,
      next_retry: state.nextRetryTime
    }));
    
    res.json({
      timestamp: new Date().toISOString(),
      system_status: systemStatus,
      circuit_breakers: circuitBreakers
    });
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Failed to get circuit breaker status',
      message: String(error)
    });
  }
});

/**
 * POST /api/railway/circuit-breakers/:service/test - Test circuit breaker
 */
router.post('/circuit-breakers/:service/test', authenticate, async (req: Request, res: Response) => {
  try {
    const { service } = req.params;
    const { action } = req.body; // 'open', 'close', or 'test'
    
    let result = false;
    let message = '';
    
    switch (action) {
      case 'open':
        result = circuitBreakerSystem.openCircuitBreaker(service, 'Manual test');
        message = result ? `Circuit breaker opened for ${service}` : `Failed to open circuit breaker for ${service}`;
        break;
        
      case 'close':
        result = circuitBreakerSystem.closeCircuitBreaker(service, 'Manual test');
        message = result ? `Circuit breaker closed for ${service}` : `Failed to close circuit breaker for ${service}`;
        break;
        
      case 'test':
        // Test the service through circuit breaker
        try {
          await circuitBreakerSystem.executeRequest(
            service,
            async () => {
              // Simple test request
              return { test: true, timestamp: new Date() };
            }
          );
          result = true;
          message = `Test request successful for ${service}`;
        } catch (error) {
          result = false;
          message = `Test request failed for ${service}: ${error}`;
        }
        break;
        
      default:
        return res.status(400).json({
          error: 'Invalid action',
          message: 'Action must be "open", "close", or "test"'
        });
    }
    
    res.json({
      timestamp: new Date().toISOString(),
      service,
      action,
      success: result,
      message,
      circuit_status: circuitBreakerSystem.getCircuitBreakerStatus(service)
    });
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Circuit breaker test failed',
      message: String(error)
    });
  }
});

/**
 * GET /api/railway/metrics - Railway deployment metrics
 */
router.get('/metrics', authenticate, async (req: Request, res: Response) => {
  try {
    const healthStatus = railwayHealthCheckSystem.getOverallHealthStatus();
    const scalingStatus = railwayAutoScalingService.getScalingStatus();
    const circuitBreakerStatus = circuitBreakerSystem.getSystemStatus();
    
    const metrics = {
      timestamp: new Date().toISOString(),
      health: {
        overall_status: healthStatus.status,
        total_services: healthStatus.services.length,
        healthy_services: healthStatus.services.filter(s => s.overall_status === 'healthy').length,
        service_uptime: healthStatus.services.reduce((acc, s) => acc + s.uptime_percentage, 0) / healthStatus.services.length
      },
      scaling: {
        current_replicas: scalingStatus.currentReplicas,
        auto_scaling_active: scalingStatus.isRunning,
        recent_decisions: scalingStatus.recentDecisions.length,
        last_scale_action: scalingStatus.lastScaleAction
      },
      circuit_breakers: circuitBreakerStatus,
      system: {
        uptime: process.uptime(),
        memory_usage: process.memoryUsage(),
        cpu_usage: process.cpuUsage(),
        node_version: process.version,
        environment: process.env.NODE_ENV,
        railway_environment: process.env.RAILWAY_ENVIRONMENT
      }
    };
    
    res.json(metrics);
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Failed to get metrics',
      message: String(error)
    });
  }
});

/**
 * GET /api/railway/deployment/readiness - Deployment readiness check
 */
router.get('/deployment/readiness', authenticate, async (req: Request, res: Response) => {
  try {
    // Check all systems for deployment readiness
    const healthStatus = railwayHealthCheckSystem.getOverallHealthStatus();
    const scalingStatus = railwayAutoScalingService.getScalingStatus();
    const circuitBreakerStatus = circuitBreakerSystem.getSystemStatus();
    
    const readinessChecks = {
      health_system: healthStatus.status === 'healthy',
      auto_scaling: scalingStatus.isRunning,
      circuit_breakers: circuitBreakerStatus.critical_services === 0,
      environment_variables: !!(process.env.DATABASE_URL && process.env.PORT),
      railway_config: !!process.env.RAILWAY_ENVIRONMENT,
      critical_services: healthStatus.services.filter(s => s.overall_status === 'critical').length === 0
    };
    
    const passedChecks = Object.values(readinessChecks).filter(Boolean).length;
    const totalChecks = Object.keys(readinessChecks).length;
    const readinessScore = (passedChecks / totalChecks) * 100;
    
    const isReady = readinessScore >= 90; // 90% readiness required
    
    res.json({
      timestamp: new Date().toISOString(),
      deployment_ready: isReady,
      readiness_score: readinessScore,
      checks: readinessChecks,
      summary: {
        passed_checks: passedChecks,
        total_checks: totalChecks,
        failing_checks: Object.entries(readinessChecks)
          .filter(([key, value]) => !value)
          .map(([key]) => key)
      },
      recommendations: isReady ? 
        ['System is ready for deployment'] :
        [
          'Address failing readiness checks before deployment',
          'Ensure all critical services are healthy',
          'Verify environment variables are configured',
          'Check circuit breaker status for external dependencies'
        ]
    });
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      deployment_ready: false,
      error: 'Deployment readiness check failed',
      message: String(error)
    });
  }
});

/**
 * POST /api/railway/health/force-check - Force immediate health check
 */
router.post('/health/force-check', authenticate, async (req: Request, res: Response) => {
  try {
    const healthResult = await railwayHealthCheckSystem.forceHealthCheck();
    
    res.json({
      timestamp: new Date().toISOString(),
      forced_check: true,
      health_result: healthResult,
      message: 'Health check completed successfully'
    });
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Forced health check failed',
      message: String(error)
    });
  }
});

/**
 * GET /api/railway/status - Overall Railway deployment status
 */
router.get('/status', async (req: Request, res: Response) => {
  try {
    const healthStatus = railwayHealthCheckSystem.getOverallHealthStatus();
    const scalingStatus = railwayAutoScalingService.getScalingStatus();
    const circuitBreakerStatus = circuitBreakerSystem.getSystemStatus();
    
    const overallStatus = {
      status: healthStatus.status,
      platform: 'railway',
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV,
      uptime: process.uptime(),
      replicas: {
        current: scalingStatus.currentReplicas,
        min: scalingStatus.scalingPolicy.minReplicas,
        max: scalingStatus.scalingPolicy.maxReplicas
      },
      services: {
        total: healthStatus.services.length,
        healthy: healthStatus.services.filter(s => s.overall_status === 'healthy').length,
        degraded: healthStatus.services.filter(s => s.overall_status === 'degraded').length,
        critical: healthStatus.services.filter(s => s.overall_status === 'critical').length
      },
      circuit_breakers: {
        total: circuitBreakerStatus.total_services,
        healthy: circuitBreakerStatus.healthy_services,
        degraded: circuitBreakerStatus.degraded_services,
        critical: circuitBreakerStatus.critical_services
      },
      features: {
        auto_scaling: scalingStatus.isRunning,
        health_monitoring: true,
        circuit_breakers: true,
        graceful_degradation: circuitBreakerStatus.fallbacks_active > 0
      }
    };
    
    // Set status code based on overall health
    const statusCode = overallStatus.status === 'healthy' ? 200 :
                      overallStatus.status === 'degraded' ? 200 : 503;
    
    res.status(statusCode).json(overallStatus);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      platform: 'railway',
      timestamp: new Date().toISOString(),
      error: 'Status check failed',
      message: String(error)
    });
  }
});

export { router as railwayHealthRoutes };