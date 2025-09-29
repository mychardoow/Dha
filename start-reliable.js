
#!/usr/bin/env node
const { spawn } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 Starting DHA Digital Services Platform');
console.log('========================================');

// Kill any existing processes
try {
  require('child_process').exec('pkill -f "node.*server" || true');
} catch (e) {
  console.log('No existing processes to kill');
}

// Clean install if needed
if (!fs.existsSync('node_modules') || !fs.existsSync('dist')) {
  console.log('📦 Installing dependencies...');
  const install = spawn('npm', ['install', '--legacy-peer-deps', '--no-optional'], {
    stdio: 'inherit',
    shell: true
  });
  
  install.on('close', (code) => {
    if (code === 0) {
      startServer();
    } else {
      console.log('⚠️ Install had warnings, continuing...');
      startServer();
    }
  });
} else {
  startServer();
}

function startServer() {
  console.log('🚀 Starting server...');
  
  // Try built server first, fall back to direct execution
  if (fs.existsSync('dist/server/index.js')) {
    const server = spawn('node', ['dist/server/index.js'], {
      stdio: 'inherit',
      env: { ...process.env, PORT: process.env.PORT || '5000' }
    });
    
    server.on('error', (err) => {
      console.error('❌ Server error:', err);
      fallbackStart();
    });
  } else {
    fallbackStart();
  }
}

function fallbackStart() {
  console.log('🔄 Using fallback server start...');
  const server = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    env: { ...process.env, PORT: process.env.PORT || '5000' }
  });
  
  server.on('error', (err) => {
    console.error('❌ Fallback failed:', err);
  });
}
