-- CRITICAL: after 0005, `insert into players (...) returning *` (used by the
-- join flow, e.g. supabase-js `.insert(...).select()`) failed with
-- "new row violates row-level security policy for table players".
--
-- Root cause: INSERT ... RETURNING re-checks the SELECT policy (players_read)
-- against the just-inserted row. players_read's qual called the SECURITY
-- DEFINER helper my_lobby_ids(), which runs its own internal table scan of
-- players. That scan does not see the row currently being inserted (its
-- CommandCounterIncrement happens after the RETURNING check), so a brand new
-- player could never see their own freshly-inserted row and the insert was
-- rejected.
--
-- Fix: check the own row directly against the returned tuple's own column
-- (device_id = auth.uid()) first -- this needs no subquery/scan and is always
-- true for a just-inserted row -- then fall back to my_lobby_ids() for
-- viewing lobby-mates' rows.
drop policy players_read on players;
create policy players_read on players for select to authenticated
  using (device_id = auth.uid() or lobby_id in (select my_lobby_ids()));
