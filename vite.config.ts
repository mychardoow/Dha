import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./client/src"),
    },
  },
  build: {
    outDir: "dist/public",
    assetsDir: "assets",
    sourcemap: false,
    target: "esnext",
    rollupOptions: {
      input: path.resolve(__dirname, "client/index.html"),
      output: {
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu', '@radix-ui/react-tabs'],
          charts: ['chart.js', 'react-chartjs-2', 'recharts'],
          pdf: ['jspdf', 'pdf-lib', 'pdfkit'],
          crypto: ['crypto-js', 'node-forge'],
          ai: ['openai', '@anthropic-ai/sdk']
        },
        chunkSizeWarningLimit: 1000
      }
    },
  },
  server: {
    port: 5000,
    host: "0.0.0.0",
    proxy: {
      "/api": {
        target: "http://0.0.0.0:5000",
        changeOrigin: true,
      },
    },
  },
});