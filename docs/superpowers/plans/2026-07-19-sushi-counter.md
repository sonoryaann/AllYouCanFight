# Sushi Counter & Battle — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a mobile-first realtime web app where friends at an all-you-can-eat sushi dinner track orders and compete for points, ending with shareable award badges.

**Architecture:** Single Next.js (App Router, TypeScript) project deployed on Vercel. Supabase provides Postgres (data), Realtime (live sync across phones), and anonymous Auth (per-device identity). Points are never written by the client — they are derived server-side via a Postgres view, with Row Level Security enforcing that each player can only mutate their own orders. No separate Node/Socket.io server.

**Tech Stack:** Next.js 15 (App Router), TypeScript, React 19, Tailwind CSS, `@supabase/supabase-js`, `@supabase/ssr`, Vitest (unit tests for pure logic), Supabase MCP for migrations.

**Supabase project:** `sushi-counter`, ref `hqxwujapcvthpurbymhl`, org `tlwsnttffyrowtjqtoey`, region eu-central-1.

**Design spec:** `docs/superpowers/specs/2026-07-19-sushi-battle-design.md`

## Global Constraints

- Language of all user-facing copy: **Italian**.
- Mobile-first: every screen must be usable one-handed on a phone (min touch target 44px).
- `punti_totali` is NEVER stored or written by the client — always derived from `orders.quantita_mangiata × lobby_dishes.punti` via the `leaderboard` view.
- RLS enabled on every table; a player may update only their own `orders` rows.
- Access codes are 6 uppercase alphanumeric chars, excluding ambiguous `0/O/1/I`.
- All Supabase writes go through typed data-access functions in `src/lib/db/` — never inline in components.
- Realtime: every game screen subscribes to `postgres_changes` filtered by `lobby_id`.
- Awards are derived from confirmed consumption (`quantita_mangiata`) only.
- Env vars: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY` (publishable key).

---

## File Structure

```
src/
  app/
    layout.tsx                     # root layout, PWA meta, providers
    page.tsx                       # Home: crea / unisciti
    globals.css                    # Tailwind + theme
    lobby/[code]/
      setup/page.tsx               # Host setup (edit points, start)
      play/page.tsx                # Game shell with 3 tabs
      results/page.tsx             # End-of-game awards
  components/
    Leaderboard.tsx                # Tab 1: live ranking with animated bars
    MenuTab.tsx                    # Tab 2: order dishes by category
    MyOrdersTab.tsx                # Tab 3: pending / eaten + "Mangiato!"
    AddCustomDishDialog.tsx        # off-menu dish
    AwardCard.tsx                  # badge display + download/share
    TabBar.tsx                     # bottom tab nav
    JoinForm.tsx / CreateForm.tsx  # home forms
  lib/
    supabase/
      client.ts                    # browser client (anon auth)
      types.ts                     # generated + hand types
    db/
      lobbies.ts                   # createLobby, getLobbyByCode, startGame, endGame
      players.ts                   # joinLobby, getPlayers
      dishes.ts                    # getDishes, updateDishPoints, addCustomDish
      orders.ts                    # addOrder, markEaten, getMyOrders
      leaderboard.ts               # getLeaderboard
    logic/
      accessCode.ts                # generateAccessCode (pure)
      scoring.ts                   # computeLeaderboard, computeTotals (pure)
      awards.ts                    # computeAwards (pure)
      badges.ts                    # award->badge asset map
    realtime/
      useLobbyChannel.ts           # subscribe hook
    share/
      shareBadge.ts                # Web Share API + PNG generation
  data/
    defaultDishes.ts               # the 25 seed dishes (also used by SQL seed)
supabase/
  migrations/                      # SQL migration files (source of truth)
public/
  badges/                          # award PNGs (user-provided; placeholders for now)
  manifest.webmanifest
tests/
  logic/                           # Vitest unit tests for pure logic
