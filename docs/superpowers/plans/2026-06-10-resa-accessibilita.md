# Resa & accessibilità — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.
>
> **NB:** feature pianificata, **non ancora schedulata** — esecuzione in blocco con le altre.

**Goal:** Formule tipografiche (KaTeX con fallback), reduced-motion, meta/OpenGraph e accessibilità — senza toccare la logica/matematica.

**Architecture:** Tutto in `index.html` (markup `<head>` + CSS + un init KaTeX). KaTeX da CDN con SRI è l'unica dipendenza esterna, con degradazione graziosa (se il CDN non carica restano le formule Unicode). Verifica: `node --check` + harness invariata + checklist visiva/a11y.

**Tech Stack:** HTML/CSS/JS inline + KaTeX (CDN). Harness `tools/test-conicmath.mjs` (solo per confermare `ConicMath` invariato).

**Spec:** `docs/superpowers/specs/2026-06-10-resa-accessibilita-design.md`

**Vincoli:** `ConicMath`/`GraphCalc` invariati; math su canvas invariata; nessuna regressione visiva.

---

## Task 1: Caricamento KaTeX + init + CSS

**Files:** Modify `index.html` (`<head>`, `<style>`, script di bootstrap)

- [ ] **Step 1: Aggiungere KaTeX nel `<head>`.** Subito dopo il `<link>` dei Google Fonts (riga ≈12), inserire lo **snippet ufficiale con SRI** dalla pagina *Browser* di KaTeX (https://katex.org/docs/browser) per la versione **0.16.x** — cioè il `<link rel="stylesheet" …katex.min.css integrity=… crossorigin="anonymous">` e il `<script defer src=…katex.min.js integrity=… crossorigin="anonymous"></script>`.
  *(Importante: copiare gli `integrity` esatti dalla doc ufficiale di quella versione — non inventarli, altrimenti il browser blocca il caricamento.)*

- [ ] **Step 2: CSS per le formule a blocco.** In fondo al `<style>`, aggiungere:
```css
    .formula[data-block] { display:block; text-align:center; margin:0.4em 0; }
    .katex { font-size: 1.05em; }
```

- [ ] **Step 3: Init di rendering.** Nel blocco JS di bootstrap in fondo al file (vicino a `Hero.init();`), aggiungere:
```js
window.addEventListener('load', () => {
  if (!window.katex) return; // CDN non disponibile → restano le formule Unicode (fallback)
  document.querySelectorAll('.formula[data-tex]').forEach(el => {
    try { katex.render(el.getAttribute('data-tex'), el, { throwOnError:false, displayMode: el.hasAttribute('data-block') }); }
    catch (_) {}
  });
});
```

- [ ] **Step 4: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
node tools/test-conicmath.mjs
```
Expected: exit 0; "All assertions passed". Eliminare `tools/_chk.js`.
Visiva: aprire la pagina; in console `window.katex` è definito; le formule non sono ancora cambiate (nessun `data-tex` finora). Nessun errore in console.

- [ ] **Step 5: Commit.**
```bash
git add index.html
git commit -m "feat(resa): carica KaTeX (CDN+SRI) + init rendering con fallback"
```

---

## Task 2: Convertire le formule in TeX (`data-tex` + fallback)

**Files:** Modify `index.html` (le ~30 `<span class="formula">`)

Per **ogni** `<span class="formula">…</span>` aggiungere l'attributo `data-tex="<TeX>"` (e `data-block` per le 4 formule a blocco), **lasciando invariato il contenuto Unicode** (è il fallback). Esempio:
`<span class="formula">d₁(P, A) = …</span>` → `<span class="formula" data-tex="d_1(P, A) = |x - x_a| + |y - y_a|">d₁(P, A) = …</span>`.

- [ ] **Step 1: Applicare la tabella di conversione** (riga → valore di `data-tex`):

| riga | data-tex |
|---|---|
| 537 | `d_1(P, A) = |x - x_a| + |y - y_a|` |
| 545 | `|x - c| = x - c` |
| 546 | `|x - c| = c - x` |
| 563 | `\sqrt{(x-x_a)^2 + (y-y_a)^2}` |
| 564 | `|x-x_a| + |y-y_a|` |
| 583 | `d_2 \le d_1` |
| 584 | `d_1 \le \sqrt{2}\,\cdot d_2` |
| 630 | `d_1(P, C) = R \iff |x - x_c| + |y - y_c| = R` |
| 633a | `x = x_c` |
| 633b | `y = y_c` |
| 640 | `y = -x + (x_c + y_c + R)` |
| 641 | `y = x - (x_c - y_c - R)` |
| 642 | `y = -x + (x_c + y_c - R)` |
| 643 | `y = x - (x_c - y_c + R)` |
| 651a | `4R\sqrt{2}` |
| 651b | `2R^2` |
| 660 | `\pi_1 = 4` |
| 697 *(data-block)* | `\mathcal{E} = \{\, P(x,y) : d_1(P,F_1) + d_1(P,F_2) = 2a \,\}` |
| 700a | `d_0 = d_1(F_1,F_2)` |
| 700b | `k = a - d_0/2` |
| 700c | `x = x_1` |
| 700d | `x = x_2` |
| 700e | `y = y_1` |
| 700f | `y = y_2` |
| 761 *(data-block)* | `\mathcal{H} = \{\, P(x,y) : |d_1(P,F_1) - d_1(P,F_2)| = 2a \,\}` |
| 762a | `d_1(P,F_1) - d_1(P,F_2) = +2a` |
| 762b | `d_1(P,F_1) - d_1(P,F_2) = -2a` |
| 772 | `x = (x_1+x_2)/2 + a` |
| 773 | `x = (x_1+x_2)/2 + a - (y_2-y_1)/2` |
| 811 *(data-block)* | `\mathcal{P} = \{\, P(x,y) : d_1(P,F) = d_1(P,r) \,\}` |
| 815a | `r:\ y = k` |
| 815b | `F(x_F, y_F)` |
| 815c | `|y - k|` |
| 815d | `p = y_F - k` |
| 815e | `|x-x_F| + |y-y_F| = |y-k|` |
| 817a | `y = k` |
| 817b | `y = y_F` |
| 817c | `x = x_F` |
| 822 | `|x-x_F| = y_F - k = p` |
| 823 | `x = 2y - y_F - k + x_F` |
| 824 | `x = -2y + y_F + k + x_F` |
| 838 | `d_1(P,r) = \dfrac{|ax+by+c|}{|a|+|b|}` |

*(Le righe con più formule sulla stessa riga — 633, 651, 700, 762, 815, 817 — hanno più span: applicare il `data-tex` corrispondente a ciascuno nell'ordine in cui appaiono. Usare Read/Grep per individuarle.)*
Per le 3 formule a blocco (697, 761, 811) aggiungere anche l'attributo `data-block` (`<span class="formula" data-block data-tex="…">…</span>`).

- [ ] **Step 2: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: con CDN raggiungibile, tutte le formule HTML sono **rese da KaTeX** (le 3 a blocco centrate, più grandi); **bloccando la richiesta KaTeX** nei devtools e ricaricando, restano le formule **Unicode** leggibili (fallback). Math su canvas invariata.

- [ ] **Step 3: Commit.**
```bash
git add index.html
git commit -m "feat(resa): formule HTML in TeX (KaTeX) con fallback Unicode"
```

---

## Task 3: reduced-motion (G2)

**Files:** Modify `index.html` (`<style>`)

- [ ] **Step 1: Aggiungere il blocco media.** In fondo al `<style>`, inserire:
```css
    @media (prefers-reduced-motion: reduce) {
      html { scroll-behavior: auto; }
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-iteration-count: 1 !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
    }
```

- [ ] **Step 2: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: nei devtools, *Rendering → Emulate CSS prefers-reduced-motion: reduce*: niente transizioni/animazioni CSS, scroll non animato; il sito resta usabile.

- [ ] **Step 3: Commit.**
```bash
git add index.html
git commit -m "feat(resa): rispetto di prefers-reduced-motion (CSS globale)"
```

---

## Task 4: Meta / OpenGraph (G5)

**Files:** Modify `index.html` (`<head>`)

- [ ] **Step 1: Aggiungere i meta.** Subito dopo il `<title>` (riga ≈8), inserire:
```html
  <meta name="description" content="Geometria del Taxi: la metrica L₁ (Manhattan) spiegata in modo interattivo — circonferenza, ellisse, iperbole e parabola taxicab, con un calcolatore grafico.">
  <meta name="theme-color" content="#050505">
  <meta property="og:type" content="website">
  <meta property="og:locale" content="it_IT">
  <meta property="og:title" content="Geometria del Taxi — Metrica L₁">
  <meta property="og:description" content="Le coniche taxicab (L₁/Manhattan) spiegate con visualizzazioni interattive e un calcolatore grafico.">
  <meta name="twitter:card" content="summary">
  <meta name="twitter:title" content="Geometria del Taxi — Metrica L₁">
  <meta name="twitter:description" content="Le coniche taxicab (L₁/Manhattan) spiegate con visualizzazioni interattive e un calcolatore grafico.">
```
*(`og:url`/`og:image` omessi: l'URL definitivo non è fissato e l'immagine richiederebbe un asset ospitato — limite noto, documentato in spec §8.)*

- [ ] **Step 2: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva: nei devtools (Elements/Network), i meta description/OG/twitter/theme-color sono presenti.

- [ ] **Step 3: Commit.**
```bash
git add index.html
git commit -m "feat(resa): meta description + Open Graph + Twitter card + theme-color"
```

---

## Task 5: Accessibilità (G6)

**Files:** Modify `index.html` (`<style>`, markup hero/mini-canvas/pulsanti/body)

- [ ] **Step 1: Focus-visible + skip-link CSS.** In fondo al `<style>`, aggiungere:
```css
    :focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }
    .skip-link {
      position: absolute; left: 8px; top: -48px; z-index: 100000;
      background: #6366f1; color: #fff; padding: 8px 14px; border-radius: 6px;
      font-family: 'IBM Plex Mono', monospace; font-size: 0.8rem; text-decoration: none;
      transition: top 0.15s;
    }
    .skip-link:focus { top: 8px; }
