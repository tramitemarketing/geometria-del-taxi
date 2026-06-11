# Pulizia tecnica (P4) — design

**Data:** 2026-06-11
**File:** `index.html`. **Vincolo chiave:** zero impatto visivo/funzionale; `ConicMath` invariato.

## 0. Ambito
Solo pulizia interna, nessun cambiamento percepibile dall'utente.

## 1. Codice morto da rimuovere (verificato con grep)
- **CSS `.hero-blob`** (`:318`) + i due `<div class="hero-blob …">` (`:737-738`).
- **CSS `.csb-mode-row/.csb-mode-btn/:hover/.active`** (`:606-609`) — nessun markup li usa.
- **CSS `body.light-mode`** (`:36`) + l'`IntersectionObserver` che fa `classList.toggle('light-mode', …)` (`:3693` e contorno) — la classe non cambia più nulla (il body è sempre osso). Rimuovere anche `transition: background-color` dal `body` (il bg non cambia mai).
- **`setMode`**: funzione (`:2728`) + voce nell'export pubblico (`:3672`). Mai chiamata.
- **Ramo morto hover** in `_drawObject`: `state.mode === 'select'` (`:3310`) è sempre falso (mode ∈ {normal, point}); rimuovere `isHovered` e i due blocchi `if(isHovered){…}` (glow + tooltip nome). **NON** toccare `_isNearObject` (usato vivo in `:2385/2490/2546`).

## 2. De-duplicazione
- Estrarre `_drawEquationBox(ctx, lines, w, h, ctrXHint, ctrYHint)` con il blocco identico ripetuto in `_drawAsseRegions` (`:~3470`) e `_drawCirconferenzaRegions` (`:~3545`): font/misura, `boxW/boxH`, clamp del centro, `roundRect`+fill/stroke (osso `rgba(233,229,220,0.97)`, bordo `#0A0A0A`), array colori `['rgba(10,10,10,0.5)','rgba(10,10,10,0.9)','#FF4A1C','#0A0A0A']`, loop righe.
- Differenza fra i due call-site = solo il centro suggerito: asse usa `((max(ca.x,0)+min(cb.x,w))/2, (max(ca.y,0)+min(cb.y,h))/2)`; circonferenza usa `(w/2, h/2)`. Passare come `ctrXHint/ctrYHint`. Comportamento identico.

## 3. Performance
- **Throttle `_draw()` su mousemove:** `_onMouseMove` (`:2510`) ridisegna a ogni evento. Introdurre `_scheduleDraw()` con coalescenza `requestAnimationFrame` (flag `_drawPending`) e usarlo al posto del `_draw()` diretto **nel solo path di mousemove** (gli altri `_draw()` restano sincroni). Nessun cambiamento percepibile, meno redraw.
- **Hero canvas:** l'ottimizzazione "salta il redraw del cursor layer" NON è valida (la griglia scorre ogni frame ⇒ serve ridisegnare); **fuori scope**, lasciato com'è.

## 4. Verifica
- `node tools/test-conicmath.mjs` verde; `node --check` ok.
- Visiva (screenshot): hero invariato; calcolatore con overlay "9 regioni" su asse e circonferenza → box equazioni identico a prima (osso + bordo inchiostro, 4 righe). Nessuna regressione su creazione oggetti, hover cursore, selezione.

## 5. Vincoli
- Single-file inline; nessun cambiamento di comportamento osservabile; `_isNearObject` preservato; export pubblico cambia solo per la rimozione di `setMode`.
