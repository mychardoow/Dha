#!/bin/bash

set -e

echo "🚀 DHA PRODUCTION STARTUP"
echo "========================"

# Set critical environment variables
export NODE_ENV=production
export NODE_VERSION=20.18.1
export ENABLE_MONITORING=true
export MAXIMUM_PROTECTION_MODE=true
export AUTO_RECOVERY_ENABLED=true

# Verify environment
echo "🔍 Verifying environment..."
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Error: DATABASE_URL is not set!"
    exit 1
fi

# Health check verification
echo "🏥 Running health check..."
node health-monitoring-system.js &
HEALTH_PID=$!

# Start error monitoring
echo "📊 Starting error monitoring..."
node error-handling-test.ts &
MONITOR_PID=$!

# Initialize auto-recovery system
echo "🔄 Initializing auto-recovery..."
node auto-recovery-system.js &
RECOVERY_PID=$!

# Start the application with enhanced monitoring
echo "🚀 Starting production server..."
exec node dist/server/index.js

# Cleanup on exit
trap 'kill $HEALTH_PID $MONITOR_PID $RECOVERY_PID' EXIT
