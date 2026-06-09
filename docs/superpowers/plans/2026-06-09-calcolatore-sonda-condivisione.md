# Calcolatore: Sonda P + Condivisione + Export PNG + Galleria — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NB:** feature pianificata, **non ancora schedulata** — esecuzione in blocco con le altre.

**Goal:** Aggiungere al calcolatore: sonda P (verso tutti gli oggetti), condivisione via URL, export PNG, galleria di esempi — attorno a un modello di stato comune.

**Architecture:** Un modulo di (de)serializzazione in `GraphCalc` (`_serializeState/_encode/_decode/_applyState`) condiviso da condivisione-URL, ripristino-da-URL e galleria. Sonda come stato + hook nei gestori puntatore esistenti + `_drawProbe` su canvas. Export via compositing offscreen. Tutto inline. Verifica: `node --check` + harness invariata + round-trip e checklist visiva.

**Tech Stack:** Vanilla JS/Canvas inline in `index.html`. Harness `tools/test-conicmath.mjs` (solo per confermare che `ConicMath` resta invariato).

**Spec:** `docs/superpowers/specs/2026-06-09-calcolatore-sonda-condivisione-design.md`

**Vincoli:** tutto inline; `ConicMath` non si tocca; nessuna regressione su oggetti/T3; mouse+touch.

**Raffinatura vs spec:** il readout della sonda è disegnato **su canvas** vicino a P (live, niente re-render della sidebar a ogni movimento). In sidebar resta solo il toggle.

---

## Task 1: Serializzazione + campi di stato + ripristino-da-URL

**Files:** Modify `index.html` (GraphCalc: state, funzioni di (de)serializzazione, hook in `open()`)

- [ ] **Step 1: Aggiungere i campi di stato.** Nell'oggetto `state` (≈ riga 1760), prima della riga `};` di chiusura, aggiungere:
```js
    probe: null,             // {x,y} della sonda, o null
    probeActive: false,      // sonda attiva
    draggingProbe: false,    // trascinamento della sonda in corso
    galleryOpen: false,      // pannello galleria aperto
```

- [ ] **Step 2: Aggiungere le funzioni di (de)serializzazione.** Subito dopo la funzione `clearAll() { ... }`, inserire:
```js
  function _serializeState(){
    return {
      v:1,
      objects: state.objects.map(o=>({name:o.name,type:o.type,params:o.params,color:o.color,visible:o.visible,opacity:o.opacity})),
      view:{ pan:{x:state.pan.x,y:state.pan.y}, scale:state.scale },
      snap: state.snap
    };
  }
  function _encode(data){ return btoa(unescape(encodeURIComponent(JSON.stringify(data)))); }
  function _decode(str){ try{ return JSON.parse(decodeURIComponent(escape(atob(str)))); }catch(e){ return null; } }
  function _applyState(data){
    if(!data || !Array.isArray(data.objects)) return;
    const valid={asse:1,circonferenza:1,ellisse:1,iperbole:1,parabola:1,luogo:1,distanza:1};
    state.objects=[]; state.nextId=1;
    for(const o of data.objects){
      if(!o || !valid[o.type] || !o.params) continue;
      const id=state.nextId++;
      state.objects.push({
        id,
        name: o.name || `${TYPE_LABELS[o.type]} #${id}`,
        type: o.type,
        params: JSON.parse(JSON.stringify(o.params)),
        color: o.color || DEFAULT_COLORS[o.type] || '#888888',
        visible: o.visible!==false,
        opacity: typeof o.opacity==='number'? o.opacity : 1
      });
    }
    if(data.view){ if(data.view.pan){state.pan.x=data.view.pan.x;state.pan.y=data.view.pan.y;} if(typeof data.view.scale==='number')state.scale=data.view.scale; }
    if(typeof data.snap==='boolean')state.snap=data.snap;
    state.selectedId=null; state.isolatedId=null; state.showRegions=false;
    state.probe=null; state.probeActive=false; state.galleryOpen=false; state.expandedIds.clear();
    renderSidebar(); _draw();
  }
