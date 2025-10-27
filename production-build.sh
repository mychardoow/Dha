#!/bin/bash

# Production Build Script for Render Free Tier
# This script optimizes the build process for minimal resource usage

# Exit on error
set -e

# Environment setup
export NODE_ENV=production
export CI=true

echo "Starting optimized production build..."

# Clear previous build artifacts
rm -rf dist build .cache

# Install only production dependencies
echo "Installing production dependencies..."
if [ -f "package-lock.json" ]; then
    npm ci --only=production --no-audit
else
    echo "No package-lock.json found, using npm install..."
    npm install --production --no-audit
fi

# Optimize package.json for production
node -e "
const fs = require('fs');
const pkg = require('./package.json');
delete pkg.devDependencies;
delete pkg.scripts.dev;
delete pkg.scripts.test;
fs.writeFileSync('package.json', JSON.stringify(pkg, null, 2));
"

# Set production optimizations for Node.js
export NODE_OPTIONS="--max-old-space-size=460"

# Run production build with optimizations
echo "Running optimized build..."
# Increase memory limit for TypeScript compilation
export NODE_OPTIONS="--max-old-space-size=4096"
npm run build || {
    echo "⚠️ Full build failed, trying incremental build..."
    # Try incremental build if full build fails
    rm -rf dist/*
    ./node_modules/.bin/tsc --incremental --tsBuildInfoFile ./dist/.tsbuildinfo
}

# Cleanup unnecessary files
echo "Cleaning up..."
rm -rf .git .github node_modules/.cache

# Verify build
if [ -d "dist" ] || [ -d "build" ]; then
    echo "Build completed successfully!"
else
    echo "Build failed - no output directory found"
    exit 1
fi

# Create health check file
echo '{"status": "built", "timestamp": "'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > build-status.json

echo "Production build process completed!"