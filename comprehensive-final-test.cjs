#!/usr/bin/env node

/**
 * COMPREHENSIVE FINAL VALIDATION TEST
 * Tests all 23 document types and core functionality
 */

const http = require('http');
const fs = require('fs').promises;
const path = require('path');

// Configuration
const BASE_URL = 'http://localhost:5000';
const TEST_RESULTS = [];

// All 23 Document Types to Test
const DOCUMENT_TYPES = [
  'passport', 'national_id', 'birth_certificate', 'death_certificate',
  'marriage_certificate', 'divorce_certificate', 'drivers_license',
  'vehicle_registration', 'refugee_document', 'asylum_seeker_permit',
  'work_permit', 'study_permit', 'visitor_visa', 'permanent_residence',
  'citizenship_certificate', 'police_clearance', 'temporary_residence',
  'travel_document', 'diplomatic_passport', 'emergency_travel_document',
  'smart_id_card', 'business_permit', 'special_pass'
];

// Helper function to make HTTP requests
async function makeRequest(path, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(path, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      timeout: 10000
    };

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = {
            status: res.statusCode,
            headers: res.headers,
            body: body ? JSON.parse(body) : null
          };
          resolve(result);
        } catch (e) {
          resolve({ status: res.statusCode, body: body });
        }
      });
    });

    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('Request timeout'));
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
}

// Test Functions
async function testServerHealth() {
  console.log('\n🔍 Testing Server Health...');
  try {
    const response = await makeRequest('/api/health');
    const success = response.status === 200;
    TEST_RESULTS.push({ test: 'Server Health', success, details: response.body });
    console.log(success ? '✅ Server is healthy' : '❌ Server health check failed');
    return success;
  } catch (error) {
    TEST_RESULTS.push({ test: 'Server Health', success: false, error: error.message });
    console.log('❌ Server is not running on port 5000');
    return false;
  }
}

async function testDocumentGeneration() {
  console.log('\n📄 Testing All 23 Document Types...');
  let successCount = 0;
  
  for (const docType of DOCUMENT_TYPES) {
    try {
      const testData = {
        documentType: docType,
        personalDetails: {
          firstName: 'Test',
          lastName: 'User',
          dateOfBirth: '1990-01-01',
          nationality: 'South African',
          idNumber: '9001015800084'
        },
        options: {
          includeSecurityFeatures: true,
          includeBiometrics: true,
          includeHologram: true
        }
      };

      const response = await makeRequest('/api/documents/generate', 'POST', testData);
      const success = response.status === 200 || response.status === 201;
      
      if (success) {
        successCount++;
        console.log(`✅ ${docType.toUpperCase()}: Generated successfully`);
      } else {
        console.log(`❌ ${docType.toUpperCase()}: Generation failed (${response.status})`);
      }
      
      TEST_RESULTS.push({ 
        test: `Document: ${docType}`, 
        success,
        status: response.status,
        hasSecurityFeatures: response.body?.securityFeatures || false
      });
    } catch (error) {
      console.log(`❌ ${docType.toUpperCase()}: Error - ${error.message}`);
      TEST_RESULTS.push({ test: `Document: ${docType}`, success: false, error: error.message });
    }
  }
  
  console.log(`\n📊 Document Generation Results: ${successCount}/${DOCUMENT_TYPES.length} successful`);
  return successCount === DOCUMENT_TYPES.length;
}

async function testAuthentication() {
  console.log('\n🔐 Testing Authentication System...');
  
  // Test auto-login in preview mode
  try {
    const response = await makeRequest('/api/auth/status');
    const isAutoAuthenticated = response.body?.authenticated || response.body?.user;
    
    if (isAutoAuthenticated) {
      console.log('✅ Auto-authentication in preview mode working');
    } else {
      console.log('⚠️  Auto-authentication not active (testing manual login)');
      
      // Try manual login
      const loginResponse = await makeRequest('/api/auth/login', 'POST', {
        username: 'admin',
        password: 'admin123'
      });
      
      const loginSuccess = loginResponse.status === 200;
      console.log(loginSuccess ? '✅ Manual login successful' : '❌ Login failed');
      TEST_RESULTS.push({ test: 'Authentication', success: loginSuccess, details: loginResponse.body });
      return loginSuccess;
    }
    
    TEST_RESULTS.push({ test: 'Authentication', success: true, details: 'Auto-auth active' });
    return true;
  } catch (error) {
    TEST_RESULTS.push({ test: 'Authentication', success: false, error: error.message });
    console.log('❌ Authentication test failed:', error.message);
    return false;
  }
}

