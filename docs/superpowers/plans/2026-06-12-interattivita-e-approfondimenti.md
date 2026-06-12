# Interattività + approfondimenti — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-06-12-interattivita-e-approfondimenti-design.md`
**File:** `index.html`. Vincoli: `ConicMath` invariato (harness verde); estetica Brutalista; single-file.

Verifica dopo le task JS:
```
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js   # poi rm
```

## Task 1 — MiniEngine: estensione (setCase/toggleRegioni/reset + clip P + overlay regioni)
- [ ] `create()` ritorna anche `setCase(params)`, `toggleRegioni(on)`, `reset()` (salva `defaultParams`).
- [ ] Clip del path P al rettangolo mondo visibile per i tipi a path aperto (hyperbola/parabola) → P resta in vista (uscita ≤1s).
- [ ] Overlay regioni leggero per circle/ellipse/hyperbola: rette critiche tratteggiate inchiostro + ombreggiatura tenue pomodoro + etichette.
- [ ] Verifica con `ConicMath` dei parametri-caso (ottagono/esagono/degenere; fuochi orizz/obliqui) prima di cablarli.

## Task 2 — §1 widget «cammini ↔ triangolo»
- [ ] Sostituire la figura statica L₂/L₁ con un canvas `me-fondamenti` + barra bottoni («Disuguaglianza triangolare» / «Ripristina»).
- [ ] Modulo dedicato (riusa primitive MiniEngine): modalità «cammini» (2 punti, K scalette uguali, conteggio C(Δx+Δy,Δx), diagonale fantasma, d₁/d₂) e «triangolo» (3 punti, d(A,B)+d(B,C) ≥ d(A,C), verde, uguaglianza evidenziata). Pointer-drag.

## Task 3 — Bottoni casi+regioni+Ripristina in §2–§5
- [ ] CSS `.mini-cases` (barra bottoni brutalista).
- [ ] §2: «Mostra le 4 regioni» · «Ripristina».
- [ ] §3: «Ottagono» · «Esagono (fuochi allineati)» · «Caso degenere 2a=d₀» · «Mostra le 9 regioni» · «Ripristina».
- [ ] §4: «Fuochi orizzontali» · «Fuochi obliqui» · «Mostra regioni» · «Ripristina».
- [ ] §5: «Mostra Formula Master» · «Ripristina» (Formula Master = Task 4).

## Task 4 — §5 Formula Master sul piano
- [ ] Overlay che etichetta i 4 pezzi + vertice con le equazioni master, attivabile dal bottone §5; «Ripristina» rimuove.

## Task 5 — Hero: taxi stilizzato + griglia lenta
- [ ] Disegno taxi blocky (inchiostro+pomodoro) nel loop hero; percorso a L + diagonale fantasma in loop.
- [ ] Rallentare scroll griglia (0.5→~0.18). Guardia reduced-motion (frame statico).

## Task 6 — §2 box π leggibile
- [ ] Sistemare il `.formula-display` del π (wrap/accorcia) così si legge tutto, calcolo allineato.

## Task 7 — Calcolatore: 2 fix
- [ ] Bug 2° fuoco: i punti pending restano visibili fino alla creazione.
- [ ] Tooltip info: escono dalla sidebar (non più mezzi coperti).

## Task 8 — Sezione «Minkowski e Gołąb» + rinumerazione
- [ ] Nuova sezione prima di «In sintesi»: Minkowski (Lₚ, palle unitarie p=1/2/∞, SVG) + Gołąb (3≤π≤4; esagono=3, quadrato=4=taxi). Callout in «In sintesi».
- [ ] Rinumerare §: Minkowski §6, In sintesi §7, Calcolatore §8; aggiornare TOC (#minkowski) e chip.

## Task 9 — Verifica + commit
- [ ] Harness verde + node --check ok; screenshot (§1 due modalità, hero+taxi, π, bottoni casi/regioni §2–§5, formula master, Gołąb; calc 2° fuoco + tooltip).
- [ ] Commit `index.html` + spec + plan.

## Self-review
- Spec §1→T2; §2→T5; §3→T6; §4→T3; §5→T4; §6→T1; §7→T7; §8→T8. ConicMath invariato.
