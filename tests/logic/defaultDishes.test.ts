import { describe, it, expect } from "vitest";
import { DEFAULT_DISHES } from "../../src/data/defaultDishes";
describe("DEFAULT_DISHES", () => {
  it("has exactly 25 dishes", () => { expect(DEFAULT_DISHES).toHaveLength(25); });
  it("every dish has nome, categoria and points >= 1", () => {
    for (const d of DEFAULT_DISHES) {
      expect(d.nome.length).toBeGreaterThan(0);
      expect(d.categoria.length).toBeGreaterThan(0);
      expect(d.punti).toBeGreaterThanOrEqual(1);
    }
  });
});
