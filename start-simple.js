#!/usr/bin/env node

const { spawn } = require('child_process');
const path = require('path');

console.log('🇿🇦 DHA Digital Services Platform - Replit Startup');
console.log('==================================================');

// Set environment variables for Replit
process.env.NODE_ENV = process.env.NODE_ENV || 'production';
process.env.PORT = process.env.PORT || '5000';
process.env.HOST = '0.0.0.0';

// Start the TypeScript server directly
const serverPath = path.join(__dirname, 'server', 'index.ts');

console.log('🚀 Starting DHA server with tsx...');

const server = spawn('npx', ['tsx', serverPath], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: 'production',
    PORT: '5000',
    HOST: '0.0.0.0'
  }
});

server.on('error', (error) => {
  console.error('❌ Server startup error:', error);
  console.log('🔄 Attempting to restart...');
  setTimeout(() => {
    const retryServer = spawn('npx', ['tsx', serverPath], {
      stdio: 'inherit',
      env: process.env
    });
    retryServer.on('close', (code) => {
      if (code !== 0) {
        process.exit(code);
      }
    });
  }, 3000);
});

server.on('close', (code) => {
  console.log(`🔄 Server process exited with code ${code}`);
  if (code !== 0) {
    console.log('🔄 Restarting server...');
    setTimeout(() => {
      require(serverPath);
    }, 2000);
  }
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('🛑 Received SIGTERM, shutting down gracefully');
  server.kill('SIGTERM');
});

process.on('SIGINT', () => {
  console.log('🛑 Received SIGINT, shutting down gracefully');
  server.kill('SIGINT');
});