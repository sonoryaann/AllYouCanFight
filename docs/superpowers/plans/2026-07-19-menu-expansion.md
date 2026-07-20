# Menu Expansion Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Expand the default menu from ~25 to ~80 dishes across ~13 categories, sourced from a single `default_dishes` catalog table, with a searchable/collapsible menu UI, without breaking scoring/awards/missions.

**Architecture:** New `default_dishes` catalog table (the official menu), seeded via migration; `seed_default_dishes(lobby)` copies from it into `lobby_dishes`. Retire the duplicated TS list. UI gains search + collapsible categories. The 8 mission categories are preserved verbatim; new categories are additive.

**Tech Stack:** Next.js 16, React 19, Tailwind v4, Supabase (Postgres, MCP migrations), Vitest.

**Supabase project:** `hqxwujapcvthpurbymhl`.
**Spec:** `docs/superpowers/specs/2026-07-19-menu-expansion-design.md`

## Global Constraints

- Preserve EXACT category names used by missions: `Nigiri, Uramaki, Hosomaki, Sashimi, Gunkan, Temaki, Fritti, Dolci`. Tempura/gyoza stay in `Fritti`.
- No breaking changes to scoring/awards/missions/realtime.
- All Supabase writes via `src/lib/db/*`; catalog is read-only from the client.
- Italian copy; mobile-first; ≥44px targets.
- Migrations append-only; apply via Supabase MCP `apply_migration`.

---

## Task 1: `default_dishes` catalog table + seed + rewire seed function

**Files:** Create `supabase/migrations/0007_default_dishes_catalog.sql`; apply via MCP.

- [ ] **Step 1: Write the migration** — table, RLS, ~80-row seed, and rewrite `seed_default_dishes` to copy from the catalog.

