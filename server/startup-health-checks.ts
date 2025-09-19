/**
 * CRITICAL PRODUCTION STARTUP HEALTH CHECKS
 * 
 * This service performs comprehensive validation of all critical systems
 * before allowing the DHA Digital Services system to start in production.
 * 
 * GOVERNMENT REQUIREMENT: Fail-closed behavior on any validation failure.
 */

import * as fs from 'fs';
import * as crypto from 'crypto';
import { storage } from './storage';

export interface HealthCheckResult {
  component: string;
  status: 'PASS' | 'FAIL' | 'WARN';
  message: string;
  details?: any;
  critical: boolean;
}

export interface StartupHealthReport {
  timestamp: Date;
  environment: string;
  overallStatus: 'HEALTHY' | 'DEGRADED' | 'FAILED';
  criticalFailures: number;
  checks: HealthCheckResult[];
  recommendations: string[];
}

export class StartupHealthValidator {
  private readonly requiredJwtSecretLength = 64;
  private readonly requiredCertificates = [
    'DHA_NPR_CLIENT_CERT',
    'DHA_NPR_PRIVATE_KEY', 
    'SAPS_CLIENT_CERT',
    'SAPS_PRIVATE_KEY',
    'DHA_ABIS_CLIENT_CERT',
    'DHA_ABIS_PRIVATE_KEY',
    'ICAO_PKD_CLIENT_CERT',
    'ICAO_PKD_PRIVATE_KEY',
    'SITA_CLIENT_CERT',
    'SITA_PRIVATE_KEY'
  ];

  /**
   * CRITICAL: Comprehensive startup validation
   * MUST pass all checks before production startup
   */
  async validateSystemReadiness(): Promise<StartupHealthReport> {
    console.log('🔍 [STARTUP HEALTH] INITIATING CRITICAL SYSTEM VALIDATION...');
    
    const report: StartupHealthReport = {
      timestamp: new Date(),
      environment: process.env.NODE_ENV || 'unknown',
      overallStatus: 'HEALTHY',
      criticalFailures: 0,
      checks: [],
      recommendations: []
    };

    // 1. JWT Secret Validation (CRITICAL)
    await this.validateJwtSecret(report);

    // 2. Database Connectivity (CRITICAL)
    await this.validateDatabaseConnectivity(report);

    // 3. mTLS Certificate Validation (CRITICAL)
    await this.validateMtlsCertificates(report);

    // 4. Government Adapter Security (CRITICAL)
    await this.validateGovernmentAdapterSecurity(report);

    // 5. PKI Configuration (CRITICAL)
    await this.validatePkiConfiguration(report);

    // 6. Environment Variable Completeness (CRITICAL)
    await this.validateEnvironmentVariables(report);

    // 7. Cryptographic Services (CRITICAL)
    await this.validateCryptographicServices(report);

    // Determine overall status
    const criticalFailures = report.checks.filter(c => c.critical && c.status === 'FAIL').length;
    report.criticalFailures = criticalFailures;

    if (criticalFailures > 0) {
      report.overallStatus = 'FAILED';
    } else if (report.checks.some(c => c.status === 'WARN')) {
      report.overallStatus = 'DEGRADED';
    }

    // FAIL-CLOSED BEHAVIOR: Block production startup on any critical failure
    if (report.environment === 'production' && criticalFailures > 0) {
      const criticalIssues = report.checks
        .filter(c => c.critical && c.status === 'FAIL')
        .map(c => `${c.component}: ${c.message}`)
        .join('\n  - ');
      
      throw new Error(`🚨 CRITICAL STARTUP FAILURE: Production deployment blocked due to ${criticalFailures} critical issue(s):\n  - ${criticalIssues}`);
    }

    console.log(`🔍 [STARTUP HEALTH] VALIDATION COMPLETE: ${report.overallStatus} (${criticalFailures} critical failures)`);
    return report;
  }

