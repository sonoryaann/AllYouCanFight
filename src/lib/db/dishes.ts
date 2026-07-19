import { getSupabase } from "@/lib/supabase/client";
import type { DishRow } from "@/lib/logic/scoring";

export async function getDishes(lobbyId: string): Promise<DishRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("lobby_dishes")
    .select("id, nome, categoria, punti")
    .eq("lobby_id", lobbyId);
  if (error) throw error;
  return data;
}

export async function updateDishPoints(dishId: string, punti: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("lobby_dishes").update({ punti }).eq("id", dishId);
  if (error) throw error;
}

export async function addCustomDish(lobbyId: string, nome: string, punti: number): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb
    .from("lobby_dishes")
    .insert({ lobby_id: lobbyId, nome, categoria: "Fuori Menu", punti });
  if (error) throw error;
}
