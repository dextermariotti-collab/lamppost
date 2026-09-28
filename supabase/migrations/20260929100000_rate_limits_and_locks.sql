-- Rate limiting and generation locks for the public AI endpoints.
--
-- The lesson grader, the companion's follow-ups, lesson generation and the drill
-- pool top-up are callable without signing in and spend AI credit. This adds the
-- two small pieces of shared state the server needs to bound that spend:
--
--   rate_limits   fixed-window counters, keyed by an opaque caller key
--                 ("u:<user id>" for a signed-in user, "ip:<keyed hash>" for
--                 everyone: the network address is never stored, only an HMAC of
--                 it) and a bucket (the policy name). Old windows are pruned.
--   server_locks  a lease per piece of work (for example one lesson being
--                 generated), so a burst of cache misses starts one generation,
--                 not one per request.
--
-- Both tables are for the server only: no browser role can read or write them,
-- and the functions can only be run by the service role.

CREATE TABLE IF NOT EXISTS public.rate_limits (
  bucket text NOT NULL,
  key text NOT NULL,
  window_start timestamptz NOT NULL,
  hits integer NOT NULL DEFAULT 0,
  PRIMARY KEY (bucket, key, window_start)
);
CREATE INDEX IF NOT EXISTS rate_limits_window_idx ON public.rate_limits (window_start);

CREATE TABLE IF NOT EXISTS public.server_locks (
  key text PRIMARY KEY,
  expires_at timestamptz NOT NULL
);

ALTER TABLE public.rate_limits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.server_locks ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.rate_limits FROM PUBLIC, anon, authenticated;
REVOKE ALL ON public.server_locks FROM PUBLIC, anon, authenticated;
GRANT ALL ON public.rate_limits TO service_role;
GRANT ALL ON public.server_locks TO service_role;

-- Counts one request against each check, in the order given, and stops at the
-- first check that is over its limit. Put the caller's own limits first and any
-- global limit last: a caller who is already refused then cannot use up everyone
-- else's shared budget by hammering the endpoint.
--
--   _checks = [{ "bucket": "grading", "key": "u:…", "tier": "user-hour",
--                "window_seconds": 3600, "max": 20 }, …]
--
-- Returns one row: allowed, and when not, how long until the window that refused
-- the request ends and which tier it was.
CREATE OR REPLACE FUNCTION public.check_rate_limits(_checks jsonb)
RETURNS TABLE (allowed boolean, retry_after integer, tier text)
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  c jsonb;
  win integer;
  lim integer;
  start_at timestamptz;
  used integer;
BEGIN
  -- Housekeeping, spread across requests instead of needing a scheduled job.
  IF random() < 0.02 THEN
    DELETE FROM public.rate_limits WHERE window_start < now() - interval '3 days';
    DELETE FROM public.server_locks WHERE expires_at < now();
  END IF;

  FOR c IN SELECT * FROM jsonb_array_elements(_checks) LOOP
    win := (c ->> 'window_seconds')::integer;
    lim := (c ->> 'max')::integer;
    IF win IS NULL OR win < 1 OR win > 604800 OR lim IS NULL OR lim < 0 THEN
      RAISE EXCEPTION 'invalid rate limit check' USING ERRCODE = '22023';
    END IF;

    start_at := to_timestamp(floor(extract(epoch FROM now()) / win) * win);
    INSERT INTO public.rate_limits AS r (bucket, key, window_start, hits)
    VALUES (left(c ->> 'bucket', 64), left(c ->> 'key', 96), start_at, 1)
    ON CONFLICT (bucket, key, window_start) DO UPDATE SET hits = r.hits + 1
    RETURNING r.hits INTO used;

    IF used > lim THEN
      RETURN QUERY SELECT
        false,
        greatest(1, ceil(extract(epoch FROM (start_at + make_interval(secs => win) - now())))::integer),
        c ->> 'tier';
      RETURN;
    END IF;
  END LOOP;

  RETURN QUERY SELECT true, 0, NULL::text;
END;
$$;

-- A lease on a named piece of work. True if the caller now holds it; false if
-- someone else holds it and it hasn't expired. Leases expire on their own, so a
-- crashed worker never blocks the work for longer than the TTL.
CREATE OR REPLACE FUNCTION public.acquire_lock(_key text, _ttl_seconds integer)
RETURNS boolean
LANGUAGE plpgsql
SET search_path = public
AS $$
DECLARE
  got boolean;
BEGIN
  INSERT INTO public.server_locks AS l (key, expires_at)
  VALUES (left(_key, 96), now() + make_interval(secs => greatest(_ttl_seconds, 1)))
  ON CONFLICT (key) DO UPDATE SET expires_at = EXCLUDED.expires_at
    WHERE l.expires_at < now()
  RETURNING true INTO got;
  RETURN coalesce(got, false);
END;
$$;

CREATE OR REPLACE FUNCTION public.release_lock(_key text)
RETURNS void
LANGUAGE sql
SET search_path = public
AS $$
  DELETE FROM public.server_locks WHERE key = left(_key, 96);
$$;

REVOKE EXECUTE ON FUNCTION public.check_rate_limits(jsonb) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.acquire_lock(text, integer) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.release_lock(text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.check_rate_limits(jsonb) TO service_role;
GRANT EXECUTE ON FUNCTION public.acquire_lock(text, integer) TO service_role;
GRANT EXECUTE ON FUNCTION public.release_lock(text) TO service_role;
