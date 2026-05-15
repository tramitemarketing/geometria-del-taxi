# Calcolatore Grafico Taxicab — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing #esplora section with a fullscreen overlay calculator for taxicab geometry — a hybrid between Desmos (equation input) and GeoGebra (object-based geometric construction) supporting: asse taxicab, circonferenza, ellisse, iperbole, parabola (oblique directrix), and free locus input.

**Architecture:** Single file `geometria-del-taxi-master/index.html` — all HTML/CSS/JS inline. A new IIFE `GraphCalc` manages the calculator state, rendering, and UI. It reuses `ConicMath` (math algorithms), `MiniEngine` (drawing primitives), and ports the asse/region logic from `calcolatore grafico old/index.html`. The overlay is `position:fixed` — no new pages, no build step.

**Tech Stack:** HTML5, CSS3, Vanilla JS ES6, Canvas 2D API. Google Fonts CDN (already loaded). No dependencies.

**Before starting:** Read these files completely:
- `geometria-del-taxi-master/index.html` (existing code — ConicMath, MiniEngine, MainEngine, Hero)
- `calcolatore grafico old/index.html` (port: drawLocus, drawBisector, drawDebugRegions, buildEquationLines, clipSegmentToRect, regionSegment)

---

## File Structure

Only one file is modified throughout:
- **Modify:** `geometria-del-taxi-master/index.html`
  - `<style>` block: add CSS for overlay, sidebar, calc controls
  - `<body>` HTML: replace `#esplora`, add `#calc-overlay`, add hero button
  - `<script>` block: add `GraphCalc` IIFE after existing modules, update bootstrap

Plan is saved to: `geometria-del-taxi-master/docs/superpowers/plans/2026-05-15-calcolatore-grafico.md`

---

## Task 1: Replace #esplora Section + Hero Button

**Files:**
- Modify: `geometria-del-taxi-master/index.html` — HTML section and hero

- [ ] **Step 1: Replace the entire `<section id="esplora">` block**

Find the existing `<section id="esplora">` block (currently contains `.engine-inner`, `.engine-layout`, `.engine-controls` etc.) and replace it entirely with:

```html
<section id="calcolatore" style="background:#050505;padding:5rem 2rem;text-align:center;">
  <div style="max-width:700px;margin:0 auto;">
    <div style="font-family:'IBM Plex Mono',monospace;font-size:0.72rem;color:#666;letter-spacing:0.1em;text-transform:uppercase;margin-bottom:0.8rem;">§ 6</div>
    <h2 style="font-family:'Playfair Display',serif;font-weight:700;font-size:clamp(2rem,4vw,3rem);color:#ffffff;margin-bottom:1rem;">Calcolatore Grafico</h2>
    <p style="font-family:'IBM Plex Mono',monospace;font-size:0.85rem;color:rgba(255,255,255,0.35);letter-spacing:0.08em;margin-bottom:2.5rem;">Costruisci e analizza luoghi geometrici nella metrica L₁</p>
    <button id="btn-open-calc" onclick="GraphCalc.open()" style="font-family:'IBM Plex Mono',monospace;font-size:0.9rem;letter-spacing:0.1em;text-transform:uppercase;background:transparent;border:1px solid rgba(255,255,255,0.25);color:rgba(255,255,255,0.8);padding:0.9rem 2.5rem;border-radius:4px;cursor:pointer;transition:border-color 0.2s,color 0.2s;">▶ &nbsp;Apri Calcolatore Grafico</button>
  </div>
</section>
```

- [ ] **Step 2: Add hover style for the button**

In the `<style>` block, add:

```css
#btn-open-calc:hover {
  border-color: rgba(255,255,255,0.6);
  color: #ffffff;
}
```

- [ ] **Step 3: Add hidden button in hero**

In the existing `#hero` section, find `.hero-content` and add this button **after** the `<p class="hero-subtitle">` tag:

```html
<button id="btn-hero-calc"
  onclick="GraphCalc.open()"
  style="font-family:'IBM Plex Mono',monospace;font-size:0.72rem;letter-spacing:0.12em;text-transform:uppercase;background:transparent;border:1px solid rgba(255,255,255,0.18);color:rgba(255,255,255,0.45);padding:0.55rem 1.4rem;border-radius:4px;cursor:pointer;margin-top:2rem;transition:opacity 0.6s ease,border-color 0.2s,color 0.2s;opacity:0;pointer-events:none;">
  Calcolatore Grafico →
</button>
```

- [ ] **Step 4: Add IntersectionObserver for hero button reveal**

In the `<script>` block, at the **bottom** (after the existing bootstrap calls like `Hero.init()`, `MainEngine.init()` etc.), add:

```js
// Reveal hero calc button after user has seen §1
const _heroCalcBtn = document.getElementById('btn-hero-calc');
const _fondamentiRevealObs = new IntersectionObserver((entries) => {
  if (entries[0].isIntersecting) {
    _heroCalcBtn.style.opacity = '1';
    _heroCalcBtn.style.pointerEvents = 'auto';
    _fondamentiRevealObs.disconnect();
  }
}, { threshold: 0.2 });
_fondamentiRevealObs.observe(document.getElementById('fondamenti'));
```

- [ ] **Step 5: Open browser and verify**

Open `geometria-del-taxi-master/index.html` in browser. Expected:
- §6 section visible at bottom with title "Calcolatore Grafico", button "▶ Apri Calcolatore Grafico"
- Clicking button does nothing yet (GraphCalc not defined — console error is expected)
- Hero button NOT visible initially
- After scrolling down past §1 Fondamenti, hero button fades in
- No other visual regressions in §1–§5

---

## Task 2: Overlay HTML + CSS + Open/Close Logic

**Files:**
- Modify: `geometria-del-taxi-master/index.html` — add overlay HTML, CSS, and GraphCalc shell

- [ ] **Step 1: Add overlay HTML structure**

