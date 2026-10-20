// @vitest-environment jsdom
import { act, cleanup, render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { DEFAULT_STATE } from "@/lib/progress-core";
import { StreakCalendar } from "./StreakCalendar";

const cellFor = (container: HTMLElement, day: string) =>
  [...container.querySelectorAll("[title]")].find((cell) =>
    cell.getAttribute("title")?.startsWith(`${day}:`),
  )!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date(2026, 9, 17, 12));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("StreakCalendar", () => {
  it("counts lessons as lessons and calls a day of reviews or a case practice", () => {
    const state = {
      ...DEFAULT_STATE,
      history: { "2026-10-15": 3, "2026-10-16": 4, "2026-10-17": 1 },
      lessonsByDay: { "2026-10-16": 2 },
    };
    const { container } = render(<StreakCalendar state={state} />);
    expect(cellFor(container, "2026-10-15").getAttribute("title")).toBe("2026-10-15: practiced");
    expect(cellFor(container, "2026-10-16").getAttribute("title")).toBe("2026-10-16: 2 lessons");
    expect(cellFor(container, "2026-10-17").getAttribute("title")).toBe("2026-10-17: practiced");
    expect(cellFor(container, "2026-10-14").getAttribute("title")).toBe("2026-10-14: no practice");
  });

  it("marks every day practiced, a lesson or not, for the streak", () => {
    const state = { ...DEFAULT_STATE, history: { "2026-10-15": 1 }, lessonsByDay: {} };
    const { container } = render(<StreakCalendar state={state} />);
    expect(cellFor(container, "2026-10-15").className).toContain("bg-primary");
    expect(cellFor(container, "2026-10-14").className).not.toContain("bg-primary");
  });

  it("moves today's ring at local midnight without a reload", () => {
    vi.setSystemTime(new Date(2026, 9, 17, 23, 59));
    const { container } = render(<StreakCalendar state={DEFAULT_STATE} />);
    expect(cellFor(container, "2026-10-17").className).toContain("ring-2");
    act(() => {
      vi.advanceTimersByTime(2 * 60_000);
    });
    expect(cellFor(container, "2026-10-18").className).toContain("ring-2");
    expect(cellFor(container, "2026-10-17").className).not.toContain("ring-2");
  });
});
