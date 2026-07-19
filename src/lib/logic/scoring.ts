export interface OrderRow { player_id: string; dish_id: string; quantita_mangiata: number }
export interface DishRow { id: string; nome: string; categoria: string; punti: number }
export interface PlayerRow { id: string; username: string }
export interface LeaderboardEntry { player_id: string; username: string; punti: number; pezzi: number }

export function computeLeaderboard(players: PlayerRow[], dishes: DishRow[], orders: OrderRow[]): LeaderboardEntry[] {
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const acc = new Map(players.map((p) => [p.id, { punti: 0, pezzi: 0 }]));
  for (const o of orders) {
    const dish = dishById.get(o.dish_id);
    const a = acc.get(o.player_id);
    if (!dish || !a) continue;
    a.punti += o.quantita_mangiata * dish.punti;
    a.pezzi += o.quantita_mangiata;
  }
  return players
    .map((p) => ({ player_id: p.id, username: p.username, ...acc.get(p.id)! }))
    .sort((a, b) => b.punti - a.punti || a.username.localeCompare(b.username));
}
