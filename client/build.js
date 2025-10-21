import { build } from 'vite';
import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function buildClient() {
  try {
    console.log('Building client...');
    await build({
      root: __dirname,
      build: {
        outDir: 'dist',
        assetsDir: 'assets',
        emptyOutDir: true,
        sourcemap: true,
        rollupOptions: {
          input: resolve(__dirname, 'index.html'),
        },
      },
    });
    console.log('Client build complete! ✨');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

buildClient();