
#!/bin/bash

echo "🚀 DHA Digital Services - Complete Environment Setup"
echo "==================================================="
echo ""

# Make script executable
chmod +x setup-complete-environment.sh

# Set production environment
export NODE_ENV=production
export PORT=5000

echo "📦 Installing all required packages..."
npm install --force

# Install critical missing packages
npm install --save express cors helmet compression express-rate-limit
npm install --save ws @types/ws
npm install --save-dev typescript @types/node ts-node

echo "🔧 Setting up TypeScript configuration..."
if [ ! -f "tsconfig.json" ]; then
cat > tsconfig.json << 'EOF'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "node",
    "allowSyntheticDefaultImports": true,
    "esModuleInterop": true,
    "allowJs": true,
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["server/**/*", "shared/**/*"],
  "exclude": ["node_modules", "dist"]
}
EOF
fi

echo "🔨 Building application..."
npx tsc --build --force || npm run build

echo "✅ Environment setup complete!"
echo ""
echo "🌟 Ready for deployment!"
echo "Run 'npm start' to launch the application"
echo ""
