-- =====================================================================
-- Creed — Team leads. Run once in Supabase → SQL Editor (after schema.sql
-- and apply.sql). Safe to re-run.
--
-- Adds a third role between owner and rep:
--   owner      everything (margins, reps, rates, pipeline, settings)
--   lead       the recruiting pipeline only: see every lead, add leads,
--              move stages, edit details, write notes. Can't delete leads,
--              can't create rep records, never sees rates or rep numbers.
--   rep        the public site and their own growth plan
--
-- Team lead status comes ONLY from the lead_emails list, which only owners
-- can change (Owner dashboard → Settings → Team leads).
-- =====================================================================

-- ---------- 1. The team-lead email list ----------
create table if not exists lead_emails (
  email text primary key check (email = lower(email))
);
alter table lead_emails enable row level security;
drop policy if exists "owners manage lead list" on lead_emails;
create policy "owners manage lead list" on lead_emails
  for all using (is_owner()) with check (is_owner());

-- ---------- 2. Allow the new role ----------
alter table profiles drop constraint if exists profiles_role_check;
alter table profiles add constraint profiles_role_check check (role in ('owner', 'lead', 'rep'));

-- Owner or team lead? Used by the pipeline policies below.
create or replace function public.can_recruit() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (select 1 from profiles where id = auth.uid() and role in ('owner', 'lead'));
$$;

-- ---------- 3. New sign-ups: owner list first, then team-lead list, else rep ----------
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  insert into profiles (id, email, full_name, role)
  values (
    new.id,
    lower(new.email),
    coalesce(new.raw_user_meta_data ->> 'full_name', split_part(new.email, '@', 1)),
    case
      when exists (select 1 from owner_emails where email = lower(new.email)) then 'owner'
      when exists (select 1 from lead_emails  where email = lower(new.email)) then 'lead'
      else 'rep'
    end
  );
  return new;
end $$;

-- ---------- 4. Adding / removing an email updates an existing account ----------
-- (owners are never demoted by this; only reps <-> team leads)
create or replace function public.sync_lead_emails() returns trigger
language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' then
    update profiles set role = 'lead' where email = new.email and role = 'rep';
    return new;
  else
    update profiles set role = 'rep' where email = old.email and role = 'lead';
    return old;
  end if;
end $$;

drop trigger if exists sync_lead_emails on lead_emails;
create trigger sync_lead_emails after insert or delete on lead_emails
  for each row execute function public.sync_lead_emails();

-- ---------- 5. Team leads work the pipeline ----------
drop policy if exists "leads read recruits" on recruits;
drop policy if exists "leads add recruits" on recruits;
drop policy if exists "leads update recruits" on recruits;
create policy "leads read recruits" on recruits for select using (can_recruit());
create policy "leads add recruits" on recruits for insert with check (can_recruit());
create policy "leads update recruits" on recruits for update using (can_recruit()) with check (can_recruit());
-- (no delete policy for leads: only owners can delete — "owners manage recruits")

drop policy if exists "leads read recruit notes" on recruit_notes;
drop policy if exists "leads add recruit notes" on recruit_notes;
create policy "leads read recruit notes" on recruit_notes for select using (can_recruit());
create policy "leads add recruit notes" on recruit_notes for insert
  with check (can_recruit() and author_id = auth.uid());