```

---

## Task 1: Project scaffolding

**Files:**
- Create: `package.json`, `next.config.ts`, `tsconfig.json`, `tailwind.config.ts`, `postcss.config.mjs`, `vitest.config.ts`, `.gitignore`, `.env.local.example`
- Create: `src/app/layout.tsx`, `src/app/page.tsx`, `src/app/globals.css`

**Interfaces:**
- Produces: a runnable Next.js dev server (`npm run dev`) and a passing test runner (`npm test`).

- [ ] **Step 1: Scaffold Next.js app**

Run in `c:\ryanware\AllYouCanFight`:
```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir --eslint --no-import-alias --use-npm --yes
```
If the directory is non-empty (PROJECT.md, docs/ exist), scaffold in a temp dir and copy in, or answer prompts to proceed. Keep `PROJECT.md` and `docs/`.

- [ ] **Step 2: Install dependencies**

```bash
npm install @supabase/supabase-js @supabase/ssr
npm install -D vitest @vitejs/plugin-react jsdom @testing-library/react @testing-library/jest-dom
```

- [ ] **Step 3: Configure Vitest**

Create `vitest.config.ts`:
```ts
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  test: { environment: "jsdom", globals: true, include: ["tests/**/*.test.ts", "tests/**/*.test.tsx"] },
});
```
Add to `package.json` scripts: `"test": "vitest run"`, `"test:watch": "vitest"`.

- [ ] **Step 4: Add env example**

Create `.env.local.example`:
```
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
```
Confirm `.env.local` is in `.gitignore` (create-next-app adds `.env*`).

- [ ] **Step 5: Sanity test**

Create `tests/logic/sanity.test.ts`:
```ts
import { describe, it, expect } from "vitest";
describe("sanity", () => { it("runs", () => { expect(1 + 1).toBe(2); }); });
```
Run: `npm test` → Expected: 1 passed.

- [ ] **Step 6: Commit**

```bash
git init && git add -A && git commit -m "chore: scaffold Next.js + Tailwind + Vitest"
```

---

## Task 2: Default dishes dataset

**Files:**
- Create: `src/data/defaultDishes.ts`
- Test: `tests/logic/defaultDishes.test.ts`

**Interfaces:**
- Produces: `export interface SeedDish { nome: string; categoria: string; punti: number }` and `export const DEFAULT_DISHES: SeedDish[]` (exactly 25 entries). Categories used: `Nigiri`, `Uramaki`, `Hosomaki`, `Sashimi`, `Gunkan`, `Temaki`, `Fritti`, `Dolci`.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` → Expected: FAIL (module not found).

- [ ] **Step 3: Create the dataset**

Create `src/data/defaultDishes.ts` with 25 realistic AYCE dishes, e.g.:
```ts
export interface SeedDish { nome: string; categoria: string; punti: number }

export const DEFAULT_DISHES: SeedDish[] = [
  { nome: "Nigiri Salmone", categoria: "Nigiri", punti: 1 },
  { nome: "Nigiri Tonno", categoria: "Nigiri", punti: 2 },
  { nome: "Nigiri Gambero", categoria: "Nigiri", punti: 1 },
  { nome: "Nigiri Branzino", categoria: "Nigiri", punti: 1 },
  { nome: "Nigiri Anguilla", categoria: "Nigiri", punti: 2 },
  { nome: "Uramaki California", categoria: "Uramaki", punti: 1 },
  { nome: "Uramaki Ebiten", categoria: "Uramaki", punti: 2 },
  { nome: "Uramaki Salmone Avocado", categoria: "Uramaki", punti: 1 },
  { nome: "Uramaki Spicy Tonno", categoria: "Uramaki", punti: 2 },
  { nome: "Hosomaki Salmone", categoria: "Hosomaki", punti: 1 },
  { nome: "Hosomaki Tonno", categoria: "Hosomaki", punti: 1 },
  { nome: "Hosomaki Cetriolo", categoria: "Hosomaki", punti: 1 },
  { nome: "Sashimi Salmone", categoria: "Sashimi", punti: 3 },
  { nome: "Sashimi Tonno", categoria: "Sashimi", punti: 3 },
  { nome: "Sashimi Branzino", categoria: "Sashimi", punti: 3 },
  { nome: "Gunkan Salmone", categoria: "Gunkan", punti: 2 },
  { nome: "Gunkan Tobiko", categoria: "Gunkan", punti: 2 },
  { nome: "Temaki Salmone", categoria: "Temaki", punti: 2 },
  { nome: "Temaki California", categoria: "Temaki", punti: 2 },
  { nome: "Tempura Gamberi", categoria: "Fritti", punti: 2 },
  { nome: "Tempura Verdure", categoria: "Fritti", punti: 1 },
  { nome: "Gyoza", categoria: "Fritti", punti: 2 },
  { nome: "Edamame", categoria: "Fritti", punti: 1 },
  { nome: "Mochi", categoria: "Dolci", punti: 2 },
  { nome: "Tempura Banana", categoria: "Dolci", punti: 2 },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test` → Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/data/defaultDishes.ts tests/logic/defaultDishes.test.ts && git commit -m "feat: default 25-dish seed dataset"
