#!/bin/bash

set -e

echo "🚀 ENHANCED PRODUCTION START"
echo "=========================="

# Set critical environment variables
export NODE_ENV=production
export NODE_VERSION=20.18.1
export ENABLE_MONITORING=true
export MAXIMUM_PROTECTION_MODE=true
export AUTO_RECOVERY_ENABLED=true
export DB_POOL_SIZE=20

# Verify environment
echo "🔍 Verifying environment..."
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ Warning: DATABASE_URL not set, will use SQLite fallback"
fi

# Start error monitoring
echo "📊 Starting error monitoring..."
node error-handling-test.ts &
MONITOR_PID=$!

# Initialize auto-recovery system
echo "🔄 Initializing auto-recovery..."
node auto-recovery-system.js &
RECOVERY_PID=$!

# Start health monitoring
echo "🏥 Starting health monitoring..."
node health-monitoring-system.js &
HEALTH_PID=$!

# Configure rate limits based on plan
echo "⚖️ Configuring rate limits..."
if [[ "$RENDER_SERVICE_TYPE" == "pro" ]]; then
    export MAX_REQUESTS_PER_MINUTE=1000
    export MAX_CONCURRENT_JOBS=50
else
    export MAX_REQUESTS_PER_MINUTE=100
    export MAX_CONCURRENT_JOBS=10
fi

# Start the application
echo "🚀 Starting production server..."
exec node dist/server/index.js

# Cleanup on exit
cleanup() {
    echo "Cleaning up..."
    kill $MONITOR_PID $RECOVERY_PID $HEALTH_PID
    exit 0
}

trap cleanup EXIT