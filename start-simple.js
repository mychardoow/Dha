
import { execSync, spawn } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🚀 DHA PRODUCTION STARTUP');
console.log('=========================\n');

// Kill any existing processes
try {
  console.log('🧹 Cleaning up stale processes...');
  execSync('pkill -f "node.*server" || true', { stdio: 'ignore' });
  execSync('pkill -f tsx || true', { stdio: 'ignore' });
} catch (e) {
  // Ignore cleanup errors
}

// Ensure tsx is installed
try {
  console.log('📦 Verifying tsx installation...');
  execSync('npx tsx --version', { stdio: 'pipe' });
  console.log('✅ tsx is available');
} catch (e) {
  console.log('📦 Installing dependencies...');
  execSync('npm install --legacy-peer-deps --no-optional', { stdio: 'inherit' });
}

console.log('✅ Starting DHA Server with tsx...\n');

const server = spawn('npx', ['tsx', '--tsconfig', 'tsconfig.json', 'server/index.ts'], {
  stdio: 'inherit',
  env: {
    ...process.env,
    NODE_ENV: process.env.NODE_ENV || 'production',
    PORT: process.env.PORT || '5000',
    HOST: '0.0.0.0',
    TS_NODE_TRANSPILE_ONLY: 'true',
    TS_NODE_IGNORE_DIAGNOSTICS: 'true'
  },
  cwd: process.cwd()
});

server.on('error', (err) => {
  console.error('❌ Server failed to start:', err.message);
  console.error('\n💡 Try running: npm install');
  process.exit(1);
});

server.on('exit', (code) => {
  if (code !== 0 && code !== null) {
    console.error(`❌ Server exited with code ${code}`);
    process.exit(code);
  }
});

process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1000);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Shutting down gracefully...');
  server.kill('SIGTERM');
  setTimeout(() => process.exit(0), 1000);
});