```

---

## Task 3: Access code generation (pure logic)

**Files:**
- Create: `src/lib/logic/accessCode.ts`
- Test: `tests/logic/accessCode.test.ts`

**Interfaces:**
- Produces: `export function generateAccessCode(rand?: () => number): string` — 6 chars from alphabet `ABCDEFGHJKLMNPQRSTUVWXYZ23456789` (no 0/O/1/I). `rand` defaults to `Math.random`, injectable for tests.

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test → FAIL** (`npm test`).

- [ ] **Step 3: Implement**

```ts
const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
export function generateAccessCode(rand: () => number = Math.random): string {
  let out = "";
  for (let i = 0; i < 6; i++) out += ALPHABET[Math.floor(rand() * ALPHABET.length)];
  return out;
}
```

- [ ] **Step 4: Run test → PASS.**

- [ ] **Step 5: Commit** (`feat: access code generator`).

---

## Task 4: Scoring logic (pure)

**Files:**
- Create: `src/lib/logic/scoring.ts`
- Test: `tests/logic/scoring.test.ts`

**Interfaces:**
- Consumes: nothing.
- Produces:
```ts
export interface OrderRow { player_id: string; dish_id: string; quantita_mangiata: number }
export interface DishRow { id: string; nome: string; categoria: string; punti: number }
export interface PlayerRow { id: string; username: string }
export interface LeaderboardEntry { player_id: string; username: string; punti: number; pezzi: number }
export function computeLeaderboard(players: PlayerRow[], dishes: DishRow[], orders: OrderRow[]): LeaderboardEntry[]
```
`computeLeaderboard` returns one entry per player, `punti = Σ(mangiata × dish.punti)`, `pezzi = Σ mangiata`, sorted by `punti` desc then `username` asc.

- [ ] **Step 1: Write the failing test**

```ts
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
    expect(lb[0]).toEqual({ player_id: "p2", username: "Bea", punti: 4, pezzi: 4 });
    expect(lb[1]).toEqual({ player_id: "p1", username: "Ann", punti: 5, pezzi: 3 });
  });
  it("includes players with zero consumption", () => {
    const lb = computeLeaderboard(players, dishes, []);
    expect(lb).toHaveLength(2);
    expect(lb.every((e) => e.punti === 0)).toBe(true);
  });
});
```
Note first test: p2 has 4 punti (4×1), p1 has 5 (2×1+1×3) → p1 should sort FIRST. Fix expectation: `lb[0]` = Ann (5), `lb[1]` = Bea (4). (Adjust the assertion accordingly when writing.)

- [ ] **Step 2: Run test → FAIL.**

- [ ] **Step 3: Implement**

```ts
export interface OrderRow { player_id: string; dish_id: string; quantita_mangiata: number }
export interface DishRow { id: string; nome: string; categoria: string; punti: number }
export interface PlayerRow { id: string; username: string }
export interface LeaderboardEntry { player_id: string; username: string; punti: number; pezzi: number }

export function computeLeaderboard(players: PlayerRow[], dishes: DishRow[], orders: OrderRow[]): LeaderboardEntry[] {
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const acc = new Map(players.map((p) => [p.id, { punti: 0, pezzi: 0 }]));
  for (const o of orders) {
    const dish = dishById.get(o.dish_id);
    const a = acc.get(o.player_id);
    if (!dish || !a) continue;
    a.punti += o.quantita_mangiata * dish.punti;
    a.pezzi += o.quantita_mangiata;
  }
  return players
    .map((p) => ({ player_id: p.id, username: p.username, ...acc.get(p.id)! }))
    .sort((a, b) => b.punti - a.punti || a.username.localeCompare(b.username));
}
```

- [ ] **Step 4: Run test → PASS** (correct assertions per note in Step 1).

- [ ] **Step 5: Commit** (`feat: leaderboard scoring logic`).

---

## Task 5: Awards logic (pure)

**Files:**
- Create: `src/lib/logic/awards.ts`
- Test: `tests/logic/awards.test.ts`

**Interfaces:**
- Consumes: `OrderRow`, `DishRow`, `PlayerRow` from `scoring.ts`.
- Produces:
```ts
export type AwardId = "campione" | "re_salmone" | "sashimi" | "senza_fondo" | "palato_fino" | "esploratore" | "partecipante";
export interface AwardDef { id: AwardId; titolo: string; descrizione: string }
export const AWARDS: Record<AwardId, AwardDef>;
export interface PlayerAward { player_id: string; username: string; awards: AwardId[] }
export function computeAwards(players: PlayerRow[], dishes: DishRow[], orders: OrderRow[]): PlayerAward[];
```

**Award rules** (all based on `quantita_mangiata`; ties → all tied players win; a category with zero total consumption awards no one):
- `campione`: max total points (`Σ mangiata × punti`).
- `re_salmone`: max pieces of dishes whose `nome` matches `/salmone/i`.
- `sashimi`: max pieces where `categoria === "Sashimi"`.
- `senza_fondo`: max total pieces.
- `palato_fino`: max pieces of dishes with `punti >= 3`.
- `esploratore`: max count of distinct dishes with `mangiata > 0`.
- `partecipante`: assigned to every player who won no other award.

- [ ] **Step 1: Write the failing test**

```ts
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
      { player_id: "p2", dish_id: "d2", quantita_mangiata: 3 },  // sashimi, palato_fino, campione (9 pts vs 10 pts)
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
```

- [ ] **Step 2: Run test → FAIL.**

- [ ] **Step 3: Implement**

```ts
import type { OrderRow, DishRow, PlayerRow } from "./scoring";

export type AwardId = "campione" | "re_salmone" | "sashimi" | "senza_fondo" | "palato_fino" | "esploratore" | "partecipante";
export interface AwardDef { id: AwardId; titolo: string; descrizione: string }

