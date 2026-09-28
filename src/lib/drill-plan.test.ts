import { describe, expect, it } from "vitest";
import { LESSONS } from "./curriculum";
import { EXERCISE_KINDS } from "./exercises";
import { MAX_DRILLS, MIN_DRILLS, drillPlanProblems, exercisesMatchPlan } from "./drill-plan";

describe("every lesson's drill plan", () => {
  it.each(LESSONS.map((l) => [l.id, l.drills] as const))(
    "%s is 4–5 different drills",
    (id, plan) => {
      expect(drillPlanProblems(plan), id).toEqual([]);
      expect(plan.length).toBeGreaterThanOrEqual(MIN_DRILLS);
      expect(plan.length).toBeLessThanOrEqual(MAX_DRILLS);
      expect(new Set(plan).size).toBe(plan.length);
      for (const kind of plan) expect(EXERCISE_KINDS).toContain(kind);
    },
  );

  it("gives lesson 6 (types of evidence) one evidence-ranking drill, not two", () => {
    const lesson = LESSONS[5]!;
    expect(lesson.id).toBe("evidence-types");
    expect(lesson.drills.length).toBeGreaterThanOrEqual(4);
    expect(lesson.drills.filter((k) => k === "rank" || k === "order")).toHaveLength(1);
  });
});

describe("drillPlanProblems", () => {
  it("flags too few, too many, repeated and near-identical drills", () => {
    expect(drillPlanProblems(["claim", "flaw", "judge"])).toEqual(["has 3 drills, needs 4–5"]);
    expect(drillPlanProblems(["claim", "flaw", "judge", "sort", "rank", "predict"])[0]).toContain(
      "has 6 drills",
    );
    expect(drillPlanProblems(["judge", "flaw", "judge", "claim"])).toEqual([
      'repeats the "judge" drill',
    ]);
    expect(drillPlanProblems(["rank", "judge", "order", "flaw"])).toEqual([
      'has both "rank" and "order", which are near-identical',
    ]);
  });

  it("accepts a good plan", () => {
    expect(drillPlanProblems(["rank", "judge", "flaw", "assumption"])).toEqual([]);
  });
});

describe("exercisesMatchPlan", () => {
  const plan = ["rank", "judge", "flaw", "assumption"] as const;

  it("needs exactly the planned kinds in order", () => {
    const of = (kinds: string[]) => kinds.map((kind) => ({ kind })) as never;
    expect(exercisesMatchPlan(of([...plan]), plan)).toBe(true);
    expect(exercisesMatchPlan(of(["rank", "judge", "flaw"]), plan)).toBe(false);
    expect(exercisesMatchPlan(of(["rank", "judge", "assumption", "flaw"]), plan)).toBe(false);
    expect(exercisesMatchPlan(of(["rank", "rank", "flaw", "assumption"]), plan)).toBe(false);
    expect(exercisesMatchPlan(undefined, plan)).toBe(false);
  });
});
