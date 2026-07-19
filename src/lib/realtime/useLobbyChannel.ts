"use client";

import { useEffect } from "react";
import { getSupabase } from "../supabase/client";

export function useLobbyChannel(lobbyId: string | null, onChange: () => void) {
  useEffect(() => {
    if (!lobbyId) return;
    const sb = getSupabase();
    let t: ReturnType<typeof setTimeout>;
    const ping = () => { clearTimeout(t); t = setTimeout(onChange, 150); };
    const ch = sb.channel(`lobby:${lobbyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "lobby_dishes", filter: `lobby_id=eq.${lobbyId}` }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `lobby_id=eq.${lobbyId}` }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "lobbies", filter: `id=eq.${lobbyId}` }, ping)
      .subscribe();
    return () => { clearTimeout(t); sb.removeChannel(ch); };
  }, [lobbyId, onChange]);
}
