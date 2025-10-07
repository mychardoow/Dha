#!/usr/bin/env node

console.log('🚀 DHA EMERGENCY STARTUP');
console.log('========================\n');

// Kill any existing processes
const { execSync } = require('child_process');
try {
  execSync('pkill -f "node.*server" || true', { stdio: 'ignore' });
  execSync('pkill -f tsx || true', { stdio: 'ignore' });
} catch (e) {}

// Start server directly with tsx (no build required)
console.log('✅ Starting DHA Server with tsx (no build needed)...\n');

const { spawn } = require('child_process');

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '5000',
    HOST: '0.0.0.0'
  }
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err);
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

process.on('SIGINT', () => {
  server.kill();
  process.exit(0);
});

process.on('SIGTERM', () => {
  server.kill();
  process.exit(0);
});