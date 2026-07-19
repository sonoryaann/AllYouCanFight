-- Enums
create type lobby_stato as enum ('creata', 'in_corso', 'completata');
create type player_ruolo as enum ('host', 'player');
create type order_stato as enum ('in_attesa', 'consegnato');

-- Tables
create table lobbies (
  id uuid primary key default gen_random_uuid(),
  codice_accesso text unique not null,
  stato lobby_stato not null default 'creata',
  creato_il timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  device_id uuid not null default auth.uid(),
  username text not null,
  ruolo player_ruolo not null default 'player',
  creato_il timestamptz not null default now(),
  unique (lobby_id, device_id)
);

create table lobby_dishes (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  nome text not null,
  categoria text not null,
  punti int not null default 1 check (punti >= 1)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  dish_id uuid not null references lobby_dishes(id) on delete cascade,
  quantita_ordinata int not null default 1 check (quantita_ordinata >= 0),
  quantita_mangiata int not null default 0 check (quantita_mangiata >= 0),
  stato order_stato not null default 'in_attesa',
  unique (player_id, dish_id)
);

-- Derived leaderboard (anti-cheat: points never stored)
-- security_invoker = on: the view runs with the querying user's privileges,
-- so the underlying RLS policies on players/orders/lobby_dishes apply to it.
-- Without this, the view would run as its owner and leak cross-lobby data.
create view leaderboard with (security_invoker = on) as
select p.id as player_id, p.lobby_id, p.username,
       coalesce(sum(o.quantita_mangiata * d.punti), 0)::int as punti,
       coalesce(sum(o.quantita_mangiata), 0)::int as pezzi
from players p
left join orders o on o.player_id = p.id
left join lobby_dishes d on d.id = o.dish_id
group by p.id, p.lobby_id, p.username;

-- Helper: current player's id within a lobby
create or replace function current_player_id(p_lobby uuid) returns uuid
language sql stable
set search_path = public
as $$
  select id from players where lobby_id = p_lobby and device_id = auth.uid()
$$;

-- RLS
alter table lobbies enable row level security;
alter table players enable row level security;
alter table lobby_dishes enable row level security;
alter table orders enable row level security;

-- Lobbies: anyone authenticated can read (needed to join by code) and insert; host can update
create policy lobbies_read on lobbies for select to authenticated using (true);
create policy lobbies_insert on lobbies for insert to authenticated with check (true);
create policy lobbies_update on lobbies for update to authenticated
  using (exists (select 1 from players pl where pl.lobby_id = lobbies.id and pl.device_id = auth.uid() and pl.ruolo = 'host'));

-- Players: read players in lobbies you belong to; insert yourself; update own row
create policy players_read on players for select to authenticated
  using (exists (select 1 from players me where me.lobby_id = players.lobby_id and me.device_id = auth.uid()));
create policy players_insert on players for insert to authenticated with check (device_id = auth.uid());
create policy players_update on players for update to authenticated using (device_id = auth.uid());

-- Dishes: read if member; insert if member (off-menu); update points only host
create policy dishes_read on lobby_dishes for select to authenticated
  using (exists (select 1 from players me where me.lobby_id = lobby_dishes.lobby_id and me.device_id = auth.uid()));
create policy dishes_insert on lobby_dishes for insert to authenticated
  with check (exists (select 1 from players me where me.lobby_id = lobby_dishes.lobby_id and me.device_id = auth.uid()));
create policy dishes_update on lobby_dishes for update to authenticated
  using (exists (select 1 from players me where me.lobby_id = lobby_dishes.lobby_id and me.device_id = auth.uid() and me.ruolo = 'host'));

-- Orders: read orders of players in your lobby; write only your own
create policy orders_read on orders for select to authenticated
  using (exists (select 1 from players me join players op on op.lobby_id = me.lobby_id
                 where me.device_id = auth.uid() and op.id = orders.player_id));
create policy orders_write on orders for insert to authenticated
  with check (exists (select 1 from players me where me.id = orders.player_id and me.device_id = auth.uid()));
create policy orders_update on orders for update to authenticated
  using (exists (select 1 from players me where me.id = orders.player_id and me.device_id = auth.uid()));

-- RPCs for lobby creation + seed
-- (dishes seeded from a SQL VALUES list mirroring DEFAULT_DISHES; keep in sync)
-- search_path is pinned to public on SECURITY DEFINER functions to avoid the
-- "function search_path mutable" security advisor and prevent search_path hijacking.
create or replace function seed_default_dishes(p_lobby uuid) returns void
language sql security definer
set search_path = public
as $$
  insert into lobby_dishes (lobby_id, nome, categoria, punti) values
    (p_lobby,'Nigiri Salmone','Nigiri',1),(p_lobby,'Nigiri Tonno','Nigiri',2),
    (p_lobby,'Nigiri Gambero','Nigiri',1),(p_lobby,'Nigiri Branzino','Nigiri',1),
    (p_lobby,'Nigiri Anguilla','Nigiri',2),(p_lobby,'Uramaki California','Uramaki',1),
    (p_lobby,'Uramaki Ebiten','Uramaki',2),(p_lobby,'Uramaki Salmone Avocado','Uramaki',1),
    (p_lobby,'Uramaki Spicy Tonno','Uramaki',2),(p_lobby,'Hosomaki Salmone','Hosomaki',1),
    (p_lobby,'Hosomaki Tonno','Hosomaki',1),(p_lobby,'Hosomaki Cetriolo','Hosomaki',1),
    (p_lobby,'Sashimi Salmone','Sashimi',3),(p_lobby,'Sashimi Tonno','Sashimi',3),
    (p_lobby,'Sashimi Branzino','Sashimi',3),(p_lobby,'Gunkan Salmone','Gunkan',2),
    (p_lobby,'Gunkan Tobiko','Gunkan',2),(p_lobby,'Temaki Salmone','Temaki',2),
    (p_lobby,'Temaki California','Temaki',2),(p_lobby,'Tempura Gamberi','Fritti',2),
    (p_lobby,'Tempura Verdure','Fritti',1),(p_lobby,'Gyoza','Fritti',2),
    (p_lobby,'Edamame','Fritti',1),(p_lobby,'Mochi','Dolci',2),
    (p_lobby,'Tempura Banana','Dolci',2);
$$;

create or replace function create_lobby(p_codice text, p_username text)
returns lobbies language plpgsql security definer
set search_path = public
as $$
declare l lobbies;
begin
  insert into lobbies (codice_accesso) values (p_codice) returning * into l;
  insert into players (lobby_id, device_id, username, ruolo)
    values (l.id, auth.uid(), p_username, 'host');
  perform seed_default_dishes(l.id);
  return l;
end $$;

-- Realtime: enable change streaming for live lobby/order updates
alter publication supabase_realtime add table public.players, public.lobby_dishes, public.orders;

-- seed_default_dishes should only ever be invoked internally by create_lobby.
-- Direct RPC calls by anon/authenticated would let any user inject duplicate
-- default dishes into an arbitrary lobby_id (bypassing dishes_insert RLS,
-- since this function is SECURITY DEFINER). Revoking direct EXECUTE closes
-- that path; create_lobby (SECURITY DEFINER, owned by the same role) can
-- still call it internally because the privilege check runs as the function
-- owner, not the invoking role.
revoke execute on function public.seed_default_dishes(uuid) from public, anon, authenticated;
