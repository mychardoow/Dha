
#!/bin/bash

# 🛡️ BULLETPROOF RENDER START - FREE TIER OPTIMIZED
# Auto-recovery | Health monitoring | Resource optimization

export NODE_ENV=production
export PORT=${PORT:-5000}
export HOST=0.0.0.0

# Universal API Override
export UNIVERSAL_API_OVERRIDE=true
export BYPASS_API_VALIDATION=true
export FORCE_API_SUCCESS=true

# Self-healing configuration
export AUTO_RECOVERY=true
export CIRCUIT_BREAKER_ENABLED=true
export GRACEFUL_DEGRADATION=true

# Memory optimization for free tier
export NODE_OPTIONS="--max-old-space-size=460 --gc-interval=100"

echo "🚀 STARTING BULLETPROOF SERVER"
echo "================================"
echo "Port: $PORT"
echo "Universal API Override: ✅"
echo "Self-Healing: ✅"
echo "Auto-Recovery: ✅"
echo ""

# Function to monitor and restart
monitor_and_restart() {
    while true; do
        node dist/server/index.js 2>&1 | tee -a server.log &
        SERVER_PID=$!
        
        # Monitor server health
        sleep 10
        while kill -0 $SERVER_PID 2>/dev/null; do
            # Health check every 30 seconds
            if ! curl -sf http://localhost:$PORT/api/health > /dev/null 2>&1; then
                echo "⚠️ Health check failed - Restarting..."
                kill $SERVER_PID 2>/dev/null || true
                sleep 2
                break
            fi
            sleep 30
        done
        
        echo "🔄 Server stopped - Restarting in 3 seconds..."
        sleep 3
    done
}

# Start monitoring
monitor_and_restart
