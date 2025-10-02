import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
      "@shared": path.resolve(__dirname, "../shared"),
      process: "process/browser",
      stream: "stream-browserify",
      http: "stream-http",
      https: "https-browserify",
      os: "os-browserify/browser"
    },
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      external: ['fsevents', 'chokidar', 'esbuild', 'rollup'],
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          web3: ['web3', 'ethers', '@web3-react/core'],
          security: ['crypto-browserify', 'stream-browserify']
        }
      }
    }
  },
  define: {
    'process.env': {},
    global: {},
    'process.env.NODE_ENV': JSON.stringify(process.env.NODE_ENV)
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    proxy: {
      "/api": {
        target: "http://localhost:3000",
        changeOrigin: true,
      },
    },
  }
});