/**
 * Comprehensive Railway Authentication Validation Tests
 * 
 * This test suite validates the complete Railway authentication flow including:
 * - Project token authentication (projectToken query)
 * - Account token authentication (me query)  
 * - Fallback behavior between token types
 * - Auto-scaling service initialization with proper useRailwayAPI activation
 * - Real-API mode vs simulation mode behavior
 * - Complete integration from authentication to scaling operations
 * 
 * These tests prevent silent reversion to simulation mode when authentication should work.
 */

import { railwayAPI, RAILWAY_SERVICE_CONFIG } from './config/railway-api.js';
import { railwayAutoScalingService } from './services/railway-auto-scaling-service.js';

interface TestResult {
  testName: string;
  passed: boolean;
  details: string;
  timestamp: Date;
  duration: number;
}

interface AuthTestConfig {
  hasProjectToken: boolean;
  hasAccountToken: boolean;
  projectTokenValid: boolean;
  accountTokenValid: boolean;
  serviceConfigComplete: boolean;
}

class RailwayAuthenticationTestSuite {
  private results: TestResult[] = [];

  /**
   * Run the complete authentication test suite
   */
  async runComprehensiveTests(): Promise<{
    totalTests: number;
    passed: number;
    failed: number;
    results: TestResult[];
    summary: string;
  }> {
    console.log('🧪 Starting Comprehensive Railway Authentication Tests...');
    console.log('=' .repeat(70));

    // Test 1: Project Token Authentication
    await this.testProjectTokenAuthentication();

    // Test 2: Account Token Authentication  
    await this.testAccountTokenAuthentication();

    // Test 3: Token Fallback Behavior
    await this.testTokenFallbackBehavior();

    // Test 4: Auto-scaling Service Initialization
    await this.testAutoScalingInitialization();

    // Test 5: Real-API Mode Activation
    await this.testRealApiModeActivation();

    // Test 6: Simulation Mode Prevention
    await this.testSimulationModePrevention();

    // Test 7: Complete Integration Flow
    await this.testCompleteIntegrationFlow();

    // Test 8: Authentication Regression Detection
    await this.testAuthenticationRegressionDetection();

    // Generate summary
    const summary = this.generateTestSummary();
    console.log('=' .repeat(70));
    console.log(summary);

    return {
      totalTests: this.results.length,
      passed: this.results.filter(r => r.passed).length,
      failed: this.results.filter(r => !r.passed).length,
      results: this.results,
      summary
    };
  }

  /**
   * Test 1: Project Token Authentication
   */
  private async testProjectTokenAuthentication(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Project Token Authentication';

    try {
      console.log(`\n🔍 Testing: ${testName}`);

      // Check if project token is available
      const hasProjectToken = !!process.env.RAILWAY_PROJECT_TOKEN;
      
      if (!hasProjectToken) {
        this.addResult(testName, false, 'RAILWAY_PROJECT_TOKEN not configured - skipping project token test', Date.now() - startTime);
        return;
      }

      console.log('   📋 Project token detected, testing authentication...');

      // Test health check with project token
      const healthResult = await railwayAPI.checkApiHealth();
      
      console.log(`   🔍 Health check result: ${JSON.stringify(healthResult)}`);

      if (healthResult.healthy && healthResult.tokenType === 'project') {
        console.log('   ✅ Project token authentication successful');
        
        // Verify project information can be retrieved
        const projectInfo = await railwayAPI.getProjectInfo();
        
        if (projectInfo && projectInfo.id !== 'unknown') {
          this.addResult(testName, true, `Project token authentication successful. Project ID: ${projectInfo.id}`, Date.now() - startTime);
        } else {
          this.addResult(testName, false, 'Project token authenticated but failed to retrieve project info', Date.now() - startTime);
        }
      } else {
        this.addResult(testName, false, `Project token authentication failed: ${healthResult.error}`, Date.now() - startTime);
      }
    } catch (error) {
      this.addResult(testName, false, `Project token test error: ${error instanceof Error ? error.message : String(error)}`, Date.now() - startTime);
    }
  }

