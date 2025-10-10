#!/bin/bash

# Final Build Verification Script for Render
# This script ensures all components are ready for deployment

set -e

echo "🔍 Starting Final Build Verification..."

# Function to check command existence
check_command() {
    if ! command -v $1 &> /dev/null; then
        echo "❌ $1 is not installed. Installing..."
        npm install -g $1
    fi
}

# Check essential tools
echo "⚙️ Checking build tools..."
check_command node
check_command npm
check_command tsc

# Verify node version
NODE_VERSION=$(node -v)
echo "📦 Node version: $NODE_VERSION"

# Clean previous build artifacts
echo "🧹 Cleaning build artifacts..."
rm -rf dist build .cache
rm -rf node_modules/.cache

# Install dependencies
echo "📥 Installing dependencies..."
npm ci --production --no-audit || npm install --production --no-audit

# Verify TypeScript configuration
echo "✅ Verifying TypeScript configuration..."
tsc --noEmit

# Create production build
echo "🏗️ Creating production build..."
NODE_ENV=production npm run build || {
    echo "⚠️ Build failed, attempting recovery..."
    # Recovery attempt
    rm -rf node_modules
    npm install
    NODE_ENV=production npm run build
}

# Verify critical files
echo "🔍 Verifying critical files..."
REQUIRED_FILES=(
    "package.json"
    "tsconfig.json"
    "ultimate-render-build.sh"
    "ultimate-render-start.sh"
)

for file in "${REQUIRED_FILES[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Missing required file: $file"
        exit 1
    fi
done

# Verify build output
if [ -d "dist" ] || [ -d "build" ]; then
    echo "✅ Build artifacts verified"
else
    echo "❌ Build failed - no output directory found"
    exit 1
fi

# Create health check file
echo "🏥 Creating health check file..."
echo '{"status":"ready","buildTime":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > health.json

echo "🚀 Build verification completed successfully!"
echo "✨ Ready for Render deployment"