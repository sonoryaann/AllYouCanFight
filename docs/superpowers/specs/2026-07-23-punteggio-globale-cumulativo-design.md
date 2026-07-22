# C) Punteggio globale cumulativo — Design

_Data: 2026-07-23_

## Obiettivo

Ogni partita **Ranked** completata somma il punteggio finale di ciascun giocatore
**loggato** a un totale globale cumulativo persistente, base per le future
classifiche globali/territoriali (sotto-progetto D). Il punteggio deve essere
**credibile**: le partite Casual non contano mai, e in Ranked i punti non sono
modificabili.

## Decisioni chiave (approvate)

- **Cosa conta**: solo partite **Ranked**, solo utenti **loggati** (Google).
- **Credibilità**: C include il "lucchetto base" della Ranked (menu ufficiale non
  modificabile). La verifica "piatti davvero mangiati" resta a **E**.
- **Nessun reset futuro**: siccome le Ranked nascono già blindate, la classifica
  globale non andrà mai ripulita.

## 1. Modalità partita: Casual vs Ranked

- Colonna `ranked boolean not null default false` su `lobbies`.
- **CreateForm**: toggle "Partita Ranked 🏆". Disabilitato se l'utente non è
  loggato, con nota "Accedi con Google per giocare Ranked".
- **Casual** = comportamento attuale (menu modificabile, anonimi ammessi).
  **Ranked** = conta per le classifiche.

## 2. Gate login (creazione e ingresso)

- Creare **o** unirsi a una lobby Ranked richiede un utente loggato
  (`auth.uid()` non anonimo). Gli anonimi vengono bloccati con invito ad accedere.
- Così ogni partecipante Ranked ha un'identità persistente cross-device.
- Enforcement: controllo lato client (UI) **e** lato server (RPC/RLS) — vedi §3.

## 3. Lucchetto base Ranked

- **UI**: in setup e in gioco, se `lobby.ranked` → nascondere i pulsanti
  "modifica punti" e "aggiungi piatto fuori menu". Il menu resta il solo catalogo
  ufficiale seminato alla creazione.
- **Rete di sicurezza (RLS, invisibile all'utente)**: le policy `dishes_insert` e
  `dishes_update` vengono negate quando la lobby collegata è `ranked = true`.
  Nessuna modifica UX, solo blindatura dell'API.
- La verifica "i piatti sono stati davvero mangiati e non solo dichiarati" **non**
  è in scope qui: resta al sotto-progetto **E** (ancora irrisolta).

## 4. Finalizzazione e snapshot

- Nuova RPC **`finalize_ranked_game(p_lobby uuid)`** — SECURITY DEFINER,
  `search_path = public`, eseguibile solo dall'host della lobby:
  1. Verifica che la lobby sia `ranked = true` e non già `completata` (guardia di
     idempotenza).
  2. Passa la lobby a `stato = 'completata'`.
  3. Congela il punteggio finale di ogni giocatore **loggato** leggendo la view
     `leaderboard`, inserendo una riga per giocatore in `game_results`
     (`insert ... on conflict (lobby_id, user_id) do nothing`).
- **Idempotente**: la guardia sullo stato + il vincolo unico impediscono doppi
  conteggi anche se la RPC viene richiamata.
- `endGame` (Casual) resta invariata: setta `stato = 'completata'` senza snapshot.
- Il client, alla chiusura di una partita Ranked, chiama `finalize_ranked_game`
  invece di `endGame`.

## 5. Modello dati

Nuova tabella `game_results` — una riga per giocatore per partita Ranked finalizzata:

```sql
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
```

- `lobby_id on delete set null`: lo storico sopravvive alla cancellazione della lobby.
- `user_id on delete cascade`: cancellare l'account rimuove i propri risultati.
- Indice su `user_id` per la somma.
- **RLS**: ogni utente legge i propri risultati (`user_id = auth.uid()`);
  inserimento solo via la RPC SECURITY DEFINER (nessuna policy insert diretta).
  La lettura cross-utente per le classifiche globali sarà definita in **D**.

**Punteggio globale** = `SUM(punti)` su `game_results` per `user_id`. Nessun
contatore denormalizzato per ora (la somma con indice è economica; eventuale
ottimizzazione per il ranking globale in D). Esposto tramite una piccola funzione
o query lato client (`select punti, pezzi from game_results where user_id = auth.uid()`).

- `delete_my_account` aggiornata per cancellare anche `game_results` dell'utente
  (di fatto già coperto dal cascade su `user_id`, ma esplicitato per chiarezza).

## 6. UI del punteggio (anticipo su D)

- Pagina **Profilo**: sostituire il placeholder "Statistiche" con:
  - **Punteggio globale** reale (somma di `punti`).
  - **Partite Ranked giocate** (conteggio righe).
  - **Pezzi totali** (somma di `pezzi`).
- Le classifiche globali/territoriali, lo storico dettagliato e i piatti più
  ordinati restano a **D**.

## Fuori scope (in D / E)

- Classifiche globali e territoriali vere (D).
- Storico partite dettagliato e piatti più ordinati (D).
- Attribuzione geografica/territoriale (D).
- Verifica che i piatti siano stati davvero mangiati (E).

## Rischi / note

- **Enforcement UI-only insufficiente**: per questo il §3 aggiunge la rete RLS.
- **Idempotenza finalize**: garantita da guardia stato + `unique(lobby_id, user_id)`.
- **Giocatori misti in Ranked**: il gate login (§2) impedisce anonimi in Ranked,
  quindi tutti i partecipanti Ranked producono una riga `game_results`.