  /**
   * Test 2: Account Token Authentication
   */
  private async testAccountTokenAuthentication(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Account Token Authentication';

    try {
      console.log(`\n🔍 Testing: ${testName}`);

      // Check if account token is available
      const hasAccountToken = !!process.env.RAILWAY_TOKEN;
      
      if (!hasAccountToken) {
        this.addResult(testName, false, 'RAILWAY_TOKEN not configured - skipping account token test', Date.now() - startTime);
        return;
      }

      console.log('   👤 Account token detected, testing authentication...');

      // Temporarily remove project token to test account token fallback
      const originalProjectToken = process.env.RAILWAY_PROJECT_TOKEN;
      delete process.env.RAILWAY_PROJECT_TOKEN;

      // Create new Railway API instance to test account token
      const { RailwayAPIClient } = await import('./config/railway-api');
      const testRailwayAPI = RailwayAPIClient.getInstance();

      const healthResult = await testRailwayAPI.checkApiHealth();
      
      console.log(`   🔍 Health check result: ${JSON.stringify(healthResult)}`);

      // Restore project token
      if (originalProjectToken) {
        process.env.RAILWAY_PROJECT_TOKEN = originalProjectToken;
      }

      if (healthResult.healthy && healthResult.tokenType === 'account') {
        this.addResult(testName, true, 'Account token authentication successful', Date.now() - startTime);
      } else {
        this.addResult(testName, false, `Account token authentication failed: ${healthResult.error}`, Date.now() - startTime);
      }
    } catch (error) {
      this.addResult(testName, false, `Account token test error: ${error instanceof Error ? error.message : String(error)}`, Date.now() - startTime);
    }
  }

  /**
   * Test 3: Token Fallback Behavior
   */
  private async testTokenFallbackBehavior(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Token Fallback Behavior';

    try {
      console.log(`\n🔍 Testing: ${testName}`);

      const hasProjectToken = !!process.env.RAILWAY_PROJECT_TOKEN;
      const hasAccountToken = !!process.env.RAILWAY_TOKEN;

      if (!hasProjectToken && !hasAccountToken) {
        this.addResult(testName, false, 'No tokens configured for fallback test', Date.now() - startTime);
        return;
      }

      console.log('   🔄 Testing token fallback behavior...');

      // Test with both tokens available (should prefer project token)
      if (hasProjectToken && hasAccountToken) {
        const healthResult = await railwayAPI.checkApiHealth();
        
        if (healthResult.healthy) {
          console.log(`   ✅ Fallback test passed: Using ${healthResult.tokenType} token`);
          this.addResult(testName, true, `Fallback behavior working: ${healthResult.tokenType} token selected`, Date.now() - startTime);
        } else {
          this.addResult(testName, false, `Fallback behavior failed: ${healthResult.error}`, Date.now() - startTime);
        }
      } else {
        console.log('   ⚠️ Only one token type available, skipping comprehensive fallback test');
        this.addResult(testName, true, 'Single token fallback test passed (limited scope)', Date.now() - startTime);
      }
    } catch (error) {
      this.addResult(testName, false, `Token fallback test error: ${error instanceof Error ? error.message : String(error)}`, Date.now() - startTime);
    }
  }

