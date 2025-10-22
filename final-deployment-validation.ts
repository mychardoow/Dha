
#!/usr/bin/env tsx

/**
 * FINAL DEPLOYMENT VALIDATION
 * Comprehensive test suite before GitHub push and Render deployment
 */

import fetch from 'node-fetch';

const BASE_URL = 'http://0.0.0.0:5000';
const TIMEOUT = 30000;

interface TestResult {
  category: string;
  test: string;
  status: '✅' | '❌' | '⚠️';
  details: string;
  critical: boolean;
}

const results: TestResult[] = [];
let criticalFailures = 0;

function logResult(result: TestResult) {
  const icon = result.status;
  console.log(`${icon} ${result.category} - ${result.test}: ${result.details}`);
  results.push(result);
  if (result.critical && result.status === '❌') {
    criticalFailures++;
  }
}

async function testWithTimeout<T>(
  fn: () => Promise<T>,
  timeoutMs: number = TIMEOUT
): Promise<T> {
  return Promise.race([
    fn(),
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error('Timeout')), timeoutMs)
    )
  ]);
}

// ============ CORE SYSTEM TESTS ============

async function testCoreSystem() {
  console.log('\n🔧 TESTING CORE SYSTEM\n');

  // Test 1: Server Health
  try {
    const response = await testWithTimeout(() => fetch(`${BASE_URL}/api/health`), 5000);
    const data: any = await response.json();
    
    logResult({
      category: 'Core',
      test: 'Server Health',
      status: response.ok ? '✅' : '❌',
      details: response.ok ? `Status: ${data.status}` : `Failed: ${response.status}`,
      critical: true
    });
  } catch (error: any) {
    logResult({
      category: 'Core',
      test: 'Server Health',
      status: '❌',
      details: error.message,
      critical: true
    });
  }

  // Test 2: Database Connection
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data: any = await response.json();
    
    logResult({
      category: 'Core',
      test: 'Database',
      status: data.database ? '✅' : '❌',
      details: data.database || 'Not connected',
      critical: true
    });
  } catch (error: any) {
    logResult({
      category: 'Core',
      test: 'Database',
      status: '❌',
      details: error.message,
      critical: true
    });
  }

  // Test 3: Environment Config
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data: any = await response.json();
    
    logResult({
      category: 'Core',
      test: 'Environment',
      status: data.environment ? '✅' : '⚠️',
      details: `ENV: ${data.environment || 'unknown'}`,
      critical: false
    });
  } catch (error: any) {
    logResult({
      category: 'Core',
      test: 'Environment',
      status: '⚠️',
      details: error.message,
      critical: false
    });
  }
}

// ============ API ENDPOINTS ============

async function testAPIEndpoints() {
  console.log('\n🌐 TESTING API ENDPOINTS\n');

  const endpoints = [
    { path: '/api/health', method: 'GET', critical: true },
    { path: '/api/ultra-queen-ai/status', method: 'GET', critical: true },
    { path: '/api/documents/types', method: 'GET', critical: true },
    { path: '/api/pdf/health', method: 'GET', critical: false },
  ];

  for (const endpoint of endpoints) {
    try {
      const response = await testWithTimeout(() => 
        fetch(`${BASE_URL}${endpoint.path}`, { method: endpoint.method }), 
        3000
      );
      
      logResult({
        category: 'API',
        test: endpoint.path,
        status: response.ok ? '✅' : '❌',
        details: `${endpoint.method} ${response.status}`,
        critical: endpoint.critical
      });
    } catch (error: any) {
      logResult({
        category: 'API',
        test: endpoint.path,
        status: '❌',
        details: error.message,
        critical: endpoint.critical
      });
    }
  }
}

// ============ AUTHENTICATION ============

