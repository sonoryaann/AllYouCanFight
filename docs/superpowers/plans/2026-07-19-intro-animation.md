# Intro Animation & Logo Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development or superpowers:executing-plans. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Add a first-visit-only intro animation on the home page ("ALL YOU CAN FIGHT" words slamming in one by one, then two SVG chopsticks doing a sword-clash that settle into the site logo, plus a small "built with love for Alice ❤" watermark), and reuse the chopsticks as the home logo and favicon.

**Architecture:** A reusable `Logo` SVG component is the single source of the chopsticks mark. A client-only `IntroAnimation` overlay plays a CSS-keyframe sequence, decides visibility after mount (localStorage `aycf_intro_seen`), honors `prefers-reduced-motion`, and calls `onDone()`. The home page mounts the overlay (post-mount decision, no hydration flash) and renders `Logo` at the top. Favicon comes from `src/app/icon.svg` using the same mark. No new dependencies, no DB changes.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, CSS keyframes, inline SVG, Vitest.

**Spec:** `docs/superpowers/specs/2026-07-19-intro-animation-design.md`

## Global Constraints

- No new dependencies; no DB changes.
- SSR-safe: never render the overlay during SSR/first client render; decide after mount → no hydration mismatch, no intro flash for returning visitors.
- Only `transform`/`opacity` animations (GPU-friendly).
- Honor `prefers-reduced-motion` (instant/skipped animation).
- "Salta" (skip) control, target ≥44px; Italian copy.
- Watermark text exactly: `built with love for Alice ❤`.
- localStorage key: `aycf_intro_seen` = `"1"`.

---

## Task 1: `shouldPlayIntro` helper (pure, TDD)

**Files:** Create `src/lib/logic/intro.ts`; Test `tests/logic/intro.test.ts`

**Interface:** `export function shouldPlayIntro(seen: string | null, prefersReducedMotion: boolean): boolean` — returns `true` only when `seen !== "1"` AND `!prefersReducedMotion`.

- [ ] **Step 1: Failing test**
```ts
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
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Implement**
```ts
export function shouldPlayIntro(seen: string | null, prefersReducedMotion: boolean): boolean {
  return seen !== "1" && !prefersReducedMotion;
}
```
- [ ] **Step 4: Run → PASS** (`npm test`).
- [ ] **Step 5: Commit** (`feat: shouldPlayIntro helper`).

---

## Task 2: `Logo` component + favicon

**Files:** Create `src/components/Logo.tsx`, `src/app/icon.svg`

**Interface:** `export function Logo({ size?: number, withWordmark?: boolean, className?: string })` — renders the chopsticks SVG mark (two crossed chopsticks forming an "X"/battle pose), optionally with the "All You Can Fight" wordmark beside/below.

- [ ] **Step 1:** Implement `Logo.tsx`: an inline `<svg>` of two chopsticks crossed like clashing swords (tapered rounded rects, distinct tip, on-brand colors: nori/soy wood tone + salmon accent tip). Vector, scales via `size`. Keep it a clean, recognizable mark.
- [ ] **Step 2:** Create `src/app/icon.svg` — a compact square version of the same crossed-chopsticks mark (Next.js App Router serves this as the favicon automatically). Ensure it reads well at 32×32.
- [ ] **Step 3:** Verify `npm run build` passes and `/icon.svg` is picked up (Next generates the icon link). Commit (`feat: chopsticks Logo component and favicon`).

---

## Task 3: `IntroAnimation` overlay + home integration

**Files:** Create `src/components/IntroAnimation.tsx`; Modify `src/app/page.tsx`, `src/app/globals.css`

- [ ] **Step 1: Keyframes** in `globals.css` (only transform/opacity): a "slam-in" (scale 0.3→1.15→1 with slight rotate, opacity 0→1) for words; chopstick entrances from left/right (translateX + rotate); a "clash" shake (small alternating rotate/translate) repeated 2–3×; a settle to logo pose; overlay fade-out. Respect reduced motion via a `@media (prefers-reduced-motion: reduce)` block that flattens animations.

- [ ] **Step 2: `IntroAnimation.tsx`** (`"use client"`), props `{ onDone: () => void }`:
  - Renders a fixed full-screen overlay (z-50), on-brand background.
  - Phase state machine (timers): `words` → the 4 words "ALL", "YOU", "CAN", "FIGHT" appear one at a time (staggered slam-in) → `battle` → two `Logo`-style chopsticks (or inline SVG) fly in and clash 2–3× → `logo` → they settle with the wordmark → then fade overlay and call `onDone()`.
  - Small **"Salta"** button (corner, ≥44px) → clears timers, calls `onDone()`.
  - Watermark `built with love for Alice ❤` small/subtle at the bottom.
  - `Esc` key also triggers skip (nice-to-have).
  - Total ~3–4s. Clean up all timers on unmount.

- [ ] **Step 3: Home integration** in `page.tsx` (already `"use client"`):
  - After mount, read `localStorage.getItem("aycf_intro_seen")` and `window.matchMedia("(prefers-reduced-motion: reduce)").matches`; use `shouldPlayIntro(...)` to set a `showIntro` state. Never compute during SSR/first render (start `showIntro=false`, decide in `useEffect`).
  - When intro finishes/skips (`onDone`): `localStorage.setItem("aycf_intro_seen","1")` and hide the overlay.
  - Render `<Logo>` at the top of the home content (persistent, after/independently of the intro).

- [ ] **Step 4: Verify** — `npm run build` passes, `npm test` still green. `npm run dev` (or note if port busy): first load shows the intro; reload shows no intro (localStorage set); "Salta" works; favicon shows the chopsticks. Reason through reduced-motion path. Stop dev server.

- [ ] **Step 5: Commit** (`feat: first-visit intro animation with chopsticks battle and logo`).

---

## Self-Review Notes

- **Spec coverage:** words slam-in one-by-one (Task 3) ✓; chopsticks sword-battle → logo (Tasks 2–3) ✓; first-visit-only + Salta (Tasks 1, 3) ✓; watermark for Alice (Task 3) ✓; logo on home + favicon (Task 2) ✓; reduced-motion + SSR-safe (Tasks 1, 3) ✓; no deps/DB (all) ✓.
- **Type consistency:** `shouldPlayIntro` (Task 1) used in `page.tsx` (Task 3); `Logo` (Task 2) used in `page.tsx` and optionally inside the intro.
- **Watch-outs:** decide `showIntro` only after mount (no hydration flash); animate only transform/opacity; exact watermark string with ❤.
