
#!/bin/bash

# DHA Digital Services - Key Validation Script
set -e

echo "🔍 DHA Digital Services - Key Validation Report"
echo "==============================================="

echo ""
echo "📄 Loading environment from .env file..."

# Source environment variables if .env exists
if [ -f ".env" ]; then
    export $(cat .env | grep -v '^#' | xargs)
    echo "✅ Environment loaded"
else
    echo "⚠️  No .env file found"
fi

echo ""
echo "🔐 Core Security Keys Validation:"
echo "--------------------------------"

# Validate JWT_SECRET
if [ -n "$JWT_SECRET" ]; then
    echo "✅ JWT_SECRET: OK (${#JWT_SECRET} chars)"
else
    echo "❌ JWT_SECRET: MISSING"
fi

# Validate SESSION_SECRET
if [ -n "$SESSION_SECRET" ]; then
    echo "✅ SESSION_SECRET: OK (${#SESSION_SECRET} chars)"
else
    echo "❌ SESSION_SECRET: MISSING"
fi

# Validate ENCRYPTION_KEY
if [ -n "$ENCRYPTION_KEY" ]; then
    echo "✅ ENCRYPTION_KEY: OK (${#ENCRYPTION_KEY} chars)"
else
    echo "❌ ENCRYPTION_KEY: MISSING"
fi

# Validate VITE_ENCRYPTION_KEY
if [ -n "$VITE_ENCRYPTION_KEY" ]; then
    echo "✅ VITE_ENCRYPTION_KEY: OK (${#VITE_ENCRYPTION_KEY} chars)"
else
    echo "❌ VITE_ENCRYPTION_KEY: MISSING"
fi

# Validate MASTER_ENCRYPTION_KEY
if [ -n "$MASTER_ENCRYPTION_KEY" ]; then
    echo "✅ MASTER_ENCRYPTION_KEY: OK (${#MASTER_ENCRYPTION_KEY} chars)"
else
    echo "❌ MASTER_ENCRYPTION_KEY: MISSING"
fi

# Validate QUANTUM_ENCRYPTION_KEY
if [ -n "$QUANTUM_ENCRYPTION_KEY" ]; then
    echo "✅ QUANTUM_ENCRYPTION_KEY: OK (${#QUANTUM_ENCRYPTION_KEY} chars)"
else
    echo "❌ QUANTUM_ENCRYPTION_KEY: MISSING"
fi

echo ""
echo "🏛️ Government API Keys:"
echo "----------------------"

# Validate DHA keys
if [ -n "$DHA_NPR_API_KEY" ]; then
    echo "✅ DHA_NPR_API_KEY: OK (${#DHA_NPR_API_KEY} chars)"
else
    echo "❌ DHA_NPR_API_KEY: MISSING"
fi

if [ -n "$DHA_ABIS_API_KEY" ]; then
    echo "✅ DHA_ABIS_API_KEY: OK (${#DHA_ABIS_API_KEY} chars)"
else
    echo "❌ DHA_ABIS_API_KEY: MISSING"
fi

echo ""
echo "🤖 AI Service Keys:"
echo "------------------"

# Validate AI keys
if [ -n "$OPENAI_API_KEY" ]; then
    echo "✅ OPENAI_API_KEY: OK (${#OPENAI_API_KEY} chars)"
else
    echo "❌ OPENAI_API_KEY: MISSING"
fi

if [ -n "$ANTHROPIC_API_KEY" ]; then
    echo "✅ ANTHROPIC_API_KEY: OK (${#ANTHROPIC_API_KEY} chars)"
else
    echo "❌ ANTHROPIC_API_KEY: MISSING"
fi

echo ""
echo "📊 Validation Summary:"
echo "--------------------"

# Count missing keys
missing_count=0

[ -z "$JWT_SECRET" ] && ((missing_count++))
[ -z "$SESSION_SECRET" ] && ((missing_count++))
[ -z "$ENCRYPTION_KEY" ] && ((missing_count++))
[ -z "$QUANTUM_ENCRYPTION_KEY" ] && ((missing_count++))

if [ $missing_count -eq 0 ]; then
    echo "✅ All critical keys are present"
    echo "🚀 System ready for production deployment"
else
    echo "❌ $missing_count critical keys are missing"
    echo "⚠️  Please review the errors above"
fi

echo ""
echo "🔧 Next Steps:"
echo "1. If validation passed, run: npm start"
echo "2. If keys are missing, run: ./setup-complete-secrets.sh"
echo "3. Add missing keys to Replit Secrets or .env file"
echo ""
