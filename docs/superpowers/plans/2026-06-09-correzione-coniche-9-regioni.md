# Correzione coniche taxicab (metodo 9 regioni) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Riscrivere ellisse, iperbole e parabola del calcolatore con un motore a regioni esatto (segno corretto), eliminando i bug per fuochi obliqui e i campionamenti pixel.

**Architecture:** Un unico primitivo di clipping a semipiani in `ConicMath` (`_clipLineHalfplanes`) serve sia lo sweep a griglia 3×3 (ellisse/iperbole) sia lo sweep a 8 combinazioni di segno (parabola, qualsiasi direttrice). I segni per cella si calcolano dal punto rappresentativo (robusto all'ordine dei fuochi); `rhs = C + s₁·(sxa·x1+sya·y1) + s₂·(sxb·x2+syb·y2)`. `GraphCalc` e i mini-engine chiamano queste funzioni.

**Tech Stack:** Vanilla JS in `index.html` (singolo file). Verifica headless con Node che estrae l'IIFE `ConicMath` e lancia `runTests()`.

**Spec:** `docs/superpowers/specs/2026-06-09-correzione-coniche-9-regioni-design.md`

**Convenzioni chiave (valgono per tutte le task):**
- I fuochi si passano come **coppie reali** `(x1,y1),(x2,y2)`, MAI ordinando x e y indipendentemente (romperebbe l'accoppiamento per fuochi obliqui). L'ordinamento serve solo per i bordi della griglia.
- Segni per cella dal punto rappresentativo: `sxa = xRep>=x1?1:-1`, ecc. (come il `_regionSegment` esistente).
- `_regionSegment`/`_clipSegment` e gli overlay "toggle regioni" di asse/circonferenza **NON si toccano**.
- Solo JS; niente CSS/HTML/DOM.

---

## Task 0: Harness di test headless (strumento temporaneo)

**Files:**
- Create: `tools/test-conicmath.mjs` (temporaneo, NON committato; rimosso nella Task 10)

- [ ] **Step 1: Creare l'harness**

`tools/test-conicmath.mjs`:
```js
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const start = html.indexOf('const ConicMath = (() => {');
const end = html.indexOf('const MiniEngine = (() => {');
if (start < 0 || end < 0) { console.error('ConicMath block not found'); process.exit(2); }
const code = html.slice(start, end);

let failures = 0;
console.assert = (cond, ...msg) => { if (!cond) { failures++; console.log('  ✗ FAIL:', msg.join(' ')); } };

let ConicMath;
try {
  ConicMath = new Function(code + '\n;return ConicMath;')();
} catch (e) {
  console.error('Eval error:', e.message); process.exit(2);
}
try {
  ConicMath.runTests();
} catch (e) {
  console.error('runTests threw:', e.message); process.exit(1);
}
console.log(failures ? `\n${failures} assertion(s) FAILED` : '\nAll assertions passed');
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Eseguire sul codice attuale (baseline verde)**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed` (i test attuali passano con il codice esistente).

- [ ] **Step 3: Nessun commit** (strumento temporaneo).

---

## Task 1: Primitivo di clipping a semipiani + sweep a griglia

**Files:**
- Modify: `index.html` (dentro l'IIFE `ConicMath`, prima di `circleVertices`, ~riga 871)

- [ ] **Step 1: Aggiungere asserzioni in `runTests` (test che fallisce)**

In `runTests()` (index.html ~riga 1019), subito dopo `function runTests() {`, inserire:
```js
    // Clipper: retta x=2 (cx=1,cy=0,rhs=2) dentro rettangolo [0,4]x[0,4] → segmento verticale
    const _c1 = _clipLineHalfplanes(1, 0, 2, [
      {nx:1,ny:0,k:0},{nx:-1,ny:0,k:-4},{nx:0,ny:1,k:0},{nx:0,ny:-1,k:-4}]);
    console.assert(_c1 !== null, 'clip: segmento atteso non null');
    console.assert(Math.abs(_c1.from.x-2)<1e-9 && Math.abs(_c1.to.x-2)<1e-9, 'clip: x costante = 2');
    console.assert(Math.abs(Math.min(_c1.from.y,_c1.to.y)-0)<1e-9 && Math.abs(Math.max(_c1.from.y,_c1.to.y)-4)<1e-9, 'clip: y da 0 a 4');
    // Clipper: retta fuori dal rettangolo → null
    const _c2 = _clipLineHalfplanes(1, 0, 99, [
      {nx:1,ny:0,k:0},{nx:-1,ny:0,k:-4},{nx:0,ny:1,k:0},{nx:0,ny:-1,k:-4}]);
    console.assert(_c2 === null, 'clip: retta fuori dal rettangolo → null');
```

- [ ] **Step 2: Eseguire — deve fallire**

Run: `node tools/test-conicmath.mjs`
Expected: exit 1, errore "runTests threw: _clipLineHalfplanes is not defined".

- [ ] **Step 3: Implementare il primitivo e lo sweep**

In `index.html`, subito dopo `const ConicMath = (() => {` (riga ~869), inserire:
```js
  // ── MOTORE A REGIONI (metodo dei valori assoluti per cella) ──
  // Clip della retta cx*x + cy*y = rhs contro l'intersezione di semipiani.
  // Ogni vincolo: { nx, ny, k } significa  nx*x + ny*y >= k.
  // Ritorna { from:{x,y}, to:{x,y} } oppure null.
  function _clipLineHalfplanes(cx, cy, rhs, constraints) {
    const eps = 1e-9;
    if (Math.abs(cx) < eps && Math.abs(cy) < eps) return null;
    let p0x, p0y;
    if (Math.abs(cx) >= Math.abs(cy)) { p0x = rhs / cx; p0y = 0; }
    else { p0x = 0; p0y = rhs / cy; }
    const ux = -cy, uy = cx;            // direzione lungo la retta
    let tmin = -Infinity, tmax = Infinity;
    for (const c of constraints) {
      const A = c.nx * ux + c.ny * uy;
      const B = c.k - (c.nx * p0x + c.ny * p0y);
      if (Math.abs(A) < eps) { if (B > eps) return null; }
      else if (A > 0) { if (B / A > tmin) tmin = B / A; }
      else { if (B / A < tmax) tmax = B / A; }
    }
    if (tmin > tmax + eps || !isFinite(tmin) || !isFinite(tmax)) return null;
    return {
      from: { x: p0x + tmin * ux, y: p0y + tmin * uy },
      to:   { x: p0x + tmax * ux, y: p0y + tmax * uy }
    };
  }

  // Clip a un rettangolo allineato agli assi.
  function _clipLineToRect(cx, cy, rhs, rxMin, rxMax, ryMin, ryMax) {
    return _clipLineHalfplanes(cx, cy, rhs, [
      { nx: 1, ny: 0, k: rxMin }, { nx:-1, ny: 0, k:-rxMax },
      { nx: 0, ny: 1, k: ryMin }, { nx: 0, ny:-1, k:-ryMax }
    ]);
  }

  // Sweep 9 regioni per il luogo  s1*d1(P,F1) + s2*d1(P,F2) = C.
  // Fuochi passati come coppie reali (qualsiasi ordine). Ritorna [{from,to}].
  function _gridLocusSegments(s1, s2, C, x1, y1, x2, y2, bounds) {
    const eps = 1e-9;
    const xB = [bounds.xMin, Math.min(x1, x2), Math.max(x1, x2), bounds.xMax];
    const yB = [bounds.yMin, Math.min(y1, y2), Math.max(y1, y2), bounds.yMax];
    const segs = [];
    for (let col = 0; col < 3; col++) {
      for (let row = 0; row < 3; row++) {
        const rxMin = xB[col], rxMax = xB[col + 1];
        const ryMin = yB[row], ryMax = yB[row + 1];
        if (rxMin >= rxMax - eps || ryMin >= ryMax - eps) continue;
        const xRep = (rxMin + rxMax) / 2, yRep = (ryMin + ryMax) / 2;
        const sxa = xRep >= x1 ? 1 : -1, sxb = xRep >= x2 ? 1 : -1;
        const sya = yRep >= y1 ? 1 : -1, syb = yRep >= y2 ? 1 : -1;
        const cx  = s1 * sxa + s2 * sxb;
        const cy  = s1 * sya + s2 * syb;
        const rhs = C + s1 * (sxa * x1 + sya * y1) + s2 * (sxb * x2 + syb * y2);
        if (cx === 0 && cy === 0) continue;
        const seg = _clipLineToRect(cx, cy, rhs, rxMin, rxMax, ryMin, ryMax);
        if (seg) segs.push(seg);
      }
    }
    return segs;
  }
```

- [ ] **Step 4: Eseguire — deve passare**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(conicmath): motore a regioni con clipping a semipiani"
```

---

## Task 2: Riscrivere `ellipseVertices` con lo sweep a regioni

**Files:**
- Modify: `index.html` — `function ellipseVertices` (~riga 885)
- Modify: `index.html` — `runTests` (asserzioni ellisse)

- [ ] **Step 1: Aggiungere la regressione fuochi obliqui (test che fallisce)**

In `runTests`, sostituire il blocco ellisse esistente (le righe con `ellipseVertices(0,0,4,2,10)`, `ellipseVertices(0,0,3,4,7)`, `ellipseVertices(0,0,3,4,5)`) con:
```js
    // Ellipse — non null e poligono
    const ev = ellipseVertices(0, 0, 4, 2, 10);
    console.assert(ev !== null && ev.length >= 4, 'ellipseVertices: poligono valido');
    // Regressione fuochi obliqui: lato superiore PIATTO (0,4)–(4,4), non vertice a punta (2,4)
    const hasPt = (arr, x, y) => arr.some(p => Math.abs(p.x-x)<1e-6 && Math.abs(p.y-y)<1e-6);
    console.assert(hasPt(ev, 0, 4), 'ellisse obliqua: vertice (0,4) presente');
    console.assert(hasPt(ev, 4, 4), 'ellisse obliqua: vertice (4,4) presente');
    console.assert(!hasPt(ev, 2, 4) || (hasPt(ev,0,4)&&hasPt(ev,4,4)), 'ellisse obliqua: niente punta a (2,4)');
    // Ellipse degenere: 2a = d0 → rettangolo
    const ev2 = ellipseVertices(0, 0, 3, 4, 7);
    console.assert(Array.isArray(ev2) && ev2.length === 4, 'ellipseVertices degenere: rettangolo 4 vertici');
    // Ellipse impossibile: 2a < d0
    console.assert(ellipseVertices(0, 0, 3, 4, 5) === null, 'ellipseVertices: null se 2a < d0');
```

- [ ] **Step 2: Eseguire — deve fallire**

Run: `node tools/test-conicmath.mjs`
Expected: exit 1, FAIL su "vertice (0,4) presente" / "(4,4) presente" (il codice attuale rende un rombo a punta).

- [ ] **Step 3: Sostituire `ellipseVertices`**

Rimpiazzare l'intera `function ellipseVertices(...) { ... }` (~righe 885–957) con:
```js
  // ── ELLISSE ── poligono convesso (4–8 vertici) via metodo delle 9 regioni, o null.
  function ellipseVertices(x1, y1, x2, y2, twoA) {
    const d0 = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    if (twoA < d0 - 1e-9) return null;
    if (twoA <= d0 + 1e-9) {
      // Degenere: perimetro del rettangolo con F1,F2 vertici opposti
      return [{x:x1,y:y1},{x:x2,y:y1},{x:x2,y:y2},{x:x1,y:y2}];
    }
    const xMin = Math.min(x1,x2), xMax = Math.max(x1,x2);
    const yMin = Math.min(y1,y2), yMax = Math.max(y1,y2);
    const bounds = { xMin: xMin-twoA, xMax: xMax+twoA, yMin: yMin-twoA, yMax: yMax+twoA };
    const segs = _gridLocusSegments(1, 1, twoA, x1, y1, x2, y2, bounds);
    const pts = [];
    for (const s of segs) { pts.push(s.from, s.to); }
    const uniq = [];
    for (const p of pts) {
      if (!uniq.some(q => Math.abs(q.x-p.x) < 1e-7 && Math.abs(q.y-p.y) < 1e-7)) uniq.push(p);
    }
    if (uniq.length < 3) return uniq;
    const cx = uniq.reduce((a,p)=>a+p.x,0)/uniq.length;
    const cy = uniq.reduce((a,p)=>a+p.y,0)/uniq.length;
    uniq.sort((a,b) => {
      const aa = Math.atan2(a.y-cy, a.x-cx), ab = Math.atan2(b.y-cy, b.x-cx);
      if (Math.abs(aa-ab) > 1e-12) return aa - ab;
      return Math.hypot(a.x-cx,a.y-cy) - Math.hypot(b.x-cx,b.y-cy);
    });
    return uniq;
  }
```

- [ ] **Step 4: Eseguire — deve passare**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "fix(conicmath): ellipseVertices esatta per fuochi obliqui (9 regioni)"
```

---

## Task 3: Riscrivere `hyperbolaVertices` (segmenti per ramo) + bounds opzionale

**Files:**
- Modify: `index.html` — `function hyperbolaVertices` (~riga 962)
- Modify: `index.html` — `runTests` (asserzioni iperbole)

- [ ] **Step 1: Aggiornare le asserzioni iperbole (test che fallisce)**

In `runTests`, sostituire il blocco iperbole esistente (`const hv = hyperbolaVertices(-3,0,3,0,2)` e i due `console.assert` su `.length===2`, più `hv2`) con:
```js
    // Hyperbola — fuochi orizzontali: struttura a segmenti
    const hv = hyperbolaVertices(-3, 0, 3, 0, 2);
    console.assert(hv !== null, 'hyperbolaVertices: non null');
    console.assert(Array.isArray(hv.branch1) && hv.branch1.length >= 1, 'branch1: almeno un segmento');
    console.assert(Array.isArray(hv.branch2) && hv.branch2.length >= 1, 'branch2: almeno un segmento');
    const _s1 = hv.branch1[0], _s2 = hv.branch2[0];
    console.assert(Math.abs(_s1.from.x - _s1.to.x) < 1e-9, 'branch1: segmento verticale (x costante)');
    console.assert(Math.abs(_s2.from.x - _s2.to.x) < 1e-9, 'branch2: segmento verticale (x costante)');
    // Regressione: rami a x=±1 (NON ±2)
    const _xs = [Math.abs(_s1.from.x), Math.abs(_s2.from.x)];
    console.assert(_xs.every(x => Math.abs(x - 1) < 1e-6), 'iperbole orizzontale: rami a x=±1');
    // Hyperbola invalida: 2a >= d0
    console.assert(hyperbolaVertices(-3, 0, 3, 0, 6) === null, 'hyperbolaVertices: null se 2a >= d0');
```

- [ ] **Step 2: Eseguire — deve fallire**

Run: `node tools/test-conicmath.mjs`
Expected: exit 1, FAIL su "x=±1" / struttura segmenti (codice attuale rende array di punti a ±2).

- [ ] **Step 3: Sostituire `hyperbolaVertices`**

Rimpiazzare l'intera `function hyperbolaVertices(...) { ... }` (~righe 962–992) con:
```js
  // ── IPERBOLE ── { branch1:[{from,to}], branch2:[{from,to}] } o null.
  // bounds opzionale {xMin,xMax,yMin,yMax} per le semirette infinite (default ampio).
  function hyperbolaVertices(x1, y1, x2, y2, twoA, bounds) {
    const d0 = Math.abs(x2 - x1) + Math.abs(y2 - y1);
    if (twoA >= d0 - 1e-9 || twoA <= 1e-9) return null;
    const xMin = Math.min(x1,x2), xMax = Math.max(x1,x2);
    const yMin = Math.min(y1,y2), yMax = Math.max(y1,y2);
    const R = Math.max(d0 * 20, 1000);
    const b = bounds || { xMin: xMin-R, xMax: xMax+R, yMin: yMin-R, yMax: yMax+R };
    return {
      branch1: _gridLocusSegments(1, -1, +twoA, x1, y1, x2, y2, b),
      branch2: _gridLocusSegments(1, -1, -twoA, x1, y1, x2, y2, b)
    };
  }
```

- [ ] **Step 4: Eseguire — deve passare**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "fix(conicmath): hyperbolaVertices a segmenti, esatta (9 regioni)"
```

---

## Task 4: Aggiungere `parabolaRegionSegments` (esatta, ogni direttrice)

**Files:**
- Modify: `index.html` — dopo `parabolaSegments` (~riga 1016)
- Modify: `index.html` — return pubblico di `ConicMath` (~riga 1109)
- Modify: `index.html` — `runTests` (asserzioni parabola obliqua)

- [ ] **Step 1: Aggiungere asserzioni (test che fallisce)**

In `runTests`, prima della riga `console.log('%c✓ ConicMath tests passed'...)`, inserire:
```js
    // Parabola regioni — direttrice orizzontale y=0, F(0,2): riproduce la parabola nota
    const _pr = parabolaRegionSegments(0, 2, 0, 1, 0, {xMin:-10,xMax:10,yMin:-10,yMax:10});
    console.assert(Array.isArray(_pr) && _pr.length > 0, 'parabolaRegionSegments: segmenti presenti');
    // Ogni punto medio soddisfa |x-xF|+|y-yF| = |ax+by+c|/(|a|+|b|)
    const _okH = _pr.every(s => {
      const mx=(s.from.x+s.to.x)/2, my=(s.from.y+s.to.y)/2;
      const lhs=Math.abs(mx-0)+Math.abs(my-2), rhs=Math.abs(0*mx+1*my+0)/1;
      return Math.abs(lhs-rhs) < 1e-6;
    });
    console.assert(_okH, 'parabola orizzontale: punti sul luogo');
    // Parabola obliqua: direttrice x+y-4=0, F(0,0)
    const _po = parabolaRegionSegments(0, 0, 1, 1, -4, {xMin:-20,xMax:20,yMin:-20,yMax:20});
    console.assert(Array.isArray(_po) && _po.length > 0, 'parabola obliqua: segmenti presenti');
    const _okO = _po.every(s => {
      const mx=(s.from.x+s.to.x)/2, my=(s.from.y+s.to.y)/2;
      const lhs=Math.abs(mx)+Math.abs(my), rhs=Math.abs(mx+my-4)/2;
      return Math.abs(lhs-rhs) < 1e-6;
    });
    console.assert(_okO, 'parabola obliqua: punti sul luogo');
```

- [ ] **Step 2: Eseguire — deve fallire**

Run: `node tools/test-conicmath.mjs`
Expected: exit 1, "runTests threw: parabolaRegionSegments is not defined".

- [ ] **Step 3: Implementare la funzione**

In `index.html`, subito dopo la chiusura di `function parabolaSegments(...) { ... }` (la riga `}` a ~riga 1016, prima di `// ── TESTS`), inserire:
```js
  // ── PARABOLA (qualsiasi direttrice a*x + b*y + c = 0) ──
  // Metodo a regioni: 3 rette critiche (x=xF, y=yF, direttrice) → 8 combinazioni di segno.
  // bounds {xMin,xMax,yMin,yMax} obbligatorio (limita le semirette infinite). Ritorna [{from,to}].
  function parabolaRegionSegments(xF, yF, a, b, c, bounds) {
    const D = Math.abs(a) + Math.abs(b);
    if (D < 1e-9) return [];
    const segs = [];
    for (const s1 of [1, -1]) for (const s2 of [1, -1]) for (const s3 of [1, -1]) {
      const cx  = D * s1 - s3 * a;
      const cy  = D * s2 - s3 * b;
      const rhs = D * s1 * xF + D * s2 * yF + s3 * c;
      if (Math.abs(cx) < 1e-9 && Math.abs(cy) < 1e-9) continue;
      const seg = _clipLineHalfplanes(cx, cy, rhs, [
        { nx: s1,    ny: 0,     k: s1 * xF },   // s1*(x-xF) >= 0
        { nx: 0,     ny: s2,    k: s2 * yF },   // s2*(y-yF) >= 0
        { nx: s3*a,  ny: s3*b,  k: -s3 * c },   // s3*(a x + b y + c) >= 0
        { nx: 1, ny: 0, k: bounds.xMin }, { nx:-1, ny: 0, k:-bounds.xMax },
        { nx: 0, ny: 1, k: bounds.yMin }, { nx: 0, ny:-1, k:-bounds.yMax }
      ]);
      if (seg) segs.push(seg);
    }
    return segs;
  }
```

- [ ] **Step 4: Esportare la funzione**

Modificare il return di `ConicMath` (~riga 1109) — aggiungere `parabolaRegionSegments`, lasciare `parabolaSegmentsOblique` (rimosso nella Task 7):
```js
  return { circleVertices, ellipseVertices, hyperbolaVertices, parabolaSegments, parabolaRegionSegments, parabolaSegmentsOblique, runTests };
```

- [ ] **Step 5: Eseguire — deve passare**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(conicmath): parabolaRegionSegments esatta per ogni direttrice"
```

---

## Task 5: Riscrivere `GraphCalc._drawEllisse`

**Files:**
- Modify: `index.html` — `function _drawEllisse` (~riga 2809)

- [ ] **Step 1: Sostituire la funzione**

Rimpiazzare l'intera `function _drawEllisse(ctx,t,obj){ ... }` (~righe 2809–2845, dal commento `// ── ELLISSE — column scan ...` fino alla `}` che chiude la funzione) con:
```js
  // ── ELLISSE — poligono esatto (9 regioni via ConicMath) ──
  function _drawEllisse(ctx,t,obj){
    const {x1=0,y1=0,x2=2,y2=0,twoA=6}=obj.params;
    // Rette critiche tratteggiate
    [x1,x2].forEach(xv=>MiniEngine.drawSegment(ctx,t,{x:xv,y:-1000},{x:xv,y:1000},obj.color+'40',0.8,[3,4]));
    [y1,y2].forEach(yv=>MiniEngine.drawSegment(ctx,t,{x:-1000,y:yv},{x:1000,y:yv},obj.color+'40',0.8,[3,4]));
    const verts=ConicMath.ellipseVertices(x1,y1,x2,y2,twoA);
    if(verts && verts.length>=3){
      ctx.save();
      ctx.shadowColor=obj.color+'88'; ctx.shadowBlur=6;
      MiniEngine.drawPolyline(ctx,t,verts,obj.color,2.5,true);
      ctx.restore();
    }
    MiniEngine.drawPoint(ctx,t,x1,y1,obj.color,4);
    MiniEngine.drawPoint(ctx,t,x2,y2,obj.color,4);
  }
```

- [ ] **Step 2: Verifica sintassi (ConicMath ancora valido)**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed` (ConicMath non toccato; conferma che il file non è rotto).

- [ ] **Step 3: Verifica visiva**

Aprire `index.html` nel browser → aprire il Calcolatore Grafico → creare un'ellisse con fuochi obliqui (es. F₁ in basso-sx, F₂ in alto-dx) e 2a ampio. Confermare: poligono chiuso netto con eventuali lati piatti corretti, rette critiche tratteggiate visibili, nessun errore in console.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix(graphcalc): _drawEllisse usa il poligono esatto a 9 regioni"
```

---

## Task 6: Riscrivere `GraphCalc._drawIperbole`

**Files:**
- Modify: `index.html` — `function _drawIperbole` (~riga 2849)

- [ ] **Step 1: Sostituire la funzione**

Rimpiazzare l'intera `function _drawIperbole(ctx,t,obj){ ... }` (~righe 2847–2870, dal commento `// ── IPERBOLE — sign-change pixel ...` fino alla `}`) con:
```js
  // ── IPERBOLE — rami esatti (9 regioni via ConicMath), clip al viewport ──
  function _drawIperbole(ctx,t,obj){
    const {x1=0,y1=0,x2=4,y2=0,twoA=2}=obj.params;
    const canvas=document.getElementById('calc-canvas');
    const DPR=window.devicePixelRatio||1;
    const w=canvas.width/DPR, h=canvas.height/DPR;
    const vMin=t.toWorld(0,h), vMax=t.toWorld(w,0);
    // Rette critiche tratteggiate
    [x1,x2].forEach(xv=>MiniEngine.drawSegment(ctx,t,{x:xv,y:vMin.y},{x:xv,y:vMax.y},obj.color+'40',0.8,[3,4]));
    [y1,y2].forEach(yv=>MiniEngine.drawSegment(ctx,t,{x:vMin.x,y:yv},{x:vMax.x,y:yv},obj.color+'40',0.8,[3,4]));
    const result=ConicMath.hyperbolaVertices(x1,y1,x2,y2,twoA,
      {xMin:vMin.x,xMax:vMax.x,yMin:vMin.y,yMax:vMax.y});
    if(result){
      ctx.save(); ctx.shadowColor=obj.color+'88'; ctx.shadowBlur=6;
      [result.branch1,result.branch2].forEach(br=>
        br.forEach(seg=>MiniEngine.drawSegment(ctx,t,seg.from,seg.to,obj.color,2.5)));
      ctx.restore();
    }
    MiniEngine.drawPoint(ctx,t,x1,y1,obj.color,4);
    MiniEngine.drawPoint(ctx,t,x2,y2,obj.color,4);
  }
```

- [ ] **Step 2: Verifica sintassi**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`.

- [ ] **Step 3: Verifica visiva**

Browser → Calcolatore → creare un'iperbole con fuochi orizzontali (rami verticali netti a x=±1 per F(±3,0), 2a=2) e una con fuochi obliqui (rami poligonali che escono dal viewport). Pan/zoom: i rami riempiono lo schermo senza troncarsi. Nessun errore in console.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix(graphcalc): _drawIperbole rami esatti, clip al viewport"
```

---

## Task 7: Riscrivere `GraphCalc._drawParabola` (esatta) + rimuovere `parabolaSegmentsOblique`

**Files:**
- Modify: `index.html` — `function _drawParabola` (~riga 2873)
- Modify: `index.html` — rimuovere `function parabolaSegmentsOblique` (~righe 1075–1107)
- Modify: `index.html` — return pubblico di `ConicMath` (togliere `parabolaSegmentsOblique`)

- [ ] **Step 1: Sostituire `_drawParabola`**

Rimpiazzare l'intera `function _drawParabola(ctx,t,obj,w,h){ ... }` (~righe 2872–2893) con:
```js
  // ── PARABOLA — esatta per direttrice orizzontale/verticale/obliqua (regioni) ──
  function _drawParabola(ctx,t,obj,w,h){
    const{xF=0,yF=2,m=0,q=0,vertical=false}=obj.params;
    const vMin=t.toWorld(0,h),vMax=t.toWorld(w,0);
    // Direttrice (tratteggiata) come retta a*x + b*y + c = 0
    const a = vertical ? 1 : m;
    const b = vertical ? 0 : -1;
    const c = vertical ? -q : q;
    if(vertical){
      MiniEngine.drawSegment(ctx,t,{x:q,y:vMin.y},{x:q,y:vMax.y},obj.color+'59',1,[5,4]);
    } else {
      MiniEngine.drawSegment(ctx,t,{x:vMin.x,y:m*vMin.x+q},{x:vMax.x,y:m*vMax.x+q},obj.color+'59',1,[5,4]);
    }
    const segs=ConicMath.parabolaRegionSegments(xF,yF,a,b,c,
      {xMin:vMin.x,xMax:vMax.x,yMin:vMin.y,yMax:vMax.y});
    ctx.save(); ctx.shadowColor=obj.color+'88'; ctx.shadowBlur=6;
    segs.forEach(s=>MiniEngine.drawSegment(ctx,t,s.from,s.to,obj.color,2.5));
    ctx.restore();
    MiniEngine.drawPoint(ctx,t,xF,yF,obj.color,5);
  }
```

- [ ] **Step 2: Rimuovere `parabolaSegmentsOblique`**

Cancellare l'intera `function parabolaSegmentsOblique(xF, yF, a, b, c, worldBounds) { ... }` (~righe 1075–1107, incluso il commento `// Oblique directrix parabola...`).

- [ ] **Step 3: Togliere l'export**

Nel return di `ConicMath`, rimuovere `parabolaSegmentsOblique`:
```js
  return { circleVertices, ellipseVertices, hyperbolaVertices, parabolaSegments, parabolaRegionSegments, runTests };
```

- [ ] **Step 4: Verifica sintassi**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed` (nessun riferimento residuo a `parabolaSegmentsOblique`).

- [ ] **Step 5: Verifica visiva**

Browser → Calcolatore → creare parabole con direttrice **orizzontale**, **verticale** e **obliqua**. Tutte poligonali nette, niente artefatti; il vertice è equidistante; nessun errore in console.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "fix(graphcalc): parabola esatta per ogni direttrice; rimosso campionamento obliquo"
```

---

## Task 8: Aggiornare il mini-engine dell'iperbole

**Files:**
- Modify: `index.html` — blocco `if (conicType === 'hyperbola')` in `MiniEngine.create` (~righe 1283–1299)

- [ ] **Step 1: Aggiornare il rendering dei rami**

Nel blocco `if (conicType === 'hyperbola')`, sostituire la chiamata a `ConicMath.hyperbolaVertices` e il blocco `if (result) { drawPolyline(...branch1...); drawPolyline(...branch2...); }` con:
```js
        const result = ConicMath.hyperbolaVertices(x1, y1, x2, y2, twoA);
        [x1,x2].forEach(xv => drawSegment(ctx,t,{x:xv,y:-10},{x:xv,y:10},'rgba(245,158,11,0.25)',0.8,[3,4]));
        [y1,y2].forEach(yv => drawSegment(ctx,t,{x:-10,y:yv},{x:10,y:yv},'rgba(245,158,11,0.25)',0.8,[3,4]));
        if (result) {
          [result.branch1, result.branch2].forEach(branch =>
            branch.forEach(seg => drawSegment(ctx, t, seg.from, seg.to, color, 2.5)));
        }
```
(Rimuovere le due righe `drawSegment` per le rette critiche già presenti più sopra nel blocco, per non duplicarle: il blocco finale deve avere le rette critiche una sola volta. Mantenere invariati i `drawPoint` dei fuochi e l'`outputEl`.)

Nota: i fuochi sono ora passati come coppie reali `(x1,y1),(x2,y2)` (niente `Math.min/Math.max` indipendenti).

- [ ] **Step 2: Verifica sintassi**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`.

- [ ] **Step 3: Verifica visiva**

Browser → sezione teorica §3 (iperbole): muovere lo slider; i due rami si disegnano come segmenti netti, rette critiche presenti, fuochi corretti.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "fix(miniengine): iperbole disegnata a segmenti per ramo"
```

---

## Task 9: Verifica finale e pulizia

**Files:**
- Delete: `tools/test-conicmath.mjs`

- [ ] **Step 1: Suite completa verde**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`, exit 0.

- [ ] **Step 2: Verifica nel browser (checklist spec §8)**

Aprire `index.html`, console del browser, eseguire `ConicMath.runTests()` → log verde, nessun assert fallito. Poi nel Calcolatore verificare:
- ellisse obliqua col lato piatto corretto;
- iperbole orizzontale a x=±1; iperbole/parabola che riempiono il viewport con pan/zoom;
- parabola orizzontale, verticale e obliqua senza artefatti;
- rette critiche tratteggiate presenti su ellisse/iperbole;
- asse e circonferenza invariati, toggle "regioni" ancora funzionante;
- nessun errore in console all'apertura.

- [ ] **Step 3: Rimuovere l'harness temporaneo**

```bash
git rm --cached tools/test-conicmath.mjs 2>/dev/null; rm -f tools/test-conicmath.mjs; rmdir tools 2>/dev/null || true
```
(Se `tools/` non era stato committato, basta cancellare il file dal disco.)

- [ ] **Step 4: Commit finale (se restano modifiche)**

```bash
git add -A
git commit -m "chore: rimuove harness di test temporaneo" || echo "niente da committare"
```

---

## Self-review (note di copertura)

- **Spec §3 (clipper/sweep):** Task 1.
- **Spec §4 (ellisse):** Task 2 + Task 5; mini-engine ellisse beneficia automaticamente (usa già `ellipseVertices`+`drawPolyline`).
- **Spec §5 (iperbole):** Task 3 + Task 6 + Task 8.
- **Spec §6 (parabola ogni direttrice):** Task 4 + Task 7; `parabolaSegments` resta per il mini-engine parabola (orizzontale).
- **Spec §7 (test/regressioni):** Task 1–4 (asserzioni in `runTests`).
- **Spec §1.2 (segno rhs corretto):** formula `rhs = C + s1·(sxa·x1+sya·y1) + s2·(sxb·x2+syb·y2)` in `_gridLocusSegments` (Task 1).
- **Spec §9 (fuori scope):** asse/circonferenza e `_regionSegment`/`_clipSegment` mai modificati.
- **Firme pubbliche:** `ellipseVertices`/`parabolaSegments`/`runTests` invariate; `hyperbolaVertices` con `bounds` opzionale in coda (retro-compatibile); aggiunta `parabolaRegionSegments`; rimossa `parabolaSegmentsOblique` (sostituita).
