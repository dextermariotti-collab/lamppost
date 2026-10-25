-- Formerly drizzle/migrations/0003_drill_difficulty_and_profile_goal.sql, which was applied with drizzle-kit between the
-- 2026-09-07 and 2026-09-28 Supabase migrations. Kept unchanged, in that same order.

ALTER TABLE public.drill_variants ADD COLUMN IF NOT EXISTS difficulty integer NOT NULL DEFAULT 2;
ALTER TABLE public.drill_variants ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal text;
CREATE INDEX IF NOT EXISTS drill_variants_lesson_kind_difficulty_idx
  ON public.drill_variants (lesson_id, kind, difficulty);