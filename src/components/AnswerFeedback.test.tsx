// @vitest-environment jsdom
import { act, cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const h = vi.hoisted(() => ({ playCue: vi.fn() }));
vi.mock("@/lib/feedback", () => ({ playCue: h.playCue }));

import { AnswerFeedbackHost, celebrateAnswer, clearAnswerFeedback } from "./AnswerFeedback";
import { rewardsHeld } from "@/lib/reward-hold";

const banner = () => screen.queryByTestId("answer-banner");
const banners = () => screen.queryAllByTestId("answer-banner");
const live = () => screen.getByRole("status");

beforeEach(() => vi.useFakeTimers());
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  document.body.innerHTML = "";
});

describe("the answer banner", () => {
  it("makes no sound of its own; the screen that judged the answer plays the cue", () => {
    render(<AnswerFeedbackHost />);
    act(() => celebrateAnswer({ correct: true, xp: 20 }));
    expect(h.playCue).not.toHaveBeenCalled();
  });

  it("keeps one live region mounted and changes its text, so each verdict is announced", () => {
    render(<AnswerFeedbackHost />);
    const region = live();
    expect(region.getAttribute("aria-live")).toBe("polite");
    expect(region.textContent).toBe("");

    act(() => celebrateAnswer({ correct: true, xp: 10, bonus: 5 }));
    expect(live()).toBe(region);
    expect(region.textContent).toBe("Correct. +15 XP.");

    act(() => vi.advanceTimersByTime(2000));
    expect(region.textContent).toBe("");
    act(() => celebrateAnswer({ correct: false, xp: 5 }));
    expect(region.textContent).toBe("Not this time. +5 XP.");
  });

  it("is an opaque sign with a right or wrong rule and square corners, never see-through", () => {
    render(<AnswerFeedbackHost />);
    act(() => celebrateAnswer({ correct: true, xp: 20 }));
    const right = banner()!.firstElementChild!;
    expect(right.className).toMatch(/\bsign\b/);
    expect(right.className).toMatch(/answer-banner-right/);
    expect(right.className).not.toMatch(/bg-success\/|rounded-3xl|shadow-card/);
    expect(banner()!.textContent).toContain("+20 XP");

    act(() => celebrateAnswer({ correct: false, xp: 5 }));
    const wrong = banner()!.firstElementChild!;
    expect(wrong.className).toMatch(/answer-banner-wrong/);
    expect(wrong.className).not.toMatch(/bg-destructive\//);
  });

  it("lines up with the phone frame's content column, not the window", () => {
    const scroller = document.createElement("div");
    const main = document.createElement("main");
    main.id = "main-content";
    scroller.appendChild(main);
    document.body.appendChild(scroller);
    scroller.getBoundingClientRect = () => ({ top: 26, left: 300, width: 416 }) as DOMRect;
    main.getBoundingClientRect = () => ({ top: 26, left: 302, width: 416 }) as DOMRect;

    render(<AnswerFeedbackHost />);
    act(() => celebrateAnswer({ correct: true, xp: 20 }));
    const style = banner()!.style;
    expect([style.top, style.left, style.width]).toEqual(["26px", "302px", "416px"]);
    expect(banner()!.className).not.toMatch(/inset-x-0/);
  });

  it("falls back to a frame-wide strip below the status bar when there is nothing to measure", () => {
    render(<AnswerFeedbackHost />);
    act(() => celebrateAnswer({ correct: true, xp: 20 }));
    expect(banner()!.className).toMatch(/max-w-\[420px\]/);
    expect(banner()!.className).toMatch(/--inset-top/);
  });

  it("holds badges and level-ups while it shows, so they never land on it", () => {
    render(<AnswerFeedbackHost />);
    expect(rewardsHeld()).toBe(false);
    act(() => celebrateAnswer({ correct: true, xp: 20 }));
    expect(rewardsHeld()).toBe(true);
    act(() => vi.advanceTimersByTime(2000));
    expect(banner()).toBeNull();
    expect(rewardsHeld()).toBe(false);
  });

  it("shows only the newest verdict, which gets its own full time", () => {
    render(<AnswerFeedbackHost />);
    act(() => celebrateAnswer({ correct: true, xp: 25, combo: 5, bonus: 15 }));
    act(() => vi.advanceTimersByTime(1000));
    act(() => celebrateAnswer({ correct: false, xp: 5 }));

    expect(banners()).toHaveLength(1);
    expect(banner()!.textContent).toContain("Not this time.");
    expect(banner()!.textContent).not.toMatch(/Correct|in a row|\+40 XP/);
    expect(live().textContent).toBe("Not this time. +5 XP.");

    act(() => vi.advanceTimersByTime(1500));
    expect(banner()).not.toBeNull();
    expect(rewardsHeld()).toBe(true);
    act(() => vi.advanceTimersByTime(500));
    expect(banner()).toBeNull();
    expect(rewardsHeld()).toBe(false);
  });

  it("comes down at once when cleared, letting badges through and keeping the live region", () => {
    render(<AnswerFeedbackHost />);
    const region = live();
    act(() => celebrateAnswer({ correct: true, xp: 25, combo: 5, bonus: 15 }));
    expect(rewardsHeld()).toBe(true);

    act(() => clearAnswerFeedback());
    expect(banner()).toBeNull();
    expect(rewardsHeld()).toBe(false);
    expect(live()).toBe(region);
    expect(region.textContent).toBe("");

    act(() => clearAnswerFeedback());
    expect(rewardsHeld()).toBe(false);
    act(() => celebrateAnswer({ correct: false, xp: 5 }));
    expect(banner()!.textContent).toContain("Not this time.");
    expect(region.textContent).toBe("Not this time. +5 XP.");
  });
});
