# Mini-canvas: metamorfosi (S3) + euclidea fantasma (S4) — design

**Data:** 2026-06-10
**File:** `index.html` (unico file; solo `<script>` + i pulsanti nei controlli dei mini-canvas).
**Backlog:** voci S3 (animazione metamorfosi) e S4 (conica euclidea fantasma) di `docs/ROADMAP_MIGLIORAMENTI.md`.
**Nota:** solo progettazione; implementazione in blocco con le altre feature.

## 0. Obiettivo

Due aggiunte ai 4 mini-canvas didattici:
1. **Metamorfosi (S3):** un "▶ anima" che fa variare automaticamente il parametro principale, mostrando come la forma muta (ellisse: ottagono→esagono→rombo al crescere di 2a).
2. **Euclidea fantasma (S4):** un "👻 euclidea" che sovrappone, tenue e tratteggiata, la conica **euclidea** corrispondente — *"ecco perché la versione taxi è diversa"*.

## 1. Contesto del codice

- I 4 mini-canvas sono creati da `MiniEngine.create(canvasId, conicType, defaultParams, outputEl)` (istanze globali `meCircle`, `meEllipse`, `meHyperbola`, `meParabola`). La create tiene `params`, un `draw()` (per `conicType`), `updateParam(key,val)`, e un loop rAF che già anima il punto P (con pausa-su-hover e rispetto di `prefers-reduced-motion`).
- Controlli HTML: ogni sezione ha `.mini-engine-controls` con uno slider sul parametro principale e un `.mini-engine-output`. Esempio ellisse: `<input type="range" min="3" max="14" step="0.5" value="8" oninput="meEllipse.updateParam('twoA', this.value); this.nextElementSibling.textContent=this.value">`, output `#me-ellipse-out`. Analoghi: cerchio `R`, iperbole `2a`, parabola `p` (che fa `meParabola.updateParam('yF', val)`).
- `ConicMath` ha i generatori **taxi** (`circleVertices`, `ellipseVertices`, `hyperbolaVertices`, `parabolaSegments`) e gli helper `taxiDist`, `l1Corner`, `pointAtArcFraction`, ecc.

## 2. Generatori di coniche euclidee (S4) — in `ConicMath`, puri e testabili

Restituiscono polilinee campionate (array di `{x,y}`), o `null` se la conica euclidea non esiste.

- **`euclidEllipsePoints(x1,y1,x2,y2,twoA,n=96)`** → poligono chiuso dell'ellisse euclidea con fuochi F₁,F₂ e somma costante 2a.
  Centro `O=((x1+x2)/2,(y1+y2)/2)`; `c_e=|F₂−F₁|/2`; `a_e=twoA/2`; se `a_e≤c_e+ε` → `null`; `b_e=√(a_e²−c_e²)`; `θ=atan2(y2−y1,x2−x1)`. Per `t∈[0,2π)`: locale `(a_e cos t, b_e sin t)`, mondo `O + Rot(θ)·locale`.
- **`euclidHyperbolaPoints(x1,y1,x2,y2,twoA,n=64,ext=4)`** → `{branch1,branch2}` (polilinee aperte) dell'iperbole euclidea con `|differenza|=2a`.
  Stessi `O,c_e,θ`; `a_e=twoA/2`; se `c_e≤a_e+ε` → `null`; `b_e=√(c_e²−a_e²)`. Per `u∈[−ext,ext]`: ramo± locale `(±a_e cosh u, b_e sinh u)`, mondo `O + Rot(θ)·locale`.
- **`euclidParabolaPoints(xF,yF,a,b,c,n=64,ext=6)`** → polilinea aperta della parabola euclidea equidistante (euclidea) da F e dalla retta `a x+b y+c=0`.
  `nrm=√(a²+b²)`; `d=|a·xF+b·yF+c|/nrm` (dist. fuoco–direttrice); se `d<ε` → `null`. Verso del fuoco `s=sign(a·xF+b·yF+c)`; asse `u=s·(a,b)/nrm`; perpendicolare `tᵥ=(−u.y,u.x)`; vertice `V=F−(d/2)·u`. Per `yy∈[−ext,ext]`: locale `x=yy²/(2d)`, mondo `V + x·u + yy·tᵥ`.

Tutti aggiunti al `return` di `ConicMath` (firme esistenti invariate).

## 3. Euclidea fantasma — toggle "👻 euclidea" per mini-canvas

