
#!/bin/bash

echo "🔍 DHA Digital Services - Key Validation Report"
echo "==============================================="
echo ""

VALIDATION_PASSED=true

# Check if .env file exists and source it
if [[ -f ".env" ]]; then
  echo "📄 Loading environment from .env file..."
  set -a  # automatically export all variables
  source .env
  set +a
  echo "✅ Environment loaded"
else
  echo "⚠️  No .env file found, using system environment"
fi

echo ""
echo "🔐 Core Security Keys Validation:"
echo "--------------------------------"

# Function to validate key
validate_key() {
  local key_name=$1
  local min_length=$2
  local key_value="${!key_name}"
  
  if [[ -z "$key_value" ]]; then
    echo "❌ $key_name: MISSING"
    VALIDATION_PASSED=false
  elif [[ ${#key_value} -lt $min_length ]]; then
    echo "❌ $key_name: TOO SHORT (${#key_value} chars, need $min_length+)"
    VALIDATION_PASSED=false
  else
    echo "✅ $key_name: OK (${#key_value} chars)"
  fi
}

# Validate all keys
validate_key "JWT_SECRET" 64
validate_key "SESSION_SECRET" 32
validate_key "ENCRYPTION_KEY" 32
validate_key "VITE_ENCRYPTION_KEY" 32
validate_key "MASTER_ENCRYPTION_KEY" 64
validate_key "QUANTUM_ENCRYPTION_KEY" 64
validate_key "BIOMETRIC_ENCRYPTION_KEY" 32
validate_key "DOCUMENT_SIGNING_KEY" 32

echo ""
echo "🏛️ Government API Keys:"
echo "----------------------"
validate_key "DHA_NPR_API_KEY" 20
validate_key "DHA_ABIS_API_KEY" 20
validate_key "SAPS_CRC_API_KEY" 20
validate_key "ICAO_PKD_API_KEY" 20
validate_key "SITA_ESERVICES_API_KEY" 20

echo ""
echo "🤖 AI Service Keys:"
echo "------------------"
validate_key "OPENAI_API_KEY" 10
validate_key "ANTHROPIC_API_KEY" 10

echo ""
echo "📊 Validation Summary:"
echo "--------------------"
if [[ $VALIDATION_PASSED == true ]]; then
  echo "🎉 ALL KEYS VALIDATED SUCCESSFULLY!"
  echo "✅ System is ready for production deployment"
else
  echo "❌ Some keys are missing or invalid"
  echo "⚠️  Please review the errors above"
fi

echo ""
echo "🔧 Next Steps:"
echo "1. If validation passed, run: npm start"
echo "2. If keys are missing, run: ./setup-complete-secrets.sh"
echo "3. Add missing keys to Replit Secrets or .env file"