export const AWARDS: Record<AwardId, AwardDef> = {
  campione: { id: "campione", titolo: "Campione Assoluto", descrizione: "Più punti totali" },
  re_salmone: { id: "re_salmone", titolo: "Re del Salmone", descrizione: "Più salmone divorato" },
  sashimi: { id: "sashimi", titolo: "Divoratore di Sashimi", descrizione: "Più sashimi mangiati" },
  senza_fondo: { id: "senza_fondo", titolo: "Senza Fondo", descrizione: "Più pezzi in assoluto" },
  palato_fino: { id: "palato_fino", titolo: "Palato Fino", descrizione: "Più piatti gourmet" },
  esploratore: { id: "esploratore", titolo: "Esploratore", descrizione: "Più piatti diversi provati" },
  partecipante: { id: "partecipante", titolo: "Partecipante", descrizione: "Ha combattuto con onore" },
};

export interface PlayerAward { player_id: string; username: string; awards: AwardId[] }

export function computeAwards(players: PlayerRow[], dishes: DishRow[], orders: OrderRow[]): PlayerAward[] {
  const dishById = new Map(dishes.map((d) => [d.id, d]));
  const zero = () => ({ punti: 0, pezzi: 0, salmone: 0, sashimi: 0, gourmet: 0, distinti: new Set<string>() });
  const stats = new Map(players.map((p) => [p.id, zero()]));
  for (const o of orders) {
    const d = dishById.get(o.dish_id); const s = stats.get(o.player_id);
    if (!d || !s || o.quantita_mangiata <= 0) continue;
    s.punti += o.quantita_mangiata * d.punti;
    s.pezzi += o.quantita_mangiata;
    if (/salmone/i.test(d.nome)) s.salmone += o.quantita_mangiata;
    if (d.categoria === "Sashimi") s.sashimi += o.quantita_mangiata;
    if (d.punti >= 3) s.gourmet += o.quantita_mangiata;
    s.distinti.add(d.id);
  }
  const result = new Map(players.map((p) => [p.id, [] as AwardId[]]));
  const award = (id: AwardId, pick: (s: ReturnType<typeof zero>) => number) => {
    let best = 0;
    for (const p of players) best = Math.max(best, pick(stats.get(p.id)!));
    if (best <= 0) return;
    for (const p of players) if (pick(stats.get(p.id)!) === best) result.get(p.id)!.push(id);
  };
  award("campione", (s) => s.punti);
  award("re_salmone", (s) => s.salmone);
  award("sashimi", (s) => s.sashimi);
  award("senza_fondo", (s) => s.pezzi);
  award("palato_fino", (s) => s.gourmet);
  award("esploratore", (s) => s.distinti.size);
  return players.map((p) => {
    const a = result.get(p.id)!;
    return { player_id: p.id, username: p.username, awards: a.length ? a : (["partecipante"] as AwardId[]) };
  });
}
```

- [ ] **Step 4: Run test → PASS.**

- [ ] **Step 5: Commit** (`feat: awards computation logic`).

---

## Task 6: Database schema migration

**Files:**
- Create: `supabase/migrations/0001_init.sql` (source of truth, committed)
- Apply via Supabase MCP `apply_migration` to project `hqxwujapcvthpurbymhl`.

**Interfaces:**
- Produces tables `lobbies`, `players`, `lobby_dishes`, `orders`; enums; view `leaderboard`; function `create_lobby(username)` returning the new lobby + host player; function `seed_default_dishes(lobby_id)`. RLS policies as per Global Constraints.

- [ ] **Step 1: Write the migration SQL**

Create `supabase/migrations/0001_init.sql`:
```sql
-- Enums
create type lobby_stato as enum ('creata', 'in_corso', 'completata');
create type player_ruolo as enum ('host', 'player');
create type order_stato as enum ('in_attesa', 'consegnato');

-- Tables
create table lobbies (
  id uuid primary key default gen_random_uuid(),
  codice_accesso text unique not null,
  stato lobby_stato not null default 'creata',
  creato_il timestamptz not null default now()
);

create table players (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  device_id uuid not null default auth.uid(),
  username text not null,
  ruolo player_ruolo not null default 'player',
  creato_il timestamptz not null default now(),
  unique (lobby_id, device_id)
);

create table lobby_dishes (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid not null references lobbies(id) on delete cascade,
  nome text not null,
  categoria text not null,
  punti int not null default 1 check (punti >= 1)
);

create table orders (
  id uuid primary key default gen_random_uuid(),
  player_id uuid not null references players(id) on delete cascade,
  dish_id uuid not null references lobby_dishes(id) on delete cascade,
  quantita_ordinata int not null default 1 check (quantita_ordinata >= 0),
  quantita_mangiata int not null default 0 check (quantita_mangiata >= 0),
  stato order_stato not null default 'in_attesa',
  unique (player_id, dish_id)
);

-- Derived leaderboard (anti-cheat: points never stored)
create view leaderboard as
select p.id as player_id, p.lobby_id, p.username,
       coalesce(sum(o.quantita_mangiata * d.punti), 0)::int as punti,
       coalesce(sum(o.quantita_mangiata), 0)::int as pezzi
