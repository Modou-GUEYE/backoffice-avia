import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react-swc";
import path from "path";

export default defineConfig({
  plugins: [react()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.{test,spec}.{ts,tsx}"],
    // Le .env n'est pas versionné (CI) : les services exigent l'adresse de la Gateway
    env: {
      VITE_GATEWAY_BASE_URL: "http://localhost:9080",
      VITE_ACCESS_SECURITY_CLIENT_ID: "backoffice-web",
    },
  },
  resolve: {
    alias: { "@": path.resolve(__dirname, "./src") },
  },
});
