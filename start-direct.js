#!/usr/bin/env node

/**
 * Direct startup script - runs the emergency server
 */

import { spawn } from 'child_process';

console.log('🚀 DIRECT STARTUP - DHA DIGITAL SERVICES');
console.log('🇿🇦 Running Emergency Server');
console.log('=' .repeat(60));

// Start the emergency server
const serverProcess = spawn('node', ['emergency-server.mjs'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'development',
    PORT: '5000'
  }
});

serverProcess.on('error', (error) => {
  console.error('❌ Failed to start emergency server:', error);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
  }
  process.exit(code || 0);
});

console.log('✅ Emergency server starting...');
console.log('🌐 Server will be available at: http://localhost:5000');

// Handle shutdown
process.on('SIGTERM', () => {
  serverProcess.kill('SIGTERM');
});

process.on('SIGINT', () => {
  serverProcess.kill('SIGINT');
});