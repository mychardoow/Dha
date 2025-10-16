#!/bin/bash

# Increase memory limit for Node.js
export NODE_OPTIONS="--max-old-space-size=4096"

# Enable production mode
export NODE_ENV=production

# Clean install dependencies
echo "🧹 Cleaning previous builds..."
rm -rf node_modules dist build
rm -rf client/node_modules client/dist

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build API with TypeScript
echo "🔨 Building API..."
npm run build:api

# Build client
echo "🎨 Building client..."
cd client && npm install --legacy-peer-deps && npm run build
cd ..

# Run health checks
echo "🏥 Running health checks..."
node health-monitoring-system.js &
HEALTH_PID=$!

# Wait for health check to complete
sleep 5
kill $HEALTH_PID

echo "✅ Build completed successfully!"