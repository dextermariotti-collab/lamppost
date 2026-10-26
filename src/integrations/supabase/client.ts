import { createClient } from "@supabase/supabase-js";
import { isNativeApp } from "@/lib/platform";
import { announceSupabase } from "./lazy";
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
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      // The app gets a sign-in back as a code through its own link (lib/oauth.ts), never in its
      // page address, so it uses the PKCE flow and doesn't look for one there.
      ...(isNativeApp() ? { flowType: "pkce" as const, detectSessionInUrl: false } : {}),
    },
  });
}

let _supabase: ReturnType<typeof createSupabaseClient> | undefined;

/** The one client, made on first use and announced to code waiting for it (`lazy.ts`). */
export function getSupabase() {
  if (!_supabase) {
    _supabase = createSupabaseClient();
    if (typeof window !== "undefined") announceSupabase(_supabase);
  }
  return _supabase;
}

/** The browser's Supabase client, signed in as the learner (RLS applies). Created on first use. */
export const supabase = new Proxy({} as ReturnType<typeof createSupabaseClient>, {
  get(_, prop, receiver) {
    return Reflect.get(getSupabase(), prop, receiver);
  },
});
