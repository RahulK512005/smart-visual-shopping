import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

// Dev server proxies API, WebSocket and uploaded-file requests to the FastAPI backend,
// so the browser never hits CORS problems in development.
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, ".", "");
  const target = env.VITE_PROXY_TARGET || "http://localhost:8000";
  return {
    plugins: [react()],
    server: {
      port: 5173,
      proxy: {
        "/api": { target, changeOrigin: true },
        "/files": { target, changeOrigin: true },
        "/ws": { target, changeOrigin: true, ws: true },
      },
    },
  };
});
