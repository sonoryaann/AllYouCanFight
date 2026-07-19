# Side Quests & Sushi Grade Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a League-of-Legends-style side-quest system (27 data-derived missions with tier ladders) plus a cumulative "Sushi grade", shown in a new in-game "Missioni" tab and woven into the end-game results and shareable badge image.

**Architecture:** All quest logic is pure and derived from data the app already tracks — no new database tables, no migration. A pure module computes per-player stats from the player's eaten orders, maps them through mission tier ladders to levels, and sums levels into a grade score → grade band. The in-game tab reads the existing `myOrders` state; the results screen computes per-player grades from lobby orders. Designed so that when accounts arrive, the same missions/grades consume cumulative stats instead of single-game stats.

**Tech Stack:** Next.js 16 (App Router, TS), React 19, Tailwind v4, Vitest. No Supabase schema changes.

**Spec:** `docs/superpowers/specs/2026-07-19-side-quests-design.md`

## Global Constraints

- All user-facing copy in **Italian**.
- Mobile-first; touch targets ≥ 44px.
- **Missions are derived only** from existing data (eaten/ordered dishes, categories, points, order state). No new user actions, no new tracked events, **no DB migration**.
- Points/scoring rules unchanged; the grade is derived, never stored client-side.
- All Supabase reads still go through `src/lib/db/*`.
- Reuse the existing theme tokens (rice/nori/salmon/wasabi, rounded cards) and match existing screens.
- Exactly **27 missions** and **9 grade bands** as enumerated in the spec — use the ids, titles, emojis, tiers, and thresholds verbatim.

---

## File Structure

```
src/lib/logic/missions.ts        # NEW — all pure quest logic (this plan's core)
src/components/MissionsTab.tsx    # NEW — grade card + mission list
src/components/TabBar.tsx         # MODIFY — add 4th "missioni" tab
src/app/lobby/[code]/play/page.tsx    # MODIFY — render MissionsTab with myOrders
src/lib/db/orders.ts             # MODIFY — extend getLobbyOrders with EatenDish fields per player
src/app/lobby/[code]/results/page.tsx # MODIFY — per-player grade + feature current player's grade
src/components/AwardCard.tsx     # MODIFY — accept + pass `grado`
src/lib/share/shareBadge.ts      # MODIFY — draw `grado` on the shared image
tests/logic/missions.test.ts     # NEW — unit tests for missions.ts
```

---

## Task 1: Missions & grade logic (pure)

**Files:**
- Create: `src/lib/logic/missions.ts`
- Test: `tests/logic/missions.test.ts`

**Interfaces (produced; later tasks depend on these exact names):**
`EatenDish`, `PlayerStats`, `computePlayerStats`, `MissionDef`, `MISSIONS` (27), `missionLevel`, `MissionProgress`, `computeMissions`, `Grade`, `GRADES` (9), `gradeScore`, `gradeForScore`, `gradeProgress`, `computeGrade`.

- [ ] **Step 1: Write the failing tests**

