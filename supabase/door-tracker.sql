-- =====================================================================
-- Creed — Door tracker. Run once in Supabase → SQL Editor (after
-- team-overview.sql). Safe to re-run.
--
-- Reps tap Door / Objection / Sale on creedmarketing.org/#/track. Each tap adds
-- to one row per rep per day. Who can see the numbers:
--   owners       everyone
--   team leads   the reps under them, if their Overview is turned on
--   reps         only their own
-- Nobody writes these rows directly: taps go through track(), which works out
-- which rep you are from your login, so no one can log numbers for someone else.
-- =====================================================================

create table if not exists door_counts (
  rep_id uuid not null references reps (id) on delete cascade,
  day date not null,
  doors int not null default 0 check (doors >= 0),
  objections int not null default 0 check (objections >= 0),
  sales int not null default 0 check (sales >= 0),
  objection_mix jsonb not null default '{}'::jsonb, -- e.g. {"price": 3, "not_interested": 5}
  updated_at timestamptz not null default now(),
  primary key (rep_id, day)
);
alter table door_counts enable row level security;

drop policy if exists "owners read door counts" on door_counts;
drop policy if exists "rep reads own door counts" on door_counts;
drop policy if exists "team lead reads team door counts" on door_counts;
create policy "owners read door counts" on door_counts for select using (is_owner());
create policy "rep reads own door counts" on door_counts for select
  using (exists (select 1 from reps r where r.id = rep_id and r.profile_id = auth.uid()));
create policy "team lead reads team door counts" on door_counts for select
  using (public.is_my_team_rep(rep_id));

-- Which rep is the logged-in person? Matches the rep record linked to their login,
-- or (if an owner added them before they signed up) the rep record with their email,
-- and links it for next time. Owners and team leads knock doors too: the first time
-- one of them opens the tracker, a rep record is made for them automatically
-- (industry Fiber to start; change it in Reps).
create or replace function public.my_rep() returns table (id uuid, name text)
language plpgsql security definer set search_path = public as $$
declare
  me profiles;
  r reps;
begin
  select * into me from profiles where profiles.id = auth.uid();
  if me.id is null then return; end if;
  select * into r from reps where reps.profile_id = me.id and status = 'active' order by created_at limit 1;
  if r.id is null then
    select * into r from reps where lower(reps.email) = me.email and status = 'active' order by created_at limit 1;
    if r.id is not null and r.profile_id is null then
      update reps set profile_id = me.id where reps.id = r.id;
    end if;
  end if;
  if r.id is null and me.role in ('owner', 'lead') then
    insert into reps (profile_id, name, email, industry, status)
    values (me.id, coalesce(nullif(me.full_name, ''), split_part(me.email, '@', 1)), me.email, 'fiber', 'active')
    returning * into r;
  end if;
  if r.id is null then return; end if;
  id := r.id; name := r.name;
  return next;
end $$;

-- One tap. kind = 'door' | 'objection' | 'sale'; delta = 1 (tap) or -1 (undo).
-- p_day is the rep's own calendar day (they're spread across time zones); it must be
-- within a day of today so nobody back-fills old days.
create or replace function public.track(p_kind text, p_day date, p_objection text default null, p_delta int default 1)
returns door_counts
language plpgsql security definer set search_path = public as $$
declare
  rid uuid;
  d int := case when p_delta < 0 then -1 else 1 end;
  o text := nullif(regexp_replace(lower(coalesce(p_objection, '')), '[^a-z_]', '', 'g'), '');
  row door_counts;
begin
  select id into rid from public.my_rep();
  if rid is null then raise exception 'Your login isn''t linked to a rep yet. Ask Braden or Peter to add you as a rep with this email.'; end if;
  if p_kind not in ('door', 'objection', 'sale') then raise exception 'Unknown tap'; end if;
  if p_day is null or p_day < current_date - 1 or p_day > current_date + 1 then raise exception 'That day can''t be tracked'; end if;
  if o is not null and length(o) > 24 then o := left(o, 24); end if;

  insert into door_counts (rep_id, day) values (rid, p_day) on conflict (rep_id, day) do nothing;
  update door_counts set
    doors = greatest(0, doors + case when p_kind = 'door' then d else 0 end),
    objections = greatest(0, objections + case when p_kind = 'objection' then d else 0 end),
    sales = greatest(0, sales + case when p_kind = 'sale' then d else 0 end),
    objection_mix = case
      when p_kind = 'objection' and o is not null then
        objection_mix || jsonb_build_object(o, greatest(0, coalesce((objection_mix ->> o)::int, 0) + d))
      else objection_mix end,
    updated_at = now()
  where rep_id = rid and day = p_day
  returning * into row;
  return row;
end $$;

revoke all on function public.track(text, date, text, int) from public, anon;
grant execute on function public.track(text, date, text, int) to authenticated;
revoke all on function public.my_rep() from public, anon;
grant execute on function public.my_rep() to authenticated;
