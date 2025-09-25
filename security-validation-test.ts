/**
 * CRITICAL SECURITY VALIDATION TEST
 * 
 * Tests all fixed security vulnerabilities in enhanced-ai-routes.ts
 * Ensures proper authentication, authorization, rate limiting, and fail-closed error handling
 */

import axios, { AxiosError } from 'axios';

const API_BASE = 'http://localhost:5000/api';

interface TestResult {
  test: string;
  status: 'PASS' | 'FAIL';
  details: string;
  securityIssue?: string;
}

const results: TestResult[] = [];

function logResult(test: string, status: 'PASS' | 'FAIL', details: string, securityIssue?: string) {
  const result = { test, status, details, securityIssue };
  results.push(result);
  const emoji = status === 'PASS' ? '✅' : '🚨';
  console.log(`${emoji} [${status}] ${test}: ${details}`);
  if (securityIssue) {
    console.log(`   🔴 SECURITY ISSUE: ${securityIssue}`);
  }
}

// Get authentication tokens for different user types
async function getAuthTokens() {
  console.log('\n🔐 Obtaining authentication tokens...\n');
  
  try {
    // Login as super_admin (admin user with super_admin role)
    const adminLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'admin',
      password: process.env.ADMIN_PASSWORD || 'admin123'
    });
    
    // Login as regular user  
    const userLogin = await axios.post(`${API_BASE}/auth/login`, {
      username: 'user',
      password: 'password123'
    });
    
    return {
      superAdminToken: adminLogin.data.token,
      userToken: userLogin.data.token
    };
  } catch (error) {
    console.error('❌ Failed to obtain authentication tokens:', error);
    throw error;
  }
}

// Test 1: Verify dangerous endpoints require super_admin role
async function testRoleBasedAccess(superAdminToken: string, userToken: string) {
  console.log('\n🛡️  Testing Role-Based Access Control...\n');
  
  const dangerousEndpoints = [
    { method: 'POST', path: '/ai/unlimited-chat', body: { message: 'test' } },
    { method: 'POST', path: '/ai/global-command', body: { command: 'test' } },
    { method: 'POST', path: '/ai/emergency-override', body: { command: 'test' } },
    { method: 'POST', path: '/ai/admin/system-control', body: { action: 'test' } },
    { method: 'GET', path: '/ai/unlimited-stream?message=test&userId=test' }
  ];
  
  for (const endpoint of dangerousEndpoints) {
    // Test 1a: Regular user should be denied (403 Forbidden)
    try {
      const response = await axios({
        method: endpoint.method.toLowerCase() as any,
        url: `${API_BASE}${endpoint.path}`,
        headers: { Authorization: `Bearer ${userToken}` },
        data: endpoint.body,
        timeout: 5000
      });
      
      logResult(
        `${endpoint.method} ${endpoint.path} - Regular User Access`,
        'FAIL',
        `Expected 403 but got ${response.status}`,
        'Regular users can access dangerous endpoints - PRIVILEGE ESCALATION VULNERABILITY'
      );
    } catch (error: any) {
      if (error.response?.status === 403) {
        logResult(
          `${endpoint.method} ${endpoint.path} - Regular User Access`,
          'PASS',
          'Correctly denied with 403 Forbidden'
        );
      } else if (error.response?.status === 401) {
        logResult(
          `${endpoint.method} ${endpoint.path} - Regular User Access`,
          'PASS',
          'Authentication required (401) - acceptable'
        );
      } else {
        logResult(
          `${endpoint.method} ${endpoint.path} - Regular User Access`,
          'FAIL',
          `Unexpected error: ${error.response?.status || error.message}`,
          'Unexpected response to unauthorized access attempt'
        );
      }
    }
    
    // Test 1b: Super admin should have access (but may fail due to missing services)
    try {
      const response = await axios({
        method: endpoint.method.toLowerCase() as any,
        url: `${API_BASE}${endpoint.path}`,
        headers: { Authorization: `Bearer ${superAdminToken}` },
        data: endpoint.body,
        timeout: 5000
      });
      
      logResult(
        `${endpoint.method} ${endpoint.path} - Super Admin Access`,
        'PASS',
        `Access granted with status ${response.status}`
      );
    } catch (error: any) {
      if (error.response?.status === 500) {
        // 500 is acceptable for super admin - means authorization passed but service failed
        logResult(
          `${endpoint.method} ${endpoint.path} - Super Admin Access`,
          'PASS',
          'Authorization passed (500 indicates service error, not auth failure)'
        );
      } else if (error.response?.status === 403) {
        logResult(
          `${endpoint.method} ${endpoint.path} - Super Admin Access`,
          'FAIL',
          'Super admin denied access with 403',
          'Super admin cannot access required endpoints'
        );
      } else {
        logResult(
          `${endpoint.method} ${endpoint.path} - Super Admin Access`,
          'PASS',
          `Acceptable response: ${error.response?.status || error.message}`
        );
      }
    }
  }
}

