CREATE OR REPLACE FUNCTION public.has_friend_link(_a uuid, _b uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.friendships
    WHERE (requester_id = _a AND addressee_id = _b) OR (requester_id = _b AND addressee_id = _a)
  );
$$;

REVOKE ALL ON FUNCTION public.has_friend_link(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.has_friend_link(uuid, uuid) TO authenticated;

DROP POLICY IF EXISTS "Friends can view each other's profile" ON public.profiles;

CREATE POLICY "Connected users can view each other's profile"
  ON public.profiles FOR SELECT TO authenticated
  USING (public.has_friend_link(auth.uid(), id));