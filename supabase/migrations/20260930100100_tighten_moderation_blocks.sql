-- moderation_blocks: remove a stray privilege.
--
-- The table (topics the moderation filter refused, kept without the person's identity
-- once their account is deleted) is written and read only by server code with the
-- service role. The signed-in role nevertheless held SELECT on it. Row Level Security
-- has no policy for that role, so it could read nothing, but a privilege with nothing
-- behind it is a footgun: the day someone adds a permissive policy to this table it
-- would start leaking. Take the privilege away so the intent is explicit.
--
-- Found by the catalog audit in src/db/rls-audit.test.ts. No data changes.

REVOKE ALL ON public.moderation_blocks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.moderation_blocks TO service_role;
