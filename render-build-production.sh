#!/bin/bash

set -e

echo "🚀 RENDER PRODUCTION BUILD"
echo "=========================="

# Set environment variables
export NODE_ENV=production
export NODE_VERSION=20.18.1

echo "🔍 Verifying Node.js version..."
node -v
npm -v

echo "📦 Installing dependencies..."
npm install --no-audit --no-fund --production=false

echo "�️ Running TypeScript build..."
npm run build:ts

echo "🧪 Running validation suite..."
node ai-validation-suite.cjs

echo "🔐 Running security checks..."
npm audit

echo "♻️ Optimizing dependencies..."
npm prune --production

echo "✅ Running final validation..."
node comprehensive-system-test.ts

echo "🎉 Production build complete!"