async function testAuthentication() {
  console.log('\n🔐 TESTING AUTHENTICATION\n');

  // Test protected routes require auth
  try {
    const response = await fetch(`${BASE_URL}/api/documents/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' }
    });
    
    logResult({
      category: 'Auth',
      test: 'Protected Routes',
      status: response.status === 401 ? '✅' : '❌',
      details: response.status === 401 ? 'Properly protected' : `Unexpected: ${response.status}`,
      critical: true
    });
  } catch (error: any) {
    logResult({
      category: 'Auth',
      test: 'Protected Routes',
      status: '❌',
      details: error.message,
      critical: true
    });
  }
}

// ============ DOCUMENT GENERATION ============

async function testDocumentGeneration() {
  console.log('\n📄 TESTING DOCUMENT GENERATION\n');

  // Test document types available
  try {
    const response = await fetch(`${BASE_URL}/api/documents/types`);
    const data: any = await response.json();
    
    logResult({
      category: 'Documents',
      test: 'Document Types',
      status: Array.isArray(data) && data.length > 0 ? '✅' : '❌',
      details: `${data.length || 0} types available`,
      critical: true
    });
  } catch (error: any) {
    logResult({
      category: 'Documents',
      test: 'Document Types',
      status: '❌',
      details: error.message,
      critical: true
    });
  }

  // Test PDF service
  try {
    const response = await fetch(`${BASE_URL}/api/pdf/health`);
    
    logResult({
      category: 'Documents',
      test: 'PDF Service',
      status: response.ok ? '✅' : '⚠️',
      details: response.ok ? 'Available' : 'Not responding',
      critical: false
    });
  } catch (error: any) {
    logResult({
      category: 'Documents',
      test: 'PDF Service',
      status: '⚠️',
      details: error.message,
      critical: false
    });
  }
}

// ============ AI SERVICES ============

async function testAIServices() {
  console.log('\n🤖 TESTING AI SERVICES\n');

  try {
    const response = await fetch(`${BASE_URL}/api/ultra-queen-ai/status`);
    const data: any = await response.json();
    
    logResult({
      category: 'AI',
      test: 'Ultra Queen AI',
      status: response.ok ? '✅' : '❌',
      details: data.status || 'Status check',
      critical: true
    });
  } catch (error: any) {
    logResult({
      category: 'AI',
      test: 'Ultra Queen AI',
      status: '❌',
      details: error.message,
      critical: true
    });
  }
}

// ============ FRONTEND ============

async function testFrontend() {
  console.log('\n🎨 TESTING FRONTEND\n');

  try {
    const response = await fetch(`${BASE_URL}/`);
    const html = await response.text();
    
    logResult({
      category: 'Frontend',
      test: 'Main Page',
      status: response.ok && html.includes('<!DOCTYPE html') ? '✅' : '❌',
      details: response.ok ? 'Loading correctly' : `Error: ${response.status}`,
      critical: true
    });
  } catch (error: any) {
    logResult({
      category: 'Frontend',
      test: 'Main Page',
      status: '❌',
      details: error.message,
      critical: true
    });
  }
}

// ============ SECURITY ============

async function testSecurity() {
  console.log('\n🛡️ TESTING SECURITY\n');

  // Test CORS
  try {
    const response = await fetch(`${BASE_URL}/api/health`, {
      headers: { 'Origin': 'https://example.com' }
    });
    const hasCors = response.headers.get('access-control-allow-origin');
    
    logResult({
      category: 'Security',
      test: 'CORS Headers',
      status: hasCors ? '✅' : '⚠️',
      details: hasCors ? 'Configured' : 'Not detected',
      critical: false
    });
  } catch (error: any) {
    logResult({
      category: 'Security',
      test: 'CORS Headers',
      status: '⚠️',
      details: error.message,
      critical: false
    });
  }
}

// ============ BUILD VALIDATION ============

async function testBuildArtifacts() {
  console.log('\n📦 TESTING BUILD ARTIFACTS\n');

  try {
    const fs = await import('fs/promises');
    
    // Check dist folder exists
    await fs.access('dist');
    logResult({
      category: 'Build',
      test: 'Dist Folder',
      status: '✅',
      details: 'Build artifacts present',
      critical: false
    });

    // Check package.json
    const pkg = JSON.parse(await fs.readFile('package.json', 'utf-8'));
    logResult({
      category: 'Build',
      test: 'Package Config',
      status: pkg.scripts?.start ? '✅' : '❌',
      details: `Version: ${pkg.version}`,
      critical: true
    });
  } catch (error: any) {
    logResult({
      category: 'Build',
      test: 'Build Artifacts',
      status: '⚠️',
      details: 'Some artifacts missing (will be built on deployment)',
      critical: false
    });
  }
}

// ============ MAIN RUNNER ============

async function runAllTests() {
  console.log('🚀 FINAL DEPLOYMENT VALIDATION');
  console.log('='.repeat(80));
  console.log('Testing before GitHub push and Render deployment\n');

  const startTime = Date.now();

  await testCoreSystem();
  await testAPIEndpoints();
  await testAuthentication();
  await testDocumentGeneration();
  await testAIServices();
  await testFrontend();
  await testSecurity();
  await testBuildArtifacts();

  const totalTime = Date.now() - startTime;

  // Print Summary
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION SUMMARY');
  console.log('='.repeat(80));

  const total = results.length;
  const passed = results.filter(r => r.status === '✅').length;
  const warnings = results.filter(r => r.status === '⚠️').length;
  const failed = results.filter(r => r.status === '❌').length;

  console.log(`\nTotal Tests: ${total}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`⚠️ Warnings: ${warnings}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`🔴 Critical Failures: ${criticalFailures}`);
  console.log(`⏱️ Total Time: ${totalTime}ms`);

  // Deployment Decision
  console.log('\n' + '='.repeat(80));
  console.log('🎯 DEPLOYMENT DECISION');
  console.log('='.repeat(80));

  if (criticalFailures === 0 && failed === 0) {
    console.log('\n✅ ✅ ✅ READY FOR DEPLOYMENT ✅ ✅ ✅');
    console.log('\nAll critical systems operational!');
    console.log('Safe to push to GitHub and deploy on Render.');
  } else if (criticalFailures === 0 && failed <= 2) {
    console.log('\n⚠️ MOSTLY READY - Minor Issues Detected');
    console.log('\nNo critical failures, but some non-critical issues.');
    console.log('Deployment can proceed with caution.');
  } else {
    console.log('\n❌ NOT READY FOR DEPLOYMENT');
    console.log(`\n${criticalFailures} critical failure(s) detected!`);
    console.log('Please fix critical issues before deploying.');
  }

  // Save Report
  const report = {
    timestamp: new Date().toISOString(),
    totalTime,
    summary: { total, passed, warnings, failed, criticalFailures },
    deploymentReady: criticalFailures === 0,
    results
  };

  const fs = await import('fs/promises');
  await fs.writeFile(
    'FINAL_DEPLOYMENT_VALIDATION_REPORT.json',
    JSON.stringify(report, null, 2)
  );

  console.log('\n📄 Detailed report: FINAL_DEPLOYMENT_VALIDATION_REPORT.json\n');

  process.exit(criticalFailures > 0 ? 1 : 0);
}

// Run tests
runAllTests().catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