```

- [ ] **Step 3: Ripristino-da-URL in `open()`.** Alla fine della funzione `open()` (dopo che ha inizializzato canvas/stato e fatto il primo `renderSidebar()/_draw()`), aggiungere:
```js
    if (location.hash && location.hash.indexOf('#calc=')===0) {
      const data=_decode(location.hash.slice(6));
      if(data) _applyState(data);
    }
```
(Usare Read per individuare la fine di `open()` e inserire prima della sua `}` di chiusura.)

- [ ] **Step 4: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
node tools/test-conicmath.mjs
```
Expected: exit 0; "All assertions passed". Eliminare `tools/_chk.js`.
Console (browser): `GraphCalc` esiste; `_decode(_encode({v:1,objects:[],view:{pan:{x:0,y:0},scale:60},snap:false}))` deep-equal all'input (controllo round-trip di `_encode`/`_decode` — eseguibile da console).

- [ ] **Step 5: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): (de)serializzazione stato + ripristino da URL"
```

---

## Task 2: Sezione "Strumenti" + Condividi + Export PNG + toast

**Files:** Modify `index.html` (GraphCalc: `renderSidebar`, nuove funzioni, public API)

- [ ] **Step 1: Aggiungere `shareLink`, `exportPNG`, `_toast`.** Dopo `_applyState(...)` (Task 1), inserire:
```js
  function _toast(msg){
    const overlay=document.getElementById('calc-overlay'); if(!overlay)return;
    let el=document.getElementById('calc-toast');
    if(!el){ el=document.createElement('div'); el.id='calc-toast';
      el.style.cssText='position:absolute;left:50%;bottom:24px;transform:translateX(-50%);background:rgba(20,22,40,0.95);color:#e2e8f0;font:12px IBM Plex Mono,monospace;padding:8px 16px;border-radius:6px;border:1px solid rgba(99,102,241,0.4);z-index:10000;pointer-events:none;opacity:0;transition:opacity 0.2s;';
      overlay.appendChild(el); }
    el.textContent=msg; el.style.opacity='1';
    clearTimeout(el._t); el._t=setTimeout(()=>{ el.style.opacity='0'; },1800);
  }
  function shareLink(){
    const enc=_encode(_serializeState());
    const link=location.origin+location.pathname+'#calc='+enc;
    try{ history.replaceState(null,'',link); }catch(e){ location.hash='calc='+enc; }
    if(navigator.clipboard && navigator.clipboard.writeText){
      navigator.clipboard.writeText(link).then(()=>_toast('Link copiato!'),()=>_toast('Link aggiornato nell\'URL'));
    } else _toast('Link aggiornato nell\'URL');
  }
  function exportPNG(){
    const canvas=document.getElementById('calc-canvas'); if(!canvas)return;
    const sm=state.mouseWorld, sp=state.probe, sr=state.showRegions;
    state.mouseWorld=null; state.probe=null; state.showRegions=false; _draw();
    const off=document.createElement('canvas'); off.width=canvas.width; off.height=canvas.height;
    const oc=off.getContext('2d'); oc.fillStyle='#050505'; oc.fillRect(0,0,off.width,off.height); oc.drawImage(canvas,0,0);
    const a=document.createElement('a'); a.href=off.toDataURL('image/png'); a.download='geometria-taxi.png'; a.click();
    state.mouseWorld=sm; state.probe=sp; state.showRegions=sr; _draw();
  }
```

- [ ] **Step 2: Sezione "Strumenti" nella sidebar.** In `renderSidebar()`, trovare la sezione Snap+Clear:
```js
      <!-- Snap + Clear all -->
      <div class="csb-section" style="flex-shrink:0;">
        <div class="csb-snap-row">
          <button class="csb-snap-toggle ${state.snap?'active':''}" onclick="GraphCalc.toggleSnap()">🧲 Snap</button>
          <span class="csb-info-icon" data-tip="Snap alla griglia intera. I punti vengono posizionati su coordinate intere esatte.">ⓘ</span>
          <button class="csb-clear-btn" onclick="GraphCalc.clearAll()" title="Elimina tutti gli oggetti" style="margin-left:auto;">🗑 Tutti</button>
        </div>
      </div>
