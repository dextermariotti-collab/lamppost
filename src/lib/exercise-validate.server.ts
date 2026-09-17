import { CONTENT_POLICY_RULES } from "./moderation.server";
import { EXERCISE_LABEL, EXERCISE_QUESTION, type Exercise } from "./exercises";
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
Each drill is given to you as JSON, including its answer key.
For each drill, decide whether ALL of these hold:
1. For a multiple-choice drill (claim, flaw, assumption, predict, steelman): exactly one option is
   clearly the best answer AND it is the one keyed as "correct". Rank drills have no keyed index —
   their "items" must simply be listed strongest evidence first. Sort drills are keyed per statement.
2. The content matches the drill type's instruction. In particular a "rank" drill's items must be
   real, checkable evidence offered for the stated claim (studies, measurements, records, testimony) —
   never premises, restatements of the claim, opinions or conclusions.
3. The drill's material is relevant to the lesson's skill. The drill TYPE was chosen deliberately by
   the curriculum, so NEVER fail a drill merely because its type differs from the objective's wording
   (a "spot the flaw" drill in a lesson about restating claims is expected and fine). Fail on this
   point only when the drill is about an unrelated topic or teaches a different skill entirely.
4. The explanation/feedback agrees with the keyed answer and does not argue for another option.
5. NO INVENTED FACTS. The drill must not present a made-up study, statistic, institution, researcher or
   named source as though it were real. A scenario built on a hypothetical is fine ONLY if it is openly
   marked as hypothetical (e.g. it begins "Hypothetical scenario:"). Fail any drill that says
   researchers/scientists/a university found something specific unless that finding is genuinely
   famous and well established.
6. NO GIVEAWAY WORDING. Options must be the same style and roughly the same length, and must not carry
   their own justification inside them ("because…", "since…", "which shows…", "…was assumed, not
   created"). Fail the drill if the keyed option can be identified from its wording, its length or its
   extra detail rather than from reasoning about the material.
7. THE KEYED OPTION DOES NOT REUSE THE CONCEPT CARD'S DISTINCTIVE WORDING. If the card's phrasing is
   quoted back in the correct option, the drill is a matching exercise, not reasoning — fail it.
8. DISTRACTORS ARE REAL MISTAKES a thoughtful person would make on this material: a weaker but
   tempting diagnosis, the popular-but-wrong answer, or a true statement that isn't what was asked.
   Fail any drill with an obviously silly or throwaway option.
9. THE DRILL TESTS THIS LESSON'S KEY IDEA AND ITS NAMED TRAP, not critical thinking in general.
10. For a "claim" drill, fail it if the keyed sentence is simply the last sentence of the passage AND
   nothing else in the passage makes it the conclusion — position must not be the giveaway.
11. For a "predict" drill, the answer must follow from a genuinely well-established finding or be
   computable from the scenario. Fail anything that asks the learner to guess how hypothetical
   people reacted.




Reply with ONLY minified JSON:
{"results":[{"index":number,"pass":boolean,"problem":string,"betterCorrect":number|null}]}
- one entry per drill, index as given.
- "problem" is one specific sentence when pass is false, otherwise "".
- "betterCorrect": if the ONLY fault is that a different listed option is clearly the best answer,
  give that option's 0-based index. Otherwise null.
Be demanding about points 1, 2, 4, 5 and 6: if two options could each be defended as the best answer,
fail; if the answer can be read off the wording, fail; if a study is invented as fact, fail.
Never fail a drill for missing fields that its type does not have.

${CONTENT_POLICY_RULES}`;

function answerKey(exercise: Exercise) {
  if ("correct" in exercise && typeof exercise.correct === "number") {
    return `Answer key: option index ${exercise.correct} — "${exercise.options[exercise.correct]}"`;
  }
  switch (exercise.kind) {
    case "rank":
      return "Answer key: the items as listed, strongest evidence first.";
    case "order":
      return "Answer key: the cards as listed, in the correct sequence.";
    case "sort":
      return "Answer key: the bucket named on each statement.";
    case "highlight":
      return `Answer key: token indexes ${exercise.targets.join(", ")} must be tapped.`;
    case "numeric":
      return `Answer key: ${exercise.answer} (tolerance ${exercise.tolerance}).`;
    case "slider":
      return `Answer key: confidence should move ${exercise.direction} by about ${exercise.size} points.`;
    default:
      return "Answer key: as given in the JSON.";
  }
}

export function validationPrompt(
  lesson: CurriculumLesson,
  exercises: Exercise[],
  conceptBody?: string,
) {
  const drills = exercises
    .map((exercise, index) => {
      const instruction =
        "question" in exercise && exercise.question
          ? exercise.question
          : EXERCISE_QUESTION[exercise.kind];
      return `--- drill index ${index}
Type: ${EXERCISE_LABEL[exercise.kind]} — instruction shown to learner: "${instruction}"
${answerKey(exercise)}
JSON: ${JSON.stringify(exercise)}`;
    })
    .join("\n");

  return `Lesson: "${lesson.title}"
Lesson skill: ${lesson.objective}
KEY IDEA the lesson teaches: ${lesson.keyIdea}
THE TRAP every drill must test: ${lesson.trap}
The curriculum deliberately assigned these drill types to this lesson: ${lesson.drills.join(", ")}.
${conceptBody ? `Concept card shown before the drills (its wording must NOT be reused in a keyed option):\n"${conceptBody}"` : ""}

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
   rejected content: ${JSON.stringify(exercise)}`,
  )
  .join("\n")}

Write brand-new drills on fresh material. Do not reuse the rejected scenarios.
Reply with ONLY minified JSON: {"exercises":[Exercise]} containing exactly ${failures.length}
drills, in the order listed, using the same JSON shapes and key names as before.`;
}
