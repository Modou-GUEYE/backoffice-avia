import react from "@vitejs/plugin-react-swc";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    host: "::",
    port: 8080,
    hmr: {
      overlay: false,
    },
    proxy: {
      "/api/v1": {
        target: "http://localhost:9080",
        changeOrigin: true,
        secure: false,
      },
      "/batch-requests": {
        target: "http://localhost:9080",
        changeOrigin: true,
        secure: false,
      }
    },
  },
  plugins: [react()],
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
    },
  },
});
