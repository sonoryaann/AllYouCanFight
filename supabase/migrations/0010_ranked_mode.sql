-- Ranked vs Casual lobbies. Casual (default) = comportamento attuale.
alter table lobbies add column ranked boolean not null default false;

-- Helper SECURITY DEFINER: la lobby è Ranked? (bypassa RLS internamente, no ricorsione)
create or replace function is_ranked_lobby(p_lobby uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select ranked from lobbies where id = p_lobby), false)
$$;

-- create_lobby ottiene il flag p_ranked. Drop della vecchia firma a 2 argomenti
-- per evitare ambiguità di overload in PostgREST.
drop function if exists create_lobby(text, text);
create or replace function create_lobby(p_codice text, p_username text, p_ranked boolean default false)
returns lobbies language plpgsql security definer
set search_path = public
as $$
declare l lobbies;
begin
  -- Le partite Ranked richiedono un account reale (non anonimo).
  if p_ranked and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'ranked_requires_login';
  end if;
  insert into lobbies (codice_accesso, ranked) values (p_codice, p_ranked) returning * into l;
  insert into players (lobby_id, device_id, username, ruolo)
    values (l.id, auth.uid(), p_username, 'host');
  perform seed_default_dishes(l.id);
  return l;
end $$;

-- Lockdown Ranked: niente piatti fuori menu, niente modifica punti (host incluso).
-- Ricreo dishes_insert/dishes_update preservando gli helper 0005 + regola Ranked.
drop policy dishes_insert on lobby_dishes;
create policy dishes_insert on lobby_dishes for insert to authenticated
  with check (lobby_id in (select my_lobby_ids()) and not is_ranked_lobby(lobby_id));

drop policy dishes_update on lobby_dishes;
create policy dishes_update on lobby_dishes for update to authenticated
  using (is_lobby_host(lobby_id) and not is_ranked_lobby(lobby_id));

-- Ranked: blocca gli utenti anonimi dall'unirsi. Preserva ruolo = 'player' (0004).
drop policy players_insert on players;
create policy players_insert on players for insert to authenticated
  with check (
    device_id = auth.uid()
    and ruolo = 'player'
    and (
      not is_ranked_lobby(lobby_id)
      or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    )
  );
