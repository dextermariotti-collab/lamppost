// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  AI_PROVIDER_NAME,
  hasAiConsent,
  readAiConsent,
  recordAiConsent,
  useAiConsent,
  useAiConsentGate,
} from "./ai-consent";

const KEY = "lamppost-ai-consent-v1";

beforeEach(() => window.localStorage.clear());
afterEach(() => vi.restoreAllMocks());

describe("the AI consent store", () => {
  it("starts with no agreement", () => {
    expect(readAiConsent()).toBeNull();
    expect(hasAiConsent()).toBe(false);
  });

  it("records whether and when they agreed, and to whom", () => {
    recordAiConsent(new Date("2026-10-20T14:30:00Z"));
    expect(readAiConsent()).toEqual({
      agreedAt: "2026-10-20T14:30:00.000Z",
      provider: AI_PROVIDER_NAME,
    });
    expect(hasAiConsent()).toBe(true);
    expect(JSON.parse(window.localStorage.getItem(KEY)!).provider).toBe(AI_PROVIDER_NAME);
  });

  it("asks again when the provider it named is no longer the one in use", () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ agreedAt: "2026-01-01T00:00:00.000Z", provider: "Another AI" }),
    );
    expect(readAiConsent()?.provider).toBe("Another AI");
    expect(hasAiConsent()).toBe(false);
  });

  it("treats a damaged save as no agreement", () => {
    window.localStorage.setItem(KEY, "{not json");
    expect(hasAiConsent()).toBe(false);
    window.localStorage.setItem(KEY, JSON.stringify({ agreedAt: 5 }));
    expect(hasAiConsent()).toBe(false);
    window.localStorage.setItem(KEY, "null");
    expect(hasAiConsent()).toBe(false);
  });

  it("survives storage that throws, remembering the answer for this visit", async () => {
    // A fresh copy, so the answer held for "this visit" doesn't leak into the other tests.
    vi.resetModules();
    const fresh = await import("./ai-consent");
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(fresh.hasAiConsent()).toBe(false);
    expect(() => fresh.recordAiConsent()).not.toThrow();
    expect(fresh.hasAiConsent()).toBe(true);
  });

  it("is a store that screens re-render from", () => {
    const { result } = renderHook(() => useAiConsent());
    expect(result.current).toBe(false);
    act(() => recordAiConsent());
    expect(result.current).toBe(true);
  });
});

describe("the AI consent gate", () => {
  it("holds the action until they continue, then records the agreement and runs it", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useAiConsentGate());
    act(() => result.current.ask(action));
    expect(action).not.toHaveBeenCalled();
    expect(result.current.sheet.open).toBe(true);

    act(() => result.current.sheet.onContinue());
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.sheet.open).toBe(false);
    expect(hasAiConsent()).toBe(true);
  });

  it("does nothing on Not now", () => {
    const action = vi.fn();
    const { result } = renderHook(() => useAiConsentGate());
    act(() => result.current.ask(action));
    act(() => result.current.sheet.onNotNow());
    expect(action).not.toHaveBeenCalled();
    expect(result.current.sheet.open).toBe(false);
    expect(hasAiConsent()).toBe(false);

    // A later Continue doesn't run the action they turned down.
    act(() => result.current.sheet.onContinue());
    expect(action).not.toHaveBeenCalled();
  });

  it("asks only once: after agreeing, the action runs straight away", () => {
    recordAiConsent();
    const action = vi.fn();
    const { result } = renderHook(() => useAiConsentGate());
    act(() => result.current.ask(action));
    expect(action).toHaveBeenCalledTimes(1);
    expect(result.current.sheet.open).toBe(false);
  });
});
