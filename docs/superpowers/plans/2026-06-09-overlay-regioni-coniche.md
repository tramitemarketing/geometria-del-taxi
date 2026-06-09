# Overlay "regioni" per tutte le coniche (T3) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NB:** feature pianificata ma **non ancora schedulata** — verrà eseguita in blocco con le altre.

**Goal:** Estendere l'overlay didattico "Analisi regioni e equazioni" (oggi asse/circonferenza) a ellisse, iperbole e parabola nel calcolatore.

**Architecture:** Generalizzazione degli helper di griglia esistenti (`_regionSegment`/`_buildEquationLines` → versioni parametriche `(s1,s2,C)`; l'asse resta identico via wrapper) per ellisse/iperbole; modello a 3 rette/8 celle per la parabola, con un nuovo helper puro `ConicMath.clipPolygonHalfplane` per l'evidenziazione poligonale e riuso di `parabolaRegionSegments` per il segmento. Verifica: harness Node per il solo helper poligonale; il resto è rendering → `node --check` + verifica visiva (inclusa la regressione asse/circonferenza, da confrontare a vista).

**Tech Stack:** Vanilla JS/Canvas inline in `index.html`. Harness `tools/test-conicmath.mjs`.

**Spec:** `docs/superpowers/specs/2026-06-09-overlay-regioni-coniche-design.md`

**Vincoli:** tutto inline; asse e circonferenza e il loro overlay invariati; firme pubbliche di `ConicMath` invariate salvo aggiunta di `clipPolygonHalfplane`.

---

## Task 1: `ConicMath.clipPolygonHalfplane` (TDD)

**Files:** Modify `index.html` (IIFE `ConicMath`: funzione + export + asserzioni)

- [ ] **Step 1: Asserzioni (test che fallisce).** In `runTests()`, subito prima di `console.log('%c✓ ConicMath tests passed'...)`, inserire:
```js
    // clipPolygonHalfplane (Sutherland–Hodgman, un semipiano)
    const _sqp = [{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}];
    const _area = p => { let s=0; for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];s+=a.x*b.y-b.x*a.y;} return Math.abs(s)/2; };
    const _cp1 = clipPolygonHalfplane(_sqp, 1, 0, 2);   // x >= 2
    console.assert(_cp1.length >= 3 && _cp1.every(p=>p.x>=2-1e-9), 'clip x>=2: tutti i vertici x>=2');
    console.assert(Math.abs(_area(_cp1)-8) < 1e-9, 'clip x>=2: area = 8');
    const _cp2 = clipPolygonHalfplane(_sqp, 1, 0, 10);  // x >= 10 esclude tutto
    console.assert(_cp2.length === 0, 'clip x>=10: poligono vuoto');
    const _cp3 = clipPolygonHalfplane(_sqp, 1, 0, 0);   // x >= 0 contiene tutto
    console.assert(Math.abs(_area(_cp3)-16) < 1e-9, 'clip x>=0: area = 16');
```

- [ ] **Step 2: Eseguire — deve fallire.** `node tools/test-conicmath.mjs` → exit 1, "runTests threw: clipPolygonHalfplane is not defined".

- [ ] **Step 3: Implementare.** Dentro l'IIFE `ConicMath` (es. subito dopo `function parabolaRegionSegments(...) { ... }`), inserire:
```js
  // Interseca un poligono (array di {x,y}) col semipiano nx*x + ny*y >= k.
  // Sutherland–Hodgman per un singolo bordo di clip. Ritorna il poligono risultante (può essere vuoto).
  function clipPolygonHalfplane(poly, nx, ny, k) {
    const eps = 1e-9;
    const out = [];
    const n = poly.length;
    for (let i = 0; i < n; i++) {
      const A = poly[i], B = poly[(i + 1) % n];
      const dA = nx * A.x + ny * A.y - k, dB = nx * B.x + ny * B.y - k;
      const inA = dA >= -eps, inB = dB >= -eps;
      if (inA) out.push({ x: A.x, y: A.y });
      if (inA !== inB) {
        const tt = dA / (dA - dB);
        out.push({ x: A.x + (B.x - A.x) * tt, y: A.y + (B.y - A.y) * tt });
      }
    }
    return out;
  }
```

- [ ] **Step 4: Esportare.** Nel `return { ... }` di `ConicMath`, aggiungere `clipPolygonHalfplane` (mantenere tutto il resto).

- [ ] **Step 5: Eseguire — deve passare.** `node tools/test-conicmath.mjs` → "All assertions passed".

- [ ] **Step 6: Commit.**
```bash
git add index.html
git commit -m "feat(conicmath): clipPolygonHalfplane (Sutherland–Hodgman, un semipiano)"
```

---

## Task 2: Generalizzare `_regionSegmentG` + `_buildEquationLinesG`

**Files:** Modify `index.html` (GraphCalc: `_regionSegment`, `_buildEquationLines`)

L'asse deve restare **identico**: si introducono versioni parametriche e si trasformano le due funzioni esistenti in wrapper.

- [ ] **Step 1: Sostituire `_regionSegment`.** Trovare:
```js
  function _regionSegment(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax){
    const rxMin=Math.max(xBounds[col],vMin.x-1),rxMax=Math.min(xBounds[col+1],vMax.x+1);
    const ryMin=Math.max(yBounds[row],vMin.y-1),ryMax=Math.min(yBounds[row+1],vMax.y+1);
    if(rxMin>=rxMax||ryMin>=ryMax)return null;
    const xRep=(rxMin+rxMax)/2,yRep=(ryMin+ryMax)/2;
    const sxa=xRep>=x1?1:-1,sxb=xRep>=x2?1:-1,sya=yRep>=y1?1:-1,syb=yRep>=y2?1:-1;
    const cx=sxa-sxb,cy=sya-syb,cst=sxa*x1+sya*y1-sxb*x2-syb*y2;
    return{rxMin,rxMax,ryMin,ryMax,sxa,sxb,sya,syb,cx,cy,cst,xRep,yRep};
  }
```
e sostituire con:
```js
  function _regionSegmentG(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax,s1,s2,C){
    const rxMin=Math.max(xBounds[col],vMin.x-1),rxMax=Math.min(xBounds[col+1],vMax.x+1);
    const ryMin=Math.max(yBounds[row],vMin.y-1),ryMax=Math.min(yBounds[row+1],vMax.y+1);
    if(rxMin>=rxMax||ryMin>=ryMax)return null;
    const xRep=(rxMin+rxMax)/2,yRep=(ryMin+ryMax)/2;
    const sxa=xRep>=x1?1:-1,sxb=xRep>=x2?1:-1,sya=yRep>=y1?1:-1,syb=yRep>=y2?1:-1;
    const cx=s1*sxa+s2*sxb,cy=s1*sya+s2*syb,cst=C+s1*(sxa*x1+sya*y1)+s2*(sxb*x2+syb*y2);
    return{rxMin,rxMax,ryMin,ryMax,sxa,sxb,sya,syb,cx,cy,cst,xRep,yRep};
  }
  function _regionSegment(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax){
    return _regionSegmentG(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax,1,-1,0);
  }
```

- [ ] **Step 2: Sostituire `_buildEquationLines`.** Trovare l'intera `function _buildEquationLines(sxa,sxb,sya,syb,x1,y1,x2,y2,cx,cy,cst){ ... }` e sostituirla con:
```js
  function _buildEquationLinesG(s1,s2,C,sxa,sxb,sya,syb,x1,y1,x2,y2,cx,cy,cst){
    function f(n){const r=Math.round(n*1000)/1000;if(r===0)return'0';if(r===Math.round(r))return String(r);return String(r);}
    function absStr(v,val){if(Math.abs(val)<1e-9)return`|${v}|`;if(val>0)return`|${v} − ${f(val)}|`;return`|${v} + ${f(-val)}|`;}
    function expandedTerm(sign,v,val){const vp=sign>0?v:`−${v}`;if(Math.abs(val)<1e-9)return vp;const c=-sign*val;return c>0?`${vp} + ${f(c)}`:`${vp} − ${f(-c)}`;}
    function join(t1,t2){return t2.startsWith('−')?`${t1} − ${t2.substring(1)}`:`${t1} + ${t2}`;}
    const TA=`${absStr('x',x1)} + ${absStr('y',y1)}`, TB=`${absStr('x',x2)} + ${absStr('y',y2)}`;
    let l1; if(s2>0)l1=`${TA} + ${TB} = ${f(C)}`; else if(Math.abs(C)<1e-9)l1=`${TA} = ${TB}`; else l1=`${TA} − (${TB}) = ${f(C)}`;
    const TAe=join(expandedTerm(sxa,'x',x1),expandedTerm(sya,'y',y1)), TBe=join(expandedTerm(sxb,'x',x2),expandedTerm(syb,'y',y2));
    let l2; if(s2>0)l2=`${TAe} + ${TBe} = ${f(C)}`; else if(Math.abs(C)<1e-9)l2=`${TAe} = ${TBe}`; else l2=`${TAe} − (${TBe}) = ${f(C)}`;
    if(cx===0&&cy===0){const l3=`0 = ${f(cst)}`;const l4=Math.abs(cst)<1e-9?'→ tutto il piano':'→ nessuna soluzione';return[l1,l2,l3,l4];}
    let lhsStr='';
    if(cx!==0)lhsStr=cx===2?'2x':cx===-2?'−2x':`${cx}x`;
    if(cy!==0){const cyStr=Math.abs(cy)===2?'2y':`${Math.abs(cy)}y`;if(lhsStr)lhsStr+=cy>0?` + ${cyStr}`:` − ${cyStr}`;else lhsStr=cy>0?cyStr:`−${cyStr}`;}
    const l3=`${lhsStr} = ${f(cst)}`;
    let l4;
    if(cy===0)l4=`→  x = ${f(cst/cx)}`;
    else if(cx===0)l4=`→  y = ${f(cst/cy)}`;
    else{const b=cst/cy,slope=-cx/cy;if(slope>0)l4=b===0?'→  y = x':b>0?`→  y = x + ${f(b)}`:`→  y = x − ${f(-b)}`;else l4=b===0?'→  y = −x':b>0?`→  y = −x + ${f(b)}`:`→  y = −x − ${f(-b)}`;}
    return[l1,l2,l3,l4];
  }
  function _buildEquationLines(sxa,sxb,sya,syb,x1,y1,x2,y2,cx,cy,cst){
    return _buildEquationLinesG(1,-1,0,sxa,sxb,sya,syb,x1,y1,x2,y2,cx,cy,cst);
  }
```

- [ ] **Step 3: Verifica sintassi + harness.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
node tools/test-conicmath.mjs
```
Expected: exit 0; "All assertions passed". Eliminare `tools/_chk.js`.

- [ ] **Step 4: Verifica visiva (regressione asse).** Aprire il calcolatore, creare un **asse**, isolarlo, attivare "Analisi regioni e equazioni", muovere il mouse: l'overlay e il box devono essere **identici a prima** (rette critiche, cella, segmento bianco, le 4 righe dell'equazione). Idem **circonferenza**. Nessun errore in console.

- [ ] **Step 5: Commit.**
```bash
git add index.html
git commit -m "refactor(graphcalc): _regionSegmentG/_buildEquationLinesG parametrici (asse invariato)"
```

---

## Task 3: Overlay ellisse + helper di disegno condivisi

**Files:** Modify `index.html` (GraphCalc: helper, `_drawEllisseRegions`, hook in `_drawEllisse`, toggle sidebar)

- [ ] **Step 1: Aggiungere gli helper condivisi + `_drawEllisseRegions`.** Subito DOPO `function _buildEquationLines(...) { ... }` (fine del blocco del Task 2), inserire:
```js
  // Disegna in bianco il segmento del luogo cx*x+cy*y=cst nella cella [rxMin,rxMax]×[ryMin,ryMax].
  function _strokeCellSegment(ctx,t,cx,cy,cst,rxMin,rxMax,ryMin,ryMax,color){
    if(cx===0&&cy===0)return;
    let seg;
    if(cy===0){const wx=cst/cx;seg=_clipSegment(wx,ryMin,wx,ryMax,rxMin,rxMax,ryMin,ryMax);}
    else if(cx===0){const wy=cst/cy;seg=_clipSegment(rxMin,wy,rxMax,wy,rxMin,rxMax,ryMin,ryMax);}
    else{seg=_clipSegment(rxMin,(cst-cx*rxMin)/cy,rxMax,(cst-cx*rxMax)/cy,rxMin,rxMax,ryMin,ryMax);}
    if(!seg)return;
    const p0=t.toCanvas(seg[0][0],seg[0][1]),p1e=t.toCanvas(seg[1][0],seg[1][1]);
    ctx.save();ctx.strokeStyle=color;ctx.lineWidth=3.5;ctx.lineCap='round';ctx.shadowColor='rgba(255,255,255,0.8)';ctx.shadowBlur=14;
    ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1e.x,p1e.y);ctx.stroke();ctx.restore();
  }
  // Disegna il box con le righe dell'equazione, centrato su (cxTarget,cyTarget) in canvas e clampato.
  function _drawEqBox(ctx,lines,cxTarget,cyTarget,w,h){
    ctx.save();ctx.font='12.5px IBM Plex Mono,monospace';
    const lineH=20,pad=14,maxW=Math.max(...lines.map(l=>ctx.measureText(l).width));
    const boxW=maxW+pad*2,boxH=lines.length*lineH+pad*1.5;
    const ctrX=Math.max(boxW/2+8,Math.min(w-boxW/2-8,cxTarget));
    const ctrY=Math.max(boxH/2+8,Math.min(h-boxH/2-8,cyTarget));
    const bx=ctrX-boxW/2,by=ctrY-boxH/2;
    ctx.fillStyle='rgba(10,12,28,0.92)';ctx.strokeStyle='rgba(99,102,241,0.45)';ctx.lineWidth=1;
    ctx.beginPath();ctx.roundRect(bx,by,boxW,boxH,7);ctx.fill();ctx.stroke();
    const lc=['rgba(255,255,255,0.42)','rgba(226,232,240,0.9)','rgba(245,158,11,0.95)','#22c55e','rgba(148,163,184,0.75)'];
    ctx.textAlign='left';ctx.textBaseline='top';
    lines.forEach((line,i)=>{
      ctx.fillStyle=lc[Math.min(i,lc.length-1)];
      ctx.font=i===0?'11px IBM Plex Mono,monospace':i===3?'bold 13px IBM Plex Mono,monospace':'12.5px IBM Plex Mono,monospace';
      ctx.fillText(line,bx+pad,by+pad*0.75+i*lineH);
    });ctx.restore();
  }
  // Rette critiche tratteggiate per la griglia 9 regioni.
  function _drawGridCriticalLines(ctx,t,xs,ys,w,h){
    ctx.save();ctx.strokeStyle='rgba(160,160,255,0.35)';ctx.lineWidth=1;ctx.setLineDash([5,4]);
    for(const xv of xs){const cx=t.toCanvas(xv,0).x;ctx.beginPath();ctx.moveTo(cx,0);ctx.lineTo(cx,h);ctx.stroke();}
    for(const yv of ys){const cy=t.toCanvas(0,yv).y;ctx.beginPath();ctx.moveTo(0,cy);ctx.lineTo(w,cy);ctx.stroke();}
    ctx.setLineDash([]);ctx.restore();
  }
  function _drawEllisseRegions(ctx,t,obj,vMin,vMax,w,h){
    const{x1=0,y1=0,x2=2,y2=0,twoA=6}=obj.params;
    const[xL,xR]=x1<=x2?[x1,x2]:[x2,x1],[yB,yT]=y1<=y2?[y1,y2]:[y2,y1];
    const INF=1e9, xBounds=[-INF,xL,xR,INF], yBounds=[-INF,yB,yT,INF];
    _drawGridCriticalLines(ctx,t,[xL,xR],[yB,yT],w,h);
    if(!state.mouseWorld)return;
    const{x:mx,y:my}=state.mouseWorld;
    const col=mx<xL?0:mx<xR?1:2,row=my<yB?0:my<yT?1:2;
    const r=_regionSegmentG(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax,1,1,twoA);
    if(!r)return;
    const{rxMin,rxMax,ryMin,ryMax,sxa,sxb,sya,syb,cx,cy,cst}=r;
    const ca=t.toCanvas(rxMin,ryMax),cb=t.toCanvas(rxMax,ryMin);
    ctx.save();ctx.fillStyle='rgba(12,14,35,0.72)';ctx.fillRect(ca.x,ca.y,cb.x-ca.x,cb.y-ca.y);ctx.restore();
    _strokeCellSegment(ctx,t,cx,cy,cst,rxMin,rxMax,ryMin,ryMax,'white');
    const lines=_buildEquationLinesG(1,1,twoA,sxa,sxb,sya,syb,x1,y1,x2,y2,cx,cy,cst);
    _drawEqBox(ctx,lines,(Math.max(ca.x,0)+Math.min(cb.x,w))/2,(Math.max(ca.y,0)+Math.min(cb.y,h))/2,w,h);
  }
