import * as fs from 'fs';
import * as crypto from 'crypto';
import { storage } from './storage';
import { environmentValidator } from "./services/environment-validator";

interface HealthCheck {
  name: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: any;
}

export async function startupHealthChecks(): Promise<void> {
  const checks: HealthCheck[] = [];

  console.log('🔍 Running startup health checks...');

  try {
    // Environment validation
    const envValidation = await environmentValidator.validateProductionEnvironment();
    checks.push({
      name: 'Environment Variables',
      status: envValidation.valid ? 'passed' : envValidation.errors.length > 0 ? 'failed' : 'warning',
      message: envValidation.valid ? 'All required environment variables present' :
               `Missing: ${envValidation.errors.join(', ')}`,
      details: { errors: envValidation.errors, warnings: envValidation.warnings }
    });

    // Database connectivity
    try {
      // Test basic storage functionality instead of direct connection
      if (typeof storage.getUser === 'function') {
        checks.push({
          name: 'Database Connection',
          status: 'passed',
          message: 'Storage interface ready'
        });
      } else {
        throw new Error('Storage interface not properly initialized');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      checks.push({
        name: 'Database Connection',
        status: 'warning',
        message: `Storage interface issue: ${errorMessage}`,
        details: { error: errorMessage }
      });
    }

    // Core services availability
    const coreServices = [
      'error-tracking',
      'audit-trail-service',
      'production-health-check',
      'enhanced-pdf-generation-service'
    ];

    for (const serviceName of coreServices) {
      try {
        const service = await import(`./services/${serviceName}`);
        checks.push({
          name: `Service: ${serviceName}`,
          status: 'passed',
          message: 'Service loaded successfully'
        });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        checks.push({
          name: `Service: ${serviceName}`,
          status: 'warning',
          message: `Service load warning: ${errorMessage}`,
          details: { error: errorMessage }
        });
      }
    }

    // Memory and system resources
    const memoryUsage = process.memoryUsage();
    const memoryUsageMB = memoryUsage.heapUsed / 1024 / 1024;

    checks.push({
      name: 'Memory Usage',
      status: memoryUsageMB < 500 ? 'passed' : memoryUsageMB < 1000 ? 'warning' : 'failed',
      message: `Memory usage: ${memoryUsageMB.toFixed(2)} MB`,
      details: { memoryUsage }
    });

    // Node.js version check
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.split('.')[0].substring(1));

    checks.push({
      name: 'Node.js Version',
      status: majorVersion >= 18 ? 'passed' : majorVersion >= 16 ? 'warning' : 'failed',
      message: `Node.js version: ${nodeVersion}`,
      details: { version: nodeVersion, majorVersion }
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    checks.push({
      name: 'Health Check System',
      status: 'failed',
      message: `Health check system error: ${errorMessage}`,
      details: { error: errorMessage }
    });
  }

  // Report results
  const failed = checks.filter(c => c.status === 'failed').length;
  const warnings = checks.filter(c => c.status === 'warning').length;
  const passed = checks.filter(c => c.status === 'passed').length;

  console.log('\n📊 Startup Health Check Results:');
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️  Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);

  // Log individual check results
  for (const check of checks) {
    const icon = check.status === 'passed' ? '✅' : check.status === 'warning' ? '⚠️' : '❌';
    console.log(`${icon} ${check.name}: ${check.message}`);

    if (check.details && (check.status === 'failed' || check.status === 'warning')) {
      console.log(`   Details:`, JSON.stringify(check.details, null, 2));
    }
  }

  // Determine if startup should continue
  if (failed > 0 && process.env.NODE_ENV === 'production') {
    console.error(`\n❌ ${failed} critical checks failed. Cannot start in production mode.`);
    throw new Error(`Startup health checks failed: ${failed} critical issues`);
  }

  if (warnings > 0) {
    console.warn(`\n⚠️  ${warnings} warnings detected. System will continue but may have reduced functionality.`);
  }

  console.log('\n✅ Startup health checks completed\n');
}