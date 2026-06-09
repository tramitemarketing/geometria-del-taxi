# Roadmap miglioramenti — Geometria del Taxi

Backlog di idee interattive, di resa e di funzionalità per il sito (`index.html`).
Lavoriamo **una feature alla volta, fatta bene** (brainstorming → design → implementazione → verifica).

**Vincolo del progetto:** tutto deve restare inline in `index.html`, senza file/dipendenze esterne né build step. Le idee che lo metterebbero in discussione (KaTeX, PWA) sono segnate.

Legenda impatto: ⭐⭐⭐ alto · ⭐⭐ medio · ⭐ basso — Sforzo: S/M/L — Stato: 📋 da fare · 🔨 in corso · ✅ fatto

---

## 🎯 Top priorità (le 3 che cambiano davvero il sito)

| # | Idea | Impatto | Sforzo | Stato |
|---|------|---------|--------|-------|
| T1 | **Punto P che "dimostra" la conica in tempo reale** — un punto scorre sulla curva, con i due percorsi Manhattan a scaletta verso i fuochi e la somma/differenza/distanza che resta costante mentre si muove. Vale per mini-canvas e calcolatore. | ⭐⭐⭐ | M | 📋 |
| T2 | **Mini-canvas manipolabili** — trascinare fuochi/centro direttamente nel disegno, non solo con lo slider. | ⭐⭐⭐ | M | 📋 |
| T3 | **Overlay "9 regioni" esteso a ellisse/iperbole/parabola** nel calcolatore (oggi solo asse/circonferenza; il motore ora li supporta tutti). | ⭐⭐⭐ | S–M | 📋 |

---

## 🌌 Hero (apertura)

| # | Idea | Impatto | Sforzo | Stato |
|---|------|---------|--------|-------|
| H1 | **Taxi che percorre la "L" vs diagonale fantasma**, in loop — incarna il titolo. | ⭐⭐⭐ | M | 📋 |
| H2 | **Il cursore disegna una taxi-circonferenza (rombo)** che pulsa dove passa il mouse. | ⭐⭐ | S | 📋 |
| H3 | **Titolo animato**: la diagonale si spezza nella scaletta L₁ al caricamento. | ⭐⭐ | S | 📋 |
| H4 | **Due punti trascinabili con `d₁` vs `d₂` live** (micro-playground nell'hero). | ⭐⭐ | M | 📋 |
| H5 | **Scroll cue / progress** e transizioni d'ingresso sezioni. | ⭐ | S | 📋 |

## 📚 Sezioni didattiche / mini-canvas

| # | Idea | Impatto | Sforzo | Stato |
|---|------|---------|--------|-------|
| S1 | **Trascinamento diretto** di fuochi/centro nel canvas. (vedi T2) | ⭐⭐⭐ | M | 📋 |
| S2 | **Punto P che dimostra la proprietà** (somma/diff/distanza costante) con scalette Manhattan. (vedi T1) | ⭐⭐⭐ | M | 📋 |
| S3 | **Tasto "▶ anima"**: 2a che cresce → metamorfosi ottagono→esagono→rombo. | ⭐⭐⭐ | M | 📋 |
| S4 | **Conica euclidea fantasma sovrapposta** ("ecco perché è diversa"). | ⭐⭐ | S | 📋 |
| S5 | **Hover = evidenzia la regione** (mini versione dell'overlay del calcolatore). | ⭐⭐ | M | 📋 |
| S6 | **Scrollytelling**: scorrendo, il canvas costruisce a tappe (rette critiche → regioni → scioglimento moduli → curva). | ⭐⭐⭐ | L | 📋 |
| S7 | **Micro-quiz** "clicca dove sta il punto equidistante" con feedback. | ⭐⭐ | M | 📋 |

## 🧮 Calcolatore grafico

| # | Idea | Impatto | Sforzo | Stato |
|---|------|---------|--------|-------|
| C1 | **Overlay regioni per tutte le coniche.** (vedi T3) | ⭐⭐⭐ | S–M | 📋 |
| C2 | **Sonda P**: clic ovunque → `d₁` ai fuochi, in quale regione sei, equazione live. | ⭐⭐⭐ | M | 📋 |
| C3 | **Condivisione**: stato serializzato nell'URL (link condivisibili) + **export PNG/SVG**. | ⭐⭐⭐ | M | 📋 |
| C4 | **Galleria esempi** ("carica un esempio": ellisse-ottagono, iperbole verticale, parabola obliqua…). | ⭐⭐ | S | 📋 |
| C5 | **Undo/redo + scorciatoie tastiera.** | ⭐⭐ | M | 📋 |
| C6 | **Auto-play degli slider** (anima un parametro). | ⭐⭐ | S | 📋 |
| C7 | **Modalità confronto euclideo vs taxicab.** | ⭐⭐ | M | 📋 |
| C8 | **Punti di intersezione tra oggetti** e tracciamento del "luogo libero". | ⭐⭐ | L | 📋 |

## ✨ Generale (resa, performance, portata)

| # | Idea | Impatto | Sforzo | Stato |
|---|------|---------|--------|-------|
| G1 | **Formule con KaTeX** invece di span HTML (⚠️ valutare vincolo inline). | ⭐⭐ | M | 📋 |
| G2 | **`prefers-reduced-motion`** + ottimizzazione rAF dell'hero. | ⭐⭐ | S | 📋 |
| G3 | **Nav/TOC con progress di lettura.** | ⭐ | S | 📋 |
| G4 | **Versione inglese (i18n)** per la portata. | ⭐⭐ | M | 📋 |
| G5 | **Meta/OpenGraph** per anteprime social + **PWA/offline** (⚠️ vincolo inline). | ⭐ | S–M | 📋 |
| G6 | **Accessibilità** (focus tastiera, ARIA, contrasti). | ⭐⭐ | S–M | 📋 |

---

## Ordine di lavoro

Si parte da **S1+S2 (mini-canvas interattivi: trascinamento + punto P dimostrativo)** perché è la parte dell'apertura che convince meno. Poi si prosegue una feature alla volta, aggiornando lo Stato qui sopra man mano.
