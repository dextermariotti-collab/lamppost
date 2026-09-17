ALTER TABLE public.drill_variants ADD COLUMN IF NOT EXISTS difficulty integer NOT NULL DEFAULT 2;
ALTER TABLE public.drill_variants ADD COLUMN IF NOT EXISTS domain text;
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS goal text;
CREATE INDEX IF NOT EXISTS drill_variants_lesson_kind_difficulty_idx
  ON public.drill_variants (lesson_id, kind, difficulty);