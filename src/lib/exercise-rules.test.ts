import { describe, expect, it } from "vitest";
import { EXERCISE_KINDS, type Exercise } from "./exercises";
import { exerciseProblems } from "./exercise-rules";
import { SAMPLES, sample } from "@/test/exercises";

const problems = (exercise: Exercise) => exerciseProblems(exercise).join(" | ");

describe("a well-formed drill of every type", () => {
  it.each(EXERCISE_KINDS)("%s passes every rule", (kind) => {
    expect(exerciseProblems(SAMPLES[kind])).toEqual([]);
  });
});

describe("pick-one drills (claim, flaw, assumption, steelman, predict, judge, rewrite, chart)", () => {
  const kinds = [
    "claim",
    "flaw",
    "assumption",
    "steelman",
    "predict",
    "judge",
    "rewrite",
    "chart",
  ] as const;

  it.each(kinds)("%s needs at least three options", (kind) => {
    const drill = sample(kind);
    drill.options = drill.options.slice(0, 2);
    expect(problems(drill)).toMatch(/at least three options/);
  });

  it.each(kinds)("%s rejects a keyed option that isn't one of the options", (kind) => {
    for (const correct of [-1, 3, 1.5, Number.NaN]) {
      const drill = sample(kind);
      drill.correct = correct;
      expect(problems(drill), `correct=${correct}`).toMatch(/keyed option is not one of/);
    }
  });

  it.each(kinds)("%s rejects two options that are the same", (kind) => {
    const drill = sample(kind);
    drill.options = [drill.options[0]!, `  ${drill.options[0]!.toUpperCase()} `, drill.options[2]!];
    expect(problems(drill)).toMatch(/two options are the same/);
  });

  it("rejects a keyed option that alone carries its own justification", () => {
    const drill = sample("flaw");
    drill.options[0] = "It generalises from friends, because a small circle is not the world";
    expect(problems(drill)).toMatch(/only the keyed option carries its own justification/);
  });

  it("allows 'because' when the other options use it too", () => {
    const drill = sample("claim");
    drill.options = drill.options.map((option) => `${option} because of the evidence`);
    expect(problems(drill)).toBe("");
  });

  it("rejects a keyed option that is far longer than the rest", () => {
    const drill = sample("judge");
    drill.options = [
      "The person who is making the claim and who therefore has to supply the support for it",
      "The sceptic",
      "Nobody",
    ];
    expect(problems(drill)).toMatch(/much longer than the others/);
  });

  it("does not mind a keyed option that is a little longer", () => {
    const drill = sample("judge");
    drill.options = ["The person making the claim", "The sceptic reading it", "Nobody at all"];
    expect(problems(drill)).toBe("");
  });

  it("rejects an empty option or one too long to read at a glance", () => {
    const empty = sample("claim");
    empty.options[1] = "   ";
    expect(problems(empty)).toMatch(/empty option/);
    const long = sample("claim");
    long.options[1] = "word ".repeat(80);
    expect(problems(long)).toMatch(/too long/);
  });

  it("needs a real passage or argument to work on", () => {
    const drill = sample("claim");
    drill.passage = "Too short.";
    expect(problems(drill)).toMatch(/passage is missing/);
  });

  it("rejects a rewrite whose option is the original unchanged", () => {
    const drill = sample("rewrite");
    drill.options[1] = drill.original;
    expect(problems(drill)).toMatch(/original unchanged/);
  });
});

describe("rank and order", () => {
  it("need three or four different items", () => {
    const rank = sample("rank");
    rank.items = rank.items.slice(0, 2);
    expect(problems(rank)).toMatch(/needs 3-4 items/);
    const crowded = sample("order");
    crowded.items = [
      ...crowded.items,
      ...crowded.items.map((i) => ({ ...i, text: `${i.text} again` })),
    ];
    expect(problems(crowded)).toMatch(/needs 3-4 cards/);
    const twins = sample("order");
    twins.items[1] = { ...twins.items[1]!, text: twins.items[0]!.text };
    expect(problems(twins)).toMatch(/two cards are the same/);
  });

  it("need a claim or an instruction to go with the items", () => {
    const rank = sample("rank");
    rank.claim = "";
    expect(problems(rank)).toMatch(/claim is missing/);
    const order = sample("order");
    order.question = " ";
    expect(problems(order)).toMatch(/question is missing/);
  });
});

