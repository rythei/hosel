alter table public.tournaments
  add column if not exists par integer not null default 72;

-- PGA Championship at Quail Hollow is par 70
update public.tournaments
  set par = 70
  where name ilike '%PGA Championship%';