Create `tests/logic/missions.test.ts`:
```ts
import { describe, it, expect } from "vitest";
import {
  computePlayerStats, computeMissions, missionLevel,
  gradeScore, gradeForScore, gradeProgress, computeGrade,
  MISSIONS, GRADES, type EatenDish,
} from "../../src/lib/logic/missions";

const eat = (nome: string, categoria: string, punti: number, mangiata: number, ordinata = mangiata, stato: EatenDish["stato"] = mangiata >= ordinata ? "consegnato" : "in_attesa"): EatenDish =>
  ({ nome, categoria, punti, quantita_ordinata: ordinata, quantita_mangiata: mangiata, stato });

describe("computePlayerStats", () => {
  it("aggregates categories, combos, ingredients, points and behavior", () => {
    const s = computePlayerStats([
      eat("Nigiri Salmone", "Nigiri", 1, 3),
      eat("Sashimi Tonno", "Sashimi", 3, 2),
      eat("Uramaki Spicy Tonno", "Uramaki", 2, 1),
      eat("Tempura Gamberi", "Fritti", 2, 2),
      eat("Ricciola", "Fuori Menu", 4, 0, 2, "in_attesa"), // ordered, not eaten
    ]);
    expect(s.nigiri).toBe(3);
    expect(s.sashimi).toBe(2);
    expect(s.uramaki).toBe(1);
    expect(s.maki).toBe(1);          // uramaki + hosomaki
    expect(s.crudo).toBe(5);         // nigiri + sashimi
    expect(s.salmone).toBe(3);
    expect(s.tonno).toBe(3);         // sashimi tonno (2) + spicy tonno (1)
    expect(s.spicy).toBe(1);
    expect(s.gambero).toBe(2);       // "Gamberi" matches /gamber/
    expect(s.tempura).toBe(2);
    expect(s.gourmet).toBe(2);       // punti>=3: sashimi tonno (2)
    expect(s.economici).toBe(3);     // punti==1: nigiri salmone (3)
    expect(s.puntiTotali).toBe(3 * 1 + 2 * 3 + 1 * 2 + 2 * 2); // 3+6+2+4 = 15
    expect(s.pezziTotali).toBe(8);
    expect(s.distinctDishes).toBe(4);       // 4 with mangiata>0
    expect(s.distinctCategories).toBe(4);   // Nigiri, Sashimi, Uramaki, Fritti
    expect(s.distinctOrders).toBe(5);       // all 5 have ordinata>0
    expect(s.completedOrders).toBe(4);      // the Fuori Menu one is in_attesa
    expect(s.fuoriMenu).toBe(0);            // it was not eaten
  });
});

describe("missionLevel", () => {
  it("counts thresholds reached; boundary counts; caps at tiers length", () => {
    expect(missionLevel(0, [1, 3, 6])).toBe(0);
    expect(missionLevel(1, [1, 3, 6])).toBe(1);
    expect(missionLevel(3, [1, 3, 6])).toBe(2);
    expect(missionLevel(100, [1, 3, 6])).toBe(3);
  });
});

describe("MISSIONS & computeMissions", () => {
  it("has 27 missions each mapping to a stat with 5 tiers", () => {
    expect(MISSIONS).toHaveLength(27);
    for (const m of MISSIONS) expect(m.tiers).toHaveLength(5);
  });
  it("reports value, level and next threshold", () => {
    const stats = computePlayerStats([eat("Nigiri Salmone", "Nigiri", 1, 6)]);
    const nigiri = computeMissions(stats).find((m) => m.def.id === "nigiri")!;
    expect(nigiri.value).toBe(6);
    expect(nigiri.level).toBe(3);   // tiers 1,3,6,10,15 -> 6 reaches 3
    expect(nigiri.next).toBe(10);
  });
});

describe("grade", () => {
  it("sums levels into a score", () => {
    expect(gradeScore([{ level: 2 } as never, { level: 3 } as never])).toBe(5);
  });
  it("maps score to the highest band with min<=score (boundaries)", () => {
    expect(gradeForScore(0).nome).toBe("Chicco di Riso");
    expect(gradeForScore(5).nome).toBe("Apprendista");
    expect(gradeForScore(35).nome).toBe("Sushi d'Oro");
    expect(gradeForScore(120).nome).toBe("Leggenda del Sushi");
    expect(GRADES).toHaveLength(9);
  });
  it("gradeProgress gives 0..1 and null next at the top", () => {
    const p = gradeProgress(5); // Apprendista(5) -> Bronzo(12)
    expect(p.current.nome).toBe("Apprendista");
    expect(p.next?.nome).toBe("Sushi di Bronzo");
    expect(p.ratio).toBeCloseTo(0);
    expect(gradeProgress(200).next).toBeNull();
    expect(gradeProgress(200).ratio).toBe(1);
  });
  it("computeGrade ties it together", () => {
    const { score, grade } = computeGrade([eat("Nigiri Salmone", "Nigiri", 1, 6)]);
    expect(score).toBeGreaterThan(0);
    expect(grade.nome).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run tests → FAIL** (`npx vitest run tests/logic/missions.test.ts`) — module not found.

- [ ] **Step 3: Implement `src/lib/logic/missions.ts`**

```ts
export interface EatenDish {
  nome: string;
  categoria: string;
  punti: number;
  quantita_ordinata: number;
  quantita_mangiata: number;
  stato: "in_attesa" | "consegnato";
}

export interface PlayerStats {
  nigiri: number; uramaki: number; hosomaki: number; sashimi: number;
  gunkan: number; temaki: number; fritti: number; dolci: number;
  maki: number; crudo: number;
  salmone: number; tonno: number; gambero: number; branzino: number;
  anguilla: number; veg: number; tempura: number; spicy: number;
  gourmet: number; economici: number; puntiTotali: number;
  distinctDishes: number; distinctCategories: number;
  pezziTotali: number; distinctOrders: number; completedOrders: number; fuoriMenu: number;
}

const CATEGORY_FIELD: Record<string, keyof PlayerStats> = {
  Nigiri: "nigiri", Uramaki: "uramaki", Hosomaki: "hosomaki", Sashimi: "sashimi",
  Gunkan: "gunkan", Temaki: "temaki", Fritti: "fritti", Dolci: "dolci",
};

export function computePlayerStats(eaten: EatenDish[]): PlayerStats {
  const s: PlayerStats = {
    nigiri: 0, uramaki: 0, hosomaki: 0, sashimi: 0, gunkan: 0, temaki: 0, fritti: 0, dolci: 0,
    maki: 0, crudo: 0, salmone: 0, tonno: 0, gambero: 0, branzino: 0, anguilla: 0, veg: 0,
    tempura: 0, spicy: 0, gourmet: 0, economici: 0, puntiTotali: 0, distinctDishes: 0,
    distinctCategories: 0, pezziTotali: 0, distinctOrders: 0, completedOrders: 0, fuoriMenu: 0,
  };
  const categories = new Set<string>();
  for (const d of eaten) {
    if (d.quantita_ordinata > 0) s.distinctOrders += 1;
    if (d.stato === "consegnato") s.completedOrders += 1;
    const m = d.quantita_mangiata;
    if (m <= 0) continue;
    s.pezziTotali += m;
    s.puntiTotali += m * d.punti;
    if (d.punti >= 3) s.gourmet += m;
    if (d.punti === 1) s.economici += m;
    s.distinctDishes += 1;
    categories.add(d.categoria);
    const cf = CATEGORY_FIELD[d.categoria];
    if (cf) (s[cf] as number) += m;
    if (d.categoria === "Fuori Menu") s.fuoriMenu += m;
    const n = d.nome.toLowerCase();
    if (/salmone/.test(n)) s.salmone += m;
    if (/tonno/.test(n)) s.tonno += m;
    if (/gamber/.test(n)) s.gambero += m;
    if (/branzino/.test(n)) s.branzino += m;
    if (/anguilla/.test(n)) s.anguilla += m;
    if (/avocado|verdur|edamame|cetriolo/.test(n)) s.veg += m;
    if (/tempura/.test(n)) s.tempura += m;
    if (/spicy/.test(n)) s.spicy += m;
  }
  s.maki = s.uramaki + s.hosomaki;
  s.crudo = s.nigiri + s.sashimi;
  s.distinctCategories = categories.size;
  return s;
}

export interface MissionDef {
  id: string;
  emoji: string;
  titolo: string;
  descrizione: string;
  stat: keyof PlayerStats;
  tiers: number[];
}

