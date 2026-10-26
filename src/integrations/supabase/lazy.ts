import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * The Supabase client is its own download, and a signed-out visitor never needs it. Code that runs
 * on every screen (who is signed in, the token on server calls) reaches it through here: it loads
 * the client only when a session could exist, and hears about the client whenever a screen that
 * signs people in loads it first.
 */

export type BrowserSupabase = SupabaseClient<Database>;

let instance: BrowserSupabase | null = null;
const waiting = new Set<(client: BrowserSupabase) => void>();

/** Called by `client.ts` when the client is created, whoever asked for it first. */
export function announceSupabase(client: BrowserSupabase) {
  instance = client;
  for (const fn of waiting) fn(client);
  waiting.clear();
}

/** Runs `fn` with the client once it exists: straight away, if it already does. */
export function whenSupabaseLoaded(fn: (client: BrowserSupabase) => void) {
  if (instance) fn(instance);
  else waiting.add(fn);
}

/** Downloads the client if it hasn't been yet, and gives it back. */
export function loadSupabase(): Promise<BrowserSupabase> {
  return instance ? Promise.resolve(instance) : import("./client").then((m) => m.getSupabase());
}

/**
 * Whether this device could be signed in: a session is stored, or a sign-in is arriving in the
 * page address. When it can't, nothing needs the client until someone opens the sign-in screen.
 */
export function mayHaveSession(): boolean {
  if (typeof window === "undefined") return false;
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key?.startsWith("sb-") && key.includes("-auth-token")) return true;
    }
  } catch {
    // Storage that can't be read can't be ruled out.
    return true;
  }
  return /[?&#](code|access_token|error_description)=/.test(
    window.location.search + window.location.hash,
  );
}
