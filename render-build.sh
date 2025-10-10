#!/bin/bash

# Render Build Command Script
# This script handles the build process for Render deployment

# Exit on error
set -e

echo "🚀 Starting build process..."

# Install production dependencies
echo "📦 Installing dependencies..."
npm ci --only=production --no-audit

# Ensure build directory exists and is clean
echo "🧹 Preparing build directory..."
rm -rf dist build
mkdir -p dist

# Copy necessary files
echo "📄 Copying files..."
cp -r src/* dist/
cp package.json dist/
cp render-startup.sh dist/
cp auto-recovery-system.js dist/
cp health-monitoring-system.js dist/

# Make scripts executable
echo "🔧 Setting permissions..."
chmod +x dist/render-startup.sh

# Create health check endpoint
echo "🏥 Setting up health check..."
echo '{"status":"ready","buildTime":"'$(date -u +"%Y-%m-%dT%H:%M:%SZ")'"}' > dist/health.json

# Environment setup
echo "⚙️ Configuring environment..."
echo "NODE_ENV=production" > dist/.env
echo "PORT=3000" >> dist/.env
echo "HEALTH_CHECK_PORT=3002" >> dist/.env

echo "✅ Build completed successfully!"