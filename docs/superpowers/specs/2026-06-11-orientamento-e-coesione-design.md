# Orientamento + coesione + a11y (P3) — design

**Data:** 2026-06-11
**File:** `index.html` (single-file inline).
**Base:** audit 2026-06-11 (priorità P3). Estetica Brutalista invariata; `ConicMath` invariato.

## 0. Ambito (P3)
Cinque interventi:
- **A. Orientamento:** barra di progresso di lettura + mini-TOC con sezione attiva.
- **B. Coesione narrativa:** ponti di transizione a fine sezione + CTA contestuali che aprono il calcolatore sul tool giusto.
- **C. Onboarding calcolatore:** empty-state che insegna i primi 2 passi.
- **D. Mobile:** tabelle leggibili (riduzione) + drawer in `dvh`.
- **E. Accessibilità:** `<main>` landmark, `#calc-overlay` come `role="dialog"` con focus iniziale + focus-trap minimo, controlli `<div onclick>` (swatch, color-btn) attivabili da tastiera, `:focus-visible` globale.

Fuori scope: P4 (pulizia codice morto, dedup, performance).

## 1. A — Progress bar + mini-TOC
- **Barra di progresso:** `<div id="read-progress">` come primo figlio del `<body>` (fuori dal frame), `position:fixed;top:0;height:3px;background:var(--tomato);transform-origin:left;transform:scaleX(0);z-index:100`. Aggiornata su `scroll` (rAF-throttled): `scaleX = scrollY / (scrollHeight - innerHeight)`.
- **Mini-TOC:** `<nav id="toc">` fixed sul bordo sinistro (desktop ≥ 1180px), lista verticale di 7 voci (§1 Fondamenti … §7 Calcolatore) che linkano agli `id` esistenti. Mono piccolo, voce **attiva** evidenziata (pallino/barra pomodoro) via `IntersectionObserver` sulle sezioni. Nascosta sotto 1180px (lì resta solo la progress bar). `aria-label="Indice"`.
- JS: un observer su tutte le `section[id]` aggiorna `.active` nel TOC; un listener scroll aggiorna la barra. Entrambi nel bootstrap. Rispettano reduced-motion implicitamente (nessuna animazione, solo stato).

## 2. B — Ponti + CTA contestuali
- A fine di ciascuna sezione §1–§5, una frase-ponte (classe `.ponte`) che pone la domanda a cui risponde la successiva (es. fine §1 → «E se invece di un punto fisso ne avessimo… infiniti a uguale distanza? È il "cerchio".»).
- In §2–§5, una CTA `.ctx-cta` (bottone brutalista, ink-on-bone) che apre il calcolatore già sul tool pertinente: `onclick="GraphCalc.open(); GraphCalc.startTool('<tipo>')"` (circonferenza/ellisse/iperbole/parabola). Testo: «Costruiscila nel calcolatore →».
- Verifica che `startTool` chiamato subito dopo `open()` funzioni (open inizializza il canvas e renderizza; startTool imposta pendingTool+mode e ri-renderizza).

## 3. C — Onboarding calcolatore
- In `renderSidebar()`, ramo lista oggetti vuota: sostituire il testo «Nessun oggetto creato.» con un blocco onboarding (`.csb-onboard`): due passi numerati — «1 · Scegli uno strumento qui sopra» / «2 · Clicca sul piano per posizionare i punti» — mostrato **solo** se `state.objects.length===0 && !state.pendingTool` (se c'è un tool pendente, lo status già guida). Stile brutalista (bordo inchiostro, numeri pomodoro su... no: numeri inchiostro/marcatore rombo).

## 4. D — Mobile
- `@media (max-width:600px)`: `table.paper-table{font-size:0.7rem}`, `th,td{padding:0.4rem 0.45rem}`. (Le tabelle dense di §2–§5 sono già dentro `<details>` richiusi: impatto ridotto.) `.formula-display` ha già `overflow-x:auto`.
- Drawer calcolatore: `height:68vh;max-height:68vh` → `68dvh` (l'overlay usa già `100dvh`).

## 5. E — Accessibilità
- **Landmark:** `<main>` attorno alle sezioni di contenuto (da `#fondamenti` a `#calcolatore`), dentro `.frame`. Hero e footer restano fratelli.
- **Dialog:** `#calc-overlay` → `role="dialog" aria-modal="true" aria-label="Calcolatore grafico"`. In `open()`: dopo l'apertura, spostare il focus su `#calc-close-btn`. **Focus-trap minimo:** listener `keydown` (aggiunto in `open()`, rimosso in `close()`) che su `Tab`/`Shift+Tab`, se il focus sta per uscire dall'overlay, lo riporta al primo/ultimo elemento focusabile interno. `Esc` già chiude.
- **Tastiera sui `<div onclick>`:** swatch (`.csb-swatch`) e color-btn (`.csb-color-btn`) → aggiungere `role="button" tabindex="0"` e gestione `keydown` Enter/Space (handler condiviso `GraphCalc._kbd(e, fn)` o inline `onkeydown`). (Lo `.csb-obj-name` span resta cliccabile col mouse; gli strumenti principali sono già `<button>`.)
- **`:focus-visible` globale:** `*:focus-visible{ outline:2px solid var(--tomato); outline-offset:2px; }` (e rimuovere outline default ridondante dove serve).

## 6. Architettura / file
- **HTML:** `#read-progress` + `#toc` (markup); `<main>` wrapper; attributi dialog sull'overlay; `.ponte`/`.ctx-cta` a fine sezioni; (swatch/color-btn ricevono role/tabindex nel template JS).
- **CSS:** `#read-progress`, `#toc`, `.ponte`, `.ctx-cta`, `.csb-onboard`, `:focus-visible`, media mobile tabelle, drawer dvh.
- **JS:** bootstrap (progress scroll + TOC observer); `renderSidebar()` (onboarding + role/tabindex su swatch/color-btn); `open()`/`close()` (focus + trap); helper tastiera. `ConicMath`/matematica invariati.

## 7. Verifica
- `node tools/test-conicmath.mjs` verde; `node --check` ok; struttura HTML bilanciata (`<main>`, dialog).
- Visiva: progress bar che si riempie; TOC con sezione attiva; ponti + CTA; onboarding all'apertura del calcolatore (vuoto); CTA contestuale apre il calcolatore sul tool giusto; focus va al pulsante chiudi; `Tab` resta dentro l'overlay; `:focus-visible` visibile; mobile (tabelle, drawer).

## 8. Vincoli
- Single-file inline; `ConicMath` invariato; estetica e palette invariate (nessun nuovo colore).
- TOC/progress non devono coprire contenuto né rompere il layout del frame centrato.
