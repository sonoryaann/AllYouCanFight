import { getSupabase } from "@/lib/supabase/client";

export interface GlobalScore {
  punti: number;
  pezzi: number;
  partite: number;
}

// Punteggio globale cumulativo = somma dei risultati Ranked dell'utente.
export async function getMyGlobalScore(userId: string): Promise<GlobalScore> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("game_results")
    .select("punti, pezzi")
    .eq("user_id", userId);
  if (error) throw error;
  const rows = data ?? [];
  return {
    punti: rows.reduce((sum, r) => sum + r.punti, 0),
    pezzi: rows.reduce((sum, r) => sum + r.pezzi, 0),
    partite: rows.length,
  };
}
