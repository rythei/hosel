-- ESPN's scoreboard endpoint is league-scoped:
--   site.api.espn.com/apis/site/v2/sports/golf/{tour}/scoreboard?event={id}
--
-- The tour was previously hardcoded to 'pga'. Requesting an LPGA event ID from
-- the PGA endpoint does not 404 — ESPN ignores the unknown event and returns
-- the current PGA event instead, so the sync silently wrote the wrong field.
-- Storing the tour per tournament lets us build the correct URL.

alter table public.tournaments
  add column if not exists tour text not null default 'pga';

alter table public.tournaments
  drop constraint if exists tournaments_tour_check;

alter table public.tournaments
  add constraint tournaments_tour_check
  check (tour in ('pga', 'lpga', 'champions-tour', 'liv', 'dpwt'));

comment on column public.tournaments.tour is
  'ESPN league slug used to build the scoreboard URL. Must match the tour the external_id belongs to.';

-- Fix the AIG Women's Open: LPGA event, and Royal Porthcawl plays to par 71
-- for this championship (derived from ESPN round scores, not the 72 default).
update public.tournaments
  set tour = 'lpga',
      par  = 71
  where name ilike '%AIG Women%'
     or name ilike '%Women%s Open%';
