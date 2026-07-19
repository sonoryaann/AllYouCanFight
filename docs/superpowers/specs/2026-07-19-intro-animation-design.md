# 🎬 Intro Animation & Logo — Documento di Design

**Data:** 2026-07-19
**Stato:** Approvato (design), in attesa di piano di implementazione
**Feature dell'app:** Sushi Counter & Battle / "All You Can Fight"

Aggiunge un'animazione di introduzione d'impatto alla prima apertura del sito, che culmina nel logo (due chopsticks) usato anche come favicon.

---

## 1. Decisioni prese in brainstorming

- **Chopsticks:** disegnate in **SVG/CSS** nel codice (niente asset esterni), animabili e riusabili come logo + favicon.
- **Frequenza:** l'intro parte **solo alla primissima visita in assoluto** da quel dispositivo (memorizzata in `localStorage`); poi la home appare direttamente. Sempre un **"Salta"**.
- **Logo:** dopo l'intro resta in cima alla **home**; lo stesso segno diventa la **favicon**. Nessun logo nelle schermate di gioco (spazio mobile).
- **Accessibilità:** rispetto di `prefers-reduced-motion` (versione istantanea).
- **Nessuna nuova dipendenza**, nessuna modifica al database.

---

## 2. Sequenza dell'animazione (~3–4s, saltabile)

Overlay a schermo intero sopra la home, sfondo a tema (rice/nori).

1. **Wordmark "ALL YOU CAN FIGHT":** le 4 parole entrano **una alla volta** con effetto "sbatti + rimbalzo" (scale-in con overshoot → assestamento, micro-shake d'impatto), in stagger (~250–350ms l'una).
2. **Chopsticks battle:** due bacchette (SVG) entrano da sinistra e destra e fanno una **battaglia stile spade**: si incrociano e "clash" 2–3 volte (rotazioni alternate + micro-scossa/scintilla), poi si posano.
3. **Transizione a logo:** le bacchette si assestano nella posa-logo, insieme (o sopra) al wordmark, in cima alla home.
4. **Watermark:** compare in piccolo e discreto *"built with love for Alice ❤"* (in basso, opacità ridotta).
5. L'overlay sfuma e lascia la home; il logo resta in cima.

**Salta:** pulsante piccolo in un angolo (target ≥44px) → chiude subito l'overlay e segna `localStorage`.

**Reduced motion:** se l'utente preferisce animazioni ridotte, l'overlay mostra direttamente lo stato finale (wordmark + logo + watermark) per una frazione di secondo o viene saltato, senza movimenti bruschi.

---

## 3. Componenti & file

- `src/components/Logo.tsx` — le chopsticks in **SVG** (componente riusabile, dimensione via prop). Opzionale wordmark accanto. È la fonte unica del segno grafico.
- `src/components/IntroAnimation.tsx` (`"use client"`) — overlay + macchina a stati della sequenza (fasi: parole → battaglia → logo → fine), pulsante "Salta", gestione `localStorage` e `prefers-reduced-motion`. Espone `onDone()`.
- `src/app/page.tsx` — monta `IntroAnimation` sopra la home solo se non già vista (deciso **dopo il mount** per evitare hydration mismatch / flash); mostra il `Logo` in cima alla home.
- `src/app/icon.svg` (o metadata `icons`) — **favicon** basata sullo stesso disegno delle chopsticks.
- Animazioni in `src/app/globals.css` (keyframes) o inline nel componente; nessuna libreria.

**Chiave localStorage:** `aycf_intro_seen` = `"1"`.

---

## 4. Dettagli tecnici

- **SSR-safe:** al primo render (server + primo client render) NON si decide se mostrare l'intro; dopo il mount si legge `localStorage` e, se non vista, si attiva l'overlay. Evita mismatch di hydration e flash dell'intro per chi l'ha già vista.
- **Sequenza:** realizzata con CSS `animation` + `animation-delay` staggerati e/o una piccola macchina a stati React con timer; su "Salta" o a fine sequenza si chiama `onDone()` che smonta l'overlay e scrive `localStorage`.
- **Performance:** solo `transform`/`opacity` (GPU-friendly), niente layout thrashing.
- **Z-index & focus:** overlay copre tutto; "Salta" focusabile; `Esc` chiude (nice-to-have).

---

## 5. Test

- Unit test leggero (Vitest) per un piccolo helper puro se estratto (es. `shouldPlayIntro(storageValue, prefersReducedMotion) => boolean`): non gioca se già vista o reduced-motion.
- Verifica UI: `npm run build` pulita; prova manuale in dev (prima visita → intro; ricarica → niente intro; "Salta" funziona; favicon aggiornata). L'utente valida visivamente la resa dell'animazione.
- Nessun test mock-only.

---

## 6. Fuori scope

- Suoni/effetti audio.
- Varianti stagionali del logo.
- Rigiocare l'intro da un pulsante nelle impostazioni (eventuale V-next).