export const MISSIONS: MissionDef[] = [
  { id: "nigiri", emoji: "🍣", titolo: "Divoratore di Nigiri", descrizione: "Mangia nigiri", stat: "nigiri", tiers: [1, 3, 6, 10, 15] },
  { id: "uramaki", emoji: "🌊", titolo: "Maestro Uramaki", descrizione: "Mangia uramaki", stat: "uramaki", tiers: [1, 3, 6, 10, 15] },
  { id: "hosomaki", emoji: "🎋", titolo: "Minimalista Hosomaki", descrizione: "Mangia hosomaki", stat: "hosomaki", tiers: [1, 2, 4, 6, 9] },
  { id: "sashimi", emoji: "🐟", titolo: "Signore del Sashimi", descrizione: "Mangia sashimi", stat: "sashimi", tiers: [1, 2, 4, 6, 9] },
  { id: "gunkan", emoji: "🛶", titolo: "Capitano Gunkan", descrizione: "Mangia gunkan", stat: "gunkan", tiers: [1, 2, 3, 5, 7] },
  { id: "temaki", emoji: "🌯", titolo: "Artista del Temaki", descrizione: "Mangia temaki", stat: "temaki", tiers: [1, 2, 3, 4, 6] },
  { id: "fritti", emoji: "🔥", titolo: "Amante del Fritto", descrizione: "Mangia piatti fritti", stat: "fritti", tiers: [1, 2, 3, 5, 7] },
  { id: "dolci", emoji: "🍡", titolo: "Goloso", descrizione: "Mangia dolci", stat: "dolci", tiers: [1, 2, 3, 4, 5] },
  { id: "maki", emoji: "🌀", titolo: "Re dei Maki", descrizione: "Mangia uramaki e hosomaki", stat: "maki", tiers: [2, 5, 9, 14, 20] },
  { id: "crudo", emoji: "🍥", titolo: "Purista del Crudo", descrizione: "Mangia nigiri e sashimi", stat: "crudo", tiers: [2, 5, 9, 14, 20] },
  { id: "salmone", emoji: "🧡", titolo: "Salmon Addict", descrizione: "Mangia piatti al salmone", stat: "salmone", tiers: [1, 3, 5, 8, 12] },
  { id: "tonno", emoji: "🔴", titolo: "Cacciatore di Tonno", descrizione: "Mangia piatti al tonno", stat: "tonno", tiers: [1, 3, 5, 8, 12] },
  { id: "gambero", emoji: "🦐", titolo: "Amico dei Gamberi", descrizione: "Mangia piatti al gambero", stat: "gambero", tiers: [1, 2, 3, 5, 7] },
  { id: "branzino", emoji: "🐠", titolo: "Intenditore di Branzino", descrizione: "Mangia piatti al branzino", stat: "branzino", tiers: [1, 2, 3, 4, 5] },
  { id: "anguilla", emoji: "🥢", titolo: "Coraggioso", descrizione: "Mangia anguilla", stat: "anguilla", tiers: [1, 2, 3, 4, 5] },
  { id: "veg", emoji: "🥗", titolo: "Salutista", descrizione: "Mangia piatti vegetali", stat: "veg", tiers: [1, 2, 3, 5, 7] },
  { id: "tempura", emoji: "🍤", titolo: "Maestro Tempura", descrizione: "Mangia tempura", stat: "tempura", tiers: [1, 2, 3, 4, 6] },
  { id: "spicy", emoji: "🌶️", titolo: "Palato di Fuoco", descrizione: "Mangia piatti spicy", stat: "spicy", tiers: [1, 2, 3, 4, 5] },
  { id: "punti", emoji: "🏆", titolo: "Collezionista di Punti", descrizione: "Accumula punti", stat: "puntiTotali", tiers: [5, 15, 30, 50, 75] },
  { id: "buongustaio", emoji: "💎", titolo: "Buongustaio", descrizione: "Mangia piatti da 3+ punti", stat: "gourmet", tiers: [1, 2, 4, 6, 9] },
  { id: "economico", emoji: "🪙", titolo: "Risparmiatore", descrizione: "Mangia piatti da 1 punto", stat: "economici", tiers: [2, 5, 9, 14, 20] },
  { id: "esploratore", emoji: "🧭", titolo: "Esploratore", descrizione: "Prova piatti diversi", stat: "distinctDishes", tiers: [2, 4, 7, 10, 14] },
  { id: "varieta", emoji: "🎨", titolo: "Palato Versatile", descrizione: "Prova categorie diverse", stat: "distinctCategories", tiers: [2, 3, 4, 6, 8] },
  { id: "abbuffata", emoji: "♾️", titolo: "Senza Fondo", descrizione: "Mangia più pezzi possibile", stat: "pezziTotali", tiers: [5, 10, 20, 35, 50] },
  { id: "ordinatore", emoji: "📋", titolo: "Ordinatore Seriale", descrizione: "Ordina piatti diversi", stat: "distinctOrders", tiers: [3, 6, 10, 15, 20] },
  { id: "nessuno_spreco", emoji: "✅", titolo: "Nessuno Spreco", descrizione: "Completa i tuoi ordini", stat: "completedOrders", tiers: [2, 4, 7, 11, 15] },
  { id: "fuori_menu", emoji: "🆕", titolo: "Fuori dagli Schemi", descrizione: "Mangia piatti fuori menu", stat: "fuoriMenu", tiers: [1, 2, 3, 4, 5] },
];

