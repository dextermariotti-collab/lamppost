-- Rollback for supabase/migrations/20261026100000_learning_state.sql.
--
-- Drops the account copy of the learning state (reviews, skill ratings, drill attempts, graded
-- writing). Each device keeps its own copy, and syncLearningState reads a missing table as
-- "nothing stored on the account", so nothing else needs to change. Safe to run more than once.

DROP TABLE IF EXISTS public.learning_state;
