// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AI_PROVIDER_NAME, hasAiConsent, useAiConsentGate } from "@/lib/ai-consent";
import { AiConsentSheet } from "./AiConsentSheet";

beforeEach(() => {
  window.localStorage.clear();
  window.matchMedia ??= (() => ({
    matches: false,
    addEventListener: () => undefined,
    removeEventListener: () => undefined,
    addListener: () => undefined,
    removeListener: () => undefined,
  })) as unknown as typeof window.matchMedia;
});
afterEach(cleanup);

/** A feature that sends text to the AI, gated the way every real one is. */
function Feature({ onSend }: { onSend: () => void }) {
  const consent = useAiConsentGate();
  return (
    <>
      <button type="button" onClick={() => consent.ask(onSend)}>
        Send it
      </button>
      <AiConsentSheet {...consent.sheet} />
    </>
  );
}

describe("AiConsentSheet", () => {
  it("says what is sent, to whom, that replies can be wrong, and links the privacy policy", async () => {
    render(<AiConsentSheet open onContinue={() => undefined} onNotNow={() => undefined} />);
    const sheet = await screen.findByRole("dialog");
    const text = sheet.textContent ?? "";
    expect(text).toMatch(/only what you type or paste here/i);
    expect(text).toContain(AI_PROVIDER_NAME);
    expect(text).toMatch(/written by an AI\. They can be wrong/);
    const policy = screen.getByRole("link", { name: /privacy policy/i });
    expect(policy.getAttribute("href")).toMatch(/\/legal\/privacy$/);
    expect(screen.getByRole("button", { name: "Continue" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Not now" })).toBeTruthy();
  });

  it("sends nothing until they continue, then does what they asked", async () => {
    const onSend = vi.fn();
    render(<Feature onSend={onSend} />);
    fireEvent.click(screen.getByRole("button", { name: "Send it" }));
    await screen.findByRole("dialog");
    expect(onSend).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Continue" }));
    expect(onSend).toHaveBeenCalledTimes(1);
    expect(hasAiConsent()).toBe(true);
  });

  it("does nothing on Not now, and asks again next time", async () => {
    const onSend = vi.fn();
    render(<Feature onSend={onSend} />);
    fireEvent.click(screen.getByRole("button", { name: "Send it" }));
    fireEvent.click(await screen.findByRole("button", { name: "Not now" }));
    expect(onSend).not.toHaveBeenCalled();
    expect(hasAiConsent()).toBe(false);

    fireEvent.click(screen.getByRole("button", { name: "Send it" }));
    expect(await screen.findByRole("dialog")).toBeTruthy();
    expect(onSend).not.toHaveBeenCalled();
  });

  it("asks once: after agreeing, a send goes straight through", async () => {
    const onSend = vi.fn();
    render(<Feature onSend={onSend} />);
    fireEvent.click(screen.getByRole("button", { name: "Send it" }));
    fireEvent.click(await screen.findByRole("button", { name: "Continue" }));
    fireEvent.click(screen.getByRole("button", { name: "Send it" }));
    expect(onSend).toHaveBeenCalledTimes(2);
  });
});
