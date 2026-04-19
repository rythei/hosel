-- Seed: PGA Championship 2026
-- Run once to have a tournament ready for testing

insert into public.tournaments (id, external_id, name, course, start_date, end_date, status, current_round)
values (
  'a1b2c3d4-0000-0000-0000-000000000001',
  '401811942',
  'PGA Championship',
  'Aronimink Golf Club',
  '2026-05-14',
  '2026-05-17',
  'upcoming',
  null
)
on conflict (external_id) do nothing;

-- Tier 1 — Elite
insert into public.tournament_players (tournament_id, name, world_ranking, odds, tier) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Scottie Scheffler', 1, '+450', 1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Rory McIlroy', 2, '+700', 1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Xander Schauffele', 3, '+900', 1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Collin Morikawa', 4, '+1100', 1),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Viktor Hovland', 5, '+1200', 1);

-- Tier 2 — Contenders
insert into public.tournament_players (tournament_id, name, world_ranking, odds, tier) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Jon Rahm', 6, '+1400', 2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Ludvig Åberg', 7, '+1600', 2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Tommy Fleetwood', 8, '+1800', 2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Shane Lowry', 9, '+2000', 2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Wyndham Clark', 10, '+2500', 2),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Min Woo Lee', 11, '+2800', 2);

-- Tier 3 — Dark Horses
insert into public.tournament_players (tournament_id, name, world_ranking, odds, tier) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Russell Henley', 15, '+3200', 3),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Corey Conners', 18, '+3500', 3),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Brian Harman', 20, '+4000', 3),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Sahith Theegala', 22, '+4500', 3),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Matt Fitzpatrick', 24, '+5000', 3),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Tony Finau', 25, '+5500', 3);

-- Tier 4 — Sleepers
insert into public.tournament_players (tournament_id, name, world_ranking, odds, tier) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Adam Scott', 30, '+6000', 4),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Keegan Bradley', 35, '+7000', 4),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Rickie Fowler', 38, '+8000', 4),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Hideki Matsuyama', 40, '+9000', 4),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Cameron Young', 42, '+10000', 4),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Justin Thomas', 45, '+12000', 4);

-- Tier 5 — Longshots
insert into public.tournament_players (tournament_id, name, world_ranking, odds, tier) values
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Tiger Woods', 800, '+15000', 5),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Phil Mickelson', 900, '+20000', 5),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Fred Couples', 999, '+25000', 5),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Ben Griffin', 55, '+15000', 5),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Andrew Novak', 60, '+18000', 5),
  ('a1b2c3d4-0000-0000-0000-000000000001', 'Akshay Bhatia', 65, '+20000', 5);
