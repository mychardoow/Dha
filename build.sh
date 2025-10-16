#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting build..."

# Basic settings
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=512"

echo "🧹 Cleaning up..."
rm -rf node_modules package-lock.json
rm -rf dist

echo "📦 Installing dependencies..."
npm install --production --legacy-peer-deps express
mkdir -p dist

echo "📋 Copying files..."
# Ensure clean dist
rm -rf dist
mkdir -p dist

# Copy with proper structure
cp -r server/* dist/
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || true

# Create necessary directories
mkdir -p dist/temp
mkdir -p dist/uploads

# Set permissions
chmod -R 755 dist

# Verify deployment files
echo "📦 Verifying deployment files..."
ls -la dist/
echo "✅ Build files ready"

echo "🔍 Verifying files..."
ls -la server/
ls -la .

echo "✅ Build complete!"
