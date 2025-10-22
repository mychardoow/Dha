
#!/bin/bash

set -e

echo "🚀 STARTING RENDER PRODUCTION SERVER"
echo "====================================="

export NODE_ENV=production
export HOST=0.0.0.0
export PORT=${PORT:-10000}

echo "📍 Server will run on ${HOST}:${PORT}"

# Start the compiled server
if [ -f "dist/server/index.js" ]; then
    echo "✅ Starting compiled server..."
    node dist/server/index.js
else
    echo "❌ Compiled server not found, starting with tsx..."
    npx tsx server/index.ts
fi
