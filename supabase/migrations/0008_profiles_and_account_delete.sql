create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  creato_il timestamptz not null default now()
);
alter table profiles enable row level security;
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_insert on profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from players where device_id = auth.uid();  -- cascades to orders
  delete from profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
