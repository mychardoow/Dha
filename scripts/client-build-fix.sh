#!/bin/bash

echo "🔧 Installing client build dependencies..."
cd client
npm install vite@5.4.1 @vitejs/plugin-react@5.0.4 --save-dev

echo "🔨 Building client..."
NODE_ENV=production npm run build
cd ..