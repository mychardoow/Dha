#!/bin/bash

# Optimized startup script for free tier
set +e

echo "🚀 Starting optimized service..."

# Function to log
log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%S")] $1"
}

# Ensure we're using minimal resources
export NODE_ENV=production
export MAX_MEMORY=512
export OPTIMIZE_FOR_FREE_TIER=true

# Start server with basic recovery
while true; do
    node dist/server/index.js
    log "⚠️ Server exited, restarting in 5 seconds..."
    sleep 5
done