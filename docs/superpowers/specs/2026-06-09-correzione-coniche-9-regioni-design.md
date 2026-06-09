# Correzione coniche taxicab — Motore unico a 9 regioni

**Data:** 2026-06-09
**File interessato:** `index.html` (unico file del progetto) — solo blocco `<script>`, nessuna modifica a CSS/HTML/DOM.
**Spec di partenza:** `PROMPT_LLM_CORREZIONE_CODICE.md` — questa spec la **corregge** dove necessario (vedi §1).
**Riferimento matematico:** `GUIDA_GEOMETRIA_TAXI.md`.

---

## 0. Obiettivo

Riscrivere il disegno di **ellisse**, **iperbole** e **parabola** nel calcolatore (`GraphCalc`) e nei mini-engine (`MiniEngine`) usando il **metodo delle 9 regioni** (più in generale: sciogliere i valori assoluti per cella e clippare la retta risultante alla cella). Risultato: curve **esattamente poligonali**, senza artefatti di campionamento pixel. La parabola dev'essere esatta per direttrice **orizzontale, verticale e obliqua**.

---

## 1. Scoperte che modificano lo spec di partenza

Verificate leggendo il codice attuale e la GUIDA, con controprove numeriche.

### 1.1 Il codice attuale è davvero errato (motiva il lavoro)
- **Ellisse, fuochi obliqui** `F₁(0,0), F₂(4,2), 2a=10`: il luogo reale ha un **lato superiore orizzontale** da `(0,4)` a `(4,4)` — verificato che `(0,4),(1,4),(3,4),(4,4)` stanno tutti sul luogo (somma distanze L₁ = 10). Il codice attuale (`ellipseVertices`) lo classifica come **rombo** con un solo vertice a punta `(2,4)`. Errato. La classificazione closed-form (ottagono/esagono/rombo via `k<hh`, `k<hw`) non vale per fuochi obliqui.
- **Iperbole, fuochi orizzontali** `F₁(-3,0), F₂(3,0), 2a=2`: sulla retta `x=c` la differenza vale `|c+3|−|c−3| = 2c` per `0<c<3`, quindi `2c=2 → c=1`. I rami reali sono a `x=±1`. Il codice attuale li mette a `x=±2`. Errato. (La stessa formula semplificata è sbagliata anche nella GUIDA §5.5/§5.8; le **tabelle generali** §5.3 sono invece corrette.)

### 1.2 ⚠️ Errore di segno nello spec di partenza (MODIFICA 1 e 5)
Il prompt scrive `rhs = twoA − sxa·x1 − sxb·x2 − sya·y1 − syb·y2` (termini costanti **negati**).
La formula **corretta**, che combacia con GUIDA §8.1, con le tabelle per regione §4.3/§5.3 **e** con il codice `_regionSegment` dell'asse già funzionante nel repo, è:

```
rhs = C + s₁·(sxa·x1 + sya·y1) + s₂·(sxb·x2 + syb·y2)
```

Conferma incrociata con l'asse (`s₁=+1, s₂=−1, C=0`): GUIDA §7.2 e il codice danno `cst = sxa·x1 + sya·y1 − sxb·x2 − syb·y2` ✓. **Si usa la formula corretta, non quella del prompt.**

### 1.3 Riuso
Il repo contiene già un motore a 9 regioni corretto e viewport-aware: `_regionSegment` + `_clipSegment` (usati da asse e circonferenza, con overlay didattico "toggle regioni"). **Non si toccano** — restano a servizio di asse/circonferenza. La convenzione di segno corretta del nuovo motore è quella stessa.

---

## 2. Convenzioni e formula generale

Per ogni cella, dati i segni di scioglimento:
```
sxa = sign(x − x1),  sxb = sign(x − x2),  sya = sign(y − y1),  syb = sign(y − y2)
```
e il luogo `s₁·d₁(P,F₁) + s₂·d₁(P,F₂) = C`, l'equazione lineare nella cella è:
```
cx·x + cy·y = rhs
  cx  = s₁·sxa + s₂·sxb
  cy  = s₁·sya + s₂·syb
  rhs = C + s₁·(sxa·x1 + sya·y1) + s₂·(sxb·x2 + syb·y2)
```
- **Ellisse:** `s₁=+1, s₂=+1, C=2a`
- **Iperbole ramo 1:** `s₁=+1, s₂=−1, C=+2a`
- **Iperbole ramo 2:** `s₁=+1, s₂=−1, C=−2a`
- **Asse (esistente):** `s₁=+1, s₂=−1, C=0`

Caso `cx=cy=0`: se `|rhs|<ε` la cella intera è sul luogo (banda piena semi-trasparente), altrimenti nessun punto.

