#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting DHA Digital Services Platform...');
console.log('==========================================');
console.log('');

// Kill any existing server processes
const killProcess = spawn('pkill', ['-f', 'tsx'], { stdio: 'ignore' });

killProcess.on('close', () => {
  console.log('✨ Starting preview server...');
  
  // Start the minimal server
  const server = spawn('tsx', ['server/minimal-server.ts'], {
    env: { ...process.env, NODE_ENV: 'development', PORT: '5000' },
    stdio: 'inherit',
    cwd: path.resolve(__dirname)
  });

  server.on('error', (err) => {
    console.error('❌ Failed to start server:', err);
    process.exit(1);
  });

  server.on('close', (code) => {
    if (code !== 0) {
      console.error(`❌ Server exited with code ${code}`);
      process.exit(code);
    }
  });

  // Handle shutdown gracefully
  process.on('SIGINT', () => {
    console.log('\n⏹️  Shutting down server...');
    server.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGTERM', () => {
    server.kill('SIGTERM');
    process.exit(0);
  });
});