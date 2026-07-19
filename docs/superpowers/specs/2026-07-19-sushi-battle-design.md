# 🍣 Sushi Counter & Battle — Documento di Design

**Data:** 2026-07-19
**Stato:** Approvato (design), in attesa di piano di implementazione

Piattaforma web in tempo reale per tracciare le ordinazioni di sushi durante una cena all-you-can-eat e sfidare gli amici a chi accumula più punti. Mobile-first, uso al tavolo dal telefono.

---

## 1. Stack & Architettura

- **Next.js** (App Router, TypeScript) — unico progetto, deploy su **Vercel**.
- **Supabase**:
  - Postgres per i dati.
  - Realtime per gli aggiornamenti live tra i telefoni.
  - Auth anonima per identificare il dispositivo senza registrazione.
- **PWA mobile-first**: installabile, ottimizzata per l'uso al tavolo.
- **Tailwind CSS**: stile pulito a tema sushi, con animazioni sulle barre della classifica.
- **Nessun server separato**: la logica sensibile (calcolo punti) vive nel database (niente Node/Express/Socket.io).

**Decisioni prese in brainstorming:**
- Architettura Supabase + Next.js (non Node/Socket.io).
- Login: solo username, nessun account permanente (sessione anonima Supabase per dispositivo).
- Flusso di consumo a 2 fasi: Ordina → Mangiato.
- V1 include: core + award/badge/condivisione. **Esclusa** la penalità avanzi. **Esclusa** la cronologia storica (richiederebbe account veri).
- Condivisione: **PNG** come default (PDF opzionale per il solo download).

---

## 2. Modello dati (Supabase / Postgres)

### 2.1 `lobbies`
- `id` (UUID, PK)
- `codice_accesso` (text, univoco) — 5–6 caratteri alfanumerici (es. `SUSH99`)
- `stato` (enum: `creata`, `in_corso`, `completata`)
- `creato_il` (timestamptz, default now())

### 2.2 `players`
- `id` (UUID, PK)
- `lobby_id` (UUID, FK → lobbies)
- `device_id` (UUID) — dall'auth anonima Supabase (`auth.uid()`)
- `username` (text)
- `ruolo` (enum: `host`, `player`)
- **Nota anti-cheat:** nessuna colonna `punti_totali` scrivibile dal client. I punti sono derivati (vedi 2.5).

### 2.3 `lobby_dishes`
- `id` (UUID, PK)
- `lobby_id` (UUID, FK → lobbies)
- `nome` (text)
- `categoria` (text) — es. Nigiri, Uramaki, Sashimi, Custom
- `punti` (int, default 1)
- Alla creazione della lobby vengono clonati **25 piatti standard** (seed).

### 2.4 `orders`
- `id` (UUID, PK)
- `player_id` (UUID, FK → players)
- `dish_id` (UUID, FK → lobby_dishes)
- `quantita_ordinata` (int)
- `quantita_mangiata` (int, default 0)
- `stato` (enum: `in_attesa`, `consegnato`)

### 2.5 Classifica derivata (anti-cheat)
- `punti_totali` **non** è mai scritto dal client.
- Una **view** Postgres calcola i punti live: `Σ(orders.quantita_mangiata × lobby_dishes.punti)` per giocatore.
- La leaderboard e le statistiche degli award leggono da questa view.

### 2.6 Sicurezza (RLS)
- Ogni giocatore può aggiornare **solo i propri** `orders` (match su `player_id` ↔ `auth.uid()` via `players.device_id`).
- Solo l'`host` della lobby può: modificare `lobby_dishes.punti` in setup, cambiare `lobbies.stato`.
- Qualsiasi giocatore nella lobby può inserire un piatto "fuori menu" in `lobby_dishes`.
- Lettura dei dati limitata ai membri della stessa lobby.

---

## 3. Realtime

- Ogni schermata di gioco si iscrive ai cambiamenti (`postgres_changes`) filtrati per `lobby_id`.
- Eventi che propagano aggiornamenti a tutti i telefoni della lobby:
  - "Mangiato!" → update di `orders` → ricalcolo classifica su tutti.
  - "Aggiungi piatto fuori menu" → insert in `lobby_dishes` → appare a tutti.
  - Modifica punti in setup (host) → update `lobby_dishes`.
  - Cambio stato lobby (avvio / termine partita).