  /**
   * CRITICAL CHECK: JWT Secret Security Validation
   */
  private async validateJwtSecret(report: StartupHealthReport): Promise<void> {
    const jwtSecret = process.env.JWT_SECRET;
    
    if (!jwtSecret) {
      report.checks.push({
        component: 'JWT Security',
        status: 'FAIL',
        message: 'JWT_SECRET environment variable not set',
        critical: true
      });
      return;
    }

    if (jwtSecret.length < this.requiredJwtSecretLength) {
      report.checks.push({
        component: 'JWT Security',
        status: 'FAIL',
        message: `JWT secret too short: ${jwtSecret.length} chars (required: ${this.requiredJwtSecretLength}+)`,
        details: { actualLength: jwtSecret.length, requiredLength: this.requiredJwtSecretLength },
        critical: true
      });
      return;
    }

    // Additional entropy validation
    const entropy = this.calculateEntropy(jwtSecret);
    if (entropy < 4.5) {
      report.checks.push({
        component: 'JWT Security',
        status: 'WARN',
        message: `JWT secret has low entropy: ${entropy.toFixed(2)} (recommended: 4.5+)`,
        details: { entropy },
        critical: false
      });
    } else {
      report.checks.push({
        component: 'JWT Security',
        status: 'PASS',
        message: `JWT secret meets security requirements (${jwtSecret.length} chars, entropy: ${entropy.toFixed(2)})`,
        critical: true
      });
    }
  }

  /**
   * CRITICAL CHECK: Database Connectivity Validation
   */
  private async validateDatabaseConnectivity(report: StartupHealthReport): Promise<void> {
    try {
      // Test database connection by attempting to get users
      const testQuery = await storage.getAllUsers();
      
      report.checks.push({
        component: 'Database Connectivity',
        status: 'PASS',
        message: 'Database connection successful',
        details: testQuery,
        critical: true
      });
    } catch (error) {
      report.checks.push({
        component: 'Database Connectivity',
        status: 'FAIL',
        message: `Database connection failed: ${error}`,
        critical: true
      });
    }
  }

  /**
   * CRITICAL CHECK: mTLS Certificate Validation
   */
  private async validateMtlsCertificates(report: StartupHealthReport): Promise<void> {
    const environment = process.env.NODE_ENV;
    
    if (environment !== 'production') {
      report.checks.push({
        component: 'mTLS Certificates',
        status: 'PASS',
        message: 'mTLS certificate validation skipped for non-production environment',
        critical: false
      });
      return;
    }

    const missingCerts: string[] = [];
    const invalidCerts: string[] = [];
    
    for (const certVar of this.requiredCertificates) {
      const certValue = process.env[certVar];
      
      if (!certValue) {
        missingCerts.push(certVar);
        continue;
      }

      // Validate certificate format
      if (certVar.includes('CERT')) {
        if (!certValue.includes('-----BEGIN CERTIFICATE-----')) {
          invalidCerts.push(`${certVar}: Invalid certificate format`);
        }
      } else if (certVar.includes('KEY')) {
        if (!certValue.includes('-----BEGIN') || !certValue.includes('PRIVATE KEY-----')) {
          invalidCerts.push(`${certVar}: Invalid private key format`);
        }
      }
    }

    if (missingCerts.length > 0 || invalidCerts.length > 0) {
      const issues = [...missingCerts.map(c => `Missing: ${c}`), ...invalidCerts];
      report.checks.push({
        component: 'mTLS Certificates',
        status: 'FAIL',
        message: `mTLS certificate validation failed: ${issues.join(', ')}`,
        details: { missingCerts, invalidCerts },
        critical: true
      });
    } else {
      report.checks.push({
        component: 'mTLS Certificates',
        status: 'PASS',
        message: `All ${this.requiredCertificates.length} mTLS certificates validated`,
        critical: true
      });
    }
  }

