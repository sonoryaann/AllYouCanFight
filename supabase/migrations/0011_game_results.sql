-- Snapshot durevole dei risultati Ranked: una riga per giocatore per partita.
create table game_results (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid references lobbies(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  punti int not null,
  pezzi int not null,
  creato_il timestamptz not null default now(),
  unique (lobby_id, user_id)
);
create index game_results_user_id_idx on game_results (user_id);

alter table game_results enable row level security;
-- Ogni utente legge solo i propri risultati. La lettura cross-utente per le
-- classifiche globali sarà definita nel sotto-progetto D.
create policy game_results_read on game_results for select to authenticated
  using (user_id = auth.uid());
-- Nessuna policy di insert/update/delete: le righe le scrive solo
-- finalize_ranked_game (SECURITY DEFINER).

-- Chiude una partita Ranked e congela i punteggi finali. Idempotente.
create or replace function finalize_ranked_game(p_lobby uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l lobbies;
begin
  select * into l from lobbies where id = p_lobby;
  if l is null then raise exception 'lobby not found: %', p_lobby; end if;
  if not is_lobby_host(p_lobby) then raise exception 'only host can finalize'; end if;
  if not l.ranked then raise exception 'not a ranked lobby'; end if;
  if l.stato = 'completata' then return; end if; -- guardia di idempotenza

  update lobbies set stato = 'completata' where id = p_lobby;

  -- Congela il punteggio derivato di ogni giocatore loggato (non anonimo).
  insert into game_results (lobby_id, user_id, username, punti, pezzi)
  select p.lobby_id, p.device_id, p.username,
         coalesce(sum(o.quantita_mangiata * d.punti), 0)::int,
         coalesce(sum(o.quantita_mangiata), 0)::int
  from players p
  join auth.users au on au.id = p.device_id and au.is_anonymous is not true
  left join orders o on o.player_id = p.id
  left join lobby_dishes d on d.id = o.dish_id
  where p.lobby_id = p_lobby
  group by p.lobby_id, p.device_id, p.username
  on conflict (lobby_id, user_id) do nothing;
end $$;

revoke execute on function finalize_ranked_game(uuid) from public, anon;
grant execute on function finalize_ranked_game(uuid) to authenticated;

-- delete_my_account: rimuovi anche i risultati (già coperto dal cascade su
-- user_id, esplicitato per chiarezza e robustezza).
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from game_results where user_id = auth.uid();
  delete from players where device_id = auth.uid();  -- cascades to orders
  delete from profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
