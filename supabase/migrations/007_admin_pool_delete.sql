-- Allow admin to delete any pool (previously only organizers could delete their own)
drop policy if exists "Organizer can delete pool" on public.pools;

create policy "Organizer or admin can delete pool"
  on public.pools for delete
  using (
    auth.uid() = organizer_id
    or (auth.jwt() ->> 'email') = 'ryanctheisen@gmail.com'
  );
