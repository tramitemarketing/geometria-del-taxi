# Mini-canvas: metamorfosi (S3) + euclidea fantasma (S4) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NB:** feature pianificata, **non ancora schedulata** — esecuzione in blocco con le altre.

**Goal:** Aggiungere ai 4 mini-canvas il toggle "▶ anima" (sweep del parametro) e "👻 euclidea" (conica euclidea fantasma sovrapposta).

**Architecture:** Generatori di coniche euclidee puri e testabili in `ConicMath`; `MiniEngine.create` esteso con stato/metodi per i due toggle, ghost in `draw()` e sweep nel loop rAF; i pulsanti e gli `id` degli slider nel markup. Verifica: harness (generatori euclidei) + `node --check` + visiva.

**Tech Stack:** Vanilla JS/Canvas inline. Harness `tools/test-conicmath.mjs`.

**Spec:** `docs/superpowers/specs/2026-06-10-metamorfosi-euclidea-fantasma-design.md`

**Vincoli:** coniche taxi e calcolatore invariati; `MiniEngine.create` retro-compatibile (nuovo `opts` opzionale); `prefers-reduced-motion` rispettato.

---

## Task 1: `ConicMath.euclidEllipsePoints` (TDD)

**Files:** Modify `index.html` (ConicMath: funzione + export + test)

- [ ] **Step 1: Test che fallisce.** In `runTests()`, prima di `console.log('%c✓ ConicMath tests passed'...)`, inserire:
```js
    // euclidEllipsePoints: somma distanze euclidee = 2a
    (() => {
      const eu=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
      const F1={x:-2,y:-1}, F2={x:2,y:1};
      const pts=euclidEllipsePoints(F1.x,F1.y,F2.x,F2.y,8,40);
      console.assert(pts && pts.length===40, 'euclidEllipse: 40 punti');
      pts.forEach(P=>console.assert(Math.abs(eu(P,F1)+eu(P,F2)-8)<1e-6,'euclidEllipse: somma=2a'));
      console.assert(euclidEllipsePoints(-3,0,3,0,4)===null,'euclidEllipse: null se 2a<=2c');
    })();
```

- [ ] **Step 2: Eseguire — deve fallire.** `node tools/test-conicmath.mjs` → "runTests threw: euclidEllipsePoints is not defined".

- [ ] **Step 3: Implementare.** Dentro `ConicMath` (es. dopo `parabolaRegionSegments`), inserire:
```js
  // ── CONICHE EUCLIDEE (per il confronto "fantasma" nei mini-canvas) ──
  function euclidEllipsePoints(x1,y1,x2,y2,twoA,n){
    n=n||96;
    const ox=(x1+x2)/2, oy=(y1+y2)/2, dx=x2-x1, dy=y2-y1;
    const ce=Math.hypot(dx,dy)/2, ae=twoA/2;
    if(ae<=ce+1e-9) return null;
    const be=Math.sqrt(ae*ae-ce*ce), th=Math.atan2(dy,dx), ct=Math.cos(th), st=Math.sin(th);
    const pts=[];
    for(let i=0;i<n;i++){ const t=2*Math.PI*i/n, lx=ae*Math.cos(t), ly=be*Math.sin(t);
      pts.push({x:ox+lx*ct-ly*st, y:oy+lx*st+ly*ct}); }
    return pts;
  }
```

- [ ] **Step 4: Esportare.** Aggiungere `euclidEllipsePoints` al `return` di `ConicMath`.

- [ ] **Step 5: Eseguire — deve passare.** `node tools/test-conicmath.mjs` → "All assertions passed".

- [ ] **Step 6: Commit.**
```bash
git add index.html
git commit -m "feat(conicmath): euclidEllipsePoints (ellisse euclidea dai fuochi)"
```

---

## Task 2: `ConicMath.euclidHyperbolaPoints` (TDD)

**Files:** Modify `index.html` (ConicMath: funzione + export + test)

- [ ] **Step 1: Test che fallisce.** In `runTests()`, dopo il test ellisse euclidea, inserire:
```js
    (() => {
      const eu=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
      const F1={x:-3,y:0}, F2={x:3,y:0};
      const r=euclidHyperbolaPoints(F1.x,F1.y,F2.x,F2.y,2,20,3);
      console.assert(r && r.branch1.length>1 && r.branch2.length>1,'euclidHyperbola: due rami');
      [...r.branch1,...r.branch2].forEach(P=>console.assert(Math.abs(Math.abs(eu(P,F1)-eu(P,F2))-2)<1e-6,'euclidHyperbola: |diff|=2a'));
      console.assert(euclidHyperbolaPoints(-1,0,1,0,4)===null,'euclidHyperbola: null se 2a>=2c');
    })();
```

