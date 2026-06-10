# Hero: titolo animato (H3) + scroll cue & progress (H5) — design

**Data:** 2026-06-10
**File:** `index.html` (markup hero + barra globale, CSS, un piccolo script).
**Backlog:** voci H3 e H5 di `docs/ROADMAP_MIGLIORAMENTI.md`. **H4 escluso** (già coperto da "Hero più vivo": i due estremi A/B trascinabili con diagonale fantasma e d₁/d₂).
**Nota:** solo progettazione; implementazione in blocco con le altre feature.

## 0. Obiettivo

Rifinire l'apertura: **(H3)** un'animazione del titolo al caricamento, con un accento che passa da diagonale a scaletta L₁; **(H5)** un invito allo scroll che svanisce e una barra di progresso di lettura.

## 1. Contesto del codice

- Hero (`#hero`, ≈ riga 504): due canvas griglia decorativi, due `.hero-blob`, e `.hero-content` con `.hero-title` (`Quando la retta più breve<br>non è la diagonale`), `.hero-subtitle`, e il bottone `#btn-hero-calc` (già a comparsa: opacity 0 → rivelato dal bootstrap dopo §1).
- Nessuna animazione d'entrata sul titolo. Il bootstrap ha già un `IntersectionObserver` per l'hero (start/stop animazione griglia).
- La feature "Resa & accessibilità" (in coda) aggiunge un blocco globale `@media (prefers-reduced-motion: reduce)`; **questa** feature include comunque una guardia reduced-motion propria, per essere autosufficiente.

## 2. H3 — Titolo animato

- **Entrata (CSS):** `.hero-title` e `.hero-subtitle` entrano al load con `@keyframes heroRise { from{opacity:0; transform:translateY(14px)} to{opacity:1; transform:none} }`, applicato con un piccolo **stagger** (es. titolo `animation-delay:0.1s`, sottotitolo `0.35s`), `animation-fill-mode:both`. (Il bottone mantiene la sua comparsa attuale.)
- **Accento "diagonale → scaletta":** un piccolo canvas `#hero-accent` (es. 220×26px) sotto il sottotitolo. Al load, una **animazione one-shot** (rAF, ~0.9s, easing) **interpola** una linea da **diagonale** a **scaletta L₁** (gradini), poi resta statica come decorazione (colore accent tenue, es. ambra). Concettualmente: i punti del tracciato vanno dalla retta inclinata ai segmenti orizzontali/verticali a gradini.
- **`prefers-reduced-motion`:** niente entrata né morph → titolo/sottotitolo già visibili e l'accento disegnato **direttamente nello stato finale** (scaletta). Guardia: una regola `@media (prefers-reduced-motion: reduce){ .hero-title,.hero-subtitle{animation:none} }` + nello script, se reduced-motion, disegnare subito la scaletta finale senza animare.

## 3. H5 — Scroll cue + barra di progresso

- **Scroll cue:** un elemento (`#hero-scroll-cue`) in basso al centro dell'hero, discreto (chevron "⌄" o "↓ scorri"), con un leggero pulse CSS. Al **primo scroll** (`scrollY>10`) ottiene una classe che lo **dissolve** (`opacity:0; pointer-events:none`); non riappare. `prefers-reduced-motion`: il pulse è disattivato (resta statico, poi svanisce allo scroll).
- **Barra di progresso (lettura):** un elemento `#read-progress` `position:fixed; top:0; left:0; height:3px; z-index` alto, colore accent tenue, larghezza guidata dallo scroll: un listener (rAF-throttlato) imposta `transform:scaleX(progress)` (`transform-origin:left`) con `progress = scrollTop / (scrollHeight - innerHeight)` (clamp [0,1]); a documento non scrollabile → 0. La barra resta anche con reduced-motion (non è motion fastidiosa; la transizione di larghezza è istantanea/breve).

## 4. Architettura

- **Markup:** dentro `.hero-content` (dopo il sottotitolo) il `<canvas id="hero-accent">`; in `#hero` il `<div id="hero-scroll-cue">`; come primo elemento del `<body>` (o subito dopo) il `<div id="read-progress">`.
- **CSS:** `@keyframes heroRise` + pulse del cue; stili di `#read-progress`, `#hero-scroll-cue`, `#hero-accent`; guardia `@media (prefers-reduced-motion: reduce)` per disattivare animazioni/pulse.
- **JS:** un piccolo modulo nel bootstrap: (a) disegno dell'accento (one-shot animato, o stato finale se reduced-motion); (b) un listener di scroll unico (rAF-throttlato) che aggiorna `#read-progress` e nasconde il cue al primo scroll.
- Nessuna libreria; nessuna modifica a `ConicMath`/calcolatore. Coesiste con "Hero più vivo" (l'accento è nell'area titolo, separato dal canvas taxi e dalla griglia).

## 5. Verifica

Visiva: al caricamento, titolo/sottotitolo entrano con il fade+rise e l'accento si anima da diagonale a scaletta; con `prefers-reduced-motion` tutto appare statico nello stato finale; lo scroll cue invita e svanisce al primo scroll; la barra in alto si riempie scorrendo la pagina e torna a 0 in cima; su mobile l'hero resta corretto; nessuna regressione sull'hero esistente; nessun errore in console; `ConicMath`/harness invariati.

## 6. Fuori scope

- H4 (playground d₁/d₂): già in "Hero più vivo".
- Altre voci hero/sezioni.
- Modifiche alla matematica/calcolatore.

## 7. Vincoli

- Tutto inline; nessuna libreria.
- Firme pubbliche di `ConicMath`/`GraphCalc` invariate.
- `prefers-reduced-motion` rispettato (con guardia propria, indipendente dalla feature Resa).
- Nessuna regressione su hero/sezioni.
