// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { userId: null as string | null, ready: true },
  getMyProfile: vi.fn(),
  syncProgress: vi.fn(),
}));

vi.mock("./companion-store", () => ({ useSessionUser: () => mocks.session }));
vi.mock("./profile.functions", () => ({
  getMyProfile: mocks.getMyProfile,
  syncProgress: mocks.syncProgress,
}));

const KEY = "lamppost-progress-v1";

// Hooks mounted by one test must not keep syncing (and counting calls) in the next.
afterEach(cleanup);

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
    mocks.session.userId = null;
    mocks.getMyProfile.mockReset();
    mocks.syncProgress.mockReset();
    mocks.syncProgress.mockResolvedValue({ ok: true });
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

const seed = (patch: Record<string, unknown>) =>
  window.localStorage.setItem(
    KEY,
    JSON.stringify({ xp: 0, gems: 0, longestStreak: 0, dailyGoal: 3, history: {}, ...patch }),
  );

/**
 * Regression: the lesson-complete screen showed a 1-day streak while Home and
 * Progress showed 2 in the same session. Every screen must show the same streak.
 */
describe("one streak on every screen", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.session.userId = null;
    mocks.getMyProfile.mockReset();
    mocks.syncProgress.mockReset();
    mocks.syncProgress.mockResolvedValue({ ok: true });
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date(2026, 8, 24, 12, 0));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("shows the same streak on the lesson-complete, Home and Progress screens", async () => {
    seed({ streak: 1, lastActiveDay: "2026-09-23", freezes: 1 });
    const { useProgress } = await loadStore();
    const lesson = renderHook(() => useProgress());
    act(() =>
      lesson.result.current.completeLesson("critical-thinking", "Critical thinking", 0, 35),
    );
    const home = renderHook(() => useProgress());
    const progress = renderHook(() => useProgress());
    expect(lesson.result.current.streak).toBe(2);
    expect(home.result.current.streak).toBe(2);
    expect(progress.result.current.streak).toBe(2);
  });

  it("does not keep showing a streak that a missed day has already ended", async () => {
    seed({ streak: 5, lastActiveDay: "2026-09-20", freezes: 0 });
    const { useProgress } = await loadStore();
    const home = renderHook(() => useProgress());
    const profile = renderHook(() => useProgress());
    expect(home.result.current.streak).toBe(0);
    expect(profile.result.current.streak).toBe(0);
    // ...and the next lesson starts a fresh one, which the lesson screen then also shows.
    act(() => home.result.current.completeLesson("critical-thinking", "Critical thinking", 0, 35));
    expect(home.result.current.streak).toBe(1);
    expect(profile.result.current.streak).toBe(1);
  });

  it("does not let an older account streak change the number mid-session", async () => {
    mocks.session.userId = "user-1";
    mocks.getMyProfile.mockResolvedValue({
      totalXp: 0,
      gems: 0,
      currentStreak: 9,
      longestStreak: 9,
      lastActiveDay: "2026-09-10",
    });
    seed({ streak: 1, lastActiveDay: "2026-09-24", freezes: 1 });
    const { useProgress } = await loadStore();
    const lesson = renderHook(() => useProgress());
    const home = renderHook(() => useProgress());
    await waitFor(() => expect(mocks.getMyProfile).toHaveBeenCalled());
    await act(async () => {
      await Promise.resolve();
    });
    expect(lesson.result.current.streak).toBe(1);
    expect(home.result.current.streak).toBe(1);
  });

  it("pulls the account once, however many screens mount the hook", async () => {
    mocks.session.userId = "user-1";
    mocks.getMyProfile.mockResolvedValue(null);
    seed({ streak: 1, lastActiveDay: "2026-09-24" });
    const { useProgress } = await loadStore();
    renderHook(() => useProgress());
    renderHook(() => useProgress());
    renderHook(() => useProgress());
    await waitFor(() => expect(mocks.getMyProfile).toHaveBeenCalled());
    expect(mocks.getMyProfile).toHaveBeenCalledTimes(1);
  });

  it("gives a new device the account's current streak", async () => {
    mocks.session.userId = "user-1";
    mocks.getMyProfile.mockResolvedValue({
      totalXp: 500,
      gems: 30,
      currentStreak: 5,
      longestStreak: 9,
      lastActiveDay: "2026-09-23",
    });
    const { useProgress } = await loadStore();
    const home = renderHook(() => useProgress());
    await waitFor(() => expect(home.result.current.streak).toBe(5));
    expect(home.result.current.state.xp).toBe(500);
  });
});

/**
 * Guest mode keeps its progress on the device and must never call the account
 * functions — the database rules make those sign-in only.
 */
