# 🎯 Side Quests & Grado Sushi — Documento di Design

**Data:** 2026-07-19
**Stato:** Approvato (design), in attesa di piano di implementazione
**Feature dell'app:** Sushi Counter & Battle (vedi `2026-07-19-sushi-battle-design.md`)

Aggiunge un sistema di **missioni secondarie (side quest)** in stile League of Legends: molte missioni a livelli crescenti, tutte calcolate automaticamente da ciò che il giocatore mangia, più un **grado sushi complessivo** derivato dalla media dei livelli. Coinvolge durante la cena e produce un titolo condivisibile alla fine.

---

## 1. Decisioni prese in brainstorming

- **Scope ora:** versione **per-partita** (il progresso vale per la singola cena), progettata per diventare **cumulativa/persistente** quando arriveranno gli account — senza riscrivere la logica.
- **Tipo missioni:** **solo derivabili dai dati** già tracciati (piatti mangiati, categorie, punti, ordini). Nessuna nuova azione manuale, nessun nuovo tap, impossibile barare.
- **Posizione:** nuova **4ª tab "Missioni"** in basso, consultabile durante il gioco, aggiornata in tempo reale.
- **Finale & social:** il grado complessivo appare nella schermata risultati **e** viene scritto sull'**immagine PNG condivisibile** (badge + titolo + grado + link al sito).
- **Nessuna modifica al database** per questa versione (tutto derivato). Nessuna migrazione.

---

## 2. Architettura & persistenza futura

Il principio: una missione è `metrica(PlayerStats) → valore`, e `valore → livello` tramite una scala di soglie (tier). Il **grado** è `media(livelli) → banda`.

- **Oggi (per-partita):** le `PlayerStats` del giocatore si costruiscono dai suoi ordini mangiati della partita corrente (`quantita_mangiata` × info piatto). Questi dati sono **già disponibili** nella tab di gioco tramite `getMyOrders(playerId)` → nessuna nuova query.
- **Domani (con account):** le stesse identiche `MissionDef` e la stessa scala gradi riceveranno `PlayerStats` **cumulate** tra tutte le partite dell'account. Cambia solo la *fonte* delle statistiche, non la logica delle missioni né i gradi.

Questa separazione (fonte-dati ↔ definizioni-missioni ↔ calcolo-grado) è il cuore della "persistence-readiness".

---

## 3. Modello dati (in memoria, nessuna tabella)

### 3.1 `EatenDish` (input)
Sottoinsieme di `OrderWithDish` già restituito da `getMyOrders`:
```ts
interface EatenDish { nome: string; categoria: string; punti: number; quantita_mangiata: number }
```

### 3.2 `PlayerStats` (aggregato derivato)
```ts
interface PlayerStats {
  nigiri: number;            // pezzi mangiati categoria "Nigiri"
  sashimi: number;           // categoria "Sashimi"
  maki: number;              // categoria "Uramaki" + "Hosomaki"
  gunkanTemaki: number;      // categoria "Gunkan" + "Temaki"
  fritti: number;            // categoria "Fritti"
  dolci: number;             // categoria "Dolci"
  distinctDishes: number;    // n. di piatti diversi con quantita_mangiata > 0
  distinctCategories: number;// n. di categorie diverse mangiate
  gourmet: number;           // pezzi di piatti con punti >= 3
  salmone: number;           // pezzi di piatti con nome ~ /salmone/i
  tonno: number;             // pezzi con nome ~ /tonno/i
  tempura: number;           // pezzi con nome ~ /tempura/i
  fuoriMenu: number;         // pezzi categoria "Fuori Menu"
  puntiTotali: number;       // Σ quantita_mangiata × punti
  pezziTotali: number;       // Σ quantita_mangiata
}
```
`computePlayerStats(eaten: EatenDish[]): PlayerStats` — i conteggi "pezzi" sommano `quantita_mangiata`; `distinctDishes`/`distinctCategories` contano solo dove `quantita_mangiata > 0`.

---

## 4. Missioni (15, tutte derivabili)

Ogni missione mappa su **un** campo di `PlayerStats` e ha 5 tier (soglie per-partita, scala aperta per il futuro). Livello = numero di soglie raggiunte (`value >= soglia`); sotto la prima soglia → livello 0; massimo livello 5.

