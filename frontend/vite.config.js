import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

const API = "http://127.0.0.1:8000";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    proxy: {
      "/api": { target: API, changeOrigin: true },
      "/uploads": { target: API, changeOrigin: true },
    },
  },
});
