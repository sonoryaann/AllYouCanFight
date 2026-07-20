# 👤 Account & Auth — Documento di Design

**Data:** 2026-07-19
**Stato:** Approvato (design), in attesa di piano di implementazione
**Feature dell'app:** All You Can Fight (sub-progetto **B** del blocco finale: menù ✅ → **account** → punteggio globale → classifiche/profilo → integrità ranked)

Aggiunge account **opzionali** con login **Google**, un profilo utente, un hamburger menu, logout ed eliminazione account (GDPR). È la base per punteggio globale, classifiche e missioni cumulative (sub-progetti C/D).

---

## 1. Decisioni prese in brainstorming

- **Account opzionale**: il Casual resta anonimo e frictionless; l'account sblocca la persistenza (C/D).
- **Solo Google** ora (Apple in futuro).
- **Continuità**: un utente anonimo che accede con Google viene **collegato** (`linkIdentity`), preservando `auth.uid()` e i suoi dati (resta nella partita in corso). Se l'account Google esiste già → fallback a login normale.
- **Eliminazione account (GDPR)**: cancella profilo + utente auth + **anche lo storico partite personale** (partecipazioni/ordini).
- Nessun impatto sul gioco anonimo esistente.

---

## 2. Setup richiesto all'utente (non automatizzabile)

Il login Google richiede una configurazione una-tantum lato Google/Supabase (la guiderò con passi esatti; io non posso crearla perché serve l'account Google Cloud dell'utente):
1. In **Google Cloud Console**: crea un progetto → **OAuth consent screen** → **Credentials → OAuth 2.0 Client ID (Web)**.
2. Aggiungi come **Authorized redirect URI** l'URL di callback di Supabase: `https://hqxwujapcvthpurbymhl.supabase.co/auth/v1/callback`.
3. In **Supabase → Authentication → Providers → Google**: incolla **Client ID** e **Client Secret**, abilita.
4. In **Supabase → Authentication → URL Configuration**: aggiungi il dominio Vercel e `http://localhost:3000` alle **Redirect URLs**.

Finché non è fatto, il codice è pronto ma il login reale non è testabile.

---

## 3. Modello dati

### 3.1 `profiles`
- `id` (uuid, PK, FK → `auth.users(id)` **on delete cascade**)
- `display_name` (text)
- `avatar_url` (text, null) — da Google
- `creato_il` (timestamptz default now())

**RLS:** `select` per tutti gli autenticati (servono nomi/avatar per classifiche); `insert`/`update` solo `id = auth.uid()`. Nessuna `delete` dal client (avviene via RPC eliminazione).

### 3.2 Creazione profilo
Client-side dopo login/link: `ensureProfile()` fa **upsert** del proprio profilo usando i metadati sessione (`user_metadata.full_name`/`name`, `avatar_url`). Robusto sia per login nuovo (INSERT su auth.users) sia per link (UPDATE, dove un trigger INSERT non scatterebbe). Nessun trigger DB necessario.

### 3.3 RPC eliminazione account
`delete_my_account()` — `SECURITY DEFINER`, `search_path=public`, esegue con `auth.uid()`:
```sql
delete from players where device_id = auth.uid();   -- cascade su orders
delete from profiles where id = auth.uid();
delete from auth.users where id = auth.uid();
```
Grant execute a `authenticated`. (Se la delete su `auth.users` non fosse permessa dai privilegi della funzione, fallback: Edge Function con service role — da valutare in implementazione.)

---

## 4. Flusso auth (client)

Modulo `src/lib/auth/`:
- `loginWithGoogle()`: se la sessione corrente è anonima → `supabase.auth.linkIdentity({ provider: 'google', options: { redirectTo } })`; altrimenti / in fallback (identity già esistente) → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo } })`. `redirectTo` = `${origin}/auth/callback`.
- **Callback**: route `src/app/auth/callback/route.ts` che scambia il `code` per la sessione (pattern SSR `@supabase/ssr`) e reindirizza alla home (o al punto di partenza).
- `logout()`: `supabase.auth.signOut()` → poi `ensureAnonSession()` per tornare a giocare anonimo.
- `getSessionUser()` / `useAuth()` hook: espone `{ user, isLoggedIn, isAnonymous, profile }` per l'UI (aggiornato su `onAuthStateChange`).
- `ensureProfile()`, `getProfile(id)`, `updateDisplayName(name)`, `deleteAccount()` (chiama la RPC poi `signOut`).

`src/lib/db/profiles.ts`: accesso tipizzato a `profiles`.

Nota: `ensureAnonSession` resta per il gioco anonimo; dopo login/link `auth.uid()` è lo stesso (se linkato) e i dati restano validi.

---

## 5. UI

### 5.1 Hamburger menu (`AppMenu`)
- Componente client montato globalmente (in `layout.tsx`), pulsante ☰ in alto (non invadente; nascosto durante l'intro).
- Drawer con voci:
  - **Profilo** (`/profilo`) — se loggato; se non loggato mostra **"Accedi con Google"**.
  - **Classifiche** — placeholder ora ("presto"), attivo in D.
  - **Logout** — se loggato.
  - **Elimina account** — se loggato (con conferma).
- Auth-aware via `useAuth()`.

### 5.2 Pagina Profilo (`/profilo`)
- Avatar (da Google) + `display_name` (modificabile inline) + "membro dal".
- Sezioni **statistiche / storico / piatti più ordinati / badge**: **placeholder "presto disponibile"** (popolate in C/D — non costruite ora per non rifare il lavoro).
- Pulsanti **Logout** ed **Elimina account** (conferma modale; la modale spiega che cancella tutto).
- Se non loggato: schermata "Accedi con Google per avere un profilo".

### 5.3 Nome nelle partite
- Se loggato, `CreateForm`/`JoinForm` pre-compilano lo username con `profile.display_name` (comunque modificabile per partita). Anonimi invariati.

---

## 6. Privacy / GDPR

- Aggiornare `/privacy`: aggiungere che, con l'account Google, trattiamo **nome e immagine profilo** (da Google) per identità e classifiche; base giuridica esecuzione del servizio; diritto di **eliminazione account** self-service dal profilo (oltre alla richiesta via email); dati in UE.
- Il login Google imposta un **cookie di sessione**: è **strettamente necessario** al servizio richiesto (accesso), quindi esente da consenso; nessun tracker aggiunto.

---

## 7. Compatibilità

- Gioco anonimo, RLS esistenti, RPC ordini, missioni, menù: invariati.
- `players.device_id = auth.uid()`: con il link, `auth.uid()` non cambia → le partecipazioni restano collegate. Con login su nuovo dispositivo, l'utente ha lo stesso `auth.uid()` Google → coerente.
- Migrazioni append-only (profiles + RPC delete).

---

## 8. Test

- Unit (Vitest) per gli helper puri estraibili (es. `displayNameFromUser(user)` → nome da metadati con fallback "Giocatore").
- Build pulita.
- Runtime (dopo la config Google dell'utente): login Google (link da anonimo mantiene i dati), profilo creato, modifica nome, logout torna anonimo, elimina account rimuove profilo + dati e disconnette. Verifica RLS (non puoi modificare il profilo altrui) e che `delete_my_account` tocchi solo i propri dati.
- `get_advisors` senza nuovi warning non intenzionali.

---

## 9. Fuori scope (in C/D/E o futuro)

- Punteggio globale cumulativo e missioni persistenti (C).
- Classifiche globale/territoriale + statistiche/storico reali nel profilo (D).
- Login Apple.
- Merge di due account (anonimo con dati + account Google già esistente): per ora fallback a login semplice, senza fusione dei dati.
