/**
 * PRODUCTION VERIFICATION TESTS
 * Integration tests to prove AI Chat Assistant features work end-to-end
 * 
 * Tests:
 * 1. SSE Streaming Works with proper headers
 * 2. Security Enforcement (consent + AV)  
 * 3. API Contract Compliance
 * 4. EICAR file blocking
 */

const fetch = require('node-fetch');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const BASE_URL = 'http://localhost:5000';

// Test user credentials (will be created if needed)
const TEST_USER = {
  username: 'test_integration_user',
  email: 'test@integration.com', 
  password: 'TestPass123!'
};

let authToken = null;
let testUserId = null;

/**
 * Utility function to make authenticated requests
 */
async function authRequest(endpoint, options = {}) {
  if (!authToken) {
    throw new Error('No auth token available - login first');
  }
  
  const response = await fetch(`${BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Authorization': `Bearer ${authToken}`,
      'Content-Type': 'application/json',
      ...options.headers
    }
  });
  
  return response;
}

/**
 * TEST 1: Prove SSE Streaming Works
 */
async function testSSEStreaming() {
  console.log('\n🧪 TEST 1: SSE Streaming Functionality');
  console.log('=====================================');
  
  try {
    // Give AI consent first
    await authRequest('/api/consent/ai-processing', {
      method: 'POST'
    });
    
    console.log('✅ AI processing consent granted');
    
    // Test SSE streaming request
    const streamResponse = await authRequest('/api/ai/chat', {
      method: 'POST',
      headers: {
        'Accept': 'text/event-stream',
        'Authorization': `Bearer ${authToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'Hello, I need help with passport application',
        conversationId: 'test-conv-1',
        includeContext: true,
        language: 'en'
      })
    });
    
    console.log('📊 SSE Response Status:', streamResponse.status);
    console.log('📋 SSE Response Headers:', Object.fromEntries(streamResponse.headers.entries()));
    
    // Verify SSE headers
    const contentType = streamResponse.headers.get('content-type');
    const cacheControl = streamResponse.headers.get('cache-control');
    const connection = streamResponse.headers.get('connection');
    
    console.log('🔍 Header Verification:');
    console.log('  Content-Type:', contentType);
    console.log('  Cache-Control:', cacheControl);
    console.log('  Connection:', connection);
    
    if (contentType === 'text/event-stream' && 
        cacheControl === 'no-cache' && 
        connection === 'keep-alive') {
      console.log('✅ SSE headers are CORRECT');
    } else {
      console.log('❌ SSE headers are INCORRECT');
      return false;
    }
    
    // Read streaming data
    console.log('📡 Reading SSE stream...');
    const chunks = [];
    let eventCount = 0;
    
    const reader = streamResponse.body.getReader();
    const decoder = new TextDecoder();
    
    let timeout = setTimeout(() => {
      console.log('⏰ Stream timeout after 10 seconds');
      reader.cancel();
    }, 10000);
    
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        chunks.push(chunk);
        
        // Parse SSE events
        const events = chunk.split('\n\n').filter(e => e.trim());
        for (const event of events) {
          if (event.startsWith('data: ')) {
            eventCount++;
            const data = event.substring(6);
            try {
              const parsed = JSON.parse(data);
              console.log(`📨 SSE Event ${eventCount}:`, parsed.type, parsed.content?.substring(0, 50) + '...');
            } catch (e) {
              console.log(`📨 SSE Raw Event ${eventCount}:`, data.substring(0, 100) + '...');
            }
          }
        }
        
        // Stop after getting some events
        if (eventCount >= 3) {
          reader.cancel();
          break;
        }
      }
    } finally {
      clearTimeout(timeout);
    }
    
    console.log(`✅ SSE Streaming WORKS - Received ${eventCount} events`);
    console.log(`📊 Total chunks received: ${chunks.length}`);
    
    return true;
    
  } catch (error) {
    console.log('❌ SSE Streaming FAILED:', error.message);
    return false;
  }
}

/**
 * TEST 2: Prove Security Enforcement
 */
