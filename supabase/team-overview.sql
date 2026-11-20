-- =====================================================================
-- Creed — Team lead overviews. Run once in Supabase → SQL Editor (after
-- team-leads.sql). Safe to re-run.
--
-- Owners can:
--   • put each rep under a team lead      (Owner dashboard → Reps → a rep → Team lead)
--   • turn a team lead's Overview on/off  (Owner dashboard → Settings → Team overview)
-- A team lead with Overview on sees ONLY the reps under them: their daily sales and
-- installs, and the team leaderboard. They still can't edit reps, log numbers, see rep
-- notes, contract rates, margins or override money, or anyone else's reps.
-- =====================================================================

-- ---------- 1. Which team lead a rep is under ----------
alter table reps add column if not exists lead_id uuid references profiles (id) on delete set null;
create index if not exists reps_lead_id_idx on reps (lead_id);

-- ---------- 2. Which team leads have an Overview ----------
create table if not exists lead_overview (
  lead_id uuid primary key references profiles (id) on delete cascade,
  granted_at timestamptz default now()
);
alter table lead_overview enable row level security;
drop policy if exists "owners manage lead overview" on lead_overview;
drop policy if exists "lead reads own overview access" on lead_overview;
create policy "owners manage lead overview" on lead_overview
  for all using (is_owner()) with check (is_owner());
create policy "lead reads own overview access" on lead_overview
  for select using (lead_id = auth.uid());

-- Is this rep on MY team, and am I a team lead with Overview turned on?
-- (Stops working the moment they're no longer a team lead or Overview is turned off.)
create or replace function public.on_my_team(rep_lead uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select rep_lead is not null
     and rep_lead = auth.uid()
     and exists (select 1 from profiles where id = auth.uid() and role = 'lead')
     and exists (select 1 from lead_overview where lead_id = auth.uid());
$$;

create or replace function public.is_my_team_rep(rep uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from reps where id = rep and public.on_my_team(lead_id));
$$;

-- ---------- 3. Read-only access to their own team ----------
drop policy if exists "team lead reads own team" on reps;
create policy "team lead reads own team" on reps
  for select using (public.on_my_team(lead_id));

drop policy if exists "team lead reads own team stats" on rep_stats;
create policy "team lead reads own team stats" on rep_stats
  for select using (public.is_my_team_rep(rep_id));
