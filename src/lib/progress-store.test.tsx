// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("./companion-store", () => ({ useSessionUser: () => ({ userId: null, ready: true }) }));
vi.mock("./profile.functions", () => ({
  getMyProfile: vi.fn(),
  syncProgress: vi.fn(),
}));

const KEY = "lamppost-progress-v1";

async function loadStore() {
  vi.resetModules();
  return await import("./progress");
}

/**
 * The store is the one place every screen reads XP, gems, lessons and the
 * streak from, signed in or not.
 */
describe("useProgress (signed out)", () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  it("reads the numbers saved in lamppost-progress-v1", async () => {
    const { dayKey, useProgress } = await loadStore();
    const today = dayKey();
    window.localStorage.setItem(
      KEY,
      JSON.stringify({
        streak: 1,
        longestStreak: 1,
        xp: 379,
        gems: 40,
        lastActiveDay: today,
        history: { [today]: 2 },
        dailyGoal: 2,
        courses: { "critical-thinking": { topic: "Critical thinking", completed: 3, total: 35 } },
      }),
    );
    const { result } = renderHook(() => useProgress());
    expect(result.current.hydrated).toBe(true);
    expect(result.current.state.xp).toBe(379);
    expect(result.current.state.gems).toBe(40);
    expect(result.current.state.streak).toBe(1);
    expect(result.current.state.dailyGoal).toBe(2);
    expect(result.current.state.history[today]).toBe(2);
    expect(result.current.state.courses["critical-thinking"]?.completed).toBe(3);
  });

  it("gives every mounted screen the same numbers after a lesson is completed", async () => {
    const { useProgress } = await loadStore();
    const home = renderHook(() => useProgress());
    const progress = renderHook(() => useProgress());
    act(() => {
      home.result.current.completeLesson("critical-thinking", "Critical thinking", 0, 35);
    });
    expect(progress.result.current.state.streak).toBe(1);
    expect(progress.result.current.state.xp).toBe(home.result.current.state.xp);
    expect(progress.result.current.state.courses["critical-thinking"]?.completed).toBe(1);
    expect(JSON.parse(window.localStorage.getItem(KEY) ?? "{}").streak).toBe(1);
  });
});
