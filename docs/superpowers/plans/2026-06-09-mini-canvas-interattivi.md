# Mini-canvas interattivi — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rendere interattivi i 4 mini-canvas didattici: trascinamento diretto di fuochi/centro + un punto P animato che dimostra la proprietà del luogo (scalette Manhattan + invariante costante).

**Architecture:** Geometria pura e testabile in `ConicMath` (concatenazione segmenti→polilinea, punto a frazione d'arco, proiezione, distanza L₁); interazione/animazione/disegno in `MiniEngine.create`, generalizzati per `conicType` tramite `_miniModel`. Le coniche taxicab sono poligonali, quindi P viaggia per lunghezza d'arco sulla polilinea della curva.

**Tech Stack:** Vanilla JS inline in `index.html`. Verifica headless con Node che estrae l'IIFE `ConicMath` e lancia `runTests()`. Pointer events per mouse+touch; `prefers-reduced-motion` rispettato.

**Spec:** `docs/superpowers/specs/2026-06-09-mini-canvas-interattivi-design.md`

**Convenzioni:**
- Solo JS inline; nessuna libreria; slider esistenti e firme pubbliche di `ConicMath` invariati (si aggiungono funzioni nuove).
- Coordinate in spazio mondo; `makeTransform` gestisce l'inversione y.
- I nuovi helper di `ConicMath` sono **pubblici** (servono a `MiniEngine`, un IIFE diverso) e quindi testabili con l'harness.
- L'harness `tools/test-conicmath.mjs` viene ricreato e **mantenuto** (strumento di sviluppo riusabile, non referenziato dall'app).

---

## Task 1: Harness + `taxiDist` + `l1Corner`

**Files:**
- Create: `tools/test-conicmath.mjs`
- Modify: `index.html` (IIFE `ConicMath`: nuove funzioni + export + asserzioni in `runTests`)

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
try { ConicMath = new Function(code + '\n;return ConicMath;')(); }
catch (e) { console.error('Eval error:', e.message); process.exit(2); }
try { ConicMath.runTests(); }
catch (e) { console.error('runTests threw:', e.message); process.exit(1); }
console.log(failures ? `\n${failures} assertion(s) FAILED` : '\nAll assertions passed');
process.exit(failures ? 1 : 0);
```

- [ ] **Step 2: Verificare baseline verde**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed` (codice attuale).

- [ ] **Step 3: Aggiungere asserzioni (test che fallisce)**

In `runTests()` (cerca `function runTests() {`), subito dopo la riga `function runTests() {`, inserire:
```js
    // taxiDist / l1Corner
    console.assert(taxiDist({x:0,y:0},{x:3,y:4}) === 7, 'taxiDist = 7');
    console.assert(taxiDist({x:-2,y:1},{x:1,y:-3}) === 7, 'taxiDist = 7 (b)');
    const _lc = l1Corner({x:1,y:2}, {x:5,y:9});
    console.assert(_lc.x === 5 && _lc.y === 2, 'l1Corner = (F.x, P.y)');
```

- [ ] **Step 4: Eseguire — deve fallire**

Run: `node tools/test-conicmath.mjs`
Expected: exit 1, "runTests threw: taxiDist is not defined".

- [ ] **Step 5: Implementare**

In `index.html`, dentro l'IIFE `ConicMath`, subito dopo la riga `const ConicMath = (() => {`, inserire:
```js
  // ── PUNTO P / GEOMETRIA DI PERCORSO (per i mini-canvas interattivi) ──
  // Distanza taxicab (L1) tra due punti.
  function taxiDist(a, b) { return Math.abs(a.x - b.x) + Math.abs(a.y - b.y); }

  // Angolo del percorso L1 "a scaletta" da P a F (orizzontale poi verticale).
  function l1Corner(P, F) { return { x: F.x, y: P.y }; }
```

- [ ] **Step 6: Esportare**

Nel `return { ... }` di `ConicMath`, aggiungere `taxiDist, l1Corner`:
```js
  return { circleVertices, ellipseVertices, hyperbolaVertices, parabolaSegments, parabolaRegionSegments, taxiDist, l1Corner, runTests };
```

