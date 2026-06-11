# Orientamento + coesione + a11y (P3) — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-06-11-orientamento-e-coesione-design.md`
**File:** `index.html`. Vincoli: `ConicMath` invariato; estetica invariata; single-file.

Verifica dopo ogni task con JS:
```
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js   # poi rm
```

## Task 1 — Progress bar + mini-TOC (A)
- [ ] CSS: `#read-progress`, `#toc` (+ `.toc-link`, `.toc-link.active`), media `≥1180px` per mostrarlo, hidden sotto.
- [ ] Markup: `<div id="read-progress">` come primo figlio del body; `<nav id="toc" aria-label="Indice">` con 7 link agli id sezione (fondamenti, circonferenza, ellisse, iperbole, parabola, sintesi, calcolatore).
- [ ] JS bootstrap: listener scroll rAF-throttled → `#read-progress` scaleX; `IntersectionObserver` su `section[id]` → aggiorna `.active` nel TOC.

## Task 2 — Ponti + CTA contestuali (B)
- [ ] CSS: `.ponte`, `.ctx-cta`.
- [ ] §1–§5: aggiungere frase-ponte a fine `.section-text`; §2–§5: `.ctx-cta` `onclick="GraphCalc.open();GraphCalc.startTool('<tipo>')"`.
- [ ] Verifica funzionale: la CTA apre il calcolatore con il tool attivo.

## Task 3 — Onboarding calcolatore (C)
- [ ] CSS: `.csb-onboard`.
- [ ] `renderSidebar()`: ramo `objects.length===0` → se `!state.pendingTool`, mostrare blocco 2-passi invece di «Nessun oggetto creato.».

## Task 4 — Mobile (D)
- [ ] CSS `@media(max-width:600px)`: tabelle font 0.7rem + padding ridotto.
- [ ] Drawer: `68vh`/`68vh` → `68dvh`.

## Task 5 — Accessibilità (E)
- [ ] `<main>` attorno a `#fondamenti`…`#calcolatore`.
- [ ] `#calc-overlay`: `role="dialog" aria-modal="true" aria-label="Calcolatore grafico"`.
- [ ] `open()`: focus su `#calc-close-btn`; aggiungere `keydown` focus-trap (Tab/Shift+Tab) e rimuoverlo in `close()`.
- [ ] `renderSidebar()`: swatch e color-btn → `role="button" tabindex="0"` + `onkeydown` Enter/Space.
- [ ] CSS: `*:focus-visible{outline:2px solid var(--tomato);outline-offset:2px;}`.

## Task 6 — Verifica + commit
- [ ] Harness verde + `node --check` ok; struttura bilanciata.
- [ ] Screenshot (progress+TOC, ponte+CTA, onboarding).
- [ ] Commit `index.html` + spec + plan.

## Self-review (copertura spec)
- §1→T1; §2→T2; §3→T3; §4→T4; §5→T5; §7→T6.
- Nomi: `#read-progress`, `#toc`, `.ponte`, `.ctx-cta`, `.csb-onboard`, `role="dialog"`, `:focus-visible`.
