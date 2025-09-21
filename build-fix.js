// Emergency build fix for government deployment
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

console.log('🚨 EMERGENCY BUILD FIX FOR GOVERNMENT DEPLOYMENT');

// Fix 1: Create proper tsconfig for full server build
const tsconfig = {
  "compilerOptions": {
    "target": "ES2020",
    "module": "ES2020",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./",
    "strict": true,
    "esModuleInterop": true,
    "allowSyntheticDefaultImports": true,
    "forceConsistentCasingInFileNames": true,
    "skipLibCheck": true,
    "resolveJsonModule": true
  },
  "include": [
    "server/**/*",
    "shared/**/*"
  ],
  "exclude": ["node_modules", "dist", "client"]
};

fs.writeFileSync('tsconfig.build.json', JSON.stringify(tsconfig, null, 2));
console.log('✅ Created tsconfig.build.json for proper compilation');

// Fix 2: Build all server files properly
console.log('🔧 Building all server files...');
const buildProcess = spawn('npx', ['tsc', '-p', 'tsconfig.build.json'], { stdio: 'inherit' });

buildProcess.on('close', (code) => {
  if (code === 0) {
    console.log('✅ Build completed successfully');
    
    // Fix 3: Create Railway start script that works
    const railwayStart = `#!/bin/bash
export NODE_ENV=production
export PORT=\${PORT:-3000}
echo "🚀 Starting DHA Digital Services for Government..."
node dist/server/index.js
`;
    
    fs.writeFileSync('railway-start.sh', railwayStart);
    fs.chmodSync('railway-start.sh', '755');
    console.log('✅ Created railway-start.sh');
    
    console.log('🍾 BUILD FIXES COMPLETE - READY FOR RAILWAY!');
  } else {
    console.error('❌ Build failed');
    process.exit(1);
  }
});