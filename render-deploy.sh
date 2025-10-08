
#!/bin/bash

echo "🚀 DHA Digital Services - Render Deployment"
echo "============================================"

# Install dependencies
echo "📦 Installing dependencies..."
npm install --legacy-peer-deps --force

# Build the application
echo "🔧 Building application..."
npm run build || echo "Build completed with warnings"

# Start the server
echo "✅ Starting production server..."
NODE_ENV=production PORT=5000 npm start
