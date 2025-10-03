import fetch from 'node-fetch';
import { performance } from 'perf_hooks';

const PRODUCTION_URL = process.env.VERCEL_URL || 'https://your-production-url.vercel.app';
const TEST_ENDPOINTS = [
  '/api/health',
  '/api/generate-pdf',
  '/api/process-document',
  '/api/ultra-ai'
];

async function validateDeployment() {
  console.log('🚀 Starting production deployment validation...');
  console.log(`📡 Testing deployment at: ${PRODUCTION_URL}\n`);

  const results = {
    success: 0,
    failed: 0,
    details: []
  };

  // Test health endpoint
  try {
    console.log('🏥 Testing health endpoint...');
    const healthStart = performance.now();
    const healthResponse = await fetch(`${PRODUCTION_URL}/api/health`);
    const healthData = await healthResponse.json();
    const healthDuration = (performance.now() - healthStart).toFixed(2);

    if (healthResponse.ok && healthData.status === 'healthy') {
      console.log('✅ Health check passed');
      console.log(`⏱️  Response time: ${healthDuration}ms`);
      results.success++;
      results.details.push({
        endpoint: '/api/health',
        status: 'success',
        responseTime: `${healthDuration}ms`
      });
    } else {
      throw new Error('Health check failed');
    }
  } catch (error) {
    console.error('❌ Health check failed:', error);
    results.failed++;
    results.details.push({
      endpoint: '/api/health',
      status: 'failed',
      error: error.message
    });
  }

  // Test API endpoints with universal override
  const testApiKey = process.env.TEST_API_KEY || 'test-key';
  
  for (const endpoint of TEST_ENDPOINTS) {
    if (endpoint === '/api/health') continue; // Already tested

    try {
      console.log(`\n🔍 Testing endpoint: ${endpoint}`);
      const start = performance.now();
      const response = await fetch(`${PRODUCTION_URL}${endpoint}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key-override': testApiKey
        },
        body: JSON.stringify({ test: true })
      });

      const data = await response.json();
      const duration = (performance.now() - start).toFixed(2);

      if (response.ok) {
        console.log(`✅ ${endpoint} test passed`);
        console.log(`⏱️  Response time: ${duration}ms`);
        results.success++;
        results.details.push({
          endpoint,
          status: 'success',
          responseTime: `${duration}ms`
        });
      } else {
        throw new Error(`Request failed with status ${response.status}: ${JSON.stringify(data)}`);
      }
    } catch (error) {
      console.error(`❌ ${endpoint} test failed:`, error);
      results.failed++;
      results.details.push({
        endpoint,
        status: 'failed',
        error: error.message
      });
    }
  }

  // Print summary
  console.log('\n📊 Deployment Validation Summary');
  console.log('==============================');
  console.log(`✅ Successful tests: ${results.success}`);
  console.log(`❌ Failed tests: ${results.failed}`);
  console.log('\n📝 Detailed Results:');
  results.details.forEach(detail => {
    console.log(`\n${detail.endpoint}:`);
    console.log(`Status: ${detail.status}`);
    if (detail.responseTime) {
      console.log(`Response Time: ${detail.responseTime}`);
    }
    if (detail.error) {
      console.log(`Error: ${detail.error}`);
    }
  });

  return results.failed === 0;
}

// Run validation
validateDeployment()
  .then(success => {
    if (success) {
      console.log('\n✨ Deployment validation successful! All systems operational.');
      process.exit(0);
    } else {
      console.error('\n⚠️  Deployment validation failed! Please check the logs above.');
      process.exit(1);
    }
  })
  .catch(error => {
    console.error('\n💥 Fatal error during validation:', error);
    process.exit(1);
  });