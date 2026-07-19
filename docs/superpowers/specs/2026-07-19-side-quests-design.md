# 🎯 Side Quests & Grado Sushi — Documento di Design

**Data:** 2026-07-19
**Stato:** Approvato (design), in attesa di piano di implementazione
**Feature dell'app:** Sushi Counter & Battle (vedi `2026-07-19-sushi-battle-design.md`)

Aggiunge un sistema di **missioni secondarie (side quest)** in stile League of Legends: **molte** missioni a livelli crescenti, tutte calcolate automaticamente da ciò che il giocatore mangia, più un **grado sushi complessivo** derivato dal **punteggio cumulativo** dei livelli. Coinvolge durante la cena, è pensato per essere difficile da completare del tutto, e produce un titolo condivisibile alla fine.

---

## 1. Decisioni prese in brainstorming

- **Scope ora:** versione **per-partita** (il progresso vale per la singola cena), progettata per diventare **cumulativa/persistente** quando arriveranno gli account — senza riscrivere la logica.
- **Tipo missioni:** **solo derivabili dai dati** già tracciati (piatti mangiati/ordinati, categorie, punti, stato ordine). Nessuna nuova azione manuale, nessun nuovo tap, impossibile barare.
- **Quantità:** **27 missioni** (tante, difficili da completare tutte in una sola cena — come LoL).
- **Grado complessivo:** **punteggio cumulativo** = somma dei livelli ottenuti su tutte le missioni (non una media, che con tante missioni verrebbe diluita). Più missioni avanzi, più sali di grado.
- **Posizione:** nuova **4ª tab "Missioni"** in basso, consultabile durante il gioco, aggiornata in tempo reale.
- **Finale & social:** il grado complessivo appare nella schermata risultati **e** viene scritto sull'**immagine PNG condivisibile** (badge + titolo + grado + link al sito).
- **Nessuna modifica al database** per questa versione (tutto derivato). Nessuna migrazione.

---

## 2. Architettura & persistenza futura

Il principio: una missione è `metrica(PlayerStats) → valore`, e `valore → livello` tramite una scala di soglie (tier). Il **grado** è `somma(livelli) → banda`.

- **Oggi (per-partita):** le `PlayerStats` del giocatore si costruiscono dai suoi ordini della partita corrente (`getMyOrders(playerId)`, già disponibile nella tab di gioco) → nessuna nuova query per la tab Missioni.
- **Domani (con account):** le stesse identiche `MissionDef` e la stessa scala gradi riceveranno `PlayerStats` **cumulate** tra tutte le partite dell'account. Cambia solo la *fonte* delle statistiche, non la logica delle missioni né i gradi.

Questa separazione (fonte-dati ↔ definizioni-missioni ↔ calcolo-grado) è il cuore della "persistence-readiness".

---

## 3. Modello dati (in memoria, nessuna tabella)

### 3.1 `EatenDish` (input)
Sottoinsieme di `OrderWithDish` già restituito da `getMyOrders` (una riga per piatto ordinato dal giocatore):
```ts
interface EatenDish {
  nome: string;
  categoria: string;
  punti: number;
  quantita_ordinata: number;
  quantita_mangiata: number;
  stato: "in_attesa" | "consegnato";
}
```

### 3.2 `PlayerStats` (aggregato derivato)
```ts
interface PlayerStats {
  // categorie (somma di quantita_mangiata per categoria)
  nigiri: number; uramaki: number; hosomaki: number; sashimi: number;
  gunkan: number; temaki: number; fritti: number; dolci: number;
  // combo derivate
  maki: number;   // uramaki + hosomaki
  crudo: number;  // nigiri + sashimi
  // ingredienti (match sul nome, case-insensitive, sommando quantita_mangiata)
  salmone: number;   // /salmone/i
  tonno: number;     // /tonno/i
  gambero: number;   // /gamber/i  (gambero/gamberi)
  branzino: number;  // /branzino/i
  anguilla: number;  // /anguilla/i
  veg: number;       // /avocado|verdur|edamame|cetriolo/i
  tempura: number;   // /tempura/i
  spicy: number;     // /spicy/i
  // punti
  gourmet: number;    // pezzi di piatti con punti >= 3
  economici: number;  // pezzi di piatti con punti == 1
  puntiTotali: number;// Σ quantita_mangiata × punti
  // varietà
  distinctDishes: number;     // piatti diversi con quantita_mangiata > 0
  distinctCategories: number; // categorie diverse con quantita_mangiata > 0
  // totali / comportamento
  pezziTotali: number;    // Σ quantita_mangiata
  distinctOrders: number; // righe con quantita_ordinata > 0 (piatti diversi ordinati)
  completedOrders: number;// righe con stato == "consegnato"
  fuoriMenu: number;      // pezzi categoria "Fuori Menu"
}
```
`computePlayerStats(eaten: EatenDish[]): PlayerStats`.

---

## 4. Missioni (27, tutte derivabili)

Ogni missione mappa su **un** campo di `PlayerStats` e ha 5 tier. Livello = numero di soglie raggiunte (`value >= soglia`); sotto la prima soglia → livello 0; massimo livello 5. Le soglie sono per-partita ma la scala resta aperta per il futuro cumulativo.