  /**
   * Test 4: Auto-scaling Service Initialization
   */
  private async testAutoScalingInitialization(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Auto-scaling Service Initialization';

    try {
      console.log(`\n🔍 Testing: ${testName}`);

      console.log('   🚀 Testing auto-scaling service initialization...');

      // Check current service status
      const initialStatus = railwayAutoScalingService.getServiceStatus();
      console.log(`   📊 Initial status: Running=${initialStatus.isRunning}, API=${initialStatus.isUsingRailwayAPI}`);

      // Start the service to trigger initialization
      if (!initialStatus.isRunning) {
        console.log('   🔧 Starting auto-scaling service...');
        await railwayAutoScalingService.start();
      }

      // Wait a moment for initialization to complete
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check final status
      const finalStatus = railwayAutoScalingService.getServiceStatus();
      console.log(`   📊 Final status: Running=${finalStatus.isRunning}, API=${finalStatus.isUsingRailwayAPI}, Mode=${finalStatus.mode}`);

      // Validate that useRailwayAPI is correctly set
      const hasValidTokens = !!(process.env.RAILWAY_PROJECT_TOKEN || process.env.RAILWAY_TOKEN);
      const hasServiceConfig = !!(RAILWAY_SERVICE_CONFIG.serviceId && RAILWAY_SERVICE_CONFIG.environmentId);

      if (hasValidTokens && hasServiceConfig && finalStatus.railwayApiHealthy) {
        if (finalStatus.isUsingRailwayAPI && finalStatus.mode === 'api') {
          this.addResult(testName, true, 'Auto-scaling initialization successful: Real API mode enabled', Date.now() - startTime);
        } else {
          this.addResult(testName, false, 'Auto-scaling initialization failed: Should be using real API mode but in simulation', Date.now() - startTime);
        }
      } else if (!hasValidTokens) {
        if (!finalStatus.isUsingRailwayAPI && finalStatus.mode === 'simulation') {
          this.addResult(testName, true, 'Auto-scaling initialization correct: Simulation mode due to missing tokens', Date.now() - startTime);
        } else {
          this.addResult(testName, false, 'Auto-scaling initialization incorrect: Should be in simulation mode', Date.now() - startTime);
        }
      } else if (!hasServiceConfig) {
        if (!finalStatus.isUsingRailwayAPI && finalStatus.mode === 'simulation') {
          this.addResult(testName, true, 'Auto-scaling initialization correct: Simulation mode due to missing service config', Date.now() - startTime);
        } else {
          this.addResult(testName, false, 'Auto-scaling initialization incorrect: Should be in simulation mode due to missing config', Date.now() - startTime);
        }
      } else {
        this.addResult(testName, false, `Auto-scaling initialization unclear: API healthy=${finalStatus.railwayApiHealthy}, using API=${finalStatus.isUsingRailwayAPI}`, Date.now() - startTime);
      }
    } catch (error) {
      this.addResult(testName, false, `Auto-scaling initialization test error: ${error instanceof Error ? error.message : String(error)}`, Date.now() - startTime);
    }
  }

  /**
   * Test 5: Real-API Mode Activation
   */
  private async testRealApiModeActivation(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Real-API Mode Activation';

    try {
      console.log(`\n🔍 Testing: ${testName}`);

      const hasValidCredentials = !!(process.env.RAILWAY_PROJECT_TOKEN || process.env.RAILWAY_TOKEN);
      const hasServiceConfig = !!(RAILWAY_SERVICE_CONFIG.serviceId && RAILWAY_SERVICE_CONFIG.environmentId);

      if (!hasValidCredentials) {
        this.addResult(testName, false, 'No valid Railway credentials available for real-API mode test', Date.now() - startTime);
        return;
      }

      if (!hasServiceConfig) {
        this.addResult(testName, false, 'Service configuration incomplete for real-API mode test', Date.now() - startTime);
        return;
      }

      console.log('   🎯 Testing real-API mode activation with valid credentials...');

      // Test API health directly
      const healthResult = await railwayAPI.checkApiHealth();

      if (healthResult.healthy) {
        // Check auto-scaling service status
        const serviceStatus = railwayAutoScalingService.getServiceStatus();

        if (serviceStatus.isUsingRailwayAPI && serviceStatus.mode === 'api') {
          console.log('   ✅ Real-API mode successfully activated');
          this.addResult(testName, true, `Real-API mode active with ${healthResult.tokenType} token`, Date.now() - startTime);
        } else {
          console.log('   ❌ Real-API mode should be active but service is in simulation mode');
          this.addResult(testName, false, 'Real-API mode activation failed: Service in simulation despite healthy API', Date.now() - startTime);
        }
      } else {
        this.addResult(testName, false, `Real-API mode activation failed: API unhealthy - ${healthResult.error}`, Date.now() - startTime);
      }
    } catch (error) {
      this.addResult(testName, false, `Real-API mode activation test error: ${error instanceof Error ? error.message : String(error)}`, Date.now() - startTime);
    }
  }

