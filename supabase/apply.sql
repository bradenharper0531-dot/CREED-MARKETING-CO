-- =====================================================================
-- Creed — Apply form upgrade. Run once in Supabase → SQL Editor
-- (after schema.sql). Safe to re-run.
-- Adds the new application fields to the recruiting pipeline.
-- =====================================================================
alter table recruits add column if not exists start_date date;          -- when they can head to a market
alter table recruits add column if not exists has_car boolean;          -- has a car
alter table recruits add column if not exists has_license boolean;      -- has a driver's license
alter table recruits add column if not exists notified_at timestamptz;  -- set when the owner text goes out

-- Public applications stay locked down: anyone may INSERT a brand-new lead,
-- nobody but owners can read, change or delete one (policies from schema.sql).
drop policy if exists "public can apply" on recruits;
create policy "public can apply" on recruits for insert to anon, authenticated
  with check (stage = 'new' and is_sample = false and owner_name is null and notified_at is null);
