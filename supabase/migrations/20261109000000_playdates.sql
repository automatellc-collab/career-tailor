-- Playdates: hosts own their rows; guests act only through token-checked RPCs.
create table public.playdates (
  id uuid primary key,
  host_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  guest_token uuid not null default gen_random_uuid(),
  guest_user_id uuid references auth.users(id) on delete set null,
  data jsonb not null default '{}'::jsonb,
  start_at timestamptz not null,
  duration_min int not null check (duration_min between 15 and 1440),
  status text not null default 'pending' check (status in ('pending','accepted','declined','proposed')),
  reply jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index playdates_host_idx on public.playdates (host_id, start_at);
create index playdates_guest_idx on public.playdates (guest_user_id, start_at);

alter table public.playdates enable row level security;

create policy "read own playdates" on public.playdates for select to authenticated
  using (host_id = (select auth.uid()) or guest_user_id = (select auth.uid()));
create policy "host inserts" on public.playdates for insert to authenticated
  with check (host_id = (select auth.uid()));
create policy "host updates" on public.playdates for update to authenticated
  using (host_id = (select auth.uid())) with check (host_id = (select auth.uid()));
create policy "host deletes" on public.playdates for delete to authenticated
  using (host_id = (select auth.uid()));

create or replace function public.get_playdate_invite(p_id uuid, p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'data', p.data, 'start_at', p.start_at,
    'duration_min', p.duration_min, 'status', p.status, 'reply', p.reply)
  from public.playdates p where p.id = p_id and p.guest_token = p_token;
$$;

create or replace function public.respond_to_playdate(
  p_id uuid, p_token uuid, p_status text,
  p_note text default null, p_alt timestamptz default null, p_by text default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.playdates;
begin
  if p_status not in ('accepted','declined','proposed') then
    raise exception 'invalid status';
  end if;
  if p_status = 'proposed' and (p_alt is null or p_alt < now()) then
    raise exception 'a future alternative time is required';
  end if;
  update public.playdates set
    status = p_status,
    reply = jsonb_build_object('note', left(coalesce(p_note, ''), 280), 'alt', p_alt,
                               'by', left(coalesce(p_by, ''), 80), 'at', now()),
    guest_user_id = coalesce(auth.uid(), guest_user_id),
    updated_at = now()
  where id = p_id and guest_token = p_token
    and start_at + make_interval(mins => duration_min) > now()
  returning * into r;
  if not found then
    raise exception 'invite not found or already over';
  end if;
  return jsonb_build_object('id', r.id, 'status', r.status, 'reply', r.reply);
end $$;

revoke all on function public.get_playdate_invite(uuid, uuid) from public;
revoke all on function public.respond_to_playdate(uuid, uuid, text, text, timestamptz, text) from public;
grant execute on function public.get_playdate_invite(uuid, uuid) to anon, authenticated;
grant execute on function public.respond_to_playdate(uuid, uuid, text, text, timestamptz, text) to anon, authenticated;

alter publication supabase_realtime add table public.playdates;