describe("sort", () => {
  it("needs three to five statements across at least two buckets", () => {
    const one = sample("sort");
    one.statements = one.statements.slice(0, 2);
    expect(problems(one)).toMatch(/needs 3-5 statements/);
    const flat = sample("sort");
    flat.statements = flat.statements.map((s) => ({ ...s, bucket: "fact" as const }));
    expect(problems(flat)).toMatch(/same bucket/);
  });
});

describe("highlight", () => {
  it("needs at least one target, all of them real tokens, listed once", () => {
    const none = sample("highlight");
    none.targets = [];
    expect(problems(none)).toMatch(/nothing is marked/);
    const outside = sample("highlight");
    outside.targets = [1, 99];
    expect(problems(outside)).toMatch(/not one of the tokens/);
    const twice = sample("highlight");
    twice.targets = [1, 1];
    expect(problems(twice)).toMatch(/listed twice/);
  });

  it("can't have so many targets that tapping everything nearly passes", () => {
    const drill = sample("highlight");
    drill.targets = [0, 1, 2, 3, 4, 5, 6];
    expect(problems(drill)).toMatch(/too many tokens are marked/);
  });

  it("can't ask for a piece of punctuation", () => {
    const drill = sample("highlight");
    drill.tokens[4] = "—";
    drill.targets = [4];
    expect(problems(drill)).toMatch(/only punctuation/);
  });

  it("needs a passage long enough to tap around in", () => {
    const drill = sample("highlight");
    drill.tokens = drill.tokens.slice(0, 5);
    drill.targets = [1];
    expect(problems(drill)).toMatch(/needs 8-60 tokens/);
  });
});

describe("numeric", () => {
  it("needs a finite answer and a positive, sensible tolerance", () => {
    const nan = sample("numeric");
    nan.answer = Number.NaN;
    expect(problems(nan)).toMatch(/answer is not a number/);
    const zero = sample("numeric");
    zero.tolerance = 0;
    expect(problems(zero)).toMatch(/tolerance must be above zero/);
    const wide = sample("numeric");
    wide.tolerance = 60;
    expect(problems(wide)).toMatch(/so wide that a poor estimate passes/);
  });

  it("allows a small tolerance around zero", () => {
    const drill = sample("numeric");
    drill.answer = 0;
    drill.tolerance = 0.5;
    expect(problems(drill)).toBe("");
  });

  it("needs numbers in the scenario and a worked solution", () => {
    const drill = sample("numeric");
    drill.scenario = "A test is given to a large group of people who are all completely healthy.";
    expect(problems(drill)).toMatch(/gives no numbers/);
    const bare = sample("numeric");
    bare.solution = "";
    expect(problems(bare)).toMatch(/worked solution is missing/);
  });
});

describe("slider", () => {
  it("needs a direction, a move of 5-45 points, and evidence that isn't the claim", () => {
    const sideways = sample("slider");
    (sideways as { direction: string }).direction = "sideways";
    expect(problems(sideways)).toMatch(/neither up nor down/);
    const tiny = sample("slider");
    tiny.size = 1;
    expect(problems(tiny)).toMatch(/outside 5-45/);
    const huge = sample("slider");
    huge.size = 80;
    expect(problems(huge)).toMatch(/outside 5-45/);
    const echo = sample("slider");
    echo.evidence = echo.claim;
    expect(problems(echo)).toMatch(/repeats the claim/);
  });
});

describe("chart", () => {
  it("needs three to eight labelled, distinct, numeric points", () => {
    const few = sample("chart");
    few.series = few.series.slice(0, 2);
    expect(problems(few)).toMatch(/needs 3-8 data points/);
    const dupes = sample("chart");
    dupes.series[1] = { ...dupes.series[1]!, label: dupes.series[0]!.label };
    expect(problems(dupes)).toMatch(/share a label/);
    const wordy = sample("chart");
    wordy.series[0] = { ...wordy.series[0]!, label: "A very long label indeed" };
    expect(problems(wordy)).toMatch(/label too long/);
    const bad = sample("chart");
    bad.series[0] = { ...bad.series[0]!, value: Number.NaN };
    expect(problems(bad)).toMatch(/not a number/);
  });

  it("needs a real axis window with data in it, and something to read", () => {
    const empty = sample("chart");
    empty.yMax = empty.yMin;
    expect(problems(empty)).toMatch(/axis window is empty/);
    const outside = sample("chart");
    outside.yMin = 200;
    outside.yMax = 300;
    expect(problems(outside)).toMatch(/no data point falls inside/);
    const flat = sample("chart");
    flat.series = flat.series.map((p) => ({ ...p, value: 99 }));
    expect(problems(flat)).toMatch(/nothing to read/);
  });
});
