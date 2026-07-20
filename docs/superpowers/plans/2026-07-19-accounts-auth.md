# Accounts & Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: superpowers:subagent-driven-development. Steps use checkbox (`- [ ]`) syntax.

**Goal:** Optional Google accounts with a `profiles` table, a hamburger menu, a profile page, logout, and self-service account deletion — without breaking the anonymous casual flow. Foundation for global score, leaderboards, cumulative missions (sub-projects C/D).

**Architecture:** Keep anonymous play. Add Google OAuth via the existing `@supabase/ssr` browser client (PKCE) with a client-side callback page. An anonymous session upgrades via `linkIdentity` (preserving `auth.uid()`), falling back to `signInWithOAuth` when the Google identity already exists. Profiles are upserted client-side after auth (`ensureProfile`). Account deletion is a `SECURITY DEFINER` RPC. UI: a global auth-aware hamburger `AppMenu` and a `/profilo` page.

**Tech Stack:** Next.js 16 App Router, React 19, Tailwind v4, `@supabase/supabase-js` + `@supabase/ssr`, Supabase (Postgres + Google OAuth), Vitest.

**Supabase project:** `hqxwujapcvthpurbymhl`.
**Spec:** `docs/superpowers/specs/2026-07-19-accounts-auth-design.md`

## Global Constraints

- Account is OPTIONAL; anonymous casual play must keep working unchanged.
- `linkIdentity` for anonymous→Google (preserve `auth.uid()` + data); fallback `signInWithOAuth`.
- Deleting the account removes profile + auth user + the user's game data (players→orders).
- RLS: profiles readable by authenticated; insert/update only own; no client delete.
- Italian copy; mobile-first; ≥44px targets. Auth cookie is strictly-necessary (no consent banner).
- Migrations append-only via Supabase MCP.
- Runtime login is testable only after the user configures Google OAuth (documented) — tasks must still build/type-check green.

---

## Task 1: `profiles` table + `delete_my_account` RPC

**Files:** Create `supabase/migrations/0008_profiles_and_account_delete.sql`; apply via MCP; regenerate types.

- [ ] **Step 1: Write migration**
```sql
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  display_name text,
  avatar_url text,
  creato_il timestamptz not null default now()
);
alter table profiles enable row level security;
create policy profiles_read on profiles for select to authenticated using (true);
create policy profiles_insert on profiles for insert to authenticated with check (id = auth.uid());
create policy profiles_update on profiles for update to authenticated using (id = auth.uid()) with check (id = auth.uid());

create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from players where device_id = auth.uid();  -- cascades to orders
  delete from profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
revoke execute on function delete_my_account() from public, anon;
grant execute on function delete_my_account() to authenticated;
```
- [ ] **Step 2: Apply** via MCP `apply_migration` (name `profiles_and_account_delete`).
- [ ] **Step 3: Verify** — `list_tables` shows `profiles` (RLS on). `execute_sql`: confirm the function exists (`select proname from pg_proc where proname='delete_my_account'`). Attempt a harmless check that `delete from auth.users` is permitted by the definer (do NOT actually delete a real user; just confirm the function was created without error — a permission problem surfaces at call time). If you can, test `delete_my_account` end-to-end later in runtime. Run `get_advisors` (security); the profiles policies are intended (authenticated read).
- [ ] **Step 4: Regenerate types** — MCP `generate_typescript_types` → overwrite `src/lib/supabase/types.ts`. `npm run build` passes.
- [ ] **Step 5: Commit** (`feat: profiles table and self-service account deletion RPC`).

> If Step 3 reveals the definer cannot delete from `auth.users`, STOP and report — fallback is a Supabase Edge Function using the service role (`delete-account`), which we'll plan separately.

---

## Task 2: Auth helpers + profiles data access (+ pure helper TDD)

**Files:** Create `src/lib/logic/displayName.ts`, `tests/logic/displayName.test.ts`, `src/lib/auth/auth.ts`, `src/lib/db/profiles.ts`

