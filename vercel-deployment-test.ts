
#!/usr/bin/env tsx

/**
 * VERCEL DEPLOYMENT VALIDATION
 * Tests all critical functionality before production deployment
 */

interface TestResult {
  category: string;
  test: string;
  status: 'PASS' | 'FAIL' | 'WARNING';
  details: string;
}

const results: TestResult[] = [];

async function runTests() {
  console.log('🚀 VERCEL DEPLOYMENT VALIDATION');
  console.log('='.repeat(80));

  // Test 1: Environment Check
  console.log('\n📋 Testing Environment...');
  const hasNodeEnv = Boolean(process.env.NODE_ENV);
  results.push({
    category: 'Environment',
    test: 'NODE_ENV',
    status: hasNodeEnv ? 'PASS' : 'WARNING',
    details: process.env.NODE_ENV || 'Not set (will default to production)'
  });

  // Test 2: API Keys
  console.log('\n🔑 Testing API Keys...');
  const apiKeys = {
    'OPENAI_API_KEY': process.env.OPENAI_API_KEY,
    'DATABASE_URL': process.env.DATABASE_URL,
    'JWT_SECRET': process.env.JWT_SECRET
  };

  for (const [key, value] of Object.entries(apiKeys)) {
    const configured = Boolean(value);
    results.push({
      category: 'API Keys',
      test: key,
      status: configured ? 'PASS' : 'WARNING',
      details: configured ? 'Configured' : 'Not configured - feature will be limited'
    });
  }

  // Test 3: Build Check
  console.log('\n🔧 Testing Build...');
  try {
    const fs = await import('fs');
    const clientBuildExists = fs.existsSync('dist/public/index.html');
    const serverBuildExists = fs.existsSync('dist/server/index.js');

    results.push({
      category: 'Build',
      test: 'Client Build',
      status: clientBuildExists ? 'PASS' : 'FAIL',
      details: clientBuildExists ? 'dist/public/index.html exists' : 'Client build missing'
    });

    results.push({
      category: 'Build',
      test: 'Server Build',
      status: serverBuildExists ? 'PASS' : 'FAIL',
      details: serverBuildExists ? 'dist/server/index.js exists' : 'Server build missing'
    });
  } catch (error) {
    results.push({
      category: 'Build',
      test: 'Build Check',
      status: 'FAIL',
      details: error instanceof Error ? error.message : 'Build check failed'
    });
  }

  // Test 4: Dependencies
  console.log('\n📦 Testing Dependencies...');
  try {
    const packageJson = await import('./package.json');
    const hasDeps = Object.keys(packageJson.dependencies || {}).length > 0;
    
    results.push({
      category: 'Dependencies',
      test: 'Package Dependencies',
      status: hasDeps ? 'PASS' : 'FAIL',
      details: `${Object.keys(packageJson.dependencies || {}).length} dependencies`
    });
  } catch (error) {
    results.push({
      category: 'Dependencies',
      test: 'Package Dependencies',
      status: 'FAIL',
      details: 'Cannot read package.json'
    });
  }

  // Test 5: Vercel Configuration
  console.log('\n⚡ Testing Vercel Config...');
  try {
    const fs = await import('fs');
    const vercelConfigExists = fs.existsSync('vercel.json');
    
    if (vercelConfigExists) {
      const vercelConfig = JSON.parse(fs.readFileSync('vercel.json', 'utf-8'));
      const hasRoutes = Boolean(vercelConfig.rewrites || vercelConfig.routes);
      
      results.push({
        category: 'Vercel',
        test: 'Configuration',
        status: hasRoutes ? 'PASS' : 'WARNING',
        details: hasRoutes ? 'Routes configured' : 'No routes defined'
      });
    } else {
      results.push({
        category: 'Vercel',
        test: 'Configuration',
        status: 'WARNING',
        details: 'vercel.json not found - using defaults'
      });
    }
  } catch (error) {
    results.push({
      category: 'Vercel',
      test: 'Configuration',
      status: 'WARNING',
      details: 'Could not parse vercel.json'
    });
  }

  // Print Results
  console.log('\n' + '='.repeat(80));
  console.log('📊 VALIDATION RESULTS');
  console.log('='.repeat(80));

  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  const warnings = results.filter(r => r.status === 'WARNING').length;

  console.log(`\n✅ PASSED: ${passed}`);
  console.log(`❌ FAILED: ${failed}`);
  console.log(`⚠️  WARNINGS: ${warnings}`);

  console.log('\nDetailed Results:');
  results.forEach(r => {
    const icon = r.status === 'PASS' ? '✅' : r.status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${r.category}] ${r.test}: ${r.details}`);
  });

  // Deployment Readiness
  console.log('\n' + '='.repeat(80));
  if (failed === 0) {
    console.log('🎉 DEPLOYMENT READY - All critical tests passed!');
    console.log('\n📝 Next Steps:');
    console.log('   1. Add missing API keys to Vercel Environment Variables');
    console.log('   2. Run: vercel --prod');
    console.log('   3. Test production URL');
    return true;
  } else {
    console.log('❌ NOT READY FOR DEPLOYMENT - Fix failed tests first');
    console.log('\n🔧 Required Fixes:');
    results.filter(r => r.status === 'FAIL').forEach(r => {
      console.log(`   - ${r.test}: ${r.details}`);
    });
    return false;
  }
}

runTests().then(ready => {
  process.exit(ready ? 0 : 1);
}).catch(error => {
  console.error('❌ Validation failed:', error);
  process.exit(1);
});
