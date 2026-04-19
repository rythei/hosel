-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- ============================================================
-- USERS (extends Supabase auth.users)
-- ============================================================
create table public.users (
  id           uuid primary key references auth.users(id) on delete cascade,
  email        text not null,
  display_name text not null,
  avatar_initials text not null default '',
  created_at   timestamptz not null default now()
);

alter table public.users enable row level security;

create policy "Users can read own profile"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own profile"
  on public.users for update
  using (auth.uid() = id);

-- Auto-create user profile on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public
as $$
begin
  insert into public.users (id, email, display_name, avatar_initials)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)),
    upper(left(coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1)), 2))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- TOURNAMENTS
-- ============================================================
create table public.tournaments (
  id              uuid primary key default gen_random_uuid(),
  external_id     text unique,
  name            text not null,
  course          text not null default '',
  start_date      date not null,
  end_date        date not null,
  status          text not null default 'upcoming' check (status in ('upcoming', 'in_progress', 'complete')),
  current_round   int check (current_round between 1 and 4),
  cut_line        int,
  created_at      timestamptz not null default now()
);

alter table public.tournaments enable row level security;

create policy "Tournaments are publicly readable"
  on public.tournaments for select
  using (true);

create policy "Only service role can write tournaments"
  on public.tournaments for all
  using (auth.role() = 'service_role');

-- ============================================================
-- TOURNAMENT PLAYERS
-- ============================================================
create table public.tournament_players (
  id                  uuid primary key default gen_random_uuid(),
  tournament_id       uuid not null references public.tournaments(id) on delete cascade,
  external_player_id  text,
  name                text not null,
  world_ranking       int,
  odds                text,
  tier                int check (tier between 1 and 6),
  status              text not null default 'active' check (status in ('active', 'cut', 'withdrawn', 'disqualified')),
  r1_score            int,
  r2_score            int,
  r3_score            int,
  r4_score            int,
  total_score         int generated always as (
    coalesce(r1_score, 0) + coalesce(r2_score, 0) + coalesce(r3_score, 0) + coalesce(r4_score, 0)
  ) stored,
  created_at          timestamptz not null default now()
);

create index on public.tournament_players(tournament_id);
create index on public.tournament_players(tournament_id, tier);

alter table public.tournament_players enable row level security;

create policy "Tournament players are publicly readable"
  on public.tournament_players for select
  using (true);

create policy "Only service role can write tournament players"
  on public.tournament_players for all
  using (auth.role() = 'service_role');

-- ============================================================
-- POOLS
-- ============================================================
create table public.pools (
  id                          uuid primary key default gen_random_uuid(),
  name                        text not null,
  tournament_id               uuid not null references public.tournaments(id),
  organizer_id                uuid not null references public.users(id),
  buy_in                      int not null default 25,
  max_entries                 int not null default 30,
  scoring_method              text not null default 'best_3_of_5'
                                check (scoring_method in ('best_3_of_5', 'best_4_of_5', 'all_5')),
  num_tiers                   int not null default 5 check (num_tiers between 3 and 6),
  cut_rule_minimum            int not null default 3,
  payout_structure            jsonb not null default '{"rounds":{"percentage":20,"splits":{"first":50,"second":35,"third":15}},"overall":{"percentage":20}}'::jsonb,
  entry_deadline              timestamptz not null,
  invite_code                 text not null unique,
  require_buyin_confirmation  boolean not null default true,
  status                      text not null default 'open'
                                check (status in ('draft','open','locked','live','complete','settling','settled')),
  created_at                  timestamptz not null default now()
);

create index on public.pools(organizer_id);
create index on public.pools(invite_code);

alter table public.pools enable row level security;

create policy "Authenticated users can create pools"
  on public.pools for insert
  with check (auth.uid() = organizer_id);

create policy "Organizer can update pool"
  on public.pools for update
  using (auth.uid() = organizer_id);

create policy "Organizer can delete pool"
  on public.pools for delete
  using (auth.uid() = organizer_id);

-- ============================================================
-- POOL ENTRIES
-- ============================================================
create table public.pool_entries (
  id               uuid primary key default gen_random_uuid(),
  pool_id          uuid not null references public.pools(id) on delete cascade,
  user_id          uuid not null references public.users(id),
  picks            jsonb,
  tiebreaker       jsonb not null default '{"r1":null,"r2":null,"r3":null,"r4":null}'::jsonb,
  buyin_status     text not null default 'pending' check (buyin_status in ('pending', 'confirmed')),
  picks_locked     boolean not null default false,
  is_eligible_weekend boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (pool_id, user_id)
);

