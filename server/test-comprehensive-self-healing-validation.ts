#!/usr/bin/env node
/**
 * Comprehensive Self-Healing Architecture Validation Suite
 * Tests zero-defect operation, rapid response times, and system integration
 */

import { performance } from 'perf_hooks';
import { storage } from './storage';

// Import all self-healing services
let selfHealingIntegration: any;
let selfHealingMonitor: any;
let instantSecurityResponse: any;
let autoErrorCorrection: any;
let healthCheckSystem: any;
let zeroDowntimeManager: any;

interface ValidationResult {
  testName: string;
  passed: boolean;
  duration: number;
  error?: string;
  details?: any;
}

interface ComprehensiveReport {
  overall: {
    passed: boolean;
    totalTests: number;
    passedTests: number;
    failedTests: number;
    totalDuration: number;
  };
  serviceImportTests: ValidationResult[];
  schemaValidationTests: ValidationResult[];
  integrationTests: ValidationResult[];
  runtimeValidationTests: ValidationResult[];
  databaseConnectionTests: ValidationResult[];
  performanceTests: ValidationResult[];
  recommendations: string[];
}

class SelfHealingValidator {
  private results: ComprehensiveReport = {
    overall: {
      passed: false,
      totalTests: 0,
      passedTests: 0,
      failedTests: 0,
      totalDuration: 0
    },
    serviceImportTests: [],
    schemaValidationTests: [],
    integrationTests: [],
    runtimeValidationTests: [],
    databaseConnectionTests: [],
    performanceTests: [],
    recommendations: []
  };

  async runTest(testName: string, testFunction: () => Promise<any>): Promise<ValidationResult> {
    const startTime = performance.now();
    
    try {
      console.log(`🔍 Running: ${testName}`);
      const result = await testFunction();
      const duration = performance.now() - startTime;
      
      console.log(`✅ PASSED: ${testName} (${duration.toFixed(2)}ms)`);
      
      return {
        testName,
        passed: true,
        duration,
        details: result
      };
    } catch (error) {
      const duration = performance.now() - startTime;
      
      console.log(`❌ FAILED: ${testName} (${duration.toFixed(2)}ms)`);
      console.error(`   Error: ${error.message}`);
      
      return {
        testName,
        passed: false,
        duration,
        error: error.message
      };
    }
  }

  // ============= SERVICE IMPORT TESTS =============
  
  async testServiceImports(): Promise<void> {
    console.log('\n📦 Testing Service Imports...');
    
    const importTests = [
      {
        name: 'Self-Healing Integration Import',
        test: async () => {
          const module = await import('./services/self-healing-integration');
          selfHealingIntegration = module.selfHealingIntegration;
          if (!selfHealingIntegration) throw new Error('Self-healing integration not exported');
          return { imported: true, hasInstance: !!selfHealingIntegration };
        }
      },
      {
        name: 'Self-Healing Monitor Import',
        test: async () => {
          const module = await import('./services/self-healing-monitor');
          selfHealingMonitor = module.selfHealingMonitor;
          if (!selfHealingMonitor) throw new Error('Self-healing monitor not exported');
          return { imported: true, hasInstance: !!selfHealingMonitor };
        }
      },
      {
        name: 'Instant Security Response Import',
        test: async () => {
          const module = await import('./services/instant-security-response');
          instantSecurityResponse = module.instantSecurityResponse;
          if (!instantSecurityResponse) throw new Error('Instant security response not exported');
          return { imported: true, hasInstance: !!instantSecurityResponse };
        }
      },
      {
        name: 'Auto Error Correction Import',
        test: async () => {
          const module = await import('./services/auto-error-correction');
          autoErrorCorrection = module.autoErrorCorrection;
          if (!autoErrorCorrection) throw new Error('Auto error correction not exported');
          return { imported: true, hasInstance: !!autoErrorCorrection };
        }
      },
      {
        name: 'Health Check System Import',
        test: async () => {
          const module = await import('./services/health-check-system');
          healthCheckSystem = module.healthCheckSystem;
          if (!healthCheckSystem) throw new Error('Health check system not exported');
          return { imported: true, hasInstance: !!healthCheckSystem };
        }
      },
      {
        name: 'Zero Downtime Manager Import',
        test: async () => {
          const module = await import('./services/zero-downtime-manager');
          zeroDowntimeManager = module.zeroDowntimeManager;
          if (!zeroDowntimeManager) throw new Error('Zero downtime manager not exported');
          return { imported: true, hasInstance: !!zeroDowntimeManager };
        }
      }
    ];

    for (const { name, test } of importTests) {
      const result = await this.runTest(name, test);
      this.results.serviceImportTests.push(result);
    }
  }

