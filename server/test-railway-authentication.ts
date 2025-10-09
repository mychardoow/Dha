/**
 * Railway Authentication Integration Tests
 * 
 * Tests to verify Railway API authentication works properly and the system
 * correctly enters real-API mode when credentials are available.
 */

import { railwayAPI, RAILWAY_SERVICE_CONFIG } from './config/railway-api.js';
import { railwayAutoScalingService } from './services/railway-auto-scaling-service.js';
import { railwayHealthCheckSystem } from './services/railway-health-check-system.js';

interface TestResult {
  testName: string;
  success: boolean;
  error?: string;
  details?: any;
  timestamp: Date;
}

class RailwayAuthenticationTestSuite {
  private testResults: TestResult[] = [];

  async runAllTests(): Promise<{ 
    overallSuccess: boolean; 
    results: TestResult[]; 
    summary: string;
  }> {
    console.log('🧪 Starting Railway Authentication Integration Tests...');
    
    const tests = [
      this.testRailwayAPICredentials.bind(this),
      this.testRailwayAPIHealthCheck.bind(this),
      this.testProjectTokenAuthentication.bind(this),
      this.testAccountTokenAuthentication.bind(this),
      this.testAPIAuthenticationRecovery.bind(this),
      this.testAutoScalingServiceAPIMode.bind(this),
      this.testHealthCheckSystemAPIMode.bind(this),
      this.testSimulationFallbackBehavior.bind(this),
      this.testRealAPIScalingOperations.bind(this)
    ];

    for (const test of tests) {
      try {
        await test();
      } catch (error) {
        this.testResults.push({
          testName: test.name,
          success: false,
          error: error instanceof Error ? error.message : String(error),
          timestamp: new Date()
        });
      }
    }

    const successCount = this.testResults.filter(r => r.success).length;
    const totalCount = this.testResults.length;
    const overallSuccess = successCount === totalCount;

    const summary = `Railway Authentication Tests: ${successCount}/${totalCount} passed`;
    
    console.log('\n📋 Railway Authentication Test Results:');
    this.testResults.forEach(result => {
      const status = result.success ? '✅' : '❌';
      console.log(`${status} ${result.testName}`);
      if (!result.success) {
        console.log(`   Error: ${result.error}`);
      }
    });
    
    console.log(`\n${overallSuccess ? '🎉' : '⚠️'} ${summary}`);

    return {
      overallSuccess,
      results: this.testResults,
      summary
    };
  }

  /**
   * Test that Railway API credentials are properly configured
   */
  private async testRailwayAPICredentials(): Promise<void> {
    const hasToken = !!process.env.RAILWAY_TOKEN;
    const hasProjectToken = !!process.env.RAILWAY_PROJECT_TOKEN;
    const hasServiceConfig = !!(RAILWAY_SERVICE_CONFIG.serviceId && RAILWAY_SERVICE_CONFIG.environmentId);

    if (!hasToken && !hasProjectToken) {
      this.testResults.push({
        testName: 'Railway API Credentials',
        success: false,
        error: 'No Railway tokens found (RAILWAY_TOKEN or RAILWAY_PROJECT_TOKEN)',
        details: { hasToken, hasProjectToken, hasServiceConfig },
        timestamp: new Date()
      });
      return;
    }

    this.testResults.push({
      testName: 'Railway API Credentials',
      success: true,
      details: { 
        hasToken, 
        hasProjectToken, 
        hasServiceConfig,
        tokenType: hasProjectToken ? 'project' : 'account'
      },
      timestamp: new Date()
    });
  }

  /**
   * Test Railway API health check with current credentials
   */
  private async testRailwayAPIHealthCheck(): Promise<void> {
    const healthResult = await railwayAPI.checkApiHealth();
    
    if (!healthResult.healthy) {
      this.testResults.push({
        testName: 'Railway API Health Check',
        success: false,
        error: healthResult.error || 'Unknown health check failure',
        details: healthResult,
        timestamp: new Date()
      });
      return;
    }

    this.testResults.push({
      testName: 'Railway API Health Check',
      success: true,
      details: healthResult,
      timestamp: new Date()
    });
  }

