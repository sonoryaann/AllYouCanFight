import { describe, it, expect } from "vitest";
import { displayNameFromUser } from "../../src/lib/logic/displayName";

describe("displayNameFromUser", () => {
  it("returns full_name if present", () => {
    expect(displayNameFromUser({ full_name: "Mario Rossi" })).toBe("Mario Rossi");
  });
  it("falls back to name", () => {
    expect(displayNameFromUser({ name: "Luigi" })).toBe("Luigi");
  });
  it("falls back to email local-part", () => {
    expect(displayNameFromUser({ email: "ryan@x.it" })).toBe("ryan");
  });
  it("falls back to Giocatore when nothing is present", () => {
    expect(displayNameFromUser(null)).toBe("Giocatore");
  });
});