- [ ] **Step 2: Eseguire — deve fallire.** `node tools/test-conicmath.mjs` → "euclidHyperbolaPoints is not defined".

- [ ] **Step 3: Implementare.** Dopo `euclidEllipsePoints`, inserire:
```js
  function euclidHyperbolaPoints(x1,y1,x2,y2,twoA,n,ext){
    n=n||64; ext=ext||4;
    const ox=(x1+x2)/2, oy=(y1+y2)/2, dx=x2-x1, dy=y2-y1;
    const ce=Math.hypot(dx,dy)/2, ae=twoA/2;
    if(ce<=ae+1e-9) return null;
    const be=Math.sqrt(ce*ce-ae*ae), th=Math.atan2(dy,dx), ct=Math.cos(th), st=Math.sin(th);
    function mk(sign){ const pts=[];
      for(let i=0;i<=n;i++){ const u=-ext+2*ext*i/n, lx=sign*ae*Math.cosh(u), ly=be*Math.sinh(u);
        pts.push({x:ox+lx*ct-ly*st, y:oy+lx*st+ly*ct}); }
      return pts; }
    return { branch1:mk(1), branch2:mk(-1) };
  }
```

- [ ] **Step 4: Esportare.** Aggiungere `euclidHyperbolaPoints` al `return`.

- [ ] **Step 5: Eseguire — deve passare.** `node tools/test-conicmath.mjs` → "All assertions passed".

- [ ] **Step 6: Commit.**
```bash
git add index.html
git commit -m "feat(conicmath): euclidHyperbolaPoints (iperbole euclidea dai fuochi)"
```

---

## Task 3: `ConicMath.euclidParabolaPoints` (TDD)

**Files:** Modify `index.html` (ConicMath: funzione + export + test)

- [ ] **Step 1: Test che fallisce.** In `runTests()`, dopo il test iperbole euclidea, inserire:
```js
    (() => {
      const eu=(p,q)=>Math.hypot(p.x-q.x,p.y-q.y);
      const F={x:0,y:2};
      const pts=euclidParabolaPoints(0,2,0,1,0,20,5);
      console.assert(pts && pts.length>1,'euclidParabola: punti');
      pts.forEach(P=>{ const dF=eu(P,F), dL=Math.abs(0*P.x+1*P.y+0)/1; console.assert(Math.abs(dF-dL)<1e-6,'euclidParabola: dist(F)=dist(retta)'); });
      console.assert(euclidParabolaPoints(0,0,0,1,0,10,5)===null,'euclidParabola: null se F sulla direttrice');
    })();
```

- [ ] **Step 2: Eseguire — deve fallire.** `node tools/test-conicmath.mjs` → "euclidParabolaPoints is not defined".

- [ ] **Step 3: Implementare.** Dopo `euclidHyperbolaPoints`, inserire:
```js
  function euclidParabolaPoints(xF,yF,a,b,c,n,ext){
    n=n||64; ext=ext||6;
    const nrm=Math.hypot(a,b); if(nrm<1e-9) return null;
    const sd=(a*xF+b*yF+c)/nrm, d=Math.abs(sd); if(d<1e-9) return null;
    const s=sd>=0?1:-1, ux=s*a/nrm, uy=s*b/nrm, tx=-uy, ty=ux;
    const vx=xF-(d/2)*ux, vy=yF-(d/2)*uy, pts=[];
    for(let i=0;i<=n;i++){ const yy=-ext+2*ext*i/n, xx=yy*yy/(2*d);
      pts.push({x:vx+xx*ux+yy*tx, y:vy+xx*uy+yy*ty}); }
    return pts;
  }
```

- [ ] **Step 4: Esportare.** Aggiungere `euclidParabolaPoints` al `return`.

- [ ] **Step 5: Eseguire — deve passare.** `node tools/test-conicmath.mjs` → "All assertions passed".

