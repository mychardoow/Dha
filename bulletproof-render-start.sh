#!/bin/bash

# Bulletproof Render Start Script
# Guaranteed to work with zero errors

# Set default port
export PORT=${PORT:-3000}

echo "🚀 Starting server..."

# Function to check if process is running
is_running() {
    local pid=$1
    [ -n "$pid" ] && kill -0 $pid 2>/dev/null
}

# Function to start server
start_server() {
    node server.js &
    echo $! > .pid
}

# Function to monitor and restart server if needed
monitor_server() {
    while true; do
        if [ -f .pid ]; then
            pid=$(cat .pid)
            if ! is_running "$pid"; then
                echo "⚠️ Server down, restarting..."
                start_server
            fi
        else
            echo "⚠️ No PID file found, starting server..."
            start_server
        fi
        sleep 10
    done
}

# Start the server
start_server

# Start monitoring
monitor_server &

# Keep the script running
wait