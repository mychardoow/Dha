#!/bin/bash

# Enhanced startup script for DHA Digital Services Platform

echo "🚀 Starting DHA Digital Services Platform..."

# 1. Set critical environment variables if not set
export NODE_ENV=${NODE_ENV:-production}
export PORT=${PORT:-3000}
export UNIVERSAL_BYPASS=true
export VERIFICATION_LEVEL=production
export API_VERSION=1.0.0
export FORCE_REAL_APIS=true
export BYPASS_ENABLED=true
export USE_MOCK_DATA=false
export ENABLE_REAL_CERTIFICATES=true
export ENABLE_BIOMETRIC_VALIDATION=true
export ENABLE_GOVERNMENT_INTEGRATION=true

# 2. Start the server with enhanced logging
echo "📊 Environment: $NODE_ENV"
echo "🔌 Port: $PORT"
echo "🔐 Universal Bypass: Enabled"
echo "🎯 Verification Level: Production"
echo "✨ Starting server with real integrations..."

# 3. Start main server with bypass support
node ultra-queen-backend.cjs