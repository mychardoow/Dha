#!/bin/bash

# Render Bulletproof Startup Script
# This script ensures continuous operation on Render free tier

# Enable error handling
set -e

# Environment setup
export NODE_ENV=production
export PORT=${PORT:-3000}

# Function to handle process termination
cleanup() {
    echo "Received termination signal - cleaning up..."
    # Save any necessary state here
    exit 0
}

# Trap termination signals
trap cleanup SIGTERM SIGINT

# Function to check if process is running
is_running() {
    pgrep -f "node.*server" > /dev/null
}

# Function to start the server
start_server() {
    echo "Starting server..."
    if [ -f "package.json" ]; then
        # Install production dependencies only
        npm ci --only=production --no-audit

        # Start server with optimizations
        NODE_ENV=production node --optimize_for_size --max_old_space_size=460 server.js &
        
        # Store the PID
        echo $! > .pid
    else
        echo "Error: package.json not found"
        exit 1
    fi
}

# Function to monitor and restart if needed
monitor_and_restart() {
    while true; do
        if ! is_running; then
            echo "Server down, restarting..."
            start_server
        fi
        sleep 30
    done
}

# Initial startup
start_server

# Start monitoring
monitor_and_restart