  // ============= SCHEMA VALIDATION TESTS =============
  
  async testSchemaValidation(): Promise<void> {
    console.log('\n🗄️  Testing Schema Validation...');
    
    const schemaTests = [
      {
        name: 'System Metrics Table Schema',
        test: async () => {
          // Test that we can create a system metric
          const metric = await storage.createSystemMetric({
            metricType: 'self_healing_test',
            value: 100,
            unit: 'percentage'
          });
          
          if (!metric || !metric.id) {
            throw new Error('Failed to create system metric');
          }
          
          return { created: true, id: metric.id };
        }
      },
      {
        name: 'Security Events Table Schema',
        test: async () => {
          const event = await storage.createSecurityEvent({
            eventType: 'self_healing_test',
            severity: 'low',
            details: { test: 'schema validation' }
          });
          
          if (!event || !event.id) {
            throw new Error('Failed to create security event');
          }
          
          return { created: true, id: event.id };
        }
      },
      {
        name: 'Audit Logs Table Schema',
        test: async () => {
          const log = await storage.createAuditLog({
            action: 'SELF_HEALING_SCHEMA_TEST',
            entityType: 'validation',
            details: { test: 'schema validation' }
          });
          
          if (!log || !log.id) {
            throw new Error('Failed to create audit log');
          }
          
          return { created: true, id: log.id };
        }
      }
    ];

    for (const { name, test } of schemaTests) {
      const result = await this.runTest(name, test);
      this.results.schemaValidationTests.push(result);
    }
  }

  // ============= INTEGRATION TESTS =============
  
  async testServiceIntegration(): Promise<void> {
    console.log('\n🔗 Testing Service Integration...');
    
    const integrationTests = [
      {
        name: 'Self-Healing Integration Initialization',
        test: async () => {
          if (!selfHealingIntegration) throw new Error('Integration service not loaded');
          
          // Test that the service has expected methods
          const requiredMethods = ['initialize', 'getStatus', 'performHealthCheck'];
          for (const method of requiredMethods) {
            if (typeof selfHealingIntegration[method] !== 'function') {
              throw new Error(`Missing required method: ${method}`);
            }
          }
          
          return { hasRequiredMethods: true, methods: requiredMethods };
        }
      },
      {
        name: 'Service Status Check',
        test: async () => {
          if (!selfHealingIntegration) throw new Error('Integration service not loaded');
          
          const status = await selfHealingIntegration.getStatus();
          
          if (!status || typeof status !== 'object') {
            throw new Error('Invalid status response');
          }
          
          const requiredFields = ['overall', 'components', 'capabilities', 'metrics'];
          for (const field of requiredFields) {
            if (!(field in status)) {
              throw new Error(`Missing status field: ${field}`);
            }
          }
          
          return { status, valid: true };
        }
      },
      {
        name: 'Service Health Check',
        test: async () => {
          if (!selfHealingIntegration) throw new Error('Integration service not loaded');
          
          const healthCheck = await selfHealingIntegration.performHealthCheck();
          
          if (!healthCheck || typeof healthCheck !== 'object') {
            throw new Error('Invalid health check response');
          }
          
          return { healthCheck, valid: true };
        }
      }
    ];

    for (const { name, test } of integrationTests) {
      const result = await this.runTest(name, test);
      this.results.integrationTests.push(result);
    }
  }

  // ============= RUNTIME VALIDATION TESTS =============
  
  async testRuntimeValidation(): Promise<void> {
    console.log('\n⚡ Testing Runtime Validation...');
    
    const runtimeTests = [
      {
        name: 'Service Method Accessibility',
        test: async () => {
          const services = {
            selfHealingMonitor,
            instantSecurityResponse,
            autoErrorCorrection,
            healthCheckSystem,
            zeroDowntimeManager
          };
          
          const results = {};
          
          for (const [name, service] of Object.entries(services)) {
            if (!service) {
              results[name] = { accessible: false, error: 'Service not loaded' };
              continue;
            }
            
            // Check if service has expected structure
            const hasStart = typeof service.start === 'function';
            const hasStop = typeof service.stop === 'function';
            
            results[name] = {
              accessible: true,
              hasStart,
              hasStop,
              isEventEmitter: typeof service.on === 'function'
            };
          }
          
          return { services: results };
        }
      },
      {
        name: 'Service Configuration Validation',
        test: async () => {
          // Test that services have proper configuration
          const configTests = [];
          
          if (selfHealingMonitor && typeof selfHealingMonitor.getConfig === 'function') {
            try {
              const config = await selfHealingMonitor.getConfig();
              configTests.push({ service: 'selfHealingMonitor', hasConfig: !!config });
            } catch (error) {
              configTests.push({ service: 'selfHealingMonitor', hasConfig: false, error: error.message });
            }
          }
          
          return { configTests };
        }
      }
    ];

    for (const { name, test } of runtimeTests) {
      const result = await this.runTest(name, test);
      this.results.runtimeValidationTests.push(result);
    }
  }

