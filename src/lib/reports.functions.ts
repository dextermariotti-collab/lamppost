import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const REPORT_REASONS = [
  { value: "sexual", label: "Sexual or adult content" },
  { value: "minors", label: "Involves or targets minors" },
  { value: "violence", label: "Violent or dangerous instructions" },
  { value: "self-harm", label: "Self-harm or eating disorders" },
  { value: "hate", label: "Hateful or discriminatory" },
  { value: "medical", label: "Unsafe medical, fitness or financial advice" },
  { value: "inaccurate", label: "Factually wrong or misleading" },
  { value: "copyright", label: "Copied from someone else's work" },
  { value: "other", label: "Something else" },
] as const;

export type ReportInput = {
  reason: string;
  details?: string;
  courseSlug?: string;
  courseTopic?: string;
  lessonIndex?: number;
  lessonTitle?: string;
  excerpt?: string;
};

export const submitContentReport = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: ReportInput) => {
    const reason = String(input?.reason ?? "").slice(0, 40);
    if (!REPORT_REASONS.some((r) => r.value === reason)) {
      throw new Error("Pick a reason for the report.");
    }
    return {
      reason,
      details: String(input.details ?? "").slice(0, 2000),
      courseSlug: String(input.courseSlug ?? "").slice(0, 120),
      courseTopic: String(input.courseTopic ?? "").slice(0, 200),
      lessonIndex:
        typeof input.lessonIndex === "number" && Number.isFinite(input.lessonIndex)
          ? Math.round(input.lessonIndex)
          : null,
      lessonTitle: String(input.lessonTitle ?? "").slice(0, 200),
      excerpt: String(input.excerpt ?? "").slice(0, 4000),
    };
  })
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.from("content_reports").insert({
      user_id: context.userId,
      reason: data.reason,
      details: data.details || null,
      course_slug: data.courseSlug || null,
      course_topic: data.courseTopic || null,
      lesson_index: data.lessonIndex,
      lesson_title: data.lessonTitle || null,
      excerpt: data.excerpt || null,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });
