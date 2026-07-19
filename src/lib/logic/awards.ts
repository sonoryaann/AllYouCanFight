import type { OrderRow, DishRow, PlayerRow } from "./scoring";

export type AwardId = "campione" | "re_salmone" | "sashimi" | "senza_fondo" | "palato_fino" | "esploratore" | "partecipante";
export interface AwardDef { id: AwardId; titolo: string; descrizione: string }

export const AWARDS: Record<AwardId, AwardDef> = {
  campione: { id: "campione", titolo: "Campione Assoluto", descrizione: "Più punti totali" },
  re_salmone: { id: "re_salmone", titolo: "Re del Salmone", descrizione: "Più salmone divorato" },
  sashimi: { id: "sashimi", titolo: "Divoratore di Sashimi", descrizione: "Più sashimi mangiati" },
  senza_fondo: { id: "senza_fondo", titolo: "Senza Fondo", descrizione: "Più pezzi in assoluto" },
  palato_fino: { id: "palato_fino", titolo: "Palato Fino", descrizione: "Più piatti gourmet" },
  esploratore: { id: "esploratore", titolo: "Esploratore", descrizione: "Più piatti diversi provati" },
  partecipante: { id: "partecipante", titolo: "Partecipante", descrizione: "Ha combattuto con onore" },
};

export interface PlayerAward { player_id: string; username: string; awards: AwardId[] }

export function computeAwards(players: PlayerRow[], dishes: DishRow[], orders: OrderRow[]): PlayerAward[] {
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const zero = () => ({ punti: 0, pezzi: 0, salmone: 0, sashimi: 0, gourmet: 0, distinti: new Set<string>() });
  const stats = new Map(players.map((p) => [p.id, zero()]));
  for (const o of orders) {
    const d = dishById.get(o.dish_id); const s = stats.get(o.player_id);
    if (!d || !s || o.quantita_mangiata <= 0) continue;
    s.punti += o.quantita_mangiata * d.punti;
    s.pezzi += o.quantita_mangiata;
    if (/salmone/i.test(d.nome)) s.salmone += o.quantita_mangiata;
    if (d.categoria === "Sashimi") s.sashimi += o.quantita_mangiata;
    if (d.punti >= 3) s.gourmet += o.quantita_mangiata;
    s.distinti.add(d.id);
  }
  const result = new Map(players.map((p) => [p.id, [] as AwardId[]]));
  const award = (id: AwardId, pick: (s: ReturnType<typeof zero>) => number) => {
    let best = 0;
    for (const p of players) best = Math.max(best, pick(stats.get(p.id)!));
    if (best <= 0) return;
    for (const p of players) if (pick(stats.get(p.id)!) === best) result.get(p.id)!.push(id);
  };
  award("campione", (s) => s.punti);
  award("re_salmone", (s) => s.salmone);
  award("sashimi", (s) => s.sashimi);
  award("senza_fondo", (s) => s.pezzi);
  award("palato_fino", (s) => s.gourmet);
  award("esploratore", (s) => s.distinti.size);
  return players.map((p) => {
    const a = result.get(p.id)!;
    return { player_id: p.id, username: p.username, awards: a.length ? a : (["partecipante"] as AwardId[]) };
  });
}
