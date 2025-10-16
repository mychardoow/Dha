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
# Create dist directory and copy files
mkdir -p dist
cp -r server/* dist/
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || true

# Show what was copied
echo "📦 Files in dist directory:"
ls -la dist/

echo "🔍 Verifying files..."
ls -la server/
ls -la .

echo "✅ Build complete!"