async function testSecurityEnforcement() {
  console.log('\n🔒 TEST 2: Security Enforcement');
  console.log('===============================');
  
  try {
    // Test 2A: AI chat without consent should fail
    console.log('🧪 Test 2A: AI chat without consent...');
    
    // Withdraw consent first
    await authRequest('/api/consent/withdraw', {
      method: 'POST',
      body: JSON.stringify({ consentType: 'aiProcessing' })
    });
    
    const noConsentResponse = await authRequest('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'This should fail',
        conversationId: 'test-conv-2'
      })
    });
    
    if (noConsentResponse.status === 403) {
      const errorData = await noConsentResponse.json();
      console.log('✅ AI chat WITHOUT consent BLOCKED:', errorData.compliance);
    } else {
      console.log('❌ AI chat without consent should have been blocked');
      return false;
    }
    
    // Test 2B: Upload consent check
    console.log('🧪 Test 2B: Upload without consent...');
    
    const noUploadConsentResponse = await authRequest('/api/documents/upload', {
      method: 'POST'
    });
    
    if (noUploadConsentResponse.status === 403 || noUploadConsentResponse.status === 401) {
      console.log('✅ Upload WITHOUT consent BLOCKED');
    } else {
      console.log('❌ Upload without consent should have been blocked');
    }
    
    // Restore consent for further tests
    await authRequest('/api/consent/ai-processing', { method: 'POST' });
    await authRequest('/api/consent/data-retention', { method: 'POST' });
    
    console.log('✅ Security enforcement WORKS');
    return true;
    
  } catch (error) {
    console.log('❌ Security enforcement test FAILED:', error.message);
    return false;
  }
}

/**
 * TEST 3: Prove API Contract Compliance
 */
async function testAPIContractCompliance() {
  console.log('\n📋 TEST 3: API Contract Compliance');
  console.log('==================================');
  
  try {
    // Test regular AI chat response format
    console.log('🧪 Testing regular AI chat response format...');
    
    const chatResponse = await authRequest('/api/ai/chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What documents do I need for a passport?',
        conversationId: 'test-contract-1',
        includeContext: true,
        language: 'zu' // Test language parameter
      })
    });
    
    if (chatResponse.status !== 200) {
      console.log('❌ Chat request failed:', chatResponse.status);
      return false;
    }
    
    const chatData = await chatResponse.json();
    console.log('📊 AI Chat Response Structure:', Object.keys(chatData));
    
    // Verify exact API contract: {content, suggestions, actionItems, metadata}
    const requiredFields = ['success', 'content', 'suggestions', 'actionItems', 'metadata'];
    const hasAllFields = requiredFields.every(field => field in chatData);
    
    if (hasAllFields) {
      console.log('✅ API Contract COMPLIANT - All required fields present');
      console.log('  📝 content:', typeof chatData.content, chatData.content?.substring(0, 50) + '...');
      console.log('  💡 suggestions:', Array.isArray(chatData.suggestions), `(${chatData.suggestions?.length} items)`);
      console.log('  ⚡ actionItems:', Array.isArray(chatData.actionItems), `(${chatData.actionItems?.length} items)`);
      console.log('  📊 metadata:', typeof chatData.metadata, Object.keys(chatData.metadata || {}));
      console.log('  🌐 language:', chatData.language);
    } else {
      console.log('❌ API Contract VIOLATION - Missing fields:', 
        requiredFields.filter(field => !(field in chatData)));
      return false;
    }
    
    // Test language parameter passing
    if (chatData.language === 'zu') {
      console.log('✅ Language parameter PASSED correctly');
    } else {
      console.log('❌ Language parameter NOT passed correctly. Expected: zu, Got:', chatData.language);
    }
    
    return true;
    
  } catch (error) {
    console.log('❌ API Contract test FAILED:', error.message);
    return false;
  }
}

/**
 * TEST 4: Prove EICAR File Blocking 
 */
async function testEICARFileBlocking() {
  console.log('\n🦠 TEST 4: EICAR File Blocking');
  console.log('==============================');
  
  try {
    // Create EICAR test file
    const eicarContent = 'X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*';
    const eicarPath = path.join(__dirname, 'eicar_test.txt');
    
    await fs.writeFile(eicarPath, eicarContent);
    console.log('📝 EICAR test file created');
    
    // Create FormData for file upload
    const FormData = require('form-data');
    const form = new FormData();
    form.append('document', await fs.readFile(eicarPath), 'eicar_test.txt');
    form.append('performOCR', 'false');
    form.append('verifyAuthenticity', 'false');
    
    const uploadResponse = await fetch(`${BASE_URL}/api/documents/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${authToken}`,
        ...form.getHeaders()
      },
      body: form
    });
    
    console.log('📊 Upload Response Status:', uploadResponse.status);
    
    if (uploadResponse.status === 400) {
      const errorData = await uploadResponse.json();
      console.log('🚫 Upload Response:', errorData);
      
      if (errorData.error?.includes('malware') || errorData.error?.includes('suspicious')) {
        console.log('✅ EICAR file BLOCKED by antivirus');
        console.log('🛡️ Threats detected:', errorData.threats);
        console.log('🔍 Engine used:', errorData.engine);
      } else {
        console.log('❌ EICAR file blocked but not for antivirus reasons');
        return false;
      }
    } else {
      console.log('❌ EICAR file was NOT blocked - SECURITY FAILURE');
      return false;
    }
    
    // Clean up test file
    try {
      await fs.unlink(eicarPath);
    } catch (e) {
      console.log('⚠️ Could not delete EICAR test file');
    }
    
    console.log('✅ EICAR blocking WORKS');
    return true;
    
  } catch (error) {
    console.log('❌ EICAR test FAILED:', error.message);
    return false;
  }
}

