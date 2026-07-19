import { describe, it, expect } from "vitest";
import { generateAccessCode } from "../../src/lib/logic/accessCode";
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
describe("generateAccessCode", () => {
  it("is 6 chars from the safe alphabet", () => {
    const code = generateAccessCode();
    expect(code).toHaveLength(6);
    for (const ch of code) expect(ALPHABET).toContain(ch);
  });
  it("is deterministic given a rand fn", () => {
    const code = generateAccessCode(() => 0);
    expect(code).toBe("AAAAAA");
  });
});
