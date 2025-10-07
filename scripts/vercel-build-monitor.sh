#!/bin/bash

echo "🔄 Starting Vercel build monitoring..."

# Function to check build status
check_build_status() {
  local exit_code=$?
  if [ $exit_code -ne 0 ]; then
    echo "❌ Build failed with exit code $exit_code"
    echo "📑 Build logs:"
    cat .vercel/output/static/logs/build.log 2>/dev/null || echo "No build logs found"
    exit $exit_code
  fi
}

# Clean up previous builds
echo "🧹 Cleaning up previous builds..."
rm -rf .vercel/output || true
rm -rf client/dist || true

# Install dependencies
echo "📦 Installing dependencies..."
npm install --force --legacy-peer-deps
check_build_status

# Build API
echo "🛠️ Building API..."
cd api && npm install --force --legacy-peer-deps && npm run build
check_build_status
cd ..

# Build client
echo "🎨 Building client..."
cd client && npm install --force --legacy-peer-deps && npm run build
check_build_status
cd ..

echo "✅ Build completed successfully"