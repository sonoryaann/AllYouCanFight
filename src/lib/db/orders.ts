import { getSupabase } from "@/lib/supabase/client";
import type { OrderRow, DishRow } from "@/lib/logic/scoring";

export type OrderWithDish = OrderRow & {
  id: string;
  quantita_ordinata: number;
  stato: string;
  nome: DishRow["nome"];
  categoria: DishRow["categoria"];
  punti: DishRow["punti"];
};

// Atomic via the add_order RPC (insert-or-increment) — avoids the lost-update
// race that a client-side read-then-write upsert would have under rapid taps.
export async function addOrder(playerId: string, dishId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("add_order", { p_dish: dishId, p_player: playerId });
  if (error) throw error;
}

// Atomic via the mark_eaten RPC (+1 quantita_mangiata, flips stato when full).
export async function markEaten(orderId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("mark_eaten", { p_order: orderId });
  if (error) throw error;
}

// Row shape for getLobbyOrders: still OrderRow-compatible (player_id, dish_id,
// quantita_mangiata) for the existing leaderboard/awards logic, but also
// carries the joined dish fields + order fields needed to build a per-player
// EatenDish (src/lib/logic/missions.ts) for grade computation.
export interface LobbyOrderRow extends OrderRow {
  nome: DishRow["nome"];
  categoria: DishRow["categoria"];
  punti: DishRow["punti"];
  quantita_ordinata: number;
  stato: "in_attesa" | "consegnato";
}

// Reads every order for the lobby (across all players), joining through
// players to satisfy the `orders_read` RLS policy (a lobby member may read
// all orders belonging to players in their own lobby).
export async function getLobbyOrders(lobbyId: string): Promise<LobbyOrderRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("orders")
    .select(
      "player_id, dish_id, quantita_ordinata, quantita_mangiata, stato, lobby_dishes(nome, categoria, punti), players!inner(lobby_id)"
    )
    .eq("players.lobby_id", lobbyId);
  if (error) throw error;

  return data.map((o) => ({
    player_id: o.player_id,
    dish_id: o.dish_id,
    quantita_ordinata: o.quantita_ordinata,
    quantita_mangiata: o.quantita_mangiata,
    stato: o.stato,
    nome: o.lobby_dishes.nome,
    categoria: o.lobby_dishes.categoria,
    punti: o.lobby_dishes.punti,
  }));
}

export async function getMyOrders(playerId: string): Promise<OrderWithDish[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("orders")
    .select("id, player_id, dish_id, quantita_ordinata, quantita_mangiata, stato, lobby_dishes(nome, categoria, punti)")
    .eq("player_id", playerId);
  if (error) throw error;

  return data.map((o) => ({
    id: o.id,
    player_id: o.player_id,
    dish_id: o.dish_id,
    quantita_ordinata: o.quantita_ordinata,
    quantita_mangiata: o.quantita_mangiata,
    stato: o.stato,
    nome: o.lobby_dishes.nome,
    categoria: o.lobby_dishes.categoria,
    punti: o.lobby_dishes.punti,
  }));
}
