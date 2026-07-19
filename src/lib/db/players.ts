import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { getLobbyByCode } from "@/lib/db/lobbies";

export async function joinLobby(code: string, username: string): Promise<{ playerId: string; lobbyId: string }> {
  const deviceId = await ensureAnonSession();
  const sb = getSupabase();

  const lobby = await getLobbyByCode(code);
  if (!lobby) throw new Error("Lobby not found");

  const { data, error } = await sb
    .from("players")
    .insert({ lobby_id: lobby.id, username })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation on (lobby_id, device_id) — this device already
    // has a player row in this lobby; return the existing one instead of failing.
    if (error.code === "23505") {
      const { data: existing, error: fetchError } = await sb
        .from("players")
        .select("id")
        .eq("lobby_id", lobby.id)
        .eq("device_id", deviceId)
        .single();
      if (fetchError) throw fetchError;
      return { playerId: existing.id, lobbyId: lobby.id };
    }
    throw error;
  }

  return { playerId: data.id, lobbyId: lobby.id };
}

export async function getPlayers(lobbyId: string): Promise<{ id: string; username: string; ruolo: string }[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("players")
    .select("id, username, ruolo")
    .eq("lobby_id", lobbyId);
  if (error) throw error;
  return data;
}

export async function getMyPlayer(lobbyId: string): Promise<{ id: string; ruolo: string } | null> {
  const sb = getSupabase();
  const { data: userData } = await sb.auth.getUser();
  const deviceId = userData.user?.id;
  if (!deviceId) return null;

  const { data, error } = await sb
    .from("players")
    .select("id, ruolo")
    .eq("lobby_id", lobbyId)
    .eq("device_id", deviceId)
    .maybeSingle();
  if (error) throw error;
  return data;
}
