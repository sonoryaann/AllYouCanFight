import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { generateAccessCode } from "@/lib/logic/accessCode";

const MAX_CREATE_ATTEMPTS = 5;

export async function createLobby(
  username: string,
  ranked = false,
): Promise<{ code: string; lobbyId: string }> {
  await ensureAnonSession();
  const sb = getSupabase();

  let lastError: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const code = generateAccessCode();
    const { data, error } = await sb.rpc("create_lobby", {
      p_codice: code,
      p_username: username,
      p_ranked: ranked,
    });
    if (!error && data) {
      return { code: data.codice_accesso, lobbyId: data.id };
    }
    lastError = error;
    // 23505 = unique_violation (codice_accesso collision) — retry with a fresh code.
    if (error?.code !== "23505") break;
  }
  throw new Error(lastError?.message ?? "Failed to create lobby after retries");
}

export async function getLobbyByCode(
  code: string,
): Promise<{ id: string; stato: string; ranked: boolean } | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("lobbies")
    .select("id, stato, ranked")
    .eq("codice_accesso", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function startGame(lobbyId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("lobbies").update({ stato: "in_corso" }).eq("id", lobbyId);
  if (error) throw error;
}

export async function endGame(lobbyId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("lobbies").update({ stato: "completata" }).eq("id", lobbyId);
  if (error) throw error;
}

// Ranked: chiude la partita e congela i punteggi (RPC SECURITY DEFINER).
export async function finalizeRankedGame(lobbyId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("finalize_ranked_game", { p_lobby: lobbyId });
  if (error) throw error;
}
