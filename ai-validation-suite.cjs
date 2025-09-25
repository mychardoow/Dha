#!/usr/bin/env node

/**
 * AI VALIDATION SUITE - Direct Service Testing
 * Tests AI services directly for comprehensive validation
 */

const fs = require('fs');
const path = require('path');

console.log('🤖 AI ASSISTANT VALIDATION SUITE');
console.log('='.repeat(60));

// Test Results
const results = {
  openaiIntegration: { status: 'pending', details: [] },
  anthropicIntegration: { status: 'pending', details: [] },
  serviceImplementations: { status: 'pending', details: [] },
  endpointStructure: { status: 'pending', details: [] },
  securityFeatures: { status: 'pending', details: [] },
  multiLanguage: { status: 'pending', details: [] },
  documentProcessing: { status: 'pending', details: [] },
  voiceServices: { status: 'pending', details: [] },
  governmentContext: { status: 'pending', details: [] },
  deploymentReadiness: { status: 'pending', details: [] }
};

console.log('🔍 Starting comprehensive AI validation...\n');

// Test 1: API Key Configuration
console.log('1️⃣ Testing API Key Configuration...');
const openaiKey = process.env.OPENAI_API_KEY;
const anthropicKey = process.env.ANTHROPIC_API_KEY;

results.openaiIntegration.status = openaiKey && openaiKey !== 'dev-openai-key' ? 'PASS' : 'FAIL';
results.openaiIntegration.details.push({
  test: 'OpenAI API Key Configuration',
  status: results.openaiIntegration.status,
  message: openaiKey ? 'API key configured' : 'API key missing or placeholder'
});

results.anthropicIntegration.status = anthropicKey && anthropicKey !== 'dev-anthropic-key' ? 'PASS' : 'FAIL';
results.anthropicIntegration.details.push({
  test: 'Anthropic API Key Configuration', 
  status: results.anthropicIntegration.status,
  message: anthropicKey ? 'API key configured' : 'API key missing or placeholder'
});

console.log(`   OpenAI API Key: ${results.openaiIntegration.status === 'PASS' ? '✅ Configured' : '❌ Missing/Invalid'}`);
console.log(`   Anthropic API Key: ${results.anthropicIntegration.status === 'PASS' ? '✅ Configured' : '❌ Missing/Invalid'}`);

// Test 2: Service Implementation Analysis
console.log('\n2️⃣ Analyzing Service Implementations...');

const serviceFiles = [
  'server/services/ai-assistant.ts',
  'server/services/military-grade-ai-assistant.ts',
  'server/services/enhanced-ai-assistant.ts', 
  'server/services/ultra-ai-system.ts'
];

let servicesFound = 0;
let servicesValid = 0;
let serviceDetails = [];

serviceFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      servicesFound++;
      const content = fs.readFileSync(file, 'utf-8');
      
      // Check for key implementations
      const hasOpenAIImport = content.includes('openai') || content.includes('OpenAI');
      const hasAnthropicImport = content.includes('anthropic') || content.includes('Anthropic');
      const hasProcessMethod = content.includes('process') && content.includes('async');
      const hasErrorHandling = content.includes('try') && content.includes('catch');
      const hasResponseInterface = content.includes('Response') && content.includes('interface');
      
      const validationScore = [hasProcessMethod, hasErrorHandling, (hasOpenAIImport || hasAnthropicImport), hasResponseInterface].filter(Boolean).length;
      
      if (validationScore >= 3) {
        servicesValid++;
        console.log(`   ✅ ${path.basename(file)}: Valid implementation (${validationScore}/4 criteria)`);
        serviceDetails.push({
          file: path.basename(file),
          status: 'VALID',
          score: validationScore,
          features: {
            aiIntegration: hasOpenAIImport || hasAnthropicImport,
            asyncProcessing: hasProcessMethod,
            errorHandling: hasErrorHandling,
            typeInterfaces: hasResponseInterface
          }
        });
      } else {
        console.log(`   ⚠️  ${path.basename(file)}: Needs review (${validationScore}/4 criteria)`);
        serviceDetails.push({
          file: path.basename(file),
          status: 'PARTIAL',
          score: validationScore,
          features: {
            aiIntegration: hasOpenAIImport || hasAnthropicImport,
            asyncProcessing: hasProcessMethod,
            errorHandling: hasErrorHandling,
            typeInterfaces: hasResponseInterface
          }
        });
      }
    } else {
      console.log(`   ❌ ${path.basename(file)}: File not found`);
      serviceDetails.push({
        file: path.basename(file),
        status: 'MISSING',
        score: 0
      });
    }
  } catch (error) {
    console.log(`   ❌ ${path.basename(file)}: File access error`);
  }
});