- Stato per istanza: `euclidOn` (default false). Pulsante "👻 euclidea" nei `.mini-engine-controls` → `meX.toggleEuclid()` (e toggle della classe `active` sul pulsante).
- In `draw()`, dopo la conica taxi e prima dei punti, se `euclidOn` disegna la **euclidea** come polilinea **tenue e tratteggiata** (es. `rgba(255,255,255,0.35)`, `lineWidth 1.5`, dash `[4,4]`):
  - cerchio: cerchio euclideo di raggio R centrato in (xc,yc) — campionato o `ctx.arc`;
  - ellisse: `euclidEllipsePoints(...)` (chiuso);
  - iperbole: `euclidHyperbolaPoints(...)` → entrambe le polilinee;
  - parabola: `euclidParabolaPoints(xF,yF,a,b,c,...)` con `a,b,c` dalla direttrice (orizzontale: `a=0,b=1,c=−k`).
- Se il generatore torna `null` (conica euclidea inesistente), non disegna nulla.

## 4. Metamorfosi — toggle "▶ anima" per mini-canvas (S3)

- `MiniEngine.create` riceve un'opzione `sweep:{key,min,max,sliderId}` (parametro principale + range dello slider + id dello slider per sincronizzarlo). Mappatura: cerchio `{key:'R',…}`, ellisse `{key:'twoA',min:3,max:14}`, iperbole `{key:'twoA',…}`, parabola `{key:'yF',…}` (slider `p`).
- Stato per istanza: `sweepOn` (false), `sweepDir` (+1). Pulsante "▶ anima" → `meX.toggleSweep()` (e classe `active`).
- Nel loop rAF, quando `sweepOn` e non in reduced-motion: avanza `params[key]` avanti-indietro (ping-pong) tra `min` e `max` a velocità moderata; aggiorna il **valore dello slider DOM** (`#sliderId.value`) e il `.mini-ctrl-value` adiacente + l'output; ridisegna. Il **punto P** continua a scorrere sulla forma che muta.
- Si ferma ripremendo "▶" oppure quando l'utente tocca lo slider (l'`oninput` esistente chiama anche `meX.stopSweep()`). Indipendente dalla pausa-su-hover.
- `prefers-reduced-motion`: lo sweep non parte (o resta statico); il pulsante resta ma senza auto-movimento.

## 5. Architettura

- **`ConicMath`:** + `euclidEllipsePoints`, `euclidHyperbolaPoints`, `euclidParabolaPoints` (puri). Una piccola util interna `_rot(θ)` o inline per la rotazione.
- **`MiniEngine.create`:** nuovo parametro opzionale `opts` (con `sweep`); stato `euclidOn/sweepOn/sweepDir`; metodi `toggleEuclid/toggleSweep/stopSweep`; integrazione in `draw()` (fantasma) e nel loop (sweep). Il punto P e il resto restano invariati.
- **HTML:** in ogni `.mini-engine-controls`, due pulsanti ("▶ anima", "👻 euclidea") che chiamano i metodi della rispettiva istanza e fanno toggle della classe `active`; lo slider esistente chiama anche `stopSweep()` nel suo `oninput`. La chiamata `MiniEngine.create(...)` di ciascuna sezione passa il `sweep` config.

## 6. Verifica

**Harness (Node):** i generatori euclidei soddisfano la proprietà definente su un campione di punti:
- ellisse: per ogni punto, `euclid(P,F₁)+euclid(P,F₂) ≈ 2a` (entro 1e-6); `euclidEllipsePoints` con `a_e≤c_e` → `null`;
- iperbole: `|euclid(P,F₁)−euclid(P,F₂)| ≈ 2a` su entrambi i rami; `c_e≤a_e` → `null`;
- parabola: `euclid(P,F) ≈ dist(P,retta)` (euclidea) entro 1e-6; `d≈0` → `null`.
- I test ConicMath esistenti continuano a passare.

**Visiva (browser):** "👻 euclidea" sovrappone la fantasma corretta su tutte e quattro le coniche (tratteggiata, tenue); "▶ anima" fa variare il parametro con slider/output sincronizzati e P che resta sulla forma che muta; entrambi i toggle si fermano correttamente; `reduced-motion` ferma lo sweep; nessun errore in console; le coniche taxi e il calcolatore invariati.

## 7. Fuori scope

- Modifiche al rendering taxi o alla matematica esistente.
- Euclidea fantasma nel calcolatore (solo mini-canvas).
- Sincronizzazione tra i due toggle (sono indipendenti).

## 8. Vincoli

- Tutto inline; nessuna libreria.
- Firme pubbliche di `ConicMath` invariate (solo aggiunte); `MiniEngine.create` retro-compatibile (nuovo `opts` opzionale).
- `prefers-reduced-motion` rispettato; nessuna regressione su mini-canvas/hero/calcolatore.
