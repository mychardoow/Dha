import { build } from 'esbuild';
import { join } from 'path';
import { rm, cp } from 'fs/promises';

async function buildProduction() {
  console.log('🚀 Starting production build...');

  // Clean dist directory
  console.log('Cleaning dist directory...');
  try {
    await rm('dist', { recursive: true, force: true });
  } catch (error) {
    console.warn('No dist directory to clean');
  }

  try {
    // Build server code
    console.log('Building server code...');
    await build({
      entryPoints: ['server/**/*.ts'],
      bundle: true,
      minify: true,
      sourcemap: true,
      platform: 'node',
      target: 'node20',
      outdir: 'dist/server',
      format: 'esm',
      loader: {
        '.ts': 'ts',
      },
    });

    // Copy necessary files
    console.log('Copying configuration files...');
    await Promise.all([
      cp('package.json', 'dist/package.json'),
      cp('render.yaml', 'dist/render.yaml'),
      cp('.env.example', 'dist/.env.example'),
    ]);

    console.log('✅ Production build completed successfully!');
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildProduction();