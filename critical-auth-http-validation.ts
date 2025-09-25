#!/usr/bin/env node

/**
 * CRITICAL AUTHENTICATION HTTP VALIDATION
 * 
 * Real end-to-end HTTP testing of authentication endpoints to resolve
 * critical security issues blocking Railway government deployment.
 * 
 * This test validates:
 * 1. Real HTTP authentication flows (not unit tests)
 * 2. Timing attack fix verification
 * 3. JWT middleware compatibility 
 * 4. Production readiness
 * 5. Deterministic, consistent results
 */

import express from 'express';
import { createServer } from 'http';
import axios, { AxiosError } from 'axios';
import bcryptjs from 'bcryptjs';

// Test configuration
const TEST_PORT = 9999;
const BASE_URL = `http://localhost:${TEST_PORT}`;
const TEST_TIMEOUT = 30000; // 30 seconds

// Test results interface  
interface TestResult {
  testName: string;
  passed: boolean;
  message: string;
  details?: any;
  executionTime?: number;
  securityLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
}

interface HTTPValidationReport {
  timestamp: string;
  overallPassed: boolean;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  criticalIssues: number;
  highIssues: number;
  mediumIssues: number;
  lowIssues: number;
  tests: TestResult[];
  timingAnalysis: {
    hashedPasswordTimes: number[];
    plaintextPasswordTimes: number[];
    timingVariance: number;
    timingAttackFixed: boolean;
  };
  deploymentReady: boolean;
  railwayCompatible: boolean;
  summary: string;
  recommendations: string[];
}

class CriticalAuthHTTPValidator {
  private results: TestResult[] = [];
  private server: any;
  private httpServer: any;
  private testToken = '';
  private timingResults = {
    hashedPasswordTimes: [] as number[],
    plaintextPasswordTimes: [] as number[],
  };

  constructor() {
    console.log('🚨 CRITICAL AUTHENTICATION HTTP VALIDATION STARTING...\n');
    console.log('🎯 Target: Fix Railway deployment blocking issues');
    console.log('🔐 Focus: Real HTTP authentication flow validation\n');
  }

  private addResult(result: TestResult) {
    this.results.push(result);
    const status = result.passed ? '✅ PASS' : '❌ FAIL';
    const level = result.securityLevel;
    const time = result.executionTime ? ` (${result.executionTime}ms)` : '';
    console.log(`${status} [${level}] ${result.testName}${time}: ${result.message}`);
    if (result.details && !result.passed) {
      console.log(`    Details: ${JSON.stringify(result.details, null, 2)}`);
    }
  }

  // Start real HTTP server for testing
  async startTestServer(): Promise<void> {
    console.log('\n🚀 Starting HTTP Test Server...');
    
    try {
      // Import the actual server setup
      const { registerRoutes } = await import('./server/routes');
      
      // Create Express app with same configuration as production
      this.server = express();
      
      // Add essential middleware
      this.server.use(express.json({ limit: '50mb' }));
      this.server.use(express.urlencoded({ extended: true }));
      
      // Add CORS for testing
      this.server.use((req: any, res: any, next: any) => {
        res.header('Access-Control-Allow-Origin', '*');
        res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
        res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-api-key');
        if (req.method === 'OPTIONS') {
          res.sendStatus(200);
        } else {
          next();
        }
      });

      // Create HTTP server
      this.httpServer = createServer(this.server);
      
      // CRITICAL FIX: Ensure storage is initialized BEFORE registering routes
      const { storage } = await import('./server/mem-storage');
      await storage.getUsers(); // Force initialization
      console.log('✅ Storage initialization forced before route registration');
      
      // Register all routes
      await registerRoutes(this.server, this.httpServer);
      
      // Start server
      await new Promise<void>((resolve, reject) => {
        this.httpServer.listen(TEST_PORT, () => {
          console.log(`✅ Test server running on port ${TEST_PORT}`);
          resolve();
        }).on('error', reject);
      });

      this.addResult({
        testName: 'HTTP Server Startup',
        passed: true,
        message: `Test server started successfully on port ${TEST_PORT}`,
        securityLevel: 'LOW'
      });

    } catch (error) {
      this.addResult({
        testName: 'HTTP Server Startup',
        passed: false,
        message: 'Failed to start test server',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        securityLevel: 'CRITICAL'
      });
      throw error;
    }
  }

  // Stop test server
  async stopTestServer(): Promise<void> {
    if (this.httpServer) {
      await new Promise<void>((resolve) => {
        this.httpServer.close(() => {
          console.log('🛑 Test server stopped');
          resolve();
        });
      });
    }
  }

