import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LESSONS } from "./curriculum";
import { EXERCISE_KINDS, describeExercise, type Exercise, type ExerciseKind } from "./exercises";

/**
 * Fresh drill variants for reviews and the daily challenge.
 *
 * A review must not be a memory test of one scenario, so every due item is
 * served as a NEW drill of the same kind on the same skill. Variants are
 * generated once, validated, and cached in the database so the whole app shares
 * a growing pool instead of paying for a generation per learner.
 */

const MODEL = "google/gemini-3.6-flash";
/** Once a lesson+kind has this many variants, stop generating and reuse. */
const POOL_TARGET = 6;

const Input = z.object({
  lessonId: z.string().min(1),
  kind: z.enum(EXERCISE_KINDS),
  seen: z.array(z.number().int()).max(50).default([]),
});

export type DrillVariantResult =
  | { ok: true; variant: number; exercise: Exercise; generated: boolean }
  | { ok: false; reason: string };

function describe(error: unknown): string {
  const text = String((error as { message?: string })?.message ?? error ?? "unknown");
  console.error("Drill variant generation failed:", text);
  if (/402|credit|quota|billing|payment/i.test(text)) {
    return "The AI workspace is out of credits, so a fresh drill couldn't be written.";
  }
  if (/429|rate.?limit/i.test(text)) return "The tutor is busy. Try again in a moment.";
  return "A fresh drill couldn't be written just now. Try again in a moment.";
}

export const getDrillVariant = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<DrillVariantResult> => {
    const meta = LESSONS.find((l) => l.id === data.lessonId);
    if (!meta) return { ok: false, reason: "That lesson isn't part of the curriculum." };
    if (!meta.drills.includes(data.kind)) {
      return { ok: false, reason: "That drill type isn't part of this lesson." };
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const existing =
      (
        await supabaseAdmin
          .from("drill_variants")
          .select("variant, content")
          .eq("lesson_id", meta.id)
          .eq("kind", data.kind)
          .order("variant", { ascending: true })
      ).data ?? [];

    const pool = existing.map((row) => ({
      variant: row.variant,
      exercise: row.content as unknown as Exercise,
    }));
    const unseen = pool.filter((row) => !data.seen.includes(row.variant));

    if (unseen.length > 0) {
      const chosen = unseen[Math.floor(Math.random() * unseen.length)]!;
      return { ok: true, variant: chosen.variant, exercise: chosen.exercise, generated: false };
    }
    if (pool.length >= POOL_TARGET) {
      // Pool is full and all seen: recycle the oldest-seen one rather than grow forever.
      const chosen = pool[Math.floor(Math.random() * pool.length)]!;
      return { ok: true, variant: chosen.variant, exercise: chosen.exercise, generated: false };
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { screenOutput } = await import("./moderation.server");
      const { variantSystemPrompt, variantPrompt, normalizeExercise } =
        await import("./exercise-ai.server");
      const { VALIDATION_SYSTEM, validationPrompt, parseVerdicts } =
        await import("./exercise-validate.server");

      const gateway = createLovableAiGatewayProvider(key);
      const ask = async (system: string, prompt: string) =>
        await streamText({ model: gateway(MODEL), system, prompt, maxRetries: 1 }).text;

      const avoid = pool.slice(-4).map((row) => describeExercise(row.exercise).slice(0, 200));

      for (let attempt = 0; attempt < 2; attempt++) {
        const text = await ask(
          variantSystemPrompt(data.kind),
          variantPrompt(meta, data.kind, avoid),
        );
        const screened = screenOutput(text);
        if (!screened.allowed) return { ok: false, reason: screened.message };

        const { extractJson } = await import("./exercise-ai.server");
        const root = extractJson(text);
        const candidate = normalizeExercise(
          root && Array.isArray(root["exercises"]) ? root["exercises"][0] : root,
        );
        if (!candidate || candidate.kind !== data.kind) continue;

        // Same reviewer the lesson pipeline uses: never serve an unchecked drill.
        const review = await ask(VALIDATION_SYSTEM, validationPrompt(meta, [candidate]));
        const verdicts = parseVerdicts(review, 1);
        const verdict = verdicts?.[0];
        let exercise = candidate;
        if (verdict && !verdict.pass) {
          const fixable =
            verdict.betterCorrect !== null &&
            "options" in candidate &&
            Array.isArray(candidate.options) &&
            verdict.betterCorrect >= 0 &&
            verdict.betterCorrect < candidate.options.length;
          if (!fixable) {
            console.warn(
              `[drills] ${meta.id}/${data.kind}: variant failed review — ${verdict.problem}`,
            );
            continue;
          }
          exercise = { ...candidate, correct: verdict.betterCorrect } as Exercise;
        }

        const variant = (pool[pool.length - 1]?.variant ?? 0) + 1 + attempt;
        await supabaseAdmin.from("drill_variants").insert({
          lesson_id: meta.id,
          kind: data.kind,
          variant,
          content: JSON.parse(JSON.stringify(exercise)),
          model: MODEL,
        });
        return { ok: true, variant, exercise, generated: true };
      }

      if (pool.length > 0) {
        const chosen = pool[Math.floor(Math.random() * pool.length)]!;
        return { ok: true, variant: chosen.variant, exercise: chosen.exercise, generated: false };
      }
      return { ok: false, reason: "This drill didn't pass quality checks. Try again in a moment." };
    } catch (error) {
      return { ok: false, reason: describe(error) };
    }
  });
