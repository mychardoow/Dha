#!/bin/bash

# Render Start Command Script
# This script handles the startup process for Render deployment

# Exit on error
set -e

echo "🚀 Starting application..."

# Load environment variables
if [ -f .env ]; then
    source .env
fi

# Set default environment variables if not set
export PORT=${PORT:-3000}
export NODE_ENV=${NODE_ENV:-production}
export HEALTH_CHECK_PORT=${HEALTH_CHECK_PORT:-3002}

# Start health monitoring system
echo "🏥 Starting health monitoring..."
node health-monitoring-system.js &
HEALTH_PID=$!

# Start auto-recovery system
echo "🔄 Starting auto-recovery system..."
node auto-recovery-system.js &
RECOVERY_PID=$!

# Function to handle process termination
cleanup() {
    echo "📥 Received termination signal..."
    kill $HEALTH_PID $RECOVERY_PID 2>/dev/null
    exit 0
}

# Trap termination signals
trap cleanup SIGTERM SIGINT

# Start main application with optimizations
echo "💫 Starting main application..."
NODE_OPTIONS="--max-old-space-size=460 --optimize-for-size" \
exec node server.js