# Hero: titolo animato (H3) + scroll cue & progress (H5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NB:** feature pianificata, **non ancora schedulata** — esecuzione in blocco con le altre.

**Goal:** Hero più curato: entrata animata del titolo con accento "diagonale→scaletta" (H3) e scroll cue + barra di progresso lettura (H5). H4 escluso (già in "Hero più vivo").

**Architecture:** Markup hero + barra globale, CSS (keyframes + guardia reduced-motion), e due piccoli moduli JS nel bootstrap (accento one-shot; scroll → barra/cue). Tutto inline; nessuna libreria. Verifica: `node --check` + visiva.

**Tech Stack:** HTML/CSS/JS/Canvas inline.

**Spec:** `docs/superpowers/specs/2026-06-10-hero-titolo-scroll-design.md`

**Vincoli:** `ConicMath`/`GraphCalc` invariati; `prefers-reduced-motion` rispettato (guardia propria).

---

## Task 1: H3 — Titolo animato + accento "diagonale→scaletta"

**Files:** Modify `index.html` (CSS, markup hero, script bootstrap)

- [ ] **Step 1: CSS entrata + accento.** Dopo la regola `.hero-subtitle { … }` (≈ riga 194), inserire:
```css
    @keyframes heroRise { from { opacity:0; transform: translateY(14px); } to { opacity:1; transform:none; } }
    .hero-title, .hero-subtitle { animation: heroRise 0.7s cubic-bezier(0.16,1,0.3,1) both; }
    .hero-title { animation-delay: 0.1s; }
    .hero-subtitle { animation-delay: 0.35s; }
    #hero-accent { display:block; margin: 1.1rem auto 0; opacity:0.85; }
    @media (prefers-reduced-motion: reduce) {
      .hero-title, .hero-subtitle { animation: none; }
    }
```

- [ ] **Step 2: Markup accento.** In `.hero-content`, trovare il sottotitolo:
```html
      <p class="hero-subtitle">Geometria del Taxi &nbsp;—&nbsp; Metrica L₁</p>
```
e inserire SUBITO DOPO:
```html
      <canvas id="hero-accent" width="220" height="26" aria-hidden="true"></canvas>
```

- [ ] **Step 3: Script accento (one-shot).** Nel blocco di bootstrap in fondo al file (dopo `Hero.init();`), inserire:
```js
(function heroAccent(){
  const cv=document.getElementById('hero-accent'); if(!cv)return;
  const ctx=cv.getContext('2d'), W=cv.width, H=cv.height, pad=3;
  const x0=pad, x1=W-pad, yB=H-pad, yT=pad, n=60, K=5;
  const diagY=i=>yB+(yT-yB)*(i/(n-1));
  const stairY=i=>{ const col=Math.min(K-1, Math.floor((i/(n-1))*K)); return yB+(yT-yB)*(col/(K-1)); };
  function render(tm){
    ctx.clearRect(0,0,W,H);
    ctx.strokeStyle='rgba(245,158,11,0.85)'; ctx.lineWidth=2; ctx.lineJoin='miter'; ctx.lineCap='round';
    ctx.beginPath();
    for(let i=0;i<n;i++){ const x=x0+(x1-x0)*(i/(n-1)); const y=diagY(i)+(stairY(i)-diagY(i))*tm; i?ctx.lineTo(x,y):ctx.moveTo(x,y); }
    ctx.stroke();
  }
  const reduced=!!(window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  if(reduced){ render(1); return; }
  const dur=900; let start=null;
  function stepf(ts){ if(start===null)start=ts; const e=Math.min(1,(ts-start)/dur); render(1-Math.pow(1-e,3)); if(e<1)requestAnimationFrame(stepf); }
  requestAnimationFrame(stepf);
})();
```

- [ ] **Step 4: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: al caricamento, titolo+sottotitolo entrano (fade+rise, staggered) e l'accento sotto il sottotitolo **si anima da diagonale a scaletta** poi resta statico; con `prefers-reduced-motion` (emulazione devtools) appaiono subito nello stato finale (accento = scaletta). Nessun errore in console.

- [ ] **Step 5: Commit.**
```bash
git add index.html
git commit -m "feat(hero): entrata animata del titolo + accento diagonale→scaletta (H3)"
```

---

## Task 2: H5 — Scroll cue + barra di progresso

**Files:** Modify `index.html` (CSS, markup body/hero, script bootstrap)