---

## 3. Nucleo condiviso (nuovo, in `ConicMath`)

### 3.1 `_clipLineHalfplanes(cx, cy, rhs, constraints) → {from:{x,y}, to:{x,y}} | null`
Clip della retta `cx·x + cy·y = rhs` contro l'intersezione di **semipiani** (Liang–Barsky parametrico):
- Punto sulla retta `P0` (da `cx` o `cy` ≠ 0); direzione `u = (−cy, cx)` (lungo la retta).
- `P(t) = P0 + t·u`. Intervallo iniziale `t ∈ (−∞, +∞)`.
- Ogni vincolo `nx·x + ny·y ≥ k` → `A·t ≥ B` con `A = nx·ux+ny·uy`, `B = k − (nx·P0x+ny·P0y)`: se `A>0` aggiorna `tmin`, se `A<0` aggiorna `tmax`, se `A≈0` infeasible quando `B>ε`.
- Il **viewport** è sempre incluso come 4 vincoli → intervallo finito (gestisce le semirette infinite).
- Ritorna i due estremi `P(tmin), P(tmax)`; `null` se `tmin>tmax` o degenere.

Il rettangolo di una regione è solo un caso particolare (4 vincoli allineati agli assi); una cella obliqua (parabola) usa vincoli non allineati. **Stesso primitivo per tutti i casi.**

### 3.2 Sweep ellisse/iperbole (griglia 3×3)
Itera `col,row ∈ {0,1,2}`; segni dalla griglia (`sxa = col≥1?+1:-1`, ecc.); calcola `cx,cy,rhs`; vincoli = bordi cella `[xBounds[col],xBounds[col+1]]×[yBounds[row],yBounds[row+1]]` + viewport; raccoglie i segmenti.

### 3.3 Sweep parabola (8 combinazioni di segno)
Vedi §6.

---

## 4. Ellisse — `ellipseVertices(x1, y1, x2, y2, twoA)` *(firma invariata)*

