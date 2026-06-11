# Pulizia tecnica (P4) — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-06-11-pulizia-tecnica-design.md`
**File:** `index.html`. Zero impatto visivo; `ConicMath` invariato.

Verifica dopo le task JS:
```
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js   # poi rm
```

## Task 1 — Rimozione CSS morto
- [ ] `.hero-blob { display:none }` → eliminare.
- [ ] `.csb-mode-row/.csb-mode-btn/:hover/.active` → eliminare (4 righe).
- [ ] `body.light-mode { … }` → eliminare; nel `body{}` togliere `transition: background-color 0.6s ease`.

## Task 2 — Rimozione markup/JS morto
- [ ] Eliminare i due `<div class="hero-blob …">` + il commento "Blob lights".
- [ ] Eliminare l'`IntersectionObserver` light-mode nel bootstrap.
- [ ] Eliminare `function setMode` + la voce `setMode` nell'export.
- [ ] In `_drawObject`: rimuovere `const isHovered = … 'select' …` e i due blocchi `if(isHovered){…}`; mantenere la catena di disegno `if(obj.type==='asse')…`. Non toccare `_isNearObject`.

## Task 3 — Dedup `_drawEquationBox`
- [ ] Definire `_drawEquationBox(ctx, lines, w, h, ctrXHint, ctrYHint)`.
- [ ] In `_drawAsseRegions`: sostituire il blocco con la chiamata (centro = hint asse).
- [ ] In `_drawCirconferenzaRegions`: idem (centro = `w/2,h/2`).

## Task 4 — Throttle mousemove
- [ ] Aggiungere `_drawPending=false` + `function _scheduleDraw(){ if(!_drawPending){ _drawPending=true; requestAnimationFrame(()=>{ _drawPending=false; _draw(); }); } }`.
- [ ] In `_onMouseMove`, sostituire il `_draw()` finale con `_scheduleDraw()`.

## Task 5 — Verifica + commit
- [ ] Harness verde + `node --check` ok.
- [ ] Screenshot: hero invariato; box equazioni "9 regioni" (asse/circonferenza) invariato.
- [ ] Commit `index.html` + spec + plan.

## Self-review
- Spec §1→T1/T2; §2→T3; §3→T4; §4→T5.
- `_isNearObject` preservato; export perde solo `setMode`.
