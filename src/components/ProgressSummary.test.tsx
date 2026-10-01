// @vitest-environment jsdom
import { cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { StatTiles, TodaySession } from "./ProgressSummary";

const text = (container: HTMLElement) => container.textContent?.replace(/\s+/g, " ") ?? "";

/**
 * Regression for the "Progress shows 0 / 0 / 0 while Home shows the real
 * numbers" bug. Frames are disabled to mimic the browsers where it appeared.
 */
describe("Progress summary blocks", () => {
  beforeEach(() => {
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("prints the learner's real numbers on the first paint", () => {
    const { container } = render(<StatTiles hydrated lessons={3} xp={379} longestStreak={40} />);
    expect(text(container)).toContain("3Lessons");
    expect(text(container)).toContain("379Total XP");
    expect(text(container)).toContain("40Longest streak");
  });

  it("does not print placeholder zeros before the real numbers have loaded", () => {
    const { container } = render(
      <StatTiles hydrated={false} lessons={0} xp={0} longestStreak={0} />,
    );
    expect(text(container)).not.toMatch(/\b0\b/);
    expect(text(container)).toContain("–Total XP");
  });

  it("goes from loading to the real numbers without ever showing zero", () => {
    const { container, rerender } = render(
      <StatTiles hydrated={false} lessons={0} xp={0} longestStreak={0} />,
    );
    rerender(<StatTiles hydrated lessons={3} xp={379} longestStreak={40} />);
    expect(text(container)).toContain("379Total XP");
    expect(text(container)).not.toMatch(/\b0\b/);
  });

  it("never claims the goal is cleared while the ring says 0", () => {
    const { container } = render(
      <TodaySession hydrated doneToday={2} dailyGoal={2} dueTotal={0} />,
    );
    expect(text(container)).toContain("2/2");
    expect(text(container)).toContain("Session complete");
    expect(text(container)).toContain("Daily goal cleared");
    expect(text(container)).not.toContain("0/2");
  });

  it("counts down the remaining lessons when the goal is not yet met", () => {
    const { container } = render(
      <TodaySession hydrated doneToday={1} dailyGoal={3} dueTotal={2} />,
    );
    expect(text(container)).toContain("1/3");
    expect(text(container)).toContain("2 more lessons to close today out");
    expect(text(container)).toContain("2 drills due for review");
    expect(text(container)).not.toContain("Daily goal cleared");
  });
});
