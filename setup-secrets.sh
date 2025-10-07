#!/bin/bash

echo "🔐 Setting up DHA Digital Services API Keys in Replit Secrets"
echo "=============================================================="
echo ""

# Function to add secret
add_secret() {
  local key=$1
  local prompt=$2
  
  echo "📝 $prompt"
  read -p "Enter value (or press Enter to skip): " value
  
  if [ -n "$value" ]; then
    echo "$value" | replit secrets set "$key" --stdin
    echo "✅ Set $key"
  else
    echo "⏭️  Skipped $key"
  fi
  echo ""
}

# AI API Keys
echo "🤖 AI Service API Keys"
echo "----------------------"
add_secret "OPENAI_API_KEY" "OpenAI API Key (from https://platform.openai.com/api-keys)"
add_secret "ANTHROPIC_API_KEY" "Anthropic API Key (optional)"
add_secret "GOOGLE_GENERATIVE_AI_API_KEY" "Google Generative AI API Key (optional)"
add_secret "MISTRAL_API_KEY" "Mistral API Key (optional)"
add_secret "PERPLEXITY_API_KEY" "Perplexity API Key (optional)"

# Government API Keys
echo "🏛️  Government API Keys"
echo "----------------------"
add_secret "DHA_NPR_API_KEY" "DHA NPR API Key"
add_secret "DHA_API_SECRET" "DHA API Secret"
add_secret "DHA_ABIS_API_KEY" "DHA ABIS API Key"
add_secret "SAPS_CRC_API_KEY" "SAPS CRC API Key"
add_secret "ICAO_PKD_API_KEY" "ICAO PKD API Key"

# Database
echo "💾 Database Configuration"
echo "------------------------"
add_secret "DATABASE_URL" "PostgreSQL Database URL (e.g., postgresql://user:pass@host:5432/db)"

# Security Keys
echo "🔒 Security Keys"
echo "---------------"
add_secret "JWT_SECRET" "JWT Secret (min 64 chars)"
add_secret "SESSION_SECRET" "Session Secret (min 32 chars)"
add_secret "ENCRYPTION_KEY" "Encryption Key (min 32 chars)"

echo ""
echo "✅ Setup complete!"
echo "🔍 View your secrets: replit secrets list"
