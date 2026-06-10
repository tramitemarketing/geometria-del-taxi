# Scrollytelling ellisse (S6) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NB:** feature pianificata, **non ancora schedulata** — esecuzione in blocco con le altre.

**Goal:** Nella sezione ellisse, lo scroll guida la costruzione a tappe del luogo nel mini-canvas (figura già sticky): rette critiche → 9 regioni → poligono progressivo → curva.

**Architecture:** Modalità "scrolly" nel `MiniEngine` (stato `scrollStage` + `setScrollStage(p)` + disegno a tappe per l'ellisse, riusando `ellipseVertices`/`polylineLength`); un modulo di scroll rAF-throttlato su `#ellisse` con fallback (mobile/reduced-motion → curva completa). Verifica: `node --check` + harness invariata + visiva.

**Tech Stack:** Vanilla JS/Canvas inline. Harness `tools/test-conicmath.mjs`.

**Spec:** `docs/superpowers/specs/2026-06-10-scrollytelling-ellisse-design.md`

**Vincoli:** solo sezione ellisse; nessun cambio di layout (sticky esistente); `ConicMath` invariato; `MiniEngine.create` retro-compatibile (`opts.scrolly`); convive con le altre feature dei mini-canvas (agiscono a `scrollStage=1`).

---

## Task 1: MiniEngine — modalità "scrolly" (costruzione a tappe)

**Files:** Modify `index.html` (IIFE `MiniEngine`: helper + `create`)

- [ ] **Step 1: Helper di modulo.** In `MiniEngine`, prima di `function create(`, inserire:
```js
  function _drawPartialPolyline(ctx,t,pts,closed,frac,color){
    if(!pts||pts.length<2)return;
    const total=ConicMath.polylineLength(pts,closed); let target=frac*total;
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=2.5;ctx.lineJoin='round';ctx.lineCap='round';
    ctx.beginPath();const s=t.toCanvas(pts[0].x,pts[0].y);ctx.moveTo(s.x,s.y);
    const n=closed?pts.length:pts.length-1;
    for(let i=0;i<n;i++){
      const a=pts[i],b=pts[(i+1)%pts.length],segLen=Math.hypot(b.x-a.x,b.y-a.y);
      if(target>=segLen){const c=t.toCanvas(b.x,b.y);ctx.lineTo(c.x,c.y);target-=segLen;}
      else{const tt=segLen<1e-9?0:target/segLen;const c=t.toCanvas(a.x+(b.x-a.x)*tt,a.y+(b.y-a.y)*tt);ctx.lineTo(c.x,c.y);break;}
    }
    ctx.stroke();ctx.restore();
  }
  function _drawCaption(ctx,text,size){
    ctx.save();ctx.font='11px IBM Plex Mono,monospace';ctx.fillStyle='rgba(255,255,255,0.6)';
    ctx.textAlign='center';ctx.textBaseline='top';ctx.fillText(text,size/2,6);ctx.restore();
  }
  // Costruzione a tappe dell'ellisse in funzione di stage∈[0,1).
  function _drawEllipseBuild(ctx,t,params,stage,color,outputEl,size){
    const { x1=-2,y1=-1, x2=2,y2=1, twoA=8 } = params;
    const a1=Math.max(0,Math.min(1,stage/0.2));            // rette critiche
    if(a1>0){ const o=Math.round(a1*80).toString(16).padStart(2,'0');
      [x1,x2].forEach(xv=>drawSegment(ctx,t,{x:xv,y:-10},{x:xv,y:10},'#3b82f6'+o,0.8,[3,4]));
      [y1,y2].forEach(yv=>drawSegment(ctx,t,{x:-10,y:yv},{x:10,y:yv},'#3b82f6'+o,0.8,[3,4]));
    }
    const a2=Math.max(0,Math.min(1,(stage-0.2)/0.25));     // 9 regioni
    if(a2>0){
      const xs=[Math.min(x1,x2),Math.max(x1,x2)], ys=[Math.min(y1,y2),Math.max(y1,y2)];
      const xB=[-10,xs[0],xs[1],10], yB=[-10,ys[0],ys[1],10];
      ctx.save();ctx.globalAlpha=a2*0.16;
      for(let c=0;c<3;c++)for(let r=0;r<3;r++){
        const ca=t.toCanvas(xB[c],yB[r+1]), cb=t.toCanvas(xB[c+1],yB[r]);
        ctx.fillStyle=((c+r)%2)?'#3b82f6':'#60a5fa';
        ctx.fillRect(ca.x,ca.y,cb.x-ca.x,cb.y-ca.y);
      }
      ctx.restore();
    }
    const frac=Math.max(0,Math.min(1,(stage-0.45)/0.4));   // poligono progressivo
    if(frac>0){
      const verts=ConicMath.ellipseVertices(x1,y1,x2,y2,twoA);
      if(verts && verts.length>=3){
        if(frac>=1) drawPolyline(ctx,t,verts,color,2.5,true);
        else _drawPartialPolyline(ctx,t,verts,true,frac,color);
      }
    }
    drawPoint(ctx,t,x1,y1,'rgb(96,165,250)',4);
    drawPoint(ctx,t,x2,y2,'rgb(96,165,250)',4);
    const cap = stage<0.2?'le rette critiche'
      : stage<0.45?'dividono il piano in 9 regioni'
      : stage<0.85?'in ogni regione i moduli si sciolgono → segmenti'
      : 'la curva: un poligono convesso';
    _drawCaption(ctx,cap,size);
    if(outputEl) outputEl.textContent = `costruzione · ${Math.round(stage*100)}%`;
  }
```

- [ ] **Step 2: Stato + opts in `create`.** Cambiare la firma (se non già fatto da un'altra feature) in `function create(canvasId, conicType, defaultParams, outputEl, opts) {` e, dopo `let params = { ...defaultParams };`, aggiungere (se non già presenti `opts`/`euclidOn`…):
```js
    opts = opts || {};
    let scrollStage = 1;
```
*(Se `opts = opts || {};` è già stato aggiunto da un'altra feature in coda, aggiungere solo `let scrollStage = 1;`.)*

- [ ] **Step 3: Gating nel blocco ellisse di `draw()`.** Trovare il blocco:
```js
      if (conicType === 'ellipse') {
        const { x1=-2,y1=0, x2=2,y2=0, twoA=6 } = params;
        const verts = ConicMath.ellipseVertices(
          Math.min(x1,x2), Math.min(y1,y2),
          Math.max(x1,x2), Math.max(y1,y2), twoA
        );
        // Region lines
        [x1,x2].forEach(xv => drawSegment(ctx,t,{x:xv,y:-10},{x:xv,y:10},'rgba(59,130,246,0.25)',0.8,[3,4]));
        [y1,y2].forEach(yv => drawSegment(ctx,t,{x:-10,y:yv},{x:10,y:yv},'rgba(59,130,246,0.25)',0.8,[3,4]));
        if (verts) drawPolyline(ctx, t, verts, color, 2.5, true);
        drawPoint(ctx, t, x1, y1, 'rgb(96,165,250)', 4);
        drawPoint(ctx, t, x2, y2, 'rgb(96,165,250)', 4);
        const d0 = Math.abs(x2-x1)+Math.abs(y2-y1);
        if (outputEl) outputEl.textContent =
          `d₀ = ${d0.toFixed(2)} | k = ${((twoA/2) - d0/2).toFixed(2)}`;
      }
```
e sostituirlo con:
```js
      if (conicType === 'ellipse') {
        if (opts.scrolly && scrollStage < 1) {
          _drawEllipseBuild(ctx, t, params, scrollStage, color, outputEl, size);
        } else {
        const { x1=-2,y1=0, x2=2,y2=0, twoA=6 } = params;
        const verts = ConicMath.ellipseVertices(
          Math.min(x1,x2), Math.min(y1,y2),
          Math.max(x1,x2), Math.max(y1,y2), twoA
        );
        // Region lines
        [x1,x2].forEach(xv => drawSegment(ctx,t,{x:xv,y:-10},{x:xv,y:10},'rgba(59,130,246,0.25)',0.8,[3,4]));
        [y1,y2].forEach(yv => drawSegment(ctx,t,{x:-10,y:yv},{x:10,y:yv},'rgba(59,130,246,0.25)',0.8,[3,4]));
        if (verts) drawPolyline(ctx, t, verts, color, 2.5, true);
        drawPoint(ctx, t, x1, y1, 'rgb(96,165,250)', 4);
        drawPoint(ctx, t, x2, y2, 'rgb(96,165,250)', 4);
        const d0 = Math.abs(x2-x1)+Math.abs(y2-y1);
        if (outputEl) outputEl.textContent =
          `d₀ = ${d0.toFixed(2)} | k = ${((twoA/2) - d0/2).toFixed(2)}`;
        }
      }
```
*(Nota: `size` è già definito all'inizio di `draw()` — `const size = canvas.width / DPR;`.)*

- [ ] **Step 4: Saltare il punto P durante il build.** Trovare nella `draw()` la chiamata `_drawProofPoint(ctx, t, conicType, params, pT, outputEl);` e sostituirla con:
```js
      if (!(opts.scrolly && scrollStage < 1)) _drawProofPoint(ctx, t, conicType, params, pT, outputEl);
```

- [ ] **Step 5: Metodo + export.** Aggiungere in `create` (prima del `return`):
```js
    function setScrollStage(p) { scrollStage = (typeof p==='number') ? Math.max(0,Math.min(1,p)) : 1; draw(); ensureLoop(); }
```
e nel `return { ... }` di `create`, aggiungere `setScrollStage`.

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
git commit -m "feat(miniengine): modalità scrolly per l'ellisse (costruzione a tappe)"
```

---

## Task 2: Modulo di scroll + abilitazione su meEllipse

**Files:** Modify `index.html` (chiamata `MiniEngine.create` per `me-ellipse` + modulo scroll nel bootstrap)

- [ ] **Step 1: Abilitare `scrolly` su meEllipse.** Trovare la chiamata `const meEllipse = MiniEngine.create('me-ellipse', 'ellipse', { x1: -2, y1: -1, x2: 2, y2: 1, twoA: 8 }, document.getElementById('me-ellipse-out'));` e aggiungere il 5° argomento `opts` con `scrolly:true`:
```js
const meEllipse = MiniEngine.create('me-ellipse', 'ellipse',
  { x1: -2, y1: -1, x2: 2, y2: 1, twoA: 8 },
  document.getElementById('me-ellipse-out'),
  { scrolly: true }
);
```
*(Se un'altra feature in coda ha già aggiunto un `opts` qui — es. `{ sweep:{…} }` — **unire** le chiavi: `{ sweep:{…}, scrolly:true }`.)*

- [ ] **Step 2: Modulo di scroll.** Nel blocco di bootstrap in fondo al file (dopo le `MiniEngine.create` e `Hero.init()`), inserire:
```js
(function ellipseScrolly(){
  const sec = document.getElementById('ellisse');
  const fig = sec && sec.querySelector('.section-figure');
  if (!sec || !fig || typeof meEllipse === 'undefined' || !meEllipse.setScrollStage) return;
  const reduced = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  let active = false, ticking = false;
  function enabled(){ return !reduced && getComputedStyle(fig).position === 'sticky'; }
  function update(){
    ticking = false;
    if (!enabled()) { meEllipse.setScrollStage(1); return; }
    const r = sec.getBoundingClientRect();
    const denom = r.height - window.innerHeight;
    const p = denom > 0 ? Math.max(0, Math.min(1, -r.top / denom)) : 1;
    meEllipse.setScrollStage(p);
  }
  function onScroll(){ if (active && !ticking) { ticking = true; requestAnimationFrame(update); } }
  const obs = new IntersectionObserver(es => {
    es.forEach(e => { active = e.isIntersecting; if (active) update(); else meEllipse.setScrollStage(1); });
  }, { threshold: 0 });
  obs.observe(sec);
  window.addEventListener('scroll', onScroll, { passive: true });
  window.addEventListener('resize', onScroll);
})();
```

- [ ] **Step 3: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva (desktop): scorrendo la sezione **ellisse**, la figura sticky resta ferma e la costruzione avanza — in cima solo fuochi+rette critiche; scendendo compaiono le 9 regioni, poi il poligono che si forma, infine la curva completa con P; le didascalie cambiano. Scrollata oltre, il mini-ellisse è interattivo. Su **mobile** (figura non sticky) e con **reduced-motion**: curva completa subito, nessun build. Le altre sezioni invariate; nessun errore in console.

- [ ] **Step 4: Commit.**
```bash
git add index.html
git commit -m "feat(scrollytelling): build scroll-driven dell'ellisse + fallback mobile/reduced-motion"
```

---

## Task 3: Verifica finale + roadmap

**Files:** Modify `docs/ROADMAP_MIGLIORAMENTI.md` (S6 → ✅)

- [ ] **Step 1: Sintassi + harness.**
```bash
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: "All assertions passed" + exit 0. Eliminare `tools/_chk.js`.

- [ ] **Step 2: Checklist visiva.** Build a tappe corretto scrollando l'ellisse; figura sticky; fallback mobile/reduced-motion alla curva piena; interattività ripristinata oltre la sezione; nessuna regressione altrove.

- [ ] **Step 3: Roadmap.** In `docs/ROADMAP_MIGLIORAMENTI.md` mettere Stato 📋 → ✅ per **S6**.

- [ ] **Step 4: Commit.**
```bash
git add docs/ROADMAP_MIGLIORAMENTI.md
git commit -m "docs: roadmap — scrollytelling ellisse (S6)"
```

---

## Self-review (copertura spec)

- **Spec §2 (scroll→stadio):** Task 2 (modulo `ellipseScrolly` con IntersectionObserver, rAF-throttle, fallback `enabled()`).
- **Spec §3 (modalità scrolly):** Task 1 (`opts.scrolly`, `scrollStage`, `setScrollStage`, gating nel blocco ellisse, P sospeso).
- **Spec §4 (tappe):** Task 1 (`_drawEllipseBuild`: rette critiche → 9 regioni → poligono progressivo → curva + didascalie; `_drawPartialPolyline` via `polylineLength`).
- **Spec §5 (architettura):** helper in `MiniEngine`; modulo scroll nel bootstrap; geometria riusata (`ellipseVertices`/`polylineLength`).
- **Spec §6 (verifica):** `node --check` + harness invariata + checklist visiva.
- **Spec §7/§8 (scope/vincoli):** solo ellisse; nessun cambio layout; `ConicMath` invariato; `opts` opzionale; convive con anima/euclidea/drag (a `scrollStage=1`).
- **Coerenza nomi:** `_drawEllipseBuild`/`_drawPartialPolyline`/`_drawCaption`; `opts.scrolly`; `scrollStage`; `setScrollStage`; modulo `ellipseScrolly`.
