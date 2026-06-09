# Hero più vivo — design

**Data:** 2026-06-09
**File:** `index.html` (unico file; solo `<script>`/markup/CSS inline, niente librerie).
**Backlog:** voci H1 + H2 di `docs/ROADMAP_MIGLIORAMENTI.md`.
**Nota:** questa è solo progettazione; l'implementazione sarà fatta in blocco con le altre feature.

## 0. Obiettivo

Rendere l'Hero non solo "atmosfera" ma una **dimostrazione viva della metrica taxi**, legata al titolo *"Quando la retta più breve non è la diagonale"*. Due aggiunte, sopra lo sfondo attuale:
1. **Cursore-rombo (H2):** la regione di griglia illuminata attorno al cursore diventa un **rombo** (la taxi-circonferenza) invece di un cerchio.
2. **Taxi vs diagonale (H1):** due estremi A,B sul reticolo, la diagonale euclidea "fantasma", il percorso Manhattan a gradini, e un **taxi che lo percorre in loop**; A,B sono **trascinabili** e le distanze `d₁/d₂` si aggiornano live.

## 1. Contesto del codice

Sezione `#hero` (markup): due canvas a tutto schermo `#hero-grid-bg` (opacity 0.05) e `#hero-grid-cursor` (opacity 0.4), due `.hero-blob` (ambra/blu, CSS radial-gradient), e `.hero-content` (titolo, sottotitolo, bottone `#btn-hero-calc`).

IIFE `Hero` (≈ righe 1684–1754):
- `CELL = 40`; `animate()` incrementa `offsetX/Y += 0.5` (scorrimento diagonale) e ridisegna entrambe le griglie con `drawGrid(ctx,w,h,ox,oy)`;
- il layer cursore è la stessa griglia, rivelata da una **maschera CSS** `radial-gradient(300px circle at mouseX mouseY, black, transparent)` → cerchio luminoso morbido che segue il mouse;
- `onMouseMove` aggiorna `mouseX/mouseY`; `init()`, `start()`, `stop()`; loop rAF unico (`rafId`). Attualmente `animate()` gira sempre (nessuna pausa fuori schermo).

## 2. Cursore-rombo (H2)

Sostituire la maschera CSS circolare con un **rivelo a rombo su canvas** sul layer `#hero-grid-cursor`:
- in `animate()`: disegnare la griglia luminosa, poi `ctx.globalCompositeOperation = 'destination-in'` e riempire il **rombo** (taxi-circonferenza centrata su `(mouseX,mouseY)`, "raggio" `R` in px: vertici a `(mx±R, my)` e `(mx, my±R)`) con un **gradiente radiale** (alpha ~1 al centro → ~0.15 al bordo) così il rombo ha bordo **morbido**; poi `globalCompositeOperation = 'source-over'`. Rimuovere le due righe `style.maskImage/webkitMaskImage`.
- sopra, tracciare un **contorno sottile del rombo** (stroke tenue, eventuale lieve glow) per renderlo leggibile come forma.
- `R` **pulsa** dolcemente: `R = R0 + amp*sin(phasePulse)` (es. `R0≈150`, `amp≈18`).
- Quando il cursore è fuori dall'hero (`mouseX < 0`), nessun rivelo (come oggi con `-9999`).

Messaggio implicito: l'insieme dei punti entro distanza taxi `R` dal cursore è un rombo.

## 3. Taxi vs diagonale (H1)

Nuovo canvas `#hero-taxi` a tutto schermo, **z-index sopra le griglie e i blob, sotto `.hero-content`**, `pointer-events:auto`.

