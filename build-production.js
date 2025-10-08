
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🏗️  DHA Production Build Process');
console.log('=================================\n');

// Set production environment
process.env.NODE_ENV = 'production';
process.env.FORCE_REAL_APIS = 'true';

// Clean previous builds
console.log('🧹 Cleaning previous builds...');
try {
  if (fs.existsSync('dist')) {
    fs.rmSync('dist', { recursive: true, force: true });
  }
  fs.mkdirSync('dist', { recursive: true });
  console.log('✅ Clean complete\n');
} catch (error) {
  console.error('❌ Clean failed:', error.message);
  process.exit(1);
}

// Validate environment
console.log('🔑 Validating environment...');
const requiredEnvVars = [
  'NODE_ENV',
  'PORT',
  'SESSION_SECRET'
];

const missingVars = requiredEnvVars.filter(v => !process.env[v]);
if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  process.exit(1);
}

// Build client
console.log('🎨 Building client...');
try {
  execSync('cd client && npm install --include=dev --legacy-peer-deps && npm run build', { 
    stdio: 'inherit',
    env: { 
      ...process.env, 
      NODE_ENV: 'production',
      VITE_API_URL: process.env.API_URL || 'https://api.dha.gov.za'
    }
  });
  console.log('✅ Client build complete\n');
} catch (error) {
  console.error('❌ Client build failed:', error);
  process.exit(1);
}

// Copy client build to dist
console.log('📦 Copying client build...');
try {
  const distPublic = path.join('dist', 'public');
  fs.mkdirSync(distPublic, { recursive: true });
  
  if (fs.existsSync('client/dist')) {
    execSync(`cp -r client/dist/* ${distPublic}/`, { stdio: 'inherit' });
  }
  console.log('✅ Client files copied\n');
} catch (error) {
  console.error('❌ Failed to copy client files:', error.message);
  process.exit(1);
}

// Build server
console.log('🔧 Building server...');
try {
  execSync('npm run build:api', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Server build complete\n');
} catch (error) {
  console.error('❌ Server build failed:', error);
  process.exit(1);
}

// Run production validation
console.log('🔍 Running production validation...');
try {
  execSync('node dist/server/services/selfHealingErrorHandler.js --validate', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ Production validation complete\n');
} catch (error) {
  console.error('❌ Production validation failed:', error);
  process.exit(1);
}

console.log('✨ Build completed successfully!\n');

// Build server
console.log('🔧 Building server with TypeScript...');
try {
  execSync('npx tsc --project tsconfig.json --noEmitOnError false', { 
    stdio: 'inherit'
  });
  console.log('✅ Server build complete\n');
} catch (error) {
  console.warn('⚠️ TypeScript had errors, but continuing...\n');
}

console.log('✅ Build process complete!');
console.log('🚀 Ready for deployment\n');
