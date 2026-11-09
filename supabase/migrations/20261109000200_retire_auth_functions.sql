-- The auth-based functions from the first migration are unused; close them off.
revoke execute on function public.get_playdate_invite(uuid, uuid) from anon, authenticated, public;
revoke execute on function public.respond_to_playdate(uuid, uuid, text, text, timestamptz, text) from anon, authenticated, public;
revoke all on table public.playdates from anon, authenticated;
