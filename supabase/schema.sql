-- =====================================================================
-- Creed Marketing — database schema
-- Run this whole file once in Supabase: Dashboard → SQL Editor → New query.
-- Then run seed.sql. Safe to re-run: it drops and recreates Creed objects.
-- =====================================================================

-- ---------- 0. Clean slate (only Creed objects) ----------
drop trigger if exists on_auth_user_created on auth.users;
drop table if exists rep_notes, rep_stats, reps, recruit_notes, recruits,
  pillar_checkins, plan_inputs, market_rates, markets, profiles, owner_emails cascade;
drop function if exists public.is_owner() cascade;
drop function if exists public.handle_new_user() cascade;
drop function if exists public.guard_profile_role() cascade;
drop function if exists public.sync_owner_emails() cascade;

-- ---------- 1. Owner allowlist ----------
-- OWNER access is decided ONLY by this list of emails — never by a typed name.
create table owner_emails (
  email text primary key check (email = lower(email))
);

-- >>> EDIT THESE TWO EMAILS to Braden's and Peter's real login emails <<<
insert into owner_emails (email) values
  ('braden@example.com'),
  ('peter@example.com');

-- ---------- 2. Profiles (one per login) ----------
create table profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  full_name text,
  role text not null default 'rep' check (role in ('owner', 'rep')),
  created_at timestamptz not null default now()
);

-- Is the signed-in user an owner? Used by every security policy below.
create function public.is_owner() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'owner');
$$;

-- New sign-up → profile. Role is OWNER only if the email is on the allowlist.
create function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case when exists (select 1 from owner_emails where email = lower(new.email))
         then 'owner' else 'rep' end
  );
  return new;
end $$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Nobody can change their own role; only an owner can change roles.
create function public.guard_profile_role() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if new.role is distinct from old.role and not public.is_owner() then
    raise exception 'Only owners can change roles';
  end if;
  if new.role is distinct from old.role and new.id = auth.uid() then
    raise exception 'You cannot change your own role';
  end if;
  return new;
end $$;

create trigger guard_profile_role before update on profiles
  for each row execute function public.guard_profile_role();

-- Adding an email to the allowlist later promotes an existing account.
create function public.sync_owner_emails() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  update profiles set role = 'owner' where email = new.email;
  return new;
end $$;

create trigger sync_owner_emails after insert on owner_emails
  for each row execute function public.sync_owner_emails();

-- ---------- 3. Markets ----------
-- PUBLIC market info + REP pay rules. Anyone can read this table.
create table markets (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  industry text not null check (industry in ('fiber', 'pest', 'starlink')),
  provider text,
  leads text,
  connect numeric,            -- % used by the calculator (e.g. 85)
  connect_label text,         -- what the page shows (e.g. "60–70%")
  public_rate_label text,     -- the $ line shown on the public market card
  pace numeric default 2,     -- default sales/day in the calculator
  pace_tiers jsonb,           -- [{"l":"Avg 2–4","v":3}, ...]
  notes text[] default '{}',  -- public notes
  -- rep pay rules (what reps earn)
  rep_base numeric,
  rep_cap numeric,
  rep_step int default 20,
  rep_bump numeric default 25,
  rep_basis text default 'sold' check (rep_basis in ('sold', 'installed')),
  sort int default 0,
  updated_at timestamptz default now()
);

-- OWNER-ONLY full contract pay. Reps and the public can never read this.
create table market_rates (
  market_id uuid primary key references markets (id) on delete cascade,
  base numeric,
  cap numeric,
  step int default 25,
  bump numeric default 25,
  basis text default 'sold' check (basis in ('sold', 'installed')),
  owner_notes text[] default '{}'
);

-- ---------- 4. Reps & daily numbers ----------
create table reps (
  id uuid primary key default gen_random_uuid(),
  profile_id uuid references profiles (id) on delete set null, -- links a rep to their login
  name text not null,
  email text,
  phone text,
  industry text not null check (industry in ('fiber', 'pest')),
  market_id uuid references markets (id) on delete set null,
  recruited_by text check (recruited_by in ('Braden', 'Peter')),
  start_date date default current_date,
  status text not null default 'active' check (status in ('active', 'inactive')),
  is_sample boolean default false,
  created_at timestamptz default now()
);

