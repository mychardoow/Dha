#!/bin/bash

echo "🔧 Installing TypeScript build dependencies..."
npm install typescript@5.9.3 ts-node@10.9.2 @types/node@20.19.22 --save-dev

echo "🔨 Compiling TypeScript..."
npx tsc --skipLibCheck --allowJs --resolveJsonModule --esModuleInterop