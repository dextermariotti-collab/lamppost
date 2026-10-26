import { describe, expect, it } from "vitest";
import { loadLessonScript } from "@/content/lessons";
import { LESSONS } from "./curriculum";
import type { ExerciseKind } from "./exercises";
import { pickReviewStep, placementStep, reviewSession, stepExcerpt } from "./review-steps";
import type { ScheduledDrill } from "./review-drills";
import type { LessonScript } from "./steps/types";

const script = {
  lessonId: "l",
  steps: [
    { id: "n", kind: "note", prompt: "A note." },
    { id: "a", kind: "choice", prompt: "A?" },
    { id: "b", kind: "choice", prompt: "B?" },
    { id: "c", kind: "choice", prompt: "C?" },
    { id: "d", kind: "choice", prompt: "D?" },
  ],
} as unknown as LessonScript;
const plan: ExerciseKind[] = ["claim", "flaw"];
const ids = (pick: ReturnType<typeof pickReviewStep>) => pick?.step.id;

describe("pickReviewStep", () => {
  it("asks a step that borrowed the item's kind (graded steps take the plan's kinds in turn)", () => {
    expect(ids(pickReviewStep(script, plan, "claim", [], {}))).toBe("a");
    expect(ids(pickReviewStep(script, plan, "flaw", [], {}))).toBe("b");
  });

  it("asks the step the learner got wrong first", () => {
    const attempts = { "l#103": { answer: null, score: 0.5, at: 1 } };
    expect(ids(pickReviewStep(script, plan, "claim", [], attempts))).toBe("c");
  });

  it("asks one not served lately, then comes round in turn once all have been", () => {
    expect(ids(pickReviewStep(script, plan, "claim", [101], {}))).toBe("c");
    expect(ids(pickReviewStep(script, plan, "claim", [101, 103], {}))).toBe("a");
    expect(ids(pickReviewStep(script, plan, "claim", [101, 103, 7], {}))).toBe("c");
  });

  it("serves the step's position, offset so it never collides with an old drill's number", () => {
    expect(pickReviewStep(script, plan, "flaw", [], {})?.variant).toBe(102);
  });

  it("falls back to any graded step for a kind the plan no longer has", () => {
    expect(ids(pickReviewStep(script, plan, "sort", [], {}))).toBe("a");
  });
});

describe("the authored lessons", () => {
  it("give every planned kind of every lesson a question, and a placement question", async () => {
    const missing: string[] = [];
    for (const lesson of LESSONS) {
      const loaded = await loadLessonScript(lesson.unitId, lesson.id);
      if (!loaded.ok) {
        missing.push(`${lesson.id}: no script`);
        continue;
      }
      for (const kind of lesson.drills) {
        if (!pickReviewStep(loaded.script, lesson.drills, kind, [], {})) {
          missing.push(`${lesson.id}#${kind}`);
        }
      }
      const placing = placementStep(loaded.script);
      if (!placing || placing.kind === "note") missing.push(`${lesson.id}: placement`);
    }
    expect(missing).toEqual([]);
  });
});

describe("reviewSession", () => {
  const item = (lessonId: string) =>
    ({
      key: `${lessonId}#claim`,
      lessonId,
      kind: "claim",
      seen: [],
      reason: "missed",
    }) as unknown as ScheduledDrill;

  it("leaves out an item whose lesson can't be loaded, counting it as skipped", async () => {
    const [first, second] = [LESSONS[0]!.id, LESSONS[1]!.id];
    const session = await reviewSession(
      [item(first), item(second), item("not-a-lesson")],
      async (_unit, lessonId) =>
        lessonId === second
          ? { ok: false, reason: "missing" }
          : { ok: true, script: { ...script, lessonId } },
      {},
    );
    expect(session.questions.map((q) => q.item.lessonId)).toEqual([first]);
    expect(session.skipped).toBe(2);
  });
});

describe("stepExcerpt", () => {
  it("quotes a step's words, not its ids", () => {
    const text = stepExcerpt({
      id: "s1",
      kind: "choice",
      prompt: "Which is the claim?",
      options: [{ id: "o1", text: "The pool opens early" }],
    } as never);
    expect(text).toContain("Which is the claim?");
    expect(text).toContain("The pool opens early");
    expect(text).not.toMatch(/\bs1\b|\bo1\b|choice/);
  });
});
