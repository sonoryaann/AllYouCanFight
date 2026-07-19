-- CRITICAL: players_read policy queried `players` from within a policy ON
-- `players`, causing "infinite recursion detected in policy for relation
-- players" on every read of players (and cascading to lobby_dishes/orders/
-- lobbies policies that subquery players). Fix: SECURITY DEFINER helper
-- functions bypass players' RLS internally (no recursion), then rewrite the
-- policies that self/cross-reference players to use them.

-- Helpers: SECURITY DEFINER so their internal reads of `players` bypass RLS (no recursion)
create or replace function my_lobby_ids()
returns setof uuid language sql security definer stable set search_path = public as $$
  select lobby_id from players where device_id = auth.uid()
$$;

create or replace function is_lobby_host(p_lobby uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from players where lobby_id = p_lobby and device_id = auth.uid() and ruolo = 'host')
$$;

-- players: membership without self-recursion
drop policy players_read on players;
create policy players_read on players for select to authenticated
  using (lobby_id in (select my_lobby_ids()));

-- lobby_dishes
drop policy dishes_read on lobby_dishes;
create policy dishes_read on lobby_dishes for select to authenticated
  using (lobby_id in (select my_lobby_ids()));
drop policy dishes_insert on lobby_dishes;
create policy dishes_insert on lobby_dishes for insert to authenticated
  with check (lobby_id in (select my_lobby_ids()));
drop policy dishes_update on lobby_dishes;
create policy dishes_update on lobby_dishes for update to authenticated
  using (is_lobby_host(lobby_id));

-- orders: readable if the order's player is in one of my lobbies
drop policy orders_read on orders;
create policy orders_read on orders for select to authenticated
  using (player_id in (select id from players where lobby_id in (select my_lobby_ids())));

-- lobbies: only host can update state
drop policy lobbies_update on lobbies;
create policy lobbies_update on lobbies for update to authenticated
  using (is_lobby_host(id));