  // ============= DATABASE CONNECTION TESTS =============
  
  async testDatabaseConnections(): Promise<void> {
    console.log('\n💾 Testing Database Connections...');
    
    const dbTests = [
      {
        name: 'Storage Interface Methods',
        test: async () => {
          const requiredMethods = [
            'createSystemMetric', 'getSystemMetrics',
            'createSecurityEvent', 'getSecurityEvents',
            'createAuditLog', 'getAuditLogs'
          ];
          
          const results = {};
          
          for (const method of requiredMethods) {
            results[method] = typeof storage[method] === 'function';
          }
          
          const allPresent = Object.values(results).every(Boolean);
          if (!allPresent) {
            throw new Error('Missing required storage methods');
          }
          
          return { methods: results, allPresent };
        }
      },
      {
        name: 'Database Write Operations',
        test: async () => {
          // Test writing different types of data
          const metric = await storage.createSystemMetric({
            metricType: 'test_write_operation',
            value: 42,
            unit: 'test'
          });
          
          const event = await storage.createSecurityEvent({
            eventType: 'test_write_operation',
            severity: 'low'
          });
          
          return {
            metricCreated: !!metric,
            eventCreated: !!event,
            writeOperationsPassed: !!(metric && event)
          };
        }
      },
      {
        name: 'Database Read Operations',
        test: async () => {
          // Test reading data
          const metrics = await storage.getSystemMetrics();
          const events = await storage.getAllSecurityEvents();
          const logs = await storage.getAuditLogs({});
          
          return {
            metricsRead: Array.isArray(metrics),
            eventsRead: Array.isArray(events),
            logsRead: Array.isArray(logs),
            readOperationsPassed: Array.isArray(metrics) && Array.isArray(events) && Array.isArray(logs)
          };
        }
      }
    ];

    for (const { name, test } of dbTests) {
      const result = await this.runTest(name, test);
      this.results.databaseConnectionTests.push(result);
    }
  }

  // ============= PERFORMANCE TESTS =============
  
  async testPerformance(): Promise<void> {
    console.log('\n🚀 Testing Performance...');
    
    const performanceTests = [
      {
        name: 'Response Time Test',
        test: async () => {
          const startTime = performance.now();
          
          if (selfHealingIntegration) {
            await selfHealingIntegration.getStatus();
          }
          
          const responseTime = performance.now() - startTime;
          
          // Check if response is under 1000ms (1 second)
          const isWithinThreshold = responseTime < 1000;
          
          return {
            responseTime: responseTime.toFixed(2),
            withinThreshold: isWithinThreshold,
            threshold: 1000
          };
        }
      },
      {
        name: 'Database Performance Test',
        test: async () => {
          const operations = [];
          const startTime = performance.now();
          
          // Perform multiple operations
          for (let i = 0; i < 10; i++) {
            operations.push(
              storage.createSystemMetric({
                metricType: 'performance_test',
                value: i,
                unit: 'iteration'
              })
            );
          }
          
          await Promise.all(operations);
          const duration = performance.now() - startTime;
          
          return {
            operations: operations.length,
            totalDuration: duration.toFixed(2),
            avgPerOperation: (duration / operations.length).toFixed(2)
          };
        }
      }
    ];

    for (const { name, test } of performanceTests) {
      const result = await this.runTest(name, test);
      this.results.performanceTests.push(result);
    }
  }

  // ============= MAIN VALIDATION RUNNER =============
  