---

## 4. Flusso utente e schermate

### 4.1 Home
- Bottoni "Crea Partita" e "Unisciti con Codice".

### 4.2 Setup Host
- Genera lobby + seed 25 piatti + sessione anonima (host).
- Lista piatti con selettori `+/−` per regolare i `punti` di default.
- Mostra il `codice_accesso` da condividere.
- Bottone "Avvia partita" (`stato` → `in_corso`).

### 4.3 Ingresso Giocatore
- Inserisce `codice_accesso` + `username`, crea sessione anonima ed entra nella lobby come `player`.

### 4.4 Gioco (3 tab)
- **Tab 1 — Classifica Live:** leaderboard con barre di avanzamento animate, ordinata per punti derivati.
- **Tab 2 — Menu/Ordina:** piatti per categoria; tasto "+" per ordinare (incrementa `quantita_ordinata`, crea/aggiorna `order` con `stato = in_attesa`); bottone sempre visibile "Aggiungi piatto fuori menu" (nome + punti).
- **Tab 3 — I Miei Ordini:** ordini dell'utente divisi visivamente tra "In arrivo" (`in_attesa`) e "Mangiati"; tasto verde "Mangiato!" che incrementa `quantita_mangiata`; quando `quantita_mangiata == quantita_ordinata`, lo `stato` passa a `consegnato`.

### 4.5 Fine Partita
- L'host preme "Termina partita" (`stato` → `completata`).
- Il sistema calcola gli award dalle statistiche della lobby.
- Ogni giocatore vede la schermata risultato con il proprio badge.

---

## 5. Award, Badge & Condivisione

### 5.1 Award (assegnati a fine partita)
Calcolati dai dati della lobby (solo consumi confermati: `quantita_mangiata`):

| Titolo | Regola |
|---|---|
| 🏆 Campione Assoluto | Più punti totali |
| 🐟 Re del Salmone | Più pezzi di piatti a base di salmone |
| 🍣 Divoratore di Sashimi | Più pezzi di categoria Sashimi |
| 🔢 Senza Fondo | Più pezzi/piatti in assoluto |
| 💎 Palato Fino | Più pezzi di piatti ad alto punteggio (gourmet) |
| 🌶️ Esploratore | Più piatti diversi provati / più piatti "fuori menu" |
| 🎖️ Partecipante | Badge di default per chi non vince nessuna categoria |

- Un giocatore può ricevere più award; chi non ne riceve ottiene "Partecipante".
- Le soglie/regole precise (es. cosa conta come "salmone", quale valore = "alto punteggio") vengono fissate nel piano di implementazione.

### 5.2 Badge (set fisso per titolo)
- Immagini PNG fornite dall'utente, una per titolo, in `/public/badges` (mappa titolo → file).
- Finché i PNG definitivi non sono disponibili, si usano **badge segnaposto generati via codice**, così il sistema è testabile da subito.

### 5.3 Schermata risultato & condivisione
- Mostra il badge assegnato + `username` del giocatore.
- **"Scarica"**: genera l'immagine finale (PNG; PDF opzionale) del badge con username + branding + link al sito.
- **"Condividi"**: usa la **Web Share API** nativa (Instagram, WhatsApp, ecc.) con l'immagine del badge + testo promozionale + **link al sito** → la condivisione fa pubblicità.

---

## 6. Test & Qualità

- Test unitari della **logica di punteggio** e **assegnazione award** (parte più delicata; TDD).
- Verifica **realtime** con due sessioni simulate (ordine/mangiato su un client → aggiornamento sull'altro).
- Test delle **regole RLS** (un giocatore non può modificare gli ordini altrui né i punti se non host).

---

## 7. Fuori scope (V2 / futuro)

- Penalità avanzi ("Non ce la faccio più").
- Cronologia storica delle partite (richiede account veri).
- Account permanenti / login con email.

---

## 8. Deploy

- Repo su GitHub (da inizializzare).
- Deploy su Vercel collegato al repo.
- Variabili d'ambiente Supabase (URL + anon key) configurate su Vercel.
