#!/bin/bash

# Exit on error
set -e

echo "🚀 Starting optimized build..."

echo "🧹 Cleaning..."
rm -rf dist/

# Create directory structure
echo "📁 Creating directories..."
mkdir -p dist/workers
mkdir -p dist/config

# Create minimal production server
echo "📝 Creating production server..."
cat > dist/index.js << 'EOF'
const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

// Database connection
const { Pool } = require('pg');
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// Basic middleware
app.use(express.json());

// Health check
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT NOW()');
    res.json({ status: 'healthy', db: 'connected' });
  } catch (error) {
    res.status(503).json({ status: 'unhealthy', error: error.message });
  }
});

// Start server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
EOF

# Create minimal worker
echo "� Creating worker..."
cat > dist/workers/background-worker.js << 'EOF'
const { parentPort } = require('worker_threads');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function healthCheck() {
  try {
    await pool.query('SELECT NOW()');
    return true;
  } catch {
    return false;
  }
}

setInterval(healthCheck, 30000);
EOF

# Create minimal task scheduler
echo "⏰ Creating scheduler..."
cat > dist/workers/task-scheduler.js << 'EOF'
const cron = require('node-cron');
const { Pool } = require('pg');

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

cron.schedule('*/5 * * * *', async () => {
  try {
    await pool.query('SELECT NOW()');
    console.log('Health check passed');
  } catch (error) {
    console.error('Health check failed:', error.message);
  }
});
EOF

# Set permissions
echo "� Setting permissions..."
chmod +x dist/index.js
chmod +x dist/workers/background-worker.js
chmod +x dist/workers/task-scheduler.js

# Install only production dependencies
echo "📦 Installing minimal dependencies..."
npm install --production --no-package-lock express pg node-cron worker_threads

echo "✅ Build complete!"

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
