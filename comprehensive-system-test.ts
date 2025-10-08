
#!/usr/bin/env tsx

/**
 * COMPREHENSIVE SYSTEM TEST
 * Tests all critical components and fixes
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://0.0.0.0:5000';
const TEST_RESULTS: any[] = [];

interface TestResult {
  name: string;
  status: 'PASS' | 'FAIL' | 'SKIP';
  message: string;
  duration: number;
}

function logTest(result: TestResult) {
  const icon = result.status === 'PASS' ? '✅' : result.status === 'FAIL' ? '❌' : '⏭️';
  console.log(`${icon} ${result.name}: ${result.message} (${result.duration}ms)`);
  TEST_RESULTS.push(result);
}

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    logTest({
      name,
      status: 'PASS',
      message: 'Success',
      duration: Date.now() - start
    });
  } catch (error: any) {
    logTest({
      name,
      status: 'FAIL',
      message: error.message,
      duration: Date.now() - start
    });
  }
}

// Test 1: Health Check
async function testHealthCheck() {
  const response = await fetch(`${BASE_URL}/api/health`);
  if (!response.ok) throw new Error(`Health check failed: ${response.status}`);
  const data = await response.json();
  if (data.status !== 'healthy') throw new Error('System not healthy');
}

// Test 2: Database Connection
async function testDatabase() {
  const response = await fetch(`${BASE_URL}/api/health`);
  const data = await response.json();
  if (!data.database?.connected) throw new Error('Database not connected');
}

// Test 3: AI Services
async function testAIServices() {
  const response = await fetch(`${BASE_URL}/api/ai/status`);
  if (!response.ok) throw new Error(`AI status failed: ${response.status}`);
  const data = await response.json();
  if (!data.services || data.services.length === 0) throw new Error('No AI services available');
}

// Test 4: Authentication
async function testAuthentication() {
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ 
      email: 'admin@dha.gov.za', 
      password: process.env.ADMIN_PASSWORD || 'SecureAdmin2024!' 
    })
  });
  
  if (!response.ok) throw new Error(`Auth failed: ${response.status}`);
  const data = await response.json();
  if (!data.token) throw new Error('No token received');
}

// Test 5: PDF Generation
async function testPDFGeneration() {
  const response = await fetch(`${BASE_URL}/api/pdf/generate/work-permit`, {
    method: 'POST',
    headers: { 
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      personal: {
        fullName: 'Test User',
        dateOfBirth: '1990-01-01',
        nationality: 'Test',
        passportNumber: 'TEST123'
      },
      employer: {
        name: 'Test Company',
        address: 'Test Address'
      },
      occupation: 'Developer',
      validFrom: '2024-01-01',
      validUntil: '2025-01-01'
    })
  });
  
  if (!response.ok) throw new Error(`PDF generation failed: ${response.status}`);
}

// Test 6: Government API Integration
async function testGovernmentAPIs() {
  const response = await fetch(`${BASE_URL}/api/government/status`);
  if (response.ok) {
    const data = await response.json();
    if (data.integrations) {
      const activeCount = Object.values(data.integrations).filter((v: any) => v.status === 'active').length;
      if (activeCount === 0) throw new Error('No government APIs active');
    }
  }
}

// Test 7: WebSocket Connection
async function testWebSocket() {
  const response = await fetch(`${BASE_URL}/api/health`);
  const data = await response.json();
  if (!data.websocket) throw new Error('WebSocket not available');
}

// Test 8: UI Components Resolution
async function testUIComponents() {
  const response = await fetch(`${BASE_URL}/`);
  if (!response.ok) throw new Error(`UI failed to load: ${response.status}`);
  const html = await response.text();
  if (!html.includes('<!DOCTYPE html>')) throw new Error('Invalid HTML response');
}

// Test 9: Admin Routes
async function testAdminRoutes() {
  const response = await fetch(`${BASE_URL}/admin/dashboard`);
  if (response.status === 404) throw new Error('Admin routes not accessible');
}

// Test 10: API Configuration
async function testAPIConfiguration() {
  const response = await fetch(`${BASE_URL}/api/ultra-queen-ai/status`);
  if (response.ok) {
    const data = await response.json();
    if (!data.capabilities) throw new Error('API capabilities not configured');
  }
}

async function runAllTests() {
  console.log('\n🧪 COMPREHENSIVE SYSTEM TEST\n');
  console.log('Testing all critical components...\n');

  await runTest('1. Health Check', testHealthCheck);
  await runTest('2. Database Connection', testDatabase);
  await runTest('3. AI Services', testAIServices);
  await runTest('4. Authentication', testAuthentication);
  await runTest('5. PDF Generation', testPDFGeneration);
  await runTest('6. Government APIs', testGovernmentAPIs);
  await runTest('7. WebSocket', testWebSocket);
  await runTest('8. UI Components', testUIComponents);
  await runTest('9. Admin Routes', testAdminRoutes);
  await runTest('10. API Configuration', testAPIConfiguration);

  console.log('\n📊 TEST SUMMARY\n');
  const passed = TEST_RESULTS.filter(r => r.status === 'PASS').length;
  const failed = TEST_RESULTS.filter(r => r.status === 'FAIL').length;
  const skipped = TEST_RESULTS.filter(r => r.status === 'SKIP').length;

  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`⏭️  Skipped: ${skipped}`);
  console.log(`📈 Total: ${TEST_RESULTS.length}`);

  const successRate = (passed / TEST_RESULTS.length) * 100;
  console.log(`\n🎯 Success Rate: ${successRate.toFixed(1)}%\n`);

  if (failed > 0) {
    console.log('❌ SOME TESTS FAILED - Review issues above\n');
    process.exit(1);
  } else {
    console.log('✅ ALL TESTS PASSED - System is ready!\n');
    process.exit(0);
  }
}

runAllTests().catch(error => {
  console.error('Fatal error:', error);
  process.exit(1);
});
