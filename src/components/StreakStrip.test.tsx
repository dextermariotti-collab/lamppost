// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { weekStrip } from "@/lib/progress-view";
import { StreakStrip } from "./StreakStrip";

const text = (container: HTMLElement) => container.textContent?.replace(/\s+/g, " ") ?? "";
const days = weekStrip(
  { history: { "2026-09-29": 1, "2026-09-30": 1 }, freezeLog: ["2026-09-28"] },
  "2026-09-30",
);

/** Frames are disabled to mimic the browsers where the old count-up left zeros on screen. */
beforeEach(() => {
  vi.stubGlobal("requestAnimationFrame", () => 0);
  vi.stubGlobal("cancelAnimationFrame", () => undefined);
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const mount = (props: Partial<Parameters<typeof StreakStrip>[0]> = {}) => {
  const onOpen = vi.fn();
  const view = render(
    <StreakStrip
      hydrated
      streak={12}
      longestStreak={19}
      atRisk={false}
      days={days}
      onOpen={onOpen}
      {...props}
    />,
  );
  return { ...view, onOpen };
};

describe("Streak strip", () => {
  it("prints the streak the store holds on the first paint, not a count up from zero", () => {
    const { container } = mount();
    expect(text(container)).toContain("12 day streak");
    expect(text(container)).toContain("Longest 19");
  });

  it("shows a dash, never a zero, until the real numbers have loaded", () => {
    const { container } = mount({ hydrated: false, streak: 0, longestStreak: 0 });
    expect(text(container)).toContain("– day streak");
    expect(text(container)).not.toMatch(/\b0\b/);
  });

  it("is one button that opens the calendar, and says so", () => {
    const { onOpen } = mount();
    const button = screen.getByRole("button", { name: /12 day streak.*Longest 19 days/ });
    expect(button.getAttribute("aria-haspopup")).toBe("dialog");
    fireEvent.click(button);
    expect(onOpen).toHaveBeenCalledTimes(1);
  });

  it("draws the last seven days with weekday letters", () => {
    const { container } = mount();
    expect(text(container)).toContain("TFSSMTW");
    expect(container.querySelectorAll("svg").length).toBeGreaterThanOrEqual(3);
  });

  it("draws empty dots before the browser knows the local day", () => {
    const { container } = mount({ days: [] });
    expect(container.querySelectorAll('[aria-hidden="true"] > span').length).toBe(7);
  });

  it("keeps the flame lit while the streak is alive, even late in a quiet day", () => {
    const { container } = mount({ atRisk: true });
    const flame = container.querySelector("svg.text-flame");
    expect(flame?.getAttribute("fill")).toBe("currentColor");
  });

  it("is drawn as a sign, not a rounded card", () => {
    const button = mount().container.querySelector("button")!;
    expect(button.className).toMatch(/\bsign\b/);
    expect(button.className).not.toMatch(/rounded-(2xl|3xl)|shadow-soft/);
  });

  it("nudges gently when the streak is at risk, with no countdown", () => {
    const { container } = mount({ atRisk: true });
    expect(text(container)).toContain("A lesson today keeps the streak going.");
    expect(text(container)).not.toMatch(/\d+\s*h\b|left|hours/i);
  });
});