```

- [ ] **Step 2: Hook in `_drawEllisse`.** Trovare la fine di `function _drawEllisse(ctx,t,obj){ ... }` (le due righe finali):
```js
    MiniEngine.drawPoint(ctx,t,x1,y1,obj.color,4);
    MiniEngine.drawPoint(ctx,t,x2,y2,obj.color,4);
  }
```
e sostituire con:
```js
    MiniEngine.drawPoint(ctx,t,x1,y1,obj.color,4);
    MiniEngine.drawPoint(ctx,t,x2,y2,obj.color,4);
    if(state.showRegions && state.isolatedId===obj.id && state.mouseWorld){
      const canvas=document.getElementById('calc-canvas');const DPR=window.devicePixelRatio||1;
      const w=canvas.width/DPR,h=canvas.height/DPR;const vMin=t.toWorld(0,h),vMax=t.toWorld(w,0);
      _drawEllisseRegions(ctx,t,obj,vMin,vMax,w,h);
    }
  }
```

- [ ] **Step 3: Estendere il toggle a tutte le coniche.** Trovare nella sidebar:
```js
                ${isolated&&(obj.type==='asse'||obj.type==='circonferenza')?`<div style="margin-top:8px;padding-top:8px;border-top:1px solid #1e1e1e;">
```
e sostituire la condizione con (vale per tutte tranne luogo/distanza):
```js
                ${isolated&&(obj.type!=='luogo'&&obj.type!=='distanza')?`<div style="margin-top:8px;padding-top:8px;border-top:1px solid #1e1e1e;">
```

- [ ] **Step 4: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
node tools/test-conicmath.mjs
```
Expected: exit 0; "All assertions passed". Eliminare `tools/_chk.js`.
Visiva: creare un'**ellisse** (anche a fuochi obliqui), isolarla, toggle on, hover → cella evidenziata, segmento bianco corretto, box con `TA + TB = 2a` espanso/risolto per la regione; regione centrale → "nessuna soluzione" se 2a>d₀.

- [ ] **Step 5: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): overlay regioni per l'ellisse + helper condivisi + toggle esteso"
```

---

## Task 4: Overlay iperbole (due rami)

**Files:** Modify `index.html` (GraphCalc: `_drawIperboleRegions`, hook in `_drawIperbole`)

- [ ] **Step 1: Aggiungere `_drawIperboleRegions`.** Subito dopo `function _drawEllisseRegions(...) { ... }`, inserire:
```js
  function _drawIperboleRegions(ctx,t,obj,vMin,vMax,w,h){
    const{x1=0,y1=0,x2=4,y2=0,twoA=2}=obj.params;
    const[xL,xR]=x1<=x2?[x1,x2]:[x2,x1],[yB,yT]=y1<=y2?[y1,y2]:[y2,y1];
    const INF=1e9, xBounds=[-INF,xL,xR,INF], yBounds=[-INF,yB,yT,INF];
    _drawGridCriticalLines(ctx,t,[xL,xR],[yB,yT],w,h);
    if(!state.mouseWorld)return;
    const{x:mx,y:my}=state.mouseWorld;
    const col=mx<xL?0:mx<xR?1:2,row=my<yB?0:my<yT?1:2;
    const r1=_regionSegmentG(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax,1,-1,+twoA);
    const r2=_regionSegmentG(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax,1,-1,-twoA);
    if(!r1)return;
    const{rxMin,rxMax,ryMin,ryMax,sxa,sxb,sya,syb,cx,cy,cst}=r1;
    const ca=t.toCanvas(rxMin,ryMax),cb=t.toCanvas(rxMax,ryMin);
    ctx.save();ctx.fillStyle='rgba(12,14,35,0.72)';ctx.fillRect(ca.x,ca.y,cb.x-ca.x,cb.y-ca.y);ctx.restore();
    _strokeCellSegment(ctx,t,cx,cy,cst,rxMin,rxMax,ryMin,ryMax,'white');
    if(r2)_strokeCellSegment(ctx,t,r2.cx,r2.cy,r2.cst,rxMin,rxMax,ryMin,ryMax,'white');
    const lines=_buildEquationLinesG(1,-1,+twoA,sxa,sxb,sya,syb,x1,y1,x2,y2,cx,cy,cst);
    if(r2){const l2lines=_buildEquationLinesG(1,-1,-twoA,r2.sxa,r2.sxb,r2.sya,r2.syb,x1,y1,x2,y2,r2.cx,r2.cy,r2.cst);lines.push(`(ramo 2 → ${l2lines[3].replace('→  ','')})`);}
    _drawEqBox(ctx,lines,(Math.max(ca.x,0)+Math.min(cb.x,w))/2,(Math.max(ca.y,0)+Math.min(cb.y,h))/2,w,h);
  }
