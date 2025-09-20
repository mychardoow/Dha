
#!/usr/bin/env node

/**
 * DHA Digital Services - Production Key Generator
 * Generates cryptographically secure keys for production deployment
 */

const crypto = require('crypto');

console.log('🔐 DHA Digital Services - Production Key Generator');
console.log('==================================================\n');

console.log('⚠️  IMPORTANT: Store these keys securely in your environment variables');
console.log('⚠️  These keys are for PRODUCTION use only - keep them secret!\n');

// Generate all required keys
const keys = {
  // Core security keys
  JWT_SECRET: crypto.randomBytes(64).toString('hex'),
  SESSION_SECRET: crypto.randomBytes(32).toString('hex'),
  
  // Encryption keys
  ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  VITE_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  MASTER_ENCRYPTION_KEY: crypto.randomBytes(64).toString('hex'),
  QUANTUM_ENCRYPTION_KEY: crypto.randomBytes(64).toString('hex'),
  BIOMETRIC_ENCRYPTION_KEY: crypto.randomBytes(32).toString('hex'),
  DOCUMENT_SIGNING_KEY: crypto.randomBytes(32).toString('hex'),
};

console.log('📋 Copy these environment variables to your .env file or deployment platform:\n');
console.log('# ==========================================================');
console.log('# GENERATED SECURITY KEYS - KEEP SECURE!');
console.log('# ==========================================================\n');

for (const [key, value] of Object.entries(keys)) {
  console.log(`${key}=${value}`);
}

console.log('\n# ==========================================================');
console.log('# GOVERNMENT API KEYS (REPLACE WITH ACTUAL VALUES)');
console.log('# ==========================================================\n');

console.log('DHA_NPR_API_KEY=your_actual_dha_npr_api_key_here');
console.log('DHA_ABIS_API_KEY=your_actual_dha_abis_api_key_here');
console.log('SAPS_CRC_API_KEY=your_actual_saps_crc_api_key_here');
console.log('ICAO_PKD_API_KEY=your_actual_icao_pkd_api_key_here');
console.log('SITA_ESERVICES_API_KEY=your_actual_sita_eservices_api_key_here');

console.log('\n# ==========================================================');
console.log('# AI SERVICE KEYS (GET FROM PROVIDERS)');
console.log('# ==========================================================\n');

console.log('OPENAI_API_KEY=sk-your_openai_api_key_here');
console.log('ANTHROPIC_API_KEY=sk-ant-your_anthropic_api_key_here');

console.log('\n# ==========================================================');
console.log('# DATABASE URL (SET UP YOUR DATABASE)');
console.log('# ==========================================================\n');

console.log('DATABASE_URL=postgresql://username:password@hostname:5432/database?sslmode=require');

console.log('\n🔒 Security Reminders:');
console.log('  • Never commit these keys to version control');
console.log('  • Use different keys for development and production');
console.log('  • Rotate keys regularly for enhanced security');
console.log('  • Store keys in your deployment platform\'s environment variables');
console.log('\n✅ Key generation complete!');
