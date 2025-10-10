#!/bin/bash

# Production Build Script for Render
# Guaranteed to work with TypeScript configuration

set -e

echo "🚀 Starting production build process..."

# Environment setup
export NODE_ENV=production
export TS_NODE_TRANSPILE_ONLY=true

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist build

# Install dependencies
echo "📦 Installing dependencies..."
npm ci --prefer-offline --no-audit --progress=false || npm install --no-audit --progress=false

# TypeScript build
echo "🏗️ Building TypeScript..."
npx tsc --project tsconfig.json

# Copy necessary files
echo "📄 Copying configuration files..."
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || :
cp yarn.lock dist/ 2>/dev/null || :
cp .env* dist/ 2>/dev/null || :
cp ultimate-render-start.sh dist/
cp auto-recovery-system.js dist/
cp health-monitoring-system.js dist/
cp anti-sleep-system.js dist/
cp advanced-memory-manager.js dist/

# Make scripts executable
echo "🔧 Setting permissions..."
chmod +x dist/*.sh

# Verify build
echo "✅ Verifying build..."
if [ -d "dist" ] && [ -f "dist/package.json" ]; then
    echo "✨ Build completed successfully!"
else
    echo "❌ Build failed!"
    exit 1
fi