import { config } from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

config({ path: path.join(__dirname, '../.env') });

// Required API keys and environment variables
const requiredEnvVars = {
  // Core API Keys
  'OPENAI_API_KEY': 'OpenAI API Key',
  'ANTHROPIC_API_KEY': 'Anthropic API Key',
  'GOOGLE_API_KEY': 'Google API Key',
  'GITHUB_TOKEN': 'GitHub Token',
  'WORKATO_API_KEY': 'Workato API Key',

  // Database and Session
  'DATABASE_URL': 'Database URL',
  'SESSION_SECRET': 'Session Secret',
  'JWT_SECRET': 'JWT Secret',

  // Encryption Keys
  'ENCRYPTION_KEY': 'Main Encryption Key',
  'VITE_ENCRYPTION_KEY': 'Vite Encryption Key',
  'MASTER_ENCRYPTION_KEY': 'Master Encryption Key',
  'QUANTUM_ENCRYPTION_KEY': 'Quantum Encryption Key',
  'BIOMETRIC_ENCRYPTION_KEY': 'Biometric Encryption Key',
  'DOCUMENT_SIGNING_KEY': 'Document Signing Key',

  // DHA Integration Keys
  'DHA_API_KEY': 'DHA API Key',
  'DHA_SECRET_KEY': 'DHA Secret Key',
  'NPR_API_KEY': 'National Population Register API Key',
  'SAPS_API_KEY': 'SAPS API Key',
  'ABIS_API_KEY': 'ABIS API Key',
  'HANIS_API_KEY': 'HANIS API Key',
  'ICAO_PKD_KEY': 'ICAO PKD Key',
  'SITA_API_KEY': 'SITA API Key',
  'CIPC_API_KEY': 'CIPC API Key',
  'DEL_API_KEY': 'Department of Employment and Labour API Key',

  // Security and Authentication
  'AUTH_SECRET': 'Authentication Secret',
  'MFA_SECRET': 'MFA Secret Key',
  'PKI_PRIVATE_KEY': 'PKI Private Key',
  'PKI_PUBLIC_KEY': 'PKI Public Key',
  'HSM_ACCESS_KEY': 'HSM Access Key',

  // External Services
  'SMS_API_KEY': 'SMS Gateway API Key',
  'EMAIL_API_KEY': 'Email Service API Key',
  'PAYMENT_GATEWAY_KEY': 'Payment Gateway Key',
  'VERIFICATION_SERVICE_KEY': 'Verification Service Key',
  'BIOMETRIC_SERVICE_KEY': 'Biometric Service Key',

  // Monitoring and Analytics
  'MONITORING_API_KEY': 'Monitoring Service API Key',
  'ANALYTICS_KEY': 'Analytics API Key',
  'ERROR_TRACKING_KEY': 'Error Tracking Service Key',
  'LOGGING_SERVICE_KEY': 'Logging Service API Key',

  // Compliance and Audit
  'AUDIT_SERVICE_KEY': 'Audit Service API Key',
  'COMPLIANCE_API_KEY': 'Compliance Service API Key',
  'POPIA_COMPLIANCE_KEY': 'POPIA Compliance Key',
  'PFMA_COMPLIANCE_KEY': 'PFMA Compliance Key'
};

let missingVars = [];
let presentVars = [];

console.log('🔍 Validating environment variables...\n');

for (const [key, description] of Object.entries(requiredEnvVars)) {
  if (!process.env[key]) {
    missingVars.push({ key, description });
  } else {
    presentVars.push({ key, description });
  }
}

// Print present variables
console.log('✅ Present Environment Variables:');
console.log('================================');
presentVars.forEach(({ key, description }) => {
  console.log(`✓ ${description} (${key})`);
});

// Print missing variables
if (missingVars.length > 0) {
  console.log('\n❌ Missing Environment Variables:');
  console.log('================================');
  missingVars.forEach(({ key, description }) => {
    console.log(`✗ ${description} (${key})`);
  });
  
  console.error(`\n❌ Error: ${missingVars.length} required environment variables are missing`);
  process.exit(1);
}

console.log('\n✅ All required environment variables are present');