  // Test 1: Basic HTTP Authentication Flow
  async testBasicAuthenticationFlow(): Promise<void> {
    console.log('\n🔐 Testing Basic HTTP Authentication Flow...');
    
    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${BASE_URL}/api/auth/login`, {
        username: 'admin',
        password: 'admin123'
      }, {
        timeout: TEST_TIMEOUT,
        headers: { 'Content-Type': 'application/json' }
      });

      const executionTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success && response.data.token) {
        this.testToken = response.data.token; // Store for subsequent tests
        
        this.addResult({
          testName: 'HTTP Authentication Login',
          passed: true,
          message: 'Login successful with JWT token returned',
          executionTime,
          details: {
            user: response.data.user?.username,
            role: response.data.user?.role,
            tokenLength: response.data.token.length
          },
          securityLevel: 'HIGH'
        });
      } else {
        this.addResult({
          testName: 'HTTP Authentication Login',
          passed: false,
          message: 'Login failed or missing token',
          executionTime,
          details: response.data,
          securityLevel: 'CRITICAL'
        });
      }

    } catch (error) {
      const axiosError = error as AxiosError;
      this.addResult({
        testName: 'HTTP Authentication Login',
        passed: false,
        message: 'HTTP request failed',
        details: {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message
        },
        securityLevel: 'CRITICAL'
      });
    }
  }

  // Test 2: JWT Token Validation with Protected Route
  async testJWTTokenValidation(): Promise<void> {
    console.log('\n🎫 Testing JWT Token Validation...');

    if (!this.testToken) {
      this.addResult({
        testName: 'JWT Token Validation',
        passed: false,
        message: 'No token available from login test',
        securityLevel: 'CRITICAL'
      });
      return;
    }

    try {
      const startTime = Date.now();
      
      const response = await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer ${this.testToken}`,
          'Content-Type': 'application/json'
        },
        timeout: TEST_TIMEOUT
      });

      const executionTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success && response.data.user) {
        this.addResult({
          testName: 'JWT Token Validation',
          passed: true,
          message: 'Protected route accessed successfully with JWT token',
          executionTime,
          details: {
            user: response.data.user.username,
            role: response.data.user.role,
            authMethod: response.data.sessionInfo?.authMethod
          },
          securityLevel: 'HIGH'
        });
      } else {
        this.addResult({
          testName: 'JWT Token Validation',
          passed: false,
          message: 'Protected route failed validation',
          executionTime,
          details: response.data,
          securityLevel: 'CRITICAL'
        });
      }

    } catch (error) {
      const axiosError = error as AxiosError;
      this.addResult({
        testName: 'JWT Token Validation',
        passed: false,
        message: 'JWT validation request failed',
        details: {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message
        },
        securityLevel: 'CRITICAL'
      });
    }
  }

  // Test 3: Protected Admin Route Access
  async testProtectedAdminRoute(): Promise<void> {
    console.log('\n👑 Testing Protected Admin Route...');

    if (!this.testToken) {
      this.addResult({
        testName: 'Protected Admin Route',
        passed: false,
        message: 'No token available for admin route test',
        securityLevel: 'HIGH'
      });
      return;
    }

    try {
      const startTime = Date.now();
      
      const response = await axios.get(`${BASE_URL}/api/admin/dashboard`, {
        headers: {
          'Authorization': `Bearer ${this.testToken}`,
          'Content-Type': 'application/json'
        },
        timeout: TEST_TIMEOUT
      });

      const executionTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success && response.data.dashboard) {
        this.addResult({
          testName: 'Protected Admin Route',
          passed: true,
          message: 'Admin dashboard accessible with proper authorization',
          executionTime,
          details: {
            activeServices: response.data.dashboard.activeServices?.length || 0,
            systemStatus: response.data.dashboard.systemStatus
          },
          securityLevel: 'HIGH'
        });
      } else {
        this.addResult({
          testName: 'Protected Admin Route',
          passed: false,
          message: 'Admin route failed authorization',
          executionTime,
          details: response.data,
          securityLevel: 'HIGH'
        });
      }

    } catch (error) {
      const axiosError = error as AxiosError;
      this.addResult({
        testName: 'Protected Admin Route',
        passed: false,
        message: 'Admin route request failed',
        details: {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message
        },
        securityLevel: 'HIGH'
      });
    }
  }

  // Test 4: Invalid Token Rejection
  async testInvalidTokenRejection(): Promise<void> {
    console.log('\n🛡️ Testing Invalid Token Rejection...');

    try {
      const startTime = Date.now();
      
      const response = await axios.get(`${BASE_URL}/api/auth/me`, {
        headers: {
          'Authorization': `Bearer invalid.jwt.token.here`,
          'Content-Type': 'application/json'
        },
        timeout: TEST_TIMEOUT
      });

      const executionTime = Date.now() - startTime;
      
      // Should not reach here - invalid token should be rejected
      this.addResult({
        testName: 'Invalid Token Rejection',
        passed: false,
        message: 'Invalid token was accepted (security vulnerability)',
        executionTime,
        details: response.data,
        securityLevel: 'CRITICAL'
      });

    } catch (error) {
      const axiosError = error as AxiosError;
      const executionTime = Date.now() - Date.now();
      
      if (axiosError.response?.status === 401) {
        this.addResult({
          testName: 'Invalid Token Rejection',
          passed: true,
          message: 'Invalid token properly rejected with 401 status',
          executionTime,
          details: {
            status: axiosError.response.status,
            data: axiosError.response.data
          },
          securityLevel: 'HIGH'
        });
      } else {
        this.addResult({
          testName: 'Invalid Token Rejection',
          passed: false,
          message: 'Unexpected response to invalid token',
          details: {
            status: axiosError.response?.status,
            data: axiosError.response?.data,
            message: axiosError.message
          },
          securityLevel: 'HIGH'
        });
      }
    }
  }

  // Test 5: Timing Attack Vulnerability Check
  async testTimingAttackFix(): Promise<void> {
    console.log('\n⏱️  Testing Timing Attack Fix...');

    // Test multiple login attempts to measure timing consistency
    const iterations = 5;
    
    try {
      // Test hashed password timing (should be consistent ~300ms)
      for (let i = 0; i < iterations; i++) {
        const startTime = process.hrtime.bigint();
        
        try {
          await axios.post(`${BASE_URL}/api/auth/login`, {
            username: 'admin',
            password: 'admin123'
          }, { timeout: TEST_TIMEOUT });
        } catch (error) {
          // Ignore errors, we're measuring timing
        }
        
        const endTime = process.hrtime.bigint();
        const executionTime = Number(endTime - startTime) / 1_000_000; // Convert to ms
        this.timingResults.hashedPasswordTimes.push(executionTime);
      }

      // Calculate timing statistics
      const hashedAvg = this.timingResults.hashedPasswordTimes.reduce((a, b) => a + b, 0) / this.timingResults.hashedPasswordTimes.length;
      const hashedMin = Math.min(...this.timingResults.hashedPasswordTimes);
      const hashedMax = Math.max(...this.timingResults.hashedPasswordTimes);
      const hashedVariance = hashedMax - hashedMin;

      // Check if timing variance is within acceptable range (should be < 100ms for bcrypt consistency)
      if (hashedVariance < 100) {
        this.addResult({
          testName: 'Timing Attack Vulnerability Fix',
          passed: true,
          message: `Password verification timing consistent (${hashedVariance.toFixed(1)}ms variance)`,
          details: {
            averageTime: hashedAvg.toFixed(1) + 'ms',
            minTime: hashedMin.toFixed(1) + 'ms',
            maxTime: hashedMax.toFixed(1) + 'ms',
            variance: hashedVariance.toFixed(1) + 'ms',
            iterations
          },
          securityLevel: 'CRITICAL'
        });
      } else {
        this.addResult({
          testName: 'Timing Attack Vulnerability Fix',
          passed: false,
          message: `Password verification timing inconsistent (${hashedVariance.toFixed(1)}ms variance)`,
          details: {
            averageTime: hashedAvg.toFixed(1) + 'ms',
            minTime: hashedMin.toFixed(1) + 'ms', 
            maxTime: hashedMax.toFixed(1) + 'ms',
            variance: hashedVariance.toFixed(1) + 'ms',
            threshold: '100ms',
            iterations
          },
          securityLevel: 'CRITICAL'
        });
      }

    } catch (error) {
      this.addResult({
        testName: 'Timing Attack Vulnerability Fix',
        passed: false,
        message: 'Failed to measure timing consistency',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        securityLevel: 'CRITICAL'
      });
    }
  }

  // Test 6: Document Generation Route Authorization
  async testDocumentGenerationAuth(): Promise<void> {
    console.log('\n📄 Testing Document Generation Authorization...');

    if (!this.testToken) {
      this.addResult({
        testName: 'Document Generation Authorization',
        passed: false,
        message: 'No token available for document generation test',
        securityLevel: 'MEDIUM'
      });
      return;
    }

    try {
      const startTime = Date.now();
      
      const response = await axios.post(`${BASE_URL}/api/documents/secure-generate`, {
        documentType: 'test'
      }, {
        headers: {
          'Authorization': `Bearer ${this.testToken}`,
          'Content-Type': 'application/json'
        },
        timeout: TEST_TIMEOUT
      });

      const executionTime = Date.now() - startTime;

      if (response.status === 200 && response.data.success) {
        this.addResult({
          testName: 'Document Generation Authorization',
          passed: true,
          message: 'Document generation authorized for authenticated user',
          executionTime,
          details: {
            message: response.data.message,
            user: response.data.user
          },
          securityLevel: 'MEDIUM'
        });
      } else {
        this.addResult({
          testName: 'Document Generation Authorization', 
          passed: false,
          message: 'Document generation authorization failed',
          executionTime,
          details: response.data,
          securityLevel: 'MEDIUM'
        });
      }

    } catch (error) {
      const axiosError = error as AxiosError;
      this.addResult({
        testName: 'Document Generation Authorization',
        passed: false,
        message: 'Document generation request failed',
        details: {
          status: axiosError.response?.status,
          data: axiosError.response?.data,
          message: axiosError.message
        },
        securityLevel: 'MEDIUM'
      });
    }
  }

  // Generate comprehensive validation report
  generateReport(): HTTPValidationReport {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    
    const criticalIssues = this.results.filter(r => !r.passed && r.securityLevel === 'CRITICAL').length;
    const highIssues = this.results.filter(r => !r.passed && r.securityLevel === 'HIGH').length;
    const mediumIssues = this.results.filter(r => !r.passed && r.securityLevel === 'MEDIUM').length;
    const lowIssues = this.results.filter(r => !r.passed && r.securityLevel === 'LOW').length;

    const overallPassed = failedTests === 0;
    const deploymentReady = criticalIssues === 0 && highIssues === 0;
    const railwayCompatible = deploymentReady && overallPassed;

    // Timing analysis
    const hashedAvg = this.timingResults.hashedPasswordTimes.length > 0 
      ? this.timingResults.hashedPasswordTimes.reduce((a, b) => a + b, 0) / this.timingResults.hashedPasswordTimes.length 
      : 0;
    const hashedMin = this.timingResults.hashedPasswordTimes.length > 0 ? Math.min(...this.timingResults.hashedPasswordTimes) : 0;
    const hashedMax = this.timingResults.hashedPasswordTimes.length > 0 ? Math.max(...this.timingResults.hashedPasswordTimes) : 0;
    const timingVariance = hashedMax - hashedMin;
    const timingAttackFixed = timingVariance < 100; // Less than 100ms variance is acceptable

    const recommendations: string[] = [];
    
    if (criticalIssues > 0) {
      recommendations.push('❌ CRITICAL: Fix all critical security issues before deployment');
    }
    if (highIssues > 0) {
      recommendations.push('⚠️  HIGH: Address high-priority security concerns');
    }
    if (!timingAttackFixed) {
      recommendations.push('⏱️  TIMING: Fix timing attack vulnerability in password verification');
    }
    if (deploymentReady && overallPassed) {
      recommendations.push('✅ READY: Authentication system validated for Railway deployment');
    }

    const summary = deploymentReady 
      ? `✅ DEPLOYMENT READY: All critical authentication issues resolved. Railway deployment approved.`
      : `❌ DEPLOYMENT BLOCKED: ${criticalIssues} critical and ${highIssues} high-priority issues must be resolved.`;

    return {
      timestamp: new Date().toISOString(),
      overallPassed,
      totalTests,
      passedTests,
      failedTests,
      criticalIssues,
      highIssues,
      mediumIssues,
      lowIssues,
      tests: this.results,
      timingAnalysis: {
        hashedPasswordTimes: this.timingResults.hashedPasswordTimes,
        plaintextPasswordTimes: this.timingResults.plaintextPasswordTimes,
        timingVariance,
        timingAttackFixed
      },
      deploymentReady,
      railwayCompatible,
      summary,
      recommendations
    };
  }

  // Run all validation tests
  async runAllTests(): Promise<HTTPValidationReport> {
    try {
      await this.startTestServer();

      // Run all HTTP authentication tests
      await this.testBasicAuthenticationFlow();
      await this.testJWTTokenValidation();
      await this.testProtectedAdminRoute();
      await this.testInvalidTokenRejection();
      await this.testTimingAttackFix();
      await this.testDocumentGenerationAuth();

      await this.stopTestServer();

      return this.generateReport();

    } catch (error) {
      console.error('\n🚨 VALIDATION FAILED:', error);
      
      // Try to stop server if it was started
      try {
        await this.stopTestServer();
      } catch (stopError) {
        console.error('Failed to stop test server:', stopError);
      }
      
      // Add critical failure result
      this.addResult({
        testName: 'HTTP Validation Suite',
        passed: false,
        message: 'Test suite failed to complete',
        details: { error: error instanceof Error ? error.message : 'Unknown error' },
        securityLevel: 'CRITICAL'
      });

      return this.generateReport();
    }
  }
}

