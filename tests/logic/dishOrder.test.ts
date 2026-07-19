import { describe, it, expect } from "vitest";
import { orderDishes, CATEGORY_ORDER } from "../../src/lib/logic/dishOrder";

interface D { id: string; nome: string; categoria: string; punti: number }

const make = (id: string, categoria: string, nome: string): D => ({ id, categoria, nome, punti: 1 });

describe("orderDishes", () => {
  it("orders by the fixed category order, then by nome", () => {
    const input: D[] = [
      make("1", "Dolci", "Mochi"),
      make("2", "Nigiri", "Tonno"),
      make("3", "Nigiri", "Salmone"),
      make("4", "Sashimi", "Tonno"),
    ];
    const out = orderDishes(input).map((d) => d.id);
    // Nigiri (Salmone, Tonno) -> Sashimi (Tonno) -> Dolci (Mochi)
    expect(out).toEqual(["3", "2", "4", "1"]);
  });

  it("is STABLE: reordering the input does not change the output", () => {
    const a: D[] = [
      make("1", "Nigiri", "Salmone"),
      make("2", "Sashimi", "Tonno"),
      make("3", "Fritti", "Gyoza"),
    ];
    const shuffled = [a[2], a[0], a[1]];
    expect(orderDishes(a).map((d) => d.id)).toEqual(orderDishes(shuffled).map((d) => d.id));
  });

  it("places unknown categories after known ones, alphabetically", () => {
    const input: D[] = [
      make("1", "Zuppe", "Miso"),
      make("2", "Fuori Menu", "Ricciola"),
      make("3", "Nigiri", "Salmone"),
    ];
    const out = orderDishes(input).map((d) => d.categoria);
    expect(out[0]).toBe("Nigiri"); // known first
    expect(out).toEqual(["Nigiri", "Fuori Menu", "Zuppe"]); // then unknown alphabetical
  });

  it("does not mutate the input array", () => {
    const input: D[] = [make("1", "Dolci", "Mochi"), make("2", "Nigiri", "Tonno")];
    const copy = [...input];
    orderDishes(input);
    expect(input).toEqual(copy);
  });

  it("exposes the intended culinary category order", () => {
    expect(CATEGORY_ORDER[0]).toBe("Nigiri");
    expect(CATEGORY_ORDER).toContain("Fuori Menu");
  });
});
