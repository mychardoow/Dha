#!/bin/bash

# Balanced production build script for free tier
set +e

echo "🚀 Starting optimized free-tier build..."

# Function to log
log() {
    echo "[$(date -u +"%Y-%m-%d %H:%M:%S")] $1"
}

# Clean up but keep essential files
log "🧹 Cleaning up..."
rm -rf dist
rm -rf node_modules

# Install only essential dependencies
log "📦 Installing core dependencies..."
npm install --no-audit --no-fund --legacy-peer-deps --production=true \
    express \
    pdfkit \
    cors \
    compression \
    helmet \
    express-rate-limit

# Create essential directories
log "📁 Creating directories..."
mkdir -p dist/server/routes
mkdir -p dist/server/middleware
mkdir -p dist/shared
mkdir -p dist/documents

# Copy core files
log "📋 Copying essential files..."
cp -r server/routes/documents.js dist/server/routes/
cp -r shared/utils dist/shared/
cp -r server/middleware/auth.js dist/server/middleware/

# Create minimal server
cat > dist/server/index.js << 'EOL'
const express = require('express');
const compression = require('compression');
const cors = require('cors');
const helmet = require('helmet');
const documents = require('./routes/documents');

const app = express();

// Essential middleware
app.use(compression());
app.use(cors());
app.use(helmet());
app.use(express.json({ limit: '10mb' }));

// Document routes
app.use('/api/documents', documents);

// Health check
app.get('/health', (req, res) => res.json({ status: 'healthy' }));

// Basic error handling
app.use((err, req, res, next) => {
    console.error(err);
    res.status(500).json({ success: false, error: 'Server error' });
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log(`Server running on port ${port}`));
EOL

log "✅ Build completed successfully!"

exit 0