- [ ] **Step 1: CSS.** In fondo al `<style>` (o vicino al CSS dell'hero), inserire:
```css
    #read-progress { position:fixed; top:0; left:0; height:3px; width:100%; transform:scaleX(0); transform-origin:left; background:#6366f1; z-index:100001; pointer-events:none; }
    #hero-scroll-cue { position:absolute; bottom:24px; left:50%; transform:translate(-50%,0); color:rgba(255,255,255,0.4); font-size:1.6rem; line-height:1; z-index:3; pointer-events:none; transition:opacity 0.4s; animation:cuePulse 1.8s ease-in-out infinite; }
    #hero-scroll-cue.hidden { opacity:0; }
    @keyframes cuePulse { 0%,100%{ transform:translate(-50%,0); } 50%{ transform:translate(-50%,6px); } }
    @media (prefers-reduced-motion: reduce) { #hero-scroll-cue { animation:none; } }
```

- [ ] **Step 2: Markup barra.** Come **primo figlio** del `<body>` (subito dopo il tag `<body…>`), inserire:
```html
  <div id="read-progress" aria-hidden="true"></div>
```

- [ ] **Step 3: Markup cue.** Dentro `<section id="hero">`, prima della sua `</section>` di chiusura, inserire:
```html
    <div id="hero-scroll-cue" aria-hidden="true">⌄</div>
```

- [ ] **Step 4: Script scroll.** Nel bootstrap (dopo lo script accento di Task 1), inserire:
```js
(function heroScroll(){
  const bar=document.getElementById('read-progress'), cue=document.getElementById('hero-scroll-cue');
  let ticking=false;
  function update(){
    ticking=false;
    const st=window.scrollY||document.documentElement.scrollTop;
    const denom=document.documentElement.scrollHeight - window.innerHeight;
    const p=denom>0?Math.max(0,Math.min(1,st/denom)):0;
    if(bar) bar.style.transform='scaleX('+p+')';
    if(cue && st>10) cue.classList.add('hidden');
  }
  function onScroll(){ if(!ticking){ ticking=true; requestAnimationFrame(update); } }
  window.addEventListener('scroll', onScroll, { passive:true });
  window.addEventListener('resize', onScroll);
  update();
})();
```

- [ ] **Step 5: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: il chevron in basso all'hero pulsa e **svanisce al primo scroll**; la **barra in alto** si riempie scorrendo la pagina e torna a 0 in cima; con `reduced-motion` il pulse è fermo (il cue svanisce comunque allo scroll), la barra resta; nessuna regressione hero; nessun errore in console.

- [ ] **Step 6: Commit.**
```bash
git add index.html
git commit -m "feat(hero): scroll cue + barra di progresso lettura (H5)"
```

---

## Task 3: Verifica finale + roadmap

**Files:** Modify `docs/ROADMAP_MIGLIORAMENTI.md` (H3/H5 → ✅)

- [ ] **Step 1: Sintassi + harness.**
```bash
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: "All assertions passed" + exit 0. Eliminare `tools/_chk.js`.

- [ ] **Step 2: Checklist visiva.** Entrata titolo + accento animato; scroll cue che svanisce; barra di progresso; reduced-motion rispettato; hero e resto invariati.

- [ ] **Step 3: Roadmap.** In `docs/ROADMAP_MIGLIORAMENTI.md` mettere Stato 📋 → ✅ per **H3** e **H5** (H4 resta legato a "Hero più vivo").

- [ ] **Step 4: Commit.**
```bash
git add docs/ROADMAP_MIGLIORAMENTI.md
git commit -m "docs: roadmap — hero titolo animato + scroll cue/progress (H3/H5)"
```

---

## Self-review (copertura spec)

- **Spec §2 (H3):** Task 1 (keyframes `heroRise` + stagger; `#hero-accent` + script one-shot diagonale→scaletta; guardia reduced-motion).
- **Spec §3 (H5):** Task 2 (`#read-progress` + `#hero-scroll-cue` + CSS pulse/transition + script scroll rAF-throttlato; cue `hidden` al primo scroll; barra `scaleX`).
- **Spec §4 (architettura):** markup hero/body; CSS con guardia reduced-motion; due moduli JS nel bootstrap.
- **Spec §5 (verifica):** `node --check` + checklist visiva; `ConicMath`/harness invariati.
- **Spec §6/§7 (scope/vincoli):** H4 escluso; nessuna modifica a matematica/calcolatore; reduced-motion con guardia propria.
- **Coerenza nomi:** `#hero-accent`/`heroAccent`; `#read-progress`/`#hero-scroll-cue`/`heroScroll`; `.hidden`; `@keyframes heroRise`/`cuePulse`.
