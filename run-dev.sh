#!/bin/bash

# DHA Digital Services - Direct Development Server
echo "🚀 Starting DHA Digital Services directly..."

# Set environment
export NODE_ENV=development
export PORT=5000

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
fi

# Start the development server
echo "🌟 Starting development server..."
echo "🔧 Using optimized simple server..."
npx tsx simple-server.ts