```
e inserire SUBITO DOPO:
```js
      <!-- Strumenti -->
      <div class="csb-section" style="flex-shrink:0;">
        <div class="csb-snap-row" style="flex-wrap:wrap;gap:6px;">
          <button class="csb-snap-toggle" onclick="GraphCalc.shareLink()" title="Copia un link condivisibile">🔗 Condividi</button>
          <button class="csb-snap-toggle" onclick="GraphCalc.exportPNG()" title="Scarica la scena come PNG">📷 PNG</button>
        </div>
      </div>
```

- [ ] **Step 3: Esportare i nuovi metodi.** Nel `return { ... }` di `GraphCalc`, aggiungere `shareLink, exportPNG` (mantenere tutto il resto).

- [ ] **Step 4: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: aprire il calcolatore, creare oggetti, "🔗 Condividi" → toast "Link copiato!" + l'URL contiene `#calc=…`; **ricaricare la pagina** con quell'URL e riaprire il calcolatore → **scena identica**. "📷 PNG" → scarica `geometria-taxi.png` con sfondo scuro e senza overlay.

- [ ] **Step 5: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): condivisione via URL + export PNG + toast"
```

---

## Task 3: Galleria esempi

**Files:** Modify `index.html` (GraphCalc: costante GALLERY, funzioni, pannello in `renderSidebar`, public API)

- [ ] **Step 1: Definire i preset + le funzioni.** Dopo `exportPNG(...)` (Task 2), inserire:
```js
  const GALLERY=[
    {name:'Ellisse ottagono', data:{v:1,objects:[{type:'ellisse',name:'Ellisse',params:{x1:-1,y1:-1,x2:3,y2:1,twoA:10},color:'#3b82f6',visible:true,opacity:1}],view:{pan:{x:0,y:0},scale:48},snap:true}},
    {name:'Iperbole verticale', data:{v:1,objects:[{type:'iperbole',name:'Iperbole',params:{x1:0,y1:-3,x2:0,y2:3,twoA:3},color:'#fb923c',visible:true,opacity:1}],view:{pan:{x:0,y:0},scale:48},snap:true}},
    {name:'Parabola obliqua', data:{v:1,objects:[{type:'parabola',name:'Parabola',params:{xF:1,yF:1,m:1,q:-2,vertical:false},color:'#22c55e',visible:true,opacity:1}],view:{pan:{x:0,y:0},scale:44},snap:true}},
    {name:'Asse obliquo', data:{v:1,objects:[{type:'asse',name:'Asse',params:{p1:{x:-2,y:-1},p2:{x:3,y:2},showBisector:true},color:'#f59e0b',visible:true,opacity:1}],view:{pan:{x:0,y:0},scale:48},snap:true}},
    {name:'Coniche a confronto', data:{v:1,objects:[
      {type:'circonferenza',name:'Circonferenza',params:{xc:0,yc:0,R:3},color:'#e63946',visible:true,opacity:1},
      {type:'ellisse',name:'Ellisse',params:{x1:-2,y1:0,x2:2,y2:0,twoA:8},color:'#3b82f6',visible:true,opacity:1},
      {type:'iperbole',name:'Iperbole',params:{x1:-3,y1:0,x2:3,y2:0,twoA:2},color:'#fb923c',visible:true,opacity:1}
    ],view:{pan:{x:0,y:0},scale:36},snap:true}},
  ];
  function toggleGallery(){ state.galleryOpen=!state.galleryOpen; renderSidebar(); }
  function loadPreset(i){
    const p=GALLERY[i]; if(!p)return;
    if(state.objects.length>0 && !confirm('Sostituire la scena corrente con «'+p.name+'»?')) return;
    _applyState(JSON.parse(JSON.stringify(p.data)));
  }