```sql
create table default_dishes (
  id uuid primary key default gen_random_uuid(),
  nome text not null,
  categoria text not null,
  punti int not null default 1 check (punti >= 1),
  ordine int not null default 0
);
alter table default_dishes enable row level security;
create policy default_dishes_read on default_dishes for select to authenticated using (true);

insert into default_dishes (nome, categoria, punti, ordine) values
('Edamame','Antipasti',1,1),('Zuppa di Miso','Antipasti',1,2),('Insalata di Alghe','Antipasti',1,3),
('Insalata Mista','Antipasti',1,4),('Insalata di Polpo','Antipasti',2,5),('Sunomono','Antipasti',1,6),
('Nigiri Salmone','Nigiri',1,1),('Nigiri Salmone Flambé','Nigiri',2,2),('Nigiri Tonno','Nigiri',2,3),
('Nigiri Tonno Flambé','Nigiri',3,4),('Nigiri Branzino','Nigiri',1,5),('Nigiri Orata','Nigiri',1,6),
('Nigiri Gambero','Nigiri',1,7),('Nigiri Gambero Crudo','Nigiri',2,8),('Nigiri Anguilla','Nigiri',2,9),
('Nigiri Ricciola','Nigiri',3,10),('Nigiri Polpo','Nigiri',2,11),('Nigiri Capasanta','Nigiri',3,12),
('Nigiri Surimi','Nigiri',1,13),('Nigiri Salmone Avocado','Nigiri',2,14),
('Gunkan Salmone','Gunkan',2,1),('Gunkan Tobiko','Gunkan',2,2),('Gunkan Tartare di Salmone','Gunkan',2,3),
('Gunkan Tartare di Tonno','Gunkan',3,4),
('Hosomaki Salmone','Hosomaki',1,1),('Hosomaki Tonno','Hosomaki',1,2),('Hosomaki Cetriolo','Hosomaki',1,3),
('Hosomaki Avocado','Hosomaki',1,4),('Hosomaki Surimi','Hosomaki',1,5),
('Uramaki California','Uramaki',1,1),('Uramaki Salmone Avocado','Uramaki',1,2),('Uramaki Philadelphia','Uramaki',2,3),
('Uramaki Ebiten','Uramaki',2,4),('Uramaki Spicy Tuna','Uramaki',2,5),('Uramaki Spicy Salmon','Uramaki',2,6),
('Uramaki Tonno Avocado','Uramaki',2,7),('Uramaki Vegetariano','Uramaki',1,8),('Uramaki Anguilla Avocado','Uramaki',3,9),
('Uramaki Tempura','Uramaki',2,10),
('Futomaki Vegetariano','Futomaki',2,1),('Futomaki Salmone','Futomaki',2,2),('Futomaki Tempura','Futomaki',3,3),
('Temaki Salmone','Temaki',2,1),('Temaki California','Temaki',2,2),('Temaki Tonno','Temaki',2,3),
('Temaki Gambero Tempura','Temaki',3,4),
('Dragon Roll','Roll Speciali',4,1),('Rainbow Roll','Roll Speciali',4,2),('Spicy Salmon Special','Roll Speciali',3,3),
('Ebiten Special','Roll Speciali',3,4),('Flambé Roll Salmone','Roll Speciali',3,5),('Tuna Tataki Roll','Roll Speciali',4,6),
('Sashimi Salmone','Sashimi',3,1),('Sashimi Tonno','Sashimi',3,2),('Sashimi Branzino','Sashimi',3,3),
('Sashimi Ricciola','Sashimi',4,4),('Sashimi Polpo','Sashimi',3,5),('Sashimi Misto','Sashimi',4,6),
('Tartare di Salmone','Tartare & Tataki',3,1),('Tartare di Tonno','Tartare & Tataki',4,2),
('Tataki di Salmone','Tartare & Tataki',3,3),('Tataki di Tonno','Tartare & Tataki',4,4),
('Poke Salmone','Poke',2,1),('Poke Tonno','Poke',3,2),('Poke Vegetariano','Poke',2,3),('Poke Gambero','Poke',3,4),
('Tempura Gamberi','Fritti',2,1),('Tempura Verdure','Fritti',1,2),('Tempura Mista','Fritti',2,3),
('Gyoza','Fritti',2,4),('Gyoza Verdure','Fritti',2,5),('Chicken Karaage','Fritti',2,6),
('Ebi Fry','Fritti',2,7),('Involtini Primavera','Fritti',1,8),('Salmone Fritto','Fritti',2,9),
('Mochi','Dolci',2,1),('Tempura Banana','Dolci',2,2),('Tempura Gelato','Dolci',3,3),
('Dorayaki','Dolci',2,4),('Gelato Fritto','Dolci',2,5);

create or replace function seed_default_dishes(p_lobby uuid) returns void
language sql security definer set search_path = public as $$
  insert into lobby_dishes (lobby_id, nome, categoria, punti)
  select nome, categoria, punti from default_dishes;
$$;
```
NOTE: fix the insert column/order — the target is `lobby_dishes (lobby_id, nome, categoria, punti)`, so the select must be `select p_lobby, nome, categoria, punti from default_dishes order by categoria, ordine`. Write it correctly:
```sql
create or replace function seed_default_dishes(p_lobby uuid) returns void
language sql security definer set search_path = public as $$
  insert into lobby_dishes (lobby_id, nome, categoria, punti)
  select p_lobby, nome, categoria, punti from default_dishes order by categoria, ordine;
$$;
```

- [ ] **Step 2: Apply** via MCP `apply_migration` (project `hqxwujapcvthpurbymhl`, name `default_dishes_catalog`).
- [ ] **Step 3: Verify** — MCP `execute_sql`: `select count(*) from default_dishes` = 80; `select count(distinct categoria) from default_dishes` = 13. Create a throwaway check: the function compiles. Run `get_advisors` (security) → resolve any new warning (the catalog read policy is intended).
- [ ] **Step 4: Regenerate types** — MCP `generate_typescript_types` → overwrite `src/lib/supabase/types.ts`. Build must pass.
- [ ] **Step 5: Commit** (`feat: default_dishes catalog table with ~80-dish official menu`).

---

## Task 2: Update `CATEGORY_ORDER` (+ test)

**Files:** Modify `src/lib/logic/dishOrder.ts`, `tests/logic/dishOrder.test.ts`

