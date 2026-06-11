# Correzioni matematiche + divulgazione (P1+P2) — Implementation Plan

**Spec:** `docs/superpowers/specs/2026-06-11-correzioni-e-divulgazione-design.md`
**File:** `index.html` (single-file inline).
**Vincoli:** `ConicMath` invariato (harness verde); estetica Brutalista invariata; nuovo solo `--ink-dim:#5b554c` (≈5.9:1 su osso). Esecuzione in blocco, senza attese di revisione.

Verifica trasversale dopo le task che toccano JS:
```
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js   (poi eliminare _chk.js)
```

---

## Task 1 — P1 a11y: contrasto + reduced-motion
**Files:** `index.html` (CSS + Hero JS)
- [ ] `:root` → aggiungere `--ink-dim:#5b554c;`.
- [ ] Sostituire `opacity:0.5–0.6` su testo piccolo con `color:var(--ink-dim)` (no opacity) in: `.csb-label`, `.csb-param-label`, `.csb-output`, `.csb-sub-label`, `.mini-ctrl-label`, `.mini-engine-output`. Caption figura §1: `color:#5b554c` (no opacity).
- [ ] `.csb-status`: `color:var(--tomato)` → `color:var(--ink)` (peso invariato).
- [ ] CSS: aggiungere `@media (prefers-reduced-motion: reduce){ html{scroll-behavior:auto} #hero-scroll-cue{animation:none} }`.
- [ ] `Hero.init()`: se `matchMedia('(prefers-reduced-motion: reduce)').matches`, disegnare un frame statico (`drawGrid` una volta su entrambi i layer) e **non** chiamare `animate()`; idem guardia in `start()`.

## Task 2 — P1 correzioni matematiche (testo)
**Files:** `index.html` (markup §2, §3, §5)
- [ ] **§2** Teorema 2.1: aggiungere «Perimetro taxicab: 8R». Sostituire il `formula-display` π₁ con il blocco corretto (8R/2R=4; nota lato=2R; perimetro euclideo 4R√2 come inciso). Vedi spec §2.1.
- [ ] **§3** Prop. 3.1: riscrivere (obliqui→ottagono sempre; allineati→esagono; degenere→rettangolo). Tabella esempio: `d₀=6`, `k=2`, righe estensione x∈[−2,6]/y∈[−2,4], «Forma: ottagono (8 vertici)». Rimuovere «k=2<hw=2».
- [ ] **§5** Formula Master: rami obliqui `(y_F+k)/2 ≤ y ≤ y_F` + riga vertice `y=(y_F+k)/2`. Tabella regioni B/C: «2 passi in x per 1 in y» al posto di «Pendenza +2/−2».

## Task 3 — P2 Hero (opzione A)
**Files:** `index.html` (markup hero + CSS)
- [ ] Titolo → «E se π valesse esattamente 4?» (con `4`/`π` in `.em`). Sostituire sottotitolo ridondante con riga identità mono piccola «Geometria del Taxi».
- [ ] Aggiungere `<p class="hero-deck">…</p>` (testo da spec §3.1).
- [ ] Aggiungere `<a id="hero-scroll-cue" href="#fondamenti">↓ Inizia</a>` dentro `#hero` (sempre visibile).
- [ ] CSS: `.hero-deck`, `#hero-scroll-cue` (mono, pulse via keyframes, fermo in reduced-motion). Mantenere reveal del bottone calcolatore.

## Task 4 — P2 Doppio binario §1–§5 + interattività + contenuti mancanti
**Files:** `index.html` (markup 5 sezioni + CSS)
- [ ] CSS: `details.math-detail` + `summary` brutalista (mono uppercase, bordo inchiostro, marcatore, niente outline default; `summary::-webkit-details-marker{display:none}`).
- [ ] CSS: `.mini-engine-hint` (mono, `--ink-dim`).
- [ ] **§1**: cappello (metafora taxi + **cammini minimi infiniti** + «L₁ è una metrica» + «non invariante per rotazioni»). `<details>` su Def. 1.2 + paragrafo rette critiche.
- [ ] **§2**: cappello (cerchio→rombo). `<details>` su tabella 4 regioni + Teorema 2.1. (π=4 resta in evidenza fuori dal details.)
- [ ] **§3**: cappello (ellisse = due taxi, somma costante; «di solito un ottagono»). `<details>` su Def. 3.1 + 9 regioni + Prop. 3.1/3.2 + tabella esempio.
- [ ] **§4**: cappello (iperbole = differenza costante, il «perché» dei rami). `<details>` su Def. 4.1 + tabella + Prop. 4.1.
- [ ] **§5**: cappello (parabola = equidistanza fuoco/strada-direttrice). `<details>` su tabella regioni + Formula Master.
- [ ] In ogni `.mini-engine-wrap`: aggiungere `.mini-engine-hint` (trascina/muovi P/slider) + legenda P+scalette (adattata per tipo).

## Task 5 — P2 Sezione finale #sintesi + footer + rinumerazione
**Files:** `index.html` (markup + CSS)
- [ ] Nuova `<section id="sintesi" class="section-academic">` dopo §5, prima del vestibolo: numero «§6», titolo «In sintesi», take-away, 3 callout (π=4, cerchio=quadrato, ellisse=ottagono), blocco «Dove si usa davvero» (routing, logistica, ML k-NN/clustering, VLSI, torre scacchi), ponte al calcolatore.
- [ ] Vestibolo calcolatore: numero «§06»→«§07».
- [ ] `<footer>` brutalista (identità + crediti + riferimento `docs/`). CSS `footer`.

## Task 6 — Verifica finale + commit
- [ ] Harness `ConicMath` verde + `node --check` ok (eliminare `_chk.js`).
- [ ] Screenshot headless (hero, §3 con details, #sintesi+footer) per controllo visivo.
- [ ] Commit unico di `index.html` + spec + plan.

---

## Self-review (copertura spec)
- Spec §2.1→T2(§2); §2.2→T2(§3); §2.3→T2(§5); §2.4→T1.
- Spec §3.1→T3; §3.2→T5; §3.3→T4; §3.4→T4.
- Spec §1 (fatti verificati) → numeri usati in T2/T4 combaciano.
- Spec §5 (verifica) → T6.
- Nomi coerenti: `--ink-dim`, `.hero-deck`, `#hero-scroll-cue`, `details.math-detail`, `.mini-engine-hint`, `#sintesi`.
