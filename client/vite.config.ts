import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { resolve } from "path";

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  root: ".",
  publicDir: "public",
  build: {
    outDir: "dist",
    sourcemap: true,
    target: "es2020",
    minify: "esbuild",
  },
  server: {
    host: true,
    port: 3000,
    hmr: {
      port: 3001,
      overlay: false, // Disable error overlay that might trigger reloads
    },
  },
  resolve: {
    alias: {
      "@": resolve(__dirname, "src"),
      "@shared": resolve(__dirname, "../shared/src"),
    },
  },
  optimizeDeps: {
    include: ["msgpackr", "tiny-ecs"],
  },
});
