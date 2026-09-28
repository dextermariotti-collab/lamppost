// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CountUp } from "./CountUp";

/**
 * Regression: /progress showed "0 Lessons / 0 Total XP / 0 Gems / 0 day streak"
 * while Home showed the real numbers. The numbers were animated up from the
 * placeholder 0 with requestAnimationFrame, and whenever frames don't run
 * (background or offscreen tab, embedded preview) the zeros never went away.
 */
describe("CountUp", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    // A page whose animation frames never fire.
    vi.stubGlobal("requestAnimationFrame", () => 0);
    vi.stubGlobal("cancelAnimationFrame", () => undefined);
  });

  afterEach(() => {
    cleanup();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it("shows the real value on first paint, with no animation from zero", () => {
    const { container } = render(<CountUp value={379} />);
    expect(container.textContent).toBe("379");
  });

  it("still reaches the new value when animation frames never run", () => {
    const { container, rerender } = render(<CountUp value={379} duration={1000} />);
    rerender(<CountUp value={429} duration={1000} />);
    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(container.textContent).toBe("429");
  });

  it("does not animate at all when the learner prefers reduced motion", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("prefers-reduced-motion"),
      addEventListener: () => undefined,
      removeEventListener: () => undefined,
    }));
    const { container, rerender } = render(<CountUp value={10} />);
    rerender(<CountUp value={60} />);
    expect(container.textContent).toBe("60");
  });

  it("formats with the caller's formatter", () => {
    const { container } = render(<CountUp value={12} format={(n) => `${n}%`} />);
    expect(container.textContent).toBe("12%");
  });
});
