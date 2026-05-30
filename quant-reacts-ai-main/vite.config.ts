import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import tsConfigPaths from "vite-tsconfig-paths";
import { TanStackRouterVite } from "@tanstack/router-plugin/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";

export default defineConfig({
  plugins: [
    tanstackStart({
      react: {
        babel: {
          plugins: [],
        },
      },
    }),
    TanStackRouterVite({
      target: "react",
      autoCodeSplitting: false,
      disableManifestGeneration: true,
    }),
    react(),
    tailwindcss(),
    tsConfigPaths(),
  ],
  resolve: {
    alias: { "@": "/src" },
  },
  server: {
    host: "0.0.0.0",
    port: 4000,
    strictPort: true,
    hmr: {
      overlay: false,
    },
  },
});