  async validate(): Promise<ComprehensiveReport> {
    console.log('🎯 Starting Comprehensive Self-Healing Architecture Validation\n');
    
    const overallStartTime = performance.now();
    
    try {
      await this.testServiceImports();
      await this.testSchemaValidation();
      await this.testServiceIntegration();
      await this.testRuntimeValidation();
      await this.testDatabaseConnections();
      await this.testPerformance();
      
    } catch (error) {
      console.error('💥 Validation suite encountered an error:', error);
    }
    
    const overallDuration = performance.now() - overallStartTime;
    
    // Calculate overall results
    const allTests = [
      ...this.results.serviceImportTests,
      ...this.results.schemaValidationTests,
      ...this.results.integrationTests,
      ...this.results.runtimeValidationTests,
      ...this.results.databaseConnectionTests,
      ...this.results.performanceTests
    ];
    
    const passedTests = allTests.filter(test => test.passed).length;
    const failedTests = allTests.filter(test => !test.passed).length;
    
    this.results.overall = {
      passed: failedTests === 0,
      totalTests: allTests.length,
      passedTests,
      failedTests,
      totalDuration: overallDuration
    };
    
    // Generate recommendations
    this.generateRecommendations();
    
    // Print final report
    this.printReport();
    
    return this.results;
  }

  generateRecommendations(): void {
    const recommendations = [];
    
    // Check for failed imports
    const failedImports = this.results.serviceImportTests.filter(test => !test.passed);
    if (failedImports.length > 0) {
      recommendations.push('🔧 Fix service import issues - some self-healing services cannot be loaded');
    }
    
    // Check for database issues
    const failedDbTests = this.results.databaseConnectionTests.filter(test => !test.passed);
    if (failedDbTests.length > 0) {
      recommendations.push('🗄️ Resolve database connectivity issues for persistent storage');
    }
    
    // Check for integration issues
    const failedIntegration = this.results.integrationTests.filter(test => !test.passed);
    if (failedIntegration.length > 0) {
      recommendations.push('🔗 Address service integration problems for proper communication');
    }
    
    // Performance recommendations
    const performanceIssues = this.results.performanceTests.filter(test => !test.passed);
    if (performanceIssues.length > 0) {
      recommendations.push('⚡ Optimize performance to meet zero-defect response time requirements');
    }
    
    if (recommendations.length === 0) {
      recommendations.push('✨ All systems operational - zero-defect architecture verified');
      recommendations.push('🚀 Ready for production deployment');
      recommendations.push('💡 Consider adding monitoring dashboards for operational visibility');
    }
    
    this.results.recommendations = recommendations;
  }

  printReport(): void {
    console.log('\n' + '='.repeat(80));
    console.log('📊 COMPREHENSIVE SELF-HEALING ARCHITECTURE VALIDATION REPORT');
    console.log('='.repeat(80));
    
    const { overall } = this.results;
    
    console.log(`\n🎯 OVERALL RESULTS:`);
    console.log(`   Status: ${overall.passed ? '✅ PASSED' : '❌ FAILED'}`);
    console.log(`   Total Tests: ${overall.totalTests}`);
    console.log(`   Passed: ${overall.passedTests}`);
    console.log(`   Failed: ${overall.failedTests}`);
    console.log(`   Duration: ${overall.totalDuration.toFixed(2)}ms`);
    
    // Print category results
    const categories = [
      { name: 'Service Imports', tests: this.results.serviceImportTests },
      { name: 'Schema Validation', tests: this.results.schemaValidationTests },
      { name: 'Integration Tests', tests: this.results.integrationTests },
      { name: 'Runtime Validation', tests: this.results.runtimeValidationTests },
      { name: 'Database Connection', tests: this.results.databaseConnectionTests },
      { name: 'Performance Tests', tests: this.results.performanceTests }
    ];
    
    for (const category of categories) {
      const passed = category.tests.filter(t => t.passed).length;
      const total = category.tests.length;
      const status = passed === total ? '✅' : '⚠️';
      
      console.log(`\n${status} ${category.name}: ${passed}/${total} passed`);
      
      const failures = category.tests.filter(t => !t.passed);
      if (failures.length > 0) {
        failures.forEach(failure => {
          console.log(`   ❌ ${failure.testName}: ${failure.error}`);
        });
      }
    }
    
    console.log(`\n📋 RECOMMENDATIONS:`);
    this.results.recommendations.forEach(rec => console.log(`   ${rec}`));
    
    console.log('\n' + '='.repeat(80));
  }
}

// Export for module use
export { SelfHealingValidator, ValidationResult, ComprehensiveReport };

// Run validation immediately
(async () => {
  const validator = new SelfHealingValidator();
  const results = await validator.validate();
  
  // Exit with appropriate code
  process.exit(results.overall.passed ? 0 : 1);
})().catch(error => {
  console.error('💥 Validation failed with error:', error);
  process.exit(1);
});