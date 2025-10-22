#!/bin/bash

set -e

echo "🚀 RENDER PRODUCTION BUILD"
echo "=========================="

# Set production environment
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=4096"

# Clean previous builds
echo "🧹 Cleaning previous builds..."
rm -rf dist node_modules/.cache

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --no-optional

# Build client
echo "🎨 Building client..."
cd client
npm install --legacy-peer-deps --no-optional
npm run build
cd ..

# Create dist directory structure
echo "📋 Creating dist structure..."
mkdir -p dist/server
mkdir -p dist/public

# Copy built client
cp -r client/dist/* dist/public/ 2>/dev/null || true

# Copy server files (no TypeScript compilation needed - we use tsx)
cp -r server dist/
cp package.json dist/
cp start-simple.js dist/

echo "✅ Build complete!"