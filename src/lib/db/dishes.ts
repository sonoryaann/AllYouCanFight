import { getSupabase } from "@/lib/supabase/client";
import type { DishRow } from "@/lib/logic/scoring";
import { orderDishes } from "@/lib/logic/dishOrder";

export async function getDishes(lobbyId: string): Promise<DishRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("lobby_dishes")
    .select("id, nome, categoria, punti")
    .eq("lobby_id", lobbyId);
  if (error) throw error;
  // Deterministic, stable order so editing a dish's points never reorders the
  // list (PostgREST returns rows in an undefined order after an UPDATE).
  return orderDishes(data);
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
