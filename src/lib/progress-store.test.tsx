// @vitest-environment jsdom
import { act, cleanup, renderHook, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { userId: null as string | null, ready: true },
  getMyProfile: vi.fn(),
  syncProgress: vi.fn(),
  buyStreakFreeze: vi.fn(),
}));

vi.mock("./companion-store", () => ({ useSessionUser: () => mocks.session }));
vi.mock("./profile.functions", () => ({
  getMyProfile: mocks.getMyProfile,
  syncProgress: mocks.syncProgress,
}));
vi.mock("./wallet.functions", () => ({ buyStreakFreeze: mocks.buyStreakFreeze }));

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
      ["dayKeyVersion", "freezeLog", "gemsEarned", "history", "today", "totalXp"].sort(),
    );
    expect(sent.totalXp).toBe(screen.result.current.state.xp);
    // Gems are reported as lifetime earnings; what was spent is the server's to say.
    expect(sent.gemsEarned).toBe(
      screen.result.current.state.gems + screen.result.current.state.gemsSpent,
    );
  });
});

/**
 * Gems are spent on the server for a signed-in learner and on the device for a
 * guest. A signed-in purchase changes nothing on the device until the server says yes.
 */
describe("buying a streak freeze", () => {
  const account = (over: Record<string, unknown> = {}) => ({
    ok: true,
    streak: 0,
    longestStreak: 0,
    totalXp: 0,
    gems: 100,
    gemsSpent: 0,
    lastActiveDay: null,
    ...over,
  });

  beforeEach(() => {
    window.localStorage.clear();
    mocks.session.userId = null;
    mocks.getMyProfile.mockReset();
    mocks.getMyProfile.mockResolvedValue(null);
    mocks.syncProgress.mockReset();
    mocks.syncProgress.mockResolvedValue(account());
    mocks.buyStreakFreeze.mockReset();
  });

  it("as a guest happens on the device, with no server call", async () => {
    seed({ gems: 100, freezes: 1 });
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    let outcome: unknown;
    await act(async () => {
      outcome = await screen.result.current.buyFreeze();
    });
    expect(outcome).toEqual({ ok: true });
    expect(screen.result.current.state).toMatchObject({ gems: 40, gemsSpent: 60, freezes: 2 });
    expect(mocks.buyStreakFreeze).not.toHaveBeenCalled();
    expect(mocks.syncProgress).not.toHaveBeenCalled();
  });

  it("as a guest still needs the gems and room for another", async () => {
    seed({ gems: 59, freezes: 1 });
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    let outcome: { ok: boolean } | undefined;
    await act(async () => {
      outcome = await screen.result.current.buyFreeze();
    });
    expect(outcome?.ok).toBe(false);
    expect(screen.result.current.state.gems).toBe(59);
  });

  it("when signed in brings the account up to date, then lets the server spend the gems", async () => {
    mocks.session.userId = "user-1";
    seed({ gems: 100, freezes: 1 });
    mocks.buyStreakFreeze.mockResolvedValue({ ok: true, balance: 40, spent: 60 });
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    await waitFor(() => expect(mocks.syncProgress).toHaveBeenCalled());
    mocks.syncProgress.mockClear();

    let outcome: unknown;
    await act(async () => {
      outcome = await screen.result.current.buyFreeze();
    });
    expect(outcome).toEqual({ ok: true });
    // Everything earned so far is sent before anything is spent.
    expect(mocks.syncProgress).toHaveBeenCalledTimes(1);
    expect(mocks.syncProgress.mock.calls[0]![0].data.gemsEarned).toBe(100);
    // Spending doesn't change lifetime earnings, so it doesn't trigger another sync.
    await new Promise((resolve) => setTimeout(resolve, 50));
    expect(mocks.syncProgress).toHaveBeenCalledTimes(1);
    expect(mocks.buyStreakFreeze).toHaveBeenCalledTimes(1);
    expect(screen.result.current.state).toMatchObject({ gems: 40, gemsSpent: 60, freezes: 2 });
  });

  it("when signed in takes nothing and holds nothing until the server has answered", async () => {
    mocks.session.userId = "user-1";
    seed({ gems: 100, freezes: 1 });
    let answer!: (value: unknown) => void;
    mocks.buyStreakFreeze.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    await waitFor(() => expect(mocks.syncProgress).toHaveBeenCalled());

    let pending!: Promise<unknown>;
    act(() => {
      pending = screen.result.current.buyFreeze();
    });
    await waitFor(() => expect(mocks.buyStreakFreeze).toHaveBeenCalled());
    expect(screen.result.current.state).toMatchObject({ gems: 100, freezes: 1 });

    await act(async () => {
      answer({ ok: true, balance: 40, spent: 60 });
      await pending;
    });
    expect(screen.result.current.state).toMatchObject({ gems: 40, freezes: 2 });
  });

  it("when signed in does not double-buy on a second tap", async () => {
    mocks.session.userId = "user-1";
    seed({ gems: 200, freezes: 0 });
    let answer!: (value: unknown) => void;
    mocks.buyStreakFreeze.mockReturnValue(new Promise((resolve) => (answer = resolve)));
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    await waitFor(() => expect(mocks.syncProgress).toHaveBeenCalled());

    let first!: Promise<unknown>;
    let second: { ok: boolean } | undefined;
    act(() => {
      first = screen.result.current.buyFreeze();
    });
    await act(async () => {
      second = await screen.result.current.buyFreeze();
    });
    expect(second?.ok).toBe(false);
    await act(async () => {
      answer({ ok: true, balance: 140, spent: 60 });
      await first;
    });
    expect(mocks.buyStreakFreeze).toHaveBeenCalledTimes(1);
    expect(screen.result.current.state.freezes).toBe(1);
  });

  it("when signed in and refused, keeps the freeze out and takes the account's balance", async () => {
    mocks.session.userId = "user-1";
    seed({ gems: 100, freezes: 1 });
    // Another device spent 90 of these gems.
    mocks.buyStreakFreeze.mockResolvedValue({
      ok: false,
      reason: "not-enough-gems",
      message: "You don't have enough gems for that yet.",
      balance: 10,
      spent: 90,
    });
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    await waitFor(() => expect(mocks.syncProgress).toHaveBeenCalled());

    let outcome: unknown;
    await act(async () => {
      outcome = await screen.result.current.buyFreeze();
    });
    expect(outcome).toEqual({ ok: false, message: "You don't have enough gems for that yet." });
    expect(screen.result.current.state).toMatchObject({ gems: 10, gemsSpent: 90, freezes: 1 });
  });

  it("when signed in and limited or offline, says so and spends nothing", async () => {
    mocks.session.userId = "user-1";
    seed({ gems: 100, freezes: 1 });
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    await waitFor(() => expect(mocks.syncProgress).toHaveBeenCalled());

    mocks.buyStreakFreeze.mockResolvedValueOnce({
      ok: false,
      limited: true,
      reason: "That's a lot of purchases. Try again in about 5 minutes.",
      retryAfterSeconds: 300,
    });
    let limited: unknown;
    await act(async () => {
      limited = await screen.result.current.buyFreeze();
    });
    expect(limited).toEqual({
      ok: false,
      message: "That's a lot of purchases. Try again in about 5 minutes.",
    });

    mocks.buyStreakFreeze.mockRejectedValueOnce(new Error("offline"));
    let offline: { ok: boolean; message?: string } | undefined;
    await act(async () => {
      offline = await screen.result.current.buyFreeze();
    });
    expect(offline).toMatchObject({ ok: false });
    expect(offline?.message).toMatch(/not spent/i);
    expect(screen.result.current.state).toMatchObject({ gems: 100, freezes: 1 });
  });

  it("adopts gems spent on another device from an ordinary sync", async () => {
    mocks.session.userId = "user-1";
    seed({ gems: 100, freezes: 1 });
    mocks.syncProgress.mockResolvedValue(account({ gems: 40, gemsSpent: 60 }));
    const { useProgress } = await loadStore();
    const screen = renderHook(() => useProgress());
    await waitFor(() => expect(screen.result.current.state.gems).toBe(40));
    expect(screen.result.current.state.gemsSpent).toBe(60);
  });
});
