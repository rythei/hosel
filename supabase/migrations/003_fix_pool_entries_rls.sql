-- Fix self-referential RLS on pool_entries.
-- The SELECT policy checked "is user already a member" by querying pool_entries itself → recursion.
-- Pool membership check is redundant with "auth.uid() = user_id", so just drop that clause.

drop policy if exists "Entry owner and pool organizer can read entries" on public.pool_entries;

create policy "Entry owner and pool organizer can read entries"
  on public.pool_entries for select
  using (
    auth.uid() = user_id
    or exists (
      select 1 from public.pools p
      where p.id = pool_id and p.organizer_id = auth.uid()
    )
  );
