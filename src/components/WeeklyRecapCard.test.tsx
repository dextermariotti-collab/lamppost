// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { RECAP_DISMISSED_KEY } from "@/lib/recap";
import { stubProgress } from "@/test/progress";

const h = vi.hoisted(() => ({ progress: null as unknown, day: "2026-10-05" }));

vi.mock("@/lib/progress", () => ({
  useProgress: () => h.progress,
  dayKey: () => h.day,
}));
vi.mock("@tanstack/react-router", () => ({
  Link: ({ to, children, ...rest }: { to: string; children?: ReactNode }) => (
    <a href={to} {...rest}>
      {children}
    </a>
  ),
}));

import { WeeklyRecapCard } from "./WeeklyRecapCard";

const setProgress = (progress: ReturnType<typeof stubProgress>) => {
  h.progress = progress;
  return progress;
};

beforeEach(() => {
  window.localStorage.clear();
});
afterEach(cleanup);

describe("WeeklyRecapCard", () => {
  // Monday 5 Oct 2026: last week is the one starting Monday 28 Sep.
  const lastWeek = { "2026-09-28": 2, "2026-09-30": 3, "2026-10-02": 1 };

  it("shows last week on a Monday, with only true, countable facts", () => {
    h.day = "2026-10-05";
    setProgress(stubProgress({ history: lastWeek, weeklyXp: { "2026-09-28": 480 } }));
    render(<WeeklyRecapCard />);
    expect(screen.getByRole("heading", { name: "Your week" })).toBeTruthy();
    expect(screen.getByText(/finished 6 things across 3 days/i)).toBeTruthy();
    expect(screen.getByText("480 XP earned")).toBeTruthy();
    expect(screen.getByText(/busiest day: wednesday, 3/i)).toBeTruthy();
    expect(document.body.textContent).not.toMatch(/streak|don't|miss|lose|keep it up/i);
  });

  it("shows nothing on any other day", () => {
    h.day = "2026-10-06";
    setProgress(stubProgress({ history: lastWeek }));
    const { container } = render(<WeeklyRecapCard />);
    expect(container.textContent).toBe("");
  });

  it("shows nothing when last week was empty, and before the device has loaded", () => {
    h.day = "2026-10-05";
    setProgress(stubProgress({ history: { "2026-10-05": 2 } }));
    const { container, rerender } = render(<WeeklyRecapCard />);
    expect(container.textContent).toBe("");

    setProgress(stubProgress({ history: lastWeek }, false));
    rerender(<WeeklyRecapCard />);
    expect(container.textContent).toBe("");
  });

  it("can be put away for the week, and comes back for the next one", () => {
    h.day = "2026-10-05";
    setProgress(stubProgress({ history: lastWeek }));
    const { container } = render(<WeeklyRecapCard />);
    const close = screen.getByRole("button", { name: /put this away/i });
    expect(close.className).toMatch(/\bh-11\b/);
    fireEvent.click(close);
    expect(container.textContent).toBe("");
    expect(window.localStorage.getItem(RECAP_DISMISSED_KEY)).toBe("2026-09-28");

    // Remembered after a reload.
    cleanup();
    const again = render(<WeeklyRecapCard />);
    expect(again.container.textContent).toBe("");

    // A week later, it is a different week.
    h.day = "2026-10-12";
    setProgress(stubProgress({ history: { "2026-10-06": 1 } }));
    again.rerender(<WeeklyRecapCard />);
    expect(again.container.textContent).toMatch(/finished 1 thing across 1 day\./i);
  });
});