**Interfaces (produced):**
```ts
// displayName.ts (pure)
export function displayNameFromUser(meta: { full_name?: string; name?: string; email?: string } | null | undefined): string;
// db/profiles.ts
export interface Profile { id: string; display_name: string | null; avatar_url: string | null; creato_il: string }
export async function getProfile(id: string): Promise<Profile | null>;
export async function upsertProfile(p: { id: string; display_name: string; avatar_url: string | null }): Promise<void>;
export async function updateDisplayName(id: string, display_name: string): Promise<void>;
// auth/auth.ts
export async function loginWithGoogle(): Promise<void>;      // link if anon else signInWithOAuth; redirectTo /auth/callback
export async function completeOAuth(): Promise<void>;        // exchange code (if present) + ensureProfile
export async function ensureProfile(): Promise<void>;        // upsert own profile from session metadata
export async function logout(): Promise<void>;               // signOut then ensureAnonSession
export async function deleteAccount(): Promise<void>;        // rpc('delete_my_account') then signOut
```

- [ ] **Step 1: TDD `displayNameFromUser`** — test: returns `full_name` if present, else `name`, else email local-part, else "Giocatore". Run → FAIL.
```ts
expect(displayNameFromUser({ full_name: "Mario Rossi" })).toBe("Mario Rossi");
expect(displayNameFromUser({ name: "Luigi" })).toBe("Luigi");
expect(displayNameFromUser({ email: "ryan@x.it" })).toBe("ryan");
expect(displayNameFromUser(null)).toBe("Giocatore");
```
- [ ] **Step 2: Implement `displayName.ts`** → test PASS.
- [ ] **Step 3: Implement `db/profiles.ts`** using `getSupabase()` (typed). `upsertProfile` uses `.upsert(..., { onConflict: 'id' })`.
- [ ] **Step 4: Implement `auth/auth.ts`:**
  - `loginWithGoogle`: `const sb = getSupabase(); const { data } = await sb.auth.getUser(); const redirectTo = `${window.location.origin}/auth/callback`;` if `data.user?.is_anonymous` → `await sb.auth.linkIdentity({ provider: "google", options: { redirectTo } })`; on error (identity exists) OR not anonymous → `await sb.auth.signInWithOAuth({ provider: "google", options: { redirectTo } })`.
  - `completeOAuth`: if `window.location.search` has `code`, `await sb.auth.exchangeCodeForSession(window.location.href)`; then `await ensureProfile()`.
  - `ensureProfile`: get session user; if logged-in (not anonymous), `upsertProfile({ id, display_name: displayNameFromUser(user.user_metadata), avatar_url: user.user_metadata?.avatar_url ?? null })`.
  - `logout`: `await sb.auth.signOut(); await ensureAnonSession();`
  - `deleteAccount`: `await sb.rpc("delete_my_account"); await sb.auth.signOut();`
- [ ] **Step 5:** `npm run build` + `npm test` green. Commit (`feat: auth helpers, profile data access, display-name helper`).

---

## Task 3: OAuth callback page

**Files:** Create `src/app/auth/callback/page.tsx` (`"use client"`)

- [ ] **Step 1:** On mount, call `completeOAuth()` (exchange code + ensureProfile), then `router.replace("/")`. Show a minimal "Accesso in corso…" state. Handle errors by redirecting home with a console error (and a brief Italian message). Guard against running twice.
- [ ] **Step 2:** `npm run build` passes. Commit (`feat: Google OAuth callback page`).

---

## Task 4: `useAuth` hook + hamburger `AppMenu`

**Files:** Create `src/lib/auth/useAuth.ts`, `src/components/AppMenu.tsx`; Modify `src/app/layout.tsx`

- [ ] **Step 1: `useAuth`** (`"use client"`): state `{ loading, user, isLoggedIn, isAnonymous, profile }`. On mount: get session; subscribe `sb.auth.onAuthStateChange`; when logged-in (non-anon) fetch `getProfile(user.id)`. Clean up subscription.
- [ ] **Step 2: `AppMenu`** (`"use client"`): a fixed ☰ button top-left/right (z-40, so the intro overlay z-50 covers it) → slide-over drawer. Items via `useAuth`:
  - Not logged in: "Accedi con Google" (→ `loginWithGoogle()`), "Classifiche" (disabled/"presto"), link "Privacy".
  - Logged in: "Profilo" (→ `/profilo`), "Classifiche" ("presto"), "Logout" (→ `logout()`), "Elimina account" (→ `/profilo` or opens confirm). Show avatar + display_name at top.
  - Italian, ≥44px targets, closes on backdrop/Esc.
