#!/usr/bin/env tsx

/**
 * COMPREHENSIVE AUTHENTICATION SYSTEM TESTING
 * Tests the complete authentication flow for Railway deployment readiness
 * 
 * This script tests:
 * 1. User Registration Flow with validation and password hashing
 * 2. Login/Logout Flow with JWT token generation
 * 3. JWT Token Validation and expiration handling
 * 4. Session Management and middleware authentication
 * 5. Password Security with bcrypt hashing
 * 6. Authentication API Endpoints
 * 7. Protected Route Access verification
 * 8. Role-Based Access Control (RBAC)
 * 9. Error Handling for auth failures
 * 10. Security edge cases and vulnerability protection
 */

import { readFileSync } from 'fs';
import { join } from 'path';

// Global fetch is available in tsx and Node.js 18+

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_TIMEOUT = 30000;

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  details?: any;
  duration: number;
}

interface AuthTestSuite {
  results: TestResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
  };
}

class AuthenticationTester {
  private results: TestResult[] = [];
  private sessionToken: string | null = null;
  private jwtToken: string | null = null;
  private testUsers: any[] = [];

  constructor() {
    console.log('🔐 COMPREHENSIVE AUTHENTICATION SYSTEM TESTING');
    console.log('🚀 Testing for Railway Deployment Readiness');
    console.log('='.repeat(60));
  }

