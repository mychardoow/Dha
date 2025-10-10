#!/bin/bash

# 🛡️ BULLETPROOF RENDER START - PRODUCTION READY
export NODE_ENV=production
export PORT=${PORT:-5000}
export HOST=0.0.0.0

# Memory optimization for free tier
export NODE_OPTIONS="--max-old-space-size=460"

echo "🚀 STARTING BULLETPROOF SERVER"
echo "================================"
echo "Port: $PORT"
echo "Environment: $NODE_ENV"
echo ""

# Start with auto-recovery
node dist/server/index.js 2>&1 | tee -a server.log