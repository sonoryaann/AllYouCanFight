import { getSupabase } from "@/lib/supabase/client";
import type { LeaderboardEntry } from "@/lib/logic/scoring";

export async function getLeaderboard(lobbyId: string): Promise<LeaderboardEntry[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("leaderboard")
    .select("player_id, username, punti, pezzi")
    .eq("lobby_id", lobbyId)
    .order("punti", { ascending: false });
  if (error) throw error;
  return data as LeaderboardEntry[];
}
