import { describe, expect, it } from "vitest";
import {
  allSamples,
  builderSample,
  confidenceSample,
  flawSample,
  sortSample,
  updaterSample,
} from "@/test/steps";
import {
  MAX_PROMPT_WORDS,
  isInteractive,
  stepProblems,
  stepSchema,
  wordCount,
  type LessonStep,
} from "./types";

describe("the step schema", () => {
  it.each(allSamples.map((s) => [s.kind, s] as const))(
    "accepts a well-formed %s step",
    (_kind, step) => {
      expect(stepSchema.safeParse(step).success).toBe(true);
      expect(stepProblems(step)).toEqual([]);
    },
  );

  it("rejects an unknown kind and an empty prompt", () => {
    expect(stepSchema.safeParse({ ...flawSample, kind: "trivia" }).success).toBe(false);
    expect(stepSchema.safeParse({ ...flawSample, prompt: "  " }).success).toBe(false);
  });

  it("counts a text card as the only step that isn't interactive", () => {
    expect(allSamples.filter((s) => !isInteractive(s)).map((s) => s.kind)).toEqual(["note"]);
  });
});

describe("rules that span fields", () => {
  const problems = (step: LessonStep) => stepProblems(step);

  it("holds an instruction to 40 words", () => {
    const long = Array.from({ length: MAX_PROMPT_WORDS + 1 }, (_, i) => `w${i}`).join(" ");
    expect(wordCount(long)).toBe(41);
    expect(problems({ ...flawSample, prompt: long }).join()).toMatch(/41 words/);
    expect(problems({ ...flawSample, prompt: long.split(" ").slice(0, 40).join(" ") })).toEqual([]);
  });

  it("wants exactly one flaw, and it must be tappable, among at least three choices", () => {
    const none = { ...flawSample, passage: flawSample.passage.map((p) => ({ ...p, flaw: false })) };
    expect(problems(none).join()).toMatch(/exactly one/);
    const two = {
      ...flawSample,
      passage: flawSample.passage.map((p) => (p.tappable ? { ...p, flaw: true } : p)),
    };
    expect(problems(two).join()).toMatch(/exactly one/);
    const fewChoices = {
      ...flawSample,
      passage: flawSample.passage
        .map((p, i) => (i === 4 ? { ...p, tappable: false } : p))
        .map((p, i) => (i === 1 ? { ...p, tappable: false } : p)),
    };
    expect(problems(fewChoices).join()).toMatch(/at least three/);
  });

  it("wants a piece for every slot and one conclusion", () => {
    const missing = {
      ...builderSample,
      pieces: builderSample.pieces.filter((p) => p.role !== "evidence"),
    };
    expect(problems(missing).join()).toMatch(/evidence/);
    const twoConclusions = {
      ...builderSample,
      slots: builderSample.slots.map((s) =>
        s.id === "p" ? { ...s, role: "conclusion" as const } : s,
      ),
    };
    expect(problems(twoConclusions).join()).toMatch(/exactly one conclusion/);
  });

  it("wants every wrong option to say what the mistake was", () => {
    const lazy = { ...confidenceSample, options: [{ text: "a" }, { text: "b" }] as never };
    expect(problems({ ...lazy, correct: 1 }).join()).toMatch(/whyNot/);
  });

  it("wants buckets that are used and items that belong to a real one", () => {
    const orphan = {
      ...sortSample,
      items: sortSample.items.map((i) => ({ ...i, bucket: "fact" })),
    };
    expect(problems(orphan).join()).toMatch(/no item belongs/);
    const stray = {
      ...sortSample,
      items: sortSample.items.map((i, k) => (k === 0 ? { ...i, bucket: "nope" } : i)),
    };
    expect(problems(stray).join()).toMatch(/no bucket/);
  });

  it("wants evidence that raises and evidence that lowers", () => {
    const oneWay = {
      ...updaterSample,
      cards: updaterSample.cards.map((c) => ({ ...c, shift: Math.abs(c.shift) })),
    };
    expect(problems(oneWay).join()).toMatch(/raises and one that lowers/);
  });
});
