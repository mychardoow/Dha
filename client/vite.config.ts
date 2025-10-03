import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig({
  plugins: [react()],
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
      include: [
        /node_modules/,
        /pdf-lib/,
        /pdfjs-dist/,
        /recharts/,
        /highlight\.js/,
        /socket\.io-client/,
        /date-fns/
      ]
    },
    rollupOptions: {
      external: [],
      output: {
        format: "es",
        chunkFileNames: "[name]-[hash].js",
        manualChunks: undefined
      }
    }
  }
});
