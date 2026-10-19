// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CURRICULUM_SLUG, LESSONS } from "./curriculum";
import { shiftDay } from "./days";
import {
  getPracticeResult,
  savePracticeResult,
  VERDICT_COPY,
  type PracticeVerdict,
} from "./practice";
import { DRILL_INTERVALS, UPKEEP_BOX, drillKey, type DrillItem } from "./review-drills";

const PRACTICE = "lamppost-practice-v1";
const REVIEWS = "lamppost-review-drills-v1";
const TODAY = "2026-10-19";
const lesson = LESSONS[2]!;
const LESSON_NUMBER = 3;

const close = (verdict: PracticeVerdict) => ({ verdict, remembered: "x", connectionMade: false });
const queue = () =>
  Object.values(JSON.parse(window.localStorage.getItem(REVIEWS) ?? "{}")) as DrillItem[];
const queued = (item: DrillItem) =>
  window.localStorage.setItem(
    REVIEWS,
    JSON.stringify({ [drillKey(item.lessonId, item.kind)]: item }),
  );
const saved = () => JSON.parse(window.localStorage.getItem(PRACTICE) ?? "{}") as object;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date(2026, 9, 19, 12));
  window.localStorage.clear();
});
afterEach(() => vi.useRealTimers());

describe("what an explain-it-back verdict promises", () => {
  it("brings a lesson worth another look back tomorrow", () => {
    savePracticeResult(CURRICULUM_SLUG, LESSON_NUMBER, close("revisit"));
    expect(queue()).toEqual([
      expect.objectContaining({ lessonId: lesson.id, box: 0, due: shiftDay(TODAY, 1) }),
    ]);
    expect(VERDICT_COPY.revisit.blurb).toMatch(/tomorrow/);
  });

  it("brings a shaky lesson back on the next short rung", () => {
    savePracticeResult(CURRICULUM_SLUG, LESSON_NUMBER, close("shaky"));
    expect(queue()).toEqual([
      expect.objectContaining({ lessonId: lesson.id, box: 1, due: shiftDay(TODAY, 3) }),
    ]);
    expect(DRILL_INTERVALS[1]).toBe(3);
  });

  it("pulls a review that was further off closer", () => {
    queued({
      lessonId: lesson.id,
      kind: "judge",
      box: UPKEEP_BOX,
      due: shiftDay(TODAY, 25),
      seen: [4],
      reason: "keep",
      at: 1,
    });
    savePracticeResult(CURRICULUM_SLUG, LESSON_NUMBER, close("shaky"));
    expect(queue()).toEqual([
      expect.objectContaining({
        kind: "judge",
        box: 1,
        due: shiftDay(TODAY, 3),
        seen: [4],
        reason: "unsure",
      }),
    ]);
  });

  it("never pushes a review later than it already was", () => {
    const missed: DrillItem = {
      lessonId: lesson.id,
      kind: "judge",
      box: 0,
      due: shiftDay(TODAY, 1),
      seen: [],
      reason: "missed",
      at: 1,
    };
    queued(missed);
    savePracticeResult(CURRICULUM_SLUG, LESSON_NUMBER, close("shaky"));
    expect(queue()).toEqual([missed]);
  });

  it("leaves the queue alone after a solid explanation", () => {
    savePracticeResult(CURRICULUM_SLUG, LESSON_NUMBER, close("solid"));
    expect(queue()).toEqual([]);
  });
});

describe("practice results", () => {
  it("are kept by lesson id, so a new lesson order can't move them", () => {
    savePracticeResult(CURRICULUM_SLUG, LESSON_NUMBER, close("solid"));
    expect(Object.keys(saved())).toEqual([lesson.id]);
    expect(getPracticeResult(CURRICULUM_SLUG, LESSON_NUMBER)?.verdict).toBe("solid");
  });

  it("reads results saved under a lesson's position and saves them by id", () => {
    window.localStorage.setItem(
      PRACTICE,
      JSON.stringify({ [`${CURRICULUM_SLUG}#${LESSON_NUMBER}`]: { ...close("shaky"), at: 5 } }),
    );
    expect(getPracticeResult(CURRICULUM_SLUG, LESSON_NUMBER)).toMatchObject({
      verdict: "shaky",
      at: 5,
    });
    expect(saved()).toEqual({ [lesson.id]: { ...close("shaky"), at: 5 } });
  });

  it("keeps the newer result when an old and a new key name the same lesson", () => {
    window.localStorage.setItem(
      PRACTICE,
      JSON.stringify({
        [lesson.id]: { ...close("solid"), at: 9 },
        [`${CURRICULUM_SLUG}#${LESSON_NUMBER}`]: { ...close("revisit"), at: 5 },
      }),
    );
    expect(getPracticeResult(CURRICULUM_SLUG, LESSON_NUMBER)?.verdict).toBe("solid");
    expect(Object.keys(saved())).toEqual([lesson.id]);
  });
});
