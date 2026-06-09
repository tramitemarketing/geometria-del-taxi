# Mini-canvas interattivi — design

**Data:** 2026-06-09
**File:** `index.html` (unico file; solo `<script>`, niente librerie/file esterni).
**Backlog:** voci S1 + S2 (e T1/T2) di `docs/ROADMAP_MIGLIORAMENTI.md`.

## 0. Obiettivo

Rendere "vivi" i 4 mini-canvas delle sezioni didattiche (circonferenza, ellisse, iperbole, parabola), oggi pilotati solo da slider. Due aggiunte:
1. **Trascinamento diretto** di fuochi/centro dentro il canvas (oltre agli slider esistenti).
2. **Punto P dimostrativo**: un punto che scorre lungo la curva mostrando i percorsi L₁ "a scaletta" verso i fuochi e l'**invariante costante** (somma/differenza/distanza), che è la dimostrazione visiva della definizione del luogo.

È tutto **additivo**: slider esistenti, vista fissa ±6 e layout invariati. Nessun pan/zoom (resta compito del calcolatore).

## 1. Contesto del codice

`MiniEngine.create(canvasId, conicType, defaultParams, outputEl)` (≈ righe 1216–1331):
- vista fissa: `makeTransform({width:size,height:size}, size/12, 0, 0)` → ±6, origine al centro; `t.toCanvas`/`t.toWorld` disponibili;
- `draw()` one-shot: pulisce, `drawGrid`, poi per `conicType` disegna conica + punti fuochi + `outputEl.textContent`;
- `updateParam(key,val)` aggiorna `params` e ridisegna; gli slider HTML chiamano `meX.updateParam(...)`;
- init lazy via `IntersectionObserver` (`start()` → `resize()`+`draw()`); **nessun loop rAF** attivo oggi; **nessuna gestione mouse**.

Forma delle coniche già disponibile da `ConicMath`:
- circonferenza: `circleVertices` → `{VN,VE,VS,VW}`;
- ellisse: `ellipseVertices(...)` → poligono ordinato (o `null`);
- iperbole: `hyperbolaVertices(x1,y1,x2,y2,twoA,bounds)` → `{branch1:[{from,to}], branch2:[{from,to}]}`;
- parabola: `parabolaSegments(xF,yF,k,yExtent)` → 4 segmenti `{from,to}`.

## 2. Helper puri (in `ConicMath`, testabili con l'harness Node)

Tutte le taxi-coniche sono **poligonali**, quindi P viaggia per lunghezza d'arco su una polilinea.

- `polylineFromSegments(segments)` → `[[{x,y},…], …]`
  Concatena `[{from,to}]` in una o più **polilinee connesse** ordinate. Algoritmo: quantizza gli estremi (eps 1e-6) come chiavi, costruisce adiacenza; per ogni componente parte da un estremo di grado 1 (curva aperta) o da un nodo qualsiasi (chiusa), e cammina seguendo i segmenti non ancora usati. Usato per iperbole (un ramo) e parabola.
- `polylineLength(pts, closed)` → numero (somma delle lunghezze euclidee dei lati; se `closed`, include il lato di chiusura).
- `pointAtArcFraction(pts, f, closed)` → `{x,y}`
  Punto alla frazione `f∈[0,1]` della lunghezza d'arco totale. `f` viene normalizzato (wrap se `closed`). t=0 → `pts[0]`.
- `l1Corner(P, F)` → `{x:F.x, y:P.y}` (angolo del percorso L₁ orizzontale-poi-verticale da P a F).
- `taxiDist(a, b)` → `|a.x-b.x| + |a.y-b.y|`.

Le firme pubbliche esistenti di `ConicMath` restano invariate; le nuove funzioni si aggiungono al `return`. La robustezza del drag (§4) usa il revert-se-invalido, quindi non serve clampare 2a qui.

## 3. Per-conica: handle, percorso di P, invariante

| Conica | Handle trascinabili → param | Percorso di P (polilinea, chiusura) | Misure da P | Invariante mostrato |
|---|---|---|---|---|
| circonferenza | centro → `xc,yc` | rombo `[VN,VE,VS,VW]`, chiuso | C | `d₁(P,C) = R ✓` |
| ellisse | F₁→`x1,y1`, F₂→`x2,y2` | `ellipseVertices`, chiuso | F₁, F₂ | `d₁(P,F₁)+d₁(P,F₂) = 2a ✓` |
| iperbole | F₁→`x1,y1`, F₂→`x2,y2` | `branch1` → `polylineFromSegments` → polilinea più lunga, aperta (ping-pong) | F₁, F₂ | `|d₁(P,F₁)−d₁(P,F₂)| = 2a ✓` |
| parabola | fuoco→`xF,yF` | `parabolaSegments` → `polylineFromSegments` (1 polilinea), aperta (ping-pong) | F + direttrice `y=k` | `d₁(P,F) = \|y_P−k\| ✓` |

