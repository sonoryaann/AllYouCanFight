import { describe, it, expect } from "vitest";
import { shouldPlayIntro } from "../../src/lib/logic/intro";

describe("shouldPlayIntro", () => {
  it("plays on every load when the user has no reduced-motion preference", () => {
    expect(shouldPlayIntro(false)).toBe(true);
  });

  it("does not play when the user prefers reduced motion", () => {
    expect(shouldPlayIntro(true)).toBe(false);
  });
});
