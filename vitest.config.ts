import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// Tests deliberately don't use vite.config.ts: that pulls in the TanStack Start,
// Nitro and Cloudflare plugins, none of which the pure logic under test needs.
export default defineConfig({
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "node",
    restoreMocks: true,
  },
});
