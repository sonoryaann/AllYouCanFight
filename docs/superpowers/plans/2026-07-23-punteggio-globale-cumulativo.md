# Punteggio globale cumulativo (sub-project C) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ogni partita Ranked completata somma il punteggio finale di ciascun giocatore loggato a un totale globale cumulativo persistente.

**Architecture:** Introduce una modalità partita `ranked` sulle lobby. Le partite Ranked bloccano la modifica del menu/punti (UI + RLS) e richiedono utenti loggati. Alla chiusura, una RPC SECURITY DEFINER congela i punteggi finali (derivati dalla view `leaderboard`) in una tabella durevole `game_results`, da cui si deriva il punteggio globale per utente.

**Tech Stack:** Next.js 16.2.10 (App Router, client components), React 19, Supabase (Postgres, RLS, SECURITY DEFINER RPC, `@supabase/ssr`), TypeScript, Tailwind v4.

## Global Constraints

- **Solo Ranked conta** per il punteggio globale; le Casual non contano mai.
- **Solo utenti loggati** (Google, `is_anonymous = false`) accumulano; gli anonimi sono bloccati da creazione/ingresso Ranked.
- **Punti mai salvati lato client**: il punteggio Ranked finale è congelato server-side dalla view `leaderboard`.
- **RLS invariata sui fix esistenti**: preservare gli helper `my_lobby_ids()` / `is_lobby_host()` (migrazioni 0005/0006) e il vincolo `ruolo = 'player'` su `players_insert` (0004). Le policy vanno ricreate esatte + aggiunta la regola Ranked.
- **Idempotenza**: `finalize_ranked_game` non deve mai raddoppiare i punti.
- **Copy in italiano**, coerente con l'app. Titolare privacy invariato.
- **Nessun unit test committato nel repo**: verifica tramite SQL runtime (Supabase MCP), `npm run build` e `npm run lint`, come per i sotto-progetti precedenti.
- Migrazioni applicate via Supabase MCP `apply_migration` (progetto ref `hqxwujapcvthpurbymhl`).

---

## File Structure

- `supabase/migrations/0010_ranked_mode.sql` — **create**: colonna `ranked`, `create_lobby(p_ranked)`, helper `is_ranked_lobby`, lockdown RLS.
- `supabase/migrations/0011_game_results.sql` — **create**: tabella `game_results`, RPC `finalize_ranked_game`, update `delete_my_account`.
- `src/lib/supabase/types.ts` — **modify**: rigenerato dopo le migrazioni.
- `src/lib/db/lobbies.ts` — **modify**: `createLobby(username, ranked)`, `getLobbyByCode` ritorna `ranked`, nuova `finalizeRankedGame`.
- `src/lib/db/players.ts` — **modify**: `joinLobby` gate Ranked/login.
- `src/lib/db/gameResults.ts` — **create**: `getMyGlobalScore`.
- `src/components/CreateForm.tsx` — **modify**: toggle Ranked + gate login.
- `src/components/JoinForm.tsx` — **modify**: gestione errore `ranked_requires_login`.
- `src/app/lobby/[code]/setup/page.tsx` — **modify**: nascondere personalizza-punti / fuori-menu in Ranked; badge Ranked.
- `src/app/lobby/[code]/play/page.tsx` — **modify**: finalize in Ranked; badge Ranked.
- `src/app/profilo/page.tsx` — **modify**: sezione Punteggio globale reale.

---

## Task 1: Migration 0010 — modalità Ranked + lockdown menu

**Files:**
- Create: `supabase/migrations/0010_ranked_mode.sql`

**Interfaces:**
- Produces: colonna `lobbies.ranked boolean`; `create_lobby(p_codice text, p_username text, p_ranked boolean default false) returns lobbies`; funzione `is_ranked_lobby(uuid) returns boolean`.

- [ ] **Step 1: Scrivi la migrazione**

