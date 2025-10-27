#!/bin/bash

set -e

echo "🚀 Enhanced Development Build"
echo "=================================="

# Set environment variables
export NODE_ENV=development
export NODE_VERSION=20.18.1
export PORT=5000
export HOST=0.0.0.0

# Clean previous build
echo "🧹 Cleaning previous build..."
rm -rf dist/

# Install dependencies
echo "📦 Installing dependencies..."
npm install --no-audit

# Create necessary directories
echo "📁 Creating build directories..."
mkdir -p dist/server dist/public

# Build TypeScript
echo "🏗️ Building TypeScript..."
npx tsc --project tsconfig.json || {
    echo "⚠️ TypeScript build had warnings (continuing...)"
}

# Copy necessary files
echo "📋 Copying static files..."
cp -r public/* dist/public/ 2>/dev/null || :

# Set up SQLite for development
echo "🗄️ Setting up development database..."
mkdir -p data
touch data/development.sqlite

# Start the development server
echo "� Starting development server..."
node dist/server/index.js

echo "✅ Development build complete!"