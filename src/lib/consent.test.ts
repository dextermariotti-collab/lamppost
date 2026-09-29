// @vitest-environment jsdom
import { afterEach, describe, expect, it } from "vitest";
import {
  UNKNOWN_CONSENT,
  claimFor,
  clearPendingConsent,
  consentIsCurrent,
  needsConsent,
  readPendingConsent,
  stashPendingConsent,
  type ConsentState,
} from "./consent";
import { PRIVACY_VERSION, TERMS_VERSION } from "./legal-config";

const accepted = (over: Partial<ConsentState> = {}): ConsentState => ({
  known: true,
  termsVersion: TERMS_VERSION,
  privacyVersion: PRIVACY_VERSION,
  acceptedAt: "2026-09-30T10:00:00Z",
  ageBand: "18+",
  ...over,
});

afterEach(() => window.localStorage.clear());

describe("who has to see the consent screen", () => {
  it("nobody, when the current text is accepted and an age band is on file", () => {
    expect(consentIsCurrent(accepted())).toBe(true);
    expect(needsConsent(accepted())).toBe(false);
  });

  it("an account that has never accepted anything", () => {
    const fresh = accepted({
      termsVersion: null,
      privacyVersion: null,
      acceptedAt: null,
      ageBand: null,
    });
    expect(needsConsent(fresh)).toBe(true);
  });

  it("an account that accepted an older version of either document", () => {
    expect(needsConsent(accepted({ termsVersion: "2020-01-01" }))).toBe(true);
    expect(needsConsent(accepted({ privacyVersion: "2020-01-01" }))).toBe(true);
  });

  it("an account with no age band, even if the versions match", () => {
    expect(needsConsent(accepted({ ageBand: null }))).toBe(true);
  });

  it("nobody, when the database has no consent columns yet, so an unmigrated database never locks anyone out", () => {
    expect(needsConsent(UNKNOWN_CONSENT)).toBe(false);
  });
});

describe("the claim built from what is on screen", () => {
  it("carries the current versions", () => {
    expect(claimFor("18+", false)).toEqual({
      termsVersion: TERMS_VERSION,
      privacyVersion: PRIVACY_VERSION,
      ageBand: "18+",
      guardianConfirmed: false,
    });
  });

  it("only keeps a guardian confirmation for the 13-17 band", () => {
    expect(claimFor("13-17", true).guardianConfirmed).toBe(true);
    expect(claimFor("18+", true).guardianConfirmed).toBe(false);
  });
});

describe("the hand-off across a redirect or an email confirmation", () => {
  it("returns what was stashed, without a date of birth in it", () => {
    stashPendingConsent(claimFor("13-17", true));
    const raw = window.localStorage.getItem("lamppost-pending-consent")!;
    expect(Object.keys(JSON.parse(raw)).sort()).toEqual([
      "ageBand",
      "at",
      "guardianConfirmed",
      "privacyVersion",
      "termsVersion",
    ]);
    expect(readPendingConsent()).toEqual(claimFor("13-17", true));
  });

  it("forgets it after a week", () => {
    stashPendingConsent(claimFor("18+", false), 1_000);
    expect(readPendingConsent(1_000 + 6 * 24 * 3600 * 1000)).not.toBeNull();
    expect(readPendingConsent(1_000 + 8 * 24 * 3600 * 1000)).toBeNull();
  });

  it("can be cleared, and reads as nothing when empty or damaged", () => {
    stashPendingConsent(claimFor("18+", false));
    clearPendingConsent();
    expect(readPendingConsent()).toBeNull();
    window.localStorage.setItem("lamppost-pending-consent", "{not json");
    expect(readPendingConsent()).toBeNull();
    window.localStorage.setItem(
      "lamppost-pending-consent",
      JSON.stringify({ at: Date.now(), ageBand: "12", termsVersion: "x", privacyVersion: "y" }),
    );
    expect(readPendingConsent()).toBeNull();
  });
});
