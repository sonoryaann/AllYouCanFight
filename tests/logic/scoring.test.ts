import { describe, it, expect } from "vitest";
import { computeLeaderboard } from "../../src/lib/logic/scoring";

const dishes = [
  { id: "d1", nome: "Nigiri Salmone", categoria: "Nigiri", punti: 1 },
  { id: "d2", nome: "Sashimi Tonno", categoria: "Sashimi", punti: 3 },
];
const players = [{ id: "p1", username: "Ann" }, { id: "p2", username: "Bea" }];

describe("computeLeaderboard", () => {
  it("sums points as mangiata * dish points", () => {
    const orders = [
      { player_id: "p1", dish_id: "d1", quantita_mangiata: 2 },
      { player_id: "p1", dish_id: "d2", quantita_mangiata: 1 },
      { player_id: "p2", dish_id: "d1", quantita_mangiata: 4 },
    ];
    const lb = computeLeaderboard(players, dishes, orders);
    // p1 (Ann) = 2*1 + 1*3 = 5 punti, 3 pezzi
    // p2 (Bea) = 4*1 = 4 punti, 4 pezzi
    // sorted by punti desc -> Ann first, Bea second
    expect(lb[0]).toEqual({ player_id: "p1", username: "Ann", punti: 5, pezzi: 3 });
    expect(lb[1]).toEqual({ player_id: "p2", username: "Bea", punti: 4, pezzi: 4 });
  });
  it("includes players with zero consumption", () => {
    const lb = computeLeaderboard(players, dishes, []);
    expect(lb).toHaveLength(2);
    expect(lb.every((e) => e.punti === 0)).toBe(true);
  });
});
