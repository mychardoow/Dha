import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import path from "path";

export default defineConfig(async () => {
  let vitePluginCartographer = null;
  let vitePluginRuntimeErrorModal = null;

  try {
    const cartographer = await import("@replit/vite-plugin-cartographer");
    vitePluginCartographer = cartographer.default;
  } catch (e) {
    console.log("Cartographer plugin not available");
  }

  try {
    const errorModal = await import("@replit/vite-plugin-runtime-error-modal");
    vitePluginRuntimeErrorModal = errorModal.default;
  } catch (e) {
    console.log("Runtime error modal plugin not available");
  }

  return {
    plugins: [
      react(),
      vitePluginCartographer ? vitePluginCartographer() : null,
      vitePluginRuntimeErrorModal ? vitePluginRuntimeErrorModal() : null,
    ].filter(Boolean),
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "./client/src"),
        "@shared": path.resolve(__dirname, "./shared"),
      },
    },
    build: {
      outDir: "dist",
      sourcemap: true,
      rollupOptions: {
        external: [
          'fsevents',
          'chokidar',
          'esbuild',
          'rollup'
        ],
        output: {
          manualChunks: {
            vendor: ['react', 'react-dom'],
            ui: ['@radix-ui/react-dialog', '@radix-ui/react-dropdown-menu']
          }
        }
      },
      commonjsOptions: {
        include: [/node_modules/],
        transformMixedEsModules: true
      }
    },
    server: {
      host: "0.0.0.0",
      port: 5000,
      strictPort: true,
      hmr: {
        clientPort: 5000,
      },
    },
    optimizeDeps: {
      include: ['react', 'react-dom'],
      exclude: ['fsevents']
    }
  };
});
