import { getRequest } from "@tanstack/react-start/server";
import { createClient } from "@supabase/supabase-js";

/**
 * The signed-in user's id, if the request carries a valid session token — or null
 * for a guest. Never throws, so public server functions (which work signed out)
 * can save extra data for signed-in learners without becoming sign-in-only.
 */
export async function optionalUserId(): Promise<string | null> {
  try {
    const url = process.env["SUPABASE_URL"];
    const key = process.env["SUPABASE_PUBLISHABLE_KEY"];
    const header = getRequest()?.headers.get("authorization");
    if (!url || !key || !header?.startsWith("Bearer ")) return null;
    const token = header.slice("Bearer ".length);
    if (token.split(".").length !== 3) return null;

    const client = createClient(url, key, {
      global: {
        fetch: (input, init) => {
          const headers = new Headers(init?.headers);
          headers.set("apikey", key);
          return fetch(input, { ...init, headers });
        },
      },
      auth: { storage: undefined, persistSession: false, autoRefreshToken: false },
    });
    const { data, error } = await client.auth.getClaims(token);
    const sub = data?.claims?.sub;
    return error || typeof sub !== "string" ? null : sub;
  } catch {
    return null;
  }
}
