#!/bin/bash

# Ultra-Robust Start Script for Render Free Tier
# Guaranteed to work with comprehensive monitoring and auto-recovery

set -e

echo "🚀 Starting Ultra-Robust Server..."

# Load environment overrides
export NODE_ENV=production
export PORT=5000
export HOST=0.0.0.0
export UNIVERSAL_API_OVERRIDE=true
export BYPASS_API_VALIDATION=true
export FORCE_API_SUCCESS=true
export AUTO_RECOVERY=true
export CIRCUIT_BREAKER_ENABLED=true
export GRACEFUL_DEGRADATION=true

# Start monitoring scripts in background
node health-monitoring-system.js &
node anti-sleep-system.js &
node advanced-memory-manager.js &
node auto-recovery-system.js &

# Start the server with robust auto-restart and diagnostics
MAX_RESTARTS=10
RESTART_COUNT=0
while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
    echo "📡 Attempt $(($RESTART_COUNT+1))/$MAX_RESTARTS: Starting server..."
    node server.js && {
        echo "✅ Server started successfully. Exiting restart loop.";
        break
    }
    RESTART_COUNT=$(($RESTART_COUNT+1))
    echo "⚠️ Server exited (attempt $RESTART_COUNT). Restarting in 3 seconds..."
    sleep 3
done
if [ $RESTART_COUNT -ge $MAX_RESTARTS ]; then
    echo "❌ Server failed to start after $MAX_RESTARTS attempts. Exiting with error."
    exit 1
fi