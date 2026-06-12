# Interattività dimostrativa + approfondimenti (Minkowski/Gołąb) — design

**Data:** 2026-06-12
**File:** `index.html` (single-file inline; estetica Brutalista invariata; `ConicMath` invariato).
**Origine:** richieste utente + brainstorming. Decisioni approvate.

## 0. Obiettivo
Rendere le sezioni più *dimostrative* (canvas interattivi guidati da bottoni) e chiudere con un approfondimento (geometria di Minkowski + teorema di Gołąb). 11 interventi su `index.html`.

## 1. §1 — Canvas dimostrativo unico «cammini infiniti ↔ disuguaglianza triangolare»
- **Sostituisce** la figura statica L₂/L₁ nella `.section-figure` (resta **un solo** quadrato interattivo, sticky in alto a destra). Nuovo canvas `me-fondamenti`.
- **Modalità default «cammini»**: due punti A·B trascinabili; disegna **K scalette monotòne distinte** A→B, **tutte di lunghezza d₁ uguale**; mostra il **numero di cammini minimi** = C(|Δx|+|Δy|, |Δx|); la **diagonale euclidea** come "fantasma" tratteggiato (più corto), con lettura `d₁ = N · d₂ ≈ M`. Messaggio: "tante strade, stessa lunghezza".
- **Bottone «▸ Disuguaglianza triangolare»** (sotto il canvas) → modalità «triangolo»: tre punti A·B·C trascinabili; mostra i due cammini-taxi A→B→C e il diretto A→C; lettura `d₁(A,B)+d₁(B,C) = X ≥ d₁(A,C) = Y ✓`, sempre verde, con evidenza dell'uguaglianza quando B sta su un cammino monotòno tra A e C.
- **Bottone «Ripristina»** → torna alla modalità «cammini» coi punti di default.
- Riusa le primitive `MiniEngine` (transform/grid/segment/point) + pointer-drag; è un widget a sé (non un mini-engine di conica). Rispetta `prefers-reduced-motion` (nessuna animazione; è interattivo, non animato in loop).

## 2. Hero — taxi stilizzato fra i quadranti
- **Taxi disegnato** (no emoji): forma blocky in stile Brutalista (corpo + tetto + 2 ruote + banda a scacchi/insegna), inchiostro con accento pomodoro. Disegnato su canvas nel loop dell'hero.
- Percorre in **loop** una "L" a gradini (oriz. poi vert., o scaletta) attraversando i quadranti; accanto, la **diagonale "fantasma"** (tratteggiata) che mostra la scorciatoia vietata.
- **Griglia rallentata**: ridurre l'incremento di scroll (`offsetX/Y`) da 0.5 a ~0.18 così il movimento c'è ma non distrae.
- **`prefers-reduced-motion`**: frame statico (taxi fermo a metà L, griglia ferma), nessun loop.

## 3. §2 — riquadro π leggibile
- Il `.formula-display` del blocco π (§2) sfora/tronca. Sistemarlo: accorciare/mandare a capo le righe lunghe (o `white-space: pre-wrap` + dimensione adattiva) così **si legge tutto** senza scroll orizzontale, mantenendo l'allineamento del calcolo `8R/2R=4`.

## 4. Bottoni «casi + regioni + Ripristina» in TUTTE le sezioni (§2–§5)
Meccanismo generico aggiunto a `MiniEngine.create`: esporre `setCase(params)`, `toggleRegioni(bool)`, `reset()` (memorizza i `defaultParams`). Sotto ogni mini-canvas, una **barra di bottoni** (stile Brutalista, riusa `.mini-engine-hint`/nuovo `.mini-cases`):
- **§2 Circonferenza**: «Mostra le 4 regioni» (overlay rette critiche `x=x꜀`,`y=y꜀` + 4 quadranti etichettati) · «Ripristina».
- **§3 Ellisse**: «Ottagono (fuochi obliqui)» · «Esagono (fuochi allineati)» · «Caso degenere 2a=d₀» · «Mostra le 9 regioni» · «Ripristina». (I parametri di ciascun caso impostati via `setCase`; verificati con `ConicMath`.)
- **§4 Iperbole**: «Fuochi orizzontali (segmenti)» · «Fuochi obliqui» · «Mostra regioni» · «Ripristina».
- **§5 Parabola**: «Mostra Formula Master sul piano» (vedi §5 sotto) · «Ripristina».
- **Overlay regioni (mini)**: rette critiche tratteggiate inchiostro + ombreggiatura tenue pomodoro della regione + etichette (R_I.. / R_ij), disegnato dalla mini-engine (logica leggera, non quella di GraphCalc).

