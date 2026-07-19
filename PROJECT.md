# 🍣 Piano d'Azione: Sushi Counter & Battle App

Questo documento contiene la roadmap definitiva e le specifiche tecniche per lo sviluppo dell'applicazione web "Sushi Counter", una piattaforma in tempo reale per tracciare le ordinazioni e sfidare gli amici a chi mangia più sushi.

---

## 📅 Tabella di Marcia (Roadmap)

[Fase 1: Design DB] ➔ [Fase 2: Sviluppo Backend] ➔ [Fase 3: Sviluppo Frontend] ➔ [Fase 4: Real-Time] ➔ [Fase 5: Test & Launch]

---

## 🧠 1. Architettura dei Dati (Database Relazionale o NoSQL)

Per garantire la massima velocità d'esecuzione e coerenza dei dati durante la cena, la struttura del database deve essere divisa in 4 entità principali.

### 🏠 1.1. Lobby (Stanze)
Ogni sessione di cena corrisponde a una stanza univoca.
*   `id_lobby` (UUID / String): Identificativo univoco.
*   `codice_accesso` (String): Codice alfanumerico di 5-6 caratteri (es. `SUSH99`) generato per l'accesso rapido da mobile.
*   `stato` (Enum): `creata`, `in_corso`, `completata`.
*   `creato_il` (Timestamp)

### 👥 1.2. Utenti (Giocatori)
*   `id_utente` (UUID)
*   `id_lobby` (UUID): Chiave esterna che collega l'utente alla sua stanza attuale.
*   `username` (String): Nome visualizzato nella classifica.
*   `ruolo` (Enum): `host` (creatore, può editare i punti di default), `player`.
*   `punti_totali` (Integer): Somma dinamica dei punti accumulati.

### 🍤 1.3. Catalogo Piatti Lobby (Menu della Stanza)
Ogni lobby clona una lista di piatti base per permettere la personalizzazione dei punti locale, senza influenzare le altre stanze.
*   `id_piatto` (UUID)
*   `id_lobby` (UUID): Collegamento alla stanza corrente.
*   `nome_piatto` (String): Es. *Nigiri Salmone*, *Uramaki Ebiten*.
*   `categoria` (String): Es. *Nigiri*, *Uramaki*, *Sashimi*, *Custom*.
*   `punti` (Integer): Valore del piatto (Default: 1, modificabile).

### 📝 1.4. Ordini e Consumo (La Tabella Pivot)
Questa tabella traccia la transizione del cibo dallo stato di "ordinato" a "mangiato".
*   `id_ordine` (UUID)
*   `id_utente` (UUID)
*   `id_piatto` (UUID)
*   `quantita_ordinata` (Integer): Quanti pezzi/porzioni l'utente dichiara di aver ordinato.
*   `quantita_mangiata` (Integer): Quanti pezzi l'utente ha effettivamente consumato (aggiorna il punteggio).
*   `stato` (Enum): `in_attesa` (cibo ordinato ma non arrivato), `consegnato` (finito).

---

## 🔄 2. Flusso Utente e Logica di Business

### 🎮 Fase A: Setup Rapido (Tempo stimato: < 1 minuto)
1.  **L'Host crea la stanza:** Il sistema genera la `Lobby` e popola automaticamente la tabella `Catalogo Piatti Lobby` inserendo **25 piatti standard** pre-caricati nel sistema (divisi per categorie comuni).
2.  **Edit dei Punteggi:** L'Host visualizza una lista rapida dei piatti con selettori `+ / -` per modificare i punti di default (es. alzare il Sashimi a 3 punti se il ristorante ha porzioni giganti).
3.  **Ingresso Giocatori:** Gli amici inseriscono il `codice_accesso` sul proprio telefono, scelgono un `username` ed entrano nella lobby.

### 📝 Fase B: Fase Ordinazione (Prima che arrivi il cibo)
1.  Gli utenti consultano il menu digitale dell'app (che rispecchia i piatti standard + eventuali modifiche).
2.  Quando ordinano dal cameriere del ristorante, replicano l'ordine sull'app cliccando su un piatto e premendo **"Aggiungi a Miei Ordini"** (incrementa `quantita_ordinata`).
3.  I piatti rimangono visibili nella tab personale dell'utente sotto la voce **"In Attesa del Cameriere"**.