create index on public.pool_entries(pool_id);
create index on public.pool_entries(user_id);

alter table public.pool_entries enable row level security;

create policy "Entry owner and pool organizer can read entries"
  on public.pool_entries for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.pools p
      where p.id = pool_id and p.organizer_id = auth.uid()
    )
    or exists (
      select 1 from public.pool_entries e2
      where e2.pool_id = pool_id and e2.user_id = auth.uid()
    )
  );

create policy "Users can create their own entry"
  on public.pool_entries for insert
  with check (auth.uid() = user_id);

create policy "Entry owner can update their entry"
  on public.pool_entries for update
  using (auth.uid() = user_id);

-- Organizer can confirm buy-ins (update buyin_status)
create policy "Organizer can update entries"
  on public.pool_entries for update
  using (
    exists (
      select 1 from public.pools p
      where p.id = pool_id and p.organizer_id = auth.uid()
    )
  );

-- Auto-update updated_at
create or replace function public.update_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger pool_entries_updated_at
  before update on public.pool_entries
  for each row execute function public.update_updated_at();

-- Pool read policy deferred until after pool_entries exists
create policy "Pool members can read pools"
  on public.pools for select
  using (
    auth.uid() = organizer_id
    or exists (
      select 1 from public.pool_entries e
      where e.pool_id = id and e.user_id = auth.uid()
    )
  );

-- ============================================================
-- POOL RESULTS
-- ============================================================
create table public.pool_results (
  id               uuid primary key default gen_random_uuid(),
  pool_id          uuid not null references public.pools(id) on delete cascade,
  entry_id         uuid not null references public.pool_entries(id) on delete cascade,
  user_id          uuid not null references public.users(id),
  r1_score         int,
  r2_score         int,
  r3_score         int,
  r4_score         int,
  total_score      int,
  tiebreaker_diff  int,
  final_rank       int,
  unique (pool_id, entry_id)
);

create index on public.pool_results(pool_id);

alter table public.pool_results enable row level security;

create policy "Pool members can read results"
  on public.pool_results for select
  using (
    exists (
      select 1 from public.pool_entries e
      where e.pool_id = pool_id and e.user_id = auth.uid()
    )
    or exists (
      select 1 from public.pools p
      where p.id = pool_id and p.organizer_id = auth.uid()
    )
  );

create policy "Only service role can write results"
  on public.pool_results for all
  using (auth.role() = 'service_role');

-- ============================================================
-- POOL PAYOUTS
-- ============================================================
create table public.pool_payouts (
  id              uuid primary key default gen_random_uuid(),
  pool_id         uuid not null references public.pools(id) on delete cascade,
  user_id         uuid not null references public.users(id),
  category        text not null check (category in ('round_1','round_2','round_3','round_4','overall')),
  placement       text not null check (placement in ('first','second','third','winner')),
  token_amount    int not null,
  is_distributed  boolean not null default false,
  distributed_at  timestamptz,
  created_at      timestamptz not null default now()
);

create index on public.pool_payouts(pool_id);
create index on public.pool_payouts(user_id);

alter table public.pool_payouts enable row level security;

create policy "Pool members can read payouts"
  on public.pool_payouts for select
  using (
    exists (
      select 1 from public.pool_entries e
      where e.pool_id = pool_id and e.user_id = auth.uid()
    )
    or exists (
      select 1 from public.pools p
      where p.id = pool_id and p.organizer_id = auth.uid()
    )
  );

create policy "Organizer can update payout distribution"
  on public.pool_payouts for update
  using (
    exists (
      select 1 from public.pools p
      where p.id = pool_id and p.organizer_id = auth.uid()
    )
  );

create policy "Only service role can insert payouts"
  on public.pool_payouts for insert
  with check (auth.role() = 'service_role');

-- ============================================================
-- HELPER: generate invite code
-- ============================================================
create or replace function public.generate_invite_code()
returns text language plpgsql as $$
declare
  chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  result text := '';
  i int;
begin
  for i in 1..6 loop
    result := result || substr(chars, floor(random() * length(chars) + 1)::int, 1);
  end loop;
  return result;
end;
$$;