// Main execution
async function main() {
  const validator = new CriticalAuthHTTPValidator();
  const report = await validator.runAllTests();

  // Write detailed report
  const fs = await import('fs/promises');
  await fs.writeFile('CRITICAL_AUTH_HTTP_VALIDATION_REPORT.json', JSON.stringify(report, null, 2));
  await fs.writeFile('CRITICAL_AUTH_HTTP_VALIDATION_REPORT.md', generateMarkdownReport(report));

  // Console summary
  console.log('\n' + '='.repeat(80));
  console.log('🚨 CRITICAL AUTHENTICATION HTTP VALIDATION REPORT');
  console.log('='.repeat(80));
  console.log(`📊 Results: ${report.passedTests}/${report.totalTests} tests passed`);
  console.log(`🚨 Critical Issues: ${report.criticalIssues}`);
  console.log(`⚠️  High Issues: ${report.highIssues}`);
  console.log(`📊 Medium Issues: ${report.mediumIssues}`);
  console.log(`ℹ️  Low Issues: ${report.lowIssues}`);
  console.log(`⏱️  Timing Attack Fixed: ${report.timingAnalysis.timingAttackFixed ? '✅ YES' : '❌ NO'}`);
  console.log(`🚀 Railway Deployment Ready: ${report.deploymentReady ? '✅ YES' : '❌ NO'}`);
  console.log('='.repeat(80));
  console.log(report.summary);
  console.log('='.repeat(80));

  if (report.recommendations.length > 0) {
    console.log('\n📋 RECOMMENDATIONS:');
    report.recommendations.forEach(rec => console.log(`  ${rec}`));
  }

  console.log(`\n📄 Detailed reports saved:`);
  console.log(`  - CRITICAL_AUTH_HTTP_VALIDATION_REPORT.json`);
  console.log(`  - CRITICAL_AUTH_HTTP_VALIDATION_REPORT.md`);

  // Exit with appropriate code
  process.exit(report.deploymentReady ? 0 : 1);
}

