
import * as crypto from 'crypto';

interface SecretCheck {
  name: string;
  exists: boolean;
  isValid: boolean;
  length?: number;
  type: 'required' | 'optional' | 'ai' | 'government';
  issue?: string;
}

const secretChecks: SecretCheck[] = [];

function checkSecret(name: string, type: 'required' | 'optional' | 'ai' | 'government', minLength?: number, pattern?: RegExp): void {
  const value = process.env[name];
  const check: SecretCheck = {
    name,
    exists: !!value,
    isValid: false,
    type
  };

  if (value) {
    check.length = value.length;
    
    // Check minimum length
    if (minLength && value.length < minLength) {
      check.issue = `Too short (${value.length} chars, needs ${minLength}+)`;
    }
    // Check pattern
    else if (pattern && !pattern.test(value)) {
      check.issue = 'Invalid format';
    }
    // Check for development placeholders
    else if (value.includes('your_') || value.includes('sk-proj-your') || value === 'mock') {
      check.issue = 'Placeholder value detected';
    }
    else {
      check.isValid = true;
    }
  }

  secretChecks.push(check);
}

console.log('🔐 DHA DIGITAL SERVICES - SECRET VALIDATION');
console.log('===========================================\n');

// Required Security Secrets
console.log('🔒 REQUIRED SECURITY SECRETS:');
checkSecret('JWT_SECRET', 'required', 64);
checkSecret('SESSION_SECRET', 'required', 32);
checkSecret('ENCRYPTION_KEY', 'required', 32);
checkSecret('MASTER_ENCRYPTION_KEY', 'required', 32);
checkSecret('BIOMETRIC_ENCRYPTION_KEY', 'required', 32);
checkSecret('DOCUMENT_SIGNING_KEY', 'required', 32);
checkSecret('VITE_ENCRYPTION_KEY', 'required', 32);

// Database
console.log('\n💾 DATABASE:');
checkSecret('DATABASE_URL', 'required', 20, /^postgresql:\/\/.+/);
checkSecret('PGHOST', 'optional');

// AI Services
console.log('\n🤖 AI SERVICE KEYS:');
checkSecret('OPENAI_API_KEY', 'ai', 20, /^sk-/);
checkSecret('ANTHROPIC_API_KEY', 'ai', 20, /^sk-ant-/);
checkSecret('GOOGLE_GENERATIVE_AI_API_KEY', 'ai', 20);
checkSecret('MISTRAL_API_KEY', 'ai', 20);
checkSecret('PERPLEXITY_API_KEY', 'ai', 20, /^pplx-/);

// Government APIs
console.log('\n🏛️  GOVERNMENT API KEYS:');
checkSecret('DHA_NPR_API_KEY', 'government');
checkSecret('DHA_API_SECRET', 'government');
checkSecret('DHA_ABIS_API_KEY', 'government');
checkSecret('SAPS_CRC_API_KEY', 'government');
checkSecret('ICAO_PKD_API_KEY', 'government');

// API URLs
console.log('\n🌐 API ENDPOINTS:');
checkSecret('DHA_NPR_API_URL', 'government');
checkSecret('DHA_ABIS_API_URL', 'government');
checkSecret('SAPS_CRC_API_URL', 'government');
checkSecret('ICAO_PKD_API_URL', 'government');

// Other tokens
console.log('\n📦 OTHER CREDENTIALS:');
checkSecret('GITHUB_TOKEN', 'optional', 20, /^ghp_/);
checkSecret('RAILWAY_TOKEN', 'optional');

// Print results
console.log('\n\n📊 VALIDATION RESULTS:');
console.log('=====================\n');

const byType = {
  required: secretChecks.filter(s => s.type === 'required'),
  ai: secretChecks.filter(s => s.type === 'ai'),
  government: secretChecks.filter(s => s.type === 'government'),
  optional: secretChecks.filter(s => s.type === 'optional')
};

for (const [type, checks] of Object.entries(byType)) {
  const valid = checks.filter(s => s.isValid).length;
  const total = checks.length;
  const emoji = type === 'required' ? '🔒' : type === 'ai' ? '🤖' : type === 'government' ? '🏛️' : '📦';
  
  console.log(`${emoji} ${type.toUpperCase()}: ${valid}/${total} valid`);
  
  checks.forEach(check => {
    const status = check.isValid ? '✅' : check.exists ? '⚠️' : '❌';
    const info = check.issue ? ` - ${check.issue}` : check.exists ? ` (${check.length} chars)` : ' - NOT SET';
    console.log(`  ${status} ${check.name}${info}`);
  });
  console.log('');
}

// Summary
const totalValid = secretChecks.filter(s => s.isValid).length;
const totalExists = secretChecks.filter(s => s.exists).length;
const totalRequired = byType.required.length;
const validRequired = byType.required.filter(s => s.isValid).length;

console.log('📈 SUMMARY:');
console.log(`   Total secrets checked: ${secretChecks.length}`);
console.log(`   Secrets configured: ${totalExists}`);
console.log(`   Valid secrets: ${totalValid}`);
console.log(`   Required secrets valid: ${validRequired}/${totalRequired}`);

console.log('\n🎯 STATUS:');
if (validRequired === totalRequired) {
  console.log('   ✅ ALL REQUIRED SECRETS ARE VALID');
  console.log('   🚀 Application is ready to start!');
} else {
  console.log('   ❌ SOME REQUIRED SECRETS ARE MISSING OR INVALID');
  console.log('   ⚠️  Application may not start properly');
}

// Check for any issues
const issues = secretChecks.filter(s => s.exists && !s.isValid);
if (issues.length > 0) {
  console.log('\n⚠️  ISSUES TO RESOLVE:');
  issues.forEach(issue => {
    console.log(`   - ${issue.name}: ${issue.issue}`);
  });
}

// Recommendations
console.log('\n💡 RECOMMENDATIONS:');
const missingAI = byType.ai.filter(s => !s.exists);
const missingGov = byType.government.filter(s => !s.exists);

if (missingAI.length > 0) {
  console.log('   🤖 Add AI API keys to enable AI assistant features');
}
if (missingGov.length > 0) {
  console.log('   🏛️  Add government API keys for production document verification');
}

console.log('\n✨ Run "npm start" to launch the application!');