from players p
left join orders o on o.player_id = p.id
left join lobby_dishes d on d.id = o.dish_id
group by p.id, p.lobby_id, p.username;

-- Helper: current player's id within a lobby
create or replace function current_player_id(p_lobby uuid) returns uuid
language sql stable as $$
  select id from players where lobby_id = p_lobby and device_id = auth.uid()
$$;
```

- [ ] **Step 2: Add RLS policies to the same migration**

Append:
```sql
alter table lobbies enable row level security;
alter table players enable row level security;
alter table lobby_dishes enable row level security;
alter table orders enable row level security;

-- Lobbies: anyone authenticated can read (needed to join by code) and insert; host can update
create policy lobbies_read on lobbies for select to authenticated using (true);
create policy lobbies_insert on lobbies for insert to authenticated with check (true);
create policy lobbies_update on lobbies for update to authenticated
  using (exists (select 1 from players pl where pl.lobby_id = lobbies.id and pl.device_id = auth.uid() and pl.ruolo = 'host'));

-- Players: read players in lobbies you belong to; insert yourself; update own row
create policy players_read on players for select to authenticated
  using (exists (select 1 from players me where me.lobby_id = players.lobby_id and me.device_id = auth.uid()));
create policy players_insert on players for insert to authenticated with check (device_id = auth.uid());
create policy players_update on players for update to authenticated using (device_id = auth.uid());

-- Dishes: read if member; insert if member (off-menu); update points only host
create policy dishes_read on lobby_dishes for select to authenticated
  using (exists (select 1 from players me where me.lobby_id = lobby_dishes.lobby_id and me.device_id = auth.uid()));
create policy dishes_insert on lobby_dishes for insert to authenticated
  with check (exists (select 1 from players me where me.lobby_id = lobby_dishes.lobby_id and me.device_id = auth.uid()));
create policy dishes_update on lobby_dishes for update to authenticated
  using (exists (select 1 from players me where me.lobby_id = lobby_dishes.lobby_id and me.device_id = auth.uid() and me.ruolo = 'host'));

-- Orders: read orders of players in your lobby; write only your own
create policy orders_read on orders for select to authenticated
  using (exists (select 1 from players me join players op on op.lobby_id = me.lobby_id
                 where me.device_id = auth.uid() and op.id = orders.player_id));
create policy orders_write on orders for insert to authenticated
  with check (exists (select 1 from players me where me.id = orders.player_id and me.device_id = auth.uid()));
create policy orders_update on orders for update to authenticated
  using (exists (select 1 from players me where me.id = orders.player_id and me.device_id = auth.uid()));
```

- [ ] **Step 3: Add RPCs for lobby creation + seed**

Append (dishes seeded from a SQL VALUES list mirroring `DEFAULT_DISHES`; keep in sync):
```sql
create or replace function seed_default_dishes(p_lobby uuid) returns void
language sql security definer as $$
  insert into lobby_dishes (lobby_id, nome, categoria, punti) values
    (p_lobby,'Nigiri Salmone','Nigiri',1),(p_lobby,'Nigiri Tonno','Nigiri',2),
    (p_lobby,'Nigiri Gambero','Nigiri',1),(p_lobby,'Nigiri Branzino','Nigiri',1),
    (p_lobby,'Nigiri Anguilla','Nigiri',2),(p_lobby,'Uramaki California','Uramaki',1),
    (p_lobby,'Uramaki Ebiten','Uramaki',2),(p_lobby,'Uramaki Salmone Avocado','Uramaki',1),
    (p_lobby,'Uramaki Spicy Tonno','Uramaki',2),(p_lobby,'Hosomaki Salmone','Hosomaki',1),
    (p_lobby,'Hosomaki Tonno','Hosomaki',1),(p_lobby,'Hosomaki Cetriolo','Hosomaki',1),
    (p_lobby,'Sashimi Salmone','Sashimi',3),(p_lobby,'Sashimi Tonno','Sashimi',3),
    (p_lobby,'Sashimi Branzino','Sashimi',3),(p_lobby,'Gunkan Salmone','Gunkan',2),
    (p_lobby,'Gunkan Tobiko','Gunkan',2),(p_lobby,'Temaki Salmone','Temaki',2),
    (p_lobby,'Temaki California','Temaki',2),(p_lobby,'Tempura Gamberi','Fritti',2),
    (p_lobby,'Tempura Verdure','Fritti',1),(p_lobby,'Gyoza','Fritti',2),
    (p_lobby,'Edamame','Fritti',1),(p_lobby,'Mochi','Dolci',2),
    (p_lobby,'Tempura Banana','Dolci',2);
$$;

create or replace function create_lobby(p_codice text, p_username text)
returns lobbies language plpgsql security definer as $$
declare l lobbies;
begin
  insert into lobbies (codice_accesso) values (p_codice) returning * into l;
  insert into players (lobby_id, device_id, username, ruolo)
    values (l.id, auth.uid(), p_username, 'host');
  perform seed_default_dishes(l.id);
  return l;
