#!/bin/bash

echo "🚀 RENDER PRODUCTION BUILD - BULLETPROOF VERSION"
echo "=================================================="

# Force specific Node.js version
export NODE_VERSION=20.11.1
export PATH="/opt/render/project/src/.nvm/versions/node/v${NODE_VERSION}/bin:$PATH"

# Install nvm and Node.js
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
export NVM_DIR="$HOME/.nvm"
[ -s "$NVM_DIR/nvm.sh" ] && \. "$NVM_DIR/nvm.sh"
nvm install $NODE_VERSION
nvm use $NODE_VERSION

echo "🧹 Cleaning previous builds..."
rm -rf dist

echo "📦 Installing dependencies..."
npm install

# Install client dependencies
cd client
npm install
cd ..

echo "🔨 Building client..."
cd client
npm run build
cd ..

echo "🔨 Building TypeScript..."
npm run compile

echo "📄 Copying production files..."
mkdir -p dist/public
cp -r client/dist/* dist/public/

echo "✅ Build verification..."
if [ -f "dist/server/index.js" ] && [ -d "dist/public" ]; then
    echo "✅ Build successful!"
    echo "===================================="
    echo "✅ Server: dist/server/index.js"
    echo "✅ Client: dist/public/"
    echo "✅ Ready for deployment"
    exit 0
else
    echo "❌ Build verification failed!"
    exit 1
fi