```

- [ ] **Step 2: Pulsante + pannello nella sidebar.** Nella sezione "Strumenti" (Task 2), aggiungere il pulsante Esempi e, sotto, il pannello. Sostituire il blocco della sezione Strumenti con:
```js
      <!-- Strumenti -->
      <div class="csb-section" style="flex-shrink:0;">
        <div class="csb-snap-row" style="flex-wrap:wrap;gap:6px;">
          <button class="csb-snap-toggle" onclick="GraphCalc.shareLink()" title="Copia un link condivisibile">🔗 Condividi</button>
          <button class="csb-snap-toggle" onclick="GraphCalc.exportPNG()" title="Scarica la scena come PNG">📷 PNG</button>
          <button class="csb-snap-toggle ${state.galleryOpen?'active':''}" onclick="GraphCalc.toggleGallery()" title="Carica un esempio">📂 Esempi</button>
        </div>
        ${state.galleryOpen?`<div style="margin-top:8px;display:flex;flex-direction:column;gap:4px;">
          ${GALLERY.map((p,i)=>`<button class="csb-tool-btn" onclick="GraphCalc.loadPreset(${i})"><span>${p.name}</span></button>`).join('')}
        </div>`:''}
      </div>
```

- [ ] **Step 3: Esportare i metodi.** Nel `return { ... }` di `GraphCalc`, aggiungere `toggleGallery, loadPreset`.

- [ ] **Step 4: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: "📂 Esempi" apre la lista; ogni preset carica la scena attesa (con conferma se ci sono oggetti); le coniche risultano valide e visibili.

- [ ] **Step 5: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): galleria di esempi precaricati"
```

---

## Task 4: Sonda P

**Files:** Modify `index.html` (GraphCalc: `_probeValue`, `_drawProbe`, `toggleProbe`, hook nei gestori puntatore, hook in `_draw`, toggle in sidebar, public API)

- [ ] **Step 1: Aggiungere `_probeValue`, `_drawProbe`, `toggleProbe`.** Dopo `loadPreset(...)` (Task 3), inserire:
```js
  // Relazione di P con un oggetto: {label, v (segno: <0 dentro, ≈0 bordo, >0 fuori), refs:[elementi a cui tracciare la scaletta]}
  function _probeValue(obj,P){
    const td=ConicMath.taxiDist;
    if(obj.type==='circonferenza'){const{xc=0,yc=0,R=3}=obj.params;const d=td(P,{x:xc,y:yc});return{label:`d₁=${d.toFixed(2)} · R=${R}`,v:d-R,refs:[{x:xc,y:yc}]};}
    if(obj.type==='ellisse'){const{x1=0,y1=0,x2=0,y2=0,twoA=6}=obj.params;const d1=td(P,{x:x1,y:y1}),d2=td(P,{x:x2,y:y2});return{label:`Σ=${(d1+d2).toFixed(2)} · 2a=${twoA}`,v:d1+d2-twoA,refs:[d1<=d2?{x:x1,y:y1}:{x:x2,y:y2}]};}
    if(obj.type==='iperbole'){const{x1=0,y1=0,x2=0,y2=0,twoA=2}=obj.params;const d1=td(P,{x:x1,y:y1}),d2=td(P,{x:x2,y:y2});return{label:`|Δ|=${Math.abs(d1-d2).toFixed(2)} · 2a=${twoA}`,v:Math.abs(d1-d2)-twoA,refs:[d1<=d2?{x:x1,y:y1}:{x:x2,y:y2}]};}
    if(obj.type==='parabola'){const{xF=0,yF=2,m=0,q=0,vertical=false}=obj.params;const a=vertical?1:m,b=vertical?0:-1,c=vertical?-q:q;const dF=td(P,{x:xF,y:yF});const dDir=Math.abs(a*P.x+b*P.y+c)/(Math.abs(a)+Math.abs(b)||1);return{label:`dF=${dF.toFixed(2)} · dr=${dDir.toFixed(2)}`,v:dF-dDir,refs:[{x:xF,y:yF}]};}
    if(obj.type==='asse'){const p1=obj.params.p1,p2=obj.params.p2;if(!p1||!p2)return null;const d1=td(P,p1),d2=td(P,p2);return{label:`d₁=${d1.toFixed(2)} · d₂=${d2.toFixed(2)}`,v:d1-d2,refs:[p1,p2]};}
    return null; // luogo/distanza esclusi dalla sonda
  }
  function _drawProbe(ctx,t){
    if(!state.probeActive || !state.probe) return;
    const P=state.probe;
    const canvas=document.getElementById('calc-canvas');const DPR=window.devicePixelRatio||1;
    const w=canvas.width/DPR, h=canvas.height/DPR;
    const rows=[];
    for(const obj of state.objects){
      if(!obj.visible)continue;
      const r=_probeValue(obj,P); if(!r)continue;
      r.refs.forEach(E=>{const corner=ConicMath.l1Corner(P,E);MiniEngine.drawSegment(ctx,t,P,corner,obj.color+'66',1.2);MiniEngine.drawSegment(ctx,t,corner,E,obj.color+'66',1.2);});
      const esito=Math.abs(r.v)<0.05?'◉':r.v<0?'●':'○';
      rows.push({color:obj.color,text:`${obj.name}: ${r.label} ${esito}`});
    }
    MiniEngine.drawPoint(ctx,t,P.x,P.y,'rgb(255,255,255)',5);
    if(rows.length){
      ctx.save();ctx.font='11.5px IBM Plex Mono,monospace';
      const lineH=18,pad=10,maxW=Math.max(...rows.map(r=>ctx.measureText('  '+r.text).width));
      const boxW=maxW+pad*2,boxH=rows.length*lineH+pad*1.4;
      const pc=t.toCanvas(P.x,P.y);
      let bx=pc.x+12,by=pc.y+12;
      bx=Math.max(8,Math.min(w-boxW-8,bx));by=Math.max(8,Math.min(h-boxH-8,by));
      ctx.fillStyle='rgba(10,12,28,0.92)';ctx.strokeStyle='rgba(99,102,241,0.45)';ctx.lineWidth=1;
      ctx.beginPath();ctx.roundRect(bx,by,boxW,boxH,7);ctx.fill();ctx.stroke();
      ctx.textAlign='left';ctx.textBaseline='top';
      rows.forEach((r,i)=>{
        const yy=by+pad*0.7+i*lineH;
        ctx.fillStyle=r.color;ctx.beginPath();ctx.arc(bx+pad+3,yy+6,3,0,Math.PI*2);ctx.fill();
        ctx.fillStyle='rgba(226,232,240,0.92)';ctx.fillText(r.text,bx+pad+12,yy);
      });
      ctx.restore();
    }
  }
  function toggleProbe(){
    state.probeActive=!state.probeActive;
    if(!state.probeActive){ state.probe=null; state.draggingProbe=false; }
    renderSidebar(); _draw();
  }
```