- [ ] **Step 6: Commit.**
```bash
git add index.html
git commit -m "feat(conicmath): euclidParabolaPoints (parabola euclidea da fuoco/direttrice)"
```

---

## Task 4: MiniEngine — ghost euclidea + sweep (logica JS)

**Files:** Modify `index.html` (IIFE `MiniEngine`: helper + `create`)

- [ ] **Step 1: Helper di modulo.** In `MiniEngine`, prima di `function create(`, inserire:
```js
  function _strokeDashedPath(ctx,t,pts,closed,color){
    if(!pts||pts.length<2)return;
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=1.5;ctx.setLineDash([4,4]);ctx.lineJoin='round';
    ctx.beginPath();const s=t.toCanvas(pts[0].x,pts[0].y);ctx.moveTo(s.x,s.y);
    for(let i=1;i<pts.length;i++){const p=t.toCanvas(pts[i].x,pts[i].y);ctx.lineTo(p.x,p.y);}
    if(closed)ctx.closePath();ctx.stroke();ctx.restore();
  }
  function _drawEuclidGhost(ctx,t,conicType,params){
    const col='rgba(255,255,255,0.42)';
    if(conicType==='circle'){const{xc=0,yc=0,R=3}=params;const pts=[];for(let i=0;i<=48;i++){const a=2*Math.PI*i/48;pts.push({x:xc+R*Math.cos(a),y:yc+R*Math.sin(a)});}_strokeDashedPath(ctx,t,pts,true,col);}
    else if(conicType==='ellipse'){const{x1=-2,y1=-1,x2=2,y2=1,twoA=8}=params;const pts=ConicMath.euclidEllipsePoints(x1,y1,x2,y2,twoA);if(pts)_strokeDashedPath(ctx,t,pts,true,col);}
    else if(conicType==='hyperbola'){const{x1=-3,y1=0,x2=3,y2=0,twoA=2}=params;const r=ConicMath.euclidHyperbolaPoints(x1,y1,x2,y2,twoA);if(r){_strokeDashedPath(ctx,t,r.branch1,false,col);_strokeDashedPath(ctx,t,r.branch2,false,col);}}
    else if(conicType==='parabola'){const{xF=0,yF=2,k=0}=params;const pts=ConicMath.euclidParabolaPoints(xF,yF,0,1,-k);if(pts)_strokeDashedPath(ctx,t,pts,false,col);}
  }
```

- [ ] **Step 2: Accettare `opts` e nuovo stato in `create`.** Cambiare la firma `function create(canvasId, conicType, defaultParams, outputEl) {` in `function create(canvasId, conicType, defaultParams, outputEl, opts) {` e, subito dopo `let params = { ...defaultParams };`, aggiungere:
```js
    opts = opts || {};
    let euclidOn = false, sweepOn = false, sweepDir = 1;
```

- [ ] **Step 3: Disegnare la ghost.** In `draw()`, trovare la riga che chiama il punto P:
```js
      _drawProofPoint(ctx, t, conicType, params, pT, outputEl);
```
e sostituire con:
```js
      if (euclidOn) _drawEuclidGhost(ctx, t, conicType, params);
      _drawProofPoint(ctx, t, conicType, params, pT, outputEl);
```

- [ ] **Step 4: Sweep nel loop.** Sostituire `animating()` e `loop()` con le versioni che gestiscono lo sweep. Trovare:
```js
    function animating() {
      return started && visible && !reduced && !pointerInside && !dragging;
    }
```
e sostituire con:
```js
    function animating() {
      return started && visible && !reduced && (sweepOn || (!pointerInside && !dragging));
    }
```
Poi trovare la funzione `loop(ts)` e sostituire il suo corpo (dalla riga `const dt = ...` fino a prima di `draw();`) in modo che l'avanzamento di `pT` sia condizionato e si aggiunga lo sweep. Forma finale di `loop`:
```js
    function loop(ts) {
      if (!animating()) { rafId = null; draw(); return; }
      const dt = lastTs ? Math.min(0.05, (ts - lastTs) / 1000) : 0;
      lastTs = ts;
      if (!pointerInside && !dragging) {
        const model = _miniModel(conicType, params);
        if (model) {
          const speed = 0.16;
          if (model.path.closed) { pT = (pT + speed * dt) % 1; }
          else { pT += pDir * speed * dt; if (pT >= 1) { pT = 1; pDir = -1; } else if (pT <= 0) { pT = 0; pDir = 1; } }
        }
      }
      if (sweepOn && opts.sweep) {
        const sw = opts.sweep;
        let val = params[sw.key] + sweepDir * (sw.max - sw.min) * 0.14 * dt;
        if (val >= sw.max) { val = sw.max; sweepDir = -1; }
        else if (val <= sw.min) { val = sw.min; sweepDir = 1; }
        params[sw.key] = val;
        if (sw.key === 'yF') params.k = 0;
        const sl = document.getElementById(sw.sliderId);
        if (sl) { sl.value = val; if (sl.nextElementSibling) sl.nextElementSibling.textContent = (Math.round(val * 2) / 2).toString(); }
      }
      draw();
      rafId = requestAnimationFrame(loop);
    }
```

