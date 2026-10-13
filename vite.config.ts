import { fileURLToPath } from "node:url";
import tailwindcss from "@tailwindcss/vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import { nitro } from "nitro/vite";
import { defineConfig } from "vite";

// The web build targets Cloudflare Workers (`npm run deploy`). Nitro writes the worker and its
// Wrangler config to `.output/`; set NITRO_PRESET to build for another host instead.
//
// `--mode app` builds the phone app instead: the same screens as a single-page app (TanStack
// Start's SPA mode renders one shell page), copied into dist-app/ for Capacitor by
// scripts/build-app.mjs. Its server functions run on the deployed backend (VITE_API_URL).
export default defineConfig(({ command, mode }) => ({
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
      ...(mode === "app" ? { spa: { enabled: true } } : {}),
    }),
    ...(command === "build" && mode !== "app"
      ? [
          nitro({
            defaultPreset: "cloudflare-module",
            compatibilityDate: "2026-07-30",
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
  // CORS is src/server.ts's job (lib/app-origins.ts), in development as in production; Vite's own
  // would answer preflights first and allow a different set of origins.
  server: { port: 8080, cors: false },
}));
