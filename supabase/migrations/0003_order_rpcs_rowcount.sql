-- Guard against silent no-ops: 0002_order_rpcs.sql defined add_order/mark_eaten
-- as bare-SQL statements whose UPDATE/INSERT..ON CONFLICT is filtered by the
-- orders_write / orders_update RLS policies when the caller does not own the
-- row (or the id is invalid). In that case zero rows are affected but the
-- function still returns success, so the client can't distinguish "eaten"
-- from "silently did nothing". Re-implement both as plpgsql with the same
-- signatures and the same atomic single-statement logic, but check the
-- affected row count and raise an exception when it is zero.

create or replace function add_order(p_dish uuid, p_player uuid) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  insert into orders (player_id, dish_id, quantita_ordinata)
  values (p_player, p_dish, 1)
  on conflict (player_id, dish_id)
  do update set quantita_ordinata = orders.quantita_ordinata + 1, stato = 'in_attesa';

  if not found then
    raise exception 'could not add order (not owned by caller?): dish %, player %', p_dish, p_player;
  end if;
end;
$$;

create or replace function mark_eaten(p_order uuid) returns void
language plpgsql
security invoker
set search_path = public
as $$
begin
  update orders
  set quantita_mangiata = quantita_mangiata + 1,
      stato = case when quantita_mangiata + 1 >= quantita_ordinata then 'consegnato'::order_stato else stato end
  where id = p_order;

  if not found then
    raise exception 'order not found or not owned by caller: %', p_order;
  end if;
end;
$$;
