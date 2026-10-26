// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { LESSONS } from "./curriculum";

const h = vi.hoisted(() => ({ sync: vi.fn() }));
vi.mock("./learning-state.functions", () => ({ syncLearningState: h.sync }));

import { readAttemptStore } from "./exercise-store";
import { adoptLearningState, requestLearningSync, resetLearningSync } from "./learning-sync";
import { readWritten } from "./mastery";
import { readRatingStore } from "./rating";
import { readDrillStore } from "./review-drills";

const A = LESSONS[0]!.id;
const B = LESSONS[1]!.id;
const USER = "u1";
const now = Date.now();
const rating = (value: number, lastAt: number) => ({
  rating: value,
  answered: 2,
  run: 0,
  lastAt,
  seen: [],
});
const review = (lessonId: string, at: number) => ({
  lessonId,
  kind: "flaw",
  box: 2,
  due: "2026-11-02",
  seen: [],
  reason: "missed",
  at,
});
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

beforeEach(() => {
  localStorage.clear();
  resetLearningSync();
  h.sync.mockReset();
});
afterEach(() => vi.useRealTimers());

describe("adopting the account's copy", () => {
  it("brings a new device the account's reviews and skills", () => {
    adoptLearningState({
      reviews: { [`${A}#flaw`]: review(A, now - 10) },
      ratings: { [A]: rating(1060, now - 10) },
      attempts: { [`${A}#0`]: { answer: 1, score: 1, at: now - 10 } },
      written: [{ lessonId: A, total: 6, max: 8, at: now - 10 }],
    });
    expect(Object.keys(readDrillStore())).toEqual([`${A}#flaw`]);
    expect(readRatingStore()[A]!.rating).toBe(1060);
    expect(readAttemptStore()[`${A}#0`]!.score).toBe(1);
    expect(readWritten()).toHaveLength(1);
  });

  it("keeps what only this device has, and its newer changes", () => {
    localStorage.setItem(
      "lamppost-rating-v1",
      JSON.stringify({ [A]: rating(1100, now - 1), [B]: rating(950, now - 1) }),
    );
    adoptLearningState({ ratings: { [A]: rating(1000, now - 500) } });
    expect(readRatingStore()[A]!.rating).toBe(1100);
    expect(readRatingStore()[B]!.rating).toBe(950);
  });

  it("tells open screens the reviews changed", () => {
    const heard = vi.fn();
    window.addEventListener("lamppost-review-drills-change", heard);
    adoptLearningState({ reviews: { [`${A}#flaw`]: review(A, now) } });
    expect(heard).toHaveBeenCalledTimes(1);
    adoptLearningState({ reviews: { [`${A}#flaw`]: review(A, now) } });
    expect(heard).toHaveBeenCalledTimes(1);
    window.removeEventListener("lamppost-review-drills-change", heard);
  });
});

describe("syncing", () => {
  it("sends the device's copy, saves the reply, and doesn't send the same thing again", async () => {
    localStorage.setItem("lamppost-rating-v1", JSON.stringify({ [A]: rating(1100, now - 1) }));
    h.sync.mockImplementation(async ({ data }: { data: { state: { ratings: object } } }) => ({
      state: { ...data.state, ratings: { ...data.state.ratings, [B]: rating(990, now - 5) } },
    }));
    requestLearningSync(USER);
    await flush();
    expect(h.sync).toHaveBeenCalledTimes(1);
    expect(h.sync.mock.calls[0]![0].data.state.ratings[A].rating).toBe(1100);
    expect(readRatingStore()[B]!.rating).toBe(990);

    requestLearningSync(USER);
    await flush();
    expect(h.sync).toHaveBeenCalledTimes(1);
  });

  it("sends a change made while a sync was out once that one is back", async () => {
    let answer: (value: unknown) => void = () => undefined;
    h.sync.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    h.sync.mockImplementation(async ({ data }: { data: unknown }) => data);
    requestLearningSync(USER);
    localStorage.setItem("lamppost-rating-v1", JSON.stringify({ [A]: rating(1100, now - 1) }));
    requestLearningSync(USER);
    expect(h.sync).toHaveBeenCalledTimes(1);
    answer({ state: { v: 1, reviews: {}, ratings: {}, attempts: {}, written: [] } });
    await flush();
    await flush();
    expect(h.sync).toHaveBeenCalledTimes(2);
    expect(h.sync.mock.calls[1]![0].data.state.ratings[A].rating).toBe(1100);
  });

  it("ignores a reply to a sync sent before this device's data was cleared", async () => {
    let answer: (value: unknown) => void = () => undefined;
    h.sync.mockImplementationOnce(() => new Promise((resolve) => (answer = resolve)));
    requestLearningSync(USER);
    resetLearningSync();
    answer({ state: { ratings: { [A]: rating(1200, now) } } });
    await flush();
    expect(readRatingStore()).toEqual({});
  });

  it("tries again later when a sync fails", async () => {
    h.sync.mockRejectedValueOnce(new Error("offline"));
    h.sync.mockImplementation(async ({ data }: { data: unknown }) => data);
    requestLearningSync(USER);
    await flush();
    requestLearningSync(USER);
    await flush();
    expect(h.sync).toHaveBeenCalledTimes(2);
  });
});
