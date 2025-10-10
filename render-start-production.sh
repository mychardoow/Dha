#!/bin/bash

echo "🚀 Starting DHA Digital Services Platform..."

export NODE_ENV=production
export PORT=${PORT:-5000}
export HOST=0.0.0.0

# Start the server
if [ -f "dist/server/index.js" ]; then
    echo "✅ Starting server from dist/server/index.js"
    node dist/server/index.js
elif [ -f "dist/index.js" ]; then
    echo "✅ Starting server from dist/index.js"
    node dist/index.js
elif [ -f "server/index.js" ]; then
    echo "✅ Starting server from server/index.js"
    node server/index.js
else
    echo "❌ No server file found!"
    exit 1
fi