- [ ] **Step 2: Hook nei gestori puntatore.** In `_onMouseDown`, subito dopo `const world = _snapCoord(raw.x, raw.y);` e PRIMA del commento `// 1. Pending point tool`, inserire:
```js
    if (state.probeActive) {
      if (state.probe && Math.abs(raw.x-state.probe.x)+Math.abs(raw.y-state.probe.y) < 0.7) { state.draggingProbe = true; }
      else { state.probe = { x: world.x, y: world.y }; state.draggingProbe = true; }
      _draw(); return;
    }
```
In `_onMouseMove`, subito dopo `state.mouseWorld = _snapCoord(raw.x, raw.y);` e PRIMA di `// Drag pending point`, inserire:
```js
    if (state.draggingProbe) { state.probe = { ...state.mouseWorld }; _draw(); return; }
```
In `_onMouseUp`, dopo `state.pendingDraggingIdx = null;`, aggiungere:
```js
    state.draggingProbe = false;
```

- [ ] **Step 3: Hook in `_draw`.** Individuare la fine di `function _draw(){ ... }` (dopo che disegna griglia e oggetti, prima della sua `}` di chiusura) e aggiungere, come ultima istruzione di disegno:
```js
    _drawProbe(ctx, t);
```
(Usare Read/Grep per trovare il punto in `_draw` dove esistono `ctx` e `t` ed è già stata disegnata la scena; la sonda va in cima a tutto.)

