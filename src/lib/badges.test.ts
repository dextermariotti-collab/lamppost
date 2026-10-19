// @vitest-environment jsdom
import { beforeEach, describe, expect, it } from "vitest";
import { computeBadges } from "./badges";
import { LESSONS } from "./curriculum";
import { DEFAULT_STATE } from "./progress-core";

const attempts = (lessonId: string, scores: number[]) =>
  Object.fromEntries(
    scores.map((score, i) => [
      `${lessonId}#${i}`,
      { answer: 0, score, at: Date.UTC(2026, 9, 1, 15) },
    ]),
  );
const flawless = (state = DEFAULT_STATE) =>
  computeBadges(state).find((badge) => badge.code === "flawless")!.value;

beforeEach(() => window.localStorage.clear());

describe("Flawless", () => {
  const [a, b] = [LESSONS[0]!, LESSONS[1]!];

  beforeEach(() => {
    window.localStorage.setItem(
      "lamppost-exercises-v1",
      JSON.stringify({ ...attempts(a.id, [1, 1, 1]), ...attempts(b.id, [1, 1, 1]) }),
    );
  });

  it("counts only lessons that were finished", () => {
    expect(flawless({ ...DEFAULT_STATE, doneLessonIds: [a.id], doneLessons: [0] })).toBe(1);
  });

  it("counts nothing for a lesson started but not finished", () => {
    expect(flawless({ ...DEFAULT_STATE, doneLessonIds: [], doneLessons: [] })).toBe(0);
  });

  it("reads an older save that kept only positions", () => {
    expect(flawless({ ...DEFAULT_STATE, doneLessonIds: null, doneLessons: [0, 1] })).toBe(2);
  });

  it("still needs every drill right", () => {
    window.localStorage.setItem("lamppost-exercises-v1", JSON.stringify(attempts(a.id, [1, 0, 1])));
    expect(flawless({ ...DEFAULT_STATE, doneLessonIds: [a.id], doneLessons: [0] })).toBe(0);
  });
});