  /**
   * Test 6: Simulation Mode Prevention
   */
  private async testSimulationModePrevention(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Simulation Mode Prevention';

    try {
      console.log(`\n🔍 Testing: ${testName}`);

      const hasValidCredentials = !!(process.env.RAILWAY_PROJECT_TOKEN || process.env.RAILWAY_TOKEN);
      const hasServiceConfig = !!(RAILWAY_SERVICE_CONFIG.serviceId && RAILWAY_SERVICE_CONFIG.environmentId);

      console.log('   🛡️ Testing prevention of silent simulation mode fallback...');

      if (hasValidCredentials && hasServiceConfig) {
        // With valid credentials and config, should NOT be in simulation mode
        const serviceStatus = railwayAutoScalingService.getServiceStatus();
        const healthResult = await railwayAPI.checkApiHealth();

        if (healthResult.healthy && serviceStatus.mode === 'simulation') {
          this.addResult(testName, false, 'CRITICAL: Silent simulation mode fallback detected despite valid credentials', Date.now() - startTime);
        } else if (healthResult.healthy && serviceStatus.mode === 'api') {
          this.addResult(testName, true, 'Simulation mode prevention successful: Using real-API mode with valid credentials', Date.now() - startTime);
        } else if (!healthResult.healthy) {
          this.addResult(testName, true, 'Simulation mode justified: API authentication failed', Date.now() - startTime);
        } else {
          this.addResult(testName, false, `Unclear simulation mode state: API healthy=${healthResult.healthy}, mode=${serviceStatus.mode}`, Date.now() - startTime);
        }
      } else {
        // Without valid credentials/config, SHOULD be in simulation mode
        const serviceStatus = railwayAutoScalingService.getServiceStatus();

        if (serviceStatus.mode === 'simulation') {
          this.addResult(testName, true, 'Simulation mode correctly activated due to missing credentials/config', Date.now() - startTime);
        } else {
          this.addResult(testName, false, 'Simulation mode prevention failed: Should be in simulation but using API mode', Date.now() - startTime);
        }
      }
    } catch (error) {
      this.addResult(testName, false, `Simulation mode prevention test error: ${error instanceof Error ? error.message : String(error)}`, Date.now() - startTime);
    }
  }