## 5. §5 — Formula Master della parabola sul piano
- Bottone «Mostra Formula Master» nel mini-canvas parabola: **etichetta i 4 pezzi** sul piano — 2 semirette verticali (`x = x_F ± p`), 2 rami obliqui (`x = ±2y …`), e il **vertice** `y_V=(y_F+k)/2` — con le equazioni della formula master accanto ai segmenti corrispondenti. «Ripristina» rimuove le etichette.

## 6. Punto P fuori-vista ≤ 1s in TUTTI i canvas (generale)
- Dove P (punto dimostrativo animato) esce dal riquadro (iperbole, parabola, e qualunque curva aperta): **limitare il tratto su cui scorre P al riquadro visibile** (clip della polilinea del modello al rettangolo mondo visibile, ~±6.2u o ai bordi canvas) così P resta in vista (uscita ≤1s). Applicato in `_miniModel`/`_drawProofPoint` per i tipi a path aperto (hyperbola, parabola).

## 7. Calcolatore grafico — due fix
- **Bug «secondo fuoco sparisce»**: posizionando il 2° fuoco di ellisse/iperbole, i punti pending **non devono sparire** prima della creazione dell'oggetto. Indagare il flusso `_placePendingPoint`→dialog valore→`_createObject`/render; correggere così che entrambi i fuochi restino visibili fino alla conferma.
- **Tooltip info che escono dalla sidebar**: `.csb-info-btn:hover::after`/`.csb-info-icon:hover::after` sono clippati dalla sidebar (`overflow-y:auto`) → metà coperti. Farli **uscire dalla sidebar** (es. `position:fixed`/portale visivo, o aprirli verso destra sopra il canvas con z-index alto), così sono interamente leggibili.

## 8. Chiusura — nuova sezione «Oltre il taxi: Minkowski e Gołąb»
- Nuova `<section>` **prima di «In sintesi»** (diventa §6; «In sintesi» §7; vestibolo calcolatore §8 — aggiornare TOC, chip §, numerazione).
- Contenuti:
  - **Geometria di Minkowski**: famiglia delle distanze Lₚ; i "cerchi" unitari cambiano forma con p (p=1 rombo/taxi, p=2 cerchio, p=∞ quadrato/scacchiera). Piccolo visual statico delle palle unitarie p=1, 2, ∞ (SVG inline, stile coerente).
  - **Teorema di Gołąb (Stanisław Gołąb)**: in qualunque geometria definita da una norma, il "π" (perimetro/diametro del cerchio unitario) è **intrappolato in 3 ≤ π ≤ 4**. Minimo **3** col cerchio a **esagono regolare**; massimo **4** col cerchio a **quadrato** (= il taxi). Punchline: «il nostro π=4 non è una stranezza: è l'**estremo massimo possibile** in ogni universo geometrico coerente».
  - Callout o riga di richiamo in «In sintesi» che rimanda a Gołąb.

## 9. Architettura / componenti
- **MiniEngine**: esteso con `setCase/toggleRegioni/reset` + overlay regioni leggero + clip del path P al visibile; il widget §1 è un piccolo modulo dedicato (può vivere accanto a MiniEngine, riusando le primitive). `ConicMath` **invariato**.
- **Hero IIFE**: aggiunta del disegno taxi + diagonale fantasma; rallentamento scroll; guardia reduced-motion già presente, estesa al taxi.
- **GraphCalc**: fix pending-points (2° fuoco) + tooltip fuori-sidebar.
- **Markup/CSS**: nuovo canvas §1 + barre bottoni casi (`.mini-cases`), nuova sezione Minkowski/Gołąb, rinumerazione §, TOC aggiornato; tutto Brutalista (osso/inchiostro/pomodoro, Bricolage+Mono).

## 10. Verifica
- `node tools/test-conicmath.mjs` verde; `node --check` sugli script estratti.
- I parametri dei «casi» (ottagono/esagono/degenere ellisse; fuochi orizzontali/obliqui iperbole) **verificati con `ConicMath`** (numero vertici/forma attesi) prima di cablarli ai bottoni.
- Screenshot headless: §1 widget (2 modalità), hero col taxi, box π leggibile, bottoni casi+regioni in §2–§5, formula master parabola, sezione Gołąb; calcolatore: 2° fuoco visibile, tooltip non coperto; P che non sparisce nei canvas.
- `prefers-reduced-motion`: hero statico; canvas non animati in loop dove non serve.

## 11. Vincoli
- Single-file inline; nessuna libreria nuova; `ConicMath` firme/logica invariate; estetica/palette invariate.
- Niente regressioni su calcolatore (creazione oggetti, regioni, sonda) e mini-canvas esistenti.