- Bounds iperbole per la vista mini: box ±8 (margine oltre il ±6 visibile) passato a `hyperbolaVertices`.
- Parabola: oltre alla scaletta P→F, si disegna il segmento verticale P→(x_P, k) (distanza dalla direttrice).
- La direttrice della parabola resta controllata dallo slider `p` (non è un handle in questa versione).

## 4. Interazione (pointer events: mouse + touch)

In `create()` si aggiungono listener `pointerdown/move/up/leave` sul canvas.

- **Hit-test handle**: per ogni handle, `t.toCanvas(world)`; se la distanza dal puntatore < 12px (CSS px) → preso. Cursore `grab` su hover di un handle, `grabbing` durante il drag.
- **Drag handle**: `pointermove` imposta il/i parametro/i a `t.toWorld(puntatore)` (drag libero, senza snap), poi `draw()`. **Robustezza:** se lo spostamento rende la conica invalida (`ellipseVertices`/`hyperbolaVertices` → `null`), si **annulla quel passo** (ripristino dei param precedenti), così la curva non sparisce mai e 2a/slider non vanno toccati.
- **Hit-test P**: se non si è preso un handle e il puntatore è < 12px da P → si afferra P; il drag imposta la frazione `pT` al punto della polilinea più vicino al puntatore (proiezione sul segmento più vicino).
- **Touch**: i pointer events coprono il touch; `event.preventDefault()` (e `setPointerCapture`) solo quando un drag è effettivamente iniziato su un handle o su P, così lo scroll della pagina resta possibile toccando il resto del canvas.

## 5. Animazione del punto P

- Loop `requestAnimationFrame` in `create()`: quando attivo e non in pausa, avanza `pT` di `speed*dt` (giro completo ≈ 7 s) e `draw()`. Per le curve aperte `pT` fa **ping-pong** (0→1→0).
- **Pausa** quando: il puntatore è dentro il canvas (per ispezionare), un drag è in corso, il canvas è fuori schermo (riuso dell'`IntersectionObserver`), o la tab è nascosta.
- **`prefers-reduced-motion: reduce`**: niente auto-animazione; P resta fermo a `pT=0.12` ma è comunque afferrabile/trascinabile.
- Il loop parte all'`IntersectionObserver` (come l'init lazy) e si ferma fuori schermo, per non sprecare CPU.

## 6. Disegno aggiunto (in `draw()`, dopo la conica)

1. Calcola P con `pointAtArcFraction(path, pT, closed)`.
2. Per ogni fuoco: scaletta L₁ `P → l1Corner(P,F) → F`, linea sottile semitrasparente, **color-coded** (F₁ freddo, es. teal; F₂ caldo, es. rosa). Parabola: anche P→(x_P,k).
3. Disegna P come pallino distinto (bianco con alone).
4. `outputEl` mostra l'**invariante live** (stringa della tabella §3, con valore numerico e `✓`); l'info parametrica attuale (d₀/k, ecc.) può restare come prefisso compatto se ci sta.

## 7. Test e verifica

**Unit (harness Node, helper puri):**
- `polylineFromSegments`: su `parabolaSegments` → 1 polilinea connessa (estremi consecutivi coincidono, nessun salto); su un ramo d'iperbole → 1 polilinea; conta correttamente estremi/componenti.
- `pointAtArcFraction`: `f=0`→primo punto; lunghezze coerenti; punto a metà arco corretto su una polilinea nota.
- **Invariante costante** (test forte e trasversale): campiona P a molte frazioni lungo il percorso di ciascuna conica e verifica entro 1e-6:
  - ellisse `d₁(P,F₁)+d₁(P,F₂) ≈ 2a`;
  - iperbole `|d₁(P,F₁)−d₁(P,F₂)| ≈ 2a` sul ramo;
  - parabola `d₁(P,F) ≈ |y_P−k|`;
  - circonferenza `d₁(P,C) ≈ R`.
- Tutti i test ConicMath esistenti continuano a passare.

**Verifica visiva (browser):** trascinamento di fuochi/centro fluido su mouse e touch; la curva non sparisce mai ai bordi di validità; P si anima, si ferma su hover, è afferrabile; scalette e invariante corretti e costanti; reduced-motion rispettato; nessun errore in console; performance fluide (loop in pausa fuori schermo).

## 8. Fuori scope

- Pan/zoom nei mini-canvas (resta nel calcolatore).
- Overlay "9 regioni" nei mini (è la voce S5, separata).
- Direttrice della parabola come handle trascinabile (solo slider per ora).
- Qualsiasi modifica al calcolatore grafico (questa feature riguarda solo i mini-canvas e `ConicMath`).

## 9. Vincoli

- Tutto inline in `index.html`, nessuna libreria/file esterno.
- Slider esistenti e firme pubbliche di `ConicMath` invariati.
- Coordinate in spazio mondo; l'inversione y la fa già `makeTransform`.
- Pointer events per coprire mouse e touch; gestione `prefers-reduced-motion`.
