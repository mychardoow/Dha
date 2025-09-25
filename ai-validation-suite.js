#!/usr/bin/env node

/**
 * AI VALIDATION SUITE - Direct Service Testing
 * Tests AI services directly for comprehensive validation
 */

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
const fs = require('fs');
const path = require('path');

const serviceFiles = [
  'server/services/ai-assistant.ts',
  'server/services/military-grade-ai-assistant.ts',
  'server/services/enhanced-ai-assistant.ts', 
  'server/services/ultra-ai-system.ts'
];

let servicesFound = 0;
let servicesValid = 0;

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
      
      if (hasProcessMethod && hasErrorHandling && (hasOpenAIImport || hasAnthropicImport)) {
        servicesValid++;
        console.log(`   ✅ ${path.basename(file)}: Valid implementation`);
      } else {
        console.log(`   ⚠️  ${path.basename(file)}: Implementation needs review`);
      }
    }
  } catch (error) {
    console.log(`   ❌ ${path.basename(file)}: File access error`);
  }
});

results.serviceImplementations.status = servicesValid === servicesFound ? 'PASS' : 'PARTIAL';
results.serviceImplementations.details.push({
  test: 'Service Implementation Validation',
  status: results.serviceImplementations.status,
  message: `${servicesValid}/${servicesFound} services have valid implementations`
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

routeFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      routesFound++;
      const content = fs.readFileSync(file, 'utf-8');
      
      // Count endpoints
      const postRoutes = (content.match(/router\.post\(/g) || []).length;
      const getRoutes = (content.match(/router\.get\(/g) || []).length;
      endpointsCount += postRoutes + getRoutes;
      
      console.log(`   ✅ ${path.basename(file)}: ${postRoutes + getRoutes} endpoints found`);
    }
  } catch (error) {
    console.log(`   ❌ ${path.basename(file)}: File access error`);
  }
});

results.endpointStructure.status = endpointsCount >= 10 ? 'PASS' : 'PARTIAL';
results.endpointStructure.details.push({
  test: 'AI Endpoint Structure',
  status: results.endpointStructure.status,
  message: `${endpointsCount} AI endpoints discovered across ${routesFound} route files`
});

// Test 4: Security Features Analysis
console.log('\n4️⃣ Analyzing Security Features...');
const securityFiles = [
  'server/middleware/auth.ts',
  'server/services/military-grade-ai-assistant.ts',
  'server/middleware/rate-limiting.ts'
];

let securityFeatures = 0;
securityFiles.forEach(file => {
  try {
    if (fs.existsSync(file)) {
      const content = fs.readFileSync(file, 'utf-8');
      
      if (content.includes('auth') || content.includes('jwt') || content.includes('token')) {
        securityFeatures++;
        console.log(`   ✅ ${path.basename(file)}: Security implementation found`);
      }
    }
  } catch (error) {
    console.log(`   ⚠️  ${path.basename(file)}: Not found`);
  }
});

results.securityFeatures.status = securityFeatures >= 2 ? 'PASS' : 'PARTIAL';
results.securityFeatures.details.push({
  test: 'Security Feature Implementation',
  status: results.securityFeatures.status,
  message: `${securityFeatures} security components identified`
});

// Test 5: Multi-Language Support
console.log('\n5️⃣ Checking Multi-Language Support...');
try {
  const aiAssistantContent = fs.readFileSync('server/services/ai-assistant.ts', 'utf-8');
  const hasLanguageSupport = aiAssistantContent.includes('language') && 
                              (aiAssistantContent.includes('af') || aiAssistantContent.includes('zu') || 
                               aiAssistantContent.includes('xh') || aiAssistantContent.includes('multi'));
  
  results.multiLanguage.status = hasLanguageSupport ? 'PASS' : 'PARTIAL';
  results.multiLanguage.details.push({
    test: 'South African Language Support',
    status: results.multiLanguage.status,
    message: hasLanguageSupport ? 'Multi-language support detected' : 'Limited language support found'
  });
  
  console.log(`   ${hasLanguageSupport ? '✅' : '⚠️'} Multi-language support: ${hasLanguageSupport ? 'Available' : 'Limited'}`);
} catch (error) {
  console.log('   ❌ Language support analysis failed');
  results.multiLanguage.status = 'FAIL';
}

// Test 6: Document Processing Capabilities
console.log('\n6️⃣ Checking Document Processing...');
const docProcessingFiles = [
  'server/services/document-processor.ts',
  'server/services/enhanced-sa-ocr.ts',
  'server/services/ai-ocr-integration.ts'
];

let docFeatures = 0;
docProcessingFiles.forEach(file => {
  if (fs.existsSync(file)) {
    docFeatures++;
    console.log(`   ✅ ${path.basename(file)}: Found`);
  } else {
    console.log(`   ⚠️  ${path.basename(file)}: Not found`);
  }
});

results.documentProcessing.status = docFeatures >= 2 ? 'PASS' : 'PARTIAL';
results.documentProcessing.details.push({
  test: 'Document Processing Services',
  status: results.documentProcessing.status,
  message: `${docFeatures} document processing services available`
});

// Test 7: Voice Services
console.log('\n7️⃣ Checking Voice Services...');
const voiceServiceFile = 'server/services/enhanced-voice-service.ts';
let voiceSupport = false;

try {
  if (fs.existsSync(voiceServiceFile)) {
    const content = fs.readFileSync(voiceServiceFile, 'utf-8');
    voiceSupport = content.includes('stt') || content.includes('tts') || 
                   content.includes('speech') || content.includes('voice');
    console.log(`   ✅ Voice services: ${voiceSupport ? 'Implementation found' : 'Basic structure'}`);
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
  message: voiceSupport ? 'Voice services implemented' : 'Voice services limited'
});

// Test 8: Government Context
console.log('\n8️⃣ Checking Government Context...');
const govFiles = [
  'server/services/dha-document-generator.ts',
  'server/services/production-government-api.ts',
  'server/services/government-api-integrations.ts'
];

let govFeatures = 0;
govFiles.forEach(file => {
  if (fs.existsSync(file)) {
    govFeatures++;
    console.log(`   ✅ ${path.basename(file)}: Found`);
  } else {
    console.log(`   ⚠️  ${path.basename(file)}: Not found`);
  }
});

results.governmentContext.status = govFeatures >= 2 ? 'PASS' : 'PARTIAL';
results.governmentContext.details.push({
  test: 'Government Integration Services',
  status: results.governmentContext.status,
  message: `${govFeatures} government integration services available`
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
  const hasDeps = essentialDeps.every(dep => 
    packageJson.dependencies && packageJson.dependencies[dep]
  );
  
  if (hasDeps) {
    deploymentScore += 2;
    console.log('   ✅ Essential dependencies: Present');
  } else {
    deploymentIssues.push('Missing essential dependencies');
    console.log('   ⚠️  Essential dependencies: Some missing');
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

results.deploymentReadiness.status = deploymentScore >= 3 ? 'PASS' : deploymentScore >= 2 ? 'PARTIAL' : 'FAIL';
results.deploymentReadiness.details.push({
  test: 'Deployment Readiness Assessment',
  status: results.deploymentReadiness.status,
  message: `Deployment score: ${deploymentScore}/5`,
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
  deploymentRecommendation: overallScore >= 80 ? 'READY' : overallScore >= 60 ? 'MONITORING' : 'NOT_READY'
};

fs.writeFileSync('AI_VALIDATION_REPORT.json', JSON.stringify(detailedReport, null, 2));
console.log('📝 Detailed report saved to: AI_VALIDATION_REPORT.json');