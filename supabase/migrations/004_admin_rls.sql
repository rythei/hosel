-- Allow the designated admin user to write to tournaments and tournament_players
-- Admin is identified by their auth.uid() matching the hardcoded admin account

drop policy if exists "Only service role can write tournaments" on public.tournaments;

create policy "Admin can write tournaments"
  on public.tournaments for all
  using (
    auth.role() = 'service_role'
    or (auth.jwt() ->> 'email') = 'ryanctheisen@gmail.com'
  )
  with check (
    auth.role() = 'service_role'
    or (auth.jwt() ->> 'email') = 'ryanctheisen@gmail.com'
  );

-- Also allow admin to write tournament_players (currently only service_role)
drop policy if exists "Only service role can write tournament_players" on public.tournament_players;

create policy "Admin can write tournament_players"
  on public.tournament_players for all
  using (
    auth.role() = 'service_role'
    or (auth.jwt() ->> 'email') = 'ryanctheisen@gmail.com'
  )
  with check (
    auth.role() = 'service_role'
    or (auth.jwt() ->> 'email') = 'ryanctheisen@gmail.com'
  );