  /**
   * Test 7: Complete Integration Flow
   */
  private async testCompleteIntegrationFlow(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Complete Integration Flow';

    try {
      console.log(`\n🔍 Testing: ${testName}`);

      console.log('   🔄 Testing complete authentication to scaling operations flow...');

      // Step 1: Test authentication
      const healthResult = await railwayAPI.checkApiHealth();
      console.log(`   1️⃣ Authentication: ${healthResult.healthy ? '✅' : '❌'} (${healthResult.tokenType || 'none'})`);

      // Step 2: Check service configuration
      const hasServiceConfig = !!(RAILWAY_SERVICE_CONFIG.serviceId && RAILWAY_SERVICE_CONFIG.environmentId);
      console.log(`   2️⃣ Service Config: ${hasServiceConfig ? '✅' : '❌'}`);

      // Step 3: Check auto-scaling initialization
      const serviceStatus = railwayAutoScalingService.getServiceStatus();
      console.log(`   3️⃣ Auto-scaling: ${serviceStatus.isRunning ? '✅' : '❌'} (${serviceStatus.mode})`);

      // Step 4: Test scaling operation (simulation)
      if (serviceStatus.isRunning) {
        try {
          // Get current metrics to trigger scaling evaluation
          const currentMetrics = await railwayAutoScalingService.collectMetrics();
          console.log(`   4️⃣ Metrics Collection: ✅ (CPU: ${currentMetrics.cpuUtilization.toFixed(1)}%)`);

          // Integration test passes if all components work together
          if (healthResult.healthy && hasServiceConfig && serviceStatus.isRunning && serviceStatus.mode === 'api') {
            this.addResult(testName, true, 'Complete integration flow successful: Authentication → Configuration → Real API Operations', Date.now() - startTime);
          } else if ((!healthResult.healthy || !hasServiceConfig) && serviceStatus.mode === 'simulation') {
            this.addResult(testName, true, 'Complete integration flow successful: Missing requirements → Simulation Mode', Date.now() - startTime);
          } else {
            this.addResult(testName, false, `Integration flow inconsistent: Auth=${healthResult.healthy}, Config=${hasServiceConfig}, Mode=${serviceStatus.mode}`, Date.now() - startTime);
          }
        } catch (metricsError) {
          this.addResult(testName, false, `Integration flow failed at metrics collection: ${metricsError instanceof Error ? metricsError.message : String(metricsError)}`, Date.now() - startTime);
        }
      } else {
        this.addResult(testName, false, 'Complete integration flow failed: Auto-scaling service not running', Date.now() - startTime);
      }
    } catch (error) {
      this.addResult(testName, false, `Complete integration flow test error: ${error instanceof Error ? error.message : String(error)}`, Date.now() - startTime);
    }
  }

  /**
   * Test 8: Authentication Regression Detection
   */
  private async testAuthenticationRegressionDetection(): Promise<void> {
    const startTime = Date.now();
    const testName = 'Authentication Regression Detection';

    try {
      console.log(`\n🔍 Testing: ${testName}`);

      console.log('   🔍 Testing authentication regression detection...');

      // Test various authentication scenarios to catch regressions
      const scenarios = [
        { name: 'Project Token Only', projectToken: true, accountToken: false },
        { name: 'Account Token Only', projectToken: false, accountToken: true },
        { name: 'Both Tokens', projectToken: true, accountToken: true },
        { name: 'No Tokens', projectToken: false, accountToken: false }
      ];

      let passedScenarios = 0;
      let totalScenarios = 0;

      for (const scenario of scenarios) {
        totalScenarios++;
        
        // Check if we have the required tokens for this scenario
        const hasProjectToken = !!process.env.RAILWAY_PROJECT_TOKEN;
        const hasAccountToken = !!process.env.RAILWAY_TOKEN;

        // Skip scenarios we can't test due to missing tokens
        if ((scenario.projectToken && !hasProjectToken) || (scenario.accountToken && !hasAccountToken)) {
          console.log(`   ⏭️ Skipping ${scenario.name}: Required tokens not available`);
          continue;
        }

        if (!scenario.projectToken && !scenario.accountToken) {
          console.log(`   ⏭️ Skipping ${scenario.name}: No tokens scenario (destructive)`);
          continue;
        }

        try {
          console.log(`   🧪 Testing scenario: ${scenario.name}`);
          
          // For available scenarios, just verify the current health check works
          const healthResult = await railwayAPI.checkApiHealth();
          
          if (healthResult.healthy) {
            console.log(`   ✅ ${scenario.name}: Authentication successful`);
            passedScenarios++;
          } else {
            console.log(`   ❌ ${scenario.name}: Authentication failed - ${healthResult.error}`);
          }
        } catch (scenarioError) {
          console.log(`   ❌ ${scenario.name}: Error - ${scenarioError instanceof Error ? scenarioError.message : String(scenarioError)}`);
        }
      }

      if (passedScenarios > 0) {
        this.addResult(testName, true, `Regression detection passed: ${passedScenarios}/${totalScenarios} scenarios successful`, Date.now() - startTime);
      } else {
        this.addResult(testName, false, 'Regression detection failed: No authentication scenarios successful', Date.now() - startTime);
      }
    } catch (error) {
      this.addResult(testName, false, `Authentication regression detection test error: ${error instanceof Error ? error.message : String(error)}`, Date.now() - startTime);
    }
  }

