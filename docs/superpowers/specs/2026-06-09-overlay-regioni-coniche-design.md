# Overlay "regioni" per tutte le coniche (T3) — design

**Data:** 2026-06-09
**File:** `index.html` (unico file; solo `<script>` + il toggle nel markup della sidebar, tutto inline).
**Backlog:** voce T3/C1 di `docs/ROADMAP_MIGLIORAMENTI.md`.
**Nota:** solo progettazione; implementazione in blocco con le altre feature.

## 0. Obiettivo

Estendere l'overlay didattico "Analisi regioni e equazioni" — oggi disponibile solo per **asse** e **circonferenza** — anche a **ellisse**, **iperbole** e **parabola** nel calcolatore. Passando il mouse, l'overlay evidenzia la regione, vi disegna in bianco il segmento del luogo e mostra un box con l'equazione **sciolta per quella regione** (originale → espansa → lineare → risolta).

## 1. Contesto del codice

Pattern esistente in `GraphCalc` (numeri di riga indicativi):
- gating dell'overlay: nel draw di asse/circ, `if (state.showRegions && state.isolatedId===obj.id && state.mouseWorld) _drawXRegions(...)`;
- toggle nella sidebar (≈ riga 2822): mostrato solo se `isolated && (obj.type==='asse' || obj.type==='circonferenza')`; checkbox → `GraphCalc.toggleRegions`;
- `_clipSegment(wx1,wy1,wx2,wy2,rxMin,rxMax,ryMin,ryMax)` → clip di un segmento a un rettangolo (Cohen–Sutherland);
- `_regionSegment(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax)` → cella della **griglia 9 regioni** per l'**asse** (hardcoded `s1=+1,s2=−1,C=0`): ritorna rettangolo della cella + segni + `cx,cy,cst`;
- `_buildEquationLines(sxa,sxb,sya,syb,x1,y1,x2,y2,cx,cy,cst)` → le 4 righe di testo del box per l'asse;
- `_drawAsseRegions` / `_drawCirconferenzaRegions` → logica dell'overlay (rette critiche, evidenziazione cella, segmento bianco, box equazione).

`ConicMath` espone già `parabolaRegionSegments(xF,yF,a,b,c,bounds)` (segmenti esatti della parabola per ogni direttrice) e il clipper a semipiani `_clipLineHalfplanes` (privato).

## 2. Toggle (gating)

Estendere la condizione del toggle (≈ riga 2822) da `(obj.type==='asse'||obj.type==='circonferenza')` a includere anche `'ellisse'`, `'iperbole'`, `'parabola'`. Nient'altro cambia: il toggle compare quando l'oggetto è isolato; l'overlay si disegna su hover come per asse/circonferenza.

## 3. Generalizzazione degli helper della griglia (ellisse + iperbole)

Ellisse e iperbole usano la **stessa griglia 9 regioni** dell'asse (rette critiche x=x1, x=x2, y=y1, y=y2). Si parametrizza il modello con `(s1,s2,C)`:
- ellisse: `s1=+1, s2=+1, C=2a`;
- iperbole ramo 1: `s1=+1, s2=−1, C=+2a`; ramo 2: `C=−2a`;
- asse (esistente): `s1=+1, s2=−1, C=0`.

**`_regionSegmentG(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax,s1,s2,C)`** (generalizza `_regionSegment`):
```
cx  = s1*sxa + s2*sxb
cy  = s1*sya + s2*syb
cst = C + s1*(sxa*x1 + sya*y1) + s2*(sxb*x2 + syb*y2)
```
Il resto (clamp del rettangolo della cella al viewport, segni dal punto rappresentativo) invariato. `_regionSegment` esistente diventa un wrapper: `_regionSegment(...) → _regionSegmentG(...,1,-1,0)`, così tutte le chiamate dell'asse restano identiche.