```sql
-- Ranked vs Casual lobbies. Casual (default) = comportamento attuale.
alter table lobbies add column ranked boolean not null default false;

-- Helper SECURITY DEFINER: la lobby è Ranked? (bypassa RLS internamente, no ricorsione)
create or replace function is_ranked_lobby(p_lobby uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select coalesce((select ranked from lobbies where id = p_lobby), false)
$$;

-- create_lobby ottiene il flag p_ranked. Drop della vecchia firma a 2 argomenti
-- per evitare ambiguità di overload in PostgREST.
drop function if exists create_lobby(text, text);
create or replace function create_lobby(p_codice text, p_username text, p_ranked boolean default false)
returns lobbies language plpgsql security definer
set search_path = public
as $$
declare l lobbies;
begin
  -- Le partite Ranked richiedono un account reale (non anonimo).
  if p_ranked and coalesce((auth.jwt()->>'is_anonymous')::boolean, false) then
    raise exception 'ranked_requires_login';
  end if;
  insert into lobbies (codice_accesso, ranked) values (p_codice, p_ranked) returning * into l;
  insert into players (lobby_id, device_id, username, ruolo)
    values (l.id, auth.uid(), p_username, 'host');
  perform seed_default_dishes(l.id);
  return l;
end $$;

-- Lockdown Ranked: niente piatti fuori menu, niente modifica punti (host incluso).
-- Ricreo dishes_insert/dishes_update preservando gli helper 0005 + regola Ranked.
drop policy dishes_insert on lobby_dishes;
create policy dishes_insert on lobby_dishes for insert to authenticated
  with check (lobby_id in (select my_lobby_ids()) and not is_ranked_lobby(lobby_id));

drop policy dishes_update on lobby_dishes;
create policy dishes_update on lobby_dishes for update to authenticated
  using (is_lobby_host(lobby_id) and not is_ranked_lobby(lobby_id));

-- Ranked: blocca gli utenti anonimi dall'unirsi. Preserva ruolo = 'player' (0004).
drop policy players_insert on players;
create policy players_insert on players for insert to authenticated
  with check (
    device_id = auth.uid()
    and ruolo = 'player'
    and (
      not is_ranked_lobby(lobby_id)
      or coalesce((auth.jwt()->>'is_anonymous')::boolean, false) = false
    )
  );
```

- [ ] **Step 2: Applica la migrazione**

Usa il tool MCP `apply_migration` con name `0010_ranked_mode` e il contenuto SQL sopra.
Expected: successo, nessun errore.

- [ ] **Step 3: Verifica colonna + funzione via SQL**

Usa il tool MCP `execute_sql`:
```sql
select column_name, data_type, column_default
from information_schema.columns
where table_name = 'lobbies' and column_name = 'ranked';
```
Expected: una riga `ranked | boolean | false`.

```sql
select pg_get_function_identity_arguments(oid) as args
from pg_proc where proname = 'create_lobby';
```
Expected: `p_codice text, p_username text, p_ranked boolean` (una sola riga; nessuna firma a 2 argomenti residua).

- [ ] **Step 4: Verifica advisor sicurezza**

Usa il tool MCP `get_advisors` con type `security`.
Expected: nessun nuovo warning "function search_path mutable" per `is_ranked_lobby` / `create_lobby` (entrambe hanno `set search_path = public`).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0010_ranked_mode.sql
git commit -m "feat(db): ranked lobby mode + menu lockdown RLS"
```

---

## Task 2: Migration 0011 — game_results + finalize_ranked_game

**Files:**
- Create: `supabase/migrations/0011_game_results.sql`

**Interfaces:**
- Consumes: view `leaderboard`, `is_lobby_host(uuid)`, colonna `lobbies.ranked` (Task 1).
- Produces: tabella `game_results(id, lobby_id, user_id, username, punti, pezzi, creato_il)` con `unique(lobby_id, user_id)`; RPC `finalize_ranked_game(p_lobby uuid) returns void`.

- [ ] **Step 1: Scrivi la migrazione**

```sql
-- Snapshot durevole dei risultati Ranked: una riga per giocatore per partita.
create table game_results (
  id uuid primary key default gen_random_uuid(),
  lobby_id uuid references lobbies(id) on delete set null,
  user_id uuid not null references auth.users(id) on delete cascade,
  username text not null,
  punti int not null,
  pezzi int not null,
  creato_il timestamptz not null default now(),
  unique (lobby_id, user_id)
);
create index game_results_user_id_idx on game_results (user_id);

