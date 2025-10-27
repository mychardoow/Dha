#!/bin/bash

set -e

echo "🚀 RENDER PRODUCTION BUILD"
echo "========================="

# Set environment
export NODE_ENV=production
export NODE_VERSION=20.18.1

# Verify Node version
echo "🔍 Node.js version:"
node -v

# Clean install dependencies
echo "📦 Installing dependencies..."
npm install --no-audit --no-fund

# Prepare build directory
echo "🧹 Preparing build directory..."
rm -rf dist
mkdir -p dist

# Build TypeScript
echo "🏗️ Building TypeScript..."
NODE_OPTIONS="--max-old-space-size=4096" npm run build:ts || {
    echo "⚠️ TypeScript build failed, trying with --skipLibCheck..."
    NODE_OPTIONS="--max-old-space-size=4096" npm run build:ts -- --skipLibCheck || {
        echo "❌ TypeScript build failed completely"
        exit 1
    }
}

# Copy necessary files
echo "📋 Copying configuration files..."
cp package.json dist/
cp package-lock.json dist/ || true
cp .env dist/ || true

# Verify build
echo "✅ Verifying build..."
if [ ! -f "dist/server/index.js" ]; then
    echo "❌ Build verification failed - missing dist/server/index.js"
    exit 1
fi

echo "🎉 Build completed successfully!"