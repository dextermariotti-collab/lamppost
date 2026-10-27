-- Holding area for a lesson that is being written piece by piece.
--
-- A lesson that isn't cached yet used to be written in one long request (the idea
-- card, every drill and the written task, then a review pass): about a minute and
-- a half, with the learner staring at a loading screen. It is now written in
-- parts — the idea card first, then each drill and the written task in parallel —
-- so the learner can start reading after a few seconds and the drills appear as
-- they finish.
--
-- Each finished part is kept here until the whole set is complete, when the server
-- assembles it into curriculum_lessons (where lessons are served from) and clears
-- these rows. Parts of an older content version are ignored and cleaned up.
--
-- Server only: no browser role can read or write it.

CREATE TABLE IF NOT EXISTS public.lesson_parts (
  lesson_id text NOT NULL,
  -- 'concept', 'written', or 'drill:<n>' for the n-th drill of the lesson's plan
  part text NOT NULL,
  content_version integer NOT NULL,
  content jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (lesson_id, part)
);
CREATE INDEX IF NOT EXISTS lesson_parts_created_idx ON public.lesson_parts (created_at);

ALTER TABLE public.lesson_parts ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.lesson_parts FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.lesson_parts TO service_role;
