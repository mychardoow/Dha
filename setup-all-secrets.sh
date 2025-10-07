
#!/bin/bash

echo "🔐 DHA Digital Services - Automated Secret Setup"
echo "=================================================="
echo ""
echo "⚠️  IMPORTANT: This script will automatically add secrets to Replit"
echo ""

# Certificate and Authentication Keys
echo "📜 Setting Certificate Keys..."
replit secrets set CERT_KEY_IDENTIFIER "30 82 01 Oa 02 82 01 01 00 c0 1c 5d a6 11 7c 1e 42 b2 d6 07 cc 5d 6b 4f ff 24 9c e9 9e ab f8 da fa 58 9c 4d aa 3d 83 75 a3 fe 15 e4 f8 ca bb 76 34 b7 c9 97 62 64 40 37 e8 ad 04 86 88 c8 92 ac 4b 90 e8 cd e5 d5 8b fa 03 2e 2d d1 bf f6 a9 c0 a2 dd 23 d5 00 b7 dc cc cc 3a 28 73 df 95 4c 80 e9 7a 74 e1 c8 7d 23 Oa c9 f7 do 2b la 79 38 61 88 Oa ef 7f 92 8f 11 f5 aO 05 e1 20 73 d8 4f 8a a8 57 ff d6 1c b9 dc 9e 97 af 38 82 23 89 2e eb cb 19 2a le 09 a3 ac 18 19 4e fc ac 99 84 85 ac 59 4a 29 a1 c1 e4 da e1 f4 10 80 Oa Of e1 f4 c9 25 al 60 6c fb 07 19 15 e8 e0 36 4f ab 6a 57 3d 87 cd 00 40 d5 ab 1a 05 73 f2 e7 55 35 18 f9 ff c7 c9 05 28 09 d6 3a 68 f9 71 cf db a9 6d 22 8b 9e 26 d6 59 d2 34 2f 2e 6f 91 c1 e0 29 6b b1 40 d5 bc df ae 37 c4 3b 7c 60 00 99 87 26 99 8c ec b7 c4 ab 74 a5 09 94 9d 57 02 03 01 00 01"

replit secrets set QUANTUM_MASTER_KEY "6f97ecbef29d83f83b9376fc1ab0990080d87c3a7bba46d88a9acfbaff20322a92b1f623ebb5ca69efff33a3bd8972189458a833953db052e670933cb39050b5"

# Database Configuration
echo "💾 Setting Database Configuration..."
replit secrets set DATABASE_URL "postgresql://neondb_owner:npg_QBn5jegNyi7F@ep-withered-sun-afawa714.c-2.us-west-2.aws.neon.tech:5432/neondb?sslmode=require"
replit secrets set PGHOST "ep-withered-sun-afawa714.c-2.us-west-2.aws.neon.tech"

# GitHub Token
echo "📦 Setting GitHub Token..."
replit secrets set GITHUB_TOKEN "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"

# Generate secure encryption keys if not provided
echo "🔒 Setting Security Keys..."
replit secrets set SESSION_SECRET "$(openssl rand -hex 32)"
replit secrets set JWT_SECRET "$(openssl rand -hex 64)"
replit secrets set ENCRYPTION_KEY "$(openssl rand -hex 32)"
replit secrets set MASTER_ENCRYPTION_KEY "$(openssl rand -hex 32)"
replit secrets set BIOMETRIC_ENCRYPTION_KEY "$(openssl rand -hex 32)"
replit secrets set DOCUMENT_SIGNING_KEY "$(openssl rand -hex 32)"
replit secrets set VITE_ENCRYPTION_KEY "$(openssl rand -hex 32)"

# Environment
echo "⚙️  Setting Environment Variables..."
replit secrets set NODE_ENV "production"

echo ""
echo "✅ ALL SECRETS CONFIGURED!"
echo ""
echo "🎉 Setup Complete!"
echo "Your DHA Digital Services platform is now fully configured."
echo ""
echo "📋 Next Steps:"
echo "1. Click the Run button to start the application"
echo "2. Add your AI API keys (optional):"
echo "   - OPENAI_API_KEY"
echo "   - ANTHROPIC_API_KEY"
echo ""
