import { defineConfig } from "vite";
import * as path from "path";
import { fileURLToPath } from "url";

// derive __dirname in ESM
const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig(async () => {
  let vitePluginCartographer: any = null;
  let vitePluginRuntimeErrorModal: any = null;

  try {
    const { cartographer } = await import("@replit/vite-plugin-cartographer");
    vitePluginCartographer = cartographer;
  } catch (e) {
    console.log("Cartographer plugin not available");
  }

  try {
    const runtimeErrorModalPlugin = await import("@replit/vite-plugin-runtime-error-modal");
    vitePluginRuntimeErrorModal = runtimeErrorModalPlugin.default;
  } catch (e) {
    console.log("Runtime error modal plugin not available");
  }

  // import react plugin dynamically to avoid type/module resolution issues during tsc runs
  const react = (await import("@vitejs/plugin-react")).default;

  return {
    plugins: [
      react(),
      vitePluginCartographer && vitePluginCartographer(),
      vitePluginRuntimeErrorModal && vitePluginRuntimeErrorModal,
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
