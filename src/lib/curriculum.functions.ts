import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { LESSONS, UNITS, type CurriculumLesson } from "./curriculum";
import type { Lesson } from "./courses";

const Input = z.object({ lessonId: z.string().min(1) });

export type LessonContentResult =
  { ok: true; lesson: Lesson; cached: boolean } | { ok: false; reason: string };

const MODEL = "google/gemini-3.6-flash";

function describe(error: unknown): string {
  const text = String((error as { message?: string })?.message ?? error ?? "unknown");
  console.error("Curriculum lesson generation failed:", text);
  if (/402|credit|quota|billing|payment/i.test(text)) {
    return "The AI workspace is out of credits, so this lesson couldn't be written. Top up AI credits and try again.";
  }
  if (/429|rate.?limit/i.test(text)) {
    return "The tutor is rate limited right now. Wait a moment and try again.";
  }
  return "This lesson couldn't be written just now. Try again in a moment.";
}

/**
 * Fetches one curriculum lesson's content. Content is generated once through the
 * AI pipeline, strictly constrained to that lesson's objective, then cached by
 * lesson id in the database so every learner sees the same lesson.
 */
export const getCurriculumLesson = createServerFn({ method: "POST" })
  .inputValidator((input: unknown) => Input.parse(input))
  .handler(async ({ data }): Promise<LessonContentResult> => {
    const meta: CurriculumLesson | undefined = LESSONS.find((l) => l.id === data.lessonId);
    if (!meta) return { ok: false, reason: "That lesson isn't part of the curriculum." };

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const cached = await supabaseAdmin
      .from("curriculum_lessons")
      .select("content")
      .eq("lesson_id", meta.id)
      .maybeSingle();
    const cachedLesson = cached.data?.content as unknown as Lesson | undefined;
    // Rows cached before phase 2 have no exercises: regenerate those.
    if (cachedLesson?.exercises && cachedLesson.exercises.length >= 3) {
      return { ok: true, lesson: cachedLesson, cached: true };
    }

    const key = process.env["LOVABLE_API_KEY"];
    if (!key) return { ok: false, reason: "AI isn't configured for this project yet." };

    try {
      const { streamText } = await import("ai");
      const { createLovableAiGatewayProvider } = await import("./ai-gateway.server");
      const { screenOutput } = await import("./moderation.server");
      const { EXERCISE_SYSTEM, exerciseLessonPrompt, parseExerciseLesson } = await import(
        "./exercise-ai.server"
      );

      const gateway = createLovableAiGatewayProvider(key);
      const result = streamText({
        model: gateway(MODEL),
        system: EXERCISE_SYSTEM,
        prompt: exerciseLessonPrompt(meta),
      });
      const text = await result.text;

      const screened = screenOutput(text);
      if (!screened.allowed) return { ok: false, reason: screened.message };

      const lesson = parseExerciseLesson(text, {
        title: meta.title,
        objective: meta.objective,
        emoji: meta.emoji,
      });
      if (!lesson) {
        return { ok: false, reason: "The tutor's reply couldn't be read as a lesson." };
      }


      const unit = UNITS.find((u) => u.id === meta.unitId);
      await supabaseAdmin.from("curriculum_lessons").upsert(
        {
          lesson_id: meta.id,
          unit_id: unit?.id ?? meta.unitId,
          title: meta.title,
          content: JSON.parse(JSON.stringify(lesson)),
          model: MODEL,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "lesson_id" },
      );

      return { ok: true, lesson, cached: false };
    } catch (error) {
      return { ok: false, reason: describe(error) };
    }
  });
