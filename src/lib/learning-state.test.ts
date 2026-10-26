import { describe, expect, it } from "vitest";
import { LESSONS } from "./curriculum";
import {
  EMPTY_LEARNING_STATE,
  LEARNING_LIMITS,
  boundLearningState,
  learningSignature,
  mergeLearningState,
  type LearningState,
} from "./learning-state";

const A = LESSONS[0]!;
const B = LESSONS[1]!;
const NOW = Date.UTC(2026, 9, 26, 12);
const bounds = { known: new Set(LESSONS.map((lesson) => lesson.id)), now: NOW };
const bound = (raw: unknown) => boundLearningState(raw, bounds);
const merge = (a: LearningState, b: LearningState) => bound(mergeLearningState(a, b));

const review = (lessonId: string, at: number, extra: Record<string, unknown> = {}) => ({
  lessonId,
  kind: "flaw",
  box: 1,
  due: "2026-10-29",
  seen: [],
  reason: "missed",
  at,
  ...extra,
});
const rating = (lastAt: number, extra: Record<string, unknown> = {}) => ({
  rating: 1000,
  answered: 3,
  run: 1,
  lastAt,
  seen: [],
  ...extra,
});

describe("what the account believes of a copy", () => {
  it("keeps what a device really holds, unchanged", () => {
    const state = {
      v: 1,
      reviews: { [`${A.id}#flaw`]: review(A.id, NOW - 10) },
      ratings: { [A.id]: rating(NOW - 10, { seen: [3, 1] }) },
      attempts: { [`${A.id}#0`]: { answer: { choice: 2, confidence: 70 }, score: 1, at: NOW - 5 } },
      written: [{ lessonId: A.id, total: 6, max: 8, at: NOW - 1, scores: { precision: 3 } }],
    };
    expect(bound(state)).toEqual(state);
  });

  it("drops lessons that don't exist, mismatched keys and values it can't read", () => {
    const state = bound({
      reviews: {
        "no-such-lesson#flaw": review("no-such-lesson", NOW),
        [`${A.id}#claim`]: review(A.id, NOW), // key says claim, item says flaw
        [`${B.id}#flaw`]: review(B.id, NOW, { due: "soon" }),
        [`${A.id}#poem`]: review(A.id, NOW, { kind: "poem" }),
      },
      ratings: { "no-such-lesson": rating(NOW), [A.id]: rating(NOW, { rating: "high" }) },
      attempts: {
        "no-such-lesson#0": { answer: 1, score: 1, at: NOW },
        [`${A.id}#x`]: { answer: 1, score: 1, at: NOW },
        [`${A.id}#200`]: { answer: 1, score: 1, at: NOW },
        [`${A.id}#1`]: { answer: 1, score: "all", at: NOW },
      },
      written: [
        { lessonId: "lesson-3", total: 1, max: 8, at: NOW },
        { lessonId: A.id, total: 1, max: 0, at: NOW },
      ],
    });
    expect(state).toEqual(EMPTY_LEARNING_STATE);
  });

  it("clamps values into range and never trusts a clock running ahead", () => {
    const state = bound({
      reviews: { [`${A.id}#flaw`]: review(A.id, NOW + 99e9, { box: 40, reason: "bored" }) },
      ratings: { [A.id]: rating(NOW, { rating: 5000, answered: -4 }) },
      attempts: { [`${A.id}#0`]: { answer: "x".repeat(5000), score: 7, at: NOW } },
      written: [{ lessonId: A.id, total: 99, max: 8, at: NOW, scores: { precision: 9, made: 2 } }],
    });
    const item = state.reviews[`${A.id}#flaw`]!;
    expect(item.box).toBe(6);
    expect(item.reason).toBe("missed");
    expect(item.at).toBeLessThanOrEqual(NOW + 24 * 60 * 60 * 1000);
    expect(state.ratings[A.id]).toMatchObject({ rating: 1400, answered: 0 });
    expect(state.attempts[`${A.id}#0`]).toEqual({ answer: null, score: 1, at: NOW });
    expect(state.written[0]).toEqual({
      lessonId: A.id,
      total: 8,
      max: 8,
      at: NOW,
      scores: { precision: 4 },
    });
  });

  it("caps each part at its most recent entries", () => {
    const attempts = Object.fromEntries(
      Array.from({ length: 150 }, (_, i) => [
        `${LESSONS[i % LESSONS.length]!.id}#${Math.floor(i / LESSONS.length)}`,
        { answer: null, score: 1, at: NOW - 1000 + i },
      ]),
    );
    const written = Array.from({ length: 60 }, (_, i) => ({
      lessonId: A.id,
      total: 1,
      max: 8,
      at: NOW - 100 + i,
    }));
    const state = boundLearningState({ attempts, written }, { ...bounds, now: NOW });
    expect(Object.keys(state.attempts)).toHaveLength(150);
    expect(state.written).toHaveLength(LEARNING_LIMITS.written);
    expect(state.written[0]!.at).toBe(NOW - 100 + 20);
  });

  it("reads anything that isn't a learning state as an empty one", () => {
    for (const raw of [null, undefined, 3, "state", [], { reviews: [] }]) {
      expect(bound(raw)).toEqual(EMPTY_LEARNING_STATE);
    }
  });
});