- Validità: `twoA ≥ d₀ − ε` (altrimenti `null`); degenere `twoA ≤ d₀ + ε` → rettangolo `[(x1,y1),(x2,y1),(x2,y2),(x1,y2)]`.
- Altrimenti: sweep 9 regioni con `s₁=s₂=+1, C=2a`, bounds = box ampio attorno al centro (l'ellisse è sempre limitata). Raccoglie estremi dei segmenti → dedup (`< 1e-7`) → **ordina in senso antiorario** attorno al centroide (tie-break per raggio) → array di vertici.
- Convessità garantita (sublevel set di funzione convessa) → l'ordinamento angolare è corretto.

**Consumatori:** `MiniEngine` (blocco `ellipse`, già usa `drawPolyline(close)`) e `GraphCalc._drawEllisse`. Nessun viewport necessario.

`_drawEllisse` (riscritto): rette critiche tratteggiate (`x=x1,x=x2,y=y1,y=y2`) + `drawPolyline(verts, color, 2.5, close=true)` con glow + punti fuochi. Rimosso il column-scan numerico.

---

## 5. Iperbole — `hyperbolaVertices(x1, y1, x2, y2, twoA, bounds?)`

- Validità: `0 < 2a < d₀` (altrimenti `null`).
- Due sweep: `C=+2a → branch1`, `C=−2a → branch2`. Ogni ramo = **array di segmenti** `[{from,to}]`.
- `bounds` opzionale `{xMin,xMax,yMin,yMax}` per le semirette infinite; default ampio (es. attorno ai fuochi) per i mini-engine.
- Caso orizzontale (`y1≈y2`) e verticale gestiti automaticamente dal metodo generale (righe/colonne che collassano → celle nulle).

**Consumatori:**
- `MiniEngine` blocco `hyperbola` (MODIFICA 3/7): iterare i segmenti
  ```js
  if (result) [result.branch1, result.branch2].forEach(b =>
    b.forEach(seg => drawSegment(ctx, t, seg.from, seg.to, color, 2.5)));
  ```
- `GraphCalc._drawIperbole` (riscritto): calcola il viewport, `hyperbolaVertices(...,bounds)`, disegna rette critiche tratteggiate + i segmenti dei due rami + punti fuochi. Rimosso il pixel sign-change.

---

## 6. Parabola — esatta per ogni direttrice — `parabolaRegionSegments(xF, yF, a, b, c, bounds) → [{from,to}]`

Direttrice `a·x + b·y + c = 0`, `D = |a|+|b|`. Equazione `D·(|x−xF|+|y−yF|) = |a·x+b·y+c|`.
Tre rette critiche: `x=xF`, `y=yF`, `a·x+b·y+c=0`. Itera le **8 combinazioni** `s₁,s₂,s₃ ∈ {±1}`:
```
cx  = D·s₁ − s₃·a
cy  = D·s₂ − s₃·b
rhs = D·s₁·xF + D·s₂·yF + s₃·c
```
Cella = `{ s₁(x−xF) ≥ 0, s₂(y−yF) ≥ 0, s₃(a·x+b·y+c) ≥ 0 } ∩ viewport`. Celle vuote → `null` (scartate). Raccoglie i segmenti.

**Verifica analitica** (F(0,2), direttrice `y=0` → `a=0,b=1,c=0`): produce semirette `x=±2` per `y≥2` e rami obliqui fino al vertice `(0,1)` — coincide esattamente con la parabola nota. Gestisce apertura su/giù, direttrice verticale (`a≠0,b=0`) e obliqua (`a≠0,b≠0`) senza casi speciali.

**Mapping parametri `GraphCalc` → `(a,b,c)`** (da `{xF,yF,m,q,vertical}`):
- `vertical` (x=q): `a=1, b=0, c=−q`
- non verticale (y=m·x+q): `a=m, b=−1, c=q` (orizzontale = caso `m=0`)

**Consumatori:**
- `GraphCalc._drawParabola` (riscritto): direttrice tratteggiata (come ora) + `parabolaRegionSegments(xF,yF,a,b,c,bounds)` con viewport, disegna tutti i segmenti. Sostituisce sia il ramo `parabolaSegments` sia `parabolaSegmentsOblique`.
- `ConicMath.parabolaSegments(xF,yF,k,yExtent)` **resta invariata** (già corretta, verificata dai test) a servizio del mini-engine `parabola` (solo direttrice orizzontale).
- `parabolaSegmentsOblique` (campionamento numerico): **rimossa** (rimpiazzata dal metodo esatto).

---

## 7. Test — `ConicMath.runTests`

Aggiornare e **aggiungere regressioni** che bloccano i bug trovati:
- Iperbole: struttura a segmenti `{branch1:[{from,to}], branch2:[{from,to}]}`; per fuochi orizzontali ogni primo segmento è verticale (`from.x≈to.x`); `null` quando `2a≥d₀`.
- **Regressione iperbole orizzontale:** `F₁(-3,0),F₂(3,0),2a=2` → un ramo a `x≈1`, l'altro a `x≈−1` (non `±2`).
- **Regressione ellisse obliqua:** `F₁(0,0),F₂(4,2),2a=10` → l'insieme dei vertici contiene sia `(0,4)` sia `(4,4)` (lato superiore piatto, non vertice a punta `(2,4)`).
- **Parabola obliqua:** `parabolaRegionSegments` con una direttrice obliqua produce segmenti non vuoti e i punti generati soddisfano `|x−xF|+|y−yF| ≈ |ax+by+c|/(|a|+|b|)` entro ε.
- I test esistenti di cerchio/ellisse/parabola orizzontale continuano a passare.

---

## 8. Verifica (definition of done)

1. Estrarre le funzioni pure di `ConicMath` in un file temporaneo ed eseguirle con **Node**: tutti gli `console.assert` (esistenti + nuove regressioni) passano, nessun assert fallito in console.
2. Controllo visivo nel browser: ellisse obliqua col lato piatto corretto; iperbole orizzontale a `x=±1`; iperbole/parabola che riempiono il viewport con pan/zoom; parabola verticale e obliqua senza artefatti; rette critiche tratteggiate presenti; asse/circonferenza e il toggle regioni invariati.
3. Nessun errore in console all'apertura del calcolatore.

---

## 9. Fuori scope

- CSS, HTML, struttura DOM.
- `_regionSegment`/`_clipSegment` e gli overlay "toggle regioni" di asse/circonferenza (restano com'è).
- Aggiungere l'overlay "toggle regioni" a ellisse/iperbole/parabola (non richiesto).
- Librerie esterne, build step, file aggiuntivi.

---

## 10. Vincoli (dallo spec di partenza)

1. Solo JS nel blocco `<script>`; niente CSS/HTML/DOM.
2. Firme pubbliche invariate: `circleVertices`, `ellipseVertices`, `hyperbolaVertices` (param `bounds` aggiunto in coda, retro-compatibile), `parabolaSegments`, `runTests`. Nuove: `parabolaRegionSegments` e gli helper privati.
3. Mantenere le rette critiche tratteggiate (pedagogiche).
4. Clipping rigoroso: nessun segmento oltre la propria cella.
5. Gestire `cx=cy=0` (banda piena se `rhs≈0`, altrimenti niente).
6. Niente librerie esterne.
7. Coordinate in spazio mondo (y verso l'alto); l'inversione la fa `makeTransform`.
