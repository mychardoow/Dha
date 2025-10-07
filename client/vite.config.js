import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import tsconfigPaths from 'vite-tsconfig-paths';
import path from 'path';

export default defineConfig({
  plugins: [react(), tsconfigPaths()],
  build: {
    outDir: 'dist',
    sourcemap: process.env.NODE_ENV === 'development',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true
      }
    },
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-icons', '@radix-ui/react-select', '@radix-ui/react-tabs'],
          utils: ['date-fns', 'zod', 'react-hook-form']
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: 'assets/[name]-[hash][extname]'
      }
    }
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src')
    }
  },
  optimizeDeps: {
    include: [
      'react', 
      'react-dom',
      '@hookform/resolvers/zod',
      'react-hook-form',
      'zod',
      'lucide-react'
    ],
    exclude: ['@radix-ui/react-icons']
  },
  server: {
    host: true,
    port: 3000
  },
  esbuild: {
    jsxInject: `import React from 'react'`
  }
});