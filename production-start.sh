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
export DB_POOL_SIZE=20
export NODE_OPTIONS="--max-old-space-size=460"

# Verify environment
echo "🔍 Verifying environment..."
if [ -z "$DATABASE_URL" ]; then
    echo "⚠️ Warning: DATABASE_URL not set, using SQLite fallback"
fi

# Start monitoring services
echo "📊 Starting monitoring services..."
node health-monitoring-system.js &
HEALTH_PID=$!

echo "🔄 Starting auto-recovery system..."
node auto-recovery-system.js &
RECOVERY_PID=$!

echo "🛡️ Starting error monitoring..."
node error-handling-test.ts &
ERROR_PID=$!

# Set production rate limits
echo "⚖️ Configuring rate limits..."
export MAX_REQUESTS_PER_MINUTE=1000
export MAX_CONCURRENT_JOBS=50
export MAX_API_CALLS_PER_MINUTE=500

# Initialize database
echo "🗄️ Initializing database..."
node server/config/database-railway.ts &
DB_PID=$!

# Start the application
echo "🚀 Starting production server..."
exec node dist/server/index.js

# Cleanup handler
cleanup() {
    echo "Graceful shutdown initiated..."
    kill $HEALTH_PID $RECOVERY_PID $ERROR_PID $DB_PID
    exit 0
}

trap cleanup SIGINT SIGTERM