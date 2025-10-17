#!/bin/bash

# Health check script
MAX_RETRIES=5
RETRY_DELAY=2
counter=0

echo "🔍 Starting health check..."

while [ $counter -lt $MAX_RETRIES ]; do
  response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT:-3000}/health)
  
  if [ "$response" == "200" ]; then
    echo "✅ Server is healthy"
    exit 0
  else
    counter=$((counter+1))
    echo "⚠️  Attempt $counter/$MAX_RETRIES - Server not ready (status: $response)"
    sleep $RETRY_DELAY
  fi
done

echo "❌ Health check failed after $MAX_RETRIES attempts"
exit 1