alter table game_results enable row level security;
-- Ogni utente legge solo i propri risultati. La lettura cross-utente per le
-- classifiche globali sarà definita nel sotto-progetto D.
create policy game_results_read on game_results for select to authenticated
  using (user_id = auth.uid());
-- Nessuna policy di insert/update/delete: le righe le scrive solo
-- finalize_ranked_game (SECURITY DEFINER).

-- Chiude una partita Ranked e congela i punteggi finali. Idempotente.
create or replace function finalize_ranked_game(p_lobby uuid)
returns void language plpgsql security definer set search_path = public as $$
declare l lobbies;
begin
  select * into l from lobbies where id = p_lobby;
  if l is null then raise exception 'lobby not found: %', p_lobby; end if;
  if not is_lobby_host(p_lobby) then raise exception 'only host can finalize'; end if;
  if not l.ranked then raise exception 'not a ranked lobby'; end if;
  if l.stato = 'completata' then return; end if; -- guardia di idempotenza

  update lobbies set stato = 'completata' where id = p_lobby;

  -- Congela il punteggio derivato di ogni giocatore loggato (non anonimo).
  insert into game_results (lobby_id, user_id, username, punti, pezzi)
  select p.lobby_id, p.device_id, p.username,
         coalesce(sum(o.quantita_mangiata * d.punti), 0)::int,
         coalesce(sum(o.quantita_mangiata), 0)::int
  from players p
  join auth.users au on au.id = p.device_id and au.is_anonymous is not true
  left join orders o on o.player_id = p.id
  left join lobby_dishes d on d.id = o.dish_id
  where p.lobby_id = p_lobby
  group by p.lobby_id, p.device_id, p.username
  on conflict (lobby_id, user_id) do nothing;
end $$;

revoke execute on function finalize_ranked_game(uuid) from public, anon;
grant execute on function finalize_ranked_game(uuid) to authenticated;

-- delete_my_account: rimuovi anche i risultati (già coperto dal cascade su
-- user_id, esplicitato per chiarezza e robustezza).
create or replace function delete_my_account() returns void
language plpgsql security definer set search_path = public as $$
begin
  delete from game_results where user_id = auth.uid();
  delete from players where device_id = auth.uid();  -- cascades to orders
  delete from profiles where id = auth.uid();
  delete from auth.users where id = auth.uid();
end $$;
```

- [ ] **Step 2: Applica la migrazione**

Usa il tool MCP `apply_migration` con name `0011_game_results` e il contenuto sopra.
Expected: successo.

- [ ] **Step 3: Verifica tabella + RPC via SQL**

Usa il tool MCP `execute_sql`:
```sql
select table_name from information_schema.tables where table_name = 'game_results';
```
Expected: una riga `game_results`.

```sql
select proname from pg_proc where proname = 'finalize_ranked_game';
```
Expected: una riga `finalize_ranked_game`.

- [ ] **Step 4: Verifica RLS abilitata**

```sql
select relrowsecurity from pg_class where relname = 'game_results';
```
Expected: `t` (true).

- [ ] **Step 5: Commit**

```bash
git add supabase/migrations/0011_game_results.sql
git commit -m "feat(db): game_results snapshot + finalize_ranked_game RPC"
```

---

## Task 3: Rigenera i tipi + data-access layer

**Files:**
- Modify: `src/lib/supabase/types.ts`
- Modify: `src/lib/db/lobbies.ts`
- Modify: `src/lib/db/players.ts`
- Create: `src/lib/db/gameResults.ts`

**Interfaces:**
- Consumes: RPC `create_lobby(p_ranked)`, `finalize_ranked_game`, colonna `lobbies.ranked`, tabella `game_results` (Task 1-2).
- Produces:
  - `createLobby(username: string, ranked?: boolean): Promise<{ code: string; lobbyId: string }>`
  - `getLobbyByCode(code: string): Promise<{ id: string; stato: string; ranked: boolean } | null>`
  - `finalizeRankedGame(lobbyId: string): Promise<void>`
  - `joinLobby(code: string, username: string): Promise<{ playerId: string; lobbyId: string }>` (invariata la firma; nuovo throw `Error("ranked_requires_login")`)
  - `getMyGlobalScore(userId: string): Promise<{ punti: number; pezzi: number; partite: number }>`

- [ ] **Step 1: Rigenera i tipi TypeScript**

Usa il tool MCP `generate_typescript_types` e sovrascrivi interamente `src/lib/supabase/types.ts` con l'output restituito. Questo aggiunge `lobbies.ranked` e la tabella `game_results` ai tipi `Database`.

- [ ] **Step 2: Aggiorna `src/lib/db/lobbies.ts`**

Sostituisci l'intero file con:
```ts
import { ensureAnonSession, getSupabase } from "@/lib/supabase/client";
import { generateAccessCode } from "@/lib/logic/accessCode";

