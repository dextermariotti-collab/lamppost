import { describe, expect, it } from "vitest";
import {
  EXERCISE_KINDS,
  correctText,
  describeAnswer,
  describeExercise,
  questionFor,
  exerciseXpFor,
} from "./exercises";
import { SAMPLES } from "@/test/exercises";

describe("how a drill is put into words for the companion", () => {
  it.each(EXERCISE_KINDS)("%s: describes the drill without holes", (kind) => {
    const text = describeExercise(SAMPLES[kind]);
    expect(text.length).toBeGreaterThan(20);
    expect(text).not.toMatch(/undefined|\[object/);
  });

  it("describes what was picked for each answer shape", () => {
    expect(describeAnswer(SAMPLES.flaw, 0)).toBe(SAMPLES.flaw.options[0]);
    expect(describeAnswer(SAMPLES.chart, 2)).toBe(SAMPLES.chart.options[2]);
    expect(describeAnswer(SAMPLES.predict, { choice: 1, confidence: 80 })).toBe(
      `${SAMPLES.predict.options[1]} (80% confident)`,
    );
    expect(describeAnswer(SAMPLES.rank, ["a", "b"])).toBe("a > b");
    expect(describeAnswer(SAMPLES.order, ["a", "b"])).toBe("a then b");
    expect(describeAnswer(SAMPLES.highlight, [1, 5])).toBe("may, can");
    expect(describeAnswer(SAMPLES.numeric, 96)).toBe("96");
    expect(describeAnswer(SAMPLES.slider, { before: 70, after: 40 })).toBe("70% → 40%");
    expect(describeAnswer(SAMPLES.sort, { "0": "fact", "1": "opinion" })).toContain("→ fact");
    expect(describeAnswer(SAMPLES.sort, { "0": "fact" })).toContain("→ ?");
  });

  it.each(EXERCISE_KINDS)(
    "%s: an answer of the wrong shape describes as empty, never throws",
    (kind) => {
      expect(() => describeAnswer(SAMPLES[kind], undefined)).not.toThrow();
      expect(() => describeAnswer(SAMPLES[kind], "not an answer")).not.toThrow();
    },
  );

  it("names the keyed option's text, and nothing for drills without one", () => {
    expect(correctText(SAMPLES.judge)).toBe(SAMPLES.judge.options[0]);
    expect(correctText(SAMPLES.rank)).toBeNull();
    expect(correctText(SAMPLES.numeric)).toBeNull();
  });

  it("shows the lesson's own question where the drill has one, else the type's", () => {
    expect(questionFor(SAMPLES.judge)).toBe(SAMPLES.judge.question);
    expect(questionFor(SAMPLES.flaw)).toBe("What's wrong with this reasoning?");
  });

  it("pays XP in proportion to the score, with a floor", () => {
    expect([
      exerciseXpFor(1),
      exerciseXpFor(0.5),
      exerciseXpFor(0),
      exerciseXpFor(-1),
      exerciseXpFor(3),
    ]).toEqual([25, 13, 5, 5, 25]);
  });
});