### ⚔️ Fase C: Il Cibo Arriva (La Gara in Tempo Reale)
1.  Il cameriere porta un piatto al tavolo.
2.  L'utente apre la tab **"I Miei Ordini / In Attesa"** per verificare se quel piatto lo aveva ordinato lui.
3.  Se il piatto è corretto, l'utente clicca sul tasto verde **"Mangiato!"**.
    *   `quantita_mangiata` aumenta di 1.
    *   Se `quantita_mangiata` == `quantita_ordinata`, il piatto passa a `consegnato`.
    *   Il sistema calcola istantaneamente: `punti_totali = punti_totali + punti_piatto`.
4.  **Gestione Fuori Menu:** Se arriva un piatto non presente nella lista iniziale, qualsiasi utente può cliccare su **"Aggiungi Piatto Rapido"**, inserire Nome e Punti. Il piatto viene inserito nel database della lobby e appare istantaneamente sui telefoni di tutti.

---

## 🖥️ 3. Architettura Tecnologica Consigliata

Per un'applicazione di questo tipo, l'aggiornamento istantaneo degli schermi dei giocatori è fondamentale.

*   **Frontend:** React.js o Vue.js (framework reattivi per mobile-first PWA, dato che gli utenti useranno lo smartphone al tavolo).
*   **Backend:** Node.js con Express (veloce, leggero, ideale per gestire I/O asincroni).
*   **Real-Time Engine:** **Socket.io / WebSockets**. Quando un utente clicca su "Mangiato", un evento socket notifica il server, il quale aggiorna il database e trasmette la nuova classifica a tutti i partecipanti connessi.
*   **Database:** PostgreSQL (per la stabilità delle relazioni) o MongoDB (per la flessibilità dei piatti custom).

---

## 🛠️ 4. Lista dei Compiti Tecnici (To-Do List per lo Sviluppo)

### 🟦 Sviluppo Backend (API & Sockets)
- [ ] Configurazione server Node.js ed endpoint REST per creazione lobby e utenti.
- [ ] Creazione script di popolamento (Seed) per i 25 piatti di default.
- [ ] Configurazione Socket.io per stanze isolate (`socket.join(id_lobby)`).
- [ ] Creazione evento socket `aggiungi_ordine` e `conferma_mangiato`.
- [ ] Creazione logica di calcolo del punteggio sul server (per evitare trucchi/cheat via client).

### 🟨 Sviluppo Frontend (Interfaccia Utente)
- [ ] Schermata Home: Bottoni "Crea Partita" e "Unisciti con Codice".
- [ ] Schermata Host: Pannello di controllo con lista piatti standard e input per modificare i punteggi.
- [ ] Schermata Gioco - Tab 1 (**Classifica Live**): Leaderboard orizzontale con barre di avanzamento animate.
- [ ] Schermata Gioco - Tab 2 (**Menu/Ordina**): Lista piatti divisa per categorie con tasto "+" per ordinare. Bottoncino sempre visibile "Aggiungi piatto fuori menu".
- [ ] Schermata Gioco - Tab 3 (**I Miei Ordini**): Lista dei piatti ordinati dall'utente, divisi visivamente tra "In arrivo" e "Mangiati", con tasto di conferma rapida.

---

## 🏆 5. Funzionalità Bonus per il Futuro (V2)
*   **Penalità Avanzi:** Tasto "Non ce la faccio più" che sottrae punti se si lascia del cibo nel piatto (regola classica dell'All You Can Eat).
*   **Cronologia Storica:** Salvataggio delle partite passate nel profilo utente per vedere le statistiche di consumo nel tempo.
*   **Badge e Titoli:** Assegnazione di titoli a fine partita (es. *"Il Re del Salmone"* a chi ha mangiato più Nigiri, *"Senza Fondo"* a chi ha fatto più punti complessivi).