const MAX_CREATE_ATTEMPTS = 5;

export async function createLobby(
  username: string,
  ranked = false,
): Promise<{ code: string; lobbyId: string }> {
  await ensureAnonSession();
  const sb = getSupabase();

  let lastError: { code?: string; message: string } | null = null;
  for (let attempt = 0; attempt < MAX_CREATE_ATTEMPTS; attempt++) {
    const code = generateAccessCode();
    const { data, error } = await sb.rpc("create_lobby", {
      p_codice: code,
      p_username: username,
      p_ranked: ranked,
    });
    if (!error && data) {
      return { code: data.codice_accesso, lobbyId: data.id };
    }
    lastError = error;
    // 23505 = unique_violation (codice_accesso collision) — retry with a fresh code.
    if (error?.code !== "23505") break;
  }
  throw new Error(lastError?.message ?? "Failed to create lobby after retries");
}

export async function getLobbyByCode(
  code: string,
): Promise<{ id: string; stato: string; ranked: boolean } | null> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("lobbies")
    .select("id, stato, ranked")
    .eq("codice_accesso", code.toUpperCase())
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function startGame(lobbyId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("lobbies").update({ stato: "in_corso" }).eq("id", lobbyId);
  if (error) throw error;
}

export async function endGame(lobbyId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.from("lobbies").update({ stato: "completata" }).eq("id", lobbyId);
  if (error) throw error;
}

// Ranked: chiude la partita e congela i punteggi (RPC SECURITY DEFINER).
export async function finalizeRankedGame(lobbyId: string): Promise<void> {
  const sb = getSupabase();
  const { error } = await sb.rpc("finalize_ranked_game", { p_lobby: lobbyId });
  if (error) throw error;
}
```

- [ ] **Step 3: Aggiorna `joinLobby` in `src/lib/db/players.ts`**

Sostituisci la funzione `joinLobby` (righe 4-34) con:
```ts
export async function joinLobby(code: string, username: string): Promise<{ playerId: string; lobbyId: string }> {
  const sb = getSupabase();

  const lobby = await getLobbyByCode(code);
  if (!lobby) throw new Error("Lobby not found");

  let deviceId: string;
  if (lobby.ranked) {
    // Ranked: richiede un account reale; non creare sessioni anonime.
    const { data } = await sb.auth.getUser();
    if (!data.user || data.user.is_anonymous) {
      throw new Error("ranked_requires_login");
    }
    deviceId = data.user.id;
  } else {
    deviceId = await ensureAnonSession();
  }

  const { data, error } = await sb
    .from("players")
    .insert({ lobby_id: lobby.id, username })
    .select("id")
    .single();

  if (error) {
    // 23505 = unique_violation on (lobby_id, device_id) — this device already
    // has a player row in this lobby; return the existing one instead of failing.
    if (error.code === "23505") {
      const { data: existing, error: fetchError } = await sb
        .from("players")
        .select("id")
        .eq("lobby_id", lobby.id)
        .eq("device_id", deviceId)
        .single();
      if (fetchError) throw fetchError;
      return { playerId: existing.id, lobbyId: lobby.id };
    }
    throw error;
  }

  return { playerId: data.id, lobbyId: lobby.id };
}
```
(Le altre funzioni di `players.ts` e gli import in cima — `ensureAnonSession, getSupabase` e `getLobbyByCode` — restano invariati; sono già importati.)

- [ ] **Step 4: Crea `src/lib/db/gameResults.ts`**

```ts
import { getSupabase } from "@/lib/supabase/client";

