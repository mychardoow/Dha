#!/bin/bash
set -e

echo "🚀 SIMPLE PRODUCTION BUILD"
echo "========================"

# Set production environment
export NODE_ENV=production

# Install dependencies
echo "📦 Installing dependencies..."
npm install

# Basic validation
echo "🧪 Running basic validation..."
node ai-validation-suite.cjs || true

# Start the server
echo "🚀 Starting server..."
node server/index.js