-- The learning state that follows an account across devices.
--
-- Finished lessons, XP and the streak already sync. The rest of what a learner has done lived
-- only on the device: the review queue, skill ratings, drill attempts (accuracy and calibration)
-- and graded writing, so a second phone showed the right map but no reviews due and an empty
-- Skills screen. This keeps one document per account holding all four.
--
-- syncLearningState (service role) is the only reader and writer. It keeps only what it can
-- believe (known lessons, values in range, each part capped), merges a device's copy into the
-- stored one and never removes anything by a sync. `rev` lets two devices syncing at once each
-- merge on top of the other instead of overwriting it. Browser roles can't read or write it.
-- Removing the account removes the row.

CREATE TABLE IF NOT EXISTS public.learning_state (
  user_id uuid PRIMARY KEY REFERENCES auth.users (id) ON DELETE CASCADE,
  state jsonb NOT NULL DEFAULT '{}'::jsonb CHECK (jsonb_typeof(state) = 'object'),
  rev integer NOT NULL DEFAULT 1 CHECK (rev > 0),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT learning_state_bounded CHECK (pg_column_size(state) <= 2000000)
);

ALTER TABLE public.learning_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.learning_state FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.learning_state TO service_role;
