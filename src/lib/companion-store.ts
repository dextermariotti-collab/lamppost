import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { DEFAULT_COMPANION, normalizeCompanion, type Companion } from "./companions";

const DRAFT_KEY = "lamppost-companion-draft";
const SEEN_KEY = "lamppost-onboarding-seen";
const EVENT = "lamppost-companion-change";

/** Pre-account choice, kept locally until the user creates an account. */
export function readDraft(): Companion | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    return raw ? normalizeCompanion(JSON.parse(raw) as Companion) : null;
  } catch {
    return null;
  }
}

export function writeDraft(companion: Companion) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DRAFT_KEY, JSON.stringify(companion));
    window.localStorage.setItem(SEEN_KEY, "1");
    window.dispatchEvent(new Event(EVENT));
  } catch {
    /* ignore */
  }
}

export function markOnboardingSeen() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(SEEN_KEY, "1");
  } catch {
    /* ignore */
  }
}

export function hasSeenOnboarding() {
  if (typeof window === "undefined") return true;
  try {
    return window.localStorage.getItem(SEEN_KEY) === "1";
  } catch {
    return true;
  }
}

const toRow = (c: Companion) => ({
  companion_preset: c.preset,
  companion_palette: c.palette,
  companion_accessory: c.accessory,
  companion_expression: c.expression,
});

/** Writes the companion onto the signed-in user's profile row. */
export async function saveCompanionForUser(userId: string, companion: Companion) {
  // The row is created by the signup trigger (which also mints handle + invite code).
  const { error } = await supabase
    .from("profiles")
    .update({ onboarding_completed: true, ...toRow(companion) })
    .eq("id", userId);
  if (error) throw error;
}

/** After sign-in, promotes any pre-account pick onto the account. */
export async function syncDraftAfterSignIn(userId: string) {
  const draft = readDraft();
  if (!draft) return;
  await saveCompanionForUser(userId, draft);
  try {
    window.localStorage.removeItem(DRAFT_KEY);
  } catch {
    /* ignore */
  }
  window.dispatchEvent(new Event(EVENT));
}

export function useSessionUser() {
  const [userId, setUserId] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!active) return;
      setUserId(data.session?.user.id ?? null);
      setReady(true);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUserId(session?.user.id ?? null);
      setReady(true);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { userId, ready };
}

/**
 * The active companion: from the account when signed in, otherwise the local
 * pre-account pick, otherwise the default so nothing is ever blank.
 */
export function useCompanion() {
  const { userId, ready } = useSessionUser();
  const [companion, setCompanion] = useState<Companion>(DEFAULT_COMPANION);
  const [loaded, setLoaded] = useState(false);

  const load = useCallback(async () => {
    if (!ready) return;
    if (!userId) {
      setCompanion(readDraft() ?? DEFAULT_COMPANION);
      setLoaded(true);
      return;
    }
    const { data } = await supabase
      .from("profiles")
      .select("companion_preset, companion_palette, companion_accessory, companion_expression")
      .eq("id", userId)
      .maybeSingle();
    setCompanion(
      normalizeCompanion({
        preset: data?.companion_preset,
        palette: data?.companion_palette,
        accessory: data?.companion_accessory,
        expression: data?.companion_expression,
      }),
    );
    setLoaded(true);
  }, [ready, userId]);

  useEffect(() => {
    void load();
    const sync = () => void load();
    window.addEventListener(EVENT, sync);
    return () => window.removeEventListener(EVENT, sync);
  }, [load]);

  const save = useCallback(
    async (next: Companion) => {
      setCompanion(next);
      if (userId) await saveCompanionForUser(userId, next);
      else writeDraft(next);
      window.dispatchEvent(new Event(EVENT));
    },
    [userId],
  );

  return { companion, loaded, signedIn: Boolean(userId), userId, save };
}
