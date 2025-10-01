#!/usr/bin/env node

import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const serverFile = join(__dirname, 'server', 'index.ts');

console.log('🇿🇦 DHA Digital Services - Starting Server');
console.log('==========================================');

const env = {
  ...process.env,
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || '5000',
  HOST: '0.0.0.0'
};

function startServer() {
  console.log('🚀 Starting server...');
  
  const server = spawn('npx', ['tsx', 'watch', '--clear-screen=false', serverFile], {
    stdio: 'inherit',
    env
  });

  server.on('error', (error) => {
    console.error('❌ Server error:', error);
    setTimeout(startServer, 3000);
  });

  server.on('exit', (code) => {
    if (code !== 0 && code !== null) {
      console.log(`🔄 Server exited with code ${code}, restarting in 3s...`);
      setTimeout(startServer, 3000);
    }
  });

  process.on('SIGTERM', () => {
    console.log('🛑 SIGTERM received');
    server.kill('SIGTERM');
    process.exit(0);
  });

  process.on('SIGINT', () => {
    console.log('🛑 SIGINT received');
    server.kill('SIGINT');
    process.exit(0);
  });
}

startServer();
