-- The pool_entries SELECT policy had a self-referential exists() check
-- ("is the viewer a member of this pool?") which causes RLS recursion,
-- so members could only see their own row. Same fix as migration 002:
-- authenticated users can read all entries (invite code is the gate).
drop policy if exists "Entry owner and pool organizer can read entries" on public.pool_entries;

create policy "Authenticated users can read pool entries"
  on public.pool_entries for select
  using (auth.role() = 'authenticated');
