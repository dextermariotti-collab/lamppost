import { CONTENT_POLICY_RULES } from "./moderation.server";
import { EXERCISE_LABEL, EXERCISE_QUESTION, describeExercise, type Exercise } from "./exercises";
import type { CurriculumLesson } from "./curriculum";
import { extractJson } from "./exercise-ai.server";

/**
 * Second AI pass over a freshly generated lesson. It checks each drill for the
 * four failure modes we actually hit in play: a keyed answer that isn't the best
 * answer, content that contradicts the drill's own instruction, a drill that
 * drifts off the lesson objective, and feedback that argues for a different
 * option than the key.
 */

export const VALIDATION_SYSTEM = `You are a strict reviewer of critical-thinking drills. You do not rewrite anything; you judge.
For each drill you are given, decide whether ALL of these hold:
1. Exactly one option is clearly the best answer AND it is the one keyed as correct.
2. The content matches the drill type's instruction (e.g. a "rank the evidence" drill contains real,
   checkable evidence for a stated claim — never premises, restatements or opinions).
3. The drill tests the stated lesson objective, not a different skill.
4. The explanation/feedback agrees with the keyed answer and does not argue for another option.

Reply with ONLY minified JSON:
{"results":[{"index":number,"pass":boolean,"problem":string,"betterCorrect":number|null}]}
- one entry per drill, index as given.
- "problem" is one specific sentence when pass is false, otherwise "".
- "betterCorrect": if the ONLY fault is that a different listed option is clearly the best answer,
  give that option's 0-based index. Otherwise null.
Be demanding: if two options could each be defended as the best answer, that drill fails.

${CONTENT_POLICY_RULES}`;

export function validationPrompt(lesson: CurriculumLesson, exercises: Exercise[]) {
  const drills = exercises
    .map((exercise, index) => {
      const key =
        "correct" in exercise && typeof exercise.correct === "number"
          ? `\nKeyed correct option index: ${exercise.correct}`
          : "";
      const explanation =
        "explanation" in exercise && exercise.explanation
          ? `\nExplanation shown after answering: ${exercise.explanation}`
          : "";
      return `--- drill index ${index}
Type: ${EXERCISE_LABEL[exercise.kind]} — instruction shown to learner: "${EXERCISE_QUESTION[exercise.kind]}"
Content: ${describeExercise(exercise)}${key}${explanation}`;
    })
    .join("\n");

  return `Lesson: "${lesson.title}"
Objective every drill must train: ${lesson.objective}

${drills}

Review all ${exercises.length} drills now.`;
}

export type DrillVerdict = {
  index: number;
  pass: boolean;
  problem: string;
  betterCorrect: number | null;
};

export function parseVerdicts(text: string, count: number): DrillVerdict[] | null {
  const root = extractJson(text);
  const raw = root?.["results"] ?? root?.["drills"] ?? root?.["verdicts"];
  if (!Array.isArray(raw)) return null;

  const verdicts: DrillVerdict[] = [];
  raw.forEach((entry, position) => {
    if (typeof entry !== "object" || entry === null) return;
    const record = entry as Record<string, unknown>;
    const indexRaw = record["index"];
    const index = typeof indexRaw === "number" ? indexRaw : position;
    if (index < 0 || index >= count) return;
    const better = record["betterCorrect"] ?? record["better_correct"];
    verdicts.push({
      index,
      pass: record["pass"] === true || record["ok"] === true,
      problem: typeof record["problem"] === "string" ? record["problem"] : "",
      betterCorrect: typeof better === "number" ? better : null,
    });
  });
  return verdicts.length ? verdicts : null;
}

/** Prompt asking for replacements for just the drills that failed review. */
export function repairPrompt(
  lesson: CurriculumLesson,
  failures: { exercise: Exercise; problem: string }[],
) {
  return `Lesson: "${lesson.title}"
Objective every drill must train: ${lesson.objective}

These drills failed review and must be REPLACED with new ones of the SAME type:
${failures
  .map(
    ({ exercise, problem }, i) =>
      `${i + 1}. type "${exercise.kind}" (${EXERCISE_LABEL[exercise.kind]}) — reviewer said: ${problem || "the keyed answer was not clearly the best answer."}
   rejected content: ${describeExercise(exercise)}`,
  )
  .join("\n")}

Write brand-new drills on fresh material. Do not reuse the rejected scenarios.
Reply with ONLY minified JSON: {"exercises":[Exercise]} containing exactly ${failures.length}
drills, in the order listed, using the same JSON shapes and key names as before.`;
}
