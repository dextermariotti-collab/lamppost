-- Formerly drizzle/migrations/0000_create_curriculum_lesson_cache.sql, which was applied with drizzle-kit between the
-- 2026-09-07 and 2026-09-28 Supabase migrations. Kept unchanged, in that same order.

CREATE TABLE public.curriculum_lessons (
  lesson_id TEXT PRIMARY KEY,
  unit_id TEXT NOT NULL,
  title TEXT NOT NULL,
  content JSONB NOT NULL,
  model TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT ON public.curriculum_lessons TO anon;
GRANT SELECT ON public.curriculum_lessons TO authenticated;
GRANT ALL ON public.curriculum_lessons TO service_role;

ALTER TABLE public.curriculum_lessons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Curriculum lesson content is readable"
  ON public.curriculum_lessons FOR SELECT
  TO anon, authenticated
  USING (true);