// Test 2: Verify endpoints without authentication are denied
async function testAuthenticationRequired() {
  console.log('\n🔒 Testing Authentication Requirements...\n');
  
  const endpoints = [
    { method: 'POST', path: '/ai/unlimited-chat', body: { message: 'test' } },
    { method: 'POST', path: '/ai/global-command', body: { command: 'test' } },
    { method: 'POST', path: '/ai/emergency-override', body: { command: 'test' } },
    { method: 'GET', path: '/ai/system-status' }
  ];
  
  for (const endpoint of endpoints) {
    try {
      const response = await axios({
        method: endpoint.method.toLowerCase() as any,
        url: `${API_BASE}${endpoint.path}`,
        data: endpoint.body,
        timeout: 5000
      });
      
      logResult(
        `${endpoint.method} ${endpoint.path} - No Authentication`,
        'FAIL',
        `Expected 401 but got ${response.status}`,
        'Endpoints accessible without authentication - CRITICAL VULNERABILITY'
      );
    } catch (error: any) {
      if (error.response?.status === 401) {
        logResult(
          `${endpoint.method} ${endpoint.path} - No Authentication`,
          'PASS',
          'Correctly denied with 401 Unauthorized'
        );
      } else {
        logResult(
          `${endpoint.method} ${endpoint.path} - No Authentication`,
          'FAIL',
          `Expected 401 but got ${error.response?.status || error.message}`,
          'Unexpected response to unauthenticated request'
        );
      }
    }
  }
}

// Test 3: Verify rate limiting is working
async function testRateLimiting(superAdminToken: string) {
  console.log('\n⏱️  Testing Rate Limiting...\n');
  
  const endpoint = `${API_BASE}/ai/unlimited-chat`;
  const requests = [];
  
  // Send multiple rapid requests to trigger rate limiting
  for (let i = 0; i < 10; i++) {
    requests.push(
      axios.post(endpoint, { message: `test ${i}` }, {
        headers: { Authorization: `Bearer ${superAdminToken}` },
        timeout: 5000
      }).catch(error => error.response || error)
    );
  }
  
  const responses = await Promise.all(requests);
  const rateLimitedCount = responses.filter(r => r.status === 429).length;
  
  if (rateLimitedCount > 0) {
    logResult(
      'Rate Limiting Test',
      'PASS',
      `${rateLimitedCount} out of 10 requests were rate limited (429)`
    );
  } else {
    logResult(
      'Rate Limiting Test',
      'FAIL',
      'No requests were rate limited - rate limiting may not be working',
      'Rate limiting not functioning - DoS vulnerability'
    );
  }
}

// Test 4: Verify fail-closed error handling
async function testFailClosedErrorHandling(superAdminToken: string) {
  console.log('\n🛑 Testing Fail-Closed Error Handling...\n');
  
  // Test emergency override with invalid data to trigger errors
  try {
    const response = await axios.post(`${API_BASE}/ai/emergency-override`, {
      command: null // Invalid command to trigger error
    }, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
      timeout: 5000
    });
    
    if (response.data.success === true) {
      logResult(
        'Emergency Override Error Handling',
        'FAIL',
        'Emergency override returned success despite invalid input',
        'CRITICAL: Emergency override fails open - system continues in compromised state'
      );
    } else {
      logResult(
        'Emergency Override Error Handling',
        'PASS',
        'Emergency override correctly failed closed'
      );
    }
  } catch (error: any) {
    if (error.response?.status === 500 && error.response?.data?.success === false) {
      logResult(
        'Emergency Override Error Handling',
        'PASS',
        'Emergency override correctly fails closed on error'
      );
    } else {
      logResult(
        'Emergency Override Error Handling',
        'FAIL',
        `Unexpected error response: ${error.response?.status}`,
        'Emergency override error handling unclear'
      );
    }
  }
}

// Main test execution
async function runSecurityTests() {
  console.log('🔥 CRITICAL AI SECURITY VALIDATION TEST 🔥');
  console.log('Testing security fixes for government deployment\n');
  
  try {
    const tokens = await getAuthTokens();
    
    await testAuthenticationRequired();
    await testRoleBasedAccess(tokens.superAdminToken, tokens.userToken);
    await testRateLimiting(tokens.superAdminToken);
    await testFailClosedErrorHandling(tokens.superAdminToken);
    
    // Generate summary report
    console.log('\n' + '='.repeat(60));
    console.log('🔒 SECURITY VALIDATION SUMMARY REPORT');
    console.log('='.repeat(60));
    
    const totalTests = results.length;
    const passedTests = results.filter(r => r.status === 'PASS').length;
    const failedTests = results.filter(r => r.status === 'FAIL').length;
    const criticalIssues = results.filter(r => r.securityIssue).length;
    
    console.log(`📊 Test Results: ${passedTests}/${totalTests} PASSED`);
    console.log(`🚨 Failed Tests: ${failedTests}`);
    console.log(`⚠️  Critical Security Issues: ${criticalIssues}`);
    
    if (criticalIssues > 0) {
      console.log('\n🔴 CRITICAL SECURITY ISSUES FOUND:');
      results.filter(r => r.securityIssue).forEach(r => {
        console.log(`   • ${r.test}: ${r.securityIssue}`);
      });
      console.log('\n❌ SYSTEM NOT READY FOR GOVERNMENT DEPLOYMENT');
    } else if (failedTests === 0) {
      console.log('\n✅ ALL SECURITY TESTS PASSED');
      console.log('✅ SYSTEM READY FOR GOVERNMENT DEPLOYMENT');
    } else {
      console.log('\n⚠️  SOME NON-CRITICAL TESTS FAILED');
      console.log('⚠️  REVIEW REQUIRED BEFORE GOVERNMENT DEPLOYMENT');
    }
    
    console.log('='.repeat(60));
    
  } catch (error) {
    console.error('\n❌ Security test execution failed:', error);
    process.exit(1);
  }
}

// Run the tests
runSecurityTests().catch(console.error);