-- Anyone holding an invite link can read it; never include the guest's phone/email.
create or replace function public.pd_get_invite(p_id uuid, p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'data', p.data - 'guestPhone' - 'guestEmail', 'start_at', p.start_at,
    'duration_min', p.duration_min, 'status', p.status, 'reply', p.reply)
  from public.pd_playdates p where p.id = p_id and p.guest_token = p_token;
$$;