**Stato:** due punti `A`, `B` in coordinate schermo, **agganciati al reticolo** (multipli di `CELL=40`). Default responsive (ricalcolato finché l'utente non trascina): una L ben visibile nella **fascia medio-bassa** dell'hero, lontana dal titolo, es.
```
cx = round(w/2 / CELL)*CELL ; baseY = round(h*0.72 / CELL)*CELL
A = { x: cx - 3*CELL, y: baseY }
B = { x: cx + 2*CELL, y: baseY - 3*CELL }
```
Clamp di A,B entro margini dell'hero.

**Disegno (ogni frame):**
- **Diagonale euclidea** `A→B`: linea **tratteggiata** tenue ("fantasma"), etichetta `d₂ ≈ {hypot(dx,dy)/CELL}` (in unità di griglia, 1 decimale).
- **Percorso Manhattan**: `A → corner → B` con `corner = {x:B.x, y:A.y}` (orizzontale-poi-verticale = `ConicMath.l1Corner(A,B)`), tratto **evidenziato** (colore caldo + lieve glow), etichetta `d₁ = {(|dx|+|dy|)/CELL}` (intero) vicino al corner.
- **Taxi**: pallino luminoso che avanza lungo il percorso L (per lunghezza d'arco) in **loop**, con **micro-pausa** agli estremi.
- **Handle** A,B: piccoli cerchi pieni; cursore `grab`/`grabbing` su hover/drag (mouse).

**Interazione (pointer events, mouse+touch):**
- `pointerdown` entro ~16px da A o da B → inizia drag (snap continuo al reticolo, clamp ai margini); `pointermove` aggiorna il punto e ridisegna; `pointerup/cancel` termina.
- Durante il drag il **loop del taxi si mette in pausa**; riprende al rilascio.
- **Scroll mobile preservato:** il canvas taxi NON usa `touch-action:none` globale (bloccherebbe lo scroll dell'hero a tutto schermo). Si lascia il `touch-action` di default; su `pointerdown` che cade su un handle si fa `setPointerCapture` + `preventDefault` (e si continua a `preventDefault` durante il drag), così lo scroll resta possibile ovunque tranne mentre si trascina un handle. Drag touch best-effort.
- `.hero-content` → `pointer-events:none` (titolo/sottotitolo trasparenti al puntatore); `#btn-hero-calc` → `pointer-events:auto`. Il canvas taxi è `pointer-events:auto`, z-index 1 (sopra le griglie/blob, sotto `.hero-content` z-index 2): così il drag di A/B funziona anche nell'area "sotto" il titolo, e il bottone resta cliccabile.

## 4. Ciclo di vita & performance

- **Un solo loop rAF** (quello esistente di `Hero`), che ora avanza anche la fase del taxi e il `phasePulse`, e disegna il layer taxi + il rombo del cursore.
- **Pausa fuori schermo:** aggiungere un `IntersectionObserver` su `#hero` che fa `start()/stop()` del loop (oggi gira sempre).
- **`prefers-reduced-motion: reduce`:** non avanzare scorrimento griglia, fase taxi e pulse (scena **statica**), ma disegnare tutto e mantenere il **drag** di A/B attivo.
- Tutti i canvas si ridimensionano su `resize` (come già `resizeCanvases`); il default di A/B si ricalcola al resize solo se non sono stati trascinati.

## 5. Architettura

- Estendere l'IIFE `Hero`: aggiungere riferimento `#hero-taxi` + ctx; stato `A,B,taxiPhase,pulsePhase,dragging,reduced,visible`; funzioni `drawTaxi()`, `drawCursorRombo()`, handler pointer; integrare gli avanzamenti in `animate()`.
- Markup: aggiungere `<canvas id="hero-taxi" class="hero-grid-layer">` dopo `#hero-grid-cursor`; CSS: regola di z-index/pointer-events per il nuovo layer e per `.hero-content` (titolo/sottotitolo `pointer-events:none`, bottone `auto`).
- **Geometria riusata** (niente nuove funzioni in `ConicMath`): `ConicMath.taxiDist(A,B)` per `d₁`, `ConicMath.l1Corner(A,B)` per il corner, `Math.hypot` per `d₂`. La posizione del taxi lungo la L riusa lo stesso schema di lunghezza d'arco su 2 segmenti (logica locale al layer hero, in px).

## 6. Test e verifica

- La feature è quasi interamente **rendering visivo**; la geometria si appoggia a helper di `ConicMath` già testati (`taxiDist`, `l1Corner`). Nessuna nuova funzione pura → nessun nuovo unit test necessario; al più un assert banale già coperto.
- **Verifica visiva (browser):** cursore che illumina un rombo morbido pulsante; taxi che percorre la L in loop con diagonale fantasma e `d₁/d₂` corretti (in unità di griglia); A,B trascinabili (mouse+touch) con snap al reticolo e aggiornamento live; drag funzionante anche sotto il titolo, bottone cliccabile; `reduced-motion` ferma i movimenti ma lascia il drag; animazione in pausa fuori schermo; nessun errore in console; layout corretto su desktop e mobile.

## 7. Fuori scope

- Modifiche al testo del titolo/sottotitolo o al bottone.
- Altre voci hero (H3 titolo animato, H4 playground separato, H5 scroll cue): voci distinte della roadmap.
- Modifiche a mini-canvas, calcolatore, `ConicMath`.

## 8. Vincoli

- Tutto inline in `index.html`; nessuna libreria/file esterno.
- Mantenere lo sfondo attuale (griglia che scorre + blob) e il contenuto testuale.
- Pointer events per mouse+touch; `prefers-reduced-motion` rispettato.