```

- [ ] **Step 2: Hook in `_drawIperbole`.** `_drawIperbole` calcola già `w,h,vMin,vMax`. Trovare le due righe finali:
```js
    MiniEngine.drawPoint(ctx,t,x1,y1,obj.color,4);
    MiniEngine.drawPoint(ctx,t,x2,y2,obj.color,4);
  }
```
(quelle dentro `_drawIperbole`) e sostituire con:
```js
    MiniEngine.drawPoint(ctx,t,x1,y1,obj.color,4);
    MiniEngine.drawPoint(ctx,t,x2,y2,obj.color,4);
    if(state.showRegions && state.isolatedId===obj.id && state.mouseWorld)
      _drawIperboleRegions(ctx,t,obj,vMin,vMax,w,h);
  }
```
*(Nota: in `index.html` le due righe `drawPoint(...x1...)`/`drawPoint(...x2...)` chiudono sia `_drawEllisse` (già modificata in Task 3) sia `_drawIperbole`. Usare Read/Grep per individuare quella DENTRO `_drawIperbole` — è preceduta dal blocco `[result.branch1,result.branch2].forEach(...)` — e modificare SOLO quella.)*

- [ ] **Step 3: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
node tools/test-conicmath.mjs
```
Expected: exit 0; "All assertions passed". Eliminare `tools/_chk.js`.
Visiva: **iperbole** (orizzontale e obliqua), isolata, toggle on, hover → cella evidenziata, **entrambi i rami** in bianco se presenti, box con `TA − TB = 2a` (ramo 1) + nota `(ramo 2 → …)`.

