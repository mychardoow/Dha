#!/bin/bash

echo "================================================"
echo "Starting DHA Digital Services Platform"
echo "SIMPLE MODE (No Database Required)"
echo "================================================"

# Build the frontend first
echo "Building frontend..."
npm run build

# Check if build was successful
if [ $? -ne 0 ]; then
    echo "❌ Frontend build failed"
    exit 1
fi

echo "✅ Frontend build successful"
echo ""

# Run the simple server
echo "Starting simple server..."
echo "Server will be available at http://localhost:5000"
echo ""

# Use tsx to run TypeScript directly
npx tsx server/simple-server.ts