#!/bin/bash
# Minimal bulletproof build script for free tier
set -e

echo "🚀 Starting minimal build..."

# Clean everything except minimal files
rm -rf node_modules package-lock.json dist build

# Install only essential dependency
npm install express --no-audit --no-fund --force

# Create minimal structure
mkdir -p dist
cp minimal-server.js dist/index.js

echo "✅ Build completed!"