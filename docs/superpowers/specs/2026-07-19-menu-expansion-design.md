# 🍱 Espansione Menù — Documento di Design

**Data:** 2026-07-19
**Stato:** Approvato (design), in attesa di piano di implementazione
**Feature dell'app:** All You Can Fight (sub-progetto A del blocco finale: menù → account → punteggio globale → classifiche/profilo → integrità ranked)

Amplia il menù di default (~25 → **~80 piatti**, ~13 categorie) così l'utente raramente deve aggiungere piatti a mano, con una fonte dati unica e una UI che resta usabile su mobile.

---

## 1. Decisioni prese in brainstorming

- Menù **generico completo compilato internamente** (non un ristorante specifico).
- **~70–90 piatti** in ~13 categorie, con **ricerca** + **categorie collassabili** nell'UI.
- **Fonte unica**: nuova tabella catalogo **`default_dishes`** (il "menù ufficiale"), popolata via migration; `seed_default_dishes` copia da lì. Si ritira la lista TS duplicata.
- Le **8 categorie usate dalle missioni restano identiche** (Nigiri, Uramaki, Hosomaki, Sashimi, Gunkan, Temaki, Fritti, Dolci); si aggiungono categorie nuove per varietà.
- Prepara il terreno per le **Ranked** (menù ufficiale a punti bloccati) — sub-progetto futuro.

---

## 2. Tassonomia categorie (finale)

Ordine "da tavola" (usato anche per `CATEGORY_ORDER`):
`Antipasti → Nigiri → Gunkan → Hosomaki → Uramaki → Futomaki → Temaki → Roll Speciali → Sashimi → Tartare & Tataki → Poke → Fritti → Dolci → Fuori Menu`

- **Invariater** (missioni): Nigiri, Uramaki, Hosomaki, Sashimi, Gunkan, Temaki, Fritti, Dolci.
- **Nuove**: Antipasti, Futomaki, Roll Speciali, Tartare & Tataki, Poke.
- **Fuori Menu**: categoria dei piatti custom aggiunti in partita (invariata).

**Sinergia missioni:** con ≥13 categorie base, la missione **"Palato Versatile"** (distinctCategories) può ora raggiungere il **livello 10** (prima max 9). Le missioni per ingrediente (salmone, tonno, gambero, branzino, anguilla, veg, tempura, spicy) hanno più piatti che le alimentano. **Nessuna modifica al codice missioni** (i nomi delle 8 categorie chiave non cambiano; tempura/gyoza restano in "Fritti").

---

## 3. Architettura dati

### 3.1 Nuova tabella catalogo `default_dishes`
- `id` (uuid, PK)
- `nome` (text)
- `categoria` (text)
- `punti` (int, default 1, check ≥1)
- `ordine` (int) — posizione all'interno della categoria (per ordinamento stabile)
- Sola **lettura pubblica** (RLS: select per tutti gli autenticati); nessuna scrittura dal client.

Popolata da una migration con i ~80 piatti (lista completa nel piano di implementazione).

### 3.2 `seed_default_dishes(lobby)` copia dal catalogo
```sql
insert into lobby_dishes (lobby_id, nome, categoria, punti)
select p_lobby, nome, categoria, punti from default_dishes;
```
Resta `SECURITY DEFINER` con `search_path` fisso, e `create_lobby` continua a chiamarla. Così ogni lobby clona il menù ufficiale corrente (comportamento invariato, solo più piatti).

### 3.3 Ritiro della duplicazione TS
- `src/data/defaultDishes.ts` e il suo test vengono **rimossi** se non usati a runtime (da verificare in implementazione). Il catalogo DB diventa l'unica fonte. Se qualche import esiste, va prima sganciato.

---

## 4. Regole punteggi di default

Scala 1–4 (i default saranno anche i valori "ufficiali" per le ranked future):
- **1** = base/economy (hosomaki, california, edamame, verdure)
- **2** = standard (uramaki comuni, temaki, tempura, gyoza, poke base)
- **3** = premium (sashimi, tartare/poke pregiati, anguilla)
- **4** = special/gourmet (roll speciali, sashimi misto, tartare di tonno)

In **Casual** restano modificabili dall'host; in **Ranked** (futuro) saranno bloccati.

---

## 5. UI

### 5.1 Tab Menu/Ordina (`MenuTab`)
- **Barra di ricerca** in cima (filtra per nome/categoria, case-insensitive).
- **Categorie collassabili** (accordion): ogni categoria si apre/chiude; stato locale. Le categorie restano nell'ordine di `CATEGORY_ORDER`.
- Il bottone "Aggiungi piatto fuori menu" resta sempre visibile.

### 5.2 Setup Host
- Aggiunta **ricerca** e la modifica punti diventa **opzionale/collassata** (sezione "Personalizza punti" chiusa di default): i default vanno bene per la maggior parte. Il resto del setup invariato.

### 5.3 `dishOrder.ts`
- `CATEGORY_ORDER` aggiornato con le nuove categorie nell'ordine di §2. `orderDishes` invariato (ordina per rank categoria, poi nome). Rimane deterministico/stabile.

---

## 6. Compatibilità

- **Scoring/awards/leaderboard**: invariati (derivano da `lobby_dishes` clonati). Nessun impatto.
- **Missioni**: invariate a livello di codice; beneficiano di più contenuto (vedi §2).
- **Realtime, RLS, RPC ordini**: invariati.
- **Migrazioni**: append-only (nuova migration per la tabella + seed + update di `seed_default_dishes`).

---

## 7. Test

- Unit test (Vitest) su `dishOrder.ts`: `CATEGORY_ORDER` include tutte le nuove categorie e `orderDishes` resta stabile con il set esteso (categorie sconosciute dopo quelle note).
- Verifica DB: dopo la migration, `default_dishes` contiene ~80 righe; creando una lobby, `lobby_dishes` viene popolata con lo stesso numero; `get_advisors` senza nuovi warning (RLS sulla nuova tabella).
- UI: build pulita + prova manuale (ricerca filtra, categorie collassano, ordine coerente).

---

## 8. Fuori scope (futuro)

- **Ranked** con menù ufficiale a punti bloccati (sub-progetto E; questo pezzo prepara il catalogo).
- Immagini/foto dei piatti.
- Menù multipli/per-ristorante selezionabili.
- Modifica del catalogo da un pannello admin (per ora si aggiorna via migration).