- [ ] **Step 4: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): overlay regioni per l'iperbole (due rami)"
```

---

## Task 5: Overlay parabola (3 rette / 8 celle)

**Files:** Modify `index.html` (GraphCalc: `_buildParabolaEquationLines`, `_drawParabolaRegions`, hook in `_drawParabola`)

- [ ] **Step 1: Aggiungere `_buildParabolaEquationLines` + `_drawParabolaRegions`.** Subito dopo `function _drawIperboleRegions(...) { ... }`, inserire:
```js
  function _buildParabolaEquationLines(s1,s2,s3,xF,yF,a,b,c,cx,cy,rhs){
    function f(n){const r=Math.round(n*1000)/1000;if(r===0)return'0';return String(r);}
    const D=Math.abs(a)+Math.abs(b);
    const fxF=Math.abs(xF)<1e-9?'x':(xF>0?`x − ${f(xF)}`:`x + ${f(-xF)}`);
    const fyF=Math.abs(yF)<1e-9?'y':(yF>0?`y − ${f(yF)}`:`y + ${f(-yF)}`);
    function lin(){
      const parts=[];
      if(Math.abs(a)>1e-9)parts.push(a===1?'x':a===-1?'−x':`${f(a)}x`);
      if(Math.abs(b)>1e-9)parts.push((parts.length?(b>=0?'+ ':'− '):(b<0?'−':''))+(Math.abs(b)===1?'y':`${f(Math.abs(b))}y`));
      if(Math.abs(c)>1e-9)parts.push((parts.length?(c>=0?'+ ':'− '):(c<0?'−':''))+f(Math.abs(c)));
      return parts.join(' ')||'0';
    }
    function sgn(s){return s>0?'+':'−';}
    const l1=`|${fxF}| + |${fyF}| = |${lin()}| / ${f(D)}`;
    const l2=`${f(D)}·(${sgn(s1)}(${fxF}) ${sgn(s2)} (${fyF})) = ${sgn(s3)}(${lin()})`;
    function termX(co){return Math.abs(co)<1e-9?'':(co===1?'x':co===-1?'−x':`${f(co)}x`);}
    function termY(co){if(Math.abs(co)<1e-9)return'';const s=co>0?'+':'−';const av=Math.abs(co);return ` ${s} ${av===1?'y':`${f(av)}y`}`;}
    let lhs3=(termX(cx)+termY(cy)).trim()||'0';
    const l3=`${lhs3} = ${f(rhs)}`;
    let l4;
    if(Math.abs(cy)<1e-9)l4=Math.abs(cx)<1e-9?(Math.abs(rhs)<1e-9?'→ tutto il piano':'→ nessuna soluzione'):`→  x = ${f(rhs/cx)}`;
    else if(Math.abs(cx)<1e-9)l4=`→  y = ${f(rhs/cy)}`;
    else{const sl=-cx/cy,bb=rhs/cy;l4=`→  y = ${f(sl)}x ${bb>=0?'+':'−'} ${f(Math.abs(bb))}`;}
    return[l1,l2,l3,l4];
  }
  function _drawParabolaRegions(ctx,t,obj,vMin,vMax,w,h){
    const{xF=0,yF=2,m=0,q=0,vertical=false}=obj.params;
    const a=vertical?1:m, b=vertical?0:-1, c=vertical?-q:q;
    const D=Math.abs(a)+Math.abs(b);
    if(D<1e-9)return;
    // rette critiche x=xF, y=yF (la direttrice è già disegnata da _drawParabola)
    ctx.save();ctx.strokeStyle='rgba(160,160,255,0.35)';ctx.lineWidth=1;ctx.setLineDash([5,4]);
    const xfpx=t.toCanvas(xF,0).x, yfpx=t.toCanvas(0,yF).y;
    ctx.beginPath();ctx.moveTo(xfpx,0);ctx.lineTo(xfpx,h);ctx.stroke();
    ctx.beginPath();ctx.moveTo(0,yfpx);ctx.lineTo(w,yfpx);ctx.stroke();
    ctx.setLineDash([]);ctx.restore();
    if(!state.mouseWorld)return;
    const{x:mx,y:my}=state.mouseWorld;
    const s1=(mx-xF)>=0?1:-1, s2=(my-yF)>=0?1:-1, s3=(a*mx+b*my+c)>=0?1:-1;
    let poly=[{x:vMin.x,y:vMin.y},{x:vMax.x,y:vMin.y},{x:vMax.x,y:vMax.y},{x:vMin.x,y:vMax.y}];
    poly=ConicMath.clipPolygonHalfplane(poly, s1, 0, s1*xF);
    poly=ConicMath.clipPolygonHalfplane(poly, 0, s2, s2*yF);
    poly=ConicMath.clipPolygonHalfplane(poly, s3*a, s3*b, -s3*c);
    if(poly.length<3)return;
    ctx.save();ctx.fillStyle='rgba(12,14,35,0.72)';ctx.beginPath();
    poly.forEach((p,i)=>{const cc=t.toCanvas(p.x,p.y);i?ctx.lineTo(cc.x,cc.y):ctx.moveTo(cc.x,cc.y);});
    ctx.closePath();ctx.fill();ctx.restore();
    let gx=0,gy=0;poly.forEach(p=>{const cc=t.toCanvas(p.x,p.y);gx+=cc.x;gy+=cc.y;});gx/=poly.length;gy/=poly.length;
    const segs=ConicMath.parabolaRegionSegments(xF,yF,a,b,c,{xMin:vMin.x,xMax:vMax.x,yMin:vMin.y,yMax:vMax.y});
    segs.forEach(s=>{
      const mxs=(s.from.x+s.to.x)/2, mys=(s.from.y+s.to.y)/2;
      const u1=(mxs-xF)>=0?1:-1, u2=(mys-yF)>=0?1:-1, u3=(a*mxs+b*mys+c)>=0?1:-1;
      if(u1===s1&&u2===s2&&u3===s3){
        const p0=t.toCanvas(s.from.x,s.from.y),p1e=t.toCanvas(s.to.x,s.to.y);
        ctx.save();ctx.strokeStyle='white';ctx.lineWidth=3.5;ctx.lineCap='round';ctx.shadowColor='rgba(255,255,255,0.8)';ctx.shadowBlur=14;
        ctx.beginPath();ctx.moveTo(p0.x,p0.y);ctx.lineTo(p1e.x,p1e.y);ctx.stroke();ctx.restore();
      }
    });
    const cxL=D*s1-s3*a, cyL=D*s2-s3*b, rhs=D*s1*xF+D*s2*yF+s3*c;
    const lines=_buildParabolaEquationLines(s1,s2,s3,xF,yF,a,b,c,cxL,cyL,rhs);
    _drawEqBox(ctx,lines,gx,gy,w,h);
  }
