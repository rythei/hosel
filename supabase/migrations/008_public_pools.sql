alter table public.pools add column if not exists is_public boolean not null default false;

-- Allow anyone (including anon) to read public pool data
create policy "Public pools are readable by anyone"
  on public.pools for select
  using (is_public = true or auth.uid() is not null);

-- Allow anon to read entries for public pools (for leaderboard)
create policy "Entries for public pools are readable by anyone"
  on public.pool_entries for select
  using (
    exists (select 1 from public.pools p where p.id = pool_id and p.is_public = true)
    or auth.uid() = user_id
    or exists (select 1 from public.pools p where p.id = pool_id and p.organizer_id = auth.uid())
  );
