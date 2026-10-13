/** New Supabase API keys (`sb_publishable_…`, `sb_secret_…`) are opaque strings, not JWTs. */
function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

/**
 * `fetch` for a Supabase client: always sends the key as `apikey`, and never sends a new-style key
 * as a bearer token (the API rejects it there). A user's access token still goes through.
 */
export function supabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );
    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }
    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }
    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

/** Throws (and logs) a clear message naming the settings that aren't set. */
export function requireEnv(values: Record<string, string | undefined>): Record<string, string> {
  const missing = Object.entries(values)
    .filter(([, value]) => !value)
    .map(([name]) => name);
  if (missing.length > 0) {
    const message = `Missing Supabase setting(s): ${missing.join(", ")}. See .env.example and docs/deploy.md.`;
    console.error(`[Supabase] ${message}`);
    throw new Error(message);
  }
  return values as Record<string, string>;
}