**`_buildEquationLinesG(s1,s2,C,sxa,sxb,sya,syb,x1,y1,x2,y2,cx,cy,cst)`** (generalizza `_buildEquationLines`):
- **riga 1** (equazione originale), con `TA=|x−x1|+|y−y1|`, `TB=|x−x2|+|y−y2|`:
  - `s2=+1` → `TA + TB = C` (ellisse, C=2a);
  - `s2=−1, C=0` → `TA = TB` (asse);
  - `s2=−1, C≠0` → `TA − TB = C` (iperbole, C=2a);
- **righe 2–4** (espansa per regione → `cx·x+cy·y=cst` → risolta) come l'attuale `_buildEquationLines`, incluso il caso `cx=cy=0` (`0 = cst` → "nessuna soluzione"/"tutto il piano").
- `_buildEquationLines(...)` esistente diventa un wrapper: `→ _buildEquationLinesG(1,-1,0,...)`. **Regressione:** l'output dell'asse deve restare carattere-per-carattere identico (test).

## 4. Ellisse — `_drawEllisseRegions(ctx,t,obj,vMin,vMax,w,h)`

Mirroring di `_drawAsseRegions`, con `(s1,s2,C)=(1,1,twoA)`:
- ordina i fuochi → `xBounds=[-INF,xL,xR,INF]`, `yBounds=[-INF,yB,yT,INF]`;
- disegna le 4 rette critiche tratteggiate;
- dal `mouseWorld` determina col/row; `_regionSegmentG(...,1,1,twoA)`; evidenzia la cella (fill scuro), disegna in bianco il segmento del luogo nella cella (via `cx,cy,cst` + `_clipSegment`), box via `_buildEquationLinesG(1,1,twoA,...)`.
- regione centrale (`cx=cy=0`): se `cst=2a−d₀≠0` → "nessuna soluzione" (gestito dal builder).
- Aggancio: in coda a `_drawEllisse`, `if (state.showRegions && state.isolatedId===obj.id && state.mouseWorld) _drawEllisseRegions(...)`.

## 5. Iperbole — `_drawIperboleRegions(ctx,t,obj,vMin,vMax,w,h)`

Stessa griglia; **due rami** (stessi `cx,cy`, costante `cst` diversa):
- nella cella sotto il mouse, calcola `_regionSegmentG(...,1,-1,+twoA)` (ramo 1) e ricava la `cst` del ramo 2 sostituendo `+twoA→−twoA`;
- disegna in bianco i segmenti di **entrambi** i rami presenti nella cella (clip con `_clipSegment`);
- box: le 4 righe del **ramo 1** (`TA − TB = 2a` → … → risolta) più una riga-nota che il ramo 2 è `… = −2a` (e la sua retta risolta), in colore tenue.
- Aggancio in coda a `_drawIperbole`.

## 6. Parabola — `_drawParabolaRegions(ctx,t,obj,vMin,vMax,w,h)`