| id | emoji | titolo | descrizione | stat | tiers |
|---|---|---|---|---|---|
| nigiri | 🍣 | Divoratore di Nigiri | Mangia nigiri | `nigiri` | 1,3,6,10,15 |
| sashimi | 🐟 | Signore del Sashimi | Mangia sashimi | `sashimi` | 1,2,4,6,9 |
| maki | 🌀 | Re dei Maki | Mangia uramaki e hosomaki | `maki` | 1,3,6,10,15 |
| gunkan_temaki | 🍱 | Mani di Riso | Mangia gunkan e temaki | `gunkanTemaki` | 1,2,4,6,8 |
| fritti | 🔥 | Amante del Fritto | Mangia piatti fritti | `fritti` | 1,2,3,5,7 |
| dolci | 🍡 | Goloso | Mangia dolci | `dolci` | 1,2,3,4,5 |
| esploratore | 🧭 | Esploratore | Prova piatti diversi | `distinctDishes` | 2,4,6,9,12 |
| varieta | 🎨 | Palato Versatile | Prova categorie diverse | `distinctCategories` | 2,3,4,5,6 |
| buongustaio | 💎 | Buongustaio | Mangia piatti da 3+ punti | `gourmet` | 1,2,4,6,9 |
| salmone | 🍥 | Salmon Addict | Mangia piatti al salmone | `salmone` | 1,3,5,8,12 |
| tonno | 🔴 | Cacciatore di Tonno | Mangia piatti al tonno | `tonno` | 1,3,5,8,12 |
| tempura | 🍤 | Maestro Tempura | Mangia tempura | `tempura` | 1,2,3,4,6 |
| fuori_menu | 🆕 | Fuori dagli Schemi | Mangia piatti fuori menu | `fuoriMenu` | 1,2,3,4,5 |
| punti | 🏆 | Collezionista di Punti | Accumula punti | `puntiTotali` | 5,15,30,50,75 |
| abbuffata | ♾️ | Senza Fondo | Mangia più pezzi possibile | `pezziTotali` | 5,10,20,35,50 |

```ts
interface MissionDef { id: string; emoji: string; titolo: string; descrizione: string; stat: keyof PlayerStats; tiers: number[] }
const MISSIONS: MissionDef[]; // le 15 righe sopra

function missionLevel(value: number, tiers: number[]): number; // 0..tiers.length
interface MissionProgress { def: MissionDef; value: number; level: number; next: number | null } // next = prossima soglia, null se MAX
function computeMissions(stats: PlayerStats): MissionProgress[];
```

---

## 5. Grado Sushi complessivo

`averageLevel = media dei livelli delle 15 missioni` (0..5). Mappato a una banda:

| soglia media ≥ | emoji | grado |
|---|---|---|
| 0.00 | 🍚 | Chicco di Riso |
| 0.30 | 🥢 | Apprendista |
| 0.60 | 🥉 | Sushi di Bronzo |
| 0.90 | 🥈 | Sushi d'Argento |
| 1.20 | 🥇 | Sushi d'Oro |
| 1.60 | 💎 | Sushi di Platino |
| 2.00 | 🔥 | Maestro del Sushi |
| 2.50 | 🐉 | Gran Maestro del Sushi |
| 3.50 | 👑 | Leggenda del Sushi |

**Calibrazione:** in una singola cena molte missioni restano a livello 0, quindi la media reale è bassa; le bande sono tarate perché una buona cena raggiunga Oro/Platino (soddisfazione), lasciando Maestro→Leggenda come spazio per il futuro cumulativo con gli account. Le soglie sono un unico punto di configurazione, facilmente ritoccabili.

```ts
interface Grade { id: string; emoji: string; nome: string; min: number }
const GRADES: Grade[]; // ordinato per min crescente
function averageLevel(missions: MissionProgress[]): number;
function gradeForAverage(avg: number): Grade;                 // banda più alta con min <= avg
function gradeProgress(avg: number): { current: Grade; next: Grade | null; ratio: number }; // 0..1 verso il prossimo grado
// Comodità:
function computeGrade(eaten: EatenDish[]): { stats: PlayerStats; missions: MissionProgress[]; avg: number; grade: Grade };
```

---

