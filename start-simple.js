
import { spawn } from 'child_process';
import { existsSync, mkdirSync, copyFileSync } from 'fs';

console.log('🚀 EMERGENCY DEPLOYMENT - DHA Digital Services');
console.log('===============================================');
console.log('👑 Queen Raeesa Ultra AI Platform');
console.log('🔥 STABLE DEPLOYMENT - NO RESTARTS');

// Create required directories
const requiredDirs = ['dist', 'dist/server', 'dist/public'];
requiredDirs.forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
    console.log(`📁 Created directory: ${dir}`);
  }
});

// Copy essential files
try {
  if (existsSync('client/index.html')) {
    copyFileSync('client/index.html', 'dist/public/index.html');
    console.log('📋 Copied index.html to dist/public');
  }
} catch (error) {
  console.log('⚠️ Could not copy static files, proceeding anyway...');
}

// Start with tsx directly (NO AUTO-RESTART)
console.log('🚀 Starting server with tsx (stable mode)...');
console.log('🌐 Server will be available on port 5000');
console.log('✅ STABLE DEPLOYMENT - Server starting...');

const server = spawn('npx', ['tsx', 'server/index.ts'], {
  stdio: 'inherit',
  env: { 
    ...process.env, 
    NODE_ENV: 'production',
    PORT: '5000',
    HOST: '0.0.0.0'
  }
});

// REMOVE AUTO-RESTART - Let it run continuously
server.on('close', (code) => {
  console.log(`Server process ended with code ${code}`);
  console.log('🛑 Server stopped - No auto-restart (stable mode)');
});

server.on('error', (error) => {
  console.error('❌ Server error:', error);
});

// Keep process alive
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.kill();
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.kill();
});

console.log('💪 Emergency deployment script running!');
console.log('📱 Your DHA platform should be accessible shortly...');
console.log('🔒 Auto-restart disabled for stability');
