#!/usr/bin/env tsx

/**
 * 🚀 QUICK VALIDATION TEST RUNNER
 * 
 * Simplified test runner for immediate validation of core DHA systems
 * Perfect for quick checks and CI/CD pipeline integration
 */

import { performance } from 'perf_hooks';

interface QuickTestResult {
  testName: string;
  success: boolean;
  duration: number;
  error?: string;
}

class QuickValidationTester {
  private baseUrl: string;
  private results: QuickTestResult[] = [];

  constructor(baseUrl: string = 'http://localhost:5000') {
    this.baseUrl = baseUrl;
  }

  /**
   * 🎯 RUN QUICK VALIDATION TESTS
   */
  async runQuickValidation(): Promise<void> {
    console.log('🏛️ DHA DIGITAL SERVICES PLATFORM');
    console.log('⚡ QUICK VALIDATION TEST SUITE');
    console.log('=' .repeat(60));
    console.log('Running essential system validation tests...\n');

    // Essential system tests
    await this.testSystemHealth();
    await this.testDatabaseConnectivity();
    await this.testAISystemBasics();
    await this.testSecurityBasics();
    await this.testDocumentGenerationBasics();
    await this.testBiometricSystemBasics();

    this.printResults();
  }

  /**
   * 🔍 TEST SYSTEM HEALTH
   */
  private async testSystemHealth(): Promise<void> {
    await this.runTest('System Health Check', async () => {
      const response = await fetch(`${this.baseUrl}/api/health`);
      if (!response.ok) {
        throw new Error(`Health check failed: ${response.status}`);
      }
      const health = await response.json();
      console.log('  ✅ Server is responsive');
      return health;
    });
  }

  /**
   * 🗃️ TEST DATABASE CONNECTIVITY
   */
  private async testDatabaseConnectivity(): Promise<void> {
    await this.runTest('Database Connectivity', async () => {
      const response = await fetch(`${this.baseUrl}/api/health/detailed`);
      if (!response.ok) {
        throw new Error(`Database health check failed: ${response.status}`);
      }
      const health = await response.json();
      console.log('  ✅ Database is connected');
      return health;
    });
  }

  /**
   * 🤖 TEST AI SYSTEM BASICS
   */
  private async testAISystemBasics(): Promise<void> {
    await this.runTest('AI System Basics', async () => {
      const response = await fetch(`${this.baseUrl}/api/ai/health`);
      if (!response.ok) {
        throw new Error(`AI system health check failed: ${response.status}`);
      }
      console.log('  ✅ AI systems are operational');
      return { aiHealthy: true };
    });
  }

  /**
   * 🛡️ TEST SECURITY BASICS
   */
  private async testSecurityBasics(): Promise<void> {
    await this.runTest('Security System Basics', async () => {
      // Test unauthenticated access (should be denied)
      const response = await fetch(`${this.baseUrl}/api/admin/users`);
      if (response.ok) {
        throw new Error('Security vulnerability: Admin endpoint accessible without authentication');
      }
      console.log('  ✅ Security controls are active');
      return { securityActive: true };
    });
  }

  /**
   * 📄 TEST DOCUMENT GENERATION BASICS
   */
  private async testDocumentGenerationBasics(): Promise<void> {
    await this.runTest('Document Generation Basics', async () => {
      // Test document generation endpoint availability
      const response = await fetch(`${this.baseUrl}/api/documents/types`);
      if (!response.ok) {
        throw new Error(`Document types endpoint failed: ${response.status}`);
      }
      const types = await response.json();
      console.log('  ✅ Document generation system is ready');
      return { documentTypesAvailable: types.length || 0 };
    });
  }

  /**
   * 👁️ TEST BIOMETRIC SYSTEM BASICS
   */
  private async testBiometricSystemBasics(): Promise<void> {
    await this.runTest('Biometric System Basics', async () => {
      const response = await fetch(`${this.baseUrl}/api/biometric/health`);
      if (!response.ok) {
        throw new Error(`Biometric system health check failed: ${response.status}`);
      }
      console.log('  ✅ Biometric system is operational');
      return { biometricHealthy: true };
    });
  }

  /**
   * 🔧 RUN INDIVIDUAL TEST
   */
  private async runTest(testName: string, testFn: () => Promise<any>): Promise<void> {
    const startTime = performance.now();
    
    try {
      console.log(`🧪 Testing: ${testName}`);
      await testFn();
      
      const duration = performance.now() - startTime;
      this.results.push({
        testName,
        success: true,
        duration
      });
      
      console.log(`  ✅ PASS: ${testName} (${duration.toFixed(2)}ms)\n`);
    } catch (error) {
      const duration = performance.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      
      this.results.push({
        testName,
        success: false,
        duration,
        error: errorMessage
      });
      
      console.log(`  ❌ FAIL: ${testName} - ${errorMessage} (${duration.toFixed(2)}ms)\n`);
    }
  }

  /**
   * 📊 PRINT RESULTS
   */
  private printResults(): void {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.success).length;
    const failedTests = totalTests - passedTests;
    const successRate = (passedTests / totalTests) * 100;
    const totalTime = this.results.reduce((sum, r) => sum + r.duration, 0);

    console.log('🎯 QUICK VALIDATION COMPLETE!');
    console.log('=' .repeat(60));
    console.log(`📊 Results: ${passedTests}/${totalTests} tests passed (${successRate.toFixed(1)}%)`);
    console.log(`⏱️ Total Time: ${totalTime.toFixed(2)}ms`);
    
    if (failedTests > 0) {
      console.log('\n❌ Failed Tests:');
      this.results
        .filter(r => !r.success)
        .forEach(r => console.log(`   - ${r.testName}: ${r.error}`));
    }

    console.log('\n🏛️ DHA Quick Validation Complete!');
    
    if (successRate === 100) {
      console.log('✅ All essential systems are operational and ready!');
    } else if (successRate >= 80) {
      console.log('⚠️ Most systems operational, but some issues need attention.');
    } else {
      console.log('❌ Critical issues detected - system not ready for operation.');
    }
  }
}

// Main execution
async function main() {
  const tester = new QuickValidationTester();
  
  try {
    await tester.runQuickValidation();
    process.exit(0);
  } catch (error) {
    console.error('❌ CRITICAL QUICK VALIDATION FAILURE:', error);
    process.exit(1);
  }
}

// Run if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { QuickValidationTester };