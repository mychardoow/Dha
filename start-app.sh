#!/bin/bash
# Emergency startup script to bypass package.json issues
echo "🚀 Starting DHA Digital Services Platform..."
npx concurrently "npx tsx watch --clear-screen=false --respawn server/index.ts" "npx vite --config client/vite.config.ts"