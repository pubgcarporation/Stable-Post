import path from "node:path";
import { fileURLToPath } from "node:url";
import type { LogOrStringHandler, RollupLog } from "rollup";
import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";

/** Directory containing this file (= frontend package root), not `process.cwd()` (breaks when npm runs from repo root). */
const frontendRoot = path.dirname(fileURLToPath(import.meta.url));

function handleRollupWarning(warning: RollupLog, warn: LogOrStringHandler) {
  if (warning.code === "INVALID_ANNOTATION") return;
  warn(warning);
}

/** Must match backend `PORT` (default 3000). Override with `VITE_DEV_PROXY_TARGET` in `frontend/.env`. */
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, frontendRoot, "");
  const apiTarget =
    env.VITE_DEV_PROXY_TARGET?.trim() || "http://127.0.0.1:3000";

  const proxyCommon = {
    target: apiTarget,
    changeOrigin: true,
    /** Circle provisioning can take a while; avoid proxy closing the socket early (shows as 502). */
    timeout: 120_000,
    proxyTimeout: 120_000,
  } as const;

  return {
    plugins: [react()],
    build: {
      chunkSizeWarningLimit: 1000,
      rollupOptions: {
        onwarn: handleRollupWarning,
      },
    },
    server: {
      port: 5173,
      proxy: {
        "/api": {
          ...proxyCommon,
          rewrite: (p: string) => p.replace(/^\/api/, ""),
        },
        "/uploads": {
          ...proxyCommon,
        },
      },
    },
  };
});
