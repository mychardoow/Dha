#!/bin/bash

# Monitor Render deployment status
echo "🔍 Monitoring deployment status..."

# Get the service URL (replace with your Render URL once deployed)
SERVICE_URL="$RENDER_EXTERNAL_URL"

# Monitor build and deployment
monitor_health() {
    local retry_count=0
    local max_retries=30
    
    echo "⏳ Waiting for service to become available..."
    
    while [ $retry_count -lt $max_retries ]; do
        if curl -s "$SERVICE_URL/health" > /dev/null; then
            echo "✅ Service is up and running!"
            curl -s "$SERVICE_URL/health" | jq .
            return 0
        fi
        
        echo "🔄 Attempt $(($retry_count+1))/$max_retries - Service not ready yet..."
        retry_count=$((retry_count+1))
        sleep 10
    done
    
    echo "❌ Service failed to respond after $max_retries attempts"
    return 1
}

# Start monitoring
monitor_health