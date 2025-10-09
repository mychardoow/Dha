import { execSync } from 'child_process';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

console.log('🔧 Fixing TypeScript imports...');

// Add .js extension to relative imports
function fixImports(content) {
  return content.replace(
    /(from\s+['"])(\.[^'"]+)(['"])/g,
    (match, start, path, end) => {
      if (!path.endsWith('.js') && !path.endsWith('.jsx') && !path.endsWith('.css')) {
        return `${start}${path}.js${end}`;
      }
      return match;
    }
  );
}

try {
  // Find all TypeScript files
  const files = execSync('find ./server -type f -name "*.ts"', { 
    encoding: 'utf8' 
  }).split('\n').filter(Boolean);

  // Process each file
  for (const file of files) {
    const content = readFileSync(file, 'utf8');
    const fixed = fixImports(content);
    if (content !== fixed) {
      writeFileSync(file, fixed);
      console.log(`✅ Fixed imports in ${file}`);
    }
  }

  console.log('✨ All imports fixed successfully!');
} catch (error) {
  console.error('❌ Error fixing imports:', error);
  process.exit(1);
}