- [ ] **Step 7: Eseguire — deve passare**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`.

- [ ] **Step 8: Commit**

```bash
git add tools/test-conicmath.mjs index.html
git commit -m "feat(conicmath): helper taxiDist/l1Corner + harness test"
```

---

## Task 2: `polylineFromSegments`

**Files:**
- Modify: `index.html` (`ConicMath`: funzione + export + asserzioni)

- [ ] **Step 1: Aggiungere asserzioni (test che fallisce)**

In `runTests()`, dopo le asserzioni del Task 1, inserire:
```js
    // polylineFromSegments: parabola → 1 polilinea connessa di 5 punti
    const _pseg = parabolaSegments(0, 2, 0, 5);
    const _plines = polylineFromSegments(_pseg);
    console.assert(_plines.length === 1, 'parabola → 1 polilinea');
    console.assert(_plines[0].length === 5, 'parabola polilinea 5 punti');
    // estremi consecutivi connessi (nessun salto)
    const _pl = _plines[0];
    let _ok = true;
    for (let i = 0; i < _pl.length - 1; i++) {
      // ogni coppia consecutiva proviene da un segmento (distanza > 0)
      if (taxiDist(_pl[i], _pl[i+1]) < 1e-9) _ok = false;
    }
    console.assert(_ok, 'parabola polilinea: punti distinti e ordinati');
    // iperbole: un ramo → 1 polilinea
    const _hr = hyperbolaVertices(-3, 0, 3, 0, 2, {xMin:-8,xMax:8,yMin:-8,yMax:8});
    const _hl = polylineFromSegments(_hr.branch1);
    console.assert(_hl.length === 1, 'ramo iperbole → 1 polilinea');
    console.assert(_hl[0].length >= 2, 'ramo iperbole: ≥2 punti');
```

- [ ] **Step 2: Eseguire — deve fallire**

Run: `node tools/test-conicmath.mjs`
Expected: exit 1, "runTests threw: polylineFromSegments is not defined".

- [ ] **Step 3: Implementare**

In `index.html`, dentro `ConicMath`, subito dopo `function l1Corner(...) { ... }`, inserire:
```js
  // Concatena segmenti {from,to} in una o più polilinee connesse e ordinate.
  function polylineFromSegments(segments) {
    const eps = 1e-6;
    const qk = p => Math.round(p.x / eps) + ',' + Math.round(p.y / eps);
    const adj = new Map();    // key -> [{ to, seg }]
    const nodePt = new Map(); // key -> {x,y}
    const node = p => { const k = qk(p); if (!nodePt.has(k)) nodePt.set(k, {x:p.x,y:p.y}); if (!adj.has(k)) adj.set(k, []); return k; };
    segments.forEach((s, i) => {
      const a = node(s.from), b = node(s.to);
      if (a === b) return;
      adj.get(a).push({ to: b, seg: i });
      adj.get(b).push({ to: a, seg: i });
    });
    const used = new Set();
    const out = [];
    function walk(startKey) {
      const line = [ nodePt.get(startKey) ];
      let cur = startKey;
      while (true) {
        const next = adj.get(cur).find(e => !used.has(e.seg));
        if (!next) break;
        used.add(next.seg);
        line.push(nodePt.get(next.to));
        cur = next.to;
      }
      return line;
    }
    const keys = [...adj.keys()];
    // prima dagli estremi aperti (grado dispari), poi gli anelli chiusi
    const order = keys.filter(k => adj.get(k).length % 2 === 1).concat(keys);
    for (const k of order) {
      if (adj.get(k).some(e => !used.has(e.seg))) {
        const line = walk(k);
        if (line.length >= 2) out.push(line);
      }
    }
    return out;
  }
```

- [ ] **Step 4: Esportare**

Aggiungere `polylineFromSegments` al `return` di `ConicMath`:
```js
  return { circleVertices, ellipseVertices, hyperbolaVertices, parabolaSegments, parabolaRegionSegments, taxiDist, l1Corner, polylineFromSegments, runTests };
```

- [ ] **Step 5: Eseguire — deve passare**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(conicmath): polylineFromSegments (segmenti → polilinea ordinata)"
```

---

## Task 3: `polylineLength` + `pointAtArcFraction` + `nearestArcFraction`

**Files:**
- Modify: `index.html` (`ConicMath`: 3 funzioni + export + asserzioni)