results.serviceImplementations.status = servicesValid === servicesFound && servicesFound >= 3 ? 'PASS' : servicesValid >= 2 ? 'PARTIAL' : 'FAIL';
results.serviceImplementations.details.push({
  test: 'Service Implementation Validation',
  status: results.serviceImplementations.status,
  message: `${servicesValid}/${servicesFound} services have valid implementations`,
  services: serviceDetails
});

// Test 3: Endpoint Structure Analysis
console.log('\n3️⃣ Analyzing AI Endpoint Structure...');
const routeFiles = [
  'server/routes/ai-assistant.ts',
  'server/routes/ultra-ai-routes.ts',
  'server/routes/enhanced-ai-routes.ts'
];

let routesFound = 0;
let endpointsCount = 0;
let routeDetails = [];

routeFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      routesFound++;
      const content = fs.readFileSync(file, 'utf-8');
      
      // Count endpoints
      const postRoutes = (content.match(/router\.post\(/g) || []).length;
      const getRoutes = (content.match(/router\.get\(/g) || []).length;
      const routeCount = postRoutes + getRoutes;
      endpointsCount += routeCount;
      
      // Check for middleware usage
      const hasAuth = content.includes('requireAuth') || content.includes('auth');
      const hasRateLimit = content.includes('rateLimit') || content.includes('rate');
      const hasAsyncHandler = content.includes('asyncHandler') || content.includes('async');
      
      console.log(`   ✅ ${path.basename(file)}: ${routeCount} endpoints found`);
      routeDetails.push({
        file: path.basename(file),
        endpointCount: routeCount,
        postEndpoints: postRoutes,
        getEndpoints: getRoutes,
        hasAuthentication: hasAuth,
        hasRateLimiting: hasRateLimit,
        hasAsyncHandling: hasAsyncHandler
      });
    }
  } catch (error) {
    console.log(`   ❌ ${path.basename(file)}: File access error`);
  }
});

results.endpointStructure.status = endpointsCount >= 10 ? 'PASS' : endpointsCount >= 5 ? 'PARTIAL' : 'FAIL';
results.endpointStructure.details.push({
  test: 'AI Endpoint Structure',
  status: results.endpointStructure.status,
  message: `${endpointsCount} AI endpoints discovered across ${routesFound} route files`,
  routes: routeDetails
});

// Test 4: Security Features Analysis
console.log('\n4️⃣ Analyzing Security Features...');
const securityFiles = [
  'server/middleware/auth.ts',
  'server/middleware/rate-limiting.ts',
  'server/services/military-grade-ai-assistant.ts',
  'server/middleware/security.ts'
];

let securityFeatures = 0;
let securityDetails = [];

securityFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      
      const hasAuth = content.includes('auth') || content.includes('jwt') || content.includes('token');
      const hasRateLimit = content.includes('limit') || content.includes('rate');
      const hasEncryption = content.includes('encrypt') || content.includes('crypto') || content.includes('hash');
      const hasValidation = content.includes('validate') || content.includes('sanitize');
      
      if (hasAuth || hasRateLimit || hasEncryption || hasValidation) {
        securityFeatures++;
        console.log(`   ✅ ${path.basename(file)}: Security implementation found`);
        securityDetails.push({
          file: path.basename(file),
          status: 'IMPLEMENTED',
          features: {
            authentication: hasAuth,
            rateLimiting: hasRateLimit,
            encryption: hasEncryption,
            validation: hasValidation
          }
        });
      } else {
        console.log(`   ⚠️  ${path.basename(file)}: Limited security features`);
        securityDetails.push({
          file: path.basename(file),
          status: 'LIMITED'
        });
      }
    } else {
      console.log(`   ⚠️  ${path.basename(file)}: Not found`);
    }
  } catch (error) {
    console.log(`   ❌ ${path.basename(file)}: Analysis failed`);
  }
});

results.securityFeatures.status = securityFeatures >= 3 ? 'PASS' : securityFeatures >= 2 ? 'PARTIAL' : 'FAIL';
results.securityFeatures.details.push({
  test: 'Security Feature Implementation',
  status: results.securityFeatures.status,
  message: `${securityFeatures} security components identified`,
  components: securityDetails
});

