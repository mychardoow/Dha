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
# Copy server files to the root directory where Render expects them
cp -r server/* .
cp package.json .
cp package-lock.json . 2>/dev/null || true

# Create a backup in dist just in case
mkdir -p dist
cp -r server dist/
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || true

echo "🔍 Verifying files..."
ls -la server/
ls -la .

echo "✅ Build complete!"
