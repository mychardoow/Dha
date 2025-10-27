#!/bin/bash

set -e

echo "🧪 STARTING SERVER IN TEST MODE"
echo "=============================="

# Set test environment
export NODE_ENV=test
export USE_TEST_DB=true

# Install dependencies
echo "📦 Installing dependencies..."
npm install --no-audit

# Start the server
echo "🚀 Starting server..."
exec npx tsx server/index.ts