#!/bin/bash
echo "🚀 Starting DHA Digital Services Platform (Preview Mode)"
echo "================================================"
echo ""
echo "Initializing server on port 5000..."
echo ""

# Run the preview server
NODE_ENV=development tsx server/preview-server.ts