#!/usr/bin/env node

/**
 * Emergency startup script for DHA Digital Services Platform
 * This script ensures the application starts by handling all common issues
 */

import { spawn } from 'child_process';
import { existsSync, mkdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚨 EMERGENCY STARTUP - DHA DIGITAL SERVICES PLATFORM');
console.log('=' .repeat(60));
console.log('🇿🇦 Department of Home Affairs - Digital Services');
console.log('👑 Queen Raeesa Ultra AI Platform');
console.log('=' .repeat(60));

// Ensure required directories exist
const dirs = ['dist', 'dist/server', 'dist/client', 'node_modules'];
dirs.forEach(dir => {
  const path = join(__dirname, dir);
  if (!existsSync(path)) {
    console.log(`📁 Creating directory: ${dir}`);
    mkdirSync(path, { recursive: true });
  }
});

// Function to run command with proper error handling
function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    console.log(`\n🔧 Running: ${command} ${args.join(' ')}`);
    
    const child = spawn(command, args, {
      stdio: 'inherit',
      shell: true,
      env: { ...process.env, NODE_ENV: 'development', PORT: '5000' },
      ...options
    });

    child.on('error', (error) => {
      console.error(`❌ Command failed: ${error.message}`);
      reject(error);
    });

    child.on('exit', (code) => {
      if (code === 0) {
        console.log(`✅ Command completed successfully`);
        resolve();
      } else {
        console.error(`❌ Command exited with code ${code}`);
        reject(new Error(`Exit code ${code}`));
      }
    });
  });
}

// Main startup sequence
async function startApplication() {
  try {
    console.log('\n📦 Step 1: Installing dependencies...');
    console.log('This may take a few moments...');
    
    try {
      await runCommand('npm', ['install', '--no-optional', '--prefer-offline']);
    } catch (error) {
      console.log('⚠️  npm install had issues, continuing anyway...');
    }

    console.log('\n🚀 Step 2: Starting development servers...');
    console.log('Starting concurrent development servers...');
    
    // Try to run the dev command
    try {
      // This will run continuously, so we don't await it
      runCommand('npm', ['run', 'dev']).catch(err => {
        console.log('❌ npm run dev failed, trying alternative startup...');
        startAlternative();
      });
      
      console.log('\n✅ Development servers starting...');
      console.log('🌐 Server should be available at: http://localhost:5000');
      console.log('🎨 Client should be available at: http://localhost:5173');
      console.log('\n📝 Watch the logs below for startup progress...');
      
    } catch (error) {
      console.error('❌ Failed to start dev servers:', error);
      startAlternative();
    }
    
  } catch (error) {
    console.error('\n❌ Startup sequence failed:', error);
    console.log('🔄 Attempting alternative startup...');
    startAlternative();
  }
}

// Alternative startup if main approach fails
function startAlternative() {
  console.log('\n🔄 ALTERNATIVE STARTUP SEQUENCE');
  console.log('Starting servers individually...');
  
  // Start server
  const serverProcess = spawn('npx', ['tsx', 'server/index.ts'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, NODE_ENV: 'development', PORT: '5000' }
  });
  
  serverProcess.on('error', (error) => {
    console.error('❌ Server failed to start:', error);
    startFallback();
  });

  // Start client after a delay
  setTimeout(() => {
    console.log('\n🎨 Starting client development server...');
    const clientProcess = spawn('npx', ['vite', '--config', 'client/vite.config.ts'], {
      stdio: 'inherit',
      shell: true
    });
    
    clientProcess.on('error', (error) => {
      console.error('❌ Client failed to start:', error);
    });
  }, 3000);
}

// Final fallback - start the direct script
function startFallback() {
  console.log('\n🆘 FINAL FALLBACK - Starting direct server');
  
  const fallbackProcess = spawn('node', ['start-direct.js'], {
    stdio: 'inherit',
    shell: true,
    env: { ...process.env, PORT: '5000' }
  });
  
  fallbackProcess.on('error', (error) => {
    console.error('❌ All startup methods failed:', error);
    console.log('\n💡 Manual intervention required:');
    console.log('1. Check that all dependencies are installed: npm install');
    console.log('2. Check for TypeScript errors: npx tsc --noEmit');
    console.log('3. Try running directly: npm run dev');
    process.exit(1);
  });
}

// Handle graceful shutdown
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down DHA Digital Services...');
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down DHA Digital Services...');
  process.exit(0);
});

// Start the application
console.log('\n🏁 Beginning startup sequence...');
startApplication();