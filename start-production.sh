
#!/bin/bash

# DHA Digital Services - Production Startup Script
# This script prepares and starts the application in production mode

set -e

echo "🚀 Starting DHA Digital Services Production Deployment..."

# Set production environment
export NODE_ENV=production

# Validate required environment variables
echo "🔍 Validating environment variables..."

required_vars=(
    "JWT_SECRET"
    "SESSION_SECRET"
    "ENCRYPTION_KEY"
    "DATABASE_URL"
    "DHA_NPR_API_KEY"
    "SAPS_CRC_API_KEY"
    "DHA_ABIS_API_KEY"
    "ICAO_PKD_API_KEY"
    "SITA_ESERVICES_API_KEY"
    "OPENAI_API_KEY"
)

missing_vars=()
for var in "${required_vars[@]}"; do
    if [ -z "${!var}" ]; then
        missing_vars+=("$var")
    fi
done

if [ ${#missing_vars[@]} -ne 0 ]; then
    echo "❌ Missing required environment variables:"
    printf '%s\n' "${missing_vars[@]}"
    echo "Please set these variables before starting the application."
    exit 1
fi

echo "✅ All required environment variables are set"

# Install dependencies if needed
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm ci --production=false
fi

# Build the application
echo "🔨 Building application..."
npm run build

# Start the application
echo "🌟 Starting DHA Digital Services..."
echo "🔗 Application will be available at: http://0.0.0.0:5000"
echo "📊 Health check available at: http://0.0.0.0:5000/api/health"

# Run the application
npm start
