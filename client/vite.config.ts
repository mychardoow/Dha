import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  optimizeDeps: {
    include: ['pdf-lib', 'pdfjs-dist']
  },
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared")
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    commonjsOptions: {
      include: [/node_modules/],
      transformMixedEsModules: true
    },
    rollupOptions: {
      external: [],
      output: {
        format: "es",
        chunkFileNames: "chunks/[name]-[hash].js",
        manualChunks: {
          'pdf-lib': ['pdf-lib'],
          'pdfjs': ['pdfjs-dist'],
          'vendor': [
            'react',
            'react-dom',
            'recharts',
            'highlight.js',
            'socket.io-client',
            'date-fns'
          ]
        }
      }
    },
    optimizeDeps: {
      include: ['pdf-lib', 'pdfjs-dist']
    }
  }
});