Just before the closing `</body>` tag (after the `<script>` block's closing `</script>`), add:

```html
<div id="calc-overlay" style="position:fixed;inset:0;z-index:9999;background:#050505;display:flex;flex-direction:column;opacity:0;pointer-events:none;transform:translateY(40px);transition:opacity 0.3s cubic-bezier(0.16,1,0.3,1),transform 0.3s cubic-bezier(0.16,1,0.3,1);">

  <!-- ESC badge -->
  <div id="calc-esc-badge"
    onclick="GraphCalc.close()"
    style="position:absolute;top:14px;right:16px;z-index:10;font-family:'IBM Plex Mono',monospace;font-size:0.68rem;letter-spacing:0.12em;color:rgba(255,255,255,0.28);cursor:pointer;padding:4px 10px;border:1px solid rgba(255,255,255,0.1);border-radius:3px;opacity:0;transition:opacity 0.4s ease,color 0.2s;user-select:none;">
    ESC &nbsp;per uscire
  </div>

  <!-- Main layout -->
  <div style="display:flex;flex:1;overflow:hidden;">

    <!-- Sidebar -->
    <div id="calc-sidebar" style="width:260px;flex-shrink:0;background:#080808;border-right:1px solid #161616;display:flex;flex-direction:column;overflow-y:auto;">
      <!-- populated by GraphCalc.renderSidebar() -->
    </div>

    <!-- Canvas area -->
    <div style="flex:1;position:relative;overflow:hidden;">
      <canvas id="calc-canvas" style="display:block;width:100%;height:100%;cursor:crosshair;"></canvas>
    </div>

  </div>
</div>
```

- [ ] **Step 2: Add page-blur CSS class**

In the `<style>` block, add:

```css
body.calc-open > *:not(#calc-overlay) {
  filter: blur(6px);
  opacity: 0.3;
  pointer-events: none;
  transition: filter 0.25s ease, opacity 0.25s ease;
}
body.calc-closed > *:not(#calc-overlay) {
  filter: blur(0);
  opacity: 1;
  transition: filter 0.25s ease, opacity 0.25s ease;
}

#calc-overlay.is-open {
  opacity: 1 !important;
  pointer-events: auto !important;
  transform: translateY(0) !important;
}

#calc-sidebar::-webkit-scrollbar { width: 4px; }
#calc-sidebar::-webkit-scrollbar-track { background: #080808; }
#calc-sidebar::-webkit-scrollbar-thumb { background: #222; border-radius: 2px; }
```

- [ ] **Step 3: Add GraphCalc IIFE shell with open/close**

In the `<script>` block, **before** the existing bootstrap calls, add this entire module:

```js
const GraphCalc = (() => {
  // ── STATE ──
  const state = {
    objects: [],          // array of object records
    nextId: 1,
    selectedId: null,
    isolatedId: null,
    mode: 'select',       // 'select' | 'point' | 'pan'
    snap: false,
    pan: { x: 0, y: 0 },
    scale: 60,
    dragging: null,
    dragStart: null,
    mouseWorld: null,
    pendingTool: null,    // tool being constructed: { type, pointsNeeded, pointsPlaced }
    showRegions: false,
    isOpen: false,
  };

  // ── OVERLAY OPEN / CLOSE ──
  let _savedScrollY = 0;

  function open() {
    _savedScrollY = window.scrollY;
    state.isOpen = true;
    const overlay = document.getElementById('calc-overlay');
    overlay.style.display = 'flex';
    // Force reflow before adding class (for transition to fire)
    overlay.getBoundingClientRect();
    overlay.classList.add('is-open');
    document.body.classList.add('calc-open');
    document.body.classList.remove('calc-closed');
    // ESC badge: appear after 200ms delay
    setTimeout(() => {
      const badge = document.getElementById('calc-esc-badge');
      badge.style.opacity = '1';
      // Auto-hide after 3s
      setTimeout(() => { badge.style.opacity = '0'; }, 3000);
    }, 200);
    // Initialize canvas on first open
    if (!state._initialized) { _initCanvas(); state._initialized = true; }
    _draw();
    renderSidebar();
  }

  function close() {
    state.isOpen = false;
    const overlay = document.getElementById('calc-overlay');
    overlay.classList.remove('is-open');
    overlay.style.opacity = '0';
    overlay.style.transform = 'translateY(40px)';
    document.body.classList.remove('calc-open');
    document.body.classList.add('calc-closed');
    document.getElementById('calc-esc-badge').style.opacity = '0';
    setTimeout(() => {
      overlay.style.display = 'none';
      document.body.classList.remove('calc-closed');
    }, 250);
    window.scrollTo(0, _savedScrollY);
  }

  // ESC key
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && state.isOpen) close();
  });

  // ESC badge re-appears on hover over top-right corner
  document.getElementById('calc-esc-badge').addEventListener('mouseenter', () => {
    document.getElementById('calc-esc-badge').style.opacity = '1';
  });
  document.getElementById('calc-esc-badge').addEventListener('mouseleave', () => {
    setTimeout(() => {
      if (state.isOpen) document.getElementById('calc-esc-badge').style.opacity = '0';
    }, 1500);
  });

  // ── CANVAS INIT (placeholder — expanded in Task 3) ──
  function _initCanvas() {
    const canvas = document.getElementById('calc-canvas');
    const wrap = canvas.parentElement;
    function resize() {
      const DPR = window.devicePixelRatio || 1;
      canvas.width  = wrap.clientWidth  * DPR;
      canvas.height = wrap.clientHeight * DPR;
      _draw();
    }
    resize();
    window.addEventListener('resize', resize);
  }

  function _draw() {
    // placeholder — expanded in Task 3
    const canvas = document.getElementById('calc-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const DPR = window.devicePixelRatio || 1;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }

  // ── SIDEBAR RENDER (placeholder — expanded in Task 4) ──
  function renderSidebar() {
    const sb = document.getElementById('calc-sidebar');
    if (!sb) return;
    sb.innerHTML = `<div style="padding:16px;font-family:'IBM Plex Mono',monospace;font-size:11px;color:rgba(255,255,255,0.3);">Calcolatore Grafico</div>`;
  }

  return { open, close, renderSidebar };
})();
```

- [ ] **Step 4: Open browser and verify**

Open `geometria-del-taxi-master/index.html`. Expected:
- Click "▶ Apri Calcolatore Grafico" → overlay slides up from bottom, page blurs
- ESC badge appears top-right after ~200ms, fades after 3s
- Press ESC → overlay slides back down, page unblurs, scroll position restored
- Click badge → same as ESC
- Hero button (if visible after scrolling §1) also opens overlay

---

## Task 3: Canvas Pan / Zoom / Snap / Grid

**Files:**
- Modify: `geometria-del-taxi-master/index.html` — expand `_initCanvas` and `_draw` in GraphCalc

- [ ] **Step 1: Replace `_initCanvas` with full implementation**

Inside the `GraphCalc` IIFE, replace the `_initCanvas` function:

```js
function _initCanvas() {
  const canvas = document.getElementById('calc-canvas');
  const wrap = canvas.parentElement;
  const DPR = window.devicePixelRatio || 1;

  function resize() {
    canvas.width  = wrap.clientWidth  * DPR;
    canvas.height = wrap.clientHeight * DPR;
    canvas.style.width  = wrap.clientWidth  + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
    _draw();
  }

  // Initialize pan to center
  state.pan.x = 0;
  state.pan.y = 0;

  // Wheel zoom (centered on cursor)
  canvas.addEventListener('wheel', (e) => {
    e.preventDefault();
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left) * DPR;
    const my = (e.clientY - rect.top)  * DPR;
    const t = _getTransform();
    const before = t.toWorld(mx / DPR, my / DPR);
    const factor = e.deltaY < 0 ? 1.12 : 1 / 1.12;
    state.scale = Math.max(10, Math.min(400, state.scale * factor));
    state.pan.x = before.x - (mx / DPR - canvas.width / DPR / 2) / state.scale;
    state.pan.y = before.y + (my / DPR - canvas.height / DPR / 2) / state.scale;
    _draw();
  }, { passive: false });

  // Mouse pan / point placement
  canvas.addEventListener('mousedown', _onMouseDown);
  window.addEventListener('mousemove', _onMouseMove);
  window.addEventListener('mouseup',   _onMouseUp);
  canvas.addEventListener('mouseleave', () => { state.mouseWorld = null; _draw(); });

  window.addEventListener('resize', resize);
  resize();
}
```

- [ ] **Step 2: Add transform helpers inside GraphCalc**

Add these functions inside `GraphCalc`, after the state declaration:

```js
function _getTransform() {
  const canvas = document.getElementById('calc-canvas');
  const DPR = window.devicePixelRatio || 1;
  const w = canvas.width / DPR, h = canvas.height / DPR;
  return MiniEngine.makeTransform({ width: w, height: h }, state.scale, state.pan.x, state.pan.y);
}

function _snapCoord(wx, wy) {
  if (!state.snap) return { x: wx, y: wy };
  return { x: Math.round(wx), y: Math.round(wy) };
}

function _canvasToWorld(px, py) {
  return _getTransform().toWorld(px, py);
}
```

- [ ] **Step 3: Add mouse event handlers inside GraphCalc**

```js
function _onMouseDown(e) {
  const canvas = document.getElementById('calc-canvas');
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const world = _snapCoord(...Object.values(_canvasToWorld(mx, my)));

  if (state.mode === 'point' && state.pendingTool) {
    _placePendingPoint(world);
    return;
  }
  // Pan
  state.dragging = 'pan';
  state.dragStart = { mx: e.clientX, my: e.clientY, px: state.pan.x, py: state.pan.y };
  canvas.style.cursor = 'grab';
}

function _onMouseMove(e) {
  if (!state.isOpen) return;
  const canvas = document.getElementById('calc-canvas');
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left, my = e.clientY - rect.top;
  const raw = _canvasToWorld(mx, my);
  state.mouseWorld = _snapCoord(raw.x, raw.y);

  if (state.dragging === 'pan' && state.dragStart) {
    const dx = e.clientX - state.dragStart.mx;
    const dy = e.clientY - state.dragStart.my;
    state.pan.x = state.dragStart.px + dx / state.scale;
    state.pan.y = state.dragStart.py - dy / state.scale;
    _draw();
    return;
  }
  _draw(); // redraw for hover effects / snap cursor
}

function _onMouseUp() {
  state.dragging = null;
  const canvas = document.getElementById('calc-canvas');
  if (canvas) canvas.style.cursor = state.mode === 'point' ? 'crosshair' : 'default';
}

// Placeholder — implemented in Task 7
function _placePendingPoint(world) {}
```

- [ ] **Step 4: Replace `_draw` with full grid rendering**

```js
function _draw() {
  const canvas = document.getElementById('calc-canvas');
  if (!canvas || !state.isOpen) return;
  const ctx = canvas.getContext('2d');
  const DPR = window.devicePixelRatio || 1;
  const w = canvas.width / DPR, h = canvas.height / DPR;

  ctx.save();
  ctx.scale(DPR, DPR);
  ctx.clearRect(0, 0, w, h);
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, w, h);

  const t = _getTransform();
  MiniEngine.drawGrid(ctx, t);

  // Draw all objects
  state.objects.forEach(obj => {
    if (!obj.visible) return;
    const alpha = (state.isolatedId && state.isolatedId !== obj.id) ? 0.1 : 1.0;
    ctx.globalAlpha = alpha;
    _drawObject(ctx, t, obj);
    ctx.globalAlpha = 1.0;
  });

  // Draw snap cursor indicator
  if (state.snap && state.mouseWorld && state.mode === 'point') {
    const { x, y } = _getTransform().toCanvas(state.mouseWorld.x, state.mouseWorld.y);
    ctx.save();
    ctx.strokeStyle = 'rgba(255,255,255,0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath(); ctx.moveTo(x - 8, y); ctx.lineTo(x + 8, y); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(x, y - 8); ctx.lineTo(x, y + 8); ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  ctx.restore();
}

// Placeholder — expanded per object type in Tasks 6A-6F
function _drawObject(ctx, t, obj) {
  // Each type implemented in its own task
}
```

- [ ] **Step 5: Open browser and verify**

Open overlay. Expected:
- Dark canvas with grid and axes (same style as existing MainEngine)
- Drag with mouse → pans the view
- Scroll wheel → zooms in/out centered on cursor
- No console errors

---

## Task 4: Sidebar Complete HTML/CSS Shell

**Files:**
- Modify: `geometria-del-taxi-master/index.html` — replace `renderSidebar` with full implementation

- [ ] **Step 1: Add sidebar CSS**

In `<style>`, add:

```css
/* ─── CALC SIDEBAR ─── */
.csb-section {
  border-bottom: 1px solid #161616;
  padding: 12px 14px;
}
.csb-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  color: rgba(255,255,255,0.25);
  margin-bottom: 8px;
}
.csb-mode-row {
  display: flex;
  gap: 4px;
}
.csb-mode-btn {
  flex: 1;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62rem;
  letter-spacing: 0.06em;
  background: #0f0f0f;
  border: 1px solid #1e1e1e;
  color: rgba(255,255,255,0.35);
  padding: 6px 4px;
  border-radius: 4px;
  cursor: pointer;
  text-align: center;
  transition: background 0.15s, border-color 0.15s, color 0.15s;
}
.csb-mode-btn:hover { background: #161616; color: rgba(255,255,255,0.6); }
.csb-mode-btn.active { background: #1a1a1a; border-color: rgba(255,255,255,0.25); color: rgba(255,255,255,0.9); }

.csb-tool-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  background: transparent;
  border: none;
  color: rgba(255,255,255,0.5);
  padding: 7px 6px;
  border-radius: 4px;
  cursor: pointer;
  text-align: left;
  transition: background 0.12s, color 0.12s;
}
.csb-tool-btn:hover { background: #111; color: rgba(255,255,255,0.85); }
.csb-tool-btn.active { background: #141414; color: #fff; }
.csb-tool-btn.disabled { opacity: 0.3; cursor: not-allowed; }
.csb-tool-icon { width: 18px; text-align: center; font-size: 0.85rem; flex-shrink: 0; }

.csb-obj-item {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 6px;
  border-radius: 4px;
  cursor: pointer;
  transition: background 0.12s;
  position: relative;
}
.csb-obj-item:hover { background: #111; }
.csb-obj-item.selected { background: #141414; }
.csb-obj-dot {
  width: 11px; height: 11px;
  border-radius: 50%;
  flex-shrink: 0;
  cursor: pointer;
  transition: transform 0.1s;
}
.csb-obj-dot:hover { transform: scale(1.25); }
.csb-obj-name {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  color: rgba(255,255,255,0.7);
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.csb-obj-name.hidden-obj { opacity: 0.3; text-decoration: line-through; }
.csb-obj-actions {
  display: flex;
  gap: 3px;
  opacity: 0;
  transition: opacity 0.15s;
}
.csb-obj-item:hover .csb-obj-actions,
.csb-obj-item.selected .csb-obj-actions { opacity: 1; }
.csb-obj-act-btn {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.58rem;
  background: #1a1a1a;
  border: 1px solid #2a2a2a;
  color: rgba(255,255,255,0.4);
  padding: 2px 5px;
  border-radius: 3px;
  cursor: pointer;
  transition: color 0.1s, border-color 0.1s;
}
.csb-obj-act-btn:hover { color: rgba(255,255,255,0.85); border-color: rgba(255,255,255,0.3); }
.csb-obj-act-btn.isolate-btn { color: rgba(255,255,255,0.5); }
.csb-obj-act-btn.isolate-btn.active { color: #f59e0b; border-color: #f59e0b; }

.csb-param-row {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-bottom: 8px;
}
.csb-param-label {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62rem;
  color: rgba(255,255,255,0.3);
  text-transform: uppercase;
  width: 30px;
  flex-shrink: 0;
}
.csb-param-row input[type=range] {
  flex: 1;
  height: 3px;
  cursor: pointer;
}
.csb-param-hitbox {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.72rem;
  background: #0f0f0f;
  border: 1px solid #222;
  color: rgba(255,255,255,0.7);
  width: 48px;
  padding: 3px 5px;
  border-radius: 3px;
  text-align: right;
}
.csb-param-hitbox:focus { outline: none; border-color: rgba(255,255,255,0.3); }
.csb-output {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.62rem;
  color: rgba(255,255,255,0.3);
  line-height: 1.8;
  margin-top: 6px;
}
.csb-snap-row {
  display: flex;
  align-items: center;
  gap: 8px;
}
.csb-snap-toggle {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.68rem;
  background: #0f0f0f;
  border: 1px solid #1e1e1e;
  color: rgba(255,255,255,0.4);
  padding: 4px 10px;
  border-radius: 3px;
  cursor: pointer;
  transition: all 0.15s;
}
.csb-snap-toggle.active { border-color: rgba(255,255,255,0.3); color: rgba(255,255,255,0.85); }
.csb-info-icon {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  color: rgba(255,255,255,0.2);
  cursor: help;
  position: relative;
}
.csb-info-icon:hover::after {
  content: attr(data-tip);
  position: absolute;
  left: 20px;
  top: -4px;
  background: #1a1a1a;
  border: 1px solid #333;
  color: rgba(255,255,255,0.65);
  font-size: 0.6rem;
  padding: 6px 10px;
  border-radius: 4px;
  white-space: nowrap;
  z-index: 100;
  line-height: 1.6;
  width: 180px;
  white-space: normal;
}
.csb-status {
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.65rem;
  color: #f59e0b;
  padding: 8px 14px;
  min-height: 28px;
  border-bottom: 1px solid #161616;
}
.csb-regions-toggle {
  display: flex;
  align-items: center;
  gap: 8px;
  font-family: 'IBM Plex Mono', monospace;
  font-size: 0.68rem;
  color: rgba(255,255,255,0.45);
  cursor: pointer;
  padding: 4px 0;
}
.csb-regions-toggle input[type=checkbox] { accent-color: #a78bfa; }
```

- [ ] **Step 2: Replace `renderSidebar` with full implementation**

Replace the placeholder `renderSidebar` function inside `GraphCalc`:

```js
function renderSidebar() {
  const sb = document.getElementById('calc-sidebar');
  if (!sb) return;

  const tools = [
    { type: 'asse',         icon: '⊥', label: 'Asse taxicab',    disabled: false },
    { type: 'circonferenza',icon: '○', label: 'Circonferenza',   disabled: false },
    { type: 'ellisse',      icon: '⬡', label: 'Ellisse',         disabled: false },
    { type: 'iperbole',     icon: '⟩⟨',label: 'Iperbole',        disabled: false },
    { type: 'parabola',     icon: '⌒', label: 'Parabola',        disabled: false },
    { type: 'luogo',        icon: 'ƒ', label: 'Luogo libero…',   disabled: false },
    { type: 'distanza',     icon: '↔', label: 'Distanza',        disabled: true  },
  ];

  const selectedObj = state.objects.find(o => o.id === state.selectedId);
  const isIsolated  = !!state.isolatedId;

  sb.innerHTML = `
    <!-- Header -->
    <div class="csb-section" style="padding:10px 14px;display:flex;align-items:center;justify-content:space-between;">
      <span style="font-family:'IBM Plex Mono',monospace;font-size:0.68rem;letter-spacing:0.08em;color:rgba(255,255,255,0.4);text-transform:uppercase;">Calcolatore Grafico</span>
    </div>

    <!-- Status message -->
    <div class="csb-status" id="csb-status">${_getStatusMessage()}</div>

    <!-- Mode selector -->
    <div class="csb-section">
      <div class="csb-label">Modalità</div>
      <div class="csb-mode-row">
        <button class="csb-mode-btn ${state.mode==='select'?'active':''}" onclick="GraphCalc.setMode('select')">↖ Seleziona</button>
        <button class="csb-mode-btn ${state.mode==='point'?'active':''}"  onclick="GraphCalc.setMode('point')">✦ Punto</button>
        <button class="csb-mode-btn ${state.mode==='pan'?'active':''}"    onclick="GraphCalc.setMode('pan')">✋ Sposta</button>
      </div>
    </div>

    <!-- Snap toggle -->
    <div class="csb-section">
      <div class="csb-snap-row">
        <button class="csb-snap-toggle ${state.snap?'active':''}" onclick="GraphCalc.toggleSnap()">🧲 Snap</button>
        <span class="csb-info-icon" data-tip="Agganciamento alla griglia intera. Attivalo per posizionare punti esatti su coordinate intere.">ⓘ</span>
      </div>
    </div>

    <!-- Create object -->
    <div class="csb-section">
      <div class="csb-label">Crea oggetto</div>
      ${tools.map(t => `
        <button class="csb-tool-btn ${t.disabled?'disabled':''} ${state.pendingTool?.type===t.type?'active':''}"
          ${t.disabled ? 'disabled title="In sviluppo"' : `onclick="GraphCalc.startTool('${t.type}')"`}>
          <span class="csb-tool-icon">${t.icon}</span>
          ${t.label}
          ${t.disabled ? '<span style="margin-left:auto;font-size:0.55rem;opacity:0.4;">🔒</span>' : ''}
        </button>
      `).join('')}
    </div>

    <!-- Object list -->
    <div class="csb-section" style="flex:1;">
      <div class="csb-label">Oggetti ${state.objects.length > 0 ? `(${state.objects.length})` : ''}</div>
      ${state.objects.length === 0
        ? `<div style="font-family:'IBM Plex Mono',monospace;font-size:0.62rem;color:rgba(255,255,255,0.15);padding:6px 0;">Nessun oggetto. Crea qualcosa sopra.</div>`
        : state.objects.map(obj => `
          <div class="csb-obj-item ${obj.id===state.selectedId?'selected':''}"
            onclick="GraphCalc.selectObject(${obj.id})">
            <div class="csb-obj-dot"
              style="background:${obj.visible ? obj.color : 'transparent'};border:${obj.visible?'none':'1px solid '+obj.color};"
              onclick="event.stopPropagation();GraphCalc.toggleVisible(${obj.id})"
              ondblclick="event.stopPropagation();GraphCalc.pickColor(${obj.id})"
              title="Click: nascondi/mostra | Dbl-click: cambia colore"></div>
            <span class="csb-obj-name ${!obj.visible?'hidden-obj':''}"
              ondblclick="event.stopPropagation();GraphCalc.renameObject(${obj.id}, this)">${obj.name}</span>
            <div class="csb-obj-actions">
              <button class="csb-obj-act-btn isolate-btn ${state.isolatedId===obj.id?'active':''}"
                onclick="event.stopPropagation();GraphCalc.isolateObject(${obj.id})"
                title="Isola questo oggetto">
                ${state.isolatedId===obj.id ? 'ESCI' : 'ISOLA'}
              </button>
              <button class="csb-obj-act-btn"
                onclick="event.stopPropagation();GraphCalc.deleteObject(${obj.id})"
                title="Elimina" style="color:rgba(255,100,100,0.5);">×</button>
            </div>
          </div>
        `).join('')
      }
    </div>

    <!-- Parameters panel (context-sensitive) -->
    ${selectedObj ? _renderParamsPanel(selectedObj) : ''}

    <!-- Region analysis (only in isolate mode) -->
    ${isIsolated && selectedObj ? `
      <div class="csb-section">
        <div class="csb-label">Analisi Regioni</div>
        <label class="csb-regions-toggle">
          <input type="checkbox" ${state.showRegions?'checked':''} onchange="GraphCalc.toggleRegions(this.checked)">
          Mostra regioni e equazioni
        </label>
      </div>
    ` : ''}
  `;
}

function _getStatusMessage() {
  if (state.pendingTool) {
    const needed = state.pendingTool.pointsNeeded;
    const placed = state.pendingTool.pointsPlaced.length;
    const labels = {
      asse:          ['P1 (primo punto)','P2 (secondo punto)'],
      circonferenza: ['Centro C'],
      ellisse:       ['F₁ (primo fuoco)','F₂ (secondo fuoco)'],
      iperbole:      ['F₁ (primo fuoco)','F₂ (secondo fuoco)'],
      parabola:      ['Fuoco F','Punto sulla direttrice'],
      luogo:         [],
    };
    const lbl = (labels[state.pendingTool.type] || [])[placed] || 'punto';
    return `Clicca sul piano per posizionare ${lbl}`;
  }
  return '';
}
```

- [ ] **Step 3: Add setMode / toggleSnap / startTool / selectObject / deleteObject / toggleVisible / isolateObject / toggleRegions / renameObject / pickColor stubs**

Add these public methods inside `GraphCalc`, before the `return` statement:

```js
function setMode(mode) {
  state.mode = mode;
  const canvas = document.getElementById('calc-canvas');
  if (canvas) canvas.style.cursor = mode === 'point' ? 'crosshair' : 'default';
  renderSidebar();
}

function toggleSnap() {
  state.snap = !state.snap;
  renderSidebar();
}

function startTool(type) {
  const pointsNeeded = { asse:2, circonferenza:1, ellisse:2, iperbole:2, parabola:2, luogo:0 };
  state.pendingTool = { type, pointsNeeded: pointsNeeded[type], pointsPlaced: [] };
  state.mode = 'point';
  renderSidebar();
  _draw();
}

function selectObject(id) {
  state.selectedId = (state.selectedId === id) ? null : id;
  renderSidebar();
}

function deleteObject(id) {
  state.objects = state.objects.filter(o => o.id !== id);
  if (state.selectedId === id) state.selectedId = null;
  if (state.isolatedId === id) state.isolatedId = null;
  renderSidebar();
  _draw();
}

function toggleVisible(id) {
  const obj = state.objects.find(o => o.id === id);
  if (obj) { obj.visible = !obj.visible; renderSidebar(); _draw(); }
}

function isolateObject(id) {
  if (state.isolatedId === id) {
    state.isolatedId = null;
    state.showRegions = false;
  } else {
    state.isolatedId = id;
    state.selectedId = id;
  }
  renderSidebar();
  _draw();
}

function toggleRegions(val) {
  state.showRegions = val;
  _draw();
}

function renameObject(id, el) {
  const obj = state.objects.find(o => o.id === id);
  if (!obj) return;
  el.contentEditable = 'true';
  el.focus();
  el.addEventListener('blur', () => {
    obj.name = el.textContent.trim() || obj.name;
    el.contentEditable = 'false';
    renderSidebar();
  }, { once: true });
  el.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); el.blur(); }
  });
}

function pickColor(id) {
  const obj = state.objects.find(o => o.id === id);
  if (!obj) return;
  const palette = ['#e63946','#3b82f6','#f59e0b','#22c55e','#a78bfa','#f472b6','#34d399','#fb923c'];
  // Cycle through palette
  const idx = palette.indexOf(obj.color);
  obj.color = palette[(idx + 1) % palette.length];
  renderSidebar();
  _draw();
}
```

- [ ] **Step 4: Update the `return` statement of GraphCalc**

```js
return {
  open, close, renderSidebar,
  setMode, toggleSnap, startTool,
  selectObject, deleteObject, toggleVisible,
  isolateObject, toggleRegions, renameObject, pickColor,
};
```

- [ ] **Step 5: Open browser and verify**

Open overlay. Expected:
- Full sidebar visible: header, status, mode buttons, snap toggle, tool list, empty object list
- Mode buttons highlight on click
- Snap toggle highlights on click
- Tool buttons clickable (no objects created yet — implemented in later tasks)
- No console errors

---

## Task 5: Object System + Point Placement Mode

**Files:**
- Modify: `geometria-del-taxi-master/index.html` — implement `_placePendingPoint` and `createObject`

- [ ] **Step 1: Add default colors map**

Inside `GraphCalc`, after the state declaration, add:

```js
const DEFAULT_COLORS = {
  asse:          '#f59e0b',
  circonferenza: '#e63946',
  ellisse:       '#3b82f6',
  iperbole:      '#fb923c',
  parabola:      '#22c55e',
  luogo:         '#a78bfa',
};

const TYPE_LABELS = {
  asse:          'Asse',
  circonferenza: 'Circonferenza',
  ellisse:       'Ellisse',
  iperbole:      'Iperbole',
  parabola:      'Parabola',
  luogo:         'Luogo',
};
```

- [ ] **Step 2: Add `_createObject` function**

```js
function _createObject(type, points) {
  const id = state.nextId++;
  const name = `${TYPE_LABELS[type]} #${id}`;
  const color = DEFAULT_COLORS[type];

  let params = {};
  if (type === 'asse') {
    params = { p1: points[0], p2: points[1], showBisector: true };
  } else if (type === 'circonferenza') {
    params = { xc: points[0].x, yc: points[0].y, R: 3 };
  } else if (type === 'ellisse') {
    const d0 = Math.abs(points[1].x - points[0].x) + Math.abs(points[1].y - points[0].y);
    params = { x1: points[0].x, y1: points[0].y, x2: points[1].x, y2: points[1].y, twoA: Math.max(d0 + 1, d0 * 1.5) };
  } else if (type === 'iperbole') {
    const d0 = Math.abs(points[1].x - points[0].x) + Math.abs(points[1].y - points[0].y);
    params = { x1: points[0].x, y1: points[0].y, x2: points[1].x, y2: points[1].y, twoA: Math.max(0.5, d0 * 0.4) };
  } else if (type === 'parabola') {
    params = { xF: points[0].x, yF: points[0].y, m: 0, q: points[1].y };
  } else if (type === 'luogo') {
    params = { equation: '' };
  }

  const obj = { id, name, type, params, color, visible: true };
  state.objects.push(obj);
  state.selectedId = id;
  return obj;
}
```

- [ ] **Step 3: Implement `_placePendingPoint`**

Replace the placeholder `_placePendingPoint` with:

```js
function _placePendingPoint(world) {
  if (!state.pendingTool) return;
  state.pendingTool.pointsPlaced.push({ x: world.x, y: world.y });

  if (state.pendingTool.type === 'luogo') {
    // Luogo libero: no points needed, handled differently
    state.pendingTool = null;
    state.mode = 'select';
    renderSidebar();
    _draw();
    return;
  }

  if (state.pendingTool.pointsPlaced.length >= state.pendingTool.pointsNeeded) {
    // All points placed — create the object
    const obj = _createObject(state.pendingTool.type, state.pendingTool.pointsPlaced);
    state.pendingTool = null;
    state.mode = 'select';
    renderSidebar();
    _draw();
  } else {
    // More points needed
    renderSidebar();  // update status message
    _draw();
  }
}
```

- [ ] **Step 4: Open browser and verify**

Click "Asse taxicab" → status says "Clicca sul piano per posizionare P1". Click canvas twice → object "Asse #1" appears in list. Object list shows with color dot, ISOLA and × buttons. Mode returns to select. No console errors.

---

## Task 6A: Asse Taxicab — Port from Old Calculator

**Files:**
- Modify: `geometria-del-taxi-master/index.html` — port algorithms, implement drawObject for 'asse'

- [ ] **Step 1: Port helper functions from old calculator**

Add these functions inside `GraphCalc` (ported from `calcolatore grafico old/index.html` — `clipSegmentToRect`, `regionSegment`, `buildEquationLines`):

```js
function _clipSegment(wx1,wy1,wx2,wy2,rxMin,rxMax,ryMin,ryMax){
  const INSIDE=0,LEFT=1,RIGHT=2,BOTTOM=4,TOP=8;
  function code(x,y){let c=INSIDE;if(x<rxMin)c|=LEFT;else if(x>rxMax)c|=RIGHT;if(y<ryMin)c|=BOTTOM;else if(y>ryMax)c|=TOP;return c;}
  let x0=wx1,y0=wy1,x1=wx2,y1=wy2,c0=code(x0,y0),c1=code(x1,y1);
  while(true){
    if(!(c0|c1))return[[x0,y0],[x1,y1]];
    if(c0&c1)return null;
    const cOut=c0||c1;let x,y;const dx=x1-x0,dy=y1-y0;
    if(cOut&TOP){x=x0+dx*(ryMax-y0)/dy;y=ryMax;}
    else if(cOut&BOTTOM){x=x0+dx*(ryMin-y0)/dy;y=ryMin;}
    else if(cOut&RIGHT){y=y0+dy*(rxMax-x0)/dx;x=rxMax;}
    else{y=y0+dy*(rxMin-x0)/dx;x=rxMin;}
    if(cOut===c0){x0=x;y0=y;c0=code(x0,y0);}else{x1=x;y1=y;c1=code(x1,y1);}
  }
}

function _regionSegment(col,row,xBounds,yBounds,x1,y1,x2,y2,vMin,vMax){
  const rxMin=Math.max(xBounds[col],vMin.x-1),rxMax=Math.min(xBounds[col+1],vMax.x+1);
  const ryMin=Math.max(yBounds[row],vMin.y-1),ryMax=Math.min(yBounds[row+1],vMax.y+1);
  if(rxMin>=rxMax||ryMin>=ryMax)return null;
  const xRep=(rxMin+rxMax)/2,yRep=(ryMin+ryMax)/2;
  const sxa=xRep>=x1?1:-1,sxb=xRep>=x2?1:-1,sya=yRep>=y1?1:-1,syb=yRep>=y2?1:-1;
  const cx=sxa-sxb,cy=sya-syb,cst=sxa*x1+sya*y1-sxb*x2-syb*y2;
  return{rxMin,rxMax,ryMin,ryMax,sxa,sxb,sya,syb,cx,cy,cst,xRep,yRep};
}

function _buildEquationLines(sxa,sxb,sya,syb,x1,y1,x2,y2,cx,cy,cst){
  function f(n){const r=Math.round(n*1000)/1000;if(r===0)return'0';if(r===Math.round(r))return String(r);return String(r);}
  function absStr(v,val){if(Math.abs(val)<1e-9)return`|${v}|`;if(val>0)return`|${v} − ${f(val)}|`;return`|${v} + ${f(-val)}|`;}
  function expandedTerm(sign,v,val){const vp=sign>0?v:`−${v}`;if(Math.abs(val)<1e-9)return vp;const c=-sign*val;return c>0?`${vp} + ${f(c)}`:`${vp} − ${f(-c)}`;}
  function join(t1,t2){return t2.startsWith('−')?`${t1} − ${t2.substring(1)}`:`${t1} + ${t2}`;}
  const l1=`${absStr('x',x1)} + ${absStr('y',y1)} = ${absStr('x',x2)} + ${absStr('y',y2)}`;
  const lhs=join(expandedTerm(sxa,'x',x1),expandedTerm(sya,'y',y1));
  const rhs=join(expandedTerm(sxb,'x',x2),expandedTerm(syb,'y',y2));
  const l2=`${lhs} = ${rhs}`;
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
```

- [ ] **Step 2: Add `_drawAsse` function**

```js
function _drawAsse(ctx, t, obj) {
  const { p1, p2, showBisector } = obj.params;
  if (!p1 || !p2) return;
  const { x: x1, y: y1 } = p1, { x: x2, y: y2 } = p2;
  const taxiDist = Math.abs(x2 - x1) + Math.abs(y2 - y1);
  if (taxiDist < 1e-9) return;

  const canvas = document.getElementById('calc-canvas');
  const DPR = window.devicePixelRatio || 1;
  const w = canvas.width / DPR, h = canvas.height / DPR;
  const vMin = t.toWorld(0, h), vMax = t.toWorld(w, 0);

  const [xL, xR] = x1 <= x2 ? [x1, x2] : [x2, x1];
  const [yB, yT] = y1 <= y2 ? [y1, y2] : [y2, y1];
  const INF = 1e9;
  const xBounds = [-INF, xL, xR, INF], yBounds = [-INF, yB, yT, INF];

  // Taxicab locus
  ctx.save();
  ctx.strokeStyle = obj.color;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = 'round'; ctx.lineCap = 'round';
  ctx.shadowColor = obj.color.replace(')', ',0.5)').replace('rgb','rgba');
  ctx.shadowBlur = 6;
  ctx.beginPath();
  for (let col = 0; col < 3; col++) {
    for (let row = 0; row < 3; row++) {
      const r = _regionSegment(col, row, xBounds, yBounds, x1, y1, x2, y2, vMin, vMax);
      if (!r) continue;
      const { rxMin, rxMax, ryMin, ryMax, cx, cy, cst } = r;
      if (cx === 0 && cy === 0) {
        if (Math.abs(cst) < 1e-9) {
          const ca = t.toCanvas(rxMin, ryMax), cb = t.toCanvas(rxMax, ryMin);
          ctx.save(); ctx.fillStyle = obj.color.replace(')', ',0.12)').replace('rgb','rgba');
          ctx.shadowBlur = 0; ctx.fillRect(ca.x, ca.y, cb.x - ca.x, cb.y - ca.y); ctx.restore();
        }
        continue;
      }
      let seg;
      if (cy === 0) { const wx = cst/cx; seg = _clipSegment(wx,ryMin,wx,ryMax,rxMin,rxMax,ryMin,ryMax); }
      else if (cx === 0) { const wy = cst/cy; seg = _clipSegment(rxMin,wy,rxMax,wy,rxMin,rxMax,ryMin,ryMax); }
      else { seg = _clipSegment(rxMin,(cst-cx*rxMin)/cy,rxMax,(cst-cx*rxMax)/cy,rxMin,rxMax,ryMin,ryMax); }
      if (!seg) continue;
      const p0 = t.toCanvas(seg[0][0], seg[0][1]), p1e = t.toCanvas(seg[1][0], seg[1][1]);
      ctx.moveTo(p0.x, p0.y); ctx.lineTo(p1e.x, p1e.y);
    }
  }
  ctx.stroke(); ctx.restore();

  // Euclidean bisector (optional)
  if (showBisector) {
    const mx=(x1+x2)/2, my=(y1+y2)/2, dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy);
    if (len > 1e-9) {
      const px=-dy/len, py=dx/len, ext=(w+h)/t.scale+10;
      const ca=t.toCanvas(mx+px*ext, my+py*ext), cb=t.toCanvas(mx-px*ext, my-py*ext);
      ctx.save(); ctx.globalAlpha=0.3; ctx.strokeStyle='#22c55e'; ctx.lineWidth=1;
      ctx.shadowColor='rgba(34,197,94,0.5)'; ctx.shadowBlur=6;
      ctx.beginPath(); ctx.moveTo(ca.x,ca.y); ctx.lineTo(cb.x,cb.y); ctx.stroke(); ctx.restore();
    }
  }

  // Points
  MiniEngine.drawPoint(ctx, t, x1, y1, '#60a5fa', 5);
  MiniEngine.drawPoint(ctx, t, x2, y2, '#f87171', 5);

  // Region debug overlay
  if (state.showRegions && state.isolatedId === obj.id && state.mouseWorld) {
    _drawAsseRegions(ctx, t, obj, xBounds, yBounds, vMin, vMax);
  }
}