## 6. UI — Tab "Missioni"

- **TabBar:** 4ª voce in basso "Missioni" (icona 🎯). Le tab attuali (Classifica, Menu, Ordini) restano; layout invariato ma con 4 elementi.
- **In cima:** card **Grado** — emoji + nome grado + barra di avanzamento verso il grado successivo (`gradeProgress.ratio`), con etichetta tipo "media Lv 1.4".
- **Sotto:** lista delle 15 missioni. Ogni card: emoji, titolo, badge **Lv X/5**, barra di progresso verso la prossima soglia (`value / next`, oppure "MAX" a livello 5), descrizione breve e il valore corrente (es. "7 nigiri").
- Ordinamento lista: prima le missioni con progresso più alto (livello desc, poi vicinanza alla prossima soglia) così il giocatore vede subito i suoi punti forti; deterministico e stabile.
- **Fonte dati:** usa lo stato `myOrders` già presente nella pagina di gioco (nessuna nuova fetch); si ricalcola in tempo reale a ogni `refetchAll` del realtime.
- Stile coerente col resto (rice/nori/salmon/wasabi, card arrotondate, target ≥44px).

---

## 7. Finale (risultati) + condivisione

- **Results:** per ogni giocatore si calcola il grado dai suoi ordini della lobby (`getLobbyOrders` già disponibile). Il **grado del giocatore corrente** è mostrato in evidenza vicino ai badge.
- **Immagine condivisibile:** `composeBadgeImage` aggiunge una riga col **grado** (emoji + nome) sotto/vicino al titolo del badge. `shareBadge`/`downloadBadge` ricevono un nuovo parametro `grado` (stringa). Il link al sito resta sempre presente (meccanismo pubblicitario).

---

## 8. Struttura del codice (unità isolate)

- `src/lib/logic/missions.ts` — **puro, testabile**: `EatenDish`, `PlayerStats`, `computePlayerStats`, `MissionDef`, `MISSIONS`, `missionLevel`, `MissionProgress`, `computeMissions`, `Grade`, `GRADES`, `averageLevel`, `gradeForAverage`, `gradeProgress`, `computeGrade`. Nessuna dipendenza da React o Supabase.
- `src/components/MissionsTab.tsx` — presentazione: card grado + lista missioni. Riceve `eaten: EatenDish[]` (da `myOrders`).
- `src/components/TabBar.tsx` — aggiunta 4ª tab; `TabId` include `"missioni"`.
- `src/app/lobby/[code]/play/page.tsx` — render della nuova tab passando `myOrders`.
- `src/app/lobby/[code]/results/page.tsx` — calcolo grado per giocatore + evidenza grado corrente.
- `src/components/AwardCard.tsx` + `src/lib/share/shareBadge.ts` — nuovo parametro `grado` fino alla composizione dell'immagine.

---

## 9. Test

Unit test (Vitest) su `missions.ts`:
- `computePlayerStats`: categorizzazione corretta (Nigiri/Sashimi/Maki=Uramaki+Hosomaki/Gunkan+Temaki/Fritti/Dolci/Fuori Menu), match nome salmone/tonno/tempura (case-insensitive), `gourmet` (punti≥3), `distinctDishes`/`distinctCategories` (solo con quantità>0), somme punti/pezzi.
- `missionLevel`: 0 sotto la prima soglia, livelli ai confini esatti (value == soglia → conta), massimo = lunghezza tiers.
- `gradeForAverage`: banda corretta ai confini (es. 0.30 → Apprendista; 1.20 → Sushi d'Oro; 3.50 → Leggenda; 0 → Chicco di Riso).
- `gradeProgress`: ratio 0..1, `next = null` all'ultimo grado.
- `computeGrade`: caso integrato realistico (input ordini → grado atteso).
UI verificata via build pulita + prova manuale in dev; nessun test mock-only.

---

## 10. Fuori scope (futuro)

- Persistenza cumulativa tra partite e gradi che crescono nel tempo (arriva con gli **account**; questa spec predispone la logica ma non la persistenza).
- Missioni basate su azioni extra registrate a mano (es. "usa il wasabi") — scartate per ora a favore delle sole missioni derivabili.
- Ricompense/sblocchi legati ai gradi (badge extra, cosmetici): eventuale V-next.