end $$;
```

- [ ] **Step 4: Apply the migration**

Use Supabase MCP `apply_migration` with `project_id: "hqxwujapcvthpurbymhl"`, `name: "init"`, and the full SQL above.

- [ ] **Step 5: Verify**

Use MCP `list_tables` (project `hqxwujapcvthpurbymhl`) → expect `lobbies`, `players`, `lobby_dishes`, `orders`. Run MCP `get_advisors` (type `security`) → resolve any RLS warnings. Enable Realtime for `players`, `lobby_dishes`, `orders` via migration or dashboard (`alter publication supabase_realtime add table ...`).

- [ ] **Step 6: Enable anonymous auth**

Confirm anonymous sign-ins are enabled for the project (Auth settings). Document in README if manual.

- [ ] **Step 7: Commit** (`feat: db schema, RLS, leaderboard view, lobby RPCs`).

---

## Task 7: Supabase client + types

**Files:**
- Create: `src/lib/supabase/client.ts`, `src/lib/supabase/types.ts`

**Interfaces:**
- Produces: `export function getSupabase(): SupabaseClient` (singleton browser client) and `export async function ensureAnonSession(): Promise<string>` returning `auth.uid()` (signs in anonymously if no session). Generated DB types via MCP `generate_typescript_types`.

- [ ] **Step 1: Generate types**

Use MCP `generate_typescript_types` (project `hqxwujapcvthpurbymhl`); save output to `src/lib/supabase/types.ts`.

- [ ] **Step 2: Implement client**

```ts
import { createBrowserClient } from "@supabase/ssr";
import type { Database } from "./types";

let client: ReturnType<typeof createBrowserClient<Database>> | null = null;
export function getSupabase() {
  if (!client) client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  return client;
}
export async function ensureAnonSession(): Promise<string> {
  const sb = getSupabase();
  const { data } = await sb.auth.getUser();
  if (data.user) return data.user.id;
  const { data: signIn, error } = await sb.auth.signInAnonymously();
  if (error) throw error;
  return signIn.user!.id;
}
```

- [ ] **Step 3: Manual smoke test**

Add `NEXT_PUBLIC_*` env vars from MCP `get_project_url` + `get_publishable_keys`. Temporary page/button calling `ensureAnonSession()` logs a uid. Verify no error.

- [ ] **Step 4: Commit** (`feat: supabase browser client + anon session`).

---

## Task 8: Data-access layer

**Files:**
- Create: `src/lib/db/lobbies.ts`, `players.ts`, `dishes.ts`, `orders.ts`, `leaderboard.ts`

**Interfaces (exact signatures later tasks rely on):**
```ts
// lobbies.ts
export async function createLobby(username: string): Promise<{ code: string; lobbyId: string }>;
export async function getLobbyByCode(code: string): Promise<{ id: string; stato: string } | null>;
export async function startGame(lobbyId: string): Promise<void>;   // stato -> in_corso
export async function endGame(lobbyId: string): Promise<void>;     // stato -> completata
// players.ts
export async function joinLobby(code: string, username: string): Promise<{ playerId: string; lobbyId: string }>;
export async function getPlayers(lobbyId: string): Promise<{ id: string; username: string; ruolo: string }[]>;
export async function getMyPlayer(lobbyId: string): Promise<{ id: string; ruolo: string } | null>;
// dishes.ts
export async function getDishes(lobbyId: string): Promise<DishRow[]>;
export async function updateDishPoints(dishId: string, punti: number): Promise<void>;
export async function addCustomDish(lobbyId: string, nome: string, punti: number): Promise<void>;
// orders.ts
export async function addOrder(playerId: string, dishId: string): Promise<void>;        // upsert +1 ordinata
export async function markEaten(orderId: string): Promise<void>;                         // +1 mangiata, flip stato if full
export async function getMyOrders(playerId: string): Promise<OrderWithDish[]>;
// leaderboard.ts
export async function getLeaderboard(lobbyId: string): Promise<LeaderboardEntry[]>;
```

- [ ] **Step 1: Implement `lobbies.ts`**

`createLobby`: `ensureAnonSession()`, generate a code with `generateAccessCode()`, call RPC `create_lobby(p_codice, p_username)`, retry with a new code on unique-violation (max 5). `startGame`/`endGame`: update `lobbies.stato`. `getLobbyByCode`: select by `codice_accesso` (uppercased).

- [ ] **Step 2: Implement `players.ts`**

`joinLobby`: `ensureAnonSession()`, resolve lobby by code, insert player (`device_id` defaults to `auth.uid()`), on conflict `(lobby_id, device_id)` return existing. `getPlayers`, `getMyPlayer` as selects.

- [ ] **Step 3: Implement `dishes.ts`, `orders.ts`, `leaderboard.ts`**

`addOrder`: upsert on `(player_id, dish_id)`, increment `quantita_ordinata`. `markEaten`: fetch order, `quantita_mangiata + 1`, set `stato = 'consegnato'` when `>= quantita_ordinata`. `getLeaderboard`: select from `leaderboard` view where `lobby_id` eq, order by `punti` desc.

- [ ] **Step 4: Smoke test the flow**

In a scratch script or temp page: create lobby → join from a second anon session (incognito) → add order → mark eaten → getLeaderboard shows points. Confirm RLS: attempt to update another player's order fails.

- [ ] **Step 5: Commit** (`feat: typed data-access layer`).

---

## Task 9: Realtime hook

**Files:**
- Create: `src/lib/realtime/useLobbyChannel.ts`

**Interfaces:**
- Produces: `export function useLobbyChannel(lobbyId: string | null, onChange: () => void): void` — subscribes to `postgres_changes` on `orders`, `lobby_dishes`, `players`, `lobbies` filtered by lobby, calls `onChange` (debounced ~150ms) on any event; cleans up on unmount.

- [ ] **Step 1: Implement the hook**

```ts
import { useEffect } from "react";
import { getSupabase } from "../supabase/client";

