#!/bin/bash

set -e # Exit on error

echo "🚀 Starting Comprehensive Deployment Validation..."

# 1. Environment Check
echo "🔍 Checking environment..."
if [ -z "$NODE_ENV" ]; then
    echo "❌ NODE_ENV not set"
    exit 1
fi

# 2. Memory Settings Check
echo "💾 Checking memory settings..."
if [ -z "$NODE_OPTIONS" ]; then
    export NODE_OPTIONS="--max-old-space-size=4096"
    echo "⚠️ NODE_OPTIONS not set, using default: $NODE_OPTIONS"
fi

# 3. Port Check
echo "🔌 Checking ports..."
if [ -z "$PORT" ]; then
    export PORT=3000
    echo "⚠️ PORT not set, using default: $PORT"
fi
if [ -z "$HEALTH_CHECK_PORT" ]; then
    export HEALTH_CHECK_PORT=3001
    echo "⚠️ HEALTH_CHECK_PORT not set, using default: $HEALTH_CHECK_PORT"
fi

# 4. File System Check
echo "📁 Checking file system..."
required_files=(
    "health-monitoring-system.js"
    "anti-sleep-system.js"
    "auto-recovery-system.js"
    "advanced-memory-manager.js"
    "build-monitor.mjs"
)

for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

# 5. Dependencies Check
echo "📦 Checking dependencies..."
npm install --legacy-peer-deps

# 6. Build Check
echo "🔨 Testing build process..."
./enhanced-build.sh

# 7. Pre-deployment Tests
echo "🧪 Running pre-deployment tests..."
node enhanced-pre-deployment-test.mjs

# 8. Health Check
echo "🏥 Performing final health check..."
curl -s http://localhost:3001/health || {
    echo "❌ Health check failed"
    exit 1
}

echo "✅ All validation checks passed!"
echo "🚀 Ready for deployment!"