export function missionLevel(value: number, tiers: number[]): number {
  let level = 0;
  for (const t of tiers) {
    if (value >= t) level += 1;
    else break;
  }
  return level;
}

export interface MissionProgress {
  def: MissionDef;
  value: number;
  level: number;
  next: number | null;
}

export function computeMissions(stats: PlayerStats): MissionProgress[] {
  return MISSIONS.map((def) => {
    const value = stats[def.stat];
    const level = missionLevel(value, def.tiers);
    const next = level < def.tiers.length ? def.tiers[level] : null;
    return { def, value, level, next };
  });
}

export interface Grade {
  id: string;
  emoji: string;
  nome: string;
  min: number;
}

export const GRADES: Grade[] = [
  { id: "riso", emoji: "🍚", nome: "Chicco di Riso", min: 0 },
  { id: "apprendista", emoji: "🥢", nome: "Apprendista", min: 5 },
  { id: "bronzo", emoji: "🥉", nome: "Sushi di Bronzo", min: 12 },
  { id: "argento", emoji: "🥈", nome: "Sushi d'Argento", min: 22 },
  { id: "oro", emoji: "🥇", nome: "Sushi d'Oro", min: 35 },
  { id: "platino", emoji: "💎", nome: "Sushi di Platino", min: 50 },
  { id: "maestro", emoji: "🔥", nome: "Maestro del Sushi", min: 70 },
  { id: "granmaestro", emoji: "🐉", nome: "Gran Maestro del Sushi", min: 95 },
  { id: "leggenda", emoji: "👑", nome: "Leggenda del Sushi", min: 120 },
];

export function gradeScore(missions: Pick<MissionProgress, "level">[]): number {
  return missions.reduce((sum, m) => sum + m.level, 0);
}

export function gradeForScore(score: number): Grade {
  let current = GRADES[0];
  for (const g of GRADES) if (score >= g.min) current = g;
  return current;
}

export function gradeProgress(score: number): { current: Grade; next: Grade | null; ratio: number } {
  const current = gradeForScore(score);
  const idx = GRADES.findIndex((g) => g.id === current.id);
  const next = idx < GRADES.length - 1 ? GRADES[idx + 1] : null;
  if (!next) return { current, next: null, ratio: 1 };
  const span = next.min - current.min;
  const ratio = span > 0 ? Math.min(1, Math.max(0, (score - current.min) / span)) : 0;
  return { current, next, ratio };
}