- [ ] **Step 4: Toggle nella sidebar.** Nella sezione "Strumenti", aggiungere il toggle Sonda come primo pulsante della riga. Sostituire l'apertura `<div class="csb-snap-row" ...>` della sezione Strumenti con la versione che include il toggle:
```js
        <div class="csb-snap-row" style="flex-wrap:wrap;gap:6px;">
          <button class="csb-snap-toggle ${state.probeActive?'active':''}" onclick="GraphCalc.toggleProbe()" title="Sonda: posiziona un punto e misura le distanze">🔍 Sonda</button>
          <button class="csb-snap-toggle" onclick="GraphCalc.shareLink()" title="Copia un link condivisibile">🔗 Condividi</button>
          <button class="csb-snap-toggle" onclick="GraphCalc.exportPNG()" title="Scarica la scena come PNG">📷 PNG</button>
          <button class="csb-snap-toggle ${state.galleryOpen?'active':''}" onclick="GraphCalc.toggleGallery()" title="Carica un esempio">📂 Esempi</button>
        </div>
```

- [ ] **Step 5: Esportare `toggleProbe`.** Nel `return { ... }` di `GraphCalc`, aggiungere `toggleProbe`.

- [ ] **Step 6: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
node tools/test-conicmath.mjs
```
Expected: exit 0; "All assertions passed". Eliminare `tools/_chk.js`.
Visiva: creare alcune coniche, "🔍 Sonda" on, **clic** sul canvas → punto P + scalette color-coded a ogni oggetto + box readout con `valore · esito (●/◉/○)`; trascinare P (mouse+touch) → valori live; posizionando P sul bordo di una conica l'esito è ◉; toggle off → P sparisce.

- [ ] **Step 7: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): sonda P verso tutti gli oggetti (distanze + dentro/fuori)"
```

---

## Task 5: Verifica finale + roadmap

**Files:** Modify `docs/ROADMAP_MIGLIORAMENTI.md` (C2/C3/C4 → ✅)

- [ ] **Step 1: Sintassi + harness.**
```bash
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: "All assertions passed" + exit 0. Eliminare `tools/_chk.js`.

- [ ] **Step 2: Checklist visiva.** Round-trip condivisione (condividi → ricarica con hash → identico); ogni preset della galleria carica correttamente; export PNG con sfondo scuro senza overlay; sonda con valori/esiti corretti e scalette; nessuna regressione su creazione oggetti/T3; nessun errore in console.

- [ ] **Step 3: Roadmap.** In `docs/ROADMAP_MIGLIORAMENTI.md` mettere Stato 📋 → ✅ per **C2**, **C3**, **C4**.

- [ ] **Step 4: Commit.**
```bash
git add docs/ROADMAP_MIGLIORAMENTI.md
git commit -m "docs: roadmap — sonda P + condivisione + export + galleria (C2/C3/C4)"
```

---

## Self-review (copertura spec)

- **Spec §2 (serializzazione):** Task 1 (`_serializeState/_encode/_decode/_applyState`).
- **Spec §3 (sonda P):** Task 4 (`_probeValue`/`_drawProbe`/`toggleProbe` + hook puntatore + readout su canvas — raffinatura annotata).
- **Spec §4 (condivisione URL):** Task 1 (ripristino) + Task 2 (`shareLink`/`_toast`).
- **Spec §5 (export PNG):** Task 2 (`exportPNG`, compositing offscreen).
- **Spec §6 (galleria):** Task 3 (GALLERY + `toggleGallery`/`loadPreset`).
- **Spec §7 (architettura):** serializzazione condivisa riusata da URL/galleria; sonda integrata nei gestori esistenti; geometria riusa `taxiDist`/`l1Corner`.
- **Spec §8 (verifica):** round-trip + checklist visiva (Task 2–5); harness conferma `ConicMath` invariato.
- **Spec §9/§10 (scope/vincoli):** niente server; distanza/luogo esclusi dalla sonda; T3/`ConicMath` non toccati; tutto inline.
- **Coerenza nomi:** `_serializeState/_encode/_decode/_applyState/_toast/shareLink/exportPNG/GALLERY/toggleGallery/loadPreset/_probeValue/_drawProbe/toggleProbe`; campi `state.probe/probeActive/draggingProbe/galleryOpen`; metodi pubblici aggiunti: `shareLink, exportPNG, toggleGallery, loadPreset, toggleProbe`.
