#!/bin/bash

# Exit on error and undefined variables
set -euo pipefail

echo "🚀 Starting build..."

echo "🧹 Cleaning up..."
rm -rf dist/

echo "📦 Installing dependencies..."
npm install --production --legacy-peer-deps

echo "� Setting up build..."

echo "📁 Creating directory structure..."
mkdir -p dist/server
mkdir -p dist/config
mkdir -p dist/public

echo "📋 Copying server files..."
cp -r server/* dist/server/

echo "📋 Creating entry point..."
cat > dist/index.js << 'EOF'
const path = require('path');
const cluster = require('cluster');
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors());
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Basic routes
app.get('/', (req, res) => res.send('DHA Digital Services'));
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

// Start server
if (cluster.isPrimary) {
    console.log(`Primary ${process.pid} is running`);
    cluster.fork();
    
    cluster.on('exit', (worker, code, signal) => {
        console.log(`Worker ${worker.process.pid} died`);
        cluster.fork();
    });
} else {
    app.listen(PORT, '0.0.0.0', () => {
        console.log(`Worker ${process.pid} started on port ${PORT}`);
    });
}
EOF

echo "📋 Copying config files..."
cp -r config/* dist/config/

echo "🔒 Setting permissions..."
chmod +x dist/index.js

echo "🔍 Verifying deployment files..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: index.js not found in dist"
    exit 1
fi

# List all files in dist for verification
echo "📋 Deployment files:"
ls -la dist/

# Basic settings
export NODE_ENV=production
export NODE_OPTIONS="--max-old-space-size=512"

echo "🧹 Cleaning up..."
rm -rf node_modules package-lock.json
rm -rf dist

echo "📦 Installing dependencies..."
npm install --production --legacy-peer-deps express
mkdir -p dist

echo "📋 Setting up build..."

# Ensure clean slate
rm -rf dist
mkdir -p dist

# Create all necessary directories
echo "📁 Creating directory structure..."
mkdir -p dist/server
mkdir -p dist/temp
mkdir -p dist/uploads
mkdir -p dist/logs

# Copy server files with structure preservation
echo "📋 Copying server files..."
cp -r server/* dist/server/

# Create the entry point index.js in dist
echo "📝 Creating entry point..."
cat > dist/index.js << 'EOF'
require('./server/index.js');
EOF

# Copy essential files
echo "📋 Copying config files..."
cp package.json dist/
cp package-lock.json dist/ 2>/dev/null || true

# Update package.json in dist
echo "📝 Updating package.json..."
node -e '
const pkg = require("./dist/package.json");
pkg.main = "index.js";
pkg.type = "commonjs";
require("fs").writeFileSync("./dist/package.json", JSON.stringify(pkg, null, 2));
'

# Set proper permissions
echo "🔒 Setting permissions..."
find dist -type d -exec chmod 755 {} \;
find dist -type f -exec chmod 644 {} \;

# Verify deployment
echo "� Verifying deployment files..."
if [ ! -f "dist/index.js" ]; then
    echo "❌ Error: index.js not found in dist"
    exit 1
fi

echo "📦 Files in dist:"
ls -la dist/

# Final verification
echo "✅ Build completed successfully"
echo "📝 Node version: $(node -v)"
echo "📝 NPM version: $(npm -v)"

echo "🔍 Verifying files..."
ls -la server/
ls -la .

echo "✅ Build complete!"
