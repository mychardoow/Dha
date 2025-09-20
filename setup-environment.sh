
#!/bin/bash

echo "🔐 DHA Digital Services - Environment Setup Script"
echo "=================================================="
echo ""

# Make the script executable
chmod +x generate-production-keys.js

echo "📋 Step 1: Generate cryptographic keys..."
echo "----------------------------------------"
node generate-production-keys.js > generated-keys.txt

echo "✅ Keys generated and saved to 'generated-keys.txt'"
echo ""

echo "📝 Step 2: Government API Key Configuration"
echo "-------------------------------------------"
echo ""
echo "You need to obtain the following API keys from government agencies:"
echo ""
echo "🏛️  DHA (Department of Home Affairs):"
echo "   • DHA_NPR_API_KEY - National Population Register API"
echo "   • DHA_ABIS_API_KEY - Automated Biometric Identification System API"
echo ""
echo "👮 SAPS (South African Police Service):"
echo "   • SAPS_CRC_API_KEY - Criminal Record Check API"
echo ""
echo "✈️  ICAO (International Civil Aviation Organization):"
echo "   • ICAO_PKD_API_KEY - Public Key Directory API"
echo ""
echo "🖥️  SITA (State Information Technology Agency):"
echo "   • SITA_ESERVICES_API_KEY - E-Services API"
echo ""

echo "🤖 Step 3: AI Service Configuration"
echo "-----------------------------------"
echo ""
echo "Get API keys from:"
echo "   • OpenAI: https://platform.openai.com/api-keys"
echo "   • Anthropic: https://console.anthropic.com/"
echo ""

echo "🗄️  Step 4: Database Setup"
echo "--------------------------"
echo ""
echo "Set up a PostgreSQL database with one of these providers:"
echo "   • Neon: https://neon.tech/"
echo "   • Supabase: https://supabase.com/"
echo "   • Railway: https://railway.app/"
echo ""

echo "🔒 Step 5: Security Reminders"
echo "-----------------------------"
echo ""
echo "   ⚠️  Never commit .env files to version control"
echo "   ⚠️  Use different keys for development and production"
echo "   ⚠️  Store production keys securely in your deployment platform"
echo "   ⚠️  Rotate keys regularly for enhanced security"
echo ""

echo "✅ Setup complete! Check 'generated-keys.txt' for your cryptographic keys."
echo "📁 Copy the generated keys to your .env file or deployment environment."