- [ ] **Step 3:** Mount `<AppMenu />` in `layout.tsx` body (client component inside server layout is fine). Verify it doesn't overlap the intro (intro overlay z-50 > menu z-40) and doesn't break existing pages.
- [ ] **Step 4:** `npm run build` + dev smoke (menu opens; logged-out state shows "Accedi con Google"). Commit (`feat: auth-aware hamburger menu`).

---

## Task 5: Profile page

**Files:** Create `src/app/profilo/page.tsx` (`"use client"`)

- [ ] **Step 1:** Using `useAuth`:
  - Not logged in → card "Accedi con Google per avere un profilo" + button.
  - Logged in → avatar (from `profile.avatar_url`, fallback initial), editable `display_name` (input + "Salva" → `updateDisplayName` then refresh), "membro dal {creato_il}".
- [ ] **Step 2:** Placeholder sections (Italian "Presto disponibile"): Statistiche, Storico partite, Piatti più ordinati, Badge — to be filled in C/D.
- [ ] **Step 3:** "Logout" button (→ `logout()` → `/`) and "Elimina account" button opening a confirm modal that clearly states it erases everything; on confirm → `deleteAccount()` → `/`.
- [ ] **Step 4:** `npm run build` + dev smoke (logged-out view renders). Commit (`feat: profile page with edit, logout and delete account`).

---

## Task 6: Prefill username from profile in lobby forms

**Files:** Modify `src/components/CreateForm.tsx`, `src/components/JoinForm.tsx`

- [ ] **Step 1:** Use `useAuth`; when `profile?.display_name` exists, initialize the username field with it (still editable). Anonymous users: unchanged (empty/typed). Do not force it.
- [ ] **Step 2:** `npm run build` passes. Commit (`feat: prefill lobby username from profile`).

---

## Task 7: Privacy policy update + Google setup docs

**Files:** Modify `src/app/privacy/page.tsx`, `README.md`; Create `docs/SETUP-google-oauth.md`

- [ ] **Step 1: Privacy** — add a section: con l'account Google trattiamo nome e immagine profilo (da Google) per identità e classifiche; cookie di sessione strettamente necessario; diritto di eliminazione self-service dal profilo; dati in UE. Keep the existing cookieless-analytics wording.
- [ ] **Step 2: Setup doc** — `docs/SETUP-google-oauth.md` with the exact steps from the spec §2 (Google Cloud OAuth client, redirect URI `https://hqxwujapcvthpurbymhl.supabase.co/auth/v1/callback`, Supabase provider config, Redirect URLs incl. localhost + Vercel domain). Link it from README.
- [ ] **Step 3:** `npm run build` passes. Commit (`docs: privacy update and Google OAuth setup guide`).

---

## Self-Review Notes

- **Spec coverage:** optional Google auth w/ link+fallback (Tasks 2,3) ✓; profiles + RLS (Task 1) ✓; ensureProfile client upsert (Task 2) ✓; delete account RPC + UI (Tasks 1,5) ✓; hamburger menu (Task 4) ✓; profile page w/ placeholders (Task 5) ✓; username prefill (Task 6) ✓; privacy + setup docs (Task 7) ✓; anonymous play untouched (all) ✓.
- **Type consistency:** `Profile` in `db/profiles.ts` used by `useAuth`/profile page; `displayNameFromUser` (Task 2) used by `ensureProfile`; auth helpers used by AppMenu/profile/callback/forms.
- **Watch-outs:** (1) callback uses PKCE `exchangeCodeForSession` via the browser client — verify build/types. (2) `delete_my_account` deleting `auth.users` depends on definer privileges — verify at Task 1 Step 3; edge-function fallback if not. (3) AppMenu z-index below the intro overlay. (4) `linkIdentity` requires "Manual linking" enabled? It's on by default for anonymous upgrades; note if runtime shows otherwise. Runtime login gated on the user's Google config (Task 7 doc).