  /**
   * CRITICAL CHECK: Government Adapter Security Validation
   */
  private async validateGovernmentAdapterSecurity(report: StartupHealthReport): Promise<void> {
    const adapters = [
      { name: 'NPR', baseUrlVar: 'DHA_NPR_BASE_URL', apiKeyVar: 'DHA_NPR_API_KEY' },
      { name: 'SAPS', baseUrlVar: 'SAPS_CRC_BASE_URL', apiKeyVar: 'SAPS_CRC_API_KEY' },
      { name: 'ABIS', baseUrlVar: 'DHA_ABIS_BASE_URL', apiKeyVar: 'DHA_ABIS_API_KEY' },
      { name: 'PKD', baseUrlVar: 'ICAO_PKD_BASE_URL', apiKeyVar: 'ICAO_PKD_API_KEY' },
      { name: 'SITA', baseUrlVar: 'SITA_BASE_URL', apiKeyVar: 'SITA_API_KEY' }
    ];

    let secureAdapters = 0;
    const issues: string[] = [];

    for (const adapter of adapters) {
      const baseUrl = process.env[adapter.baseUrlVar];
      const apiKey = process.env[adapter.apiKeyVar];

      if (!baseUrl || !apiKey) {
        issues.push(`${adapter.name}: Missing configuration`);
        continue;
      }

      // Verify HTTPS usage
      if (!baseUrl.startsWith('https://')) {
        issues.push(`${adapter.name}: Insecure HTTP endpoint detected`);
        continue;
      }

      // Verify government domain
      const isGovernmentDomain = baseUrl.includes('.gov.za') || baseUrl.includes('.dha.') || baseUrl.includes('.saps.');
      if (!isGovernmentDomain && process.env.NODE_ENV === 'production') {
        issues.push(`${adapter.name}: Non-government domain in production`);
      }

      secureAdapters++;
    }

    if (issues.length > 0) {
      report.checks.push({
        component: 'Government Adapter Security',
        status: 'FAIL',
        message: `Security validation failed for government adapters: ${issues.join(', ')}`,
        details: { secureAdapters, totalAdapters: adapters.length, issues },
        critical: true
      });
    } else {
      report.checks.push({
        component: 'Government Adapter Security',
        status: 'PASS',
        message: `All ${adapters.length} government adapters security validated`,
        details: { secureAdapters },
        critical: true
      });
    }
  }

  /**
   * CRITICAL CHECK: PKI Configuration Validation
   */
  private async validatePkiConfiguration(report: StartupHealthReport): Promise<void> {
    const pkiVars = [
      'DHA_PKI_CERT_PATH',
      'DHA_PKI_PRIVATE_KEY_PATH',
      'DHA_CA_CERT_PATH',
      'DHA_TIMESTAMP_SERVICE_URL',
      'DHA_OCSP_RESPONDER_URL',
      'DHA_CRL_DISTRIBUTION_POINT'
    ];

    const missingVars = pkiVars.filter(v => !process.env[v]);
    
    if (missingVars.length > 0) {
      report.checks.push({
        component: 'PKI Configuration',
        status: 'FAIL',
        message: `PKI configuration incomplete: missing ${missingVars.join(', ')}`,
        details: { missingVars },
        critical: true
      });
    } else {
      report.checks.push({
        component: 'PKI Configuration',
        status: 'PASS',
        message: 'PKI configuration complete',
        critical: true
      });
    }
  }

  /**
   * CRITICAL CHECK: Environment Variable Completeness
   */
  private async validateEnvironmentVariables(report: StartupHealthReport): Promise<void> {
    const criticalVars = [
      'NODE_ENV',
      'DATABASE_URL',
      'JWT_SECRET',
      'ENCRYPTION_KEY'
    ];

    const missingCritical = criticalVars.filter(v => !process.env[v]);
    
    if (missingCritical.length > 0) {
      report.checks.push({
        component: 'Environment Variables',
        status: 'FAIL',
        message: `Critical environment variables missing: ${missingCritical.join(', ')}`,
        details: { missingCritical },
        critical: true
      });
    } else {
      report.checks.push({
        component: 'Environment Variables',
        status: 'PASS',
        message: 'All critical environment variables configured',
        critical: true
      });
    }
  }

