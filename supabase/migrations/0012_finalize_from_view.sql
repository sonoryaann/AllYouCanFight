-- Review fix (sub-project C):
-- (1) finalize_ranked_game now reads final scores directly from the `leaderboard`
--     view (single source of truth) instead of duplicating its aggregation SQL,
--     so the frozen global score can never drift from what players saw in-game.
-- (2) Snapshot is decoupled from the stato transition: the insert always runs
--     (idempotency comes from unique(lobby_id, user_id) + on conflict do nothing),
--     so a ranked game whose stato was set to 'completata' by another path still
--     gets its scores recorded.
create or replace function finalize_ranked_game(p_lobby uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l lobbies;
begin
  select * into l from lobbies where id = p_lobby;
  if l is null then raise exception 'lobby not found: %', p_lobby; end if;
  if not is_lobby_host(p_lobby) then raise exception 'only host can finalize'; end if;
  if not l.ranked then raise exception 'not a ranked lobby'; end if;

  if l.stato <> 'completata' then
    update lobbies set stato = 'completata' where id = p_lobby;
  end if;

  -- Freeze each logged-in (non-anonymous) player's final score from the view.
  insert into game_results (lobby_id, user_id, username, punti, pezzi)
  select lb.lobby_id, p.device_id, lb.username, lb.punti, lb.pezzi
  from leaderboard lb
  join players p on p.id = lb.player_id
  join auth.users au on au.id = p.device_id and au.is_anonymous is not true
  where lb.lobby_id = p_lobby
  on conflict (lobby_id, user_id) do nothing;
end $$;