```

- [ ] **Step 2: Skip-link.** Come **primo** figlio del `<body>`, inserire:
```html
  <a class="skip-link" href="#fondamenti">Salta al contenuto</a>
```
*(`#fondamenti` è la prima sezione di contenuto dopo l'hero.)*

- [ ] **Step 3: Canvas decorativi dell'hero.** Aggiungere `aria-hidden="true"` ai canvas `#hero-grid-bg`, `#hero-grid-cursor` (e `#hero-taxi` se presente). Esempio:
`<canvas class="hero-grid-layer" id="hero-grid-bg" style="opacity:0.05" aria-hidden="true"></canvas>`.

- [ ] **Step 4: Mini-canvas come immagini etichettate.** A ciascuno dei 4 `<canvas>` dentro le `.mini-engine-wrap` (sezioni circonferenza/ellisse/iperbole/parabola) aggiungere `role="img"` e un `aria-label` descrittivo, es.:
  - circonferenza: `role="img" aria-label="Circonferenza taxicab: un quadrato ruotato di 45 gradi (rombo)."`
  - ellisse: `role="img" aria-label="Ellisse taxicab: un poligono convesso a 4–8 lati."`
  - iperbole: `role="img" aria-label="Iperbole taxicab: due rami poligonali."`
  - parabola: `role="img" aria-label="Parabola taxicab: spezzata con due semirette e due rami obliqui."`
  *(Usare Read/Grep per individuare i 4 canvas; se hanno già un `id` mantenerlo.)*