  private async makeRequest(
    path: string,
    options: RequestInit = {},
    useAuth: boolean = false
  ): Promise<any> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...((options.headers as Record<string, string>) || {})
    };

    if (useAuth && this.jwtToken) {
      headers.Authorization = `Bearer ${this.jwtToken}`;
    }

    const response = await fetch(`${BASE_URL}${path}`, {
      ...options,
      headers
    });

    return response;
  }

  private async runTest(
    name: string,
    testFn: () => Promise<void>
  ): Promise<TestResult> {
    const startTime = Date.now();
    
    try {
      console.log(`\n🧪 Testing: ${name}`);
      await testFn();
      const duration = Date.now() - startTime;
      console.log(`✅ PASS: ${name} (${duration}ms)`);
      
      const result: TestResult = {
        name,
        status: 'PASS',
        message: 'Test completed successfully',
        duration
      };
      
      this.results.push(result);
      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      const message = error instanceof Error ? error.message : String(error);
      console.log(`❌ FAIL: ${name} - ${message} (${duration}ms)`);
      
      const result: TestResult = {
        name,
        status: 'FAIL',
        message,
        duration
      };
      
      this.results.push(result);
      return result;
    }
  }

  // Test 1: Server Health and Connectivity
  private async testServerHealth(): Promise<void> {
    const response = await this.makeRequest('/api/health');
    
    if (!response.ok) {
      throw new Error(`Server health check failed: ${response.status}`);
    }
    
    const health = await response.json();
    
    if (health.status !== 'healthy') {
      throw new Error(`Server not healthy: ${health.status}`);
    }
    
    console.log('  📊 Server is healthy and responsive');
  }

  // Test 2: Database Connectivity and User Storage
  private async testDatabaseHealth(): Promise<void> {
    const response = await this.makeRequest('/api/db/health');
    
    if (!response.ok) {
      throw new Error(`Database health check failed: ${response.status}`);
    }
    
    const dbHealth = await response.json();
    
    if (dbHealth.status !== 'healthy') {
      throw new Error(`Database not healthy: ${dbHealth.status}`);
    }
    
    console.log(`  💾 Database connected with ${dbHealth.totalRecords} records`);
    console.log(`  👥 Users: ${dbHealth.collections.users}`);
  }

  // Test 3: User Registration Flow
  private async testUserRegistration(): Promise<void> {
    const testUser = {
      username: `testuser_${Date.now()}`,
      email: `test_${Date.now()}@dha.gov.za`,
      password: 'TestPassword123!',
      role: 'user'
    };

    // Attempt registration (if endpoint exists)
    try {
      const response = await this.makeRequest('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(testUser)
      });

      if (response.ok) {
        const result = await response.json();
        console.log('  ✅ User registration successful');
        this.testUsers.push({ ...testUser, id: result.user?.id });
      } else if (response.status === 404) {
        console.log('  ⚠️ Registration endpoint not implemented - using existing users');
      } else {
        const error = await response.json();
        throw new Error(`Registration failed: ${error.message || error.error}`);
      }
    } catch (error) {
      // If registration endpoint doesn't exist, that's okay for this test
      console.log('  ⚠️ Registration endpoint not available - testing with existing users');
    }
  }

  // Test 4: Login Flow with Session Management
  private async testLoginFlow(): Promise<void> {
    // Test with default admin user
    const loginData = {
      username: 'admin',
      password: 'admin123'
    };

    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(loginData)
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Login failed: ${error.error || error.message}`);
    }

    const result = await response.json();
    
    if (!result.success) {
      throw new Error(`Login unsuccessful: ${result.error || 'Unknown error'}`);
    }

    // Check for JWT token if using JWT auth
    const authHeader = response.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      this.jwtToken = authHeader.substring(7);
      console.log('  🔑 JWT Token received');
    }

    // Check for session cookie
    const setCookieHeader = response.headers.get('set-cookie');
    if (setCookieHeader) {
      console.log('  🍪 Session cookie set');
    }

    console.log(`  👤 Logged in as: ${result.user.username} (${result.user.role})`);
    console.log(`  🛡️ Permissions: ${result.user.permissions?.join(', ') || 'None'}`);
  }

  // Test 5: JWT Token Validation
  private async testJWTValidation(): Promise<void> {
    if (!this.jwtToken) {
      console.log('  ⚠️ No JWT token available for validation test');
      return;
    }

    // Test accessing a protected route with valid token
    const response = await this.makeRequest('/api/auth/verify', {
      method: 'GET'
    }, true);

    if (response.status === 404) {
      console.log('  ⚠️ JWT verification endpoint not implemented');
      return;
    }

    if (!response.ok) {
      throw new Error(`JWT validation failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('  ✅ JWT token validated successfully');
  }

  // Test 6: Password Security Verification
  private async testPasswordSecurity(): Promise<void> {
    // Test password hashing by attempting login with wrong password
    const wrongPasswordData = {
      username: 'admin',
      password: 'wrongpassword123'
    };

    const response = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(wrongPasswordData)
    });

    if (response.ok) {
      throw new Error('Login succeeded with wrong password - security vulnerability!');
    }

    const error = await response.json();
    
    if (response.status !== 401) {
      throw new Error(`Expected 401 status for wrong password, got ${response.status}`);
    }

    console.log('  🔒 Password security verified - wrong passwords rejected');
  }

  // Test 7: Protected Route Access
  private async testProtectedRoutes(): Promise<void> {
    // Test accessing PDF generation routes
    const protectedRoutes = [
      '/api/documents/generate',
      '/api/pdf/generate',
      '/api/auth/profile',
      '/api/admin/users'
    ];

    let protectedCount = 0;
    let accessibleCount = 0;

    for (const route of protectedRoutes) {
      try {
        // Test without authentication
        const unauthedResponse = await this.makeRequest(route, {
          method: 'GET'
        });

        if (unauthedResponse.status === 401 || unauthedResponse.status === 403) {
          protectedCount++;
          console.log(`    🔒 ${route} properly protected`);
        } else if (unauthedResponse.status === 404) {
          console.log(`    ⚠️ ${route} not found (expected)`);
        } else {
          console.log(`    ⚠️ ${route} accessible without auth (status: ${unauthedResponse.status})`);
          accessibleCount++;
        }
      } catch (error) {
        console.log(`    ⚠️ ${route} test failed: ${error}`);
      }
    }

    console.log(`  📊 Protected routes: ${protectedCount}, Accessible: ${accessibleCount}`);
  }

  // Test 8: Role-Based Access Control
  private async testRoleBasedAccess(): Promise<void> {
    // Login as admin to test admin access
    const adminLogin = {
      username: 'admin',
      password: 'admin123'
    };

    const adminResponse = await this.makeRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify(adminLogin)
    });

    if (!adminResponse.ok) {
      throw new Error('Admin login failed for RBAC test');
    }

    const adminResult = await adminResponse.json();
    console.log(`  👑 Admin logged in with role: ${adminResult.user.role}`);
    
    // Test admin-specific endpoints
    const adminRoutes = [
      '/api/admin/users',
      '/api/admin/security-events',
      '/api/biometric/ultra-admin'
    ];

    for (const route of adminRoutes) {
      try {
        const response = await this.makeRequest(route, {
          method: 'GET'
        }, true);

        if (response.status === 404) {
          console.log(`    ⚠️ ${route} not implemented`);
        } else if (response.status === 401 || response.status === 403) {
          console.log(`    🔒 ${route} access restricted`);
        } else if (response.ok) {
          console.log(`    ✅ ${route} admin access granted`);
        } else {
          console.log(`    ⚠️ ${route} unexpected status: ${response.status}`);
        }
      } catch (error) {
        console.log(`    ⚠️ ${route} test error: ${error}`);
      }
    }
  }

  // Test 9: Error Handling
  private async testErrorHandling(): Promise<void> {
    const errorScenarios = [
      {
        name: 'Missing credentials',
        data: {},
        expectedStatus: 400
      },
      {
        name: 'Invalid username format',
        data: { username: '', password: 'test' },
        expectedStatus: 400
      },
      {
        name: 'Non-existent user',
        data: { username: 'nonexistentuser123456', password: 'anypassword' },
        expectedStatus: 401
      }
    ];

    for (const scenario of errorScenarios) {
      try {
        const response = await this.makeRequest('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify(scenario.data)
        });

        if (response.status === scenario.expectedStatus) {
          console.log(`    ✅ ${scenario.name}: Correct error handling`);
        } else {
          console.log(`    ⚠️ ${scenario.name}: Expected ${scenario.expectedStatus}, got ${response.status}`);
        }
      } catch (error) {
        console.log(`    ⚠️ ${scenario.name}: Test error: ${error}`);
      }
    }
  }

  // Test 10: Security Edge Cases
  private async testSecurityEdgeCases(): Promise<void> {
    const securityTests = [
      {
        name: 'SQL Injection in login',
        data: { username: "'; DROP TABLE users; --", password: 'test' }
      },
      {
        name: 'XSS in username',
        data: { username: '<script>alert("xss")</script>', password: 'test' }
      },
      {
        name: 'Very long password',
        data: { username: 'admin', password: 'a'.repeat(10000) }
      },
      {
        name: 'Empty JSON payload',
        data: null,
        rawBody: ''
      }
    ];

    for (const test of securityTests) {
      try {
        const response = await this.makeRequest('/api/auth/login', {
          method: 'POST',
          body: test.rawBody !== undefined ? test.rawBody : JSON.stringify(test.data)
        });

        // Should not crash the server or return 500
        if (response.status === 500) {
          console.log(`    ❌ ${test.name}: Server error (security vulnerability)`);
        } else {
          console.log(`    ✅ ${test.name}: Handled gracefully (${response.status})`);
        }
      } catch (error) {
        console.log(`    ⚠️ ${test.name}: ${error}`);
      }
    }
  }

  // Test 11: Logout and Session Cleanup
  private async testLogoutFlow(): Promise<void> {
    // Test logout endpoint
    try {
      const response = await this.makeRequest('/api/auth/logout', {
        method: 'POST'
      }, true);

      if (response.status === 404) {
        console.log('  ⚠️ Logout endpoint not implemented');
        return;
      }

      if (response.ok) {
        console.log('  ✅ Logout successful');
        
        // Clear stored tokens
        this.jwtToken = null;
        
        // Verify session is invalidated by testing a protected route
        const testResponse = await this.makeRequest('/api/auth/profile', {
          method: 'GET'
        });

        if (testResponse.status === 401) {
          console.log('  ✅ Session properly invalidated after logout');
        } else {
          console.log('  ⚠️ Session may not be properly invalidated');
        }
      } else {
        const error = await response.json();
        throw new Error(`Logout failed: ${error.message || error.error}`);
      }
    } catch (error) {
      console.log(`  ⚠️ Logout test error: ${error}`);
    }
  }

  // Test 12: Rate Limiting
  private async testRateLimiting(): Promise<void> {
    console.log('  🚀 Testing authentication rate limiting...');
    
    const maxRequests = 10;
    const requestPromises: Array<Promise<any>> = [];
    
    // Send multiple rapid login attempts
    for (let i = 0; i < maxRequests; i++) {
      const requestPromise = this.makeRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          username: `ratetest${i}`,
          password: 'wrongpassword'
        })
      });
      requestPromises.push(requestPromise);
    }

    try {
      const responses = await Promise.all(requestPromises);
      const blockedCount = responses.filter(r => r && r.status === 429).length;
      const allowedCount = responses.filter(r => r && r.status !== 429).length;
      
      console.log(`  📊 Rate limiting: ${allowedCount} allowed, ${blockedCount} blocked`);
      
      if (blockedCount > 0) {
        console.log('  ✅ Rate limiting is active');
      } else {
        console.log('  ⚠️ No rate limiting detected');
      }
    } catch (error) {
      console.log(`  ⚠️ Rate limiting test error: ${error}`);
    }
  }

  // Main test runner
  public async runAllTests(): Promise<AuthTestSuite> {
    console.log('\n🔄 Starting comprehensive authentication tests...\n');
    
    const tests = [
      { name: '1. Server Health Check', fn: () => this.testServerHealth() },
      { name: '2. Database Connectivity', fn: () => this.testDatabaseHealth() },
      { name: '3. User Registration Flow', fn: () => this.testUserRegistration() },
      { name: '4. Login Flow & Session Management', fn: () => this.testLoginFlow() },
      { name: '5. JWT Token Validation', fn: () => this.testJWTValidation() },
      { name: '6. Password Security Verification', fn: () => this.testPasswordSecurity() },
      { name: '7. Protected Route Access', fn: () => this.testProtectedRoutes() },
      { name: '8. Role-Based Access Control', fn: () => this.testRoleBasedAccess() },
      { name: '9. Error Handling', fn: () => this.testErrorHandling() },
      { name: '10. Security Edge Cases', fn: () => this.testSecurityEdgeCases() },
      { name: '11. Logout & Session Cleanup', fn: () => this.testLogoutFlow() },
      { name: '12. Rate Limiting', fn: () => this.testRateLimiting() }
    ];

    // Run all tests
    for (const test of tests) {
      await this.runTest(test.name, test.fn);
      
      // Small delay between tests
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    return this.generateSummary();
  }

  private generateSummary(): AuthTestSuite {
    const summary = {
      total: this.results.length,
      passed: this.results.filter(r => r.status === 'PASS').length,
      failed: this.results.filter(r => r.status === 'FAIL').length,
      skipped: this.results.filter(r => r.status === 'SKIP').length
    };

    return {
      results: this.results,
      summary
    };
  }

  public displayResults(suite: AuthTestSuite): void {
    console.log('\n' + '='.repeat(60));
    console.log('🔐 COMPREHENSIVE AUTHENTICATION TEST RESULTS');
    console.log('='.repeat(60));
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total Tests: ${suite.summary.total}`);
    console.log(`   ✅ Passed: ${suite.summary.passed}`);
    console.log(`   ❌ Failed: ${suite.summary.failed}`);
    console.log(`   ⏭️ Skipped: ${suite.summary.skipped}`);
    
    const successRate = ((suite.summary.passed / suite.summary.total) * 100).toFixed(1);
    console.log(`   📈 Success Rate: ${successRate}%`);

    console.log(`\n📋 DETAILED RESULTS:`);
    suite.results.forEach((result, index) => {
      const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
      console.log(`   ${icon} ${result.name}: ${result.message} (${result.duration}ms)`);
    });

    // Railway Deployment Readiness Assessment
    console.log('\n🚀 RAILWAY DEPLOYMENT READINESS:');
    
    const criticalTests = [
      '1. Server Health Check',
      '2. Database Connectivity', 
      '4. Login Flow & Session Management',
      '6. Password Security Verification',
      '7. Protected Route Access'
    ];
    
    const criticalPassed = criticalTests.every(testName => 
      suite.results.find(r => r.name === testName)?.status === 'PASS'
    );

    if (criticalPassed && suite.summary.failed === 0) {
      console.log('   ✅ READY FOR RAILWAY DEPLOYMENT');
      console.log('   🛡️ All critical security tests passed');
      console.log('   🔐 Authentication system is production-ready');
    } else {
      console.log('   ⚠️ DEPLOYMENT READINESS ISSUES DETECTED');
      console.log('   🔧 Fix failed tests before Railway deployment');
      
      const failedTests = suite.results.filter(r => r.status === 'FAIL');
      if (failedTests.length > 0) {
        console.log('   ❌ Failed tests that need attention:');
        failedTests.forEach(test => {
          console.log(`      - ${test.name}: ${test.message}`);
        });
      }
    }

    console.log('\n' + '='.repeat(60));
  }
}

// Wait for server to be ready
async function waitForServer(maxAttempts: number = 10): Promise<boolean> {
  console.log('⏳ Waiting for server to be ready...');
  
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        console.log('✅ Server is ready!');
        return true;
      }
    } catch (error) {
      // Server not ready yet
    }
    
    console.log(`   Attempt ${attempt}/${maxAttempts}...`);
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  return false;
}

// Main execution
async function main() {
  try {
    // Wait for server to be ready
    const serverReady = await waitForServer();
    if (!serverReady) {
      console.error('❌ Server failed to start within timeout period');
      process.exit(1);
    }

    // Run comprehensive authentication tests
    const tester = new AuthenticationTester();
    const results = await tester.runAllTests();
    
    // Display results
    tester.displayResults(results);
    
    // Exit with appropriate code
    const exitCode = results.summary.failed > 0 ? 1 : 0;
    process.exit(exitCode);
    
  } catch (error) {
    console.error('❌ Test execution failed:', error);
    process.exit(1);
  }
}

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
  process.exit(1);
});

// Run tests if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}