| id | emoji | titolo | stat | tiers |
|---|---|---|---|---|
| nigiri | 🍣 | Divoratore di Nigiri | `nigiri` | 1,3,6,10,15 |
| uramaki | 🌊 | Maestro Uramaki | `uramaki` | 1,3,6,10,15 |
| hosomaki | 🎋 | Minimalista Hosomaki | `hosomaki` | 1,2,4,6,9 |
| sashimi | 🐟 | Signore del Sashimi | `sashimi` | 1,2,4,6,9 |
| gunkan | 🛶 | Capitano Gunkan | `gunkan` | 1,2,3,5,7 |
| temaki | 🌯 | Artista del Temaki | `temaki` | 1,2,3,4,6 |
| fritti | 🔥 | Amante del Fritto | `fritti` | 1,2,3,5,7 |
| dolci | 🍡 | Goloso | `dolci` | 1,2,3,4,5 |
| maki | 🌀 | Re dei Maki | `maki` | 2,5,9,14,20 |
| crudo | 🍥 | Purista del Crudo | `crudo` | 2,5,9,14,20 |
| salmone | 🧡 | Salmon Addict | `salmone` | 1,3,5,8,12 |
| tonno | 🔴 | Cacciatore di Tonno | `tonno` | 1,3,5,8,12 |
| gambero | 🦐 | Amico dei Gamberi | `gambero` | 1,2,3,5,7 |
| branzino | 🐠 | Intenditore di Branzino | `branzino` | 1,2,3,4,5 |
| anguilla | 🥢 | Coraggioso | `anguilla` | 1,2,3,4,5 |
| veg | 🥗 | Salutista | `veg` | 1,2,3,5,7 |
| tempura | 🍤 | Maestro Tempura | `tempura` | 1,2,3,4,6 |
| spicy | 🌶️ | Palato di Fuoco | `spicy` | 1,2,3,4,5 |
| punti | 🏆 | Collezionista di Punti | `puntiTotali` | 5,15,30,50,75 |
| buongustaio | 💎 | Buongustaio | `gourmet` | 1,2,4,6,9 |
| economico | 🪙 | Risparmiatore | `economici` | 2,5,9,14,20 |
| esploratore | 🧭 | Esploratore | `distinctDishes` | 2,4,7,10,14 |
| varieta | 🎨 | Palato Versatile | `distinctCategories` | 2,3,4,6,8 |
| abbuffata | ♾️ | Senza Fondo | `pezziTotali` | 5,10,20,35,50 |
| ordinatore | 📋 | Ordinatore Seriale | `distinctOrders` | 3,6,10,15,20 |
| nessuno_spreco | ✅ | Nessuno Spreco | `completedOrders` | 2,4,7,11,15 |
| fuori_menu | 🆕 | Fuori dagli Schemi | `fuoriMenu` | 1,2,3,4,5 |

Ogni missione ha anche una `descrizione` breve in italiano (definita nel codice; es. "Mangia nigiri", "Prova piatti diversi").

```ts
interface MissionDef { id: string; emoji: string; titolo: string; descrizione: string; stat: keyof PlayerStats; tiers: number[] }
const MISSIONS: MissionDef[]; // le 27 righe sopra

function missionLevel(value: number, tiers: number[]): number; // 0..tiers.length
interface MissionProgress { def: MissionDef; value: number; level: number; next: number | null } // next = prossima soglia, null se MAX
function computeMissions(stats: PlayerStats): MissionProgress[];
```

---

## 5. Grado Sushi complessivo (cumulativo)

`gradeScore = somma dei livelli` delle 27 missioni (0 … 135). Mappato alla banda più alta con `min <= gradeScore`:

| punteggio ≥ | emoji | grado |
|---|---|---|
| 0 | 🍚 | Chicco di Riso |
| 5 | 🥢 | Apprendista |
| 12 | 🥉 | Sushi di Bronzo |
| 22 | 🥈 | Sushi d'Argento |
| 35 | 🥇 | Sushi d'Oro |
| 50 | 💎 | Sushi di Platino |
| 70 | 🔥 | Maestro del Sushi |
| 95 | 🐉 | Gran Maestro del Sushi |
| 120 | 👑 | Leggenda del Sushi |

**Calibrazione:** in una singola cena si toccano ~10–15 missioni a livelli bassi/medi → punteggio ~20–45, cioè Argento/Oro/Platino (soddisfacente). Maestro→Leggenda restano spazio per il futuro **cumulativo** con gli account. Le soglie sono un unico punto di configurazione, facilmente ritoccabili.

```ts
interface Grade { id: string; emoji: string; nome: string; min: number }
const GRADES: Grade[]; // ordinato per min crescente

function gradeScore(missions: MissionProgress[]): number;      // somma dei livelli
function gradeForScore(score: number): Grade;                  // banda più alta con min <= score
function gradeProgress(score: number): { current: Grade; next: Grade | null; ratio: number }; // 0..1 verso il grado successivo
// Comodità:
function computeGrade(eaten: EatenDish[]): { stats: PlayerStats; missions: MissionProgress[]; score: number; grade: Grade };
```

