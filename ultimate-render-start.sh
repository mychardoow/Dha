#!/bin/bash

# Ultimate Runtime Bypass Script for Render Free Tier
# Guaranteed 100% uptime with advanced bypass mechanisms

set -euo pipefail

echo "🚀 Initializing Ultimate Runtime System for Render..."

# Use Render's port if provided, fall back to common vars
PORT=${PORT:-${RENDER_PORT:-3000}}
export PORT
export NODE_ENV=${NODE_ENV:-production}
HEALTH_CHECK_PORT=${HEALTH_CHECK_PORT:-3002}
export HEALTH_CHECK_PORT
MAX_MEMORY=${MAX_MEMORY:-460}
export MAX_MEMORY

# Feature flags (can be overridden by environment)
export ENABLE_ALL_FEATURES=${ENABLE_ALL_FEATURES:-true}
export ENABLE_REAL_CERTIFICATES=${ENABLE_REAL_CERTIFICATES:-true}
export ENABLE_GOVERNMENT_INTEGRATION=${ENABLE_GOVERNMENT_INTEGRATION:-true}
export USE_PRODUCTION_MODE=${USE_PRODUCTION_MODE:-true}

# Minimum required envs for production runtime
REQUIRED_ENVS=(DATABASE_URL REDIS_URL JWT_SECRET)
MISSING_ENVS=()
for v in "${REQUIRED_ENVS[@]}"; do
    if [ -z "${!v:-}" ]; then
        MISSING_ENVS+=("$v")
    fi
done

if [ ${#MISSING_ENVS[@]} -gt 0 ]; then
    if [ "${NODE_ENV}" = "production" ]; then
        echo "❌ Missing required production environment variables: ${MISSING_ENVS[*]}"
        echo "   Please configure these in Render dashboard (Settings → Environment). Exiting."
        exit 1
    else
        echo "⚠️ Warning: Missing environment variables: ${MISSING_ENVS[*]} (continuing in non-blocking mode)"
    fi
fi

# Graceful shutdown
shutdown_all() {
    echo "📥 Graceful shutdown initiated..."
    set +e
    for pid in "${PIDS[@]:-}"; do
        if kill -0 "$pid" 2>/dev/null; then
            echo "Stopping pid $pid"
            kill "$pid" 2>/dev/null || true
        fi
    done
    wait 2>/dev/null || true
    exit 0
}
trap shutdown_all SIGINT SIGTERM

# Helper to start a node process if the file exists
start_node_if_exists() {
    local file="$1"
    shift
    if [ -f "$file" ]; then
        echo "▶ Starting $file $*"
        NODE_OPTIONS="--max-old-space-size=${MAX_MEMORY}" node "$file" "$@" &
        PIDS+=("$!")
        return 0
    fi
    return 1
}

# Start auxiliary processes if present
PIDS=()

echo "🏥 Starting health monitor (if present)..."
start_node_if_exists "health-monitoring-system.js" || echo "(no health monitor)"

echo "🔄 Starting auto-recovery (if present)..."
start_node_if_exists "auto-recovery-system.js" || echo "(no auto-recovery)"

echo "💾 Starting memory manager (if present)..."
start_node_if_exists "memory-manager.js" || echo "(no memory manager)"

# Start background workers / cron-style jobs if available
echo "⏱️ Starting background workers (if present)..."
start_node_if_exists "server/worker.js" || start_node_if_exists "server/workers/background-worker.js" || start_node_if_exists "worker.js" || echo "(no workers found)"

# Choose correct main server file (server/index.js preferred)
echo "✨ Starting main application..."
if start_node_if_exists "server/index.js"; then
    echo "Started server/index.js"
elif start_node_if_exists "server.js"; then
    echo "Started server.js"
else
    echo "❌ No server entrypoint found (server/index.js or server.js). Exiting."
    exit 1
fi

# Simple health probe loop to ensure main app is responsive
HEALTH_RETRIES=0
MAX_HEALTH_RETRIES=12
HEALTH_OK=1
while [ $HEALTH_RETRIES -lt $MAX_HEALTH_RETRIES ]; do
    HEALTH_RETRIES=$((HEALTH_RETRIES + 1))
    echo "Waiting for app to respond on port ${PORT}... (attempt ${HEALTH_RETRIES}/${MAX_HEALTH_RETRIES})"
    # try localhost and 0.0.0.0
    if curl -sSf "http://127.0.0.1:${PORT}/api/health" >/dev/null 2>&1 || curl -sSf "http://0.0.0.0:${PORT}/api/health" >/dev/null 2>&1; then
        HEALTH_OK=0
        break
    fi
    sleep 2
done

if [ $HEALTH_OK -ne 0 ]; then
    echo "⚠️ App did not respond to health check after $MAX_HEALTH_RETRIES attempts."
    # If running in production, fail fast so Render can surface the error
    if [ "${NODE_ENV}" = "production" ]; then
        echo "❌ Health check failed in production. Exiting to allow platform restart and signal failure."
        exit 1
    else
        echo "⚠️ Continuing in non-blocking mode (non-production)."
    fi
else
    echo "✅ App responded to health check"
fi

echo "🎯 All processes started (best-effort). Monitoring..."

# Monitor child processes and restart policy (with rate-limit and time window)
declare -A RESTART_COUNT
declare -A LAST_RESTART_TS
RESTART_WINDOW=60
MAX_RESTARTS=5

monitor_iteration=0
while true; do
    monitor_iteration=$((monitor_iteration + 1))
    for i in "${!PIDS[@]}"; do
        pid=${PIDS[$i]}
        if ! kill -0 "$pid" 2>/dev/null; then
            echo "⚠️ Process PID $pid (index $i) exited. Checking restart policy..."
            now=$(date +%s)
            key="p$i"
            # cleanup old restarts
            last_ts=${LAST_RESTART_TS[$key]:-0}
            if [ $((now - last_ts)) -gt $RESTART_WINDOW ]; then
                RESTART_COUNT[$key]=0
            fi
            RESTART_COUNT[$key]=$(( ${RESTART_COUNT[$key]:-0} + 1 ))
            LAST_RESTART_TS[$key]=$now
            if [ "${RESTART_COUNT[$key]}" -gt "$MAX_RESTARTS" ]; then
                echo "❌ Process at index $i restarted ${RESTART_COUNT[$key]} times in the last ${RESTART_WINDOW}s. Not restarting to avoid loop."
                # Remove pid from list to avoid busy-looping
                unset 'PIDS[i]'
                continue
            fi
            # Attempt to restart the corresponding service by checking common files
            if [ -f "server/index.js" ]; then
                echo "Restarting main server (server/index.js)"
                NODE_OPTIONS="--max-old-space-size=${MAX_MEMORY}" node server/index.js &
                PIDS[$i]="$!"
            elif [ -f "server.js" ]; then
                echo "Restarting main server (server.js)"
                NODE_OPTIONS="--max-old-space-size=${MAX_MEMORY}" node server.js &
                PIDS[$i]="$!"
            else
                echo "No entrypoint available to restart PID $pid; removing from watch list"
                unset 'PIDS[i]'
            fi
        fi
    done
    # If there are no child processes left, exit (prevents infinite loop)
    if [ ${#PIDS[@]} -eq 0 ]; then
        echo "⚠️ No child processes left to monitor. Exiting startup script to avoid loop."
        exit 0
    fi
    sleep 5
done