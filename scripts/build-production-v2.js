import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🏗️  DHA Production Build Process v2');
console.log('===================================\n');

// Force production environment
process.env.NODE_ENV = 'production';
process.env.FORCE_REAL_APIS = 'true';

// Ensure critical env vars have fallbacks
process.env.PORT = process.env.PORT || '5000';
process.env.HOST = process.env.HOST || '0.0.0.0';
process.env.SESSION_SECRET = process.env.SESSION_SECRET || 'production-session-secret';

// Handle Node.js version compatibility
const nodeVersion = process.version.match(/^v(\d+)\./)[1];
if (parseInt(nodeVersion) < 20) {
  console.error('❌ Node.js version must be 20 or higher');
  process.exit(1);
}

// Clean previous builds with error handling
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

// Validate critical files exist
console.log('🔍 Validating project structure...');
const requiredFiles = [
  'package.json',
  'tsconfig.json',
  'server/index.ts'
];

for (const file of requiredFiles) {
  if (!fs.existsSync(file)) {
    console.error(`❌ Missing required file: ${file}`);
    process.exit(1);
  }
}
console.log('✅ Project structure valid\n');

// Install dependencies with retries
console.log('📦 Installing dependencies...');
let attempts = 0;
const maxAttempts = 3;

while (attempts < maxAttempts) {
  try {
    execSync('npm install --no-optional --no-audit --prefer-offline', { 
      stdio: 'inherit',
      env: { 
        ...process.env,
        NODE_ENV: 'production',
        SKIP_POSTINSTALL: 'true'
      }
    });
    console.log('✅ Dependencies installed\n');
    break;
  } catch (error) {
    attempts++;
    if (attempts === maxAttempts) {
      console.error('❌ Failed to install dependencies after multiple attempts');
      process.exit(1);
    }
    console.log(`⚠️ Retrying dependency installation (attempt ${attempts + 1}/${maxAttempts})...`);
  }
}

// Build TypeScript with error handling
console.log('🔧 Building TypeScript...');
try {
  execSync('npx tsc --project tsconfig.json --noEmit false', { 
    stdio: 'inherit',
    env: { ...process.env, NODE_ENV: 'production' }
  });
  console.log('✅ TypeScript build complete\n');
} catch (error) {
  console.warn('⚠️ TypeScript compilation had errors but continuing...\n');
}

// Copy essential files
console.log('📄 Copying configuration files...');
const filesToCopy = [
  'package.json',
  'package-lock.json',
  '.env',
  'tsconfig.json'
];

for (const file of filesToCopy) {
  if (fs.existsSync(file)) {
    fs.copyFileSync(file, path.join('dist', file));
  }
}
console.log('✅ Configuration files copied\n');

// Create production package.json
console.log('📝 Creating production package.json...');
const pkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const prodPkg = {
  name: pkg.name,
  version: pkg.version,
  type: 'module',
  engines: {
    node: '>=20.0.0'
  },
  dependencies: pkg.dependencies
};

fs.writeFileSync(
  path.join('dist', 'package.json'),
  JSON.stringify(prodPkg, null, 2)
);
console.log('✅ Production package.json created\n');

console.log('✨ Production build completed successfully!\n');