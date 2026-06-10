# Calcolatore: Undo/Redo + scorciatoie (C5) — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NB:** feature pianificata, **non ancora schedulata** — esecuzione in blocco con le altre.

**Goal:** Cronologia annulla/ripeti degli oggetti del calcolatore, con pulsanti e scorciatoie da tastiera. Autosufficiente (snapshot = cloni di `state.objects`).

**Architecture:** In `GraphCalc`: stato `history/histIndex/applyingHistory`; `_snapshot/_pushHistory/_restoreSnapshot/undo/redo`; hook di `_pushHistory` nelle azioni mutanti; handler tastiera in `open`/`close`; pulsanti in `renderSidebar`. Verifica: `node --check` + harness invariata + visiva.

**Tech Stack:** Vanilla JS inline. Harness `tools/test-conicmath.mjs` (conferma `ConicMath` invariato).

**Spec:** `docs/superpowers/specs/2026-06-10-undo-redo-calcolatore-design.md`

**Vincoli:** solo `GraphCalc`/inline; undo limitato agli oggetti (vista preservata); cap 50; `ConicMath` invariato.

---

## Task 1: Core cronologia + baseline + API

**Files:** Modify `index.html` (GraphCalc: state, funzioni, `open`, public return)

- [ ] **Step 1: Campi di stato.** Nell'oggetto `state` (≈ riga 1760), prima della `};` di chiusura, aggiungere:
```js
    history: [],
    histIndex: -1,
    applyingHistory: false,
```

- [ ] **Step 2: Funzioni cronologia.** Subito dopo `function clearAll() { ... }`, inserire:
```js
  const HISTORY_MAX = 50;
  function _snapshot(){ return JSON.stringify(state.objects); }
  function _pushHistory(){
    if(state.applyingHistory) return;
    const snap=_snapshot();
    if(state.histIndex>=0 && state.history[state.histIndex]===snap) return; // de-dup
    state.history.length = state.histIndex+1;
    state.history.push(snap);
    if(state.history.length>HISTORY_MAX) state.history.shift();
    state.histIndex = state.history.length-1;
  }
  function _restoreSnapshot(s){
    state.applyingHistory=true;
    state.objects = JSON.parse(s);
    state.nextId = state.objects.reduce((m,o)=>Math.max(m,o.id||0),0)+1;
    const ids=new Set(state.objects.map(o=>o.id));
    if(!ids.has(state.selectedId)) state.selectedId=null;
    if(!ids.has(state.isolatedId)){ state.isolatedId=null; state.showRegions=false; }
    for(const id of [...state.expandedIds]) if(!ids.has(id)) state.expandedIds.delete(id);
    renderSidebar(); _draw();
    state.applyingHistory=false;
  }
  function undo(){ if(state.histIndex>0){ state.histIndex--; _restoreSnapshot(state.history[state.histIndex]); } }
  function redo(){ if(state.histIndex<state.history.length-1){ state.histIndex++; _restoreSnapshot(state.history[state.histIndex]); } }
```

- [ ] **Step 3: Baseline all'apertura.** Individuare la fine di `function open() { ... }` e, **come ultima istruzione prima della sua `}`** (dopo eventuali ripristini da URL/preset di altre feature), inserire:
```js
    state.history = []; state.histIndex = -1; _pushHistory();
```

- [ ] **Step 4: API pubblica.** Nel `return { ... }` di `GraphCalc`, aggiungere `undo, redo`.

- [ ] **Step 5: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
node tools/test-conicmath.mjs
```
Expected: exit 0; "All assertions passed". Eliminare `tools/_chk.js`.

- [ ] **Step 6: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): core cronologia undo/redo (snapshot oggetti)"
```

---

## Task 2: Hook `_pushHistory` nelle azioni mutanti

**Files:** Modify `index.html` (GraphCalc: varie funzioni)

Aggiungere `_pushHistory();` **dopo** la mutazione di `state.objects` in ciascuna funzione (usare Read/Grep per individuarle):