  /**
   * CRITICAL CHECK: Cryptographic Services Validation
   */
  private async validateCryptographicServices(report: StartupHealthReport): Promise<void> {
    try {
      // Test cryptographic operations
      const testData = 'DHA Security Test';
      const hash = crypto.createHash('sha256').update(testData).digest('hex');
      
      // Test encryption capabilities
      const algorithm = 'aes-256-gcm';
      const key = crypto.randomBytes(32);
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(algorithm, key);
      
      report.checks.push({
        component: 'Cryptographic Services',
        status: 'PASS',
        message: 'Cryptographic services operational',
        details: { hashTest: hash.substring(0, 16) + '...', algorithms: ['sha256', 'aes-256-gcm'] },
        critical: true
      });
    } catch (error) {
      report.checks.push({
        component: 'Cryptographic Services',
        status: 'FAIL',
        message: `Cryptographic services validation failed: ${error}`,
        critical: true
      });
    }
  }

  /**
   * Calculate entropy of a string (for password/secret validation)
   */
  private calculateEntropy(str: string): number {
    const len = str.length;
    const counts: { [key: string]: number } = {};
    
    for (let i = 0; i < len; i++) {
      counts[str[i]] = (counts[str[i]] || 0) + 1;
    }
    
    let entropy = 0;
    const uniqueChars = Object.keys(counts).length;
    
    for (const char in counts) {
      const probability = counts[char] / len;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy;
  }

  /**
   * Generate comprehensive health report
   */
  generateHealthReport(report: StartupHealthReport): string {
    const statusIcon = {
      'HEALTHY': '✅',
      'DEGRADED': '⚠️', 
      'FAILED': '❌'
    }[report.overallStatus];

    const lines = [
      '',
      '═══════════════════════════════════════════════════════════════',
      '              DHA DIGITAL SERVICES STARTUP HEALTH REPORT',
      '═══════════════════════════════════════════════════════════════',
      '',
      `🕐 Timestamp: ${report.timestamp.toISOString()}`,
      `🌍 Environment: ${report.environment.toUpperCase()}`,
      `${statusIcon} Overall Status: ${report.overallStatus}`,
      `🚨 Critical Failures: ${report.criticalFailures}`,
      `📊 Total Checks: ${report.checks.length}`,
      '',
      '──────────────────── VALIDATION RESULTS ────────────────────────',
      ''
    ];

    // Add individual check results
    for (const check of report.checks) {
      const icon = check.status === 'PASS' ? '✅' : check.status === 'WARN' ? '⚠️' : '❌';
      const critical = check.critical ? '[CRITICAL]' : '[INFO]';
      lines.push(`${icon} ${critical} ${check.component}: ${check.message}`);
    }

    if (report.recommendations.length > 0) {
      lines.push('', '──────────────────── RECOMMENDATIONS ───────────────────────', '');
      report.recommendations.forEach(rec => lines.push(`💡 ${rec}`));
    }

    lines.push('', '═══════════════════════════════════════════════════════════════');

    return lines.join('\n');
  }
}

/**
 * PRODUCTION ENTRY POINT: Validate system before startup
 */
export async function validateProductionReadiness(): Promise<boolean> {
  try {
    const validator = new StartupHealthValidator();
    const report = await validator.validateSystemReadiness();
    
    // Generate and log comprehensive report
    const healthReport = validator.generateHealthReport(report);
    console.log(healthReport);
    
    // Save health report to file for audit trail
    const reportFile = `startup-health-${Date.now()}.log`;
    fs.writeFileSync(reportFile, healthReport);
    console.log(`📋 Health report saved: ${reportFile}`);
    
    return report.overallStatus !== 'FAILED';
    
  } catch (error) {
    console.error('💥 STARTUP HEALTH VALIDATION FAILED:', error);
    return false;
  }
}

// Export for integration with main application
export const startupHealthValidator = new StartupHealthValidator();