export function useLobbyChannel(lobbyId: string | null, onChange: () => void) {
  useEffect(() => {
    if (!lobbyId) return;
    const sb = getSupabase();
    let t: ReturnType<typeof setTimeout>;
    const ping = () => { clearTimeout(t); t = setTimeout(onChange, 150); };
    const ch = sb.channel(`lobby:${lobbyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "orders" }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "lobby_dishes", filter: `lobby_id=eq.${lobbyId}` }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "players", filter: `lobby_id=eq.${lobbyId}` }, ping)
      .on("postgres_changes", { event: "*", schema: "public", table: "lobbies", filter: `id=eq.${lobbyId}` }, ping)
      .subscribe();
    return () => { clearTimeout(t); sb.removeChannel(ch); };
  }, [lobbyId, onChange]);
}
```
(Note: `orders` has no `lobby_id` column, so it is unfiltered; `onChange` re-fetches lobby-scoped data anyway.)

- [ ] **Step 2: Manual two-client test** (deferred to Task 12 integration). Commit (`feat: realtime lobby channel hook`).

---

## Task 10: Home + Setup screens

**Files:**
- Create: `src/app/page.tsx`, `src/components/CreateForm.tsx`, `src/components/JoinForm.tsx`
- Create: `src/app/lobby/[code]/setup/page.tsx`

- [ ] **Step 1: Home page** — two cards: "Crea Partita" (username input → `createLobby` → route to `/lobby/[code]/setup`) and "Unisciti con Codice" (code + username → `joinLobby` → route to `/lobby/[code]/play`). Sushi-themed Tailwind styling, large touch targets.

- [ ] **Step 2: Setup page (host)** — guard: only host (`getMyPlayer.ruolo === 'host'`); others redirect to `/play`. Show `codice_accesso` prominently (with copy button). List dishes grouped by category with `+/−` steppers calling `updateDishPoints`. "Aggiungi piatto fuori menu" and "Avvia partita" (`startGame` → route to `/play`). Subscribe via `useLobbyChannel` to reflect live player joins.

- [ ] **Step 3: Manual test** — create a lobby, edit points, see code. Commit (`feat: home and host setup screens`).

---

## Task 11: Game screens (3 tabs)

**Files:**
- Create: `src/app/lobby/[code]/play/page.tsx`, `src/components/TabBar.tsx`, `Leaderboard.tsx`, `MenuTab.tsx`, `MyOrdersTab.tsx`, `AddCustomDishDialog.tsx`

- [ ] **Step 1: Play shell** — resolve lobby by code, `ensureAnonSession`, `getMyPlayer` (redirect home if not a member). Local state re-fetched by `useLobbyChannel(lobbyId, refetchAll)`. Bottom `TabBar` with 3 tabs. If `stato === 'completata'`, redirect to `/results`.

- [ ] **Step 2: Leaderboard tab** — render `getLeaderboard` entries as rows with animated horizontal bars (width ∝ punti / maxPunti, CSS transition). Highlight current player. Show pezzi as secondary stat.

- [ ] **Step 3: Menu tab** — dishes grouped by category, each with a "+" button → `addOrder`. Persistent "Aggiungi piatto fuori menu" button opening `AddCustomDishDialog` (nome + punti → `addCustomDish`).

- [ ] **Step 4: My Orders tab** — `getMyOrders(playerId)`, split into "In arrivo" (`stato = in_attesa`) and "Mangiati". Each pending row shows `quantita_mangiata/quantita_ordinata` and a green "Mangiato!" button → `markEaten`.

- [ ] **Step 5: Host end-game control** — in the play shell, if host, show "Termina partita" → `endGame` (all clients redirect to `/results` via realtime).

- [ ] **Step 6: Manual test** — full flow with two browsers. Commit (`feat: game screens with live tabs`).

---

## Task 12: Realtime integration verification

- [ ] **Step 1** — Open lobby on two browsers (one incognito). On A mark a dish eaten; verify B's leaderboard updates within ~1s. On B add an off-menu dish; verify it appears on A's menu. Host ends game; verify both redirect to results.
- [ ] **Step 2** — Fix any subscription/filter issues found. Commit (`test: verify realtime sync across clients`).

---

## Task 13: Badges + results screen

**Files:**
- Create: `src/lib/logic/badges.ts`, `src/components/AwardCard.tsx`, `src/app/lobby/[code]/results/page.tsx`
- Create: `public/badges/*.png` (placeholders now; user assets later)

**Interfaces:**
- Produces: `export function badgeAsset(id: AwardId): string` mapping each `AwardId` to `/badges/<id>.png`.

- [ ] **Step 1: Badge map + placeholders** — `badges.ts` maps every `AwardId` to `/badges/<id>.png`. Add 7 placeholder PNGs (simple generated images) so the UI renders before real assets arrive.

- [ ] **Step 2: Results page** — fetch players, dishes, orders for the lobby; run `computeAwards`; find current player's awards; render `AwardCard` for each with the badge image + username overlay. Also show a compact "Classifiche" section listing each award's winner(s) (from `computeAwards`) and the final points leaderboard.

- [ ] **Step 3: Test** — simulate a finished game, verify correct awards and winners displayed. Commit (`feat: results screen with awards and rankings`).

---

## Task 14: Download + social share

**Files:**
- Create: `src/lib/share/shareBadge.ts`; wire into `AwardCard.tsx`

**Interfaces:**
- Produces: `export async function shareBadge(opts: { badgeUrl: string; username: string; titolo: string }): Promise<void>` and `export async function downloadBadge(opts): Promise<void>`.

- [ ] **Step 1: Compose the shareable image** — draw the badge PNG + username + site branding + short URL onto a `<canvas>`, export via `canvas.toBlob('image/png')`. Keep composition in one helper reused by both download and share.

- [ ] **Step 2: Share** — `shareBadge`: if `navigator.canShare?.({ files })` use `navigator.share({ files: [file], text: "Ho vinto <titolo> a Sushi Battle! Sfidami: <URL>", url: <URL> })`; else fall back to `downloadBadge` + copy link. The share `text`/`url` always includes the site URL (this is the advertising mechanism).

- [ ] **Step 3: Download** — `downloadBadge`: create object URL from the blob, trigger an `<a download>` click for a PNG file.

- [ ] **Step 4: Test on a real phone** (or mobile emulation) — verify the native share sheet appears with the image and the link. Commit (`feat: badge download and social share`).

---

## Task 15: PWA + deploy prep

**Files:**
- Create: `public/manifest.webmanifest`, app icons, `README.md`
- Modify: `src/app/layout.tsx` (manifest link, theme-color, viewport)

- [ ] **Step 1: PWA manifest** — name "Sushi Battle", standalone display, theme color, icons. Link in `layout.tsx`; set `viewport` with `maximum-scale` for mobile.
- [ ] **Step 2: README** — setup, env vars, Supabase project ref, "enable anonymous auth", deploy-to-Vercel steps.
- [ ] **Step 3: Build check** — `npm run build` passes with no type errors.
- [ ] **Step 4: Commit** (`feat: PWA manifest and deploy docs`).

---

## Task 16: GitHub + Vercel

- [ ] **Step 1** — Create GitHub repo, push `main`.
- [ ] **Step 2** — Import to Vercel, set `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` env vars, deploy.
- [ ] **Step 3** — Add the Vercel production URL to Supabase Auth redirect/allow list; verify a full game works on the live URL.
- [ ] **Step 4** — Update README with the live URL. Commit.

---

## Self-Review Notes

- **Spec coverage:** lobby/players/dishes/orders (Task 6) ✓; 25-dish seed (Tasks 2, 6) ✓; host point editing (Task 10) ✓; join by code (Task 10) ✓; 2-phase order→eaten (Tasks 8, 11) ✓; off-menu dishes (Tasks 8, 11) ✓; live leaderboard (Task 11) ✓; realtime (Tasks 9, 12) ✓; server-side anti-cheat scoring (Task 6 view + RLS) ✓; awards + badges + rankings (Tasks 5, 13) ✓; download + social share w/ site promo (Task 14) ✓; deploy (Tasks 15, 16) ✓.
- **Excluded (V2):** waste penalty, historical stats, real accounts — not in any task, per design.
- **Type consistency:** `DishRow`/`OrderRow`/`PlayerRow`/`LeaderboardEntry` defined in `scoring.ts` (Task 4) and reused in `awards.ts` (Task 5) and `db/` (Task 8). `AwardId` defined in `awards.ts` (Task 5), consumed by `badges.ts` (Task 13).
- **Seed sync:** `DEFAULT_DISHES` (TS, Task 2) and `seed_default_dishes` (SQL, Task 6) list the same 25 dishes — keep in sync if edited.