- [ ] **Step 1: Aggiungere asserzioni (test che fallisce)**

In `runTests()`, dopo le asserzioni del Task 2, inserire:
```js
    // pointAtArcFraction su un quadrato (perimetro 8)
    const _sq = [{x:0,y:0},{x:2,y:0},{x:2,y:2},{x:0,y:2}];
    console.assert(Math.abs(polylineLength(_sq, true) - 8) < 1e-9, 'perimetro quadrato = 8');
    const _q0 = pointAtArcFraction(_sq, 0, true);
    console.assert(_q0.x === 0 && _q0.y === 0, 'frac 0 → primo punto');
    const _q1 = pointAtArcFraction(_sq, 0.125, true); // 0.125*8 = 1 → (1,0)
    console.assert(Math.abs(_q1.x-1) < 1e-9 && Math.abs(_q1.y-0) < 1e-9, 'frac 0.125 → (1,0)');
    const _q2 = pointAtArcFraction(_sq, 0.5, true); // metà → (2,2)
    console.assert(Math.abs(_q2.x-2) < 1e-9 && Math.abs(_q2.y-2) < 1e-9, 'frac 0.5 → (2,2)');
    // aperto: f clampato in [0,1]
    const _open = [{x:0,y:0},{x:4,y:0}];
    const _qe = pointAtArcFraction(_open, 1, false);
    console.assert(Math.abs(_qe.x-4) < 1e-9, 'aperto frac 1 → ultimo punto');
    // nearestArcFraction: punto vicino a (1,0) sul quadrato → frazione ~0.125
    const _nf = nearestArcFraction(_sq, true, {x:1, y:-0.3});
    console.assert(Math.abs(_nf - 0.125) < 1e-6, 'nearestArcFraction ≈ 0.125');
```

- [ ] **Step 2: Eseguire — deve fallire**

Run: `node tools/test-conicmath.mjs`
Expected: exit 1, "runTests threw: polylineLength is not defined".

- [ ] **Step 3: Implementare**

In `index.html`, dentro `ConicMath`, subito dopo `function polylineFromSegments(...) { ... }`, inserire:
```js
  // Lunghezza euclidea totale di una polilinea (se closed, include il lato di chiusura).
  function polylineLength(pts, closed) {
    let L = 0;
    for (let i = 0; i < pts.length - 1; i++) L += Math.hypot(pts[i+1].x - pts[i].x, pts[i+1].y - pts[i].y);
    if (closed && pts.length > 1) { const a = pts[pts.length-1], b = pts[0]; L += Math.hypot(b.x - a.x, b.y - a.y); }
    return L;
  }

  // Punto alla frazione f della lunghezza d'arco. closed: wrap; aperto: clamp [0,1].
  function pointAtArcFraction(pts, f, closed) {
    if (!pts || pts.length === 0) return null;
    if (pts.length === 1) return { x: pts[0].x, y: pts[0].y };
    const total = polylineLength(pts, closed);
    if (total < 1e-12) return { x: pts[0].x, y: pts[0].y };
    const ff = closed ? f - Math.floor(f) : Math.max(0, Math.min(1, f));
    let target = ff * total;
    const n = closed ? pts.length : pts.length - 1;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i+1) % pts.length];
      const segLen = Math.hypot(b.x - a.x, b.y - a.y);
      if (target <= segLen || i === n - 1) {
        const tt = segLen < 1e-12 ? 0 : target / segLen;
        return { x: a.x + (b.x - a.x) * tt, y: a.y + (b.y - a.y) * tt };
      }
      target -= segLen;
    }
    return { x: pts[pts.length-1].x, y: pts[pts.length-1].y };
  }

  // Frazione d'arco del punto della polilinea più vicino a q (proiezione).
  function nearestArcFraction(pts, closed, q) {
    if (!pts || pts.length < 2) return 0;
    const total = polylineLength(pts, closed);
    if (total < 1e-12) return 0;
    const n = closed ? pts.length : pts.length - 1;
    let acc = 0, best = Infinity, bestArc = 0;
    for (let i = 0; i < n; i++) {
      const a = pts[i], b = pts[(i+1) % pts.length];
      const dx = b.x - a.x, dy = b.y - a.y, segLen2 = dx*dx + dy*dy;
      let tt = segLen2 < 1e-12 ? 0 : ((q.x - a.x) * dx + (q.y - a.y) * dy) / segLen2;
      tt = Math.max(0, Math.min(1, tt));
      const cx = a.x + dx * tt, cy = a.y + dy * tt;
      const d = Math.hypot(q.x - cx, q.y - cy);
      if (d < best) { best = d; bestArc = acc + Math.sqrt(segLen2) * tt; }
      acc += Math.sqrt(segLen2);
    }
    return bestArc / total;
  }
```

