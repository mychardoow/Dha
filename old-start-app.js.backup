#!/usr/bin/env node

// Simple startup script for DHA Digital Services Platform
// Bypasses the --respawn issue in package.json

const { spawn } = require('child_process');
const path = require('path');

console.log('🚀 Starting DHA Digital Services Platform...');
console.log('----------------------------------------');

// Use the emergency server that has all the DHA routes
const serverProcess = spawn('node', ['emergency-server.mjs'], {
  stdio: 'inherit',
  cwd: process.cwd(),
  env: { ...process.env, PORT: '5000' }
});

serverProcess.on('error', (err) => {
  console.error('❌ Failed to start server:', err);
  process.exit(1);
});

serverProcess.on('exit', (code) => {
  if (code !== 0) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

console.log('✅ DHA Document System Starting...');
console.log('📍 Server will be available at: http://localhost:5000');
console.log('📄 DHA Documents: http://localhost:5000/dha-documents');
console.log('----------------------------------------');
console.log('Press Ctrl+C to stop the server');