- [ ] **Step 1: Creazione.**
  - In `confirmValue`, dopo `_clampConicTwoA(obj);`/`state.expandedIds.add(obj.id);` e prima di `renderSidebar();`, aggiungere `_pushHistory();`.
  - In `_placePendingPoint`, nel ramo che crea l'oggetto **senza** dialogo valore: dopo `const obj = _createObject(state.pendingTool.type, state.pendingTool.pointsPlaced);` (e l'aggiunta agli expanded), prima di `renderSidebar();`, aggiungere `_pushHistory();`.

- [ ] **Step 2: Eliminazione / clear.**
  - In `deleteObject`, dopo la rimozione dall'array `state.objects` e prima del render, aggiungere `_pushHistory();`.
  - In `clearAll`, dopo `state.objects = [];` (e i reset), prima di `renderSidebar();`, aggiungere `_pushHistory();`.

- [ ] **Step 3: Modifica parametri (commit).** In `_setParam`, dopo `_applyParamKey(obj, key, val);` e prima di `renderSidebar();`, aggiungere `_pushHistory();`. *(Solo `_setParam` — il commit `onchange`; NON in `_setParamQuiet`, che è il live.)*

- [ ] **Step 4: Fine drag di un punto di controllo.** In `_onMouseUp`, all'inizio catturare se c'era un drag di control-point, e accodare alla fine:
```js
  function _onMouseUp() {
    const wasCpDrag = !!state.draggingPoint;
    state.dragging = null;
    state.draggingPoint = null;
    state.pendingDraggingIdx = null;
    const canvas = document.getElementById('calc-canvas');
    if (canvas) canvas.style.cursor = state.mode === 'point' ? 'crosshair' : 'default';
    if (wasCpDrag) _pushHistory();
  }
```
(Sostituire l'attuale `_onMouseUp` con questa versione.)

- [ ] **Step 5: Colore / rinomina / visibilità / opacità.** Aggiungere `_pushHistory();` dopo la mutazione in `setObjColor`, `renameObject`, `toggleVisible`, `setObjOpacity` (prima del render finale di ciascuna). *(Se una funzione non chiama render, aggiungere comunque `_pushHistory()` dopo la modifica del campo.)*

- [ ] **Step 6: (se presenti) galleria/URL.** Se le feature in coda hanno aggiunto `loadPreset`/`_applyState`, aggiungere `_pushHistory();` al termine, dopo `renderSidebar(); _draw();`. *(Se non presenti, saltare.)*

- [ ] **Step 7: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: ogni azione (crea/elimina/sposta/parametro/colore) aggiunge una voce; un drag di slider/fuoco aggiunge **una** voce al rilascio.

- [ ] **Step 8: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): snapshot della cronologia ai punti di commit"
```

---

## Task 3: Scorciatoie da tastiera

**Files:** Modify `index.html` (GraphCalc: handler + `open`/`close`)

- [ ] **Step 1: Handler.** Vicino a `_onMouseUp`/`_onMouseDown`, inserire:
```js
  function _onKeyDown(e){
    if(!state.isOpen) return;
    const tgt=e.target;
    if(tgt && (tgt.tagName==='INPUT'||tgt.tagName==='TEXTAREA'||tgt.tagName==='SELECT'||tgt.isContentEditable)) return;
    const mod=e.ctrlKey||e.metaKey;
    const z=(e.key==='z'||e.key==='Z'), y=(e.key==='y'||e.key==='Y');
    if(mod && z && !e.shiftKey){ e.preventDefault(); undo(); }
    else if(mod && ((z && e.shiftKey) || y)){ e.preventDefault(); redo(); }
    else if((e.key==='Delete'||e.key==='Backspace') && state.selectedId!=null){ e.preventDefault(); deleteObject(state.selectedId); }
  }
```

- [ ] **Step 2: Attacca/stacca.** In `open()`, dopo l'inizializzazione, aggiungere `window.addEventListener('keydown', _onKeyDown);`. In `close()`, aggiungere `window.removeEventListener('keydown', _onKeyDown);`.

- [ ] **Step 3: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: con calcolatore aperto, `Ctrl/Cmd+Z` annulla, `Ctrl+Shift+Z`/`Ctrl+Y` ripete, `Canc` elimina il selezionato; mentre si scrive nel campo rinomina/equazione le scorciatoie **non** interferiscono.

- [ ] **Step 4: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): scorciatoie undo/redo/canc (solo a calcolatore aperto)"
```

