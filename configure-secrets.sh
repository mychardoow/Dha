
#!/bin/bash

echo "🔐 DHA Digital Services - Missing Keys Configuration"
echo "===================================================="
echo ""

echo "📋 Step 1: Generate all cryptographic keys..."
echo "---------------------------------------------"
node generate-production-keys.js

echo ""
echo "🔑 Step 2: Keys you need to obtain manually:"
echo "--------------------------------------------"
echo ""
echo "🏛️  GOVERNMENT API KEYS (Contact agencies directly):"
echo "   • DHA_NPR_API_KEY - Department of Home Affairs NPR"
echo "   • DHA_ABIS_API_KEY - DHA Biometric System"
echo "   • SAPS_CRC_API_KEY - SAPS Criminal Record Check"
echo "   • ICAO_PKD_API_KEY - ICAO Public Key Directory"
echo "   • SITA_ESERVICES_API_KEY - SITA E-Services"
echo ""
echo "🤖 AI SERVICE KEYS (Get from providers):"
echo "   • OPENAI_API_KEY from https://platform.openai.com/api-keys"
echo "   • ANTHROPIC_API_KEY from https://console.anthropic.com/"
echo ""
echo "🗄️  DATABASE:"
echo "   • Set up PostgreSQL database (recommended: Neon, Supabase)"
echo "   • Get DATABASE_URL connection string"
echo ""
echo "📱 Step 3: Set in Replit Secrets or .env file"
echo "---------------------------------------------"
echo "   • Go to Tools > Secrets in Replit"
echo "   • Add each environment variable"
echo "   • Or update your .env file (but don't commit it!)"
echo ""
echo "✅ Configuration complete!"

chmod +x configure-secrets.sh