export interface GlobalScore {
  punti: number;
  pezzi: number;
  partite: number;
}

// Punteggio globale cumulativo = somma dei risultati Ranked dell'utente.
export async function getMyGlobalScore(userId: string): Promise<GlobalScore> {
  const sb = getSupabase();
  const { data, error } = await sb
    .from("game_results")
    .select("punti, pezzi")
    .eq("user_id", userId);
  if (error) throw error;
  const rows = data ?? [];
  return {
    punti: rows.reduce((sum, r) => sum + r.punti, 0),
    pezzi: rows.reduce((sum, r) => sum + r.pezzi, 0),
    partite: rows.length,
  };
}
```

- [ ] **Step 5: Verifica build e lint**

Run: `npm run lint && npm run build`
Expected: nessun errore di tipo (i tipi rigenerati includono `ranked` e `game_results`), build OK.

- [ ] **Step 6: Commit**

```bash
git add src/lib/supabase/types.ts src/lib/db/lobbies.ts src/lib/db/players.ts src/lib/db/gameResults.ts
git commit -m "feat(db-access): ranked-aware lobby/join + global score reads"
```

---

## Task 4: CreateForm toggle Ranked + JoinForm gate

**Files:**
- Modify: `src/components/CreateForm.tsx`
- Modify: `src/components/JoinForm.tsx`

**Interfaces:**
- Consumes: `createLobby(username, ranked)` (Task 3), `useAuth()` → `{ isLoggedIn }`, `loginWithGoogle`.

- [ ] **Step 1: Aggiungi il toggle Ranked in `CreateForm.tsx`**

Nel componente, `useAuth()` già fornisce `profile`; estendi la destrutturazione a `{ profile, isLoggedIn }`. Aggiungi lo stato `const [ranked, setRanked] = useState(false);` accanto agli altri `useState`.

Nella `handleSubmit`, cambia la chiamata:
```ts
      const { code } = await createLobby(trimmed, ranked);
```

Aggiungi, subito prima del bottone submit (prima del blocco `<button type="submit" ...>`), questo toggle:
```tsx
      <button
        type="button"
        onClick={() => isLoggedIn && setRanked((v) => !v)}
        aria-pressed={ranked}
        disabled={!isLoggedIn}
        className={`flex items-center justify-between gap-3 rounded-2xl border-2 px-4 py-3 text-left transition-colors ${
          ranked ? "border-salmon bg-salmon-soft" : "border-soy-soft bg-rice-dim"
        } ${!isLoggedIn ? "opacity-60" : "tap-active"}`}
      >
        <span className="flex flex-col">
          <span className="font-display font-semibold text-nori">🏆 Partita Ranked</span>
          <span className="text-xs text-nori-soft">
            {isLoggedIn
              ? "I punti contano per la classifica globale. Menu ufficiale, punti non modificabili."
              : "Accedi con Google per giocare Ranked."}
          </span>
        </span>
        <span
          aria-hidden="true"
          className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${
            ranked ? "bg-salmon" : "bg-soy-soft"
          }`}
        >
          <span
            className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${
              ranked ? "left-[22px]" : "left-0.5"
            }`}
          />
        </span>
      </button>