- [ ] **Step 4: Esportare**

Aggiungere le 3 funzioni al `return`:
```js
  return { circleVertices, ellipseVertices, hyperbolaVertices, parabolaSegments, parabolaRegionSegments, taxiDist, l1Corner, polylineFromSegments, polylineLength, pointAtArcFraction, nearestArcFraction, runTests };
```

- [ ] **Step 5: Eseguire — deve passare**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed`.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(conicmath): polylineLength/pointAtArcFraction/nearestArcFraction"
```

---

## Task 4: Test trasversale dell'invariante

**Files:**
- Modify: `index.html` (`runTests`: nuove asserzioni)

- [ ] **Step 1: Aggiungere il test (deve passare subito: verifica la coerenza dei pezzi)**

In `runTests()`, prima della riga `console.log('%c✓ ConicMath tests passed'...)`, inserire:
```js
    // Invariante costante muovendo P lungo la curva (dimostrazione del luogo)
    (() => {
      const verts = ellipseVertices(0, 0, 4, 2, 10);
      for (let i = 0; i <= 24; i++) {
        const P = pointAtArcFraction(verts, i/24, true);
        const s = taxiDist(P, {x:0,y:0}) + taxiDist(P, {x:4,y:2});
        console.assert(Math.abs(s - 10) < 1e-6, 'ellisse: somma = 2a, val=' + s.toFixed(4));
      }
    })();
    (() => {
      const r = hyperbolaVertices(-3, 0, 3, 0, 2, {xMin:-8,xMax:8,yMin:-8,yMax:8});
      const line = polylineFromSegments(r.branch1)[0];
      for (let i = 0; i <= 24; i++) {
        const P = pointAtArcFraction(line, i/24, false);
        const d = Math.abs(taxiDist(P, {x:-3,y:0}) - taxiDist(P, {x:3,y:0}));
        console.assert(Math.abs(d - 2) < 1e-6, 'iperbole: |diff| = 2a, val=' + d.toFixed(4));
      }
    })();
    (() => {
      const line = polylineFromSegments(parabolaSegments(0, 2, 0, 5))[0];
      for (let i = 0; i <= 24; i++) {
        const P = pointAtArcFraction(line, i/24, false);
        console.assert(Math.abs(taxiDist(P, {x:0,y:2}) - Math.abs(P.y - 0)) < 1e-6, 'parabola: d(P,F) = |y-k|');
      }
    })();
    (() => {
      const v = circleVertices(0, 0, 3);
      const sq = [v.VN, v.VE, v.VS, v.VW];
      for (let i = 0; i <= 24; i++) {
        const P = pointAtArcFraction(sq, i/24, true);
        console.assert(Math.abs(taxiDist(P, {x:0,y:0}) - 3) < 1e-6, 'circonferenza: d(P,C) = R');
      }
    })();
```

- [ ] **Step 2: Eseguire — deve passare**

Run: `node tools/test-conicmath.mjs`
Expected: `All assertions passed` (conferma che P-su-curva + invariante sono corretti per tutte le coniche).

- [ ] **Step 3: Commit**

```bash
git add index.html
git commit -m "test(conicmath): invariante costante di P lungo tutte le coniche"
```

---

## Task 5: `_miniModel` + `_drawProofPoint` + punto P statico nei mini-canvas

**Files:**
- Modify: `index.html` (IIFE `MiniEngine`: 2 funzioni a livello modulo + modifiche a `create`/`draw`)

