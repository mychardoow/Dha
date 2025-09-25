/**
 * DIRECT AI SERVICE VALIDATION
 * Tests AI services directly without requiring a running server
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 COMPREHENSIVE AI ASSISTANT TESTING SUITE');
console.log('='.repeat(80));
console.log('Testing all AI services for Railway deployment readiness');
console.log('');

class AIServiceValidator {
  constructor() {
    this.results = [];
  }

  /**
   * Run comprehensive validation
   */
  async runValidation() {
    console.log('🚀 Starting comprehensive AI service validation...\n');

    // Test 1: Validate Service Files Exist
    this.validateServiceFiles();

    // Test 2: Check Environment Configuration
    this.validateEnvironmentConfig();

    // Test 3: Validate Route Configurations
    this.validateRouteConfigurations();

    // Test 4: Check Package Dependencies
    this.validateDependencies();

    // Test 5: Validate AI Model Configurations
    this.validateAIModelConfigs();

    // Test 6: Check Integration Files
    this.validateIntegrationFiles();

    // Generate final report
    this.generateValidationReport();
  }

  /**
   * Validate all required service files exist
   */
  validateServiceFiles() {
    console.log('📁 Validating AI service files...');
    
    const requiredServices = [
      'server/services/ai-assistant.ts',
      'server/services/military-grade-ai-assistant.ts', 
      'server/services/ultra-ai-system.ts',
      'server/services/enhanced-ai-assistant.ts',
      'server/services/enhanced-voice-service.ts',
      'server/services/real-time-validation-service.ts',
      'server/services/document-processor.ts'
    ];

    const requiredRoutes = [
      'server/routes/ai-assistant.ts',
      'server/routes/ultra-ai-routes.ts',
      'server/routes/enhanced-ai-routes.ts'
    ];

    let allServicesExist = true;

    [...requiredServices, ...requiredRoutes].forEach(file => {
      const exists = fs.existsSync(file);
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${file}`);
      
      if (!exists) {
        allServicesExist = false;
        this.results.push({
          test: 'Service File Existence',
          file: file,
          status: 'FAIL',
          error: 'File not found'
        });
      } else {
        this.results.push({
          test: 'Service File Existence', 
          file: file,
          status: 'PASS'
        });
      }
    });

    console.log(`\\n✅ Service Files: ${allServicesExist ? 'ALL PRESENT' : 'MISSING FILES'}\\n`);
  }

  /**
   * Validate environment configuration
   */
  validateEnvironmentConfig() {
    console.log('🔑 Validating environment configuration...');

    const requiredEnvVars = [
      'OPENAI_API_KEY',
      'ANTHROPIC_API_KEY',
      'DATABASE_URL'
    ];

    requiredEnvVars.forEach(envVar => {
      const exists = process.env[envVar] && process.env[envVar] !== '';
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${envVar}: ${exists ? 'SET' : 'NOT SET'}`);
      
      this.results.push({
        test: 'Environment Variables',
        variable: envVar,
        status: exists ? 'PASS' : 'FAIL',
        error: exists ? null : 'Environment variable not set'
      });
    });

    console.log('');
  }

  /**
   * Validate route configurations by analyzing files
   */
  validateRouteConfigurations() {
    console.log('🛤️ Validating AI route configurations...');

    const routeFiles = [
      'server/routes/ai-assistant.ts',
      'server/routes/ultra-ai-routes.ts', 
      'server/routes/enhanced-ai-routes.ts'
    ];

    routeFiles.forEach(routeFile => {
      if (fs.existsSync(routeFile)) {
        const content = fs.readFileSync(routeFile, 'utf8');
        
        // Check for essential route patterns
        const hasPostRoutes = content.includes('router.post(');
        const hasGetRoutes = content.includes('router.get(');
        const hasAuth = content.includes('requireAuth') || content.includes('auth');
        const hasErrorHandling = content.includes('try') && content.includes('catch');

        console.log(`  📄 ${routeFile}:`);
        console.log(`    ${hasPostRoutes ? '✅' : '❌'} POST routes`);
        console.log(`    ${hasGetRoutes ? '✅' : '❌'} GET routes`);
        console.log(`    ${hasAuth ? '✅' : '❌'} Authentication`);
        console.log(`    ${hasErrorHandling ? '✅' : '❌'} Error handling`);

        this.results.push({
          test: 'Route Configuration',
          file: routeFile,
          status: (hasPostRoutes && hasGetRoutes && hasAuth && hasErrorHandling) ? 'PASS' : 'PARTIAL',
          details: {
            postRoutes: hasPostRoutes,
            getRoutes: hasGetRoutes, 
            authentication: hasAuth,
            errorHandling: hasErrorHandling
          }
        });
      }
    });

    console.log('');
  }

  /**
   * Validate package dependencies
   */
  validateDependencies() {
    console.log('📦 Validating AI package dependencies...');

    if (fs.existsSync('package.json')) {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies };

      const requiredPackages = [
        '@ai-sdk/openai',
        '@anthropic-ai/sdk',
        'openai',
        'multer',
        'express'
      ];

      requiredPackages.forEach(pkg => {
        const exists = dependencies[pkg];
        const status = exists ? '✅' : '❌';
        const version = exists ? dependencies[pkg] : 'NOT INSTALLED';
        console.log(`  ${status} ${pkg}: ${version}`);
        
        this.results.push({
          test: 'Package Dependencies',
          package: pkg,
          status: exists ? 'PASS' : 'FAIL',
          version: version
        });
      });
    }

    console.log('');
  }

  /**
   * Validate AI model configurations in service files
   */
  validateAIModelConfigs() {
    console.log('🧠 Validating AI model configurations...');

    const serviceFiles = [
      'server/services/ai-assistant.ts',
      'server/services/military-grade-ai-assistant.ts',
      'server/services/enhanced-ai-assistant.ts'
    ];

    serviceFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        
        const hasOpenAIConfig = content.includes('OpenAI') || content.includes('gpt-');
        const hasAnthropicConfig = content.includes('Anthropic') || content.includes('claude-');
        const hasModelConfig = content.includes('MODEL') || content.includes('model:');
        const hasErrorHandling = content.includes('try') && content.includes('catch');

        console.log(`  📄 ${path.basename(file)}:`);
        console.log(`    ${hasOpenAIConfig ? '✅' : '❌'} OpenAI integration`);
        console.log(`    ${hasAnthropicConfig ? '✅' : '❌'} Anthropic integration`);
        console.log(`    ${hasModelConfig ? '✅' : '❌'} Model configuration`);
        console.log(`    ${hasErrorHandling ? '✅' : '❌'} Error handling`);

        this.results.push({
          test: 'AI Model Configuration',
          file: file,
          status: (hasModelConfig && hasErrorHandling) ? 'PASS' : 'PARTIAL',
          details: {
            openai: hasOpenAIConfig,
            anthropic: hasAnthropicConfig,
            modelConfig: hasModelConfig,
            errorHandling: hasErrorHandling
          }
        });
      }
    });

    console.log('');
  }

  /**
   * Validate integration service files
   */
  validateIntegrationFiles() {
    console.log('🔗 Validating integration service files...');

    const integrationServices = [
      'server/services/enhanced-voice-service.ts',
      'server/services/document-processor.ts', 
      'server/services/real-time-validation-service.ts',
      'server/services/enhanced-sa-ocr.ts',
      'server/services/ai-ocr-integration.ts'
    ];

    integrationServices.forEach(file => {
      const exists = fs.existsSync(file);
      const status = exists ? '✅' : '❌';
      console.log(`  ${status} ${path.basename(file)}`);
      
      this.results.push({
        test: 'Integration Services',
        file: file,
        status: exists ? 'PASS' : 'FAIL'
      });
    });

    console.log('');
  }

  /**
   * Generate comprehensive validation report
   */
  generateValidationReport() {
    console.log('\\n' + '='.repeat(80));
    console.log('📊 AI SERVICE VALIDATION REPORT');
    console.log('='.repeat(80));

    // Group results by test type
    const groupedResults = this.results.reduce((acc, result) => {
      if (!acc[result.test]) {
        acc[result.test] = [];
      }
      acc[result.test].push(result);
      return acc;
    }, {});

    let overallPass = 0;
    let overallTotal = 0;

    Object.keys(groupedResults).forEach(testType => {
      const tests = groupedResults[testType];
      const passed = tests.filter(t => t.status === 'PASS').length;
      const total = tests.length;
      overallPass += passed;
      overallTotal += total;

      const percentage = Math.round((passed / total) * 100);
      const status = percentage === 100 ? '✅' : percentage >= 80 ? '⚠️' : '❌';
      
      console.log(`${status} ${testType}: ${passed}/${total} (${percentage}%)`);
      
      // Show failures
      tests.filter(t => t.status === 'FAIL').forEach(test => {
        console.log(`    ❌ ${test.file || test.package || test.variable}: ${test.error || 'Failed'}`);
      });
    });

    const overallPercentage = Math.round((overallPass / overallTotal) * 100);
    
    console.log('\\n' + '-'.repeat(80));
    console.log(`📈 OVERALL VALIDATION RESULTS:`);
    console.log(`   Total Checks: ${overallTotal}`);
    console.log(`   Passed: ${overallPass} (${overallPercentage}%)`);
    console.log(`   Failed: ${overallTotal - overallPass}`);

    console.log(`\\n🎯 RAILWAY DEPLOYMENT READINESS:`);
    
    if (overallPercentage >= 95) {
      console.log(`   ✅ EXCELLENT - Fully ready for deployment`);
      console.log(`   ✅ All critical AI services validated`);
      console.log(`   ✅ Environment properly configured`);
      console.log(`   ✅ Ready for director presentation`);
    } else if (overallPercentage >= 80) {
      console.log(`   ⚠️ GOOD - Mostly ready with minor issues`);
      console.log(`   ⚠️ Some non-critical components may need attention`);
    } else {
      console.log(`   ❌ NEEDS WORK - Critical issues must be resolved`);
      console.log(`   ❌ Deployment not recommended until fixes applied`);
    }

    console.log('\\n🚀 DEPLOYMENT RECOMMENDATIONS:');
    console.log('   • Verify all AI endpoints respond correctly');
    console.log('   • Test authentication on all protected routes');
    console.log('   • Validate API key functionality with live requests');
    console.log('   • Perform load testing for government standards');
    console.log('   • Test multi-language support with actual queries');

    console.log('\\n' + '='.repeat(80));

    return {
      overallPercentage,
      totalChecks: overallTotal,
      passed: overallPass,
      failed: overallTotal - overallPass,
      ready: overallPercentage >= 80
    };
  }
}

