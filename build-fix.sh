#!/bin/bash

# Exit on error
set -e

echo "Starting optimized build process..."

# Clean install with production dependencies
echo "Installing production dependencies..."
npm ci --production --legacy-peer-deps

# Install dev dependencies if needed for build
if [ -f "build.sh" ]; then
    echo "Installing dev dependencies for build..."
    npm install --only=dev --legacy-peer-deps
fi

# Run the build script if it exists
if [ -f "build.sh" ]; then
    echo "Running build script..."
    bash build.sh
fi

echo "Build process completed successfully"