import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { AI_MODELS } from "./ai-models";
import { screenLocally } from "./moderation";
import { LESSONS } from "./curriculum";
import { WRITTEN_TASKS, type ArgumentGrade, type RubricCriterion } from "./exercises";
import { limitedFailure, type LimitedFailure } from "./rate-limit";

const MODEL = AI_MODELS.grading;

/** Longest answer the grader will read; matches the answer box in the lesson. */
export const MAX_ANSWER_CHARS = 3000;

/**
 * Everything the grader is sent is bounded, and it can only be asked about a
 * lesson that exists — so it can't be used as a free general-purpose model.
 */
export const GradeInput = z.object({
  lessonId: z
    .string()
    .min(1)
    .max(80)
    .refine((id) => LESSONS.some((lesson) => lesson.id === id), "Unknown lesson"),
  lessonTitle: z.string().min(1).max(160),
  objective: z.string().min(1).max(400),
  taskType: z.enum(["restate", "case", "critique", "testable", "steelmanWrite"]),
  passage: z.string().min(1).max(2000),
  prompt: z.string().min(1).max(600),
  answer: z.string().min(1).max(MAX_ANSWER_CHARS),
  attempt: z.number().int().min(1).max(2),
  /** Rubric criterion this learner is weakest on, so feedback leans on it. */
  focus: z.string().max(40).nullish(),
});

export type GradeResult =
  | { ok: true; grade: ArgumentGrade; onTopic: boolean }
  | { ok: false; reason: string; blocked?: boolean }
  | LimitedFailure;

const clampScore = (value: unknown) =>
  Math.min(4, Math.max(1, Math.round(typeof value === "number" ? value : 1)));

export function parseGrade(
  text: string,
  criteria: readonly RubricCriterion[],
): { grade: ArgumentGrade; onTopic: boolean } | null {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return null;
  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(match[0]) as Record<string, unknown>;
  } catch {
    return null;
  }
  const scoresRaw = (raw["scores"] ?? {}) as Record<string, unknown>;
  const scores = {} as ArgumentGrade["scores"];
  for (const criterion of criteria) {
    const entry = (scoresRaw[criterion] ?? {}) as Record<string, unknown>;
    scores[criterion] = {
      score: clampScore(entry["score"]),
      feedback:
        typeof entry["feedback"] === "string" && entry["feedback"].trim()
          ? entry["feedback"].trim().slice(0, 300)
          : "Nothing here yet to grade on this criterion.",
    };
  }
  const total = criteria.reduce((sum, c) => sum + (scores[c]?.score ?? 0), 0);
  const tip =
    typeof raw["tip"] === "string" && raw["tip"].trim()
      ? raw["tip"].trim().slice(0, 300)
      : "Add one sentence naming the strongest objection, then answer it.";
  return {
    grade: { scores, tip, total, max: criteria.length * 4 },
    onTopic: raw["onTopic"] !== false,
  };
}

function describe(error: unknown): string {
  const text = String((error as { message?: string })?.message ?? error ?? "unknown");
  console.error("Argument grading failed:", text);
  if (/402|credit|quota|billing|payment/i.test(text)) {
    return "Grading is unavailable — the AI workspace is out of credits.";
  }
  if (/429|rate.?limit/i.test(text)) return "Grading is busy right now. Try again in a moment.";
  return "Grading couldn't run just now. Try again in a moment.";
}

/**
 * Grades one written argument against the four-criterion rubric. Public so the
 * lesson works signed out; the learner's text is screened before it is sent and
 * the grader is instructed to refuse off-topic or unsafe answers.
 */
export const gradeArgument = createServerFn({ method: "POST" })
  .validator((input: unknown) => GradeInput.parse(input))
  .handler(async ({ data }): Promise<GradeResult> => {
    const screened = screenLocally(data.answer);
    if (!screened.allowed) return { ok: false, reason: screened.message, blocked: true };
    const task = WRITTEN_TASKS[data.taskType];
    const words = data.answer.trim().split(/\s+/).length;
    const minWords =
      data.taskType === "restate" || data.taskType === "testable"
        ? 5
        : data.taskType === "critique"
          ? 15
          : 25;
    if (words < minWords) {
      return {
        ok: false,
        reason: `Write ${task.length} so there's something to grade.`,
      };
    }

    const key = process.env["AI_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    // Everything above is free. Only a request that would really call the model is counted.
    const { limiter } = await import("./rate-limit.server");
    const verdict = await limiter().enforce("grading");
    if (!verdict.ok) return limitedFailure(verdict);

    try {
      const { streamText } = await import("ai");
      const { createAiProvider } = await import("./ai-gateway.server");
      const { graderSystem, graderPrompt } = await import("./argument.server");
      const { withGuardrails } = await import("./ai-guardrails.server");
      const { screenOutput } = await import("./moderation.server");
      const gateway = createAiProvider(key);

      const result = streamText({
        model: gateway(MODEL),
        system: withGuardrails(graderSystem(data.taskType)),
        prompt: graderPrompt(data),
        maxRetries: 1,
      });
      const text = await result.text;
      if (!screenOutput(text).allowed)
        return {
          ok: false,
          reason: "That answer can't be graded here. Try writing about the passage.",
        };
      const parsed = parseGrade(text, task.criteria);
      if (!parsed) return { ok: false, reason: "The grader's reply couldn't be read. Try again." };
      await storeAttempt(data, parsed.grade);
      return { ok: true, ...parsed };
    } catch (error) {
      return { ok: false, reason: describe(error) };
    }
  });

/**
 * Keeps a signed-in learner's graded attempt. It is written here, from the grade
 * this function just produced, rather than relayed by the browser — so the stored
 * scores are the grader's, not whatever a client claims. Guests are simply not
 * stored. Never fails the grading itself.
 */
async function storeAttempt(
  input: z.infer<typeof GradeInput>,
  grade: ArgumentGrade,
): Promise<void> {
  try {
    const { optionalUserId } = await import("./optional-auth.server");
    const userId = await optionalUserId();
    if (!userId) return;
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.from("argument_attempts").insert({
      user_id: userId,
      lesson_id: input.lessonId,
      lesson_title: input.lessonTitle,
      attempt: input.attempt,
      answer: input.answer,
      scores: JSON.parse(JSON.stringify(grade.scores)),
      tip: grade.tip,
      total: grade.total,
    });
    if (error) console.error("Could not store argument attempt", error);
  } catch (error) {
    console.error("Could not store argument attempt", error);
  }
}