```

- [ ] **Step 2: Hook in `_drawParabola`.** `_drawParabola(ctx,t,obj,w,h)` ha già `w,h` e calcola `vMin,vMax`. Trovare la riga finale:
```js
    MiniEngine.drawPoint(ctx,t,xF,yF,obj.color,5);
  }
```
e sostituire con:
```js
    MiniEngine.drawPoint(ctx,t,xF,yF,obj.color,5);
    if(state.showRegions && state.isolatedId===obj.id && state.mouseWorld)
      _drawParabolaRegions(ctx,t,obj,vMin,vMax,w,h);
  }
```

- [ ] **Step 3: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
node tools/test-conicmath.mjs
```
Expected: exit 0; "All assertions passed". Eliminare `tools/_chk.js`.
Visiva: **parabola** con direttrice orizzontale, verticale e obliqua; isolata, toggle on, hover → **cella poligonale** evidenziata, segmento bianco corretto nella cella, box con `|x−xF|+|y−yF| = |…|/D` → espansa → lineare → risolta. Verificare in particolare la leggibilità delle stringhe del box (formattazione best-effort).

- [ ] **Step 4: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): overlay regioni per la parabola (3 rette / 8 celle)"
```

---

## Task 6: Verifica finale + roadmap

**Files:** Modify `docs/ROADMAP_MIGLIORAMENTI.md` (T3/C1 → ✅)

- [ ] **Step 1: Sintassi + harness.**
```bash
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: "All assertions passed" + exit 0. Eliminare `tools/_chk.js`.