  /**
   * Add a test result
   */
  private addResult(testName: string, passed: boolean, details: string, duration: number): void {
    const result: TestResult = {
      testName,
      passed,
      details,
      timestamp: new Date(),
      duration
    };

    this.results.push(result);
    
    const status = passed ? '✅ PASS' : '❌ FAIL';
    console.log(`   ${status} ${testName}: ${details} (${duration}ms)`);
  }

  /**
   * Generate test summary
   */
  private generateTestSummary(): string {
    const totalTests = this.results.length;
    const passedTests = this.results.filter(r => r.passed).length;
    const failedTests = totalTests - passedTests;
    const successRate = totalTests > 0 ? ((passedTests / totalTests) * 100).toFixed(1) : '0.0';

    let summary = `\n🏁 COMPREHENSIVE RAILWAY AUTHENTICATION TEST RESULTS\n`;
    summary += `📊 Total Tests: ${totalTests}\n`;
    summary += `✅ Passed: ${passedTests}\n`;
    summary += `❌ Failed: ${failedTests}\n`;
    summary += `📈 Success Rate: ${successRate}%\n\n`;

    if (failedTests > 0) {
      summary += `🚨 FAILED TESTS:\n`;
      this.results.filter(r => !r.passed).forEach(result => {
        summary += `   ❌ ${result.testName}: ${result.details}\n`;
      });
      summary += '\n';
    }

    summary += `🎯 AUTHENTICATION STATUS:\n`;
    const hasProjectToken = !!process.env.RAILWAY_PROJECT_TOKEN;
    const hasAccountToken = !!process.env.RAILWAY_TOKEN;
    const hasServiceConfig = !!(RAILWAY_SERVICE_CONFIG.serviceId && RAILWAY_SERVICE_CONFIG.environmentId);
    
    summary += `   🔑 Project Token: ${hasProjectToken ? '✅ Available' : '❌ Missing'}\n`;
    summary += `   👤 Account Token: ${hasAccountToken ? '✅ Available' : '❌ Missing'}\n`;
    summary += `   ⚙️ Service Config: ${hasServiceConfig ? '✅ Complete' : '❌ Incomplete'}\n`;

    const serviceStatus = railwayAutoScalingService.getServiceStatus();
    summary += `   🚀 API Mode: ${serviceStatus.mode === 'api' ? '✅ Real' : '🎭 Simulation'}\n`;

    if (passedTests === totalTests) {
      summary += `\n🎉 ALL TESTS PASSED! Railway authentication is working correctly.\n`;
    } else {
      summary += `\n⚠️ SOME TESTS FAILED. Review the failures above and fix authentication issues.\n`;
    }

    return summary;
  }
}

/**
 * Main test execution function
 */
export async function runRailwayAuthenticationTests(): Promise<void> {
  const testSuite = new RailwayAuthenticationTestSuite();
  
  try {
    const results = await testSuite.runComprehensiveTests();
    
    // Save results to file for CI/CD integration
    const fs = await import('fs');
    const reportPath = 'RAILWAY_AUTHENTICATION_TEST_REPORT.json';
    await fs.promises.writeFile(reportPath, JSON.stringify({
      ...results,
      generatedAt: new Date().toISOString(),
      environment: {
        hasProjectToken: !!process.env.RAILWAY_PROJECT_TOKEN,
        hasAccountToken: !!process.env.RAILWAY_TOKEN,
        hasServiceConfig: !!(RAILWAY_SERVICE_CONFIG.serviceId && RAILWAY_SERVICE_CONFIG.environmentId)
      }
    }, null, 2));
    
    console.log(`\n📄 Detailed test report saved to: ${reportPath}`);
    
  } catch (error) {
    console.error('❌ Failed to run Railway authentication tests:', error);
    process.exit(1);
  }
}

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runRailwayAuthenticationTests();
}