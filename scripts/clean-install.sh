#!/bin/bash
# Bulletproof dependency installation script
set -e

echo "🧹 Cleaning all dependencies and caches..."
rm -rf node_modules client/node_modules package-lock.json client/package-lock.json
rm -rf .npm node_modules/.cache client/node_modules/.cache
npm cache clean --force

echo "📦 Installing root dependencies with correct platform..."
export npm_config_platform=linux
export npm_config_arch=x64
npm install --legacy-peer-deps --no-audit --no-fund

echo "📦 Installing client dependencies..."
cd client
npm install --legacy-peer-deps --no-audit --no-fund
cd ..

echo "🔧 Rebuilding esbuild for correct platform..."
npm rebuild esbuild --platform=linux --arch=x64
cd client && npm rebuild esbuild --platform=linux --arch=x64 && cd ..

echo "✅ Installation complete!"
echo "🔍 Verifying esbuild..."
node -e "console.log('esbuild check:', require('esbuild').version)" || echo "⚠️ esbuild verification failed"
