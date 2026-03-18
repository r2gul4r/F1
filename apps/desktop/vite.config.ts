import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

export default defineConfig({
  plugins: [react()],
  root: resolve(__dirname, "src/renderer"),
  server: {
    host: "127.0.0.1",
    port: 5173,
    strictPort: true
  },
  build: {
    emptyOutDir: false,
    outDir: resolve(__dirname, "dist/renderer")
  }
});