describe("merging two devices", () => {
  const phone = bound({
    reviews: {
      [`${A.id}#flaw`]: review(A.id, NOW - 100, { box: 0, seen: [1] }),
      [`${B.id}#flaw`]: review(B.id, NOW - 50),
    },
    ratings: { [A.id]: rating(NOW - 100, { rating: 980, seen: [1, 2] }) },
    attempts: { [`${A.id}#0`]: { answer: 1, score: 0, at: NOW - 300 } },
    written: [{ lessonId: A.id, total: 4, max: 8, at: NOW - 300 }],
  });
  const laptop = bound({
    reviews: { [`${A.id}#flaw`]: review(A.id, NOW - 10, { box: 2, due: "2026-11-02", seen: [4] }) },
    ratings: {
      [A.id]: rating(NOW - 10, { rating: 1040, seen: [5] }),
      [B.id]: rating(NOW - 10),
    },
    attempts: {
      [`${A.id}#0`]: { answer: 0, score: 1, at: NOW - 20 },
      [`${A.id}#1`]: { answer: 2, score: 1, at: NOW - 20 },
    },
    written: [{ lessonId: B.id, total: 7, max: 8, at: NOW - 20 }],
  });

  it("keeps the review and rating changed last, and every variant either has served", () => {
    const merged = merge(phone, laptop);
    expect(merged.reviews[`${A.id}#flaw`]).toMatchObject({
      box: 2,
      due: "2026-11-02",
      seen: [1, 4],
    });
    expect(merged.reviews[`${B.id}#flaw`]).toEqual(phone.reviews[`${B.id}#flaw`]);
    expect(merged.ratings[A.id]).toMatchObject({ rating: 1040, seen: [1, 2, 5] });
    expect(merged.ratings[B.id]).toEqual(laptop.ratings[B.id]);
  });

  it("keeps a drill's first answer, and every graded piece of writing", () => {
    const merged = merge(phone, laptop);
    expect(merged.attempts[`${A.id}#0`]).toEqual({ answer: 1, score: 0, at: NOW - 300 });
    expect(merged.attempts[`${A.id}#1`]).toEqual(laptop.attempts[`${A.id}#1`]);
    expect(merged.written.map((w) => w.lessonId)).toEqual([A.id, B.id]);
  });

  it("gives the same answer whichever device comes first, and again when merged twice", () => {
    const sig = (state: LearningState) => learningSignature(state, bounds);
    expect(sig(merge(phone, laptop))).toBe(sig(merge(laptop, phone)));
    expect(sig(merge(merge(phone, laptop), laptop))).toBe(sig(merge(phone, laptop)));
    expect(sig(merge(phone, EMPTY_LEARNING_STATE))).toBe(sig(phone));
  });

  it("settles a tie in time the same way from either side", () => {
    const one = bound({ reviews: { [`${A.id}#flaw`]: review(A.id, NOW, { box: 1 }) } });
    const two = bound({ reviews: { [`${A.id}#flaw`]: review(A.id, NOW, { box: 3 }) } });
    expect(merge(one, two)).toEqual(merge(two, one));
  });
});
