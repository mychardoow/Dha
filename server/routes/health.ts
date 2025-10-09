/**
 * Production Health Check and Deployment Readiness API Routes
 * 
 * Provides endpoints for system health monitoring and deployment readiness validation
 * for the DHA Digital Services platform.
 */

import { Router, Request, Response } from 'express';
import { productionHealthCheck } from '../services/production-health-check.js';
import { authenticate } from '../middleware/auth.js';

const router = Router();

/**
 * GET /health - Basic health check endpoint
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const healthResult = await productionHealthCheck.performFullHealthCheck();
    
    const response = {
      status: healthResult.overallHealth,
      timestamp: new Date().toISOString(),
      version: '2.0.0',
      environment: process.env.NODE_ENV || 'development',
      summary: healthResult.summary,
      uptime: process.uptime(),
      system: {
        nodeVersion: process.version,
        platform: process.platform,
        arch: process.arch
      }
    };

    // Set appropriate HTTP status code
    const statusCode = healthResult.overallHealth === 'healthy' ? 200 :
                      healthResult.overallHealth === 'degraded' ? 200 : 503;

    res.status(statusCode).json(response);
  } catch (error) {
    res.status(503).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Health check failed',
message: String(error)
    });
  }
});

/**
 * GET /health/detailed - Detailed health check with individual service results
 * Requires authentication
 */
router.get('/health/detailed', authenticate, async (req: Request, res: Response) => {
  try {
    const healthResult = await productionHealthCheck.performFullHealthCheck();
    
    res.json({
      status: healthResult.overallHealth,
      timestamp: new Date().toISOString(),
      summary: healthResult.summary,
      results: healthResult.results,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: 'Detailed health check failed',
message: String(error)
    });
  }
});

/**
 * GET /health/readiness - Deployment readiness check
 * Requires authentication
 */
router.get('/health/readiness', authenticate, async (req: Request, res: Response) => {
  try {
    const readinessResult = await productionHealthCheck.checkDeploymentReadiness();
    
    const statusCode = readinessResult.isReady ? 200 : 503;
    
    res.status(statusCode).json({
      ready: readinessResult.isReady,
      readinessScore: readinessResult.readinessScore,
      timestamp: new Date().toISOString(),
      criticalIssues: readinessResult.criticalIssues,
      warnings: readinessResult.warnings,
      securityCompliance: readinessResult.securityCompliance,
      apiConnectivity: readinessResult.apiConnectivity,
      performanceMetrics: readinessResult.performanceMetrics,
      environment: process.env.NODE_ENV || 'development'
    });
  } catch (error) {
    res.status(500).json({
      ready: false,
      timestamp: new Date().toISOString(),
      error: 'Readiness check failed',
message: String(error)
    });
  }
});

/**
 * GET /health/security - Security system status check
 * Requires authentication
 */
router.get('/health/security', authenticate, async (req: Request, res: Response) => {
  try {
    const readinessResult = await productionHealthCheck.checkDeploymentReadiness();
    
    res.json({
      securityCompliance: readinessResult.securityCompliance,
      timestamp: new Date().toISOString(),
      recommendations: {
        encryption: readinessResult.securityCompliance.encryptionEnabled ? 
          'Encryption systems operational' : 
          'CRITICAL: Configure encryption systems',
        secrets: readinessResult.securityCompliance.secretsConfigured ? 
          'Secrets properly configured' : 
          'CRITICAL: Configure required secrets',
        authentication: readinessResult.securityCompliance.authenticationStrengthValid ? 
          'Authentication meets government standards' : 
          'CRITICAL: Strengthen authentication configuration',
        certificates: readinessResult.securityCompliance.certificatesValid ? 
          'Government certificates valid' : 
          'CRITICAL: Renew government certificates'
      }
    });
  } catch (error) {
    res.status(500).json({
      timestamp: new Date().toISOString(),
      error: 'Security check failed',
message: String(error)
    });
  }
});

export { router as healthRouter };