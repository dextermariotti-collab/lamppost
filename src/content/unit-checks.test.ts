import { describe, expect, it } from "vitest";
import { UNITS } from "@/lib/curriculum";
import { stepProblems, stepSchema } from "@/lib/steps/types";
import { authoredUnits, loadLessonScript } from "./lessons";
import { LESSONS } from "@/lib/curriculum";
import { CHECK_LENGTH, UNIT_CHECKS } from "./unit-checks";

const all = Object.values(UNIT_CHECKS).flatMap((c) => [...c.before, ...c.after]);

/** Every piece of learner-facing text in the 35 lessons, to prove the checks are fresh. */
async function lessonText(): Promise<string> {
  const parts: string[] = [];
  for (const lesson of LESSONS) {
    if (!authoredUnits().includes(lesson.unitId)) continue;
    const loaded = await loadLessonScript(lesson.unitId, lesson.id);
    if (loaded.ok) parts.push(JSON.stringify(loaded.script));
  }
  return parts.join("\n").toLowerCase();
}

describe("the unit checks", () => {
  it("have a before and an after check of three questions for every unit", () => {
    expect(Object.keys(UNIT_CHECKS).sort()).toEqual(UNITS.map((u) => u.id).sort());
    for (const [unit, check] of Object.entries(UNIT_CHECKS)) {
      expect(check.before, unit).toHaveLength(CHECK_LENGTH);
      expect(check.after, unit).toHaveLength(CHECK_LENGTH);
    }
  });

  it("are all well-formed questions with a reason for every wrong answer", () => {
    for (const item of all) {
      expect(stepSchema.safeParse(item).success, item.id).toBe(true);
      expect(stepProblems(item), item.id).toEqual([]);
    }
  });

  it("have unique ids and no hints: the first answer is the measurement", () => {
    expect(new Set(all.map((i) => i.id)).size).toBe(all.length);
    for (const item of all) expect(item.hint, item.id).toBeUndefined();
  });

  it("ask different questions before and after", () => {
    for (const [unit, check] of Object.entries(UNIT_CHECKS)) {
      const before = new Set(check.before.map((i) => i.stimulus));
      for (const item of check.after) expect(before.has(item.stimulus), unit).toBe(false);
    }
  });

  it("use scenarios that appear nowhere in the lessons", async () => {
    const lessons = await lessonText();
    for (const item of all) {
      const opening = (item.stimulus ?? "").toLowerCase().slice(0, 60);
      expect(lessons.includes(opening), item.id).toBe(false);
    }
  });

  it("spread the right answer across positions", () => {
    const counts = [0, 0, 0];
    for (const item of all) counts[item.correct] = (counts[item.correct] ?? 0) + 1;
    for (const count of counts) expect(count / all.length).toBeLessThan(0.45);
  });

  it("don't give the answer away by making it much longer than the others", () => {
    for (const item of all) {
      const right = item.options[item.correct]!.text.length;
      const wrong = item.options.filter((_, i) => i !== item.correct).map((o) => o.text.length);
      expect(right, item.id).toBeLessThanOrEqual(Math.max(...wrong) * 1.5 + 6);
    }
  });

  it("take no side on party politics", () => {
    const text = JSON.stringify(all);
    for (const word of ["republican", "democrat", "labor party", "tory", "election", "abortion"]) {
      expect(new RegExp(`\\b${word}\\b`, "i").test(text), word).toBe(false);
    }
  });
});