---

## 6. UI — Tab "Missioni"

- **TabBar:** 4ª voce in basso "Missioni" (icona 🎯). Le tab attuali (Classifica, Menu, Ordini) restano; layout con 4 elementi.
- **In cima:** card **Grado** — emoji + nome grado + barra verso il grado successivo (`gradeProgress.ratio`) + etichetta col punteggio (es. "Punteggio 28 · prossimo: Sushi d'Oro").
- **Sotto:** lista delle 27 missioni. Ogni card: emoji, titolo, badge **Lv X/5**, barra di progresso verso la prossima soglia (`value / next`, oppure "MAX" a livello 5), descrizione breve e valore corrente (es. "7 nigiri"). Con tante missioni, la lista scrolla.
- Ordinamento: prima le missioni con progresso più alto (livello desc, poi vicinanza alla prossima soglia), così i punti forti sono in cima; deterministico e stabile (a parità, ordine per `id`).
- **Fonte dati:** usa lo stato `myOrders` già presente nella pagina di gioco (nessuna nuova fetch); si ricalcola in tempo reale a ogni `refetchAll` del realtime.
- Stile coerente col resto (rice/nori/salmon/wasabi, card arrotondate, target ≥44px).

---

## 7. Finale (risultati) + condivisione

- **Results:** per ogni giocatore si calcola il grado dai suoi ordini della lobby. Serve estendere `getLobbyOrders` (o aggiungere una funzione affine) perché restituisca, per ogni riga, `player_id` + i campi di `EatenDish` (nome, categoria, punti, quantita_ordinata, quantita_mangiata, stato). Il **grado del giocatore corrente** è mostrato in evidenza vicino ai badge.
- **Immagine condivisibile:** `composeBadgeImage` aggiunge una riga col **grado** (emoji + nome) vicino al titolo del badge. `shareBadge`/`downloadBadge` ricevono un nuovo parametro `grado` (stringa). Il link al sito resta sempre presente (meccanismo pubblicitario).

---

## 8. Struttura del codice (unità isolate)

- `src/lib/logic/missions.ts` — **puro, testabile**: `EatenDish`, `PlayerStats`, `computePlayerStats`, `MissionDef`, `MISSIONS`, `missionLevel`, `MissionProgress`, `computeMissions`, `Grade`, `GRADES`, `gradeScore`, `gradeForScore`, `gradeProgress`, `computeGrade`. Nessuna dipendenza da React o Supabase.
- `src/components/MissionsTab.tsx` — presentazione: card grado + lista missioni. Riceve `eaten: EatenDish[]` (da `myOrders`).
- `src/components/TabBar.tsx` — aggiunta 4ª tab; `TabId` include `"missioni"`. Verificare che 4 voci restino comode su schermi stretti.
- `src/app/lobby/[code]/play/page.tsx` — render della nuova tab passando `myOrders`.
- `src/lib/db/orders.ts` — estendere `getLobbyOrders` per includere i campi di `EatenDish` per giocatore (vedi §7).
- `src/app/lobby/[code]/results/page.tsx` — calcolo grado per giocatore + evidenza grado corrente.
- `src/components/AwardCard.tsx` + `src/lib/share/shareBadge.ts` — nuovo parametro `grado` fino alla composizione dell'immagine.

---

## 9. Test

Unit test (Vitest) su `missions.ts`:
- `computePlayerStats`: categorizzazione (tutte le 8 categorie + Fuori Menu), combo `maki`/`crudo`, match nome salmone/tonno/gambero/branzino/anguilla/veg/tempura/spicy (case-insensitive), `gourmet` (punti≥3) ed `economici` (punti==1), `distinctDishes`/`distinctCategories` (solo con quantità>0), `distinctOrders` (ordinata>0), `completedOrders` (stato consegnato), somme punti/pezzi.
- `missionLevel`: 0 sotto la prima soglia, livelli ai confini esatti (value == soglia → conta), massimo = lunghezza tiers.
- `gradeScore`: somma corretta dei livelli.
- `gradeForScore`: banda corretta ai confini (0 → Chicco di Riso; 5 → Apprendista; 35 → Sushi d'Oro; 120 → Leggenda).
- `gradeProgress`: ratio 0..1, `next = null` all'ultimo grado.
- `computeGrade`: caso integrato realistico (input ordini → punteggio e grado attesi).
- Ordinamento missioni (helper UI se estratto): stabile e deterministico.
UI verificata via build pulita + prova manuale in dev; nessun test mock-only.

---

## 10. Fuori scope (futuro)

- Persistenza cumulativa tra partite e gradi che crescono nel tempo (arriva con gli **account**; questa spec predispone la logica ma non la persistenza).
- Missioni basate su azioni extra registrate a mano (es. "usa il wasabi") — scartate per ora a favore delle sole missioni derivabili.
- Ricompense/sblocchi legati ai gradi (badge extra, cosmetici): eventuale V-next.