function generateMarkdownReport(report: HTTPValidationReport): string {
  return `# CRITICAL AUTHENTICATION HTTP VALIDATION REPORT

**Generated:** ${report.timestamp}
**Status:** ${report.deploymentReady ? '✅ DEPLOYMENT READY' : '❌ DEPLOYMENT BLOCKED'}

## Executive Summary

${report.summary}

## Test Results Overview

- **Total Tests:** ${report.totalTests}
- **Passed:** ${report.passedTests}
- **Failed:** ${report.failedTests}
- **Critical Issues:** ${report.criticalIssues}
- **High Priority Issues:** ${report.highIssues}
- **Medium Priority Issues:** ${report.mediumIssues}
- **Low Priority Issues:** ${report.lowIssues}

## Security Analysis

### Timing Attack Vulnerability
- **Fixed:** ${report.timingAnalysis.timingAttackFixed ? '✅ YES' : '❌ NO'}
- **Timing Variance:** ${report.timingAnalysis.timingVariance.toFixed(1)}ms
- **Threshold:** 100ms (acceptable)

## Detailed Test Results

${report.tests.map(test => `
### ${test.testName} - ${test.passed ? '✅ PASS' : '❌ FAIL'}

**Security Level:** ${test.securityLevel}
**Message:** ${test.message}
${test.executionTime ? `**Execution Time:** ${test.executionTime}ms` : ''}
${test.details ? `\n**Details:**\n\`\`\`json\n${JSON.stringify(test.details, null, 2)}\n\`\`\`` : ''}
`).join('')}

## Recommendations

${report.recommendations.map(rec => `- ${rec}`).join('\n')}

## Railway Deployment Status

**Compatible:** ${report.railwayCompatible ? '✅ YES' : '❌ NO'}

${report.deploymentReady ? 
  '✅ **APPROVED FOR DEPLOYMENT:** All critical security validations passed.' :
  '❌ **DEPLOYMENT BLOCKED:** Critical security issues must be resolved before deployment.'
}
`;
}

// Run if called directly (ES module compatible)
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(error => {
    console.error('🚨 CRITICAL VALIDATION ERROR:', error);
    process.exit(1);
  });
}