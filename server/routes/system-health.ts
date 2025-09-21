
import { Router } from 'express';
import { configService } from '../middleware/provider-config';

const router = Router();

// Comprehensive system health check
router.get('/health/comprehensive', async (req, res) => {
  const startTime = Date.now();
  
  try {
    const healthData = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      version: '1.0.0',
      services: {
        database: await checkDatabase(),
        encryption: checkEncryption(),
        authentication: checkAuthentication(),
        documentGeneration: checkDocumentGeneration(),
        aiServices: checkAIServices(),
        governmentAPIs: checkGovernmentAPIs(),
        monitoring: checkMonitoring()
      },
      security: {
        httpsEnabled: req.secure || req.headers['x-forwarded-proto'] === 'https',
        secretsConfigured: checkSecrets(),
        encryptionEnabled: Boolean(process.env.ENCRYPTION_KEY),
        auditLoggingEnabled: Boolean(process.env.AUDIT_LOGGING_ENABLED)
      },
      responseTime: Date.now() - startTime
    };

    // Determine overall status
    const failedServices = Object.entries(healthData.services)
      .filter(([_, status]) => status !== 'healthy').length;
    
    if (failedServices > 0) {
      healthData.status = failedServices > 3 ? 'critical' : 'degraded';
    }

    res.status(healthData.status === 'healthy' ? 200 : 
               healthData.status === 'degraded' ? 206 : 503)
       .json(healthData);

  } catch (error) {
    res.status(500).json({
      status: 'error',
      timestamp: new Date().toISOString(),
      error: error instanceof Error ? error.message : 'Unknown error',
      responseTime: Date.now() - startTime
    });
  }
});

// Individual service checks
async function checkDatabase() {
  try {
    const { pool } = await import('../db');
    if (pool) {
      await pool.query('SELECT 1');
      return 'healthy';
    }
    return 'in-memory';
  } catch (error) {
    return 'error';
  }
}

function checkEncryption() {
  const requiredKeys = ['ENCRYPTION_KEY', 'JWT_SECRET', 'SESSION_SECRET'];
  const missingKeys = requiredKeys.filter(key => !process.env[key]);
  return missingKeys.length === 0 ? 'healthy' : 'error';
}

function checkAuthentication() {
  return configService ? 'healthy' : 'error';
}

function checkDocumentGeneration() {
  return process.env.DOCUMENT_SIGNING_KEY ? 'healthy' : 'error';
}

function checkAIServices() {
  return process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY ? 'healthy' : 'disabled';
}

function checkGovernmentAPIs() {
  const apis = ['DHA_NPR_API_KEY', 'SAPS_CRC_API_KEY', 'DHA_ABIS_API_KEY'];
  const configuredAPIs = apis.filter(key => process.env[key]);
  return configuredAPIs.length > 0 ? 'healthy' : 'disabled';
}

function checkMonitoring() {
  return process.env.MONITORING_ENABLED === 'true' ? 'healthy' : 'disabled';
}

function checkSecrets() {
  const requiredSecrets = [
    'JWT_SECRET',
    'SESSION_SECRET', 
    'ENCRYPTION_KEY',
    'DOCUMENT_SIGNING_KEY'
  ];
  
  return requiredSecrets.every(secret => process.env[secret]);
}

export { router as systemHealthRouter };
