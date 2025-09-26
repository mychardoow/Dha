/**
 * Simple Railway Authentication Fix Test
 * 
 * Validates that the authentication header fix works correctly
 */

import { railwayAPI, RAILWAY_SERVICE_CONFIG } from './config/railway-api';

async function testRailwayAuthenticationFix() {
  console.log('🧪 Testing Railway Authentication Fix...');
  console.log('====================================================');
  
  const results = {
    passed: 0,
    failed: 0,
    tests: [] as Array<{name: string, status: 'PASS' | 'FAIL', details?: string}>
  };

  function addTest(name: string, success: boolean, details?: string) {
    const status = success ? 'PASS' : 'FAIL';
    results.tests.push({ name, status, details });
    if (success) {
      results.passed++;
      console.log(`✅ ${name}`);
    } else {
      results.failed++;
      console.log(`❌ ${name}: ${details || 'Unknown error'}`);
    }
  }

  // Test 1: Check Railway API credentials are configured
  try {
    const hasToken = !!process.env.RAILWAY_TOKEN;
    const hasProjectToken = !!process.env.RAILWAY_PROJECT_TOKEN;
    const hasCredentials = hasToken || hasProjectToken;
    
    addTest(
      'Railway API Credentials Available', 
      hasCredentials,
      hasCredentials ? `Token: ${hasToken ? 'Yes' : 'No'}, Project Token: ${hasProjectToken ? 'Yes' : 'No'}` : 'No Railway tokens found'
    );
    
    if (!hasCredentials) {
      console.log('\n⚠️  To test real Railway authentication, set RAILWAY_TOKEN or RAILWAY_PROJECT_TOKEN');
      addTest('Railway Authentication Test', true, 'Skipped - No credentials configured');
    } else {
      // Test 2: Test the authentication fix
      try {
        console.log('\n🔍 Testing Railway API authentication with fixed headers...');
        const healthResult = await railwayAPI.checkApiHealth();
        
        addTest(
          'Railway API Authentication', 
          healthResult.healthy,
          healthResult.healthy ? 'Authentication successful' : `Auth failed: ${healthResult.error}`
        );

        if (healthResult.healthy) {
          console.log('🎉 SUCCESS: Railway API authentication working with Bearer token headers!');
          
          // Test 3: Try to get project info
          try {
            const projectInfo = await railwayAPI.getProjectInfo();
            addTest(
              'Railway Project Info Access',
              !!projectInfo,
              projectInfo ? `Project ID: ${projectInfo.id}` : 'Failed to fetch project info'
            );
          } catch (error) {
            addTest('Railway Project Info Access', false, error instanceof Error ? error.message : String(error));
          }

          // Test 4: Test service configuration
          const hasServiceConfig = !!(RAILWAY_SERVICE_CONFIG.serviceId && RAILWAY_SERVICE_CONFIG.environmentId);
          addTest(
            'Railway Service Configuration',
            hasServiceConfig,
            hasServiceConfig 
              ? `Service: ${RAILWAY_SERVICE_CONFIG.serviceId}, Environment: ${RAILWAY_SERVICE_CONFIG.environmentId}`
              : 'Missing RAILWAY_SERVICE_ID or RAILWAY_ENVIRONMENT_ID'
          );

        } else {
          console.log('❌ Authentication still failing - this indicates the bug may not be fully fixed');
        }
      } catch (error) {
        addTest('Railway API Authentication', false, error instanceof Error ? error.message : String(error));
      }
    }
  } catch (error) {
    addTest('Railway API Credentials Check', false, error instanceof Error ? error.message : String(error));
  }

  // Test 5: Verify simulation fallback behavior
  try {
    console.log('\n🔍 Testing simulation fallback with invalid credentials...');
    
    // Save original credentials
    const originalToken = process.env.RAILWAY_TOKEN;
    const originalProjectToken = process.env.RAILWAY_PROJECT_TOKEN;

    // Set invalid credentials
    process.env.RAILWAY_TOKEN = 'invalid_token_test';
    process.env.RAILWAY_PROJECT_TOKEN = 'invalid_project_token_test';

    const invalidAuthResult = await railwayAPI.checkApiHealth();

    // Restore original credentials
    if (originalToken !== undefined) process.env.RAILWAY_TOKEN = originalToken;
    if (originalProjectToken !== undefined) process.env.RAILWAY_PROJECT_TOKEN = originalProjectToken;

    addTest(
      'Simulation Fallback with Invalid Credentials',
      !invalidAuthResult.healthy,
      invalidAuthResult.healthy ? 'ERROR: Should fail with invalid credentials' : `Correctly failed: ${invalidAuthResult.error}`
    );
  } catch (error) {
    addTest('Simulation Fallback Test', false, error instanceof Error ? error.message : String(error));
  }

  // Summary
  console.log('\n📊 Test Results Summary:');
  console.log('====================================================');
  results.tests.forEach(test => {
    const icon = test.status === 'PASS' ? '✅' : '❌';
    console.log(`${icon} ${test.name}`);
    if (test.details) {
      console.log(`   ${test.details}`);
    }
  });

  console.log(`\n🎯 Overall: ${results.passed}/${results.passed + results.failed} tests passed`);
  
  if (results.failed === 0) {
    console.log('🎉 All tests passed! Railway authentication fix is working correctly.');
  } else {
    console.log('⚠️  Some tests failed. Review the results above.');
  }

  return {
    success: results.failed === 0,
    totalTests: results.passed + results.failed,
    passedTests: results.passed,
    failedTests: results.failed,
    results: results.tests
  };
}

// Run the test if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testRailwayAuthenticationFix()
    .then(result => {
      process.exit(result.success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test execution failed:', error);
      process.exit(1);
    });
}

export { testRailwayAuthenticationFix };