- [ ] **Step 2: Checklist visiva.** asse/circonferenza invariati; overlay corretto su ellisse, iperbole (due rami), parabola (orizz./vert./obliqua); nessun errore in console.

- [ ] **Step 3: Roadmap.** In `docs/ROADMAP_MIGLIORAMENTI.md` mettere Stato 📋 → ✅ per **T3** e **C1**.

- [ ] **Step 4: Commit.**
```bash
git add docs/ROADMAP_MIGLIORAMENTI.md
git commit -m "docs: roadmap — overlay regioni tutte le coniche (T3/C1)"
```

---

## Self-review (copertura spec)

- **Spec §2 (toggle):** Task 3 (condizione estesa a tutte tranne luogo/distanza).
- **Spec §3 (generalizzazione):** Task 2 (`_regionSegmentG`/`_buildEquationLinesG` + wrapper; asse invariato).
- **Spec §4 (ellisse):** Task 3 (`_drawEllisseRegions` + helper condivisi + hook).
- **Spec §5 (iperbole):** Task 4 (`_drawIperboleRegions`, due rami, nota ramo 2).
- **Spec §6 (parabola):** Task 5 (`_drawParabolaRegions` + `_buildParabolaEquationLines`, evidenziazione poligonale via `clipPolygonHalfplane`, segmento da `parabolaRegionSegments`).
- **Spec §7 (helper puro):** Task 1 (`clipPolygonHalfplane` in `ConicMath`, testato).
- **Spec §8 (verifica):** harness (Task 1) + regressione asse a vista (Task 2) + checklist visiva (Task 3–6).
- **Spec §9/§10 (scope/vincoli):** nessun overlay per luogo/distanza; asse/circonferenza invariati; firme pubbliche invariate salvo `clipPolygonHalfplane`.
- **Coerenza nomi:** `_regionSegmentG`/`_buildEquationLinesG`/`_strokeCellSegment`/`_drawEqBox`/`_drawGridCriticalLines`/`_drawEllisseRegions`/`_drawIperboleRegions`/`_drawParabolaRegions`/`_buildParabolaEquationLines`/`clipPolygonHalfplane` usati coerentemente; hook gated con `state.showRegions && state.isolatedId===obj.id && state.mouseWorld` in tutte e tre.