```

- [ ] **Step 2: Verifica visiva CreateForm**

Run: `npm run build`
Expected: build OK. (Verifica manuale al Task 7: toggle disabilitato se non loggato, attivabile se loggato.)

- [ ] **Step 3: Gestisci `ranked_requires_login` in `JoinForm.tsx`**

Aggiungi `import { loginWithGoogle } from "@/lib/auth/auth";` in cima. Aggiungi lo stato `const [rankedBlocked, setRankedBlocked] = useState(false);`.

Nel `catch` di `handleSubmit`, sostituisci il blocco di gestione errore con:
```ts
    } catch (err) {
      console.error(err);
      const message = err instanceof Error ? err.message : "";
      if (/ranked_requires_login/.test(message)) {
        setRankedBlocked(true);
        setError("Questa è una partita Ranked: accedi con Google per partecipare.");
      } else if (/not found/i.test(message)) {
        setError("Codice inesistente. Controlla e riprova.");
      } else {
        setError("Impossibile unirsi alla partita. Riprova tra poco.");
      }
      setLoading(false);
    }
```

All'inizio di `handleSubmit`, dopo `setError(null);`, aggiungi `setRankedBlocked(false);`.

Subito dopo il paragrafo dell'errore (il blocco `{error && (...)}`), aggiungi il bottone di login condizionale:
```tsx
      {rankedBlocked && (
        <button
          type="button"
          onClick={() => loginWithGoogle()}
          className="tap-active flex h-12 items-center justify-center rounded-2xl bg-nori font-display font-semibold text-white"
        >
          Accedi con Google
        </button>
      )}
```

- [ ] **Step 4: Verifica build e lint**

Run: `npm run lint && npm run build`
Expected: nessun errore.

- [ ] **Step 5: Commit**

```bash
git add src/components/CreateForm.tsx src/components/JoinForm.tsx
git commit -m "feat(ui): ranked toggle on create + login gate on join"
```

---

## Task 5: Setup e Play page — lockdown UI Ranked + finalize

**Files:**
- Modify: `src/app/lobby/[code]/setup/page.tsx`
- Modify: `src/app/lobby/[code]/play/page.tsx`

**Interfaces:**
- Consumes: `getLobbyByCode` (ritorna `ranked`), `finalizeRankedGame` (Task 3).

- [ ] **Step 1: Setup page — memorizza `ranked` e nascondi le sezioni di editing**

In `setup/page.tsx`, aggiungi lo stato `const [isRanked, setIsRanked] = useState(false);` accanto agli altri `useState`.

Nella funzione `init`, dopo `lobbyIdRef.current = lobby.id;` e `setLobbyId(lobby.id);`, aggiungi:
```ts
        setIsRanked(lobby.ranked);
```

Avvolgi la sezione "Personalizza punti" (l'intera `<section>` che contiene `<h2>Menu</h2>` con `DishSearchInput` e il bottone "Personalizza punti", righe ~197-247) mostrando il **blocco "Personalizza punti"** solo se `!isRanked`. In pratica: mantieni la ricerca menu, ma racchiudi il bottone `Personalizza punti` e il pannello `{pointsOpen && (...)}` in `{!isRanked && (<>...</>)}`.

Sostituisci la sezione "Piatto fuori menu" (righe ~249-252) con una versione condizionale:
```tsx
        {!isRanked && (
          <section className="rounded-2xl bg-card p-5 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
            <h2 className="font-display mb-3 text-lg font-semibold text-nori">Piatto fuori menu</h2>
            {lobbyId && <AddCustomDishForm lobbyId={lobbyId} onAdded={refresh} />}
          </section>
        )}
```

Aggiungi un badge Ranked nell'header, subito dopo l'`<h1>Setup Partita</h1>`:
```tsx
          {isRanked && (
            <span className="rounded-full bg-salmon-soft px-3 py-1 text-xs font-semibold text-salmon-dark">
              🏆 Ranked
            </span>
          )}
