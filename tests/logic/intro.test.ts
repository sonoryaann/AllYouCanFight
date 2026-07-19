import { describe, it, expect } from "vitest";
import { shouldPlayIntro } from "../../src/lib/logic/intro";

describe("shouldPlayIntro", () => {
  it("plays only on first visit without reduced motion", () => {
    expect(shouldPlayIntro(null, false)).toBe(true);
    expect(shouldPlayIntro("1", false)).toBe(false);   // already seen
    expect(shouldPlayIntro(null, true)).toBe(false);    // reduced motion
    expect(shouldPlayIntro("1", true)).toBe(false);
  });
});
