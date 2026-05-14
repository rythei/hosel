-- Allow authenticated users to read any profile (needed for leaderboard display names)
-- The existing "own profile" policy only returned the current user's row,
-- causing leaderboard to show blank names for other pool members.
create policy "Authenticated users can read any profile"
  on public.users for select
  using (auth.uid() is not null);
