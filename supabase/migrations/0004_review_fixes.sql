-- Review fixes: close a host-escalation hole in players RLS, add lobbies to
-- realtime publication, bound mark_eaten to the ordered quantity, and add a
-- table-level invariant check.

-- CRITICAL 1: players RLS allowed a client to insert/update its own row with
-- ruolo = 'host', self-promoting to host (host rows must only ever be created
-- by the SECURITY DEFINER create_lobby function).
drop policy players_insert on players;
drop policy players_update on players;

create policy players_insert on players for insert to authenticated
  with check (device_id = auth.uid() and ruolo = 'player');
create policy players_update on players for update to authenticated
  using (device_id = auth.uid()) with check (device_id = auth.uid() and ruolo = 'player');

-- IMPORTANT 2: lobbies was never added to the realtime publication, so
-- useLobbyChannel's subscription to `stato` changes (end-game redirect)
-- never fired.
alter publication supabase_realtime add table public.lobbies;

-- IMPORTANT 3: mark_eaten had no upper bound, so quantita_mangiata could
-- exceed quantita_ordinata, breaking the 2-phase invariant and inflating
-- derived points. Bound the UPDATE and distinguish "already fully eaten"
-- from "not found / not owned".
create or replace function mark_eaten(p_order uuid) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update orders
     set quantita_mangiata = quantita_mangiata + 1,
         stato = case when quantita_mangiata + 1 >= quantita_ordinata then 'consegnato'::order_stato else stato end
   where id = p_order and quantita_mangiata < quantita_ordinata;

  if not found then
    -- either the order doesn't exist / isn't ours (RLS), or it's already fully eaten
    if exists (select 1 from orders where id = p_order) then
      raise exception 'order already fully eaten: %', p_order;
    else
      raise exception 'order not found or not owned by caller: %', p_order;
    end if;
  end if;
end $$;

-- Table-level invariant: quantita_mangiata can never exceed quantita_ordinata.
-- Existing rows are all consistent (0 <= ordinata), so this is safe to add.
alter table orders add constraint orders_mangiata_le_ordinata check (quantita_mangiata <= quantita_ordinata);
