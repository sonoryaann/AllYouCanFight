-- Atomic order-mutation RPCs (avoid client-side read-then-write races).
-- Both are SECURITY INVOKER (the default) so the existing orders RLS
-- policies (orders_write / orders_update) still apply to the caller.

create or replace function add_order(p_dish uuid, p_player uuid) returns void
language sql
set search_path = public
as $$
  insert into orders (player_id, dish_id, quantita_ordinata)
  values (p_player, p_dish, 1)
  on conflict (player_id, dish_id)
  do update set quantita_ordinata = orders.quantita_ordinata + 1, stato = 'in_attesa';
$$;

create or replace function mark_eaten(p_order uuid) returns void
language sql
set search_path = public
as $$
  update orders
  set quantita_mangiata = quantita_mangiata + 1,
      stato = case when quantita_mangiata + 1 >= quantita_ordinata then 'consegnato'::order_stato else stato end
  where id = p_order;
$$;