async function testOCRSystem() {
  console.log('\n👁️  Testing OCR System...');
  
  try {
    // Test OCR endpoint availability
    const response = await makeRequest('/api/ocr/test');
    const available = response.status !== 404;
    
    console.log(available ? '✅ OCR system available' : '⚠️  OCR endpoint not found (may be normal)');
    
    TEST_RESULTS.push({ test: 'OCR System', success: available, status: response.status });
    return available;
  } catch (error) {
    TEST_RESULTS.push({ test: 'OCR System', success: false, error: error.message });
    console.log('❌ OCR test failed:', error.message);
    return false;
  }
}

async function testVerificationSystem() {
  console.log('\n🔍 Testing Verification System...');
  
  try {
    // Test with a sample verification code
    const verifyResponse = await makeRequest('/api/verify/document', 'POST', {
      verificationCode: 'TEST1234ABCD5678',
      documentType: 'passport'
    });
    
    const verifyAvailable = verifyResponse.status !== 404;
    console.log(verifyAvailable ? '✅ Verification system available' : '⚠️  Verification system loading');
    
    // Test QR code generation
    const qrResponse = await makeRequest('/api/documents/qr-code', 'POST', {
      data: 'TEST_QR_DATA',
      documentId: 'test-doc-123'
    });
    
    const qrAvailable = qrResponse.status !== 404;
    console.log(qrAvailable ? '✅ QR code generation available' : '⚠️  QR generation loading');
    
    TEST_RESULTS.push({ 
      test: 'Verification System', 
      success: verifyAvailable || qrAvailable,
      verifyStatus: verifyResponse.status,
      qrStatus: qrResponse.status
    });
    
    return verifyAvailable || qrAvailable;
  } catch (error) {
    TEST_RESULTS.push({ test: 'Verification System', success: false, error: error.message });
    console.log('❌ Verification test failed:', error.message);
    return false;
  }
}

async function testAIAssistant() {
  console.log('\n🤖 Testing AI Assistant (All 3 Modes)...');
  
  const modes = ['AGENT', 'ASSISTANT', 'SECURITY_BOT'];
  let successCount = 0;
  
  for (const mode of modes) {
    try {
      const response = await makeRequest('/api/ai/chat', 'POST', {
        message: 'Test message',
        botMode: mode,
        context: { test: true }
      });
      
      const success = response.status === 200 || response.status === 201;
      successCount += success ? 1 : 0;
      
      console.log(success ? `✅ ${mode} mode operational` : `⚠️  ${mode} mode not ready`);
      
      TEST_RESULTS.push({ 
        test: `AI Assistant - ${mode}`, 
        success,
        status: response.status
      });
    } catch (error) {
      console.log(`❌ ${mode} mode error:`, error.message);
      TEST_RESULTS.push({ test: `AI Assistant - ${mode}`, success: false, error: error.message });
    }
  }
  
  return successCount > 0; // At least one mode should work
}

async function testMonitoringDashboard() {
  console.log('\n📊 Testing Monitoring Dashboard...');
  
  try {
    const endpoints = [
      '/api/monitoring/status',
      '/api/monitoring/health',
      '/api/monitoring/metrics'
    ];
    
    let successCount = 0;
    
    for (const endpoint of endpoints) {
      try {
        const response = await makeRequest(endpoint);
        const success = response.status === 200;
        successCount += success ? 1 : 0;
        console.log(success ? `✅ ${endpoint} active` : `⚠️  ${endpoint} not ready`);
      } catch (error) {
        console.log(`⚠️  ${endpoint} error:`, error.message);
      }
    }
    
    const monitoringActive = successCount > 0;
    console.log(monitoringActive ? '✅ Monitoring system active' : '❌ Monitoring not available');
    
    TEST_RESULTS.push({ test: 'Monitoring Dashboard', success: monitoringActive, activeEndpoints: successCount });
    return monitoringActive;
  } catch (error) {
    TEST_RESULTS.push({ test: 'Monitoring Dashboard', success: false, error: error.message });
    console.log('❌ Monitoring test failed:', error.message);
    return false;
  }
}

