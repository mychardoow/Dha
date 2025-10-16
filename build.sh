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
cp -r server dist/

echo "✅ Build complete!"
