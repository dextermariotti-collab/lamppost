// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { BadgeState } from "@/lib/badges";
import type { UnitLevel } from "@/lib/levels";

const h = vi.hoisted(() => ({
  badges: [] as unknown[],
  levels: [] as unknown[],
  current: [] as unknown[],
}));
vi.mock("@/lib/progress", () => ({ useProgress: () => ({ state: {}, hydrated: true }) }));
vi.mock("@/lib/feedback", () => ({ playCue: vi.fn() }));
vi.mock("@/lib/badges", () => ({
  computeBadges: () => [],
  drainNewUnlocks: () => h.badges.splice(0),
}));
vi.mock("@/lib/levels", () => ({
  unitLevels: () => h.current,
  drainLevelUps: () => h.levels.splice(0),
}));

import { RewardHost } from "./RewardHost";
import { holdRewards } from "@/lib/reward-hold";

const badge = (tier: BadgeState["tier"]) =>
  ({
    code: "streak",
    name: "Steady",
    description: "Keep a streak going",
    icon: "flame",
    tier,
    value: 3,
    nextAt: 7,
    pct: 40,
  }) as unknown as BadgeState;

const level: UnitLevel = {
  unitId: "claims",
  title: "Claims",
  emoji: "",
  level: { name: "Proficient", min: 70, minAnswered: 8 },
  rank: 1,
  accuracy: 80,
  answered: 10,
  next: null,
};

/** Lets the queued microtask that fills the queue run. */
const flush = () => act(async () => {});

beforeEach(() => {
  h.badges = [];
  h.levels = [];
  h.current = [];
});
afterEach(cleanup);

describe("RewardHost", () => {
  it("says a badge was earned in plain words, not in the league's tier words", async () => {
    for (const tier of ["bronze", "silver", "gold"] as const) {
      h.badges = [badge(tier)];
      render(<RewardHost />);
      await flush();
      const toast = screen.getByRole("status");
      expect(toast.textContent).toContain("Badge earned");
      expect(toast.textContent).toContain("Steady");
      expect(toast.textContent).not.toMatch(/bronze|silver|gold|unlocked/i);
      cleanup();
    }
  });

  it("waits while a flow holds rewards, then shows what was earned", async () => {
    const release = holdRewards();
    h.badges = [badge("bronze")];
    render(<RewardHost />);
    await flush();
    expect(screen.queryByRole("status")).toBeNull();
    act(release);
    expect(screen.getByRole("status").textContent).toContain("Steady");
  });

  it("shows a level-up as a labeled modal dialog with focus on Keep going", async () => {
    h.levels = [level];
    render(<RewardHost />);
    await flush();
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    const title = document.getElementById(dialog.getAttribute("aria-labelledby")!);
    expect(title?.textContent).toBe("Claims");
    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Keep going" }));
  });

  it("gives the unit's numbers as they are when it opens, not when the level was reached", async () => {
    // Reached at 80% over 10 answers mid-lesson, shown at the end after 13 answers at 85%.
    h.levels = [level];
    h.current = [{ ...level, accuracy: 85, answered: 13 }];
    render(<RewardHost />);
    await flush();
    const text = screen.getByRole("dialog").textContent ?? "";
    expect(text).toContain("85% of this unit's drills right across 13 answers");
    expect(text).not.toContain("80%");
  });

  it("closes on Escape and gives focus back to where it was", async () => {
    const before = document.createElement("button");
    before.textContent = "Where I was";
    document.body.appendChild(before);
    before.focus();

    h.levels = [level];
    render(<RewardHost />);
    await flush();
    expect(document.activeElement).not.toBe(before);
    fireEvent.keyDown(document.activeElement!, { key: "Escape" });
    await flush();
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(before);
    before.remove();
  });
});