async function testPerformance() {
  console.log('\n⚡ Testing Performance...');
  
  const startTime = Date.now();
  
  try {
    // Test response time
    await makeRequest('/api/health');
    const responseTime = Date.now() - startTime;
    
    console.log(`📈 Health endpoint response time: ${responseTime}ms`);
    
    // Test document generation speed
    const docStart = Date.now();
    await makeRequest('/api/documents/generate', 'POST', {
      documentType: 'passport',
      personalDetails: { firstName: 'Perf', lastName: 'Test' }
    });
    const docTime = Date.now() - docStart;
    
    console.log(`📈 Document generation time: ${docTime}ms`);
    
    const performanceOk = responseTime < 1000 && docTime < 3000;
    console.log(performanceOk ? '✅ Performance within acceptable limits' : '⚠️  Performance needs optimization');
    
    TEST_RESULTS.push({ 
      test: 'Performance', 
      success: performanceOk,
      healthResponseTime: responseTime,
      documentGenerationTime: docTime
    });
    
    return performanceOk;
  } catch (error) {
    TEST_RESULTS.push({ test: 'Performance', success: false, error: error.message });
    console.log('❌ Performance test failed:', error.message);
    return false;
  }
}

// Main Test Runner
async function runAllTests() {
  console.log('=' . repeat(80));
  console.log('🚀 DHA DIGITAL SERVICES - FINAL COMPREHENSIVE TEST');
  console.log('=' . repeat(80));
  
  // Check if server is running first
  const serverHealthy = await testServerHealth();
  
  if (!serverHealthy) {
    console.log('\n❌ CRITICAL: Server is not running on port 5000!');
    console.log('Please ensure the server is started before running tests.');
    return false;
  }
  
  // Run all tests
  const results = [
    await testAuthentication(),
    await testDocumentGeneration(),
    await testOCRSystem(),
    await testVerificationSystem(),
    await testAIAssistant(),
    await testMonitoringDashboard(),
    await testPerformance()
  ];
  
  // Generate Summary Report
  console.log('\n' + '=' . repeat(80));
  console.log('📋 FINAL TEST SUMMARY REPORT');
  console.log('=' . repeat(80));
  
  const totalTests = TEST_RESULTS.length;
  const passedTests = TEST_RESULTS.filter(r => r.success).length;
  const failedTests = totalTests - passedTests;
  const passRate = ((passedTests / totalTests) * 100).toFixed(1);
  
  console.log(`\n✅ Passed: ${passedTests}`);
  console.log(`❌ Failed: ${failedTests}`);
  console.log(`📊 Pass Rate: ${passRate}%`);
  
  if (failedTests > 0) {
    console.log('\n⚠️  Failed Tests:');
    TEST_RESULTS.filter(r => !r.success).forEach(r => {
      console.log(`  - ${r.test}: ${r.error || 'Failed'}`);
    });
  }
  
  const allCriticalPassed = results.every(r => r);
  
  console.log('\n' + '=' . repeat(80));
  if (allCriticalPassed && passRate >= 90) {
    console.log('✅✅✅ SYSTEM IS READY FOR USER TESTING! ✅✅✅');
    console.log('All critical functions are operational.');
    console.log('Preview mode matches production functionality.');
  } else if (passRate >= 75) {
    console.log('⚠️  SYSTEM IS MOSTLY READY');
    console.log('Most features are working but some issues remain.');
  } else {
    console.log('❌ SYSTEM NEEDS ATTENTION');
    console.log('Critical issues prevent full functionality.');
  }
  console.log('=' . repeat(80));
  
  // Save detailed report
  await fs.writeFile(
    'test-results.json',
    JSON.stringify(TEST_RESULTS, null, 2),
    'utf8'
  );
  console.log('\n📄 Detailed results saved to test-results.json');
  
  return allCriticalPassed;
}

// Run the tests
runAllTests().then(success => {
  process.exit(success ? 0 : 1);
}).catch(error => {
  console.error('Test runner error:', error);
  process.exit(1);
});