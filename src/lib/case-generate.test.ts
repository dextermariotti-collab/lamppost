import { describe, expect, it } from "vitest";
import { DAILY_CASES } from "@/content/cases";
import { asReplyExample, casePlanForDay, readCaseReview, readGeneratedCase } from "./case-generate";
import { unitOfLesson } from "./daily-case";

/** A reply in the shape the model is asked for, built from the plan's own lessons. */
function reply(plan: ReturnType<typeof casePlanForDay>, overrides: Record<string, unknown> = {}) {
  const example = asReplyExample(DAILY_CASES[0]!);
  return {
    ...example,
    questions: example.questions.map((q, i) => ({ ...q, lessonId: plan.lessons[i] })),
    ...overrides,
  };
}

describe("what a day's AI case is about", () => {
  it("is the same plan every time for the same day", () => {
    expect(casePlanForDay("2026-11-02")).toEqual(casePlanForDay("2026-11-02"));
  });

  it("asks about three lessons from three different units", () => {
    for (const day of ["2026-11-02", "2026-11-03", "2027-01-15", "2027-06-30"]) {
      const units = casePlanForDay(day).lessons.map(unitOfLesson);
      expect(units.every(Boolean), day).toBe(true);
      expect(new Set(units).size, day).toBe(3);
    }
  });

  it("varies from day to day", () => {
    const plans = Array.from({ length: 14 }, (_, i) =>
      JSON.stringify(casePlanForDay(`2026-11-${String(i + 1).padStart(2, "0")}`)),
    );
    expect(new Set(plans).size).toBeGreaterThan(10);
  });
});

describe("reading the model's reply", () => {
  const plan = casePlanForDay("2026-11-02");

  it("turns a good reply into a case for that day, keyed to the planned lessons", () => {
    const read = readGeneratedCase(reply(plan), plan);
    expect(read.ok).toBe(true);
    if (!read.ok) return;
    expect(read.case.id).toBe("ai-2026-11-02");
    expect(read.case.questions.map((q) => q.lessonId)).toEqual(plan.lessons);
  });

  it("keeps the right answer right after shuffling the options", () => {
    const read = readGeneratedCase(reply(plan), plan);
    if (!read.ok) throw new Error(read.problems.join("; "));
    const example = asReplyExample(DAILY_CASES[0]!);
    read.case.questions.forEach((q, i) => {
      const keyed = example.questions[i]!;
      expect(q.step.options[q.step.correct]!.text).toBe(keyed.options[keyed.correct]!.text);
      expect(q.step.options[q.step.correct]!.whyNot).toBeUndefined();
    });
  });

  it("refuses a reply that breaks the rules the written cases follow", () => {
    expect(readGeneratedCase(reply(plan, { text: "Far too short." }), plan).ok).toBe(false);
    expect(
      readGeneratedCase(reply(plan, { title: "What Musk said about the bridge" }), plan).ok,
    ).toBe(false);
    const twoQuestions = reply(plan);
    twoQuestions.questions = twoQuestions.questions.slice(0, 2);
    expect(readGeneratedCase(twoQuestions, plan).ok).toBe(false);
  });

  it("refuses a question about the wrong lesson, or one with no reason for a wrong answer", () => {
    const wrongLesson = reply(plan);
    wrongLesson.questions[0] = { ...wrongLesson.questions[0]!, lessonId: "media-ai-answers" };
    if (plan.lessons[0] !== "media-ai-answers")
      expect(readGeneratedCase(wrongLesson, plan).ok).toBe(false);
    const noReason = reply(plan);
    noReason.questions[1] = {
      ...noReason.questions[1]!,
      options: noReason.questions[1]!.options.map((o) => ({ text: o.text })),
    };
    expect(readGeneratedCase(noReason, plan).ok).toBe(false);
  });

  it("refuses an answer that gives itself away by its length", () => {
    const giveaway = reply(plan);
    const q = giveaway.questions[2]!;
    giveaway.questions[2] = {
      ...q,
      options: q.options.map((o, i) =>
        i === q.correct
          ? { text: `${o.text}, and this is clearly the careful, complete answer` }
          : o,
      ),
    };
    expect(readGeneratedCase(giveaway, plan).ok).toBe(false);
  });

  it("reads nothing into a reply that isn't an object", () => {
    expect(readGeneratedCase(null, plan).ok).toBe(false);
    expect(readGeneratedCase("a case", plan).ok).toBe(false);
  });
});

describe("the reviewer's verdict", () => {
  it("passes only when every question passed", () => {
    const pass = { pass: true, problem: "" };
    expect(readCaseReview({ questions: [pass, pass, pass] })).toBe(true);
    expect(
      readCaseReview({ questions: [pass, { pass: false, problem: "two answers" }, pass] }),
    ).toBe(false);
    expect(readCaseReview({ questions: [pass] })).toBeNull();
    expect(readCaseReview(undefined)).toBeNull();
  });
});