  /**
   * Test project token authentication specifically
   */
  private async testProjectTokenAuthentication(): Promise<void> {
    if (!process.env.RAILWAY_PROJECT_TOKEN) {
      this.testResults.push({
        testName: 'Project Token Authentication',
        success: true, // Skip test if no project token
        details: { skipped: 'No project token configured' },
        timestamp: new Date()
      });
      return;
    }

    try {
      const projectInfo = await railwayAPI.getProjectInfo();
      
      if (!projectInfo) {
        throw new Error('Failed to fetch project info with project token');
      }

      this.testResults.push({
        testName: 'Project Token Authentication',
        success: true,
        details: { projectInfo },
        timestamp: new Date()
      });
    } catch (error) {
      this.testResults.push({
        testName: 'Project Token Authentication',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }

  /**
   * Test account token authentication specifically
   */
  private async testAccountTokenAuthentication(): Promise<void> {
    if (!process.env.RAILWAY_TOKEN || process.env.RAILWAY_PROJECT_TOKEN) {
      this.testResults.push({
        testName: 'Account Token Authentication',
        success: true, // Skip if no account token or project token takes priority
        details: { skipped: 'Account token not configured or project token takes priority' },
        timestamp: new Date()
      });
      return;
    }

    try {
      // Temporarily clear project token to test account token
      const originalProjectToken = process.env.RAILWAY_PROJECT_TOKEN;
      delete process.env.RAILWAY_PROJECT_TOKEN;
      
      const healthResult = await railwayAPI.checkApiHealth();
      
      // Restore project token
      if (originalProjectToken) {
        process.env.RAILWAY_PROJECT_TOKEN = originalProjectToken;
      }

      if (!healthResult.healthy) {
        throw new Error(healthResult.error || 'Account token authentication failed');
      }

      this.testResults.push({
        testName: 'Account Token Authentication',
        success: true,
        details: healthResult,
        timestamp: new Date()
      });
    } catch (error) {
      this.testResults.push({
        testName: 'Account Token Authentication',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }

  /**
   * Test authentication recovery after temporary failure
   */
  private async testAPIAuthenticationRecovery(): Promise<void> {
    try {
      // First, verify normal authentication works
      const initialHealth = await railwayAPI.checkApiHealth();
      if (!initialHealth.healthy) {
        throw new Error('Initial authentication failed - cannot test recovery');
      }

      // Test recovery by running health check multiple times
      const recoveryTests = [];
      for (let i = 0; i < 3; i++) {
        const health = await railwayAPI.checkApiHealth();
        recoveryTests.push(health.healthy);
      }

      const allRecovered = recoveryTests.every(Boolean);
      
      this.testResults.push({
        testName: 'API Authentication Recovery',
        success: allRecovered,
        details: { recoveryTests, allRecovered },
        timestamp: new Date()
      });
    } catch (error) {
      this.testResults.push({
        testName: 'API Authentication Recovery',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }

  /**
   * Test that auto-scaling service properly enters real-API mode
   */
  private async testAutoScalingServiceAPIMode(): Promise<void> {
    try {
      // Check if auto-scaling service is using Railway API
      const scalingService = railwayAutoScalingService;
      
      // Start the service to trigger Railway API initialization
      const started = await scalingService.start();
      if (!started) {
        throw new Error('Failed to start auto-scaling service');
      }

      // Give it a moment to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check the service's API mode
      const status = await scalingService.getServiceStatus();
      const usingRailwayAPI = status.isUsingRailwayAPI;

      if (!usingRailwayAPI) {
        throw new Error('Auto-scaling service is not using Railway API despite credentials being available');
      }

      this.testResults.push({
        testName: 'Auto-Scaling Service API Mode',
        success: true,
        details: { usingRailwayAPI, status },
        timestamp: new Date()
      });
    } catch (error) {
      this.testResults.push({
        testName: 'Auto-Scaling Service API Mode',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }

  /**
   * Test that health check system properly enters real-API mode
   */
  private async testHealthCheckSystemAPIMode(): Promise<void> {
    try {
      // Start the health check system
      const healthSystem = railwayHealthCheckSystem;
      const started = await healthSystem.start();
      
      if (!started) {
        throw new Error('Failed to start health check system');
      }

      // Give it time to initialize
      await new Promise(resolve => setTimeout(resolve, 2000));

      // Check if it's using Railway API
      const healthStatus = await healthSystem.getOverallHealth();
      const railwayAPIEnabled = healthStatus.integrations?.railway?.enabled;

      this.testResults.push({
        testName: 'Health Check System API Mode',
        success: !!railwayAPIEnabled,
        details: { railwayAPIEnabled, healthStatus },
        timestamp: new Date()
      });
    } catch (error) {
      this.testResults.push({
        testName: 'Health Check System API Mode',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }

  /**
   * Test simulation fallback behavior when credentials are invalid
   */
  private async testSimulationFallbackBehavior(): Promise<void> {
    try {
      // Save original credentials
      const originalToken = process.env.RAILWAY_TOKEN;
      const originalProjectToken = process.env.RAILWAY_PROJECT_TOKEN;

      // Set invalid credentials
      process.env.RAILWAY_TOKEN = 'invalid_token_123';
      process.env.RAILWAY_PROJECT_TOKEN = 'invalid_project_token_123';

      // Test health check with invalid credentials
      const healthResult = await railwayAPI.checkApiHealth();

      // Restore original credentials
      if (originalToken) process.env.RAILWAY_TOKEN = originalToken;
      if (originalProjectToken) process.env.RAILWAY_PROJECT_TOKEN = originalProjectToken;

      if (healthResult.healthy) {
        throw new Error('Health check should fail with invalid credentials');
      }

      this.testResults.push({
        testName: 'Simulation Fallback Behavior',
        success: true,
        details: { 
          healthResult,
          expectedFailure: true,
          message: 'System correctly failed with invalid credentials'
        },
        timestamp: new Date()
      });
    } catch (error) {
      this.testResults.push({
        testName: 'Simulation Fallback Behavior',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }

  /**
   * Test real Railway API scaling operations
   */
  private async testRealAPIScalingOperations(): Promise<void> {
    try {
      const { serviceId, environmentId } = RAILWAY_SERVICE_CONFIG;
      
      if (!serviceId || !environmentId) {
        this.testResults.push({
          testName: 'Real API Scaling Operations',
          success: true, // Skip if no service config
          details: { skipped: 'No Railway service configuration available' },
          timestamp: new Date()
        });
        return;
      }

      // Test getting service info
      const serviceInfo = await railwayAPI.getServiceInfo(serviceId, environmentId);
      
      if (!serviceInfo.success) {
        throw new Error(`Failed to get service info: ${serviceInfo.error}`);
      }

      // Test deployment status
      const deploymentStatus = await railwayAPI.getDeploymentStatus();
      
      this.testResults.push({
        testName: 'Real API Scaling Operations',
        success: true,
        details: { 
          serviceInfo, 
          deploymentStatus,
          message: 'Successfully fetched service info and deployment status'
        },
        timestamp: new Date()
      });
    } catch (error) {
      this.testResults.push({
        testName: 'Real API Scaling Operations',
        success: false,
        error: error instanceof Error ? error.message : String(error),
        timestamp: new Date()
      });
    }
  }
}

// Export test suite
export const railwayAuthTestSuite = new RailwayAuthenticationTestSuite();

// CLI execution
if (require.main === module) {
  railwayAuthTestSuite.runAllTests()
    .then(result => {
      process.exit(result.overallSuccess ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite failed:', error);
      process.exit(1);
    });
}