- [ ] **Step 5: Metodi toggle + export.** Aggiungere, vicino alle altre funzioni di `create` (prima del `return`):
```js
    function toggleEuclid() { euclidOn = !euclidOn; draw(); }
    function toggleSweep() { sweepOn = !sweepOn; if (sweepOn) ensureLoop(); draw(); }
    function stopSweep() { sweepOn = false; }
```
e nel `return { ... }` di `create`, aggiungere `toggleEuclid, toggleSweep, stopSweep`.

- [ ] **Step 6: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
node tools/test-conicmath.mjs
```
Expected: exit 0; "All assertions passed". Eliminare `tools/_chk.js`.

- [ ] **Step 7: Commit.**
```bash
git add index.html
git commit -m "feat(miniengine): ghost euclidea + sweep parametro (logica)"
```

---

## Task 5: HTML — pulsanti, id slider, opts, CSS

**Files:** Modify `index.html` (CSS, 4 blocchi `.mini-engine-controls`, 4 chiamate `MiniEngine.create`)

- [ ] **Step 1: CSS pulsanti.** In fondo al `<style>`, aggiungere:
```css
    .mini-anim-btn { font-family:'IBM Plex Mono',monospace; font-size:0.6rem; letter-spacing:0.04em; background:#141414; border:1px solid #2a2a2a; color:rgba(255,255,255,0.5); padding:3px 8px; border-radius:4px; cursor:pointer; transition:color 0.1s,border-color 0.1s; }
    .mini-anim-btn.active { color:#fff; border-color:#6366f1; }
```

- [ ] **Step 2: Slider id + stopSweep + riga pulsanti — Cerchio.** Nel blocco controlli del cerchio, allo slider `R` aggiungere `id="me-circle-slider"` e nel suo `oninput` aggiungere `meCircle.stopSweep();`. Poi, dopo l'ultimo `.mini-ctrl-row` del cerchio (prima della `</div>` di `.mini-engine-controls`), inserire:
```html
            <div class="mini-ctrl-row" style="gap:6px;justify-content:flex-start;">
              <button type="button" class="mini-anim-btn" onclick="this.classList.toggle('active');meCircle.toggleSweep()">▶ anima</button>
              <button type="button" class="mini-anim-btn" onclick="this.classList.toggle('active');meCircle.toggleEuclid()">👻 euclidea</button>
            </div>
```

- [ ] **Step 3: Ellisse.** Allo slider `2a` dell'ellisse aggiungere `id="me-ellipse-slider"` e nel suo `oninput` aggiungere `meEllipse.stopSweep();`. Dopo il `.mini-ctrl-row` dell'ellisse inserire la riga pulsanti analoga con `meEllipse.toggleSweep()` / `meEllipse.toggleEuclid()`.

- [ ] **Step 4: Iperbole.** Allo slider `2a` dell'iperbole aggiungere `id="me-hyperbola-slider"` e `meHyperbola.stopSweep();` nell'`oninput`. Aggiungere la riga pulsanti con `meHyperbola.toggleSweep()` / `meHyperbola.toggleEuclid()`.

- [ ] **Step 5: Parabola.** Allo slider `p` della parabola aggiungere `id="me-parabola-slider"` e `meParabola.stopSweep();` nell'`oninput`. Aggiungere la riga pulsanti con `meParabola.toggleSweep()` / `meParabola.toggleEuclid()`.

- [ ] **Step 6: Passare il `sweep` config alle create.** Aggiornare le 4 chiamate `MiniEngine.create` aggiungendo il 5° argomento `opts`:
```js
const meCircle = MiniEngine.create('me-circle', 'circle',
  { xc: 0, yc: 0, R: 3 },
  document.getElementById('me-circle-out'),
  { sweep:{ key:'R', min:0.5, max:5, sliderId:'me-circle-slider' } }
);
const meEllipse = MiniEngine.create('me-ellipse', 'ellipse',
  { x1: -2, y1: -1, x2: 2, y2: 1, twoA: 8 },
  document.getElementById('me-ellipse-out'),
  { sweep:{ key:'twoA', min:3, max:14, sliderId:'me-ellipse-slider' } }
);
const meHyperbola = MiniEngine.create('me-hyperbola', 'hyperbola',
  { x1: -3, y1: 0, x2: 3, y2: 0, twoA: 2 },
  document.getElementById('me-hyperbola-out'),
  { sweep:{ key:'twoA', min:0.5, max:5, sliderId:'me-hyperbola-slider' } }
);
const meParabola = MiniEngine.create('me-parabola', 'parabola',
  { xF: 0, yF: 2, k: 0 },
  document.getElementById('me-parabola-out'),
  { sweep:{ key:'yF', min:0.5, max:4, sliderId:'me-parabola-slider' } }
);
```

- [ ] **Step 7: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: in ogni sezione, "👻 euclidea" sovrappone la conica euclidea tratteggiata tenue (cerchio↔rombo, ellisse euclidea↔poligono, ecc.); "▶ anima" fa variare il parametro con slider e output sincronizzati, e il punto P resta sulla forma che muta; toccando lo slider lo sweep si ferma; ripremendo "▶" si ferma; `reduced-motion` non avvia lo sweep; nessun errore in console.

- [ ] **Step 8: Commit.**
```bash
git add index.html
git commit -m "feat(miniengine): pulsanti anima/euclidea + id slider + config sweep"
```

---

## Task 6: Verifica finale + roadmap

**Files:** Modify `docs/ROADMAP_MIGLIORAMENTI.md` (S3/S4 → ✅)

- [ ] **Step 1: Sintassi + harness.**
```bash
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: "All assertions passed" + exit 0. Eliminare `tools/_chk.js`.

- [ ] **Step 2: Checklist visiva.** Ghost euclidea corretta sulle 4 coniche; sweep fluido e sincronizzato; P sulla forma che muta; toggle che si fermano; reduced-motion rispettato; mini-canvas/calcolatore invariati per il resto.

- [ ] **Step 3: Roadmap.** In `docs/ROADMAP_MIGLIORAMENTI.md` mettere Stato 📋 → ✅ per **S3** e **S4**.

- [ ] **Step 4: Commit.**
```bash
git add docs/ROADMAP_MIGLIORAMENTI.md
git commit -m "docs: roadmap — metamorfosi + euclidea fantasma (S3/S4)"
```

---

## Self-review (copertura spec)

- **Spec §2 (generatori euclidei):** Task 1–3 (`euclidEllipsePoints`/`euclidHyperbolaPoints`/`euclidParabolaPoints`, con test della proprietà definente e casi `null`).
- **Spec §3 (ghost euclidea):** Task 4 (`_drawEuclidGhost`/`_strokeDashedPath` + `toggleEuclid` + hook in `draw`) + Task 5 (pulsante "👻 euclidea").
- **Spec §4 (sweep):** Task 4 (`toggleSweep`/`stopSweep` + `opts.sweep` + `animating`/`loop` con avanzamento parametro e sync slider) + Task 5 (pulsante "▶ anima", id slider, `oninput` con `stopSweep`, `sweep` config).
- **Spec §5 (architettura):** generatori in `ConicMath`; `MiniEngine.create` esteso retro-compatibile; HTML wiring in Task 5.
- **Spec §6 (verifica):** harness (Task 1–3) + visiva (Task 5–6); P/coniche taxi invariate.
- **Spec §7/§8 (scope/vincoli):** solo mini-canvas; taxi/calcolatore invariati; `prefers-reduced-motion` gestito in `animating()`.
- **Coerenza nomi:** `euclid*Points`; `_drawEuclidGhost`/`_strokeDashedPath`; `euclidOn/sweepOn/sweepDir`; `toggleEuclid/toggleSweep/stopSweep`; `opts.sweep:{key,min,max,sliderId}`; slider id `me-<tipo>-slider`.