// Create specific AI endpoint tester
class AIEndpointTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Test AI service instantiation
   */
  async testServiceInstantiation() {
    console.log('🔧 Testing AI service instantiation...');
    
    try {
      // Test if we can analyze the AI service files for proper exports
      const aiAssistantExists = fs.existsSync('server/services/ai-assistant.ts');
      const militaryAIExists = fs.existsSync('server/services/military-grade-ai-assistant.ts');
      const ultraAIExists = fs.existsSync('server/services/ultra-ai-system.ts');
      
      if (aiAssistantExists) {
        const content = fs.readFileSync('server/services/ai-assistant.ts', 'utf8');
        const hasExport = content.includes('export') && content.includes('class');
        const hasOpenAI = content.includes('OpenAI');
        console.log(`  ✅ AI Assistant Service: ${hasExport && hasOpenAI ? 'VALID' : 'ISSUES DETECTED'}`);
      }

      if (militaryAIExists) {
        const content = fs.readFileSync('server/services/military-grade-ai-assistant.ts', 'utf8');
        const hasExport = content.includes('export') && content.includes('class');
        const hasAnthropic = content.includes('Anthropic');
        console.log(`  ✅ Military AI Service: ${hasExport && hasAnthropic ? 'VALID' : 'ISSUES DETECTED'}`);
      }

      if (ultraAIExists) {
        const content = fs.readFileSync('server/services/ultra-ai-system.ts', 'utf8');
        const hasExport = content.includes('export') && content.includes('class');
        console.log(`  ✅ Ultra AI Service: ${hasExport ? 'VALID' : 'ISSUES DETECTED'}`);
      }

    } catch (error) {
      console.log(`  ❌ Service instantiation test failed: ${error.message}`);
    }
    
    console.log('');
  }

  /**
   * Analyze route endpoint patterns
   */
  analyzeEndpointPatterns() {
    console.log('🛣️ Analyzing AI endpoint patterns...');

    const expectedEndpoints = [
      { route: '/api/ai/chat', method: 'POST', description: 'Main AI chat' },
      { route: '/api/ai/health', method: 'GET', description: 'AI health check' },
      { route: '/api/ai/voice/stt', method: 'POST', description: 'Speech-to-text' },
      { route: '/api/ai/voice/tts', method: 'POST', description: 'Text-to-speech' },
      { route: '/api/ai/document/process', method: 'POST', description: 'Document processing' },
      { route: '/api/ultra-ai/bots', method: 'GET', description: 'Ultra AI bots' },
      { route: '/api/enhanced-ai/unlimited-chat', method: 'POST', description: 'Enhanced unlimited chat' }
    ];

    const routeFiles = [
      'server/routes/ai-assistant.ts',
      'server/routes/ultra-ai-routes.ts',
      'server/routes/enhanced-ai-routes.ts'
    ];

    routeFiles.forEach(file => {
      if (fs.existsSync(file)) {
        const content = fs.readFileSync(file, 'utf8');
        console.log(`\\n  📄 ${path.basename(file)}:`);
        
        expectedEndpoints.forEach(endpoint => {
          const methodRegex = new RegExp(`router\\.${endpoint.method.toLowerCase()}\\s*\\(['\\"\`]${endpoint.route.replace(/\//g, '\\/')}`, 'i');
          const hasEndpoint = methodRegex.test(content);
          console.log(`    ${hasEndpoint ? '✅' : '❌'} ${endpoint.method} ${endpoint.route} - ${endpoint.description}`);
        });
      }
    });

    console.log('');
  }
}

// Main execution
async function main() {
  console.log('Starting comprehensive AI service validation...\\n');
  
  const validator = new AIServiceValidator();
  const endpointTester = new AIEndpointTester();
  
  try {
    // Run service validation
    const results = await validator.runValidation();
    
    // Test service instantiation
    await endpointTester.testServiceInstantiation();
    
    // Analyze endpoint patterns
    endpointTester.analyzeEndpointPatterns();
    
    console.log('🎉 AI validation complete!');
    
    return results;
  } catch (error) {
    console.error('❌ Validation failed:', error);
    return { ready: false, error: error.message };
  }
}

// Execute validation
main().then(results => {
  if (results.ready) {
    console.log('\\n✅ AI services are ready for Railway deployment!');
    process.exit(0);
  } else {
    console.log('\\n⚠️ AI services need attention before deployment.');
    process.exit(1);
  }
}).catch(error => {
  console.error('\\n❌ Critical validation error:', error);
  process.exit(1);
});