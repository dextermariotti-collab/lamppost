import type { AgeBand } from "./age-gate";
import { PRIVACY_VERSION, TERMS_VERSION } from "./legal-config";

/**
 * What an account has agreed to, and the small hand-off that lets a signup made
 * before the person has a session (email confirmation, or Google's redirect) still
 * record the consent they gave on the form.
 */

export type ConsentState = {
  /**
   * False when the database has no consent columns yet (the migration hasn't run).
   * Nothing is enforced then, so an unmigrated database never locks anyone out.
   */
  known: boolean;
  termsVersion: string | null;
  privacyVersion: string | null;
  acceptedAt: string | null;
  ageBand: AgeBand | null;
};

export const UNKNOWN_CONSENT: ConsentState = {
  known: false,
  termsVersion: null,
  privacyVersion: null,
  acceptedAt: null,
  ageBand: null,
};

/** True when the account has accepted the current text and told us an age band. */
export const consentIsCurrent = (consent: ConsentState) =>
  consent.termsVersion === TERMS_VERSION &&
  consent.privacyVersion === PRIVACY_VERSION &&
  consent.ageBand !== null;

/** Whether this signed-in account must be shown the consent screen. */
export const needsConsent = (consent: ConsentState) => consent.known && !consentIsCurrent(consent);

export type ConsentClaim = {
  termsVersion: string;
  privacyVersion: string;
  ageBand: AgeBand;
  guardianConfirmed: boolean;
};

/** The claim for what is on screen now, built from the current versions. */
export const claimFor = (ageBand: AgeBand, guardianConfirmed: boolean): ConsentClaim => ({
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
  ageBand,
  guardianConfirmed: ageBand === "13-17" ? guardianConfirmed : false,
});

const PENDING_KEY = "lamppost-pending-consent";
/** A stashed claim is only good for a week; after that the person is asked again. */
const PENDING_TTL_MS = 7 * 24 * 60 * 60 * 1000;

type Pending = ConsentClaim & { at: number };

/** Remembers a claim across the redirect or the email-confirmation round trip. */
export function stashPendingConsent(claim: ConsentClaim, now = Date.now()) {
  try {
    window.localStorage.setItem(
      PENDING_KEY,
      JSON.stringify({ ...claim, at: now } satisfies Pending),
    );
  } catch {
    /* storage unavailable: the consent screen will ask instead */
  }
}

export function readPendingConsent(now = Date.now()): ConsentClaim | null {
  try {
    const raw = window.localStorage.getItem(PENDING_KEY);
    if (!raw) return null;
    const value = JSON.parse(raw) as Partial<Pending>;
    if (typeof value.at !== "number" || now - value.at > PENDING_TTL_MS) return null;
    if (value.ageBand !== "13-17" && value.ageBand !== "18+") return null;
    if (typeof value.termsVersion !== "string" || typeof value.privacyVersion !== "string") {
      return null;
    }
    return {
      termsVersion: value.termsVersion,
      privacyVersion: value.privacyVersion,
      ageBand: value.ageBand,
      guardianConfirmed: value.guardianConfirmed === true,
    };
  } catch {
    return null;
  }
}

export function clearPendingConsent() {
  try {
    window.localStorage.removeItem(PENDING_KEY);
  } catch {
    /* nothing to clear */
  }
}
