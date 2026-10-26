import { createMiddleware } from "@tanstack/react-start";
import { loadSupabase, mayHaveSession } from "./lazy";

// Must be registered as a global `functionMiddleware` in `src/start.ts`; otherwise
// the browser never attaches the bearer token to serverFn RPCs.
export const attachSupabaseAuth = createMiddleware({ type: "function" }).client(
  async ({ next }) => {
    // Signed out, there is no token to attach and no reason to download the client for one.
    const client = mayHaveSession() ? await loadSupabase() : null;
    const token = client ? (await client.auth.getSession()).data.session?.access_token : undefined;
    return next({
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
  },
);
