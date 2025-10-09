#!/bin/bash

# Bulletproof startup script
set +e

echo "🛡️ Starting bulletproof deployment..."

# Function to log with timestamp
log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] $1"
}

# Function to ensure process keeps running
ensure_running() {
    while true; do
        if ! pgrep -f "node.*bulletproof-server" > /dev/null; then
            log "⚠️ Server not detected, restarting..."
            NODE_ENV=production FORCE_START=true node server/bulletproof-server.js &
        fi
        sleep 5
    done
}

# Function to keep node process alive
keep_alive() {
    while true; do
        log "💓 Heartbeat check..."
        curl -s http://localhost:${PORT:-3000}/health || {
            log "⚠️ Health check failed, restarting..."
            kill $(pgrep -f "node.*bulletproof-server") 2>/dev/null
            NODE_ENV=production FORCE_START=true node server/bulletproof-server.js &
        }
        sleep 10
    done
}

# Cleanup any existing process
pkill -f "node.*bulletproof-server" 2>/dev/null

# Ensure directories exist
mkdir -p dist/documents dist/server dist/shared

# Copy server files if they don't exist
[ ! -f "dist/server/bulletproof-server.js" ] && cp -r server/* dist/server/
[ ! -d "dist/shared" ] && cp -r shared dist/

# Start the server
log "🚀 Starting server..."
NODE_ENV=production FORCE_START=true node server/bulletproof-server.js &

# Start monitoring processes
ensure_running &
keep_alive &

# Keep script running
while true; do
    sleep 3600
done