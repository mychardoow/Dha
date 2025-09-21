#!/bin/bash

# DHA Digital Services - Production Startup Script
set -e

echo "🚀 Starting DHA Digital Services Production Deployment..."

# Validate environment variables
echo "🔍 Validating environment variables..."
if [ -z "$DATABASE_URL" ] && [ -z "$PGHOST" ]; then
  echo "⚠️  No database configuration found - running in bypass mode"
fi

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
  echo "📦 Installing dependencies..."
  npm install --production
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Start the production server
echo "🌟 Starting production server..."
npm start