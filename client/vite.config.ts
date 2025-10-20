import { defineConfig } from "vite";
import * as path from "path";
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// dynamically import react plugin to avoid tsc module resolution problems in some environments
const reactPlugin = async () => (await import('@vitejs/plugin-react')).default;

export default defineConfig({
  plugins: [
    // plugin will be resolved at runtime by Vite
    // when Vite evaluates the config it will handle async imports; keep simple here
    // Note: Vite supports returning a Promise from defineConfig, but we keep this sync for simplicity
    // The root config uses the dynamic import pattern already for safety
    (await import('@vitejs/plugin-react')).default(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: "0.0.0.0",
    port: 5000,
    strictPort: false,
    hmr: {
      clientPort: 443,
      protocol: 'wss'
    }
  },
  build: {
    outDir: "dist",
    sourcemap: true,
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress certain warnings
        if (warning.code === 'MODULE_LEVEL_DIRECTIVE') return;
        warn(warning);
      }
    }
  },
});