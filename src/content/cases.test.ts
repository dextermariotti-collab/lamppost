import { describe, expect, it } from "vitest";
import { LESSONS, UNITS } from "@/lib/curriculum";
import { CASE_QUESTIONS, caseProblems, caseUnits, dailyCaseSchema } from "@/lib/daily-case";
import { wordCount } from "@/lib/steps/types";
import { DAILY_CASES } from "./cases";
import { PARTISAN, REAL_NAMES } from "./content-rules";
import { authoredUnits, loadLessonScript } from "./lessons";
import { UNIT_CHECKS } from "./unit-checks";

/**
 * The daily cases are data, so they're held to the same standards as the lessons: well formed,
 * three different units per case, made-up names, no party line, fair answer options, and texts
 * that appear nowhere in the lessons or the unit checks.
 */

const questions = DAILY_CASES.flatMap((c) => c.questions.map((q) => ({ case: c.id, ...q })));
const sentences = (text: string) => text.split(/(?<=[.!?])\s+/).filter(Boolean).length;

async function lessonText(): Promise<string> {
  const parts: string[] = [JSON.stringify(UNIT_CHECKS)];
  for (const lesson of LESSONS) {
    if (!authoredUnits().includes(lesson.unitId)) continue;
    const loaded = await loadLessonScript(lesson.unitId, lesson.id);
    if (loaded.ok) parts.push(JSON.stringify(loaded.script));
  }
  return parts.join("\n").toLowerCase();
}

describe("the daily cases", () => {
  it("start with at least four weeks of cases, numbered in order", () => {
    expect(DAILY_CASES.length).toBeGreaterThanOrEqual(28);
    DAILY_CASES.forEach((c, i) => expect(c.id).toBe(`case-${String(i + 1).padStart(3, "0")}`));
  });

  it.each(DAILY_CASES.map((c) => [c.id, c] as const))("%s is well formed", (_id, c) => {
    expect(dailyCaseSchema.safeParse(c).success).toBe(true);
    expect(caseProblems(c)).toEqual([]);
    expect(c.questions).toHaveLength(CASE_QUESTIONS);
  });

  it("keep explanations short, like the lessons", () => {
    for (const q of questions) {
      const where = `${q.case} ${q.step.id}`;
      expect(sentences(q.step.why), where).toBeLessThanOrEqual(3);
      expect(wordCount(q.step.why), where).toBeLessThanOrEqual(50);
      for (const option of q.step.options)
        if (option.whyNot) expect(wordCount(option.whyNot), where).toBeLessThanOrEqual(50);
    }
  });

  it("mix every unit in, and every lesson at least once", () => {
    const perUnit = new Map<string, number>();
    for (const c of DAILY_CASES)
      for (const unit of caseUnits(c)) perUnit.set(unit, (perUnit.get(unit) ?? 0) + 1);
    for (const unit of UNITS)
      expect(perUnit.get(unit.id) ?? 0, unit.id).toBeGreaterThanOrEqual(DAILY_CASES.length / 4);
    const used = new Set(questions.map((q) => q.lessonId));
    expect(LESSONS.filter((l) => !used.has(l.id)).map((l) => l.id)).toEqual([]);
  });

  it("use only made-up people, companies and products, and take no party line", () => {
    const text = JSON.stringify(DAILY_CASES);
    for (const name of REAL_NAMES)
      expect(new RegExp(`\\b${name}\\b`, "i").test(text), `mentions ${name}`).toBe(false);
    for (const topic of [...PARTISAN, "election"])
      expect(new RegExp(`\\b${topic}\\b`, "i").test(text), `mentions ${topic}`).toBe(false);
  });

  it("use texts that appear nowhere in the lessons or the unit checks", async () => {
    const elsewhere = await lessonText();
    for (const c of DAILY_CASES) {
      const opening = c.text.toLowerCase().slice(0, 60);
      expect(elsewhere.includes(opening), c.id).toBe(false);
    }
    expect(new Set(DAILY_CASES.map((c) => c.text)).size).toBe(DAILY_CASES.length);
  });
});

describe("answers aren't predictable", () => {
  it("spread the right answer across positions", () => {
    const counts = [0, 0, 0];
    for (const q of questions) counts[q.step.correct] = (counts[q.step.correct] ?? 0) + 1;
    for (const count of counts) expect(count / questions.length).toBeLessThan(0.45);
  });

  it("don't fall into a pattern for the first, second or third question", () => {
    for (let slot = 0; slot < CASE_QUESTIONS; slot++) {
      const counts = [0, 0, 0];
      for (const c of DAILY_CASES) {
        const correct = c.questions[slot]!.step.correct;
        counts[correct] = (counts[correct] ?? 0) + 1;
      }
      for (const count of counts)
        expect(count / DAILY_CASES.length, `question ${slot + 1}`).toBeLessThan(0.5);
    }
  });

  it("never make the right answer much longer than the wrong ones", () => {
    const tooLong: string[] = [];
    for (const q of questions) {
      const right = q.step.options[q.step.correct]!.text.length;
      const wrong = q.step.options.filter((_, i) => i !== q.step.correct).map((o) => o.text.length);
      if (right > Math.max(...wrong) * 1.5 + 6) tooLong.push(`${q.case} ${q.step.id}`);
    }
    expect(tooLong).toEqual([]);
  });

  it("only rarely make the right answer the noticeably longest", () => {
    const giveaway = questions.filter((q) => {
      const wrong = q.step.options.filter((_, i) => i !== q.step.correct).map((o) => o.text.length);
      return q.step.options[q.step.correct]!.text.length > 1.15 * Math.max(...wrong);
    });
    expect(giveaway.length / questions.length).toBeLessThan(0.2);
  });
});
