#!/bin/bash
set -e

echo "🚀 Quick Development Build & Start"
echo "================================"

# Set development environment
export NODE_ENV=development
export PORT=5000
export BYPASS_API_VALIDATION=true
export ENABLE_API_FALLBACK=true
export SQLITE_FILE=data/dev.sqlite

# Create data directory if it doesn't exist
mkdir -p data

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Build TypeScript
echo "🏗️ Building TypeScript..."
npm run build:ts || npx tsc

# Start the development server
echo "🚀 Starting development server..."
NODE_PATH=. npx tsx --tsconfig tsconfig.json server/index.ts