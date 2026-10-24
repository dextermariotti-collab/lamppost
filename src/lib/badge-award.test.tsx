// @vitest-environment jsdom
import { act, cleanup, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  session: { userId: null as string | null, ready: true },
  getMyProfile: vi.fn(),
  syncProgress: vi.fn(),
  listAchievements: vi.fn(),
}));

vi.mock("./companion-store", () => ({ useSessionUser: () => mocks.session }));
vi.mock("./profile.functions", () => ({
  getMyProfile: mocks.getMyProfile,
  syncProgress: mocks.syncProgress,
}));
vi.mock("./achievements.functions", () => ({ listAchievements: mocks.listAchievements }));

const LESSON = ["critical-thinking", "Critical thinking"] as const;
const reply = { ok: true, gemsSpent: 0, gemsGranted: 0, doneLessons: [] };
const SECOND = 1000;

async function loadStore() {
  vi.resetModules();
  const progress = await import("./progress");
  const { BADGE_CHECK_DELAY_MS } = await import("./badge-award");
  return { ...progress, DELAY: BADGE_CHECK_DELAY_MS };
}

/** Lets the sync's reply (a chain of promises) land. */
const settle = () =>
  act(async () => {
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
const wait = (ms: number) =>
  act(async () => {
    vi.advanceTimersByTime(ms);
    for (let i = 0; i < 10; i++) await Promise.resolve();
  });
const checks = () => mocks.listAchievements.mock.calls.length;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "Date"] });
  vi.setSystemTime(new Date(2026, 9, 24, 12, 0));
  window.localStorage.clear();
  mocks.session = { userId: "user-1", ready: true };
  mocks.getMyProfile.mockReset();
  mocks.getMyProfile.mockResolvedValue(null);
  mocks.syncProgress.mockReset();
  mocks.syncProgress.mockResolvedValue(reply);
  mocks.listAchievements.mockReset();
  mocks.listAchievements.mockResolvedValue({ badges: [], justUnlocked: [] });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("asking the server to award badges", () => {
  it("asks once straight after the first sync of a page load, for the local day", async () => {
    const { dayKey, useProgress } = await loadStore();
    renderHook(() => useProgress());
    renderHook(() => useProgress());
    renderHook(() => useProgress());
    await settle();
    expect(mocks.syncProgress).toHaveBeenCalledTimes(1);
    expect(checks()).toBe(1);
    expect(mocks.listAchievements).toHaveBeenCalledWith({ data: { today: dayKey() } });
  });

  it("then once, half a minute after the last sync, however many syncs came before", async () => {
    const { useProgress, DELAY } = await loadStore();
    const screen = renderHook(() => useProgress());
    await settle();
    expect(checks()).toBe(1);

    act(() => screen.result.current.completeLesson(...LESSON, 0, 35));
    await settle();
    await wait(DELAY - 10 * SECOND);
    act(() => screen.result.current.completeLesson(...LESSON, 1, 35));
    await settle();
    act(() => screen.result.current.recordReview(true));
    await settle();
    expect(mocks.syncProgress).toHaveBeenCalledTimes(4);

    await wait(DELAY - SECOND);
    expect(checks()).toBe(1);
    await wait(SECOND);
    expect(checks()).toBe(2);
    await wait(DELAY * 4);
    expect(checks()).toBe(2);
  });

  it("doesn't ask after a sync the server refused, until one it accepts", async () => {
    const { useProgress, DELAY } = await loadStore();
    mocks.syncProgress.mockRejectedValueOnce(new Error("offline"));
    const screen = renderHook(() => useProgress());
    await settle();
    await wait(DELAY * 2);
    expect(checks()).toBe(0);

    act(() => screen.result.current.completeLesson(...LESSON, 0, 35));
    await settle();
    expect(checks()).toBe(1);
  });

  it("stays quiet when a check fails, and the next sync's check goes ahead", async () => {
    const { useProgress, DELAY } = await loadStore();
    mocks.listAchievements.mockRejectedValueOnce(new Error("server down"));
    const screen = renderHook(() => useProgress());
    await settle();
    expect(checks()).toBe(1);

    act(() => screen.result.current.completeLesson(...LESSON, 0, 35));
    await settle();
    await wait(DELAY);
    expect(checks()).toBe(2);
  });

  it("never asks for someone signed out", async () => {
    mocks.session = { userId: null, ready: true };
    const { useProgress, DELAY } = await loadStore();
    const screen = renderHook(() => useProgress());
    act(() => screen.result.current.completeLesson(...LESSON, 0, 35));
    await settle();
    await wait(DELAY * 2);
    expect(mocks.syncProgress).not.toHaveBeenCalled();
    expect(checks()).toBe(0);
  });

  it("drops a waiting check when they sign out", async () => {
    const { useProgress, DELAY } = await loadStore();
    const screen = renderHook(() => useProgress());
    await settle();
    act(() => screen.result.current.completeLesson(...LESSON, 0, 35));
    await settle();

    mocks.session = { userId: null, ready: true };
    screen.rerender();
    await wait(DELAY * 2);
    expect(checks()).toBe(1);
  });

  it("isn't put off by a screen that mounts before its session check answers", async () => {
    const { useProgress, DELAY } = await loadStore();
    const home = renderHook(() => useProgress());
    await settle();
    act(() => home.result.current.completeLesson(...LESSON, 0, 35));
    await settle();

    mocks.session = { userId: null, ready: false };
    renderHook(() => useProgress());
    mocks.session = { userId: "user-1", ready: true };
    await wait(DELAY);
    expect(checks()).toBe(2);
  });

  it("asks nothing once this device's data is cleared, even for a sync sent before", async () => {
    const { resetProgressStore, useProgress, DELAY } = await loadStore();
    const screen = renderHook(() => useProgress());
    await settle();
    act(() => screen.result.current.completeLesson(...LESSON, 0, 35));
    await settle();
    act(() => resetProgressStore());
    await wait(DELAY * 2);
    expect(checks()).toBe(1);
  });

  it("asks nothing for a first sync whose reply lands after the data is cleared", async () => {
    const pending: ((value: typeof reply) => void)[] = [];
    mocks.syncProgress.mockImplementation(
      () => new Promise<typeof reply>((resolve) => pending.push(resolve)),
    );
    const { resetProgressStore, useProgress, DELAY } = await loadStore();
    renderHook(() => useProgress());
    await settle();
    expect(pending).toHaveLength(1);
    act(() => resetProgressStore());
    await act(async () => pending[0]!(reply));
    await settle();
    await wait(DELAY * 2);
    expect(checks()).toBe(0);
  });
});