---

## Task 4: Pulsanti ↩/↪ nella sidebar

**Files:** Modify `index.html` (GraphCalc: `renderSidebar`, CSS)

- [ ] **Step 1: CSS disabled.** In fondo al `<style>`, aggiungere:
```css
    .csb-snap-toggle:disabled { opacity:0.3; cursor:default; }
```

- [ ] **Step 2: Pulsanti.** In `renderSidebar()`, trovare la sezione "Snap + Clear all" (il `.csb-section` con i pulsanti Snap/Tutti) e inserire SUBITO DOPO la sua `</div>`:
```js
      <div class="csb-section" style="flex-shrink:0;">
        <div class="csb-snap-row">
          <button class="csb-snap-toggle" onclick="GraphCalc.undo()" title="Annulla (Ctrl+Z)" ${state.histIndex<=0?'disabled':''}>↩ Annulla</button>
          <button class="csb-snap-toggle" onclick="GraphCalc.redo()" title="Ripeti (Ctrl+Shift+Z)" ${state.histIndex>=state.history.length-1?'disabled':''}>↪ Ripeti</button>
        </div>
      </div>
```
*(Se la feature "sonda/condivisione" ha già una sezione "Strumenti", i pulsanti possono andare lì; in mancanza, questa nuova riga dopo Snap+Clear è autosufficiente.)*

- [ ] **Step 3: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: i pulsanti ↩/↪ funzionano e sono **disabilitati** agli estremi della cronologia (↩ a inizio, ↪ a fine); lo stato si aggiorna a ogni azione.

- [ ] **Step 4: Commit.**
```bash
git add index.html
git commit -m "feat(graphcalc): pulsanti annulla/ripeti con stato disabilitato"
```

---

## Task 5: Verifica finale + roadmap

**Files:** Modify `docs/ROADMAP_MIGLIORAMENTI.md` (C5 → ✅)

- [ ] **Step 1: Sintassi + harness.**
```bash
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: "All assertions passed" + exit 0. Eliminare `tools/_chk.js`.

- [ ] **Step 2: Checklist visiva.** Annulla/ripeti coerenti su sequenze di azioni; drag = una voce al rilascio; `Canc` elimina; scorciatoie non interferiscono con gli input; pulsanti disabilitati agli estremi; vista invariata da undo/redo; nessuna regressione.

- [ ] **Step 3: Roadmap.** In `docs/ROADMAP_MIGLIORAMENTI.md` mettere Stato 📋 → ✅ per **C5**.

- [ ] **Step 4: Commit.**
```bash
git add docs/ROADMAP_MIGLIORAMENTI.md
git commit -m "docs: roadmap — undo/redo + scorciatoie (C5)"
```

---

## Self-review (copertura spec)

- **Spec §2/§3 (modello + undo/redo):** Task 1 (`_snapshot/_pushHistory/_restoreSnapshot/undo/redo`, cap 50, de-dup, `applyingHistory`, baseline in `open`); undo solo oggetti (vista preservata).
- **Spec §4 (punti di commit):** Task 2 (hook in create/delete/clear/`_setParam`/fine-drag/colore/rinomina/visibilità/opacità/preset).
- **Spec §5 (scorciatoie):** Task 3 (`_onKeyDown` con guardia input, Ctrl+Z/Shift+Z/Y/Canc; attach/detach in open/close).
- **Spec §6 (UI):** Task 4 (pulsanti ↩/↪ con `disabled` agli estremi).
- **Spec §7 (architettura):** tutto in `GraphCalc`; snapshot di dati puri; `undo`/`redo` pubblici.
- **Spec §8 (verifica):** `node --check` + harness invariata + checklist visiva.
- **Spec §9/§10 (scope/vincoli):** niente undo della vista; cap 50; `ConicMath` invariato; convive con sonda/condivisione/galleria.
- **Coerenza nomi:** `history/histIndex/applyingHistory/HISTORY_MAX`; `_snapshot/_pushHistory/_restoreSnapshot/undo/redo`; `_onKeyDown`.