create table rep_stats (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references reps (id) on delete cascade,
  day date not null,
  sales int not null default 0,
  installs int not null default 0,
  unique (rep_id, day)
);

create table rep_notes (
  id uuid primary key default gen_random_uuid(),
  rep_id uuid not null references reps (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  author_name text,
  body text not null,
  created_at timestamptz default now()
);

-- ---------- 5. Recruiting pipeline ----------
create table recruits (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  phone text,
  email text,
  instagram text,
  industry_interest text check (industry_interest in ('fiber', 'pest', 'either')),
  preferred_market text,
  pillar text check (pillar in ('physical', 'spiritual', 'mental', 'financial')),
  source text,
  stage text not null default 'new'
    check (stage in ('new', 'contacted', 'interviewing', 'offer', 'signed', 'cold', 'not_fit')),
  owner_name text check (owner_name in ('Braden', 'Peter')),
  next_follow_up date,
  last_touch timestamptz default now(),
  signed_at timestamptz,
  is_sample boolean default false,
  created_at timestamptz default now()
);

create table recruit_notes (
  id uuid primary key default gen_random_uuid(),
  recruit_id uuid not null references recruits (id) on delete cascade,
  author_id uuid references profiles (id) on delete set null,
  author_name text,
  body text not null,
  created_at timestamptz default now()
);

-- ---------- 6. Per-user saved data ----------
create table plan_inputs (
  user_id uuid primary key references profiles (id) on delete cascade,
  inputs jsonb not null default '{}',
  updated_at timestamptz default now()
);

create table pillar_checkins (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles (id) on delete cascade,
  week_start date not null,
  physical int check (physical between 1 and 10),
  spiritual int check (spiritual between 1 and 10),
  mental int check (mental between 1 and 10),
  financial int check (financial between 1 and 10),
  goals jsonb default '{}',  -- {"physical":"...", ...}
  created_at timestamptz default now(),
  unique (user_id, week_start)
);

-- =====================================================================
-- 7. ROW-LEVEL SECURITY — this is what keeps margin data owner-only.
-- =====================================================================
alter table owner_emails    enable row level security;
alter table profiles        enable row level security;
alter table markets         enable row level security;
alter table market_rates    enable row level security;
alter table reps            enable row level security;
alter table rep_stats       enable row level security;
alter table rep_notes       enable row level security;
alter table recruits        enable row level security;
alter table recruit_notes   enable row level security;
alter table plan_inputs     enable row level security;
alter table pillar_checkins enable row level security;

-- owner_emails: owners only
create policy "owners manage allowlist" on owner_emails
  for all using (is_owner()) with check (is_owner());

-- profiles: see/edit yourself; owners see/edit everyone (role changes guarded by trigger)
create policy "read own profile" on profiles for select using (id = auth.uid() or is_owner());
create policy "update own profile" on profiles for update using (id = auth.uid() or is_owner());

-- markets: public read, owners write
create policy "anyone reads markets" on markets for select using (true);
create policy "owners write markets" on markets for all using (is_owner()) with check (is_owner());

-- market_rates: OWNERS ONLY, read and write
create policy "owners only rates" on market_rates for all using (is_owner()) with check (is_owner());

-- reps: owners everything; a rep can read their own row
create policy "owners manage reps" on reps for all using (is_owner()) with check (is_owner());
create policy "rep reads self" on reps for select using (profile_id = auth.uid());

create policy "owners manage stats" on rep_stats for all using (is_owner()) with check (is_owner());
create policy "rep reads own stats" on rep_stats for select
  using (exists (select 1 from reps r where r.id = rep_id and r.profile_id = auth.uid()));

create policy "owners manage rep notes" on rep_notes for all using (is_owner()) with check (is_owner());

-- recruits: owners everything; anyone may submit the public application (new leads only)
create policy "owners manage recruits" on recruits for all using (is_owner()) with check (is_owner());
create policy "public can apply" on recruits for insert to anon, authenticated
  with check (stage = 'new' and is_sample = false and owner_name is null);

create policy "owners manage recruit notes" on recruit_notes for all using (is_owner()) with check (is_owner());

-- per-user data: yours only; owners can read
create policy "own plan inputs" on plan_inputs for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "own checkins" on pillar_checkins for all using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "owners read checkins" on pillar_checkins for select using (is_owner());
