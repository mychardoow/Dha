
#!/bin/bash

set -e

echo "🚀 STARTING PRODUCTION SERVER"
echo "=============================="

export NODE_ENV=production
export PORT=${PORT:-5000}
export HOST=0.0.0.0
export NODE_OPTIONS="--max-old-space-size=460"

echo "Port: $PORT"
echo "Environment: $NODE_ENV"
echo ""

# Start with tsx directly
exec npx tsx server/index.ts
