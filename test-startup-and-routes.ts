
import fetch from 'node-fetch';

const BASE_URL = 'http://0.0.0.0:5000';

interface TestResult {
  route: string;
  method: string;
  status: number;
  success: boolean;
  responseTime: number;
  error?: string;
}

const routes = [
  // Health and status routes
  { path: '/api/health', method: 'GET', description: 'Health check' },
  { path: '/api/status', method: 'GET', description: 'Status endpoint' },
  { path: '/api/db/health', method: 'GET', description: 'Database health' },
  
  // Auth routes
  { path: '/api/auth/login', method: 'POST', description: 'Login endpoint', body: { username: 'admin', password: 'admin123' } },
  
  // Document routes
  { path: '/api/documents/generate', method: 'POST', description: 'Document generation', body: { documentType: 'Identity Document' } },
  
  // AI routes
  { path: '/api/ai/chat', method: 'POST', description: 'AI chat endpoint', body: { message: 'Hello', conversationId: 'test' } },
];

async function testRoute(route: typeof routes[0]): Promise<TestResult> {
  const startTime = Date.now();
  const url = `${BASE_URL}${route.path}`;
  
  try {
    const options: any = {
      method: route.method,
      headers: {
        'Content-Type': 'application/json',
      },
    };
    
    if (route.body) {
      options.body = JSON.stringify(route.body);
    }
    
    const response = await fetch(url, options);
    const responseTime = Date.now() - startTime;
    
    return {
      route: route.path,
      method: route.method,
      status: response.status,
      success: response.status >= 200 && response.status < 500,
      responseTime,
    };
  } catch (error) {
    const responseTime = Date.now() - startTime;
    return {
      route: route.path,
      method: route.method,
      status: 0,
      success: false,
      responseTime,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

async function waitForServer(maxAttempts = 30): Promise<boolean> {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      const response = await fetch(`${BASE_URL}/api/health`);
      if (response.ok) {
        console.log('✅ Server is ready!');
        return true;
      }
    } catch (error) {
      console.log(`⏳ Waiting for server... (${i + 1}/${maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function runTests() {
  console.log('🚀 DHA Digital Services - Startup & Routes Test');
  console.log('=' .repeat(60));
  console.log('');
  
  // Wait for server to be ready
  console.log('⏳ Waiting for server to start...');
  const serverReady = await waitForServer();
  
  if (!serverReady) {
    console.error('❌ Server failed to start within timeout period');
    process.exit(1);
  }
  
  console.log('');
  console.log('📊 Testing Routes...');
  console.log('-'.repeat(60));
  
  const results: TestResult[] = [];
  
  for (const route of routes) {
    console.log(`\n🔍 Testing: ${route.method} ${route.path}`);
    console.log(`   Description: ${route.description}`);
    
    const result = await testRoute(route);
    results.push(result);
    
    if (result.success) {
      console.log(`   ✅ Status: ${result.status} | Response Time: ${result.responseTime}ms`);
    } else {
      console.log(`   ❌ Status: ${result.status} | Error: ${result.error || 'Unknown error'}`);
    }
  }
  
  // Summary
  console.log('');
  console.log('=' .repeat(60));
  console.log('📈 Test Summary');
  console.log('=' .repeat(60));
  
  const successful = results.filter(r => r.success).length;
  const failed = results.filter(r => !r.success).length;
  const avgResponseTime = results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;
  
  console.log(`\n✅ Successful: ${successful}/${results.length}`);
  console.log(`❌ Failed: ${failed}/${results.length}`);
  console.log(`⚡ Average Response Time: ${avgResponseTime.toFixed(2)}ms`);
  
  if (failed > 0) {
    console.log('\n❌ Failed Routes:');
    results.filter(r => !r.success).forEach(r => {
      console.log(`   - ${r.method} ${r.route}: ${r.error || `Status ${r.status}`}`);
    });
  }
  
  console.log('');
  console.log('=' .repeat(60));
  
  // Exit with appropriate code
  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(error => {
  console.error('❌ Test execution failed:', error);
  process.exit(1);
});