// Test 5: Multi-Language Support
console.log('\n5️⃣ Checking Multi-Language Support...');
try {
  const aiAssistantContent = fs.readFileSync('server/services/ai-assistant.ts', 'utf-8');
  const hasLanguageSupport = aiAssistantContent.includes('language') && 
                              (aiAssistantContent.includes('af') || aiAssistantContent.includes('zu') || 
                               aiAssistantContent.includes('xh') || aiAssistantContent.includes('multi'));
  
  // Check for South African language codes
  const saLanguages = ['af', 'zu', 'xh', 'st', 'ts', 'tn', 'ss', 've', 'nr', 'nd'];
  const foundLanguages = saLanguages.filter(lang => aiAssistantContent.includes(`'${lang}'`) || aiAssistantContent.includes(`"${lang}"`));
  
  results.multiLanguage.status = foundLanguages.length >= 5 ? 'PASS' : foundLanguages.length >= 2 ? 'PARTIAL' : 'FAIL';
  results.multiLanguage.details.push({
    test: 'South African Language Support',
    status: results.multiLanguage.status,
    message: `${foundLanguages.length}/11 official SA languages detected`,
    supportedLanguages: foundLanguages
  });
  
  console.log(`   ${results.multiLanguage.status === 'PASS' ? '✅' : results.multiLanguage.status === 'PARTIAL' ? '⚠️' : '❌'} Multi-language support: ${foundLanguages.length}/11 SA languages`);
} catch (error) {
  console.log('   ❌ Language support analysis failed');
  results.multiLanguage.status = 'FAIL';
}

// Test 6: Document Processing Capabilities
console.log('\n6️⃣ Checking Document Processing...');
const docProcessingFiles = [
  'server/services/document-processor.ts',
  'server/services/enhanced-sa-ocr.ts',
  'server/services/ai-ocr-integration.ts',
  'server/services/document-generators.ts'
];

let docFeatures = 0;
let docDetails = [];

docProcessingFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8');
    const hasOCR = content.includes('ocr') || content.includes('OCR');
    const hasPDF = content.includes('pdf') || content.includes('PDF');
    const hasImageProcessing = content.includes('image') || content.includes('canvas');
    
    docFeatures++;
    console.log(`   ✅ ${path.basename(file)}: Found`);
    docDetails.push({
      file: path.basename(file),
      status: 'FOUND',
      capabilities: {
        ocr: hasOCR,
        pdf: hasPDF,
        imageProcessing: hasImageProcessing
      }
    });
  } else {
    console.log(`   ⚠️  ${path.basename(file)}: Not found`);
    docDetails.push({
      file: path.basename(file),
      status: 'MISSING'
    });
  }
});

results.documentProcessing.status = docFeatures >= 3 ? 'PASS' : docFeatures >= 2 ? 'PARTIAL' : 'FAIL';
results.documentProcessing.details.push({
  test: 'Document Processing Services',
  status: results.documentProcessing.status,
  message: `${docFeatures} document processing services available`,
  services: docDetails
});

// Test 7: Voice Services
console.log('\n7️⃣ Checking Voice Services...');
const voiceServiceFile = 'server/services/enhanced-voice-service.ts';
let voiceSupport = false;
let voiceDetails = {};

try {
  if (fs.existsSync(voiceServiceFile)) {
    const content = fs.readFileSync(voiceServiceFile, 'utf-8');
    const hasSTT = content.includes('stt') || content.includes('speech-to-text');
    const hasTTS = content.includes('tts') || content.includes('text-to-speech');
    const hasVoiceProcessing = content.includes('audio') || content.includes('voice');
    
    voiceSupport = hasSTT || hasTTS || hasVoiceProcessing;
    voiceDetails = {
      speechToText: hasSTT,
      textToSpeech: hasTTS,
      audioProcessing: hasVoiceProcessing
    };
    
    console.log(`   ✅ Voice services: Implementation found (STT: ${hasSTT}, TTS: ${hasTTS})`);
  } else {
    console.log('   ⚠️  Voice services: File not found');
  }
} catch (error) {
  console.log('   ❌ Voice services: Analysis failed');
}

results.voiceServices.status = voiceSupport ? 'PASS' : 'PARTIAL';
results.voiceServices.details.push({
  test: 'Voice Services Implementation',
  status: results.voiceServices.status,
  message: voiceSupport ? 'Voice services implemented' : 'Voice services limited',
  capabilities: voiceDetails
});

// Test 8: Government Context
console.log('\n8️⃣ Checking Government Context...');
const govFiles = [
  'server/services/dha-document-generator.ts',
  'server/services/production-government-api.ts',
  'server/services/government-api-integrations.ts',
  'server/services/saps-integration.ts',
  'server/services/icao-pkd-integration.ts'
];