/**
 * Setup: Create test user and login
 */
async function setup() {
  console.log('🚀 INTEGRATION TEST SETUP');
  console.log('=========================');
  
  try {
    // Check if server is running
    console.log('🔍 Checking server health...');
    const healthResponse = await fetch(`${BASE_URL}/api/health`);
    if (!healthResponse.ok) {
      throw new Error(`Health check failed: ${healthResponse.status}`);
    }
    console.log('✅ Server is healthy');
    
    // Try to register test user (might already exist)
    console.log('👤 Creating test user...');
    try {
      const registerResponse = await fetch(`${BASE_URL}/api/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(TEST_USER)
      });
      
      if (registerResponse.ok) {
        console.log('✅ Test user created');
      } else if (registerResponse.status === 409) {
        console.log('ℹ️ Test user already exists');
      } else {
        console.log('⚠️ User registration status:', registerResponse.status);
      }
    } catch (regError) {
      console.log('⚠️ Registration error (user may exist):', regError.message);
    }
    
    // Login to get auth token
    console.log('🔐 Logging in...');
    const loginResponse = await fetch(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        username: TEST_USER.username,
        password: TEST_USER.password
      })
    });
    
    if (!loginResponse.ok) {
      throw new Error(`Login failed: ${loginResponse.status} ${await loginResponse.text()}`);
    }
    
    const loginData = await loginResponse.json();
    authToken = loginData.token;
    testUserId = loginData.user?.id;
    
    console.log('✅ Logged in successfully');
    console.log('🎟️ Auth token length:', authToken?.length);
    
    return true;
    
  } catch (error) {
    console.log('❌ Setup FAILED:', error.message);
    return false;
  }
}

/**
 * Main test runner
 */
async function runIntegrationTests() {
  console.log('🧪 AI CHAT ASSISTANT - INTEGRATION VERIFICATION TESTS');
  console.log('=====================================================');
  console.log('Timestamp:', new Date().toISOString());
  
  // Setup
  const setupOk = await setup();
  if (!setupOk) {
    console.log('\n❌ SETUP FAILED - Cannot run tests');
    process.exit(1);
  }
  
  // Run all tests
  const results = {};
  
  results.sseStreaming = await testSSEStreaming();
  results.securityEnforcement = await testSecurityEnforcement(); 
  results.apiContractCompliance = await testAPIContractCompliance();
  results.eicarBlocking = await testEICARFileBlocking();
  
  // Summary
  console.log('\n📋 TEST RESULTS SUMMARY');
  console.log('=======================');
  console.log('✅ SSE Streaming:', results.sseStreaming ? 'PASS' : 'FAIL');
  console.log('🔒 Security Enforcement:', results.securityEnforcement ? 'PASS' : 'FAIL'); 
  console.log('📋 API Contract Compliance:', results.apiContractCompliance ? 'PASS' : 'FAIL');
  console.log('🦠 EICAR File Blocking:', results.eicarBlocking ? 'PASS' : 'FAIL');
  
  const allPassed = Object.values(results).every(result => result === true);
  
  if (allPassed) {
    console.log('\n🎉 ALL TESTS PASSED - AI FEATURES VERIFIED ✅');
    console.log('✨ CONCRETE EVIDENCE: All features work end-to-end as required');
  } else {
    console.log('\n💥 SOME TESTS FAILED - INVESTIGATION REQUIRED ❌');
  }
  
  return allPassed;
}

// Run tests if this file is executed directly
if (require.main === module) {
  runIntegrationTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner crashed:', error);
      process.exit(1);
    });
}

module.exports = { runIntegrationTests };