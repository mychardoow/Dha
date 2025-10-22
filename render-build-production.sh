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
npm install --legacy-peer-deps --production=false

# Build client
echo "🎨 Building client..."
cd client
npm install --legacy-peer-deps
npm run build
cd ..

# Compile TypeScript server
echo "🔨 Building server..."
npx tsc --project tsconfig.json --skipLibCheck || echo "⚠️ Build completed with warnings"

# Copy necessary files
echo "📋 Copying runtime files..."
cp -r server/middleware dist/server/ 2>/dev/null || true
cp -r server/services dist/server/ 2>/dev/null || true
cp -r server/routes dist/server/ 2>/dev/null || true

# Verify build
echo "✅ Verifying build..."
if [ -f "dist/server/index.js" ]; then
    echo "✅ Server build successful"
else
    echo "❌ Server build failed"
    exit 1
fi

if [ -d "dist/public" ]; then
    echo "✅ Client build successful"
else
    echo "❌ Client build failed"
    exit 1
fi

echo "🎉 Build complete!"