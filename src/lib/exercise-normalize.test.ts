import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { EXERCISE_KINDS } from "./exercises";
import { normalizeExercise } from "./exercise-ai.server";
import { answerKey, validationPrompt } from "./exercise-validate.server";
import { LESSONS } from "./curriculum";
import { SAMPLES } from "@/test/exercises";

beforeEach(() => vi.spyOn(console, "warn").mockImplementation(() => undefined));
afterEach(() => vi.restoreAllMocks());

const raw = (kind: keyof typeof SAMPLES, over: Record<string, unknown> = {}) => ({
  ...JSON.parse(JSON.stringify(SAMPLES[kind])),
  ...over,
});

describe("normalizing what the model writes, for every drill type", () => {
  it.each(EXERCISE_KINDS)(
    "%s: a well-formed drill comes through with its content intact",
    (kind) => {
      const drill = normalizeExercise(raw(kind));
      expect(drill?.kind).toBe(kind);
      // Nothing the learner reads is lost (options are shuffled, so compare as a set).
      const original = SAMPLES[kind] as Record<string, unknown>;
      for (const [key, value] of Object.entries(original)) {
        if (key === "options" || key === "correct") continue;
        expect((drill as unknown as Record<string, unknown>)[key], key).toEqual(value);
      }
    },
  );

  it.each(EXERCISE_KINDS)("%s: garbage is refused, not repaired into a drill", (kind) => {
    expect(normalizeExercise({ kind })).toBeNull();
    expect(normalizeExercise({ kind, junk: true })).toBeNull();
  });

  it("refuses things that aren't drills at all", () => {
    for (const value of [null, undefined, 3, "text", [], {}, { kind: "unknown-kind" }]) {
      expect(normalizeExercise(value)).toBeNull();
    }
  });
});

describe("the keyed option", () => {
  const choiceKinds = [
    "claim",
    "flaw",
    "assumption",
    "steelman",
    "predict",
    "judge",
    "rewrite",
    "chart",
  ] as const;

  it.each(choiceKinds)("%s: shuffling keeps the keyed option pointing at the same text", (kind) => {
    const original = SAMPLES[kind] as unknown as { options: string[]; correct: number };
    const keyedText = original.options[original.correct]!;
    for (let attempt = 0; attempt < 20; attempt++) {
      const drill = normalizeExercise(raw(kind)) as unknown as {
        options: string[];
        correct: number;
      };
      expect(drill.options[drill.correct]).toBe(keyedText);
      expect([...drill.options].sort()).toEqual([...original.options].sort());
    }
  });

  it("is not guessed when it is missing", () => {
    const { correct: _dropped, ...noKey } = raw("flaw");
    expect(normalizeExercise(noKey)).toBeNull();
  });

  it("is not guessed when it points outside the options", () => {
    for (const correct of [3, 9, -1, 1.5, null, "nope", true]) {
      expect(normalizeExercise(raw("flaw", { correct })), String(correct)).toBeNull();
    }
  });

  it("accepts a key written as a numeric string or as the answer's own text", () => {
    const asString = normalizeExercise(raw("flaw", { correct: "0" })) as unknown as {
      options: string[];
      correct: number;
    };
    expect(asString.options[asString.correct]).toBe(SAMPLES.flaw.options[0]);
    const asText = normalizeExercise(
      raw("flaw", { correct: SAMPLES.flaw.options[2].toUpperCase() }),
    ) as unknown as { options: string[]; correct: number };
    expect(asText.options[asText.correct]).toBe(SAMPLES.flaw.options[2]);
  });
});

describe("the structural rules are applied to what the model writes", () => {
  it("drops a drill with a duplicated option before it is ever reviewed", () => {
    const options = [SAMPLES.judge.options[0], SAMPLES.judge.options[0], SAMPLES.judge.options[2]];
    expect(normalizeExercise(raw("judge", { options }))).toBeNull();
    expect(console.warn).toHaveBeenCalledWith(expect.stringContaining("judge rejected"));
  });

  it("drops a highlight whose targets would nearly all pass by tapping everything", () => {
    expect(normalizeExercise(raw("highlight", { targets: [0, 1, 2, 3, 4, 5, 6, 7] }))).toBeNull();
  });

  it("drops a highlight with no usable target", () => {
    expect(normalizeExercise(raw("highlight", { targets: [] }))).toBeNull();
    expect(normalizeExercise(raw("highlight", { targets: [50, 60] }))).toBeNull();
  });

  it("drops a chart with an empty axis window by widening it, and one with nothing inside it", () => {
    const widened = normalizeExercise(raw("chart", { yMin: 100, yMax: 100 })) as unknown as {
      yMax: number;
    };
    expect(widened.yMax).toBeGreaterThan(100);
    expect(normalizeExercise(raw("chart", { yMin: 500, yMax: 600 }))).toBeNull();
  });

  it("keeps a numeric drill with a zero answer and gives it a workable tolerance", () => {
    const drill = normalizeExercise(
      raw("numeric", {
        answer: 0,
        tolerance: 0,
        solution: "There are none, so the answer is zero.",
      }),
    ) as unknown as { tolerance: number };
    expect(drill.tolerance).toBeGreaterThan(0);
  });

  it("drops a numeric drill whose scenario gives no numbers", () => {
    expect(
      normalizeExercise(
        raw("numeric", {
          scenario: "A test is given to a large group of healthy people, all of them.",
        }),
      ),
    ).toBeNull();
  });

  it("still says 'hypothetical' only once", () => {
    const drill = normalizeExercise(
      raw("predict", {
        scenario:
          "Hypothetical scenario: a group of one hundred people try a new habit. In this hypothetical, most of them stick with it.",
      }),
    ) as unknown as { scenario: string };
    expect(drill.scenario.match(/hypothetical/gi)).toHaveLength(1);
  });
});

describe("the answer key the reviewer is shown", () => {
  it.each(EXERCISE_KINDS)("%s has one", (kind) => {
    const key = answerKey(SAMPLES[kind]);
    expect(key).toMatch(/^Answer key:/);
    expect(key).not.toMatch(/undefined|NaN/);
  });

  it("names the keyed option's text for pick-one drills", () => {
    expect(answerKey(SAMPLES.flaw)).toContain(SAMPLES.flaw.options[0]);
    expect(answerKey(SAMPLES.chart)).toContain(SAMPLES.chart.options[0]);
  });

  it("states the tolerance for numeric and the direction for slider drills", () => {
    expect(answerKey(SAMPLES.numeric)).toMatch(/100 \(tolerance 10\)/);
    expect(answerKey(SAMPLES.slider)).toMatch(/down by about 30/);
  });

  it("lists the tap targets for a highlight drill", () => {
    expect(answerKey(SAMPLES.highlight)).toMatch(/1, 5/);
  });

  it("puts every drill's key in front of the reviewer with the lesson's spine", () => {
    const lesson = LESSONS[0]!;
    const prompt = validationPrompt(
      lesson,
      EXERCISE_KINDS.map((kind) => SAMPLES[kind]),
      "The concept card.",
    );
    expect(prompt).toContain(lesson.keyIdea);
    expect(prompt).toContain(lesson.trap);
    expect(prompt.match(/Answer key:/g)).toHaveLength(EXERCISE_KINDS.length);
  });
});
