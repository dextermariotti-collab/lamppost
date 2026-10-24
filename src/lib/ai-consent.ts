import { useCallback, useRef, useState, useSyncExternalStore } from "react";

/**
 * Whether this person agreed to their text going to the AI provider. It is asked once, before
 * the first feature that sends what they typed (the tutor, writing feedback, a reply to the
 * guide's question, "Check something you saw", debates), and kept on this device only.
 */

/** The AI service the learner's text is sent to, as people should read it. Named only here. */
export const AI_PROVIDER_NAME = "Google Gemini";

const KEY = "lamppost-ai-consent-v1";
const EVENT = "lamppost-ai-consent-change";

export type AiConsent = {
  /** When they agreed, as an ISO timestamp. */
  agreedAt: string;
  /** Who they agreed to send it to. */
  provider: string;
};

/**
 * This visit's answer when the device won't save it, so a private window asks only once and a
 * withdrawal holds even if the saved agreement couldn't be removed.
 */
let unsaved: AiConsent | "withdrawn" | null = null;

export function readAiConsent(): AiConsent | null {
  if (typeof window === "undefined" || unsaved === "withdrawn") return null;
  try {
    const raw = window.localStorage.getItem(KEY);
    const parsed = raw ? (JSON.parse(raw) as Partial<AiConsent> | null) : null;
    if (parsed && typeof parsed.agreedAt === "string" && typeof parsed.provider === "string") {
      return { agreedAt: parsed.agreedAt, provider: parsed.provider };
    }
  } catch {
    /* unreadable: fall through to this visit's answer, if any */
  }
  return unsaved;
}

/** Agreement covers the provider it named, so moving to another provider asks again. */
export const hasAiConsent = () => readAiConsent()?.provider === AI_PROVIDER_NAME;

export function recordAiConsent(now = new Date()) {
  if (typeof window === "undefined") return;
  const consent: AiConsent = { agreedAt: now.toISOString(), provider: AI_PROVIDER_NAME };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(consent));
    unsaved = null;
  } catch {
    unsaved = consent;
  }
  window.dispatchEvent(new Event(EVENT));
}

/**
 * Takes the agreement back on this device: nothing more is sent until they agree again, and the
 * next feature that would send their text asks first. What was already sent isn't recalled.
 */
export function withdrawAiConsent() {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
    unsaved = null;
  } catch {
    unsaved = "withdrawn";
  }
  window.dispatchEvent(new Event(EVENT));
}

function subscribe(listener: () => void) {
  const onStorage = (event: StorageEvent) => {
    if (event.key === KEY || event.key === null) listener();
  };
  window.addEventListener(EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useAiConsent(): boolean {
  return useSyncExternalStore(subscribe, hasAiConsent, () => false);
}

/** When they agreed to the current provider (an ISO timestamp), or null if they haven't. */
const agreedAt = () => (hasAiConsent() ? readAiConsent()!.agreedAt : null);

export function useAiConsentAgreedAt(): string | null {
  return useSyncExternalStore(subscribe, agreedAt, () => null);
}

/**
 * Runs an action that sends the learner's text to the AI, asking first if they haven't agreed.
 * Render `<AiConsentSheet {...sheet} />`: "Continue" records the agreement and then runs the
 * action they asked for; "Not now" drops it, so nothing is sent.
 */
export function useAiConsentGate() {
  const pending = useRef<(() => void) | null>(null);
  const [asking, setAsking] = useState(false);

  const ask = useCallback((action: () => void) => {
    if (hasAiConsent()) {
      action();
      return;
    }
    pending.current = action;
    setAsking(true);
  }, []);

  const onContinue = useCallback(() => {
    recordAiConsent();
    const action = pending.current;
    pending.current = null;
    setAsking(false);
    action?.();
  }, []);

  const onNotNow = useCallback(() => {
    pending.current = null;
    setAsking(false);
  }, []);

  return { ask, sheet: { open: asking, onContinue, onNotNow } };
}
