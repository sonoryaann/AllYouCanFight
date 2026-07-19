import { describe, it, expect } from "vitest";
import { computeAwards } from "../../src/lib/logic/awards";

const dishes = [
  { id: "d1", nome: "Nigiri Salmone", categoria: "Nigiri", punti: 1 },
  { id: "d2", nome: "Sashimi Tonno", categoria: "Sashimi", punti: 3 },
  { id: "d3", nome: "Gyoza", categoria: "Fritti", punti: 2 },
];
const players = [{ id: "p1", username: "Ann" }, { id: "p2", username: "Bea" }];

describe("computeAwards", () => {
  it("assigns category winners and partecipante fallback", () => {
    const orders = [
      { player_id: "p1", dish_id: "d1", quantita_mangiata: 10 }, // salmone king, senza_fondo
      { player_id: "p2", dish_id: "d2", quantita_mangiata: 3 },  // sashimi, palato_fino (9 pts; p1 is campione with 10 pts)
    ];
    const res = computeAwards(players, dishes, orders);
    const ann = res.find((r) => r.player_id === "p1")!;
    const bea = res.find((r) => r.player_id === "p2")!;
    expect(ann.awards).toContain("re_salmone");
    expect(ann.awards).toContain("senza_fondo");
    expect(bea.awards).toContain("sashimi");
    expect(bea.awards).toContain("palato_fino");
  });
  it("gives partecipante to a player with no wins", () => {
    const orders = [{ player_id: "p1", dish_id: "d1", quantita_mangiata: 5 }];
    const res = computeAwards(players, dishes, orders);
    const bea = res.find((r) => r.player_id === "p2")!;
    expect(bea.awards).toEqual(["partecipante"]);
  });
});
