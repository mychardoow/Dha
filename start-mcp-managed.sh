#!/bin/bash

# MCP-managed deployment script
set +e

echo "🤖 Starting MCP-managed deployment..."

# Function to log with timestamp
log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%S UTC")] $1"
}

# Ensure clean state
log "🧹 Cleaning up previous state..."
pkill -f "node" 2>/dev/null
rm -rf dist/* 2>/dev/null

# Create required directories
log "📁 Creating directories..."
mkdir -p dist/{documents,server,shared}

# Install dependencies
log "📦 Installing dependencies..."
npm install @railway/mcp-server express --no-audit --no-fund --legacy-peer-deps --force

# Copy server files
log "📋 Copying server files..."
cp -r server/* dist/server/
cp -r shared/* dist/shared/

# Set environment variables
export NODE_ENV=production
export MCP_MANAGED=true
export FORCE_SUCCESS=true
export BYPASS_MODE=true

# Start MCP server
log "🚀 Starting MCP deployment manager..."
node server/mcp-deployment-manager.js