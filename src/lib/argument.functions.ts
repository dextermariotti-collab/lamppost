import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { screenLocally } from "./moderation";
import { RUBRIC_CRITERIA, type ArgumentGrade, type RubricCriterion } from "./exercises";

const MODEL = "google/gemini-3.6-flash";

const GradeInput = z.object({
  lessonId: z.string().min(1),
  lessonTitle: z.string().min(1),
  objective: z.string().min(1),
  prompt: z.string().min(1),
  answer: z.string().min(1).max(4000),
  attempt: z.number().int().min(1).max(2),
});

export type GradeResult =
  | { ok: true; grade: ArgumentGrade; onTopic: boolean }
  | { ok: false; reason: string; blocked?: boolean };

const clampScore = (value: unknown) =>
  Math.min(4, Math.max(1, Math.round(typeof value === "number" ? value : 1)));

function parseGrade(text: string): { grade: ArgumentGrade; onTopic: boolean } | null {
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
  for (const criterion of RUBRIC_CRITERIA) {
    const entry = (scoresRaw[criterion] ?? {}) as Record<string, unknown>;
    scores[criterion as RubricCriterion] = {
      score: clampScore(entry["score"]),
      feedback:
        typeof entry["feedback"] === "string" && entry["feedback"].trim()
          ? entry["feedback"].trim().slice(0, 300)
          : "Nothing here yet to grade on this criterion.",
    };
  }
  const total = RUBRIC_CRITERIA.reduce((sum, c) => sum + scores[c].score, 0);
  const tip =
    typeof raw["tip"] === "string" && raw["tip"].trim()
      ? raw["tip"].trim().slice(0, 300)
      : "Add one sentence naming the strongest objection, then answer it.";
  return { grade: { scores, tip, total }, onTopic: raw["onTopic"] !== false };
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
  .inputValidator((input: unknown) => GradeInput.parse(input))
  .handler(async ({ data }): Promise<GradeResult> => {
    const screened = screenLocally(data.answer);
    if (!screened.allowed) return { ok: false, reason: screened.message, blocked: true };
    if (data.answer.trim().split(/\s+/).length < 12) {
      return { ok: false, reason: "Write at least three sentences so there's an argument to grade." };
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { GRADER_SYSTEM, graderPrompt } = await import("./argument.server");
      const gateway = createLovableAiGatewayProvider(key);

      const result = streamText({
        model: gateway(MODEL),
        system: GRADER_SYSTEM,
        prompt: graderPrompt(data),
        maxRetries: 1,
      });
      const text = await result.text;
      const parsed = parseGrade(text);
      if (!parsed) return { ok: false, reason: "The grader's reply couldn't be read. Try again." };
      return { ok: true, ...parsed };
    } catch (error) {
      return { ok: false, reason: describe(error) };
    }
  });

const SaveInput = z.object({
  lessonId: z.string().min(1),
  lessonTitle: z.string().min(1),
  attempt: z.number().int().min(1).max(2),
  answer: z.string().min(1).max(4000),
  scores: z.record(z.string(), z.object({ score: z.number(), feedback: z.string() })),
  tip: z.string(),
  total: z.number(),
});

/** Stores one graded attempt for the signed-in learner. */
export const saveArgumentAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => SaveInput.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context as unknown as {
      supabase: { from: (t: string) => any };
      userId: string;
    };
    const { error } = await supabase.from("argument_attempts").insert({
      user_id: userId,
      lesson_id: data.lessonId,
      lesson_title: data.lessonTitle,
      attempt: data.attempt,
      answer: data.answer,
      scores: data.scores,
      tip: data.tip,
      total: data.total,
    });
    if (error) console.error("Could not store argument attempt", error);
    return { ok: !error };
  });