- [ ] **Step 1: Update the failing test first** — assert `CATEGORY_ORDER` contains the new categories in dining order and `orderDishes` stays stable with the extended set:
```ts
it("includes the expanded categories in dining order", () => {
  expect(CATEGORY_ORDER).toEqual([
    "Antipasti","Nigiri","Gunkan","Hosomaki","Uramaki","Futomaki","Temaki",
    "Roll Speciali","Sashimi","Tartare & Tataki","Poke","Fritti","Dolci","Fuori Menu",
  ]);
});
```
- [ ] **Step 2: Run → FAIL.**
- [ ] **Step 3: Update `CATEGORY_ORDER`** in `dishOrder.ts` to that exact array. `orderDishes` unchanged.
- [ ] **Step 4: Run → PASS** (`npm test`; existing stability tests still green).
- [ ] **Step 5: Commit** (`feat: expand CATEGORY_ORDER with new menu categories`).

---

## Task 3: Retire the duplicated TS default-dish list

**Files:** Delete `src/data/defaultDishes.ts`, `tests/logic/defaultDishes.test.ts` (if unused at runtime)

- [ ] **Step 1: Verify unused** — grep the codebase for imports of `defaultDishes` / `DEFAULT_DISHES`. If the ONLY references are the file and its test, it is safe to remove (the DB catalog is now the single source). If any runtime code imports it, STOP and report — do not break a consumer.
- [ ] **Step 2: Remove** the file and its test. Run `npm test` and `npm run build` → both pass (test count drops by the removed suite).
- [ ] **Step 3: Commit** (`chore: remove duplicated TS default-dish list (catalog is single source)`).

---

## Task 4: Searchable + collapsible Menu/Order tab

**Files:** Modify `src/components/MenuTab.tsx` (and `AddCustomDishDialog` untouched)

- [ ] **Step 1:** Add a **search input** (Italian placeholder "Cerca un piatto…") that filters dishes by `nome`/`categoria` (case-insensitive, trimmed). Filtering is client-side over the `dishes` prop.
- [ ] **Step 2:** Render categories as **collapsible sections** (accordion): each category header shows the name + count and toggles open/closed (local `useState<Set<string>>` or per-category boolean); default a sensible state (e.g., all collapsed, or first category open) — pick one and keep it simple. When a search term is active, auto-expand matching categories and hide empty ones.
- [ ] **Step 3:** Keep the always-visible "Aggiungi piatto fuori menu" button and the existing "+" order action (`addOrder`). Categories follow `CATEGORY_ORDER` (dishes already arrive ordered from `getDishes`). Preserve theme + ≥44px targets.
- [ ] **Step 4: Verify** — `npm run build` + `npm run dev`: the tab shows the big menu, search filters, categories collapse, ordering still works. (Port may be busy — rely on build if so.) Commit (`feat: searchable, collapsible menu tab`).

---

## Task 5: Setup search + optional point editing

**Files:** Modify `src/app/lobby/[code]/setup/page.tsx`

- [ ] **Step 1:** Add a **search input** filtering the dish list (same behavior as Task 4).
- [ ] **Step 2:** Make point editing **optional/collapsed**: wrap the per-dish `DishStepper` list in a collapsible "Personalizza punti" section, **closed by default**, with a short hint that defaults are fine. Keep the code, players list, and "Avvia partita" controls unchanged and easy to reach without scrolling through 80 steppers.
- [ ] **Step 3:** Categories collapsible here too (reuse the same pattern as Task 4 where practical). Keep host-only guard + realtime refresh.
- [ ] **Step 4: Verify** — build + dev: host can start quickly, search works, point editing is opt-in. Commit (`feat: setup search and optional point editing for large menu`).

---

## Self-Review Notes

- **Spec coverage:** ~80 dishes/13 categories (Task 1) ✓; catalog single source + seed rewire (Task 1) ✓; retire TS dup (Task 3) ✓; CATEGORY_ORDER (Task 2) ✓; search + collapsible menu (Task 4) ✓; setup search + optional points (Task 5) ✓; mission categories preserved (Task 1 data) ✓.
- **Type consistency:** `seed_default_dishes` signature unchanged (still `(p_lobby uuid)`), so `create_lobby` needs no change. `getDishes`/`orderDishes` unaffected by more rows.
- **Watch-out:** the migration's first `seed_default_dishes` draft is intentionally shown then corrected — use the CORRECTED version (`select p_lobby, nome, categoria, punti ... order by categoria, ordine`). Verify the 80-row insert applied (count check) before wiring UI.
- **No mission code changes**; new categories lift the "Palato Versatile" ceiling to 10 as intended.
