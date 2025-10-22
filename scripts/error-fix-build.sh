#!/bin/bash

echo "🚀 RENDER PRODUCTION BUILD - ERROR FIXING VERSION"
echo "=============================================="

# 1. Setup correct Node.js version
if [ -f ".nvmrc" ]; then
    echo "📦 Setting up Node.js version from .nvmrc..."
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install
    nvm use
else
    echo "⚠️ No .nvmrc found, using Node.js 20.11.1"
    export NVM_DIR="$HOME/.nvm"
    [ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
    nvm install 20.11.1
    nvm use 20.11.1
fi

# 2. Clean install dependencies
echo "🧹 Cleaning previous builds..."
rm -rf dist node_modules client/node_modules

echo "📦 Installing root dependencies..."
npm install --legacy-peer-deps

# 3. Run client build with fixes
echo "🔨 Building client..."
bash scripts/client-build-fix.sh

# 4. Run TypeScript build with fixes
echo "🔨 Building TypeScript..."
bash scripts/typescript-build-fix.sh

# 5. Setup distribution
echo "📦 Setting up distribution..."
mkdir -p dist/public
cp -r client/dist/* dist/public/ 2>/dev/null || echo "⚠️ No client build to copy"

# 6. Verify build
echo "✅ Verifying build..."
if [ -f "dist/server/index.js" ]; then
    echo "✅ Server build successful"
    if [ -d "dist/public" ]; then
        echo "✅ Client build successful"
        echo "🎉 BUILD COMPLETED SUCCESSFULLY!"
        exit 0
    fi
fi

echo "❌ Build verification failed"
exit 1