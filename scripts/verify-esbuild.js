#!/usr/bin/env node
import { platform, arch } from 'os';
import { existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const currentPlatform = platform();
const currentArch = arch();

console.log(`Current platform: ${currentPlatform}-${currentArch}`);

// Check for correct esbuild package
const expectedPackage = `@esbuild/${currentPlatform}-${currentArch}`;
const packagePath = join(__dirname, '../node_modules', expectedPackage);

if (existsSync(packagePath)) {
  console.log(`✅ Correct esbuild package found: ${expectedPackage}`);
  process.exit(0);
} else {
  console.error(`❌ Expected esbuild package not found: ${expectedPackage}`);
  console.error('Run: npm rebuild esbuild --platform=${currentPlatform} --arch=${currentArch}');
  process.exit(1);
}
