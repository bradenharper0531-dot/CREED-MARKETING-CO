-- =====================================================================
-- Creed — shorter Apply form. Run once in Supabase → SQL Editor. Safe to re-run.
-- Adds "previous work experience" to the recruiting pipeline. The form now asks
-- for first name, last name, phone, email, fiber or pest control, and experience.
-- =====================================================================
alter table recruits add column if not exists experience text;
alter table recruits drop constraint if exists recruits_experience_length;
alter table recruits add constraint recruits_experience_length check (char_length(experience) <= 2000);