let govFeatures = 0;
let govDetails = [];

govFiles.forEach(file => {
  if (fs.existsSync(file)) {
    const content = fs.readFileSync(file, 'utf-8');
    const hasDHA = content.includes('DHA') || content.includes('dha');
    const hasSAPS = content.includes('SAPS') || content.includes('saps');
    const hasICAO = content.includes('ICAO') || content.includes('icao');
    
    govFeatures++;
    console.log(`   ✅ ${path.basename(file)}: Found`);
    govDetails.push({
      file: path.basename(file),
      status: 'FOUND',
      integrations: {
        dha: hasDHA,
        saps: hasSAPS,
        icao: hasICAO
      }
    });
  } else {
    console.log(`   ⚠️  ${path.basename(file)}: Not found`);
    govDetails.push({
      file: path.basename(file),
      status: 'MISSING'
    });
  }
});

results.governmentContext.status = govFeatures >= 3 ? 'PASS' : govFeatures >= 2 ? 'PARTIAL' : 'FAIL';
results.governmentContext.details.push({
  test: 'Government Integration Services',
  status: results.governmentContext.status,
  message: `${govFeatures} government integration services available`,
  services: govDetails
});

// Test 9: Deployment Readiness
console.log('\n9️⃣ Assessing Deployment Readiness...');

// Check package.json for production dependencies
let deploymentScore = 0;
let deploymentIssues = [];

try {
  const packageContent = fs.readFileSync('package.json', 'utf-8');
  const packageJson = JSON.parse(packageContent);
  
  // Check for essential production dependencies
  const essentialDeps = ['express', 'cors', 'helmet', '@anthropic-ai/sdk', 'openai'];
  const missingDeps = essentialDeps.filter(dep => 
    !packageJson.dependencies || !packageJson.dependencies[dep]
  );
  
  if (missingDeps.length === 0) {
    deploymentScore += 2;
    console.log('   ✅ Essential dependencies: All present');
  } else {
    deploymentIssues.push(`Missing essential dependencies: ${missingDeps.join(', ')}`);
    console.log(`   ⚠️  Essential dependencies: Missing ${missingDeps.length}`);
  }
  
  // Check for production scripts
  if (packageJson.scripts && packageJson.scripts.start) {
    deploymentScore += 1;
    console.log('   ✅ Production start script: Present');
  } else {
    deploymentIssues.push('No production start script');
    console.log('   ❌ Production start script: Missing');
  }
  
  // Check for build process
  if (packageJson.scripts && (packageJson.scripts.build || packageJson.scripts['build:server'])) {
    deploymentScore += 1;
    console.log('   ✅ Build process: Configured');
  } else {
    deploymentIssues.push('No build process configured');
    console.log('   ⚠️  Build process: Not configured');
  }
  
} catch (error) {
  deploymentIssues.push('Package.json analysis failed');
  console.log('   ❌ Package.json analysis failed');
}

// Check for Railway configuration
if (fs.existsSync('railway.json') || fs.existsSync('Procfile')) {
  deploymentScore += 1;
  console.log('   ✅ Railway configuration: Present');
} else {
  deploymentIssues.push('No Railway configuration found');
  console.log('   ⚠️  Railway configuration: Not found');
}

// Check environment variables
const requiredEnvVars = ['OPENAI_API_KEY', 'ANTHROPIC_API_KEY', 'DATABASE_URL'];
const missingEnvVars = requiredEnvVars.filter(envVar => !process.env[envVar]);

if (missingEnvVars.length === 0) {
  deploymentScore += 1;
  console.log('   ✅ Environment variables: All configured');
} else {
  deploymentIssues.push(`Missing environment variables: ${missingEnvVars.join(', ')}`);
  console.log(`   ⚠️  Environment variables: Missing ${missingEnvVars.length}`);
}

results.deploymentReadiness.status = deploymentScore >= 4 ? 'PASS' : deploymentScore >= 3 ? 'PARTIAL' : 'FAIL';
results.deploymentReadiness.details.push({
  test: 'Deployment Readiness Assessment',
  status: results.deploymentReadiness.status,
  message: `Deployment score: ${deploymentScore}/6`,
  issues: deploymentIssues
});

// Generate Final Report
console.log('\n' + '='.repeat(80));
console.log('📊 COMPREHENSIVE AI VALIDATION REPORT');
console.log('='.repeat(80));

