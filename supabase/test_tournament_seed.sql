-- Test Tournament: "Hosel Invitational" — in progress, after R2 (cut made)
-- Use this to validate picks, leaderboard, scoring, and cut rules end-to-end.
-- Safe to re-run (uses ON CONFLICT DO NOTHING).

insert into public.tournaments (
  id, external_id, name, course, start_date, end_date,
  status, current_round, cut_line
) values (
  'ffffffff-0000-0000-0000-000000000001',
  'test-invitational-2026',
  'Hosel Invitational',
  'Augusta National GC',
  '2026-04-17',
  '2026-04-20',
  'in_progress',
  3,
  2  -- cut at +2
)
on conflict (external_id) do nothing;

-- Players with R1 + R2 scores. Cut at +2 (total > 2 after R2 = missed cut).
insert into public.tournament_players
  (tournament_id, name, world_ranking, odds, tier, status, r1_score, r2_score)
values
  -- Tier 1 — Elite
  ('ffffffff-0000-0000-0000-000000000001', 'Scottie Scheffler',  1,  '+450', 1, 'active',   -7, -5),
  ('ffffffff-0000-0000-0000-000000000001', 'Rory McIlroy',       2,  '+700', 1, 'active',   -5, -3),
  ('ffffffff-0000-0000-0000-000000000001', 'Xander Schauffele',  3,  '+900', 1, 'active',   -4, -4),
  ('ffffffff-0000-0000-0000-000000000001', 'Collin Morikawa',    4, '+1100', 1, 'active',   -3, -5),
  ('ffffffff-0000-0000-0000-000000000001', 'Viktor Hovland',     5, '+1200', 1, 'active',   -2, -6),

  -- Tier 2 — Contenders
  ('ffffffff-0000-0000-0000-000000000001', 'Jon Rahm',           6, '+1400', 2, 'active',   -4, -3),
  ('ffffffff-0000-0000-0000-000000000001', 'Ludvig Åberg',       7, '+1600', 2, 'active',   -3, -2),
  ('ffffffff-0000-0000-0000-000000000001', 'Tommy Fleetwood',    8, '+1800', 2, 'active',   -5, -1),
  ('ffffffff-0000-0000-0000-000000000001', 'Shane Lowry',        9, '+2000', 2, 'active',   -2, -3),
  ('ffffffff-0000-0000-0000-000000000001', 'Wyndham Clark',     10, '+2500', 2, 'active',   -1, -2),
  ('ffffffff-0000-0000-0000-000000000001', 'Min Woo Lee',       11, '+2800', 2, 'active',    0, -4),

  -- Tier 3 — Dark Horses
  ('ffffffff-0000-0000-0000-000000000001', 'Russell Henley',    15, '+3200', 3, 'active',   -2, -1),
  ('ffffffff-0000-0000-0000-000000000001', 'Corey Conners',     18, '+3500', 3, 'active',   -1,  0),
  ('ffffffff-0000-0000-0000-000000000001', 'Brian Harman',      20, '+4000', 3, 'active',    0, -2),
  ('ffffffff-0000-0000-0000-000000000001', 'Sahith Theegala',   22, '+4500', 3, 'active',   -3,  1),
  ('ffffffff-0000-0000-0000-000000000001', 'Matt Fitzpatrick',  24, '+5000', 3, 'active',    1, -2),
  ('ffffffff-0000-0000-0000-000000000001', 'Tony Finau',        25, '+5500', 3, 'cut',       2,  1),  -- missed cut

  -- Tier 4 — Sleepers
  ('ffffffff-0000-0000-0000-000000000001', 'Adam Scott',        30, '+6000', 4, 'active',   -1, -1),
  ('ffffffff-0000-0000-0000-000000000001', 'Keegan Bradley',    35, '+7000', 4, 'active',    0,  0),
  ('ffffffff-0000-0000-0000-000000000001', 'Rickie Fowler',     38, '+8000', 4, 'cut',       3,  2),  -- missed cut
  ('ffffffff-0000-0000-0000-000000000001', 'Hideki Matsuyama',  40, '+9000', 4, 'active',   -2,  0),
  ('ffffffff-0000-0000-0000-000000000001', 'Cameron Young',     42,'+10000', 4, 'active',    1, -3),
  ('ffffffff-0000-0000-0000-000000000001', 'Justin Thomas',     45,'+12000', 4, 'cut',       4,  0),  -- missed cut

  -- Tier 5 — Longshots
  ('ffffffff-0000-0000-0000-000000000001', 'Tiger Woods',      800,'+15000', 5, 'active',   -1,  0),
  ('ffffffff-0000-0000-0000-000000000001', 'Phil Mickelson',   900,'+20000', 5, 'cut',       5,  1),  -- missed cut
  ('ffffffff-0000-0000-0000-000000000001', 'Fred Couples',     999,'+25000', 5, 'cut',       6,  3),  -- missed cut
  ('ffffffff-0000-0000-0000-000000000001', 'Ben Griffin',       55,'+15000', 5, 'active',    0, -1),
  ('ffffffff-0000-0000-0000-000000000001', 'Andrew Novak',      60,'+18000', 5, 'active',   -1, -2),
  ('ffffffff-0000-0000-0000-000000000001', 'Akshay Bhatia',     65,'+20000', 5, 'active',    2, -3)
on conflict do nothing;