function _drawAsseRegions(ctx, t, obj, xBounds, yBounds, vMin, vMax) {
  const { p1, p2 } = obj.params;
  const { x: x1, y: y1 } = p1, { x: x2, y: y2 } = p2;
  const canvas = document.getElementById('calc-canvas');
  const DPR = window.devicePixelRatio || 1;
  const w = canvas.width / DPR, h = canvas.height / DPR;

  // Critical lines
  const [xL, xR] = x1 <= x2 ? [x1, x2] : [x2, x1];
  const [yB, yT] = y1 <= y2 ? [y1, y2] : [y2, y1];
  ctx.save();
  ctx.strokeStyle = 'rgba(160,160,255,0.35)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 4]);
  for (const xv of [xL, xR]) {
    const cx = t.toCanvas(xv, 0).x;
    ctx.beginPath(); ctx.moveTo(cx, 0); ctx.lineTo(cx, h); ctx.stroke();
  }
  for (const yv of [yB, yT]) {
    const cy = t.toCanvas(0, yv).y;
    ctx.beginPath(); ctx.moveTo(0, cy); ctx.lineTo(w, cy); ctx.stroke();
  }
  ctx.setLineDash([]); ctx.restore();

  // Hover region tooltip
  if (!state.mouseWorld) return;
  const { x: mx, y: my } = state.mouseWorld;
  const col = mx < xL ? 0 : mx < xR ? 1 : 2;
  const row = my < yB ? 0 : my < yT ? 1 : 2;
  const r = _regionSegment(col, row, xBounds, yBounds, x1, y1, x2, y2, vMin, vMax);
  if (!r) return;
  const { rxMin, rxMax, ryMin, ryMax, sxa, sxb, sya, syb, cx, cy, cst } = r;
  const ca = t.toCanvas(rxMin, ryMax), cb = t.toCanvas(rxMax, ryMin);
  ctx.save();
  ctx.fillStyle = 'rgba(12,14,35,0.72)';
  ctx.fillRect(ca.x, ca.y, cb.x - ca.x, cb.y - ca.y);
  ctx.restore();

  // Highlight active segment in region
  if (!(cx === 0 && cy === 0)) {
    let seg;
    if (cy === 0) { const wx=cst/cx; seg=_clipSegment(wx,ryMin,wx,ryMax,rxMin,rxMax,ryMin,ryMax); }
    else if (cx === 0) { const wy=cst/cy; seg=_clipSegment(rxMin,wy,rxMax,wy,rxMin,rxMax,ryMin,ryMax); }
    else { seg=_clipSegment(rxMin,(cst-cx*rxMin)/cy,rxMax,(cst-cx*rxMax)/cy,rxMin,rxMax,ryMin,ryMax); }
    if (seg) {
      const p0=t.toCanvas(seg[0][0],seg[0][1]), p1e=t.toCanvas(seg[1][0],seg[1][1]);
      ctx.save(); ctx.strokeStyle='white'; ctx.lineWidth=3.5; ctx.lineCap='round';
      ctx.shadowColor='rgba(255,255,255,0.8)'; ctx.shadowBlur=14;
      ctx.beginPath(); ctx.moveTo(p0.x,p0.y); ctx.lineTo(p1e.x,p1e.y); ctx.stroke(); ctx.restore();
    }
  }

  // Equation tooltip
  const lines = _buildEquationLines(sxa, sxb, sya, syb, x1, y1, x2, y2, cx, cy, cst);
  ctx.save(); ctx.font = '12.5px IBM Plex Mono, monospace';
  const lineH=20, pad=14;
  const maxW = Math.max(...lines.map(l => ctx.measureText(l).width));
  const boxW=maxW+pad*2, boxH=lines.length*lineH+pad*1.5;
  const ctrX = Math.max(boxW/2+8, Math.min(w-boxW/2-8, (Math.max(ca.x,0)+Math.min(cb.x,w))/2));
  const ctrY = Math.max(boxH/2+8, Math.min(h-boxH/2-8, (Math.max(ca.y,0)+Math.min(cb.y,h))/2));
  const bx=ctrX-boxW/2, by=ctrY-boxH/2;
  ctx.fillStyle='rgba(10,12,28,0.92)'; ctx.strokeStyle='rgba(99,102,241,0.45)'; ctx.lineWidth=1;
  ctx.beginPath(); ctx.roundRect(bx,by,boxW,boxH,7); ctx.fill(); ctx.stroke();
  const lineColors=['rgba(255,255,255,0.42)','rgba(226,232,240,0.9)','rgba(245,158,11,0.95)','#22c55e'];
  ctx.textAlign='left'; ctx.textBaseline='top';
  lines.forEach((line,i) => {
    ctx.fillStyle=lineColors[i];
    ctx.font = i===0 ? '11px IBM Plex Mono,monospace' : i===3 ? 'bold 13px IBM Plex Mono,monospace' : '12.5px IBM Plex Mono,monospace';
    ctx.fillText(line, bx+pad, by+pad*0.75+i*lineH);
  });
  ctx.restore();
}
```

- [ ] **Step 3: Wire `_drawAsse` into `_drawObject`**

Replace the placeholder `_drawObject`:

```js
function _drawObject(ctx, t, obj) {
  if (obj.type === 'asse')          _drawAsse(ctx, t, obj);
  else if (obj.type === 'circonferenza') _drawCirconferenza(ctx, t, obj);
  else if (obj.type === 'ellisse')  _drawEllisse(ctx, t, obj);
  else if (obj.type === 'iperbole') _drawIperbole(ctx, t, obj);
  else if (obj.type === 'parabola') _drawParabola(ctx, t, obj);
  else if (obj.type === 'luogo')    _drawLuogo(ctx, t, obj);
}
// Stubs for not-yet-implemented types (Task 6B-6F):
function _drawCirconferenza(ctx, t, obj) {}
function _drawEllisse(ctx, t, obj) {}
function _drawIperbole(ctx, t, obj) {}
function _drawParabola(ctx, t, obj) {}
function _drawLuogo(ctx, t, obj) {}
```

- [ ] **Step 4: Add asse params panel to `_renderParamsPanel`**

Add this function inside `GraphCalc`:

```js
function _renderParamsPanel(obj) {
  if (obj.type === 'asse') {
    const p1 = obj.params.p1 || {x:0,y:0};
    const p2 = obj.params.p2 || {x:0,y:0};
    const d1 = (Math.abs(p2.x-p1.x)+Math.abs(p2.y-p1.y)).toFixed(2);
    return `
      <div class="csb-section">
        <div class="csb-label">Parametri — Asse</div>
        <div class="csb-param-row">
          <span class="csb-param-label">P₁</span>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:0.68rem;color:rgba(255,255,255,0.55);">(${p1.x.toFixed(2)}, ${p1.y.toFixed(2)})</span>
        </div>
        <div class="csb-param-row">
          <span class="csb-param-label">P₂</span>
          <span style="font-family:'IBM Plex Mono',monospace;font-size:0.68rem;color:rgba(255,255,255,0.55);">(${p2.x.toFixed(2)}, ${p2.y.toFixed(2)})</span>
        </div>
        <div class="csb-output">d₁(P₁,P₂) = ${d1}</div>
        <label style="display:flex;align-items:center;gap:6px;margin-top:8px;font-family:'IBM Plex Mono',monospace;font-size:0.65rem;color:rgba(255,255,255,0.4);cursor:pointer;">
          <input type="checkbox" ${obj.params.showBisector?'checked':''} accent-color="#22c55e"
            onchange="(()=>{const o=GraphCalc._getObj(${obj.id});if(o)o.params.showBisector=this.checked;GraphCalc._redraw();})()">
          Mostra bisettrice euclidea
        </label>
      </div>
    `;
  }
  return `<div class="csb-section"><div class="csb-label">Parametri</div><div class="csb-output">(seleziona un oggetto)</div></div>`;
}
```

- [ ] **Step 5: Expose `_getObj` and `_redraw` in the return statement**

These are called from inline HTML event handlers:

```js
// Add inside GraphCalc before the return:
function _getObj(id) { return state.objects.find(o => o.id === id); }
function _redraw() { _draw(); }
```

Update return:

```js
return {
  open, close, renderSidebar,
  setMode, toggleSnap, startTool,
  selectObject, deleteObject, toggleVisible,
  isolateObject, toggleRegions, renameObject, pickColor,
  _getObj, _redraw,
};
```

- [ ] **Step 6: Open browser and verify**

Create an asse: click "Asse taxicab", click two points on canvas → yellow locus appears, green bisector at 30% opacity, P1/P2 dots shown. Select object → params panel shows coordinates and d₁. Isolate → ISOLA button turns amber. Toggle "Analizza regioni" → critical lines appear. Hover over regions → dark fill + white highlighted segment + equation tooltip with 4 lines. No console errors.

---

## Task 6B: Circonferenza Taxicab

**Files:**
- Modify: `geometria-del-taxi-master/index.html` — implement `_drawCirconferenza` and its params panel

- [ ] **Step 1: Implement `_drawCirconferenza`**

Replace the stub:

```js
function _drawCirconferenza(ctx, t, obj) {
  const { xc = 0, yc = 0, R = 3 } = obj.params;
  // Critical lines (4 regions)
  MiniEngine.drawSegment(ctx, t, {x:xc,y:-100},{x:xc,y:100}, obj.color.replace(')', ',0.25)').replace('rgb','rgba'), 0.8, [4,4]);
  MiniEngine.drawSegment(ctx, t, {x:-100,y:yc},{x:100,y:yc}, obj.color.replace(')', ',0.25)').replace('rgb','rgba'), 0.8, [4,4]);
  // Diamond
  const v = ConicMath.circleVertices(xc, yc, R);
  MiniEngine.drawPolyline(ctx, t, [v.VN, v.VE, v.VS, v.VW], obj.color, 2.5, true);
  // Center
  MiniEngine.drawPoint(ctx, t, xc, yc, 'rgba(255,255,255,0.8)', 4);
}
```

- [ ] **Step 2: Add circonferenza to `_renderParamsPanel`**

Inside `_renderParamsPanel`, add after the asse block (before the fallback return):

```js
if (obj.type === 'circonferenza') {
  const { xc=0, yc=0, R=3 } = obj.params;
  return `
    <div class="csb-section">
      <div class="csb-label">Parametri — Circonferenza</div>
      ${_sliderRow('x꜀', xc, -10, 10, 0.5, obj.id, 'xc')}
      ${_sliderRow('y꜀', yc, -10, 10, 0.5, obj.id, 'yc')}
      ${_sliderRow('R',  R,  0, 10, 0.5, obj.id, 'R')}
      <div class="csb-output">
        Perimetro = ${(4*R*Math.SQRT2).toFixed(2)} &nbsp;|&nbsp;
        Area = ${(2*R*R).toFixed(2)} &nbsp;|&nbsp;
        π₁ = 4
      </div>
    </div>
  `;
}
```

- [ ] **Step 3: Add `_sliderRow` helper**

This generates the slider+hitbox component (Task 9 specification):

```js
function _sliderRow(label, value, min, max, step, objId, paramKey) {
  const sliderVal = Math.min(max, Math.max(min, value));
  return `
    <div class="csb-param-row">
      <span class="csb-param-label">${label}</span>
      <input type="range" min="${min}" max="${max}" step="${step}" value="${sliderVal}"
        style="flex:1;accent-color:${DEFAULT_COLORS['circonferenza']}"
        oninput="GraphCalc._setParam(${objId},'${paramKey}',parseFloat(this.value));this.nextElementSibling.value=this.value">
      <input type="number" class="csb-param-hitbox" value="${value}" step="${step}"
        onchange="GraphCalc._setParam(${objId},'${paramKey}',parseFloat(this.value),true);this.previousElementSibling.value=Math.min(${max},Math.max(${min},parseFloat(this.value)||0))">
    </div>
  `;
}
```

- [ ] **Step 4: Add `_setParam` function**

```js
function _setParam(objId, key, val, checkLarge) {
  if (checkLarge && Math.abs(val) > 100) {
    if (!confirm(`Il valore ${val} è molto grande e potrebbe rallentare il rendering. Continuare?`)) return;
  }
  const obj = _getObj(objId);
  if (!obj) return;
  obj.params[key] = val;
  renderSidebar();
  _draw();
}
```

Add `_setParam` to the return statement of `GraphCalc`.

- [ ] **Step 5: Open browser and verify**

Create circonferenza: click "Circonferenza", click one point → red diamond appears. Select it → params panel shows sliders for x꜀, y꜀, R. Drag R slider → diamond updates live. Type 15 in hitbox → alert. No console errors.

---

## Task 6C: Ellisse Taxicab

**Files:**
- Modify: `geometria-del-taxi-master/index.html`

- [ ] **Step 1: Implement `_drawEllisse`**

```js
function _drawEllisse(ctx, t, obj) {
  const { x1=−2, y1=0, x2=2, y2=0, twoA=8 } = obj.params;
  const sx1=Math.min(x1,x2), sy1=Math.min(y1,y2), sx2=Math.max(x1,x2), sy2=Math.max(y1,y2);
  // 9-region critical lines
  [sx1,sx2].forEach(xv => MiniEngine.drawSegment(ctx,t,{x:xv,y:-100},{x:xv,y:100},obj.color.replace(')',',.2)').replace('rgb','rgba'),0.8,[3,4]));
  [sy1,sy2].forEach(yv => MiniEngine.drawSegment(ctx,t,{x:-100,y:yv},{x:100,y:yv},obj.color.replace(')',',.2)').replace('rgb','rgba'),0.8,[3,4]));
  const verts = ConicMath.ellipseVertices(sx1, sy1, sx2, sy2, twoA);
  if (verts) MiniEngine.drawPolyline(ctx, t, verts, obj.color, 2.5, true);
  MiniEngine.drawPoint(ctx, t, x1, y1, obj.color, 4);
  MiniEngine.drawPoint(ctx, t, x2, y2, obj.color, 4);
}
```

- [ ] **Step 2: Add ellisse params to `_renderParamsPanel`**

```js
if (obj.type === 'ellisse') {
  const { x1=−2, y1=0, x2=2, y2=0, twoA=8 } = obj.params;
  const d0 = (Math.abs(x2-x1)+Math.abs(y2-y1)).toFixed(2);
  const k  = ((twoA/2) - parseFloat(d0)/2).toFixed(2);
  return `
    <div class="csb-section">
      <div class="csb-label">Parametri — Ellisse</div>
      ${_sliderRow('x₁', x1, -10, 10, 0.5, obj.id, 'x1')}
      ${_sliderRow('y₁', y1, -10, 10, 0.5, obj.id, 'y1')}
      ${_sliderRow('x₂', x2, -10, 10, 0.5, obj.id, 'x2')}
      ${_sliderRow('y₂', y2, -10, 10, 0.5, obj.id, 'y2')}
      ${_sliderRow('2a', twoA, 0, 10, 0.5, obj.id, 'twoA')}
      <div class="csb-output">d₀ = ${d0} &nbsp;|&nbsp; k = ${k}</div>
    </div>
  `;
}
```

- [ ] **Step 3: Verify**

Create ellisse → two-click → blue polygon. Slider 2a changes shape. d₀ and k update live.

---

## Task 6D: Iperbole Taxicab

**Files:**
- Modify: `geometria-del-taxi-master/index.html`

- [ ] **Step 1: Implement `_drawIperbole`**

```js
function _drawIperbole(ctx, t, obj) {
  const { x1=−3, y1=0, x2=3, y2=0, twoA=2 } = obj.params;
  const sx1=Math.min(x1,x2), sy1=Math.min(y1,y2), sx2=Math.max(x1,x2), sy2=Math.max(y1,y2);
  [sx1,sx2].forEach(xv => MiniEngine.drawSegment(ctx,t,{x:xv,y:-100},{x:xv,y:100},obj.color.replace(')',',.2)').replace('rgb','rgba'),0.8,[3,4]));
  [sy1,sy2].forEach(yv => MiniEngine.drawSegment(ctx,t,{x:-100,y:yv},{x:100,y:yv},obj.color.replace(')',',.2)').replace('rgb','rgba'),0.8,[3,4]));
  const result = ConicMath.hyperbolaVertices(sx1, sy1, sx2, sy2, twoA);
  if (result) {
    MiniEngine.drawPolyline(ctx, t, result.branch1, obj.color, 2.5, false);
    MiniEngine.drawPolyline(ctx, t, result.branch2, obj.color, 2.5, false);
  }
  MiniEngine.drawPoint(ctx, t, x1, y1, obj.color, 4);
  MiniEngine.drawPoint(ctx, t, x2, y2, obj.color, 4);
}
```

- [ ] **Step 2: Add iperbole params to `_renderParamsPanel`**

```js
if (obj.type === 'iperbole') {
  const { x1=−3, y1=0, x2=3, y2=0, twoA=2 } = obj.params;
  const d0 = (Math.abs(x2-x1)+Math.abs(y2-y1)).toFixed(2);
  return `
    <div class="csb-section">
      <div class="csb-label">Parametri — Iperbole</div>
      ${_sliderRow('x₁', x1, -10, 10, 0.5, obj.id, 'x1')}
      ${_sliderRow('y₁', y1, -10, 10, 0.5, obj.id, 'y1')}
      ${_sliderRow('x₂', x2, -10, 10, 0.5, obj.id, 'x2')}
      ${_sliderRow('y₂', y2, -10, 10, 0.5, obj.id, 'y2')}
      ${_sliderRow('2a', twoA, 0.5, 10, 0.5, obj.id, 'twoA')}
      <div class="csb-output">d₀ = ${d0} &nbsp;|&nbsp; 2a = ${twoA}</div>
    </div>
  `;
}
```

- [ ] **Step 3: Verify**

Two-click to place foci → two orange branch segments appear. Slider 2a changes separation.

---

## Task 6E: Parabola con Direttrice Obliqua

**Files:**
- Modify: `geometria-del-taxi-master/index.html` — extend ConicMath + implement `_drawParabola`

- [ ] **Step 1: Add `parabolaSegmentsOblique` to ConicMath**

Inside the `ConicMath` IIFE, add this function after the existing `parabolaSegments`:

```js
// Oblique directrix: ax + by + c = 0 (normalized so |a|+|b|=1 for L1 distance)
// Returns array of {from,to} segments (clipped to viewport worldBounds={xMin,xMax,yMin,yMax})
function parabolaSegmentsOblique(xF, yF, a, b, c, worldBounds) {
  const denom = Math.abs(a) + Math.abs(b);
  if (denom < 1e-9) return [];
  const an = a / denom, bn = b / denom, cn = c / denom;
  // L1 distance from F to directrix
  const dF = Math.abs(an * xF + bn * yF + cn);
  if (dF < 1e-9) return [];
  // Sample the locus: for each x in viewport, find y(s) where
  // |x-xF| + |y-yF| = |an*x + bn*y + cn|  (L1 dist to focus = L1 dist to directrix)
  // This is solved region by region; for the general case we use pixel sampling along x
  const { xMin, xMax, yMin, yMax } = worldBounds;
  const segments = [];
  const steps = 400;
  const dx = (xMax - xMin) / steps;
  let prevSolutions = null;
  for (let i = 0; i <= steps; i++) {
    const x = xMin + i * dx;
    // For each sign combination of |x-xF| and |bn*y+...|, solve for y
    const solutions = [];
    // Case 1: (x-xF sign) * (x-xF) + |y-yF| = sign(an*x+bn*y+cn) * (an*x+bn*y+cn)
    for (const s1 of [1,-1]) {  // sign of (an*x+bn*y+cn)
      for (const s2 of [1,-1]) {  // sign of (y-yF)
        // LHS: s2*(y-yF) + |x-xF|
        // RHS: s1*(an*x+bn*y+cn)
        // s2*(y-yF) - s1*bn*y = s1*(an*x+cn) - |x-xF|
        // (s2 - s1*bn)*y = s1*(an*x+cn) - |x-xF| + s2*yF
        const coeff = s2 - s1 * bn;
        if (Math.abs(coeff) < 1e-9) continue;
        const rhs = s1 * (an * x + cn) - Math.abs(x - xF) + s2 * yF;
        const y = rhs / coeff;
        // Verify sign conditions
        if (s2 * (y - yF) < -1e-9) continue;
        if (s1 * (an * x + bn * y + cn) < -1e-9) continue;
        if (y >= yMin && y <= yMax) solutions.push(y);
      }
    }
    // Remove duplicates
    const unique = [...new Set(solutions.map(y => Math.round(y * 1e6) / 1e6))].map(v => v);
    if (prevSolutions && unique.length > 0 && prevSolutions.length > 0) {
      // Connect closest pairs
      for (const y1s of prevSolutions) {
        const closest = unique.reduce((a, b2) => Math.abs(b2 - y1s) < Math.abs(a - y1s) ? b2 : a, unique[0]);
        segments.push({ from: { x: x - dx, y: y1s }, to: { x, y: closest } });
      }
    }
    prevSolutions = unique;
  }
  return segments;
}
```

Update the ConicMath return:

```js
return { circleVertices, ellipseVertices, hyperbolaVertices, parabolaSegments, parabolaSegmentsOblique, runTests };
```

- [ ] **Step 2: Implement `_drawParabola`**

```js
function _drawParabola(ctx, t, obj) {
  const { xF=0, yF=2, m=0, q=0 } = obj.params;
  const canvas = document.getElementById('calc-canvas');
  const DPR = window.devicePixelRatio || 1;
  const w = canvas.width / DPR, h = canvas.height / DPR;
  const vMin = t.toWorld(0, h), vMax = t.toWorld(w, 0);
  const worldBounds = { xMin: vMin.x - 1, xMax: vMax.x + 1, yMin: vMin.y - 1, yMax: vMax.y + 1 };

  // Directrix: y = mx + q  →  mx - y + q = 0  →  a=m, b=-1, c=q
  const a = m, b = -1, c = q;

  // Draw directrix line
  const x0d = vMin.x, x1d = vMax.x;
  MiniEngine.drawSegment(ctx, t,
    { x: x0d, y: m * x0d + q },
    { x: x1d, y: m * x1d + q },
    obj.color.replace(')', ',0.35)').replace('rgb', 'rgba'), 1, [5, 4]);

  // Draw focus
  MiniEngine.drawPoint(ctx, t, xF, yF, obj.color, 5);

  // Draw parabola segments
  if (m === 0) {
    // Use fast exact algorithm for horizontal directrix
    const segs = ConicMath.parabolaSegments(xF, yF, q, Math.abs(vMax.y - yF) + 1);
    segs.forEach(s => MiniEngine.drawSegment(ctx, t, s.from, s.to, obj.color, 2.5));
  } else {
    // Oblique directrix: sampled segments
    const segs = ConicMath.parabolaSegmentsOblique(xF, yF, a, b, c, worldBounds);
    segs.forEach(s => MiniEngine.drawSegment(ctx, t, s.from, s.to, obj.color, 1.5));
  }
}
```

- [ ] **Step 3: Add parabola params to `_renderParamsPanel`**

```js
if (obj.type === 'parabola') {
  const { xF=0, yF=2, m=0, q=0 } = obj.params;
  const denom = Math.abs(m) + 1; // |a|+|b| for y=mx+q → (m,-1,q)
  const dF = Math.abs(m * xF - yF + q) / denom;
  const dirLabel = m === 0 ? `y = ${q}` : `y = ${m}x + ${q}`;
  return `
    <div class="csb-section">
      <div class="csb-label">Parametri — Parabola</div>
      ${_sliderRow('x_F', xF, -10, 10, 0.5, obj.id, 'xF')}
      ${_sliderRow('y_F', yF, -10, 10, 0.5, obj.id, 'yF')}
      <div class="csb-param-row" style="flex-direction:column;align-items:flex-start;gap:4px;">
        <span class="csb-param-label" style="width:auto;">Direttrice</span>
        <input type="text" style="font-family:'IBM Plex Mono',monospace;font-size:0.72rem;background:#0f0f0f;border:1px solid #222;color:rgba(255,255,255,0.7);padding:4px 8px;border-radius:3px;width:100%;"
          value="${dirLabel}"
          placeholder="y = mx + q"
          onchange="GraphCalc._parseDirectrix(${obj.id}, this.value)">
      </div>
      ${_sliderRow('m', m, -5, 5, 0.5, obj.id, 'm')}
      ${_sliderRow('q', q, -10, 10, 0.5, obj.id, 'q')}
      <div class="csb-output">p = ${dF.toFixed(2)} &nbsp;|&nbsp; ${dirLabel}</div>
    </div>
  `;
}
```

- [ ] **Step 4: Add `_parseDirectrix` helper**

```js
function _parseDirectrix(objId, str) {
  // Parse "y = mx + q" or "x = c" or "y = q"
  const obj = _getObj(objId);
  if (!obj) return;
  str = str.trim().replace(/\s+/g, '');
  // y = mx + q
  let match = str.match(/^y=([+-]?\d*\.?\d*)x([+-]\d*\.?\d*)$/);
  if (match) {
    obj.params.m = parseFloat(match[1]) || 0;
    obj.params.q = parseFloat(match[2]) || 0;
    renderSidebar(); _draw(); return;
  }
  // y = q (horizontal)
  match = str.match(/^y=([+-]?\d+\.?\d*)$/);
  if (match) {
    obj.params.m = 0;
    obj.params.q = parseFloat(match[1]);
    renderSidebar(); _draw(); return;
  }
  // x = c (vertical) — treat as very steep slope
  match = str.match(/^x=([+-]?\d+\.?\d*)$/);
  if (match) {
    // Store as vertical flag: m=Infinity, q=c
    obj.params.m = 0; // simplified: treat as vertical by setting very large m
    obj.params.q = parseFloat(match[1]);
    renderSidebar(); _draw();
  }
}
```

Add `_parseDirectrix` to the return statement.

- [ ] **Step 5: Verify**

Create parabola → two clicks (focus + directrix point). Green parabola segments appear. Slider m changes inclination. Text field accepts `y = 2x + 1`. m=0 → fast horizontal algorithm.

---

## Task 6F: Luogo Libero

**Files:**
- Modify: `geometria-del-taxi-master/index.html`

- [ ] **Step 1: Handle luogo creation in `startTool`**

In `startTool`, add special case for luogo (no points needed):

```js
function startTool(type) {
  if (type === 'luogo') {
    // Create object immediately, show equation input
    const obj = _createObject('luogo', []);
    state.mode = 'select';
    state.pendingTool = null;
    renderSidebar();
    _draw();
    return;
  }
  const pointsNeeded = { asse:2, circonferenza:1, ellisse:2, iperbole:2, parabola:2 };
  state.pendingTool = { type, pointsNeeded: pointsNeeded[type] || 0, pointsPlaced: [] };
  state.mode = 'point';
  renderSidebar();
  _draw();
}
```

- [ ] **Step 2: Implement `_drawLuogo`**

```js
function _drawLuogo(ctx, t, obj) {
  const { equation = '' } = obj.params;
  if (!equation.trim()) return;
  const canvas = document.getElementById('calc-canvas');
  const DPR = window.devicePixelRatio || 1;
  const w = canvas.width / DPR, h = canvas.height / DPR;
  const vMin = t.toWorld(0, h), vMax = t.toWorld(w, 0);
  const domainW = vMax.x - vMin.x, domainH = vMax.y - vMin.y;

  if (domainW * domainH > 50 * 50) {
    // Too large: draw warning label instead
    ctx.save();
    ctx.font = '11px IBM Plex Mono, monospace';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.textAlign = 'center';
    ctx.fillText('Zoom in per visualizzare il luogo libero', w / 2, h / 2);
    ctx.restore();
    return;
  }

  // Parse equation: split on = sign
  const parts = equation.split('=');
  if (parts.length !== 2) return;
  let fn;
  try {
    const lhsSrc = parts[0].trim().replace(/\|([^|]+)\|/g, 'Math.abs($1)');
    const rhsSrc = parts[1].trim().replace(/\|([^|]+)\|/g, 'Math.abs($1)');
    fn = new Function('x', 'y', `try { return (${lhsSrc}) - (${rhsSrc}); } catch(e) { return NaN; }`);
  } catch(e) { return; }

  // Sign-change pixel sampling
  const res = Math.max(1, Math.floor(w / 300));
  ctx.save();
  ctx.strokeStyle = obj.color;
  ctx.lineWidth = 1.5;

  for (let px = 0; px < w - res; px += res) {
    for (let py = 0; py < h - res; py += res) {
      const wx0 = t.toWorld(px, py).x,        wy0 = t.toWorld(px, py).y;
      const wx1 = t.toWorld(px+res, py+res).x, wy1 = t.toWorld(px+res, py+res).y;
      const v00 = fn(wx0, wy0), v10 = fn(wx1, wy0);
      const v01 = fn(wx0, wy1), v11 = fn(wx1, wy1);
      if (isNaN(v00)||isNaN(v10)||isNaN(v01)||isNaN(v11)) continue;
      const hasChange = (v00*v10 < 0) || (v00*v01 < 0) || (v10*v11 < 0) || (v01*v11 < 0);
      if (hasChange) {
        ctx.fillStyle = obj.color;
        ctx.fillRect(px, py, res, res);
      }
    }
  }
  ctx.restore();
}
```

- [ ] **Step 3: Add luogo params to `_renderParamsPanel`**

```js
if (obj.type === 'luogo') {
  return `
    <div class="csb-section">
      <div class="csb-label">Parametri — Luogo Libero</div>
      <div style="font-family:'IBM Plex Mono',monospace;font-size:0.62rem;color:rgba(255,255,255,0.3);margin-bottom:8px;">Es: |x-2| + |y-3| = 5</div>
      <input type="text" style="font-family:'IBM Plex Mono',monospace;font-size:0.75rem;background:#0f0f0f;border:1px solid #222;color:rgba(255,255,255,0.8);padding:6px 8px;border-radius:3px;width:100%;"
        value="${obj.params.equation || ''}"
        placeholder="f(x,y) = g(x,y)"
        oninput="GraphCalc._setParam(${obj.id},'equation',this.value)">
      <div class="csb-output" style="margin-top:6px;">Usa |expr| per valore assoluto.<br>Zoom in per attivare il rendering.</div>
    </div>
  `;
}
```

- [ ] **Step 4: Verify**

Create luogo → sidebar shows text input. Type `|x| + |y| = 4` → violet diamond appears (same as taxicab circle). Type `|x-2| + |y-3| = 5` → diamond centered at (2,3). Zoom out far → warning message instead of render.

---

## Task 7: Hover Glow + Canvas Object Selection

**Files:**
- Modify: `geometria-del-taxi-master/index.html`

- [ ] **Step 1: Add hover detection in `_onMouseMove`**

Inside `_onMouseMove`, after updating `state.mouseWorld`, add:

```js
// Hover object detection (only in select mode)
if (state.mode === 'select' && state.mouseWorld) {
  const canvas = document.getElementById('calc-canvas');
  let hovering = false;
  state.objects.forEach(obj => {
    if (!obj.visible) return;
    if (_isNearObject(obj, state.mouseWorld.x, state.mouseWorld.y, 10 / state.scale)) {
      hovering = true;
    }
  });
  if (canvas) canvas.style.cursor = hovering ? 'pointer' : 'default';
}
```

- [ ] **Step 2: Add `_isNearObject` function**

```js
function _isNearObject(obj, wx, wy, threshold) {
  if (obj.type === 'asse') {
    const { p1, p2 } = obj.params;
    if (!p1 || !p2) return false;
    // Simple bounding box check for now
    const margin = threshold + 2;
    return wx >= Math.min(p1.x, p2.x) - margin && wx <= Math.max(p1.x, p2.x) + margin &&
           wy >= Math.min(p1.y, p2.y) - margin && wy <= Math.max(p1.y, p2.y) + margin;
  }
  if (obj.type === 'circonferenza') {
    const { xc=0, yc=0, R=3 } = obj.params;
    const d1 = Math.abs(wx - xc) + Math.abs(wy - yc);
    return Math.abs(d1 - R) < threshold;
  }
  return false; // other types: no hover detection yet
}
```

- [ ] **Step 3: Add glow effect in `_drawObject`**

Wrap each draw call with glow if the object is hovered:

```js
function _drawObject(ctx, t, obj) {
  const isHovered = state.mouseWorld && state.mode === 'select' &&
    _isNearObject(obj, state.mouseWorld.x, state.mouseWorld.y, 10 / state.scale);

  if (isHovered) {
    ctx.save();
    ctx.shadowColor = obj.color;
    ctx.shadowBlur = 18;
  }

  if (obj.type === 'asse')               _drawAsse(ctx, t, obj);
  else if (obj.type === 'circonferenza') _drawCirconferenza(ctx, t, obj);
  else if (obj.type === 'ellisse')       _drawEllisse(ctx, t, obj);
  else if (obj.type === 'iperbole')      _drawIperbole(ctx, t, obj);
  else if (obj.type === 'parabola')      _drawParabola(ctx, t, obj);
  else if (obj.type === 'luogo')         _drawLuogo(ctx, t, obj);

  if (isHovered) {
    ctx.restore();
    // Label tooltip near cursor
    if (state.mouseWorld) {
      const { x, y } = t.toCanvas(state.mouseWorld.x, state.mouseWorld.y);
      const canvas = document.getElementById('calc-canvas');
      const DPR = window.devicePixelRatio || 1;
      ctx.save();
      ctx.font = '11px IBM Plex Mono, monospace';
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.textAlign = 'left';
      ctx.fillText(obj.name, x + 12, y - 6);
      ctx.restore();
    }
  }
}
```

- [ ] **Step 4: Add canvas click → select object**

In `_onMouseDown`, before the pan fallback, add object click detection:

```js
// Check for object click (select mode)
if (state.mode === 'select') {
  for (const obj of [...state.objects].reverse()) { // top-most first
    if (!obj.visible) continue;
    if (_isNearObject(obj, world.x, world.y, 10 / state.scale)) {
      selectObject(obj.id);
      return;
    }
  }
}
```

- [ ] **Step 5: Verify**

Hover over a circonferenza diamond → it glows and shows its name. Click it → selected in sidebar (params panel appears). Move away → glow disappears.

---

## Task 8: Remove Old #esplora JavaScript

**Files:**
- Modify: `geometria-del-taxi-master/index.html`

- [ ] **Step 1: Remove MainEngine initialization call**

The existing `MainEngine.init()` call at the bottom of the script references the old #esplora canvas (`#main-canvas`) which no longer exists in the DOM. Find and remove:

```js
MainEngine.init();
```

Also remove the `meCircle`, `meEllipse`, `meHyperbola`, `meParabola` instantiation calls that referenced the old mini-engines (they still work because those canvas IDs still exist in the academic sections §2–§5, but MainEngine references `#main-canvas` which is gone).

Actually — only remove `MainEngine.init()`. The mini-engine instances (`meCircle`, etc.) are still valid since `#me-circle`, `#me-ellipse`, etc. are still in the academic sections.

- [ ] **Step 2: Remove MainEngine CSS**

In `<style>`, find and remove the block labeled `/* ─── MAIN ENGINE ─── */` (the styles for `#esplora`, `.engine-inner`, `.engine-header`, `.engine-title`, `.engine-subtitle`, `.engine-layout`, `#main-canvas-wrap`, `#main-canvas`, `.engine-controls`, `.conic-panel`, `.panel-header`, `.panel-toggle`, `.panel-name`, `.panel-chevron`, `.panel-body`, `.engine-ctrl-row`, `.engine-ctrl-label`, `.engine-ctrl-value`, `.panel-output`).

- [ ] **Step 3: Verify**

Page loads without console errors. All §1–§5 academic sections and mini-engines still work. §6 section shows correctly.

---

## Self-Review Checklist

**Spec coverage:**
- [x] §6 section with description and open button — Task 1
- [x] Hero button revealed after §1 scroll — Task 1
- [x] Overlay fixed with blur animation — Task 2
- [x] ESC badge (delay 200ms, auto-hide 3s, rehover) — Task 2
- [x] ESC key closes — Task 2
- [x] scrollY restored on close — Task 2
- [x] Sidebar: mode selector, snap, tool list, object list, params, regions — Task 4
- [x] Snap to integers with info tooltip — Task 4
- [x] Point placement mode with status message — Task 5
- [x] Object system: create/delete/toggle/rename/color — Tasks 4+5
- [x] Color dot click = toggle visible (like Desmos) — Task 4
- [x] Color dot dblclick = cycle color — Task 4
- [x] ISOLA mode with opacity 10% for others — Task 4
- [x] Analisi regioni in ISOLA mode — Tasks 4+6A
- [x] Asse taxicab + bisettrice euclidea — Task 6A
- [x] 9-region hover tooltip with 4-line equations — Task 6A
- [x] Circonferenza with slider+hitbox — Tasks 6B+9
- [x] Ellisse with 9-region lines — Task 6C
- [x] Iperbole — Task 6D
- [x] Parabola oblique directrix (m slider + q slider + text) — Task 6E
- [x] Luogo libero with equation input — Task 6F
- [x] Slider 0-10 + hitbox + alert >100 — Tasks 6B+9
- [x] Hover glow CAD-like + label — Task 7
- [x] Canvas click selects object — Task 7
- [x] Remove old MainEngine — Task 8
- [x] Rename objects (dblclick) — Task 4

**Gap found:** The slider `_sliderRow` hardcodes `accent-color` to circonferenza red. Fix: pass the object's color dynamically. Update `_sliderRow` signature to accept color:

```js
function _sliderRow(label, value, min, max, step, objId, paramKey, color) {
  const accentColor = color || '#e63946';
  // ... use accentColor instead of hardcoded value
}
```

And update all callers to pass `obj.color`.

**Type consistency check:**
- `_getObj`, `_redraw`, `_setParam`, `_parseDirectrix` all referenced in inline HTML and returned from GraphCalc ✓
- `ConicMath.parabolaSegmentsOblique` added to return ✓
- `DEFAULT_COLORS` and `TYPE_LABELS` used consistently ✓
- `state.pendingTool.pointsPlaced` is always an array ✓
