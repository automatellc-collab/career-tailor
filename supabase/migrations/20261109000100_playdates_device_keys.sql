-- Secret device keys instead of Supabase Auth: no sign-in, no dashboard config.
-- Hosts and guests reach the table only through the key/token-checked functions below.
-- (Supersedes the auth-based public.playdates table from the previous migration,
-- which is left in place, empty and unused.)

create table public.pd_playdates (
  id uuid primary key,
  owner_key uuid not null,
  guest_token uuid not null default gen_random_uuid(),
  guest_key uuid,
  data jsonb not null default '{}'::jsonb check (pg_column_size(data) < 8000),
  start_at timestamptz not null,
  duration_min int not null check (duration_min between 15 and 1440),
  status text not null default 'pending' check (status in ('pending','accepted','declined','proposed')),
  reply jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index pd_playdates_owner_idx on public.pd_playdates (owner_key, start_at);
create index pd_playdates_guest_idx on public.pd_playdates (guest_key, start_at);

alter table public.pd_playdates enable row level security;
revoke all on table public.pd_playdates from anon, authenticated;

create or replace function public.pd_list(p_key uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
      'id', p.id, 'data', p.data, 'start_at', p.start_at, 'duration_min', p.duration_min,
      'status', p.status, 'reply', p.reply, 'updated_at', p.updated_at,
      'role', case when p.owner_key = p_key then 'host' else 'guest' end,
      'guest_token', p.guest_token
    ) order by p.start_at), '[]'::jsonb)
  from public.pd_playdates p
  where p.owner_key = p_key or p.guest_key = p_key;
$$;

create or replace function public.pd_save(
  p_key uuid, p_id uuid, p_data jsonb, p_start timestamptz, p_duration int,
  p_status text default 'pending', p_reply jsonb default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.pd_playdates;
begin
  if (select count(*) from public.pd_playdates where owner_key = p_key) >= 500 then
    raise exception 'too many playdates for this device';
  end if;
  insert into public.pd_playdates as t (id, owner_key, data, start_at, duration_min, status, reply)
  values (p_id, p_key, p_data, p_start, p_duration, p_status, p_reply)
  on conflict (id) do update set
    data = excluded.data, start_at = excluded.start_at, duration_min = excluded.duration_min,
    status = excluded.status, reply = excluded.reply, updated_at = now()
  where t.owner_key = p_key
  returning * into r;
  if not found then raise exception 'not your playdate'; end if;
  return jsonb_build_object('id', r.id, 'guest_token', r.guest_token, 'updated_at', r.updated_at);
end $$;

create or replace function public.pd_delete(p_key uuid, p_id uuid)
returns void language sql security definer set search_path = '' as $$
  delete from public.pd_playdates where id = p_id and owner_key = p_key;
$$;

create or replace function public.pd_get_invite(p_id uuid, p_token uuid)
returns jsonb language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', p.id, 'data', p.data, 'start_at', p.start_at,
    'duration_min', p.duration_min, 'status', p.status, 'reply', p.reply)
  from public.pd_playdates p where p.id = p_id and p.guest_token = p_token;
$$;

create or replace function public.pd_respond(
  p_id uuid, p_token uuid, p_status text, p_note text default null,
  p_alt timestamptz default null, p_by text default null, p_guest_key uuid default null)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare r public.pd_playdates;
begin
  if p_status not in ('accepted','declined','proposed') then raise exception 'invalid status'; end if;
  if p_status = 'proposed' and (p_alt is null or p_alt < now()) then
    raise exception 'a future alternative time is required';
  end if;
  update public.pd_playdates set
    status = p_status,
    reply = jsonb_build_object('note', left(coalesce(p_note, ''), 280), 'alt', p_alt,
                               'by', left(coalesce(p_by, ''), 80), 'at', now()),
    guest_key = coalesce(p_guest_key, guest_key),
    updated_at = now()
  where id = p_id and guest_token = p_token
    and start_at + make_interval(mins => duration_min) > now()
  returning * into r;
  if not found then raise exception 'invite not found or already over'; end if;
  return jsonb_build_object('id', r.id, 'status', r.status, 'reply', r.reply);
end $$;

revoke all on function public.pd_list(uuid) from public;
revoke all on function public.pd_save(uuid, uuid, jsonb, timestamptz, int, text, jsonb) from public;
revoke all on function public.pd_delete(uuid, uuid) from public;
revoke all on function public.pd_get_invite(uuid, uuid) from public;
revoke all on function public.pd_respond(uuid, uuid, text, text, timestamptz, text, uuid) from public;
grant execute on function public.pd_list(uuid) to anon, authenticated;
grant execute on function public.pd_save(uuid, uuid, jsonb, timestamptz, int, text, jsonb) to anon, authenticated;
grant execute on function public.pd_delete(uuid, uuid) to anon, authenticated;
grant execute on function public.pd_get_invite(uuid, uuid) to anon, authenticated;
grant execute on function public.pd_respond(uuid, uuid, text, text, timestamptz, text, uuid) to anon, authenticated;