describe("guest (signed-out) mode", () => {
  beforeEach(() => {
    window.localStorage.clear();
    mocks.session.userId = null;
    mocks.getMyProfile.mockReset();
    mocks.syncProgress.mockReset();
    mocks.syncProgress.mockResolvedValue({ ok: true });
  });

  it("earns, saves and re-reads progress without any server call", async () => {
    const { useProgress } = await loadStore();
    const first = renderHook(() => useProgress());
    act(() => first.result.current.completeLesson("critical-thinking", "Critical thinking", 0, 35));
    act(() => first.result.current.recordExercise(1, 10));
    act(() => first.result.current.recordReview(true));
    act(() => first.result.current.recordArgument(12, 16));
    act(() => first.result.current.recordPractice("solid", true));
    act(() => first.result.current.setDailyGoal(4));
    expect(first.result.current.state.xp).toBeGreaterThan(0);
    expect(first.result.current.streak).toBe(1);

    // A later visit in a new page load sees the same numbers, from localStorage alone.
    const saved = JSON.parse(window.localStorage.getItem(KEY) ?? "{}");
    expect(saved.xp).toBe(first.result.current.state.xp);
    expect(saved.dailyGoal).toBe(4);
    first.unmount();
    const { useProgress: again } = await loadStore();
    const second = renderHook(() => again());
    expect(second.result.current.state.xp).toBe(saved.xp);
    expect(second.result.current.streak).toBe(1);

    await act(async () => {
      await Promise.resolve();
    });
    expect(mocks.getMyProfile).not.toHaveBeenCalled();
    expect(mocks.syncProgress).not.toHaveBeenCalled();
  });

  it("only starts syncing once someone signs in", async () => {
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    act(() =>
      screen.result.current.completeLesson("critical-thinking", "Critical thinking", 0, 35),
    );
    expect(mocks.syncProgress).not.toHaveBeenCalled();

    mocks.session.userId = "user-1";
    mocks.getMyProfile.mockResolvedValue(null);
    screen.rerender();
    await waitFor(() => expect(mocks.syncProgress).toHaveBeenCalledTimes(1));
    const sent = mocks.syncProgress.mock.calls[0]![0].data;
    // The device sends what it did; the server works out the streak itself.
    expect(Object.keys(sent).sort()).toEqual(
      [
        "carryOver",
        "dayKeyVersion",
        "doneLessons",
        "freezeLog",
        "gemsEarned",
        "history",
        "today",
        "totalXp",
      ].sort(),
    );
    expect(sent.totalXp).toBe(screen.result.current.state.xp);
    // Gems are reported as lifetime earnings; what was spent is the server's to say.
    expect(sent.gemsEarned).toBe(
      screen.result.current.state.gems + screen.result.current.state.gemsSpent,
    );
  });
});

/**
 * Gems, chests, hint tokens and cosmetics are no longer in the app, but the numbers are still
 * counted and synced so an account's record stays consistent (and the feature could return).
 */
describe("syncing a signed-in learner", () => {
  const account = (over: Record<string, unknown> = {}) => ({
    ok: true,
    streak: 0,
    longestStreak: 0,
    totalXp: 0,
    gems: 0,
    gemsSpent: 0,
    gemsGranted: 0,
    lastActiveDay: null,
    ...over,
  });

  beforeEach(() => {
    window.localStorage.clear();
    mocks.session.userId = "user-1";
    mocks.getMyProfile.mockReset();
    mocks.getMyProfile.mockResolvedValue(null);
    mocks.syncProgress.mockReset();
    mocks.syncProgress.mockResolvedValue(account());
  });

  it("adopts gems spent on another device from an ordinary sync", async () => {
    seed({ gems: 100, freezes: 1 });
    mocks.syncProgress.mockResolvedValue(account({ gems: 40, gemsSpent: 60 }));
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    await waitFor(() => expect(screen.result.current.state.gems).toBe(40));
    expect(screen.result.current.state.gemsSpent).toBe(60);
  });

  it("sends what was spent and unlocked before signing in with the first sync", async () => {
    seed({ gems: 40, gemsSpent: 160, hintTokens: 1, cosmetics: ["crown"] });
    const { useProgress } = await loadStore();
    renderHook(() => useProgress());
    await waitFor(() => expect(mocks.syncProgress).toHaveBeenCalled());
    expect(mocks.syncProgress.mock.calls[0]![0].data.carryOver).toEqual({
      gemsSpent: 160,
      hintTokens: 1,
      cosmetics: ["crown"],
    });
  });

  it("offers nothing to buy or open", async () => {
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    for (const gone of ["buyFreeze", "openChest", "buyHint", "unlockCosmetic", "spendHint"]) {
      expect(screen.result.current).not.toHaveProperty(gone);
    }
  });

  it("counts XP earned toward the week it was earned in, but not XP folded in from the account", async () => {
    mocks.getMyProfile.mockResolvedValue({
      totalXp: 900,
      gems: 0,
      gemsEarned: 0,
      gemsGranted: 0,
      gemsSpent: 0,
      currentStreak: 0,
      longestStreak: 0,
      lastActiveDay: null,
    });
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    await waitFor(() => expect(screen.result.current.state.xp).toBe(900));
    expect(screen.result.current.state.weeklyXp).toEqual({});

    act(() =>
      screen.result.current.completeLesson("critical-thinking", "Critical thinking", 0, 35),
    );
    const weeks = Object.values(screen.result.current.state.weeklyXp);
    expect(weeks).toHaveLength(1);
    expect(weeks[0]).toBe(screen.result.current.state.xp - 900);
  });
});