export function computeGrade(eaten: EatenDish[]): {
  stats: PlayerStats;
  missions: MissionProgress[];
  score: number;
  grade: Grade;
} {
  const stats = computePlayerStats(eaten);
  const missions = computeMissions(stats);
  const score = gradeScore(missions);
  const grade = gradeForScore(score);
  return { stats, missions, score, grade };
}
```

- [ ] **Step 4: Run tests → PASS** (`npx vitest run tests/logic/missions.test.ts`, then full `npm test`).

- [ ] **Step 5: Commit**
```bash
git add src/lib/logic/missions.ts tests/logic/missions.test.ts
git commit -m "feat: side-quest missions and cumulative sushi grade logic"
```

---

## Task 2: Extend `getLobbyOrders` with dish/order fields

**Files:**
- Modify: `src/lib/db/orders.ts`

**Interfaces:**
- Consumes: existing `getLobbyOrders(lobbyId)`.
- Produces: `getLobbyOrders(lobbyId)` returning rows shaped as `{ player_id: string } & EatenDish` (adds `nome`, `categoria`, `punti`, `quantita_ordinata`, `quantita_mangiata`, `stato`). Keep the existing `OrderRow`-compatible fields the awards/scoring code already uses (`player_id`, `dish_id`, `quantita_mangiata`) OR update those call sites — verify awards/scoring still compile.

- [ ] **Step 1: Read current `getLobbyOrders` and its callers**

Run: read `src/lib/db/orders.ts` and grep for `getLobbyOrders` usage (`results/page.tsx`). Note what fields the awards/scoring path needs (`player_id`, `dish_id`, `quantita_mangiata`).

- [ ] **Step 2: Extend the select to join dish fields**

Update the query to also select the joined dish's `nome, categoria, punti` and the order's `quantita_ordinata, stato`. Example shape:
```ts
export interface LobbyOrderRow {
  player_id: string;
  dish_id: string;
  nome: string;
  categoria: string;
  punti: number;
  quantita_ordinata: number;
  quantita_mangiata: number;
  stato: "in_attesa" | "consegnato";
}

