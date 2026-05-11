alter table public.users add column if not exists token_balance integer not null default 1000;

-- Allow users to read and update their own balance
create policy "Users can read own balance"
  on public.users for select
  using (auth.uid() = id);

create policy "Users can update own balance"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);
