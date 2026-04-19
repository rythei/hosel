-- Fix infinite recursion: pools policy referenced pool_entries,
-- pool_entries policy referenced pools → cycle.
-- Solution: pools SELECT allows any authenticated user (invite code is the access control).
-- pool_entries still references pools, but pools no longer references pool_entries → no loop.

drop policy if exists "Pool members can read pools" on public.pools;

create policy "Authenticated users can read pools"
  on public.pools for select
  using (auth.role() = 'authenticated');
