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
if [ -f dist/server/index.js ]; then
	node dist/server/index.js 2>&1 | tee -a server.log
elif [ -f dist/server.cjs ]; then
	node dist/server.cjs 2>&1 | tee -a server.log
elif [ -f dist/server.js ]; then
	node dist/server.js 2>&1 | tee -a server.log
else
	echo "❌ No server entry found in dist/. Build may have failed."
	exit 1
fi