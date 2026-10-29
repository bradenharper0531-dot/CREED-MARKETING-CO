-- =====================================================================
-- Creed Marketing — seed data. Run AFTER schema.sql.
-- Markets are real (from Braden's numbers). Reps and recruits are SAMPLE
-- data (is_sample = true) so every screen has something on it — delete with:
--   delete from reps where is_sample; delete from recruits where is_sample;
-- =====================================================================

-- ---------- Markets (public info + rep pay) ----------
insert into markets (slug, name, industry, provider, leads, connect, connect_label, public_rate_label,
  pace, pace_tiers, notes, rep_base, rep_cap, rep_step, rep_bump, rep_basis, sort) values
('honolulu', 'Laie / Honolulu', 'fiber', null, '80,000', 65, '60–70%', '$325 per contract',
  2, null, '{}', 150, 225, 20, 25, 'sold', 1),
('utah', 'Utah', 'fiber', 'Utopia Fiber', 'Hundreds of thousands (all of Utah)', 85, '85%',
  '~$200 per contract starting · $300 at 25 installs/mo',
  3, '[{"l":"Avg 2–4","v":3},{"l":"Decent 5–7","v":6},{"l":"Dawgs 8–12","v":10}]',
  '{"Next couple months half off for customers"}', 150, 225, 20, 25, 'sold', 2),
('arizona', 'Arizona', 'fiber', 'Varies by ISP', null, 80, '80% (depends on ISP)', '$300 per contract',
  2, null, '{}', 150, 225, 20, 25, 'sold', 3),
('minnesota', 'Minnesota', 'fiber', null, null, 80, null, '$300 per contract',
  2, null, '{}', 150, 225, 20, 25, 'sold', 4),
('indiana', 'Indiana', 'fiber', 'T-Fiber', null, 90, '90%', '$400 per contract',
  2, null, '{}', 150, 225, 20, 25, 'sold', 5),
('missouri', 'Missouri', 'fiber', null, null, 80, null, '$250–275 max per contract',
  2, null, '{}', 150, 225, 20, 25, 'sold', 6),
('wyoming', 'Wyoming', 'fiber', null, null, 80, null, null,
  2, null, '{}', null, null, 20, 25, 'sold', 7),
('starlink', 'Starlink', 'starlink', 'Starlink', null, null, null, '$100 / $175 / $250 by tier',
  2, null, '{}', null, null, 20, 25, 'sold', 8);

-- ---------- Owner-only full contract pay (from the Owner Plan) ----------
insert into market_rates (market_id, base, cap, step, bump, basis, owner_notes)
select id, v.base, v.cap, v.step, v.bump, v.basis, v.notes from markets m
join (values
  ('honolulu', 325, 325, 25, 25, 'sold', '{}'::text[]),
  ('utah',     200, 300, 25, 100, 'installed', '{"$200 per contract to start; 25 installs in a month = $300 (cap)"}'::text[]),
  ('arizona',  300, 300, 25, 25, 'sold', '{"Leads note on file: Trash"}'::text[]),
  ('minnesota',300, 300, 25, 25, 'sold', '{"Connect rate not provided yet; 80% used as an estimate"}'::text[]),
  ('indiana',  400, 400, 25, 25, 'sold', '{}'::text[]),
  ('missouri', 250, 275, 25, 25, 'sold', '{"Connect rate not provided yet; 80% used as an estimate"}'::text[]),
  ('wyoming',  null, null, 25, 25, 'sold', '{"Note on file: J"}'::text[]),
  ('starlink', null, null, 25, 25, 'sold', '{"$100 / $175 / $250 per sale by tier"}'::text[])
) as v(slug, base, cap, step, bump, basis, notes) on v.slug = m.slug;

-- ---------- SAMPLE reps ----------
insert into reps (name, industry, market_id, recruited_by, start_date, status, phone, is_sample)
select v.name, v.industry, (select id from markets where slug = v.mkt), v.by, v.start::date, v.status, v.phone, true
from (values
  ('Sample — Jake Morales',   'fiber', 'utah',     'Braden', '2026-04-01', 'active',   '555-0101'),
  ('Sample — Tyler Brooks',   'fiber', 'utah',     'Peter',  '2026-05-12', 'active',   '555-0102'),
  ('Sample — Kai Nakamura',   'fiber', 'honolulu', 'Braden', '2026-03-20', 'active',   '555-0103'),
  ('Sample — Marcus Reed',    'pest',  'arizona',  'Peter',  '2026-02-15', 'active',   '555-0104'),
  ('Sample — Ethan Cole',     'pest',  'missouri', 'Braden', '2026-06-01', 'active',   '555-0105'),
  ('Sample — Logan Pierce',   'fiber', 'indiana',  'Peter',  '2026-07-08', 'active',   '555-0106'),
  ('Sample — Caleb Wright',   'pest',  'utah',     'Braden', '2026-05-30', 'active',   '555-0107'),
  ('Sample — Noah Bennett',   'fiber', 'minnesota','Peter',  '2026-04-22', 'inactive', '555-0108')
) as v(name, industry, mkt, by, start, status, phone);

-- 75 days of sample numbers (6 days a week) for each active sample rep
insert into rep_stats (rep_id, day, sales, installs)
select r.id, d::date,
  s.sales,
  greatest(0, round(s.sales * (0.7 + random() * 0.25)))::int
from reps r
cross join generate_series(current_date - 74, current_date, interval '1 day') d
cross join lateral (
  select greatest(0, round(
    (case r.industry when 'fiber' then 3.5 else 2.2 end)
    + (random() * 5 - 2)
    + (case when r.name like '%Kai%' or r.name like '%Jake%' then 3 else 0 end)
  ))::int as sales
) s
where r.is_sample and r.status = 'active' and extract(dow from d) <> 0;

insert into rep_notes (rep_id, author_name, body)
select id, 'Braden', 'Sample note — strong week, working on his close at the door.' from reps where name like '%Jake%';

-- ---------- SAMPLE recruits ----------
insert into recruits (name, phone, email, instagram, industry_interest, preferred_market, pillar, source,
  stage, owner_name, next_follow_up, last_touch, is_sample) values
('Sample — Ryan Hall',     '555-0201', 'ryan@example.com',   '@ryanhall',   'fiber',  'Utah',            'financial', 'Instagram', 'new',          'Braden', current_date + 1,  now() - interval '1 day',  true),
('Sample — Mason Price',   '555-0202', 'mason@example.com',  '@masonp',     'either', 'Laie / Honolulu', 'physical',  'Referral',  'contacted',    'Peter',  current_date,      now() - interval '2 days', true),
('Sample — Owen Fisher',   '555-0203', 'owen@example.com',   '@owenf',      'pest',   'Arizona',         'mental',    'Campus',    'interviewing', 'Braden', current_date - 2,  now() - interval '5 days', true),
('Sample — Lucas Grant',   '555-0204', 'lucas@example.com',  '@lucasg',     'fiber',  'Indiana',         'spiritual', 'Referral',  'interviewing', 'Peter',  current_date + 3,  now() - interval '1 day',  true),
('Sample — Wyatt James',   '555-0205', 'wyatt@example.com',  '@wyattj',     'fiber',  'Utah',            'financial', 'Instagram', 'offer',        'Braden', current_date + 2,  now() - interval '3 days', true),
('Sample — Hunter Lane',   '555-0206', 'hunter@example.com', '@hlane',      'pest',   'Missouri',        'physical',  'Campus',    'signed',       'Peter',  null,              now() - interval '6 days', true),
('Sample — Dylan Ross',    '555-0207', 'dylan@example.com',  '@dross',      'either', 'Minnesota',       'mental',    'Instagram', 'contacted',    'Braden', current_date - 1,  now() - interval '4 days', true),
('Sample — Gavin Shaw',    '555-0208', 'gavin@example.com',  '@gshaw',      'fiber',  'Laie / Honolulu', 'financial', 'Referral',  'new',          null,     null,              now(),                     true),
('Sample — Isaac Ford',    '555-0209', 'isaac@example.com',  '@isaacf',     'pest',   'Utah',            'spiritual', 'Campus',    'cold',         'Peter',  null,              now() - interval '20 days',true),
('Sample — Carter Wells',  '555-0210', 'carter@example.com', '@cwells',     'fiber',  'Arizona',         'physical',  'Instagram', 'not_fit',      'Braden', null,              now() - interval '15 days',true);

update recruits set signed_at = now() - interval '6 days' where stage = 'signed';

insert into recruit_notes (recruit_id, author_name, body, created_at)
select id, 'Braden', 'Sample — Called him, wants to talk after finals. Very motivated by the money side.', now() - interval '3 days'
from recruits where name like '%Wyatt%'
union all
select id, 'Peter', 'Sample — Sent the offer. Needs to talk to his parents about the summer in Utah.', now() - interval '1 day'
from recruits where name like '%Wyatt%'
union all
select id, 'Braden', 'Sample — Great interview. Played college ball, wants structure and accountability.', now() - interval '5 days'
from recruits where name like '%Owen%';
