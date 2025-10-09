import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function logBuildStep(step, status, details = '') {
  const timestamp = new Date().toISOString();
  const logEntry = `[${timestamp}] ${step}: ${status}\n${details}\n`;
  await fs.promises.appendFile(path.join(__dirname, '../deployment.log'), logEntry);
  console.log(logEntry);
}

async function validateDeployment() {
  try {
    // Check TypeScript config
    logBuildStep('CONFIG', 'Validating TypeScript configuration');
    const tsconfig = require('../tsconfig.json');
    if (tsconfig.compilerOptions.module !== 'ES2022') {
      throw new Error('Invalid module setting in tsconfig.json');
    }

    // Check required files
    logBuildStep('FILES', 'Checking required files');
    const requiredFiles = [
      'render.yaml',
      'package.json',
      'tsconfig.json',
      'server/index.ts',
      'shared'
    ];
    
    for (const file of requiredFiles) {
      if (!fs.existsSync(path.join(__dirname, '..', file))) {
        throw new Error(`Missing required file: ${file}`);
      }
    }

    // Validate build script
    logBuildStep('BUILD', 'Validating build configuration');
    const pkg = require('../package.json');
    if (!pkg.scripts.build) {
      throw new Error('Missing build script in package.json');
    }

    logBuildStep('VALIDATION', 'Pre-deployment validation successful');
    return true;
  } catch (error) {
    logBuildStep('ERROR', 'Pre-deployment validation failed', error.stack);
    return false;
  }
}

validateDeployment().then((success) => {
  process.exit(success ? 0 : 1);
});