- [ ] **Step 5: Label sui pulsanti-icona.** Aggiungere `aria-label` (o `title` se già descrittivo) ai pulsanti che usano solo emoji/simboli e ne sono privi: il bottone snap (`🧲 Snap` ha già testo → ok), il drawer FAB (`☰` ha già aria-label → ok); verificare gli eventuali pulsanti delle nuove feature (sonda/condivisione/strumenti) se già implementate. Per i pulsanti con testo visibile non serve aggiungere nulla.

- [ ] **Step 6: Contrasti.** Individuare i testi con contrasto troppo basso (es. `color: rgba(255,255,255,0.12)` usato per testi informativi non decorativi) e alzarli a ≥ `rgba(255,255,255,0.45)` dove sono contenuto leggibile (non per elementi puramente decorativi). Usare Grep per `rgba(255,255,255,0.1` e valutare caso per caso.

- [ ] **Step 7: Verifica.**
```bash
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: exit 0. Eliminare `tools/_chk.js`.
Visiva/a11y: con **Tab** dall'inizio appare lo skip-link e porta al contenuto; il focus è **sempre visibile**; i canvas decorativi non sono annunciati, i mini-canvas sì (con la label); ESC chiude il calcolatore; un checker (es. axe nei devtools) non segnala errori critici sui controlli.

- [ ] **Step 8: Commit.**
```bash
git add index.html
git commit -m "feat(a11y): focus-visible, skip-link, aria su canvas/mini-canvas, contrasti"
```

---

## Task 6: Verifica finale + roadmap

**Files:** Modify `docs/ROADMAP_MIGLIORAMENTI.md` (G1/G2/G5/G6 → ✅)

- [ ] **Step 1: Sintassi + harness.**
```bash
node tools/test-conicmath.mjs
node -e "const fs=require('fs');const h=fs.readFileSync('index.html','utf8');const m=[...h.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(x=>x[1]).join('\n;\n');fs.writeFileSync('tools/_chk.js',m);"
node --check tools/_chk.js
```
Expected: "All assertions passed" + exit 0. Eliminare `tools/_chk.js`.

- [ ] **Step 2: Checklist visiva.** Formule rese (o fallback se KaTeX bloccato); reduced-motion ferma le animazioni; meta/OG presenti; skip-link/focus/aria a posto; nessuna regressione su hero/sezioni/calcolatore; nessun errore in console.

- [ ] **Step 3: Roadmap.** In `docs/ROADMAP_MIGLIORAMENTI.md` mettere Stato 📋 → ✅ per **G1, G2, G5, G6**.

- [ ] **Step 4: Commit.**
```bash
git add docs/ROADMAP_MIGLIORAMENTI.md
git commit -m "docs: roadmap — resa & accessibilità (G1/G2/G5/G6)"
```

---

## Self-review (copertura spec)

- **Spec §2 (KaTeX):** Task 1 (caricamento+init+CSS) + Task 2 (conversione formule, fallback Unicode, `data-block`).
- **Spec §3 (reduced-motion):** Task 3.
- **Spec §4 (meta/OG):** Task 4 (description, OG, Twitter, theme-color; og:image omesso).
- **Spec §5 (a11y):** Task 5 (focus-visible, skip-link, aria-hidden hero, role/label mini-canvas, label pulsanti, contrasti).
- **Spec §7 (verifica):** checklist KaTeX/fallback, reduced-motion, meta, a11y + harness invariata (Task 1–6).
- **Spec §8/§9 (scope/vincoli):** og:image fuori scope; math su canvas e `ConicMath`/`GraphCalc` invariati; KaTeX unica dipendenza, con SRI+fallback.
- **Coerenza nomi:** classe `.formula` + attributi `data-tex`/`data-block`; init su `window.load` con guardia `window.katex`; `.skip-link`; `aria-hidden`/`role="img"`/`aria-label`.
