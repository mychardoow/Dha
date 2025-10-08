#!/usr/bin/env node

/**
 * TypeScript Build Validator
 * Automatically fixes common TypeScript issues during build
 */

import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import path from 'path';
import chalk from 'chalk';

function runTypeCheck() {
  try {
    console.log('🔍 Running TypeScript validation...');
    execSync('tsc --noEmit', { 
      stdio: 'inherit',
      cwd: path.join(__dirname, '..')
    });
    return true;
  } catch (error) {
    console.log('⚠️ TypeScript issues found, attempting auto-fix...');
    return false;
  }
}

function attemptAutoFix() {
  try {
    // Run ESLint auto-fix
    console.log(chalk.blue('🔧 Running ESLint auto-fix...'));
    execSync('eslint . --ext .ts,.tsx --fix', { stdio: 'inherit' });

    // Run Prettier
    console.log(chalk.blue('✨ Running Prettier format...'));
    execSync('prettier --write "**/*.{ts,tsx}"', { stdio: 'inherit' });

    // Check if fixes resolved the issues
    return runTypeCheck();
  } catch (error) {
    console.error(chalk.red('❌ Auto-fix failed:'), error);
    return false;
  }
}

// Main execution
console.log(chalk.green('🚀 Starting TypeScript validation and auto-fix process...'));

if (!runTypeCheck()) {
  if (attemptAutoFix()) {
    console.log(chalk.green('✅ All TypeScript issues resolved automatically!'));
    process.exit(0);
  } else {
    console.error(chalk.red('❌ Some TypeScript issues require manual attention.'));
    process.exit(1);
  }
} else {
  console.log(chalk.green('✅ TypeScript validation passed!'));
  process.exit(0);
}