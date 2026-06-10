# Scrollytelling ellisse (S6) — design

**Data:** 2026-06-10
**File:** `index.html` (unico file; solo `<script>` + eventuali ritocchi CSS inline).
**Backlog:** voce S6 di `docs/ROADMAP_MIGLIORAMENTI.md`.
**Nota:** solo progettazione; implementazione in blocco con le altre feature.

## 0. Obiettivo

Nella sezione **ellisse**, mentre l'utente scorre, il mini-canvas (figura già sticky) **costruisce il luogo per tappe**: rette critiche → 9 regioni → scioglimento dei moduli (segmenti) → curva completa, con una didascalia per tappa. È il showcase del metodo delle 9 regioni.

## 1. Contesto del codice

- Layout sezioni accademiche: `.section-split` = flex con `.section-text` (65%) e **`.section-figure` (35%) già `position: sticky; top: 2rem`** (riga 61–65). A `max-width` mobile la figura diventa `position: static` (riga 135). Quindi su desktop la figura resta fissa mentre il testo scorre — base ideale per lo scrollytelling, **senza modifiche di layout**.
- Sezione ellisse `#ellisse` (≈ riga 687) con il mini-canvas `me-ellipse` creato da `MiniEngine.create('me-ellipse','ellipse',{x1:-2,y1:-1,x2:2,y2:1,twoA:8}, out, opts)`.
- Il mini-engine (`MiniEngine.create`) ha `params`, `draw()` per `conicType`, un loop rAF che anima il punto P (con pausa-su-hover e rispetto di `prefers-reduced-motion`), e (dalle feature in coda) eventuali toggle. `ConicMath.ellipseVertices` (poligono ordinato) e `ConicMath.pointAtArcFraction` (punto a frazione d'arco) sono già disponibili e testati.

## 2. Meccanismo scroll → stadio

- Modulo di scroll (rAF-throttlato): su `scroll`/`resize`, se la sezione `#ellisse` è vicina al viewport, calcola
  `p = clamp( -rect.top / (rect.height - window.innerHeight), 0, 1 )` (`rect = #ellisse.getBoundingClientRect()`), e chiama `meEllipse.setScrollStage(p)`.
- Attivo solo quando la sezione interseca il viewport (un `IntersectionObserver` su `#ellisse` abilita/disabilita il calcolo, per performance).
- **Disattivazione (fallback):** se la figura non è sticky (mobile — si rileva via `window.matchMedia` sul breakpoint del CSS, o controllando `getComputedStyle(figure).position !== 'sticky'`) **oppure** `prefers-reduced-motion: reduce`, il modulo non guida lo stadio e `meEllipse` resta a `scrollStage = 1` (curva completa).

## 3. Modalità "scrolly" del mini-ellisse

- `MiniEngine.create` riceve `opts.scrolly` (bool; true solo per `meEllipse`). Stato interno `scrollStage` (default **1** = costruzione completa). Metodo pubblico `setScrollStage(p)` che imposta `scrollStage = p` e ridisegna.
- Nel blocco di disegno dell'ellisse, **se `opts.scrolly && scrollStage < 1`**, disegna la **costruzione a tappe** (vedi §4) invece della sola curva; altrimenti il rendering normale (curva + P + interazione).
- Quando `scrollStage < 1`, il punto **P** e l'interazione sono **sospesi** (la curva non è "finita"); a `scrollStage = 1` riprendono.

## 4. Tappe (in funzione di `p = scrollStage`)

Vista fissa ±6 come gli altri mini. Sempre: i due **fuochi**.
1. **`p ∈ [0, 0.2]`** — **rette critiche** `x=x₁, x=x₂, y=y₁, y=y₂` (tratteggiate; opacità in dissolvenza `0→1` su questo intervallo). Didascalia: *"le rette critiche"*.
2. **`p ∈ [0.2, 0.45]`** — + **9 regioni**: tint tenue dei 9 rettangoli formati dalle 4 rette critiche entro la vista (opacità in dissolvenza). Didascalia: *"dividono il piano in 9 regioni"*.
3. **`p ∈ [0.45, 0.85]`** — + **poligono progressivo**: si rivela una frazione crescente del perimetro del poligono (`frazione = clamp((p-0.45)/0.4, 0, 1)`), disegnando la polilinea parziale lungo `ConicMath.ellipseVertices(...)` (uso di `pointAtArcFraction`/lunghezza d'arco per il punto finale parziale). Didascalia: *"in ogni regione i moduli si sciolgono → segmenti lineari"*.
4. **`p ∈ [0.85, 1]`** — **poligono chiuso completo** (curva), e a `p ≥ ~0.95` il punto **P** riparte. Didascalia: *"la curva: un poligono convesso"*.
- La **didascalia** è disegnata sul canvas (riga di testo in alto, monospace, colore tenue), scelta in base alla tappa corrente.

## 5. Architettura

- **`MiniEngine.create`:** nuovo `opts.scrolly`; stato `scrollStage`; metodo `setScrollStage(p)`; ramo "costruzione a tappe" nel disegno dell'ellisse (helper interno `_drawEllipseBuild(ctx,t,params,stage)`), riusando `ConicMath.ellipseVertices` e `pointAtArcFraction`. P/interazione sospesi finché `scrollStage<1`.
- **Modulo scroll:** funzione di bootstrap (vicino alle `MiniEngine.create`) che osserva `#ellisse`, calcola `p` su scroll (rAF-throttlato) e chiama `meEllipse.setScrollStage(p)`; rispetta i fallback (§2).
- **CSS:** nessun cambio strutturale (sticky già presente); al più una piccola regola se serve per la didascalia.
- Geometria riusata; nessuna nuova funzione in `ConicMath`.

## 6. Verifica

Quasi tutto rendering/DOM → verifica **visiva**:
- scorrendo `#ellisse` su desktop, la costruzione avanza per tappe con le didascalie (in cima solo rette critiche; a metà le 9 regioni e il poligono che si forma; in fondo la curva con P);
- la figura resta sticky durante lo scroll della sezione;
- su **mobile** (figura static) e con **reduced-motion**: si vede direttamente la **curva completa** interattiva, nessun build;
- oltre la sezione, il mini-ellisse è pienamente interattivo (drag/slider/P);
- nessuna regressione sulle altre sezioni/mini-canvas; nessun errore in console.
- `ConicMath`/harness invariati (la logica riusa funzioni già testate).

## 7. Fuori scope

- Scrollytelling sulle altre sezioni (cerchio/iperbole/parabola): estensione futura.
- Layout scrollytelling dedicato (sticky a tutto schermo, step testuali): non necessario (la figura è già sticky).
- Modifiche alla matematica.

## 8. Vincoli

- Solo sezione ellisse; nessuna modifica di layout (sticky esistente).
- `MiniEngine.create` retro-compatibile (`opts.scrolly` opzionale); firme pubbliche di `ConicMath` invariate.
- `prefers-reduced-motion` e mobile gestiti come fallback alla curva completa.
- Convive con le altre feature dei mini-canvas (anima/euclidea/drag), che agiscono a costruzione completa (`scrollStage=1`).
