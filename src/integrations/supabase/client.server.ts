// Server-side Supabase client with the service role key: it bypasses RLS. Use it only in server
// functions and server routes, loaded inside the handler:
//   const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
// A top-level import is safe only in other .server.ts modules: route files and *.functions.ts
// ship to the browser (src/architecture.test.ts checks this).
import { createClient } from "@supabase/supabase-js";
import { requireEnv, supabaseFetch } from "./shared";
import type { Database } from "./types";

function createSupabaseAdminClient() {
  const env = requireEnv({
    SUPABASE_URL: process.env["SUPABASE_URL"],
    SUPABASE_SERVICE_ROLE_KEY: process.env["SUPABASE_SERVICE_ROLE_KEY"],
  });
  const key = env["SUPABASE_SERVICE_ROLE_KEY"]!;
  return createClient<Database>(env["SUPABASE_URL"]!, key, {
    global: { fetch: supabaseFetch(key) },
    auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
  });
}

let _supabaseAdmin: ReturnType<typeof createSupabaseAdminClient> | undefined;

export const supabaseAdmin = new Proxy({} as ReturnType<typeof createSupabaseAdminClient>, {
  get(_, prop, receiver) {
    if (!_supabaseAdmin) _supabaseAdmin = createSupabaseAdminClient();
    return Reflect.get(_supabaseAdmin, prop, receiver);
  },
});