export async function getLobbyOrders(lobbyId: string): Promise<LobbyOrderRow[]> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("orders")
    .select("player_id, dish_id, quantita_ordinata, quantita_mangiata, stato, lobby_dishes!inner(nome, categoria, punti), players!inner(lobby_id)")
    .eq("players.lobby_id", lobbyId);
  if (error) throw error;
  return (data ?? []).map((o) => ({
    player_id: o.player_id,
    dish_id: o.dish_id,
    nome: o.lobby_dishes.nome,
    categoria: o.lobby_dishes.categoria,
    punti: o.lobby_dishes.punti,
    quantita_ordinata: o.quantita_ordinata,
    quantita_mangiata: o.quantita_mangiata,
    stato: o.stato,
  }));
}
```
(Match the embedded-relation typing to what PostgREST returns — the existing `getMyOrders` already joins `lobby_dishes`; mirror its exact select/typing style so it compiles.)

- [ ] **Step 3: Keep awards/scoring working**

`results/page.tsx` builds `OrderRow[]` (`{player_id, dish_id, quantita_mangiata}`) for `computeLeaderboard`/`computeAwards`. Those fields are still present on `LobbyOrderRow`, so mapping is trivial — verify it still type-checks. Do not change scoring/awards logic.

- [ ] **Step 4: Verify** — `npm run build` passes.

- [ ] **Step 5: Commit** (`feat: getLobbyOrders returns dish + order fields for grade computation`).

---

## Task 3: Missioni tab (UI + wiring)

**Files:**
- Create: `src/components/MissionsTab.tsx`
- Modify: `src/components/TabBar.tsx`, `src/app/lobby/[code]/play/page.tsx`

- [ ] **Step 1: Add the 4th tab to `TabBar.tsx`**

Read the current `TabBar`/`TabId`. Add `"missioni"` to the `TabId` union and a 4th button (label "Missioni", icon 🎯). Ensure 4 tabs fit on narrow screens (equal-width flex; shrink label if needed). Keep active-state styling consistent.

- [ ] **Step 2: Build `MissionsTab.tsx`**

Props: `{ eaten: EatenDish[] }`. Use `computeGrade(eaten)` → `{ missions, score, grade }` and `gradeProgress(score)`.
- Top: grade card — big `grade.emoji` + `grade.nome`, a progress bar (`gradeProgress().ratio`), and a label: `Punteggio {score}` + (if `next`) `· prossimo: {next.nome}`.
- List: sort a copy of `missions` by `level` desc, then by proximity to next threshold (`next ? value/next : 1`) desc, then `def.id` asc (stable). Each row: `emoji`, `titolo`, `Lv {level}/5` badge, progress bar (`next ? value/next : 1`; show "MAX" when `next === null`), `descrizione`, and current value (e.g. `{value}`).
- Import types/functions from `@/lib/logic/missions`. Match the app's card styling.

- [ ] **Step 3: Wire into `play/page.tsx`**

Import `MissionsTab` and `EatenDish`. The page already holds `myOrders: OrderWithDish[]`. Map it to `EatenDish[]` (pick `nome, categoria, punti, quantita_ordinata, quantita_mangiata, stato` — confirm `getMyOrders` returns all of these; if `stato`/`quantita_ordinata` aren't in `OrderWithDish`, add them to that select/type). Render `{tab === "missioni" && <MissionsTab eaten={eatenFromMyOrders} />}` with an `<h1>` header like the other tabs. Missions must NOT render while `lobbyStato === "creata"` — it's already gated by the waiting-room early return, so no extra work, but verify.

- [ ] **Step 4: Verify** — `npm run build` passes; `npm run dev` and confirm the play page renders 4 tabs and the Missioni tab shows the grade card + mission list without crashing. Stop dev server.

- [ ] **Step 5: Commit** (`feat: Missioni tab with live grade and mission progress`).

---

## Task 4: Grade in results + shareable image

**Files:**
- Modify: `src/app/lobby/[code]/results/page.tsx`, `src/components/AwardCard.tsx`, `src/lib/share/shareBadge.ts`

- [ ] **Step 1: Compute per-player grade in results**

In `results/page.tsx`, after loading `getLobbyOrders(lobbyId)` (now `LobbyOrderRow[]`), for the current player build their `EatenDish[]` (filter by `player_id === myPlayerId`, map to EatenDish shape) and call `computeGrade(...)`. Feature the current player's grade prominently near their award(s): a small "grado" card (emoji + nome + `Punteggio {score}`). Keep the existing awards/leaderboard sections unchanged.

- [ ] **Step 2: Thread `grado` into `AwardCard`**

Add an optional `grado?: string` prop (e.g. `"🥇 Sushi d'Oro"`). When present on the current player's featured card, pass it to the share/download handlers.

- [ ] **Step 3: Draw `grado` on the shared image**

In `shareBadge.ts`, add `grado?: string` to `BadgeShareOptions`. In `composeBadgeImage`, draw the grade text (emoji + name) as a line near the award title (readable, on-brand). Both `shareBadge` and `downloadBadge` pass it through (single shared composer stays DRY). The share `text`/`url` still always includes the site URL.

- [ ] **Step 4: Verify** — `npm run build` passes; `npm run dev` and confirm `/lobby/[code]/results` renders with a grade card and the code paths compile. Reason through the canvas composition (headless share can't be fully tested). Stop dev server.

- [ ] **Step 5: Commit** (`feat: show sushi grade in results and on the shared badge image`).

---

## Self-Review Notes

- **Spec coverage:** 27 missions + tiers (Task 1) ✓; cumulative grade + 9 bands (Task 1) ✓; derived-only, no migration (all tasks) ✓; Missioni tab live from `myOrders` (Task 3) ✓; grade in results + shared image (Task 4) ✓; persistence-ready separation (Task 1 pure functions consume `EatenDish`/`PlayerStats`) ✓.
- **Type consistency:** `EatenDish`, `PlayerStats`, `MissionProgress`, `Grade` defined in `missions.ts` (Task 1) and reused by Tasks 3–4. `getLobbyOrders` return type extended in Task 2, consumed in Task 4. `gradeScore` accepts `Pick<MissionProgress,"level">[]` so tests and callers both work.
- **No DB migration** — confirmed; Task 2 only changes a `select`.
- **Placeholder scan:** none — full code in Task 1; concrete guidance elsewhere.
- **Watch-outs for implementer:** confirm `getMyOrders`'s `OrderWithDish` includes `stato` and `quantita_ordinata` (Task 3 Step 3 adds them if missing); mirror `getMyOrders`'s PostgREST embed typing in Task 2 so it compiles.
