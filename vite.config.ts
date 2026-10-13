import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// The build targets Cloudflare Workers (`npm run deploy`). Nitro writes the worker and its
// Wrangler config to `.output/`; set NITRO_PRESET to build for another host instead.
export default defineConfig(({ command }) => ({
  plugins: [
    tailwindcss(),
    tanstackStart({
      // src/server.ts wraps TanStack Start's server entry with the SSR error page.
      server: { entry: "server" },
      // Anything under a server/ folder, or marked server-only, must never reach the browser.
      importProtection: {
        behavior: "error",
        client: { files: ["**/server/**"], specifiers: ["server-only"] },
      },
    }),
    ...(command === "build"
      ? [
          nitro({
            defaultPreset: "cloudflare-module",
            compatibilityDate: "2026-10-01",
            cloudflare: { nodeCompat: true, deployConfig: true, wrangler: { name: "lamppost" } },
          }),
        ]
      : []),
    viteReact(),
  ],
  css: { transformer: "lightningcss" },
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
    dedupe: [
      "react",
      "react-dom",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
      "@tanstack/react-query",
      "@tanstack/query-core",
    ],
  },
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "react/jsx-runtime",
      "react/jsx-dev-runtime",
    ],
  },
  server: { port: 8080 },
}));