Modello a **3 rette critiche** e **8 celle di segno** (diverso dalla griglia).
- direttrice da `obj.params`: `vertical` → `a=1,b=0,c=−q`; non verticale → `a=m,b=−1,c=q`. `D=|a|+|b|`.
- rette critiche tratteggiate: `x=xF` (verticale), `y=yF` (orizzontale), e la **direttrice** `a·x+b·y+c=0` (la direttrice è già disegnata da `_drawParabola`; qui si aggiungono x=xF e y=yF, e opzionalmente si ribadisce la direttrice in stile "critico").
- dal `mouseWorld`: `s1=sign(mx−xF)`, `s2=sign(my−yF)`, `s3=sign(a·mx+b·my+c)` → individua la cella.
- **evidenziazione cella**: poligono = rettangolo del viewport tagliato dai 3 semipiani della cella (`s1(x−xF)≥0`, `s2(y−yF)≥0`, `s3(ax+by+c)≥0`) via `ConicMath.clipPolygonHalfplane` applicato 3 volte; fill scuro semi-trasparente; **baricentro** del poligono per posizionare il box.
- **segmento bianco**: da `ConicMath.parabolaRegionSegments(xF,yF,a,b,c,{xMin:vMin.x,xMax:vMax.x,yMin:vMin.y,yMax:vMax.y})`, scegliere il segmento la cui **mezzeria** soddisfa i segni `(s1,s2,s3)` della cella; disegnarlo in bianco.
- **box** `_buildParabolaEquationLines(s1,s2,s3,xF,yF,a,b,c,cx,cy,rhs)` con `cx=D·s1−s3·a`, `cy=D·s2−s3·b`, `rhs=D·s1·xF+D·s2·yF+s3·c`:
  - riga 1: `|x−xF| + |y−yF| = |a x + b y + c| / (|a|+|b|)` (per direttrice orizzontale a=0 si può mostrare la forma equivalente `= |y−k|`);
  - riga 2: espansa nella cella `s1(x−xF) + s2(y−yF) = s3(ax+by+c)/D`;
  - riga 3: lineare `cx·x + cy·y = rhs`;
  - riga 4: risolta (`x=…`, `y=…`, o `y=mx+b`).
- Aggancio in coda a `_drawParabola`.

## 7. Nuovo helper puro (testabile) in `ConicMath`

`clipPolygonHalfplane(poly, nx, ny, k)` → ritorna il poligono (array di `{x,y}`) intersezione di `poly` col semipiano `nx·x + ny·y ≥ k` (Sutherland–Hodgman, un solo semipiano). Usato 3 volte (più i 4 lati del viewport già nel poligono iniziale) per la cella della parabola. È l'unico pezzo non banale nuovo; va in `ConicMath` ed è esportato per il test. Nessun'altra nuova funzione pura (il resto riusa `_clipSegment`, la griglia generalizzata e `parabolaRegionSegments`).

## 8. Verifica

**Harness (Node):** `clipPolygonHalfplane` (in `ConicMath`, testabile):
- quadrato `[(0,0),(4,0),(4,4),(0,4)]` col semipiano `x≥2` (`nx=1,ny=0,k=2`) → poligono con tutti i vertici a `x∈[2,4]`, area = 8 (dimezzata);
- col semipiano `x≥10` (esclude tutto) → poligono vuoto (`length===0`);
- col semipiano `x≥0` (contiene tutto) → 4 vertici, area = 16.
- I test ConicMath esistenti continuano a passare.

**Verifica visiva (browser):**
- **Regressione asse/circonferenza:** isolare un asse (e una circonferenza), attivare il toggle, muovere il mouse → l'overlay e il box-equazione devono essere **identici a prima** (l'asse passa per i wrapper generalizzati: `_buildEquationLines`/`_regionSegment` invariati nell'output). Questa è la verifica chiave anti-regressione, perché le funzioni di formattazione vivono in `GraphCalc` (fuori dall'harness).
- **Nuove coniche:** isolare ellisse/iperbole/parabola, toggle on, hover → cella evidenziata, segmento bianco corretto, box con equazione sciolta coerente; iperbole con entrambi i rami; parabola con celle oblique corrette su direttrice orizzontale/verticale/obliqua; nessun errore in console.

## 9. Fuori scope

- Overlay regioni per il "luogo libero" e la "distanza".
- Modifiche al rendering base delle coniche (forme) o alla matematica di `ConicMath` (a parte l'aggiunta di `clipPolygonHalfplane`).
- Nuove interazioni oltre l'hover (es. "pin" della regione): eventuale follow-up.

## 10. Vincoli

- Tutto inline in `index.html`; nessuna libreria.
- Asse e circonferenza e il loro overlay restano identici (l'asse passa per i wrapper generalizzati; output invariato).
- Firme pubbliche di `ConicMath` invariate (solo aggiunta di `clipPolygonHalfplane` al `return`).
