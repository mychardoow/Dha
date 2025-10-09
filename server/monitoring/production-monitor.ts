/**
 * Production Monitoring Configuration
 * Integrates with Render's monitoring system
 */

import { HealthMonitor } from './monitoring/health-check.js';
import { AlertSystem } from './monitoring/alert-system.js';
import { ENV_CONFIG } from './config/environment.js';

// Initialize monitoring systems
const healthMonitor = new HealthMonitor();
const alertSystem = new AlertSystem(ENV_CONFIG.WEBHOOK_URL);

// Critical service endpoints to monitor
const CRITICAL_ENDPOINTS = [
  '/api/health',
  '/api/ai/status',
  '/api/documents/status',
  '/api/ultra-ai/health',
  '/api/biometric/status'
];

// Performance thresholds
const THRESHOLDS = {
  responseTime: 500, // ms
  memoryUsage: 85, // percentage
  errorRate: 1, // percentage
  cpuUsage: 80 // percentage
};

// Monitor configuration
export const monitoringConfig = {
  enabled: true,
  interval: 60000, // 1 minute
  healthCheckEndpoint: '/health',
  metricsEndpoint: '/metrics',
  alerts: {
    enabled: true,
    webhook: ENV_CONFIG.WEBHOOK_URL,
    email: ENV_CONFIG.ALERT_EMAIL
  },
  uptime: {
    enabled: true,
    pingInterval: 300000 // 5 minutes
  }
};

// Start monitoring
export async function startMonitoring() {
  console.log('🔍 Starting production monitoring...');
  
  // Initialize health checks
  await healthMonitor.initialize();
  
  // Monitor critical endpoints
  setInterval(async () => {
    for (const endpoint of CRITICAL_ENDPOINTS) {
      const health = await healthMonitor.checkEndpoint(endpoint);
      if (health.status === 'unhealthy') {
        await alertSystem.sendAlert({
          type: 'error',
          message: `Endpoint ${endpoint} is unhealthy: ${health.error}`,
          service: 'API',
          timestamp: new Date().toISOString()
        });
      }
    }
  }, monitoringConfig.interval);

  // Monitor system resources
  setInterval(async () => {
    const metrics = await healthMonitor.getSystemMetrics();
    
    // Check CPU usage
    if (metrics.cpu > THRESHOLDS.cpuUsage) {
      await alertSystem.sendAlert({
        type: 'warning',
        message: `High CPU usage: ${metrics.cpu}%`,
        service: 'System',
        timestamp: new Date().toISOString()
      });
    }
    
    // Check memory usage
    if (metrics.memory.percentage > THRESHOLDS.memoryUsage) {
      await alertSystem.sendAlert({
        type: 'warning',
        message: `High memory usage: ${metrics.memory.percentage}%`,
        service: 'System',
        timestamp: new Date().toISOString()
      });
    }
  }, 30000); // Every 30 seconds

  // Write health status to file
  setInterval(() => {
    const status = healthMonitor.getStatus();
    writeHealthStatus(status);
  }, 60000); // Every minute
}

function writeHealthStatus(status: any) {
  const healthStatus = {
    timestamp: new Date().toISOString(),
    environment: ENV_CONFIG.NODE_ENV,
    status: status.overall,
    services: status.services,
    metrics: status.metrics,
    lastIncident: status.lastIncident
  };
  
  try {
    require('fs').writeFileSync(
      'health-status.json',
      JSON.stringify(healthStatus, null, 2)
    );
  } catch (error) {
    console.error('Failed to write health status:', error);
  }
}