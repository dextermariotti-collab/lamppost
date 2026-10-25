-- Formerly drizzle/migrations/0001_create_argument_attempts.sql, which was applied with drizzle-kit between the
-- 2026-09-07 and 2026-09-28 Supabase migrations. Kept unchanged, in that same order.

CREATE TABLE public.argument_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id TEXT NOT NULL,
  lesson_title TEXT NOT NULL,
  attempt INTEGER NOT NULL DEFAULT 1,
  answer TEXT NOT NULL,
  scores JSONB NOT NULL DEFAULT '{}'::jsonb,
  tip TEXT,
  total INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.argument_attempts TO authenticated;
GRANT ALL ON public.argument_attempts TO service_role;

ALTER TABLE public.argument_attempts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Learners read their own argument attempts"
  ON public.argument_attempts FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Learners insert their own argument attempts"
  ON public.argument_attempts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE INDEX argument_attempts_user_lesson_idx
  ON public.argument_attempts (user_id, lesson_id, created_at DESC);