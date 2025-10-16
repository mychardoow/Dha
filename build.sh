#!/bin/bash

# Exit on error
set -e

# Set environment variables
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=2048"

echo "🚀 Starting build process..."

# Clean install
echo "🧹 Cleaning previous builds..."
rm -rf node_modules dist build
rm -rf client/node_modules client/dist

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps

# Build API
echo "🔨 Building API..."
npm run build:api

# Build client
echo "🎨 Building client..."
cd client
npm install --legacy-peer-deps
npm run build
cd ..

echo "✅ Build completed successfully!"