```

- [ ] **Step 2: Play page — memorizza `ranked` e usa finalize alla chiusura**

In `play/page.tsx`, aggiorna l'import:
```ts
import { getLobbyByCode, endGame, finalizeRankedGame } from "@/lib/db/lobbies";
```
Aggiungi lo stato `const [isRanked, setIsRanked] = useState(false);` accanto agli altri.

Nella funzione `init`, dopo `setLobbyStato(lobby.stato);` (nel ramo dove si popolano i ref/stati, riga ~130), aggiungi:
```ts
        setIsRanked(lobby.ranked);
```

Sostituisci `handleEndGame` con:
```ts
  async function handleEndGame() {
    if (!lobbyId) return;
    setEnding(true);
    try {
      if (isRanked) {
        await finalizeRankedGame(lobbyId);
      } else {
        await endGame(lobbyId);
      }
      router.replace(`/lobby/${code}/results`);
    } catch (err) {
      console.error(err);
      setError("Impossibile terminare la partita. Riprova.");
      setEnding(false);
      setConfirmEnd(false);
    }
  }
```

Aggiungi un badge Ranked nell'header della tab classifica, dentro il `<div className="flex flex-col">`, dopo lo `<span>` dei giocatori in gara:
```tsx
                {isRanked && (
                  <span className="mt-0.5 w-fit rounded-full bg-salmon-soft px-2 py-0.5 text-[11px] font-semibold text-salmon-dark">
                    🏆 Ranked
                  </span>
                )}
```

- [ ] **Step 3: Verifica build e lint**

Run: `npm run lint && npm run build`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add "src/app/lobby/[code]/setup/page.tsx" "src/app/lobby/[code]/play/page.tsx"
git commit -m "feat(ui): ranked lockdown in setup + finalize on end-game"
```

---

## Task 6: Profile page — sezione Punteggio globale

**Files:**
- Modify: `src/app/profilo/page.tsx`

**Interfaces:**
- Consumes: `getMyGlobalScore(userId)` (Task 3), `useAuth()` → `user`.

- [ ] **Step 1: Carica il punteggio globale**

In `profilo/page.tsx`, aggiungi l'import:
```ts
import { getMyGlobalScore, type GlobalScore } from "@/lib/db/gameResults";
```

Rimuovi l'oggetto `Statistiche` da `PLACEHOLDER_SECTIONS` (resta `Storico partite`, `Piatti più ordinati`, `Badge` — quelli vanno in D).

Aggiungi lo stato accanto agli altri `useState`:
```ts
  const [globalScore, setGlobalScore] = useState<GlobalScore | null>(null);
```

Aggiungi un effetto che carica il punteggio quando l'utente è noto:
```ts
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    getMyGlobalScore(user.id)
      .then((s) => {
        if (!cancelled) setGlobalScore(s);
      })
      .catch((err) => console.error("Errore nel caricamento del punteggio globale:", err));
    return () => {
      cancelled = true;
    };
  }, [user]);
```

- [ ] **Step 2: Renderizza la card Punteggio globale**

Subito prima della sezione "I tuoi progressi" (il blocco `<section className="... I tuoi progressi ...">`, riga ~284), inserisci:
```tsx
        <section className="flex flex-col gap-3 rounded-2xl bg-card p-6 shadow-xl shadow-nori/5 ring-1 ring-soy-soft/40">
          <h2 className="font-display text-lg font-semibold text-nori">🏆 Punteggio globale</h2>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col items-center gap-1 rounded-xl bg-salmon-soft px-2 py-3">
              <span className="font-display text-2xl font-bold text-salmon-dark">
                {globalScore?.punti ?? 0}
              </span>
              <span className="text-xs font-medium text-nori-soft">punti</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl bg-wasabi-soft px-2 py-3">
              <span className="font-display text-2xl font-bold text-wasabi-dark">
                {globalScore?.pezzi ?? 0}
              </span>
              <span className="text-xs font-medium text-nori-soft">pezzi</span>
            </div>
            <div className="flex flex-col items-center gap-1 rounded-xl bg-rice-dim px-2 py-3">
              <span className="font-display text-2xl font-bold text-nori">
                {globalScore?.partite ?? 0}
              </span>
              <span className="text-xs font-medium text-nori-soft">
                {globalScore?.partite === 1 ? "partita" : "partite"}
              </span>
            </div>
          </div>
          <p className="text-xs text-nori-soft">
            Solo le partite Ranked contano per il punteggio globale.
          </p>
        </section>
```

