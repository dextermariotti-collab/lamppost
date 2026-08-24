REVOKE ALL ON FUNCTION public.search_profiles(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.profile_by_invite(text) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.are_friends(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.is_friendship_member(uuid, uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.random_code(integer) FROM PUBLIC, anon;

GRANT EXECUTE ON FUNCTION public.search_profiles(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.profile_by_invite(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.are_friends(uuid, uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_friendship_member(uuid, uuid) TO authenticated;