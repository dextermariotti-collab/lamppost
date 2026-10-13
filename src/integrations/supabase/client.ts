import { createClient } from "@supabase/supabase-js";
import { requireEnv, supabaseFetch } from "./shared";
import type { Database } from "./types";

function createSupabaseClient() {
  // In the browser Vite builds the VITE_ values in; during server rendering they come from the
  // server's environment.
  const env = requireEnv({
    SUPABASE_URL: import.meta.env["VITE_SUPABASE_URL"] || process.env["SUPABASE_URL"],
    SUPABASE_PUBLISHABLE_KEY:
      import.meta.env["VITE_SUPABASE_PUBLISHABLE_KEY"] || process.env["SUPABASE_PUBLISHABLE_KEY"],
  });
  const key = env["SUPABASE_PUBLISHABLE_KEY"]!;
  return createClient<Database>(env["SUPABASE_URL"]!, key, {
    global: { fetch: supabaseFetch(key) },
    auth: { persistSession: true, autoRefreshToken: true },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

/** The browser's Supabase client, signed in as the learner (RLS applies). Created on first use. */
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    if (!_supabase) _supabase = createSupabaseClient();
    return Reflect.get(_supabase, prop, receiver);
  },
});