- [ ] **Step 3: Verifica build e lint**

Run: `npm run lint && npm run build`
Expected: nessun errore.

- [ ] **Step 4: Commit**

```bash
git add src/app/profilo/page.tsx
git commit -m "feat(ui): real global score section on profile"
```

---

## Task 7: Review finale + verifica runtime E2E

**Files:** nessuna modifica prevista (solo verifica; fix se emergono problemi).

- [ ] **Step 1: Lint + build completi**

Run: `npm run lint && npm run build`
Expected: puliti.

- [ ] **Step 2: Verifica runtime — creazione Ranked e lockdown**

Con Supabase MCP `execute_sql`, simula/ispeziona (usa un utente reale esistente in `auth.users` se disponibile; altrimenti verifica le regole a livello di schema):
```sql
-- Le policy di editing negano l'insert/update piatti in lobby Ranked.
select polname, pg_get_expr(polqual, polrelid) as using_expr,
       pg_get_expr(polwithcheck, polrelid) as check_expr
from pg_policy where polrelid = 'lobby_dishes'::regclass;
```
Expected: `dishes_insert` con `not is_ranked_lobby(...)` nel check; `dishes_update` con `not is_ranked_lobby(...)` nell'using.

```sql
select polname, pg_get_expr(polwithcheck, polrelid) as check_expr
from pg_policy where polrelid = 'players'::regclass and polname = 'players_insert';
```
Expected: check con `ruolo = 'player'` e la clausola `is_anonymous` per Ranked.

- [ ] **Step 3: Verifica runtime — finalize idempotente**

Crea via SQL una lobby Ranked di prova con un host reale, uno o più giocatori loggati e qualche ordine, poi:
```sql
select finalize_ranked_game('<lobby_id>');
select finalize_ranked_game('<lobby_id>'); -- seconda chiamata: no-op
select user_id, punti, pezzi from game_results where lobby_id = '<lobby_id>';
```
Expected: i punteggi appaiono una sola volta; la seconda chiamata non li raddoppia; la lobby è `completata`.
Pulisci i dati di prova al termine (`delete from game_results where lobby_id = '<lobby_id>'; delete from lobbies where id = '<lobby_id>';`).

- [ ] **Step 4: Verifica advisor finale**

Usa MCP `get_advisors` type `security` e `performance`.
Expected: nessun nuovo warning introdotto da 0010/0011 (RLS abilitata su `game_results`, search_path pinnato sulle nuove funzioni).

- [ ] **Step 5: Aggiorna la memoria di progetto**

Aggiorna `sushi-counter-supabase-project.md` con lo stato: sub-project C completato (ranked mode, game_results, finalize). Nessun commit necessario (file di memoria fuori dal repo).

- [ ] **Step 6: Commit finale (se ci sono stati fix)**

```bash
git add -A
git commit -m "test: runtime verification of ranked scoring (sub-project C)"
```

---

## Self-Review (coperto dallo spec)

- **§1 Modalità Ranked** → Task 1 (colonna + create_lobby), Task 4 (toggle).
- **§2 Gate login** → Task 1 (create_lobby raise + players_insert RLS), Task 3 (joinLobby), Task 4 (JoinForm).
- **§3 Lockdown** → Task 1 (RLS dishes), Task 5 (UI setup).
- **§4 Finalizzazione/snapshot** → Task 2 (RPC), Task 5 (play chiama finalize).
- **§5 Modello dati** → Task 2 (game_results + delete_my_account), Task 3 (getMyGlobalScore).
- **§6 UI punteggio** → Task 6 (profilo).
- **Fuori scope** (classifiche globali/territoriali, storico, piatti più ordinati, verifica "davvero mangiato") → non implementati qui, per D/E.