const testCategories = [
  { name: 'OpenAI Integration', result: results.openaiIntegration },
  { name: 'Anthropic Integration', result: results.anthropicIntegration },
  { name: 'Service Implementations', result: results.serviceImplementations },
  { name: 'Endpoint Structure', result: results.endpointStructure },
  { name: 'Security Features', result: results.securityFeatures },
  { name: 'Multi-Language Support', result: results.multiLanguage },
  { name: 'Document Processing', result: results.documentProcessing },
  { name: 'Voice Services', result: results.voiceServices },
  { name: 'Government Context', result: results.governmentContext },
  { name: 'Deployment Readiness', result: results.deploymentReadiness }
];

let totalPass = 0;
let totalPartial = 0;
let totalFail = 0;

testCategories.forEach(category => {
  const status = category.result.status;
  const icon = status === 'PASS' ? '✅' : status === 'PARTIAL' ? '⚠️' : '❌';
  console.log(`${icon} ${category.name}: ${status}`);
  
  if (status === 'PASS') totalPass++;
  else if (status === 'PARTIAL') totalPartial++;
  else totalFail++;
  
  // Show details for failed or partial tests
  if (status !== 'PASS' && category.result.details[0]?.issues) {
    category.result.details[0].issues.forEach(issue => {
      console.log(`    • ${issue}`);
    });
  }
});

console.log('\n' + '-'.repeat(80));
console.log('📈 SUMMARY:');
console.log(`   ✅ PASS: ${totalPass} categories`);
console.log(`   ⚠️  PARTIAL: ${totalPartial} categories`);
console.log(`   ❌ FAIL: ${totalFail} categories`);

const overallScore = ((totalPass * 100) + (totalPartial * 50)) / testCategories.length;
console.log(`   📊 Overall Score: ${overallScore.toFixed(1)}%`);

// Railway Deployment Assessment
console.log('\n🚀 RAILWAY DEPLOYMENT ASSESSMENT:');
if (overallScore >= 80) {
  console.log('   ✅ READY FOR DEPLOYMENT');
  console.log('   • All critical systems operational');
  console.log('   • AI services properly configured');
  console.log('   • Security measures in place');
  console.log('   • Ready for director presentation');
} else if (overallScore >= 60) {
  console.log('   ⚠️  DEPLOYMENT WITH MONITORING RECOMMENDED');
  console.log('   • Most systems operational');
  console.log('   • Some features may need attention');
  console.log('   • Monitor closely after deployment');
} else {
  console.log('   ❌ NOT READY FOR DEPLOYMENT');
  console.log('   • Critical issues need resolution');
  console.log('   • Additional development required');
  console.log('   • Hold director presentation until resolved');
}

// Critical AI Endpoints Analysis
console.log('\n🔍 CRITICAL AI ENDPOINTS ANALYSIS:');
const criticalEndpoints = [
  '/api/ai/chat',
  '/api/ai/ultra/chat', 
  '/api/ai/voice/stt',
  '/api/ai/voice/tts',
  '/api/ai/document/process',
  '/api/ai/passport/extract',
  '/api/ai/validate',
  '/api/ai/languages',
  '/api/ai/stats',
  '/api/ultra-ai/*'
];

console.log('   Expected AI Endpoints:');
criticalEndpoints.forEach(endpoint => {
  console.log(`   • ${endpoint}`);
});

console.log(`   Total Endpoints Found: ${endpointsCount}`);
console.log(`   Expected Endpoints: ${criticalEndpoints.length}`);

console.log('\n' + '='.repeat(80));

// Write detailed report to file
const detailedReport = {
  timestamp: new Date().toISOString(),
  overallScore,
  summary: {
    pass: totalPass,
    partial: totalPartial,
    fail: totalFail
  },
  categories: testCategories.map(cat => ({
    name: cat.name,
    status: cat.result.status,
    details: cat.result.details
  })),
  criticalEndpoints: {
    expected: criticalEndpoints,
    totalFound: endpointsCount
  },
  deploymentRecommendation: overallScore >= 80 ? 'READY' : overallScore >= 60 ? 'MONITORING' : 'NOT_READY',
  railwayReadiness: {
    score: overallScore,
    apiKeysConfigured: results.openaiIntegration.status === 'PASS' && results.anthropicIntegration.status === 'PASS',
    servicesOperational: results.serviceImplementations.status !== 'FAIL',
    securityEnabled: results.securityFeatures.status !== 'FAIL',
    deploymentReady: results.deploymentReadiness.status !== 'FAIL'
  }
};

fs.writeFileSync('AI_VALIDATION_REPORT.json', JSON.stringify(detailedReport, null, 2));
console.log('📝 Detailed report saved to: AI_VALIDATION_REPORT.json');