Questa task tocca codice di rendering (non testabile dall'harness): verifica con `node --check` dell'intera pagina + controllo visivo.

- [ ] **Step 1: Aggiungere `_miniModel` e `_drawProofPoint` a livello modulo**

In `index.html`, dentro l'IIFE `MiniEngine`, subito PRIMA del commento `// Creates a mini-engine instance bound to a canvas element` (cioè prima di `function create(`), inserire:
```js
  // Modello per-conica: handle trascinabili, polilinea su cui scorre P, fuochi misurati, invariante.
  // Ritorna null se la conica è attualmente invalida.
  function _miniModel(conicType, params) {
    if (conicType === 'circle') {
      const { xc=0, yc=0, R=3 } = params;
      const v = ConicMath.circleVertices(xc, yc, R);
      return {
        handles: [{ x: xc, y: yc, keys: ['xc','yc'] }],
        path: { pts: [v.VN, v.VE, v.VS, v.VW], closed: true },
        foci: [{ x: xc, y: yc, color: '#ffffff' }],
        invariant: P => `d₁(P,C) = ${ConicMath.taxiDist(P, {x:xc,y:yc}).toFixed(2)} = R`
      };
    }
    if (conicType === 'ellipse') {
      const { x1=-2,y1=0, x2=2,y2=0, twoA=6 } = params;
      const verts = ConicMath.ellipseVertices(x1, y1, x2, y2, twoA);
      if (!verts || verts.length < 3) return null;
      return {
        handles: [{ x: x1, y: y1, keys: ['x1','y1'] }, { x: x2, y: y2, keys: ['x2','y2'] }],
        path: { pts: verts, closed: true },
        foci: [{ x: x1, y: y1, color: '#5eead4' }, { x: x2, y: y2, color: '#f9a8d4' }],
        invariant: P => `d₁(P,F₁)+d₁(P,F₂) = ${(ConicMath.taxiDist(P,{x:x1,y:y1}) + ConicMath.taxiDist(P,{x:x2,y:y2})).toFixed(2)} = 2a`
      };
    }
    if (conicType === 'hyperbola') {
      const { x1=-3,y1=0, x2=3,y2=0, twoA=2 } = params;
      const r = ConicMath.hyperbolaVertices(x1, y1, x2, y2, twoA, {xMin:-8,xMax:8,yMin:-8,yMax:8});
      if (!r) return null;
      const lines = ConicMath.polylineFromSegments(r.branch1).sort((a,b) => b.length - a.length);
      if (!lines.length) return null;
      return {
        handles: [{ x: x1, y: y1, keys: ['x1','y1'] }, { x: x2, y: y2, keys: ['x2','y2'] }],
        path: { pts: lines[0], closed: false },
        foci: [{ x: x1, y: y1, color: '#5eead4' }, { x: x2, y: y2, color: '#f9a8d4' }],
        invariant: P => `|d₁(P,F₁)−d₁(P,F₂)| = ${Math.abs(ConicMath.taxiDist(P,{x:x1,y:y1}) - ConicMath.taxiDist(P,{x:x2,y:y2})).toFixed(2)} = 2a`
      };
    }
    if (conicType === 'parabola') {
      const { xF=0, yF=2, k=0 } = params;
      const segs = ConicMath.parabolaSegments(xF, yF, k, 5);
      const lines = ConicMath.polylineFromSegments(segs).sort((a,b) => b.length - a.length);
      if (!lines.length) return null;
      return {
        handles: [{ x: xF, y: yF, keys: ['xF','yF'] }],
        path: { pts: lines[0], closed: false },
        foci: [{ x: xF, y: yF, color: '#5eead4' }],
        directrix: k,
        invariant: P => `d₁(P,F) = ${ConicMath.taxiDist(P,{x:xF,y:yF}).toFixed(2)} = |y−k|`
      };
    }
    return null;
  }

  // Disegna le scalette L1 da P ai fuochi, il punto P e l'invariante.
  function _drawProofPoint(ctx, t, conicType, params, pT, outputEl) {
    const model = _miniModel(conicType, params);
    if (!model) return;
    const P = ConicMath.pointAtArcFraction(model.path.pts, pT, model.path.closed);
    if (!P) return;
    model.foci.forEach(f => {
      const corner = ConicMath.l1Corner(P, f);
      drawSegment(ctx, t, P, corner, f.color + 'cc', 1.6);
      drawSegment(ctx, t, corner, f, f.color + 'cc', 1.6);
    });
    if (typeof model.directrix === 'number') {
      drawSegment(ctx, t, P, { x: P.x, y: model.directrix }, '#5eead4cc', 1.6, [3,3]);
    }
    drawPoint(ctx, t, P.x, P.y, 'rgb(255,255,255)', 4);
    if (outputEl) outputEl.textContent = model.invariant(P);
  }
```

- [ ] **Step 2: Aggiungere lo stato `pT` e l'helper `currentTransform` in `create`**

In `create`, trovare:
```js
    let params = { ...defaultParams };
    let rafId = null;
```
e sostituirlo con:
```js
    let params = { ...defaultParams };
    let rafId = null;
    let pT = 0.12;
    function currentTransform() {
      const size = canvas.width / DPR;
      return makeTransform({ width: size, height: size }, size / 12, 0, 0);
    }
```

- [ ] **Step 3: Usare `currentTransform` in `draw` e chiamare `_drawProofPoint`**

In `draw()`, trovare:
```js
      const scale = size / 12; // show ±6 units
      const t = makeTransform({ width: size, height: size }, scale, 0, 0);
      const color = COLORS[conicType] || '#e63946';
```
e sostituirlo con:
```js
      const t = currentTransform();
      const color = COLORS[conicType] || '#e63946';
```
Poi trovare la fine del blocco parabola e la chiusura di `draw()`:
```js
        if (outputEl) outputEl.textContent = `p = ${(yF-k).toFixed(2)} | F(${xF}, ${yF}) | y = ${k}`;
      }
    }
```
e sostituirlo con:
```js
        if (outputEl) outputEl.textContent = `p = ${(yF-k).toFixed(2)} | F(${xF}, ${yF}) | y = ${k}`;
      }

      _drawProofPoint(ctx, t, conicType, params, pT, outputEl);
    }
```

- [ ] **Step 4: Verifica sintassi + ConicMath**

Run:
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0, no output. Poi `node tools/test-conicmath.mjs` → "All assertions passed". Eliminare `tools/_chk.js`.

- [ ] **Step 5: Verifica visiva**

Aprire `index.html`, scorrere fino alle sezioni: ogni mini-canvas mostra un **punto P bianco sulla curva** con le **scalette colorate** verso i fuochi (e il segmento verticale alla direttrice per la parabola), e l'output mostra l'invariante. Nessun errore in console.

- [ ] **Step 6: Commit**

```bash
git add index.html
git commit -m "feat(miniengine): punto P dimostrativo statico + scalette + invariante"
```

---

## Task 6: Animazione di P (rAF, ping-pong, pausa fuori schermo / reduced-motion)

**Files:**
- Modify: `index.html` (`MiniEngine.create`: stato animazione + loop + IntersectionObserver)

- [ ] **Step 1: Aggiungere lo stato dell'animazione**

In `create`, trovare la riga `let pT = 0.12;` (aggiunta in Task 5) e sostituirla con:
```js
    let pT = 0.12, pDir = 1, lastTs = 0, visible = false, pointerInside = false, dragging = null;
    const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
```

- [ ] **Step 2: Sostituire `start`/`stop` e l'IntersectionObserver con la versione con loop**

In `create`, trovare:
```js
    function start() {
      if (!rafId) { resize(); draw(); }
    }
    function stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }

    // IntersectionObserver for lazy start
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { if (e.isIntersecting) { start(); obs.disconnect(); } });
    }, { threshold: 0.1 });
    obs.observe(canvas);

    return { draw, updateParam, start, stop };
```
e sostituirlo con:
```js
    let started = false;
    function start() {
      if (!started) { started = true; resize(); }
      draw();
      ensureLoop();
    }
    function stop() {
      if (rafId) { cancelAnimationFrame(rafId); rafId = null; }
    }
    function animating() {
      return started && visible && !reduced && !pointerInside && !dragging;
    }
    function ensureLoop() {
      if (animating() && rafId == null) { lastTs = 0; rafId = requestAnimationFrame(loop); }
    }
    function loop(ts) {
      if (!animating()) { rafId = null; draw(); return; }
      const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
      lastTs = ts;
      const model = _miniModel(conicType, params);
      if (model) {
        const speed = 0.16; // ~6 s per giro/passata
        if (model.path.closed) {
          pT = (pT + speed * dt) % 1;
        } else {
          pT += pDir * speed * dt;
          if (pT >= 1) { pT = 1; pDir = -1; }
          else if (pT <= 0) { pT = 0; pDir = 1; }
        }
      }
      draw();
      rafId = requestAnimationFrame(loop);
    }

    // IntersectionObserver: avvio lazy + pausa fuori schermo
    const obs = new IntersectionObserver(entries => {
      entries.forEach(e => { visible = e.isIntersecting; if (visible) start(); else stop(); });
    }, { threshold: 0.1 });
    obs.observe(canvas);

    return { draw, updateParam, start, stop };
```

- [ ] **Step 2b: Aggiornare `updateParam` per rilanciare il loop**

In `create`, trovare:
```js
    function updateParam(key, val) {
      params[key] = parseFloat(val);
      draw();
    }
```
e sostituirlo con:
```js
    function updateParam(key, val) {
      params[key] = parseFloat(val);
      draw();
      ensureLoop();
    }
```

- [ ] **Step 3: Verifica sintassi + ConicMath**

Run:
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Poi `node tools/test-conicmath.mjs` → "All assertions passed". Eliminare `tools/_chk.js`.

- [ ] **Step 4: Verifica visiva**

Aprire `index.html`: nelle 4 sezioni P **scorre da solo** lungo la curva (loop per cerchio/ellisse, avanti-indietro per iperbole/parabola), con scalette e invariante che si aggiornano e il **numero resta costante**. Scorrendo via dalla sezione l'animazione si ferma (nessun consumo CPU fuori schermo). Con `prefers-reduced-motion` attivo (DevTools → Rendering → Emulate CSS prefers-reduced-motion: reduce) P resta fermo.

- [ ] **Step 5: Commit**

```bash
git add index.html
git commit -m "feat(miniengine): animazione di P (loop/ping-pong, pausa off-screen + reduced-motion)"
```

---

## Task 7: Interazione puntatore (drag fuochi/centro + drag di P + pausa su hover)

**Files:**
- Modify: `index.html` (`MiniEngine.create`: listener pointer + cursori + touch)

- [ ] **Step 1: Aggiungere i listener prima del `return` di `create`**

In `create`, trovare la riga `obs.observe(canvas);` e, subito DOPO di essa (prima di `return { draw, updateParam, start, stop };`), inserire:
```js
    canvas.style.touchAction = 'none';
    function _ptr(e) { const r = canvas.getBoundingClientRect(); return { px: e.clientX - r.left, py: e.clientY - r.top }; }
    function _hitHandle(model, t, px, py) {
      for (const h of model.handles) { const c = t.toCanvas(h.x, h.y); if (Math.hypot(c.x - px, c.y - py) < 12) return h; }
      return null;
    }
    function _hitP(model, t, px, py) {
      const P = ConicMath.pointAtArcFraction(model.path.pts, pT, model.path.closed);
      if (!P) return false;
      const c = t.toCanvas(P.x, P.y);
      return Math.hypot(c.x - px, c.y - py) < 12;
    }
    canvas.addEventListener('pointerdown', e => {
      const model = _miniModel(conicType, params);
      if (!model) return;
      const t = currentTransform(), { px, py } = _ptr(e);
      const h = _hitHandle(model, t, px, py);
      if (h) dragging = { kind: 'handle', h };
      else if (_hitP(model, t, px, py)) dragging = { kind: 'P' };
      else return;
      try { canvas.setPointerCapture(e.pointerId); } catch (_) {}
      canvas.style.cursor = 'grabbing';
      e.preventDefault();
      stop(); draw();
    });
    canvas.addEventListener('pointermove', e => {
      const t = currentTransform(), { px, py } = _ptr(e);
      if (dragging) {
        const w = t.toWorld(px, py);
        if (dragging.kind === 'handle') {
          const keys = dragging.h.keys;
          const prev = { [keys[0]]: params[keys[0]], [keys[1]]: params[keys[1]] };
          params[keys[0]] = w.x; params[keys[1]] = w.y;
          if (!_miniModel(conicType, params)) Object.assign(params, prev);
        } else {
          const model = _miniModel(conicType, params);
          if (model) pT = ConicMath.nearestArcFraction(model.path.pts, model.path.closed, w);
        }
        draw();
        return;
      }
      const model = _miniModel(conicType, params);
      const over = !!model && (!!_hitHandle(model, t, px, py) || _hitP(model, t, px, py));
      canvas.style.cursor = over ? 'grab' : 'default';
    });
    function _endDrag(e) {
      if (!dragging) return;
      dragging = null;
      try { canvas.releasePointerCapture(e.pointerId); } catch (_) {}
      canvas.style.cursor = 'grab';
      ensureLoop();
    }
    canvas.addEventListener('pointerup', _endDrag);
    canvas.addEventListener('pointercancel', _endDrag);
    canvas.addEventListener('pointerenter', () => { pointerInside = true; stop(); draw(); });
    canvas.addEventListener('pointerleave', () => { pointerInside = false; ensureLoop(); });
```

- [ ] **Step 2: Verifica sintassi + ConicMath**

Run:
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Poi `node tools/test-conicmath.mjs` → "All assertions passed". Eliminare `tools/_chk.js`.

- [ ] **Step 3: Verifica visiva (desktop + touch)**

Aprire `index.html`:
- passando sopra un fuoco/centro il cursore diventa `grab`; trascinandolo la conica si aggiorna in tempo reale;
- trascinando i fuochi dell'ellisse fino al limite di validità la curva **non sparisce** (il passo invalido viene annullato);
- mentre il puntatore è dentro il canvas P si **ferma**; uscendo riparte;
- P è **afferrabile** e lo si trascina lungo la curva (scatta al punto più vicino);
- su mobile (o emulazione touch nei DevTools) il drag funziona e non fa scrollare la pagina mentre si trascina un handle/P.
Nessun errore in console.

- [ ] **Step 4: Commit**

```bash
git add index.html
git commit -m "feat(miniengine): drag di fuochi/centro e di P, pausa su hover, supporto touch"
```

---

## Task 8: Verifica finale + roadmap

**Files:**
- Modify: `docs/ROADMAP_MIGLIORAMENTI.md` (stato S1/S2/T1/T2 → ✅)

- [ ] **Step 1: Suite completa + sintassi**

Run:
```bash
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: "All assertions passed" + exit 0. Eliminare `tools/_chk.js`.

- [ ] **Step 2: Checklist visiva (spec §7)**

Browser: trascinamento fluido (mouse+touch), curva mai sparita ai bordi di validità, P animato che si ferma su hover ed è afferrabile, scalette e invariante corretti e costanti, reduced-motion rispettato, nessun errore in console, animazione in pausa fuori schermo.

- [ ] **Step 3: Aggiornare la roadmap**

In `docs/ROADMAP_MIGLIORAMENTI.md`, mettere lo Stato 📋 → ✅ per le righe **T1, T2, S1, S2**.

- [ ] **Step 4: Commit**

```bash
git add docs/ROADMAP_MIGLIORAMENTI.md
git commit -m "docs: roadmap — mini-canvas interattivi completati (T1/T2/S1/S2)"
```

---

## Self-review (copertura spec)

- **Spec §2 (helper puri):** Task 1 (`taxiDist`, `l1Corner`), Task 2 (`polylineFromSegments`), Task 3 (`polylineLength`, `pointAtArcFraction`, `nearestArcFraction`). `twoARange` rimosso in fase di spec (non serve: §4 usa revert-se-invalido).
- **Spec §3 (per-conica handle/path/foci/invariante):** Task 5 (`_miniModel`).
- **Spec §4 (interazione drag + revert-se-invalido + touch):** Task 7.
- **Spec §5 (animazione, ping-pong, pausa hover/off-screen/reduced-motion):** Task 6.
- **Spec §6 (disegno scalette + P + invariante):** Task 5 (`_drawProofPoint`).
- **Spec §7 (test):** Task 1–4 (unit + invariante trasversale); verifica visiva in Task 5–8.
- **Spec §8/§9 (fuori scope / vincoli):** nessuna modifica al calcolatore; tutto inline; slider e firme pubbliche esistenti invariati (solo aggiunte al `return` di `ConicMath`).
- **Coerenza nomi:** `_miniModel`/`_drawProofPoint`/`currentTransform`/`ensureLoop`/`loop`/`animating` usati coerentemente; `pT`, `dragging`, `pointerInside`, `visible`, `reduced` dichiarati in Task 5–6 e usati in Task 6–7.
