-- Allow anon users to read public pools (migration 002 required authenticated)
create policy "Anon can read public pools"
  on public.pools for select
  using (is_public = true);

-- Allow anon users to read entries for public pools
create policy "Anon can read entries for public pools"
  on public.pool_entries for select
  using (
    exists (select 1 from public.pools p where p.id = pool_id and p.is_public = true)
  );

-- Allow anon users to read user profiles (needed for leaderboard display names)
create policy "Anon can read user profiles"
  on public.users for select
  using (true);
