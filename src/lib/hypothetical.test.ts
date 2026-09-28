import { describe, expect, it } from "vitest";
import {
  HYPOTHETICAL_PREFIX,
  cleanLessonHypotheticals,
  countHypothetical,
  sayHypotheticalOnce,
  stripHypothetical,
} from "./hypothetical";
import type { Lesson } from "./courses";
import type { Exercise } from "./exercises";
import { normalizeExercise } from "./exercise-ai.server";

describe("stripHypothetical", () => {
  it.each([
    ["Hypothetical scenario: A clinic tests a pill.", "A clinic tests a pill."],
    [
      "A clinic tests a pill. In this hypothetical, 40 of 100 recover.",
      "A clinic tests a pill. 40 of 100 recover.",
    ],
    ["Imagine a hypothetical study of 200 people.", "Imagine a study of 200 people."],
    ["Imagine a hypothetical example of 200 people.", "Imagine an example of 200 people."],
    ["What would this hypothetical group do?", "What would this group do?"],
    ["Hypothetically, the drug works.", "The drug works."],
    ["The drug, in this hypothetical, works.", "The drug works."],
    ["The town votes twice in the hypothetical scenario.", "The town votes twice."],
    [
      "No real finding is implied by this hypothetical.",
      "No real finding is implied by this scenario.",
    ],
    ["Nothing to remove here.", "Nothing to remove here."],
  ])("%s", (input, expected) => {
    const out = stripHypothetical(input);
    expect(out).toBe(expected);
    expect(out).not.toMatch(/hypothetical/i);
  });
});

const predict = (extra: Partial<Record<string, unknown>> = {}) =>
  ({
    kind: "predict",
    scenario:
      "Hypothetical scenario: A school moves its start time. In this hypothetical, attendance is tracked for a year.",
    question: "In this hypothetical, what happens to attendance?",
    options: ["It rises", "It falls in the hypothetical", "It stays flat"],
    correct: 0,
    explanation:
      "Because this is a hypothetical scenario, no real finding is implied; the hypothetical school sees a rise.",
    ...extra,
  }) as unknown as Exercise;

describe("sayHypotheticalOnce", () => {
  it("leaves exactly one mention, on the scenario, as the prefix", () => {
    const before = predict();
    expect(countHypothetical(before)).toBeGreaterThanOrEqual(4);
    const after = sayHypotheticalOnce(before) as unknown as Record<string, unknown>;
    expect(countHypothetical(after)).toBe(1);
    expect(String(after["scenario"]).startsWith(HYPOTHETICAL_PREFIX)).toBe(true);
    expect(String(after["question"])).not.toMatch(/hypothetical/i);
    expect(JSON.stringify(after["options"])).not.toMatch(/hypothetical/i);
    expect(String(after["explanation"])).not.toMatch(/hypothetical/i);
  });

  it("puts the one mention on the scenario even when the model put it elsewhere", () => {
    const misplaced = predict({
      scenario: "A school moves its start time and tracks attendance for a year.",
      explanation: "This hypothetical shows a rise.",
    });
    const after = sayHypotheticalOnce(misplaced) as unknown as Record<string, unknown>;
    expect(countHypothetical(after)).toBe(1);
    expect(String(after["scenario"])).toBe(
      `${HYPOTHETICAL_PREFIX}A school moves its start time and tracks attendance for a year.`,
    );
  });

  it("does not touch a drill that never says it, and never adds it", () => {
    const plain = predict({
      scenario: "A school moves its start time.",
      question: "What happens to attendance?",
      options: ["It rises", "It falls", "It stays flat"],
      explanation: "Attendance rose.",
    });
    expect(sayHypotheticalOnce(plain)).toEqual(plain);
    expect(countHypothetical(plain)).toBe(0);
  });

  it("is idempotent and never changes the answer key or drill kind", () => {
    const once = sayHypotheticalOnce(predict()) as unknown as Record<string, unknown>;
    expect(sayHypotheticalOnce(once as unknown as Exercise)).toEqual(once);
    expect(once["correct"]).toBe(0);
    expect(once["kind"]).toBe("predict");
    expect((once["options"] as string[]).length).toBe(3);
  });

  it("uses the right scenario field for other drill kinds", () => {
    const numeric = {
      kind: "numeric",
      question: "In this hypothetical, what share is left?",
      scenario: "A hypothetical town has 200 people. Hypothetically, 50 leave.",
      answer: 75,
      tolerance: 1,
      unit: "%",
      solution: "150 of 200 is 75%, in this hypothetical.",
    } as unknown as Exercise;
    const after = sayHypotheticalOnce(numeric) as unknown as Record<string, unknown>;
    expect(countHypothetical(after)).toBe(1);
    expect(String(after["scenario"]).startsWith(HYPOTHETICAL_PREFIX)).toBe(true);
    expect(after["answer"]).toBe(75);
  });

  it("leaves highlight tokens alone so the tap targets keep their indexes", () => {
    const highlight = {
      kind: "highlight",
      question: "Tap the vague words.",
      tokens: ["Experts", "say", "hypothetical", "results", "may", "improve."],
      targets: [4],
      explanation: "A hypothetical hedge.",
    } as unknown as Exercise;
    const after = sayHypotheticalOnce(highlight) as unknown as Record<string, unknown>;
    expect(after["tokens"]).toEqual([
      "Experts",
      "say",
      "hypothetical",
      "results",
      "may",
      "improve.",
    ]);
    expect(after["targets"]).toEqual([4]);
    expect(String(after["explanation"])).not.toMatch(/hypothetical/i);
  });
});

describe("cleanLessonHypotheticals", () => {
  it("cleans every drill of an already-cached lesson", () => {
    const lesson = { title: "t", subtitle: "s", emoji: "x", exercises: [predict(), predict()] };
    const cleaned = cleanLessonHypotheticals(lesson as unknown as Lesson);
    for (const exercise of cleaned.exercises ?? []) expect(countHypothetical(exercise)).toBe(1);
  });

  it("hands back a lesson with no exercises unchanged", () => {
    const lesson = { title: "t", subtitle: "s", emoji: "x" };
    expect(cleanLessonHypotheticals(lesson as unknown as Lesson)).toBe(lesson);
  });
});

describe("the generation pipeline", () => {
  it("saves a predict drill that repeats the word with it said once, on the scenario", () => {
    const reply = {
      kind: "predict",
      scenario:
        "Hypothetical scenario: A firm ends remote work. In this hypothetical, a hypothetical team of 20 is tracked.",
      question: "In this hypothetical, what happens to output?",
      options: ["It rises", "It falls", "It is flat"],
      correct: 1,
      explanation: "This hypothetical shows a fall; the hypothetical team slowed down.",
    };
    const drill = normalizeExercise(reply);
    expect(drill).not.toBeNull();
    expect(countHypothetical(drill)).toBe(1);
    expect(
      (drill as unknown as { scenario: string }).scenario.startsWith(HYPOTHETICAL_PREFIX),
    ).toBe(true);
    expect(drill?.kind).toBe("predict");
  });
});
