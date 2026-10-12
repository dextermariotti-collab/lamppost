-- Daily cases written by an AI, one per local day.
--
-- The daily case comes from a written library first. A learner who has read every
-- case in it would otherwise get an old one back, so the server asks an AI to write
-- a fresh case for that day, checks it (format, content rules, and a second AI pass
-- that reviews every answer), and keeps it here. Everyone who needs a case on that
-- day gets the same one, so a day costs one generation however many learners ask.
--
-- Nothing about a person is stored: the row is the case and the model that wrote it.
-- Server only: no browser role can read or write it.

CREATE TABLE IF NOT EXISTS public.generated_cases (
  day text PRIMARY KEY CHECK (day ~ '^\d{4}-\d{2}-\d{2}$'),
  content jsonb NOT NULL,
  model text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.generated_cases ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.generated_cases FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.generated_cases TO service_role;
