import { createStart, createCsrfMiddleware, createMiddleware } from "@tanstack/react-start";

import { renderErrorPage } from "./lib/error-page";
import { attachSupabaseAuth } from "@/integrations/supabase/auth-attacher";
import { sameSiteOrApp } from "./lib/app-origins";
import { apiFetch } from "./lib/platform";

const errorMiddleware = createMiddleware().server(async ({ next }) => {
  try {
    return await next();
  } catch (error) {
    if (error != null && typeof error === "object" && "statusCode" in error) {
      throw error;
    }
    console.error(error);
    return new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  }
});

// Start installs this automatically when src/start.ts is absent; defining the
// file opts out, so re-add it explicitly to keep server functions protected
// from cross-site requests.
// The iOS and Android apps call from their own origins (lib/app-origins.ts), so those pass too.
const csrfMiddleware = createCsrfMiddleware({
  filter: (ctx) => ctx.handlerType === "serverFn",
  secFetchSite: (value, ctx) => sameSiteOrApp(ctx.request, value, process.env["APP_ORIGINS"]),
  origin: (_value, ctx) => sameSiteOrApp(ctx.request, null, process.env["APP_ORIGINS"]),
});

export const startInstance = createStart(() => ({
  functionMiddleware: [attachSupabaseAuth],
  requestMiddleware: [errorMiddleware, csrfMiddleware],
  // In the phone app, server functions run on the deployed backend.
  serverFns: { fetch: apiFetch },
}));
