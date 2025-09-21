
#!/bin/bash

echo "🔐 DHA Digital Services - Complete Environment Setup"
echo "=================================================="

# Generate secure random keys
generate_key() {
    openssl rand -hex $1 2>/dev/null || node -e "console.log(require('crypto').randomBytes($1).toString('hex'))"
}

# Core Security Keys
JWT_SECRET=$(generate_key 64)
SESSION_SECRET=$(generate_key 32)
ENCRYPTION_KEY=$(generate_key 32)
VITE_ENCRYPTION_KEY=$(generate_key 32)
MASTER_ENCRYPTION_KEY=$(generate_key 64)
QUANTUM_ENCRYPTION_KEY=$(generate_key 64)
BIOMETRIC_ENCRYPTION_KEY=$(generate_key 32)
DOCUMENT_SIGNING_KEY=$(generate_key 32)

# Output all environment variables
cat > .env << EOF
# Core Application
NODE_ENV=production
PORT=5000
DATABASE_URL=postgresql://username:password@hostname:5432/database?sslmode=require

# Security Keys
JWT_SECRET=${JWT_SECRET}
SESSION_SECRET=${SESSION_SECRET}
ENCRYPTION_KEY=${ENCRYPTION_KEY}
VITE_ENCRYPTION_KEY=${VITE_ENCRYPTION_KEY}
MASTER_ENCRYPTION_KEY=${MASTER_ENCRYPTION_KEY}
QUANTUM_ENCRYPTION_KEY=${QUANTUM_ENCRYPTION_KEY}
BIOMETRIC_ENCRYPTION_KEY=${BIOMETRIC_ENCRYPTION_KEY}
DOCUMENT_SIGNING_KEY=${DOCUMENT_SIGNING_KEY}

# Government API Keys (Replace with real keys)
DHA_NPR_API_KEY="NPR-DEV-$(generate_key 16)"
SAPS_CRC_API_KEY="SAPS-DEV-$(generate_key 16)"
DHA_ABIS_API_KEY="DHA-ABIS-DEV-$(generate_key 16)"
ICAO_PKD_API_KEY="ICAO-DEV-$(generate_key 16)"
SITA_ESERVICES_API_KEY="SITA-DEV-$(generate_key 16)"

# AI Services (Replace with real keys)
OPENAI_API_KEY="sk-your-openai-api-key-here"
ANTHROPIC_API_KEY="sk-ant-your-anthropic-key-here"

# Feature Flags
DHA_NPR_ENABLED=true
SAPS_CRC_ENABLED=true
DHA_ABIS_ENABLED=true
ICAO_PKD_ENABLED=true
SITA_ESERVICES_ENABLED=true
MONITORING_ENABLED=true
AUDIT_LOGGING_ENABLED=true
QUANTUM_ENCRYPTION_ENABLED=true
MILITARY_GRADE_SECURITY=true

# Service URLs
DHA_NPR_BASE_URL=https://npr-prod.dha.gov.za/api/v1
SAPS_CRC_BASE_URL=https://crc-api.saps.gov.za/v1
DHA_ABIS_BASE_URL=https://abis-prod.dha.gov.za/api/v1
ICAO_PKD_BASE_URL=https://pkddownloadsg.icao.int
SITA_ESERVICES_BASE_URL=https://api.sita.aero/eservices/v1

# GitHub Integration (Optional)
GITHUB_TOKEN=your-github-token-here
EOF

echo "✅ Environment variables generated in .env file"
echo "🔑 Please copy these to Replit Secrets for production deployment"
echo ""
echo "📋 To set up in Replit:"
echo "1. Go to Tools > Secrets in Replit"
echo "2. Copy each variable from .env file above"
echo "3. Replace placeholder API keys with real production keys"
echo "4. Set up PostgreSQL database and update DATABASE_URL"
