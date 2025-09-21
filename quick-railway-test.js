// Quick Railway deployment tester for government deadline
import fetch from 'node-fetch';

const RAILWAY_URL = process.argv[2] || 'YOUR-RAILWAY-URL-HERE';

async function testGovernmentDeployment() {
  console.log('🚨 GOVERNMENT DEPLOYMENT TEST STARTING...');
  console.log(`🎯 Testing URL: ${RAILWAY_URL}`);
  
  const tests = [
    {
      name: 'Health Check',
      url: `${RAILWAY_URL}/api/health`,
      expected: 'healthy'
    },
    {
      name: 'Homepage',
      url: `${RAILWAY_URL}/`,
      expected: 'DHA'
    },
    {
      name: 'Monitoring Status',
      url: `${RAILWAY_URL}/api/monitoring/status`,
      expected: 'status'
    }
  ];

  let passedTests = 0;
  let totalTests = tests.length;

  for (const test of tests) {
    try {
      console.log(`\n🔍 Testing: ${test.name}...`);
      const response = await fetch(test.url);
      const text = await response.text();
      
      if (response.ok && text.includes(test.expected)) {
        console.log(`✅ ${test.name}: PASSED`);
        passedTests++;
      } else {
        console.log(`❌ ${test.name}: FAILED - Status: ${response.status}`);
        console.log(`Response: ${text.substring(0, 200)}...`);
      }
    } catch (error) {
      console.log(`❌ ${test.name}: ERROR - ${error.message}`);
    }
  }

  console.log(`\n🎯 GOVERNMENT TEST RESULTS:`);
  console.log(`✅ Passed: ${passedTests}/${totalTests}`);
  
  if (passedTests === totalTests) {
    console.log(`🍾 SUCCESS! READY FOR CHAMPAGNE CELEBRATION! 🥂`);
    console.log(`🇿🇦 Government deployment is LIVE and OPERATIONAL! 🇿🇦`);
  } else {
    console.log(`⚠️  Some tests failed - check Railway deployment logs`);
  }
}

// If URL provided as argument, run test
if (process.argv[2] && process.argv[2] !== 'YOUR-RAILWAY-URL-HERE') {
  testGovernmentDeployment().catch(console.error);
} else {
  console.log('Usage: node quick-railway-test.js https://your-app.up.railway.app');
}