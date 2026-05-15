alter table public.pools
  add column if not exists total_scoring_method text not null default 'sum_of_rounds'
  check (total_scoring_method in ('sum_of_rounds', 'best_players_overall'));
