#!/bin/bash

# Exit on error and undefined variables
set -euo pipefail
IFS=$'\n\t'

# Error handler
handle_error() {
  echo "❌ Error occurred in build script on line $1"
  exit 1
}

# Set error handler
trap 'handle_error $LINENO' ERR

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

echo "📋 Setting up build..."

# Ensure clean slate
rm -rf dist
mkdir -p dist

# Create all necessary directories
echo "📁 Creating directory structure..."
mkdir -p dist/temp
mkdir -p dist/uploads
mkdir -p dist/logs

# Copy server files with structure preservation
echo "📋 Copying server files..."
cp -r server/* dist/

# Copy essential files
echo "📋 Copying config files..."
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || true

# Set proper permissions
echo "🔒 Setting permissions..."
find dist -type d -exec chmod 755 {} \;
find dist -type f -exec chmod 644 {} \;

# Verify deployment
echo "� Verifying deployment files..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: index.js not found in dist"
    exit 1
fi

echo "📦 Files in dist:"
ls -la dist/

# Final verification
echo "✅ Build completed successfully"
echo "📝 Node version: $(node -v)"
echo "📝 NPM version: $(npm -v)"

echo "🔍 Verifying files..."
ls -la server/
ls -la .

echo "✅ Build complete!"
