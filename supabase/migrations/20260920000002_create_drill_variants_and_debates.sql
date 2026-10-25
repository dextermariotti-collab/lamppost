-- Formerly drizzle/migrations/0002_create_drill_variants_and_debates.sql, which was applied with drizzle-kit between the
-- 2026-09-07 and 2026-09-28 Supabase migrations. Kept unchanged, in that same order.

-- Fresh drill variants: same skill + drill type, new scenario, cached and shared.
CREATE TABLE public.drill_variants (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id text NOT NULL,
  kind text NOT NULL,
  variant integer NOT NULL,
  content jsonb NOT NULL,
  model text,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (lesson_id, kind, variant)
);

GRANT SELECT ON public.drill_variants TO anon;
GRANT SELECT ON public.drill_variants TO authenticated;
GRANT ALL ON public.drill_variants TO service_role;

ALTER TABLE public.drill_variants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Drill variants are readable"
  ON public.drill_variants FOR SELECT
  TO anon, authenticated
  USING (true);

-- Async debate: same prompt, assigned sides, both graded on the same rubric.
CREATE TABLE public.debates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text,
  topic text NOT NULL,
  prompt text NOT NULL,
  passage text NOT NULL,
  challenger_side text NOT NULL,
  opponent_side text NOT NULL,
  challenger_answer text,
  opponent_answer text,
  challenger_scores jsonb,
  opponent_scores jsonb,
  challenger_total integer,
  opponent_total integer,
  challenger_tip text,
  opponent_tip text,
  max_score integer NOT NULL DEFAULT 16,
  status text NOT NULL DEFAULT 'open',
  challenger_seen_result boolean NOT NULL DEFAULT false,
  opponent_seen_result boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX debates_participants_idx ON public.debates (challenger_id, opponent_id, created_at DESC);

GRANT SELECT, INSERT, UPDATE ON public.debates TO authenticated;
GRANT ALL ON public.debates TO service_role;

ALTER TABLE public.debates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Participants can view their debates"
  ON public.debates FOR SELECT
  TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE POLICY "Challenger can open a debate with a friend"
  ON public.debates FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = challenger_id AND public.are_friends(auth.uid(), opponent_id));

CREATE POLICY "Participants can update their debate"
  ON public.debates FOR UPDATE
  TO authenticated
  USING (auth.uid() = challenger_id OR auth.uid() = opponent_id)
  WITH CHECK (auth.uid() = challenger_id OR auth.uid() = opponent_id);

CREATE TRIGGER debates_touch_updated_at
  BEFORE UPDATE ON public.debates
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();