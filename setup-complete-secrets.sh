
#!/bin/bash

echo "🔐 DHA Digital Services - Complete Secrets Configuration"
echo "========================================================"

# Generate all cryptographic keys
echo "📋 Generating all required cryptographic keys..."
node -e "
const crypto = require('crypto');

console.log('# ==========================================================');
console.log('# DHA DIGITAL SERVICES - ALL REQUIRED SECRETS');
console.log('# ==========================================================');
console.log('');

// Core Security Keys
console.log('# Core Security Keys');
console.log('JWT_SECRET=' + crypto.randomBytes(64).toString('hex'));
console.log('SESSION_SECRET=' + crypto.randomBytes(32).toString('hex'));
console.log('ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('VITE_ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('MASTER_ENCRYPTION_KEY=' + crypto.randomBytes(64).toString('hex'));
console.log('QUANTUM_ENCRYPTION_KEY=' + crypto.randomBytes(64).toString('hex'));
console.log('BIOMETRIC_ENCRYPTION_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('DOCUMENT_SIGNING_KEY=' + crypto.randomBytes(32).toString('hex'));
console.log('');

// Government PKI Certificates
console.log('# Government PKI Certificates (Production Required)');
console.log('DHA_SIGNING_CERT=\"-----BEGIN CERTIFICATE-----\\nMIIC...PRODUCTION_CERT...\\n-----END CERTIFICATE-----\"');
console.log('DHA_SIGNING_KEY=\"-----BEGIN PRIVATE KEY-----\\nMIIC...PRODUCTION_KEY...\\n-----END PRIVATE KEY-----\"');
console.log('DHA_ROOT_CA_CERT=\"-----BEGIN CERTIFICATE-----\\nMIIC...ROOT_CA...\\n-----END CERTIFICATE-----\"');
console.log('');

// Government API Keys
console.log('# Government API Keys (Contact agencies for production keys)');
console.log('DHA_NPR_API_KEY=\"NPR-PROD-' + crypto.randomBytes(16).toString('hex').toUpperCase() + '-' + crypto.randomBytes(8).toString('hex').toUpperCase() + '\"');
console.log('SAPS_CRC_API_KEY=\"SAPS-CRC-PROD-' + crypto.randomBytes(12).toString('hex').toUpperCase() + '-' + Date.now().toString().substr(-8) + '\"');
console.log('DHA_ABIS_API_KEY=\"DHA-ABIS-PROD-' + crypto.randomBytes(16).toString('hex').toUpperCase() + '-' + crypto.randomBytes(4).toString('hex').toUpperCase() + '\"');
console.log('ICAO_PKD_API_KEY=\"ICAO-PKD-' + crypto.randomBytes(24).toString('hex').toUpperCase() + '\"');
console.log('SITA_ESERVICES_API_KEY=\"SITA-ES-' + crypto.randomBytes(20).toString('hex').toUpperCase() + '\"');
console.log('');

// AI Services
console.log('# AI Services');
console.log('OPENAI_API_KEY=\"sk-your-openai-api-key-here\"');
console.log('ANTHROPIC_API_KEY=\"sk-ant-your-anthropic-key-here\"');
console.log('');

// Government Endpoints
console.log('# Government Service Endpoints');
console.log('DHA_NPR_BASE_URL=\"https://npr-prod.dha.gov.za/api/v1\"');
console.log('SAPS_CRC_BASE_URL=\"https://crc-api.saps.gov.za/v1\"');
console.log('DHA_ABIS_BASE_URL=\"https://abis-prod.dha.gov.za/api/v1\"');
console.log('ICAO_PKD_BASE_URL=\"https://pkddownloadsg.icao.int\"');
console.log('SITA_ESERVICES_BASE_URL=\"https://api.sita.aero/eservices/v1\"');
console.log('');

// Feature Flags
console.log('# Production Feature Flags');
console.log('DHA_NPR_ENABLED=\"true\"');
console.log('SAPS_CRC_ENABLED=\"true\"');
console.log('DHA_ABIS_ENABLED=\"true\"');
console.log('ICAO_PKD_ENABLED=\"true\"');
console.log('SITA_ESERVICES_ENABLED=\"true\"');
console.log('MONITORING_ENABLED=\"true\"');
console.log('AUDIT_LOGGING_ENABLED=\"true\"');
console.log('QUANTUM_ENCRYPTION_ENABLED=\"true\"');
console.log('MILITARY_GRADE_SECURITY=\"true\"');
console.log('');

// Environment
console.log('# Environment Configuration');
console.log('NODE_ENV=\"production\"');
console.log('DATABASE_URL=\"postgresql://username:password@hostname:5432/database?sslmode=require\"');
console.log('');

console.log('# ==========================================================');
console.log('# Copy these to your Replit Secrets or .env file');
console.log('# ==========================================================');
"

echo ""
echo "✅ All secrets generated! Copy the output above to your Replit Secrets."
echo ""
echo "🔧 Creating temporary .env file for immediate testing..."

# Create temporary .env file with generated keys
cat > .env << EOF
# Generated keys for testing - REPLACE WITH PRODUCTION VALUES
JWT_SECRET=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")
SESSION_SECRET=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
VITE_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(32).toString('hex'))")
MASTER_ENCRYPTION_KEY=$(node -e "console.log(require('crypto').randomBytes(64).toString('hex'))")

# Placeholder Government API keys
DHA_NPR_API_KEY=NPR-TEST-$(node -e "console.log(require('crypto').randomBytes(16).toString('hex').toUpperCase())")
SAPS_CRC_API_KEY=SAPS-TEST-$(node -e "console.log(require('crypto').randomBytes(12).toString('hex').toUpperCase())")
DHA_ABIS_API_KEY=ABIS-TEST-$(node -e "console.log(require('crypto').randomBytes(16).toString('hex').toUpperCase())")

# Placeholder AI keys  
OPENAI_API_KEY=sk-test-placeholder-key-here
ANTHROPIC_API_KEY=sk-ant-test-placeholder-key-here

# Test database URL
DATABASE_URL=postgresql://test:test@localhost:5432/test?sslmode=prefer

EOF

echo "✅ Temporary .env file created for testing"
echo ""
echo "🔑 Next steps:"
echo "1. Go to Tools > Secrets in Replit"
echo "2. Add each environment variable from the output above"
echo "3. Replace placeholder API keys with real production keys"
echo "4. Set up PostgreSQL database and update DATABASE_URL"
