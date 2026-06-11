# Correzioni matematiche + rifacimento divulgativo (P1+P2) — design

**Data:** 2026-06-11
**File:** `index.html` (tutto inline; vincolo single-file, niente librerie tranne Google Fonts).
**Base:** audit del 2026-06-11 (3 auditor: narrativo/matematico, UX, codice).
**Estetica:** invariata (Brutalista: osso `#E9E5DC`, inchiostro `#0A0A0A`, pomodoro `#FF4A1C`, Bricolage Grotesque + IBM Plex Mono).

## 0. Obiettivo e ambito

Implementare gli interventi **P1 (correzioni)** e **P2 (divulgazione)** dell'audit. Scelte utente:
- Ambito: **P1 + P2**.
- Hero: **opzione A** («E se π valesse esattamente 4?»).
- Rigore: **doppio binario** (cappello intuitivo visibile + derivazioni formali in `<details>`).

Fuori scope (rimandati): P3 (TOC/progress, ponti+CTA contestuali, onboarding calcolatore, tabelle mobile, tastiera/landmark a11y) e P4 (pulizia codice, dedup, performance).

## 1. Fatti matematici verificati (ground truth = `ConicMath`, già testato)

Verificati numericamente con `ConicMath` il 2026-06-11. **Il testo deve combaciare con questi, non viceversa.**

### 1.1 π taxicab (§2)
- Ogni lato del rombo, misurato in metrica L₁, vale `|Δx|+|Δy| = R+R = 2R`. Quattro lati → **perimetro taxicab = 8R**.
- **π₁ = perimetro taxi / diametro = 8R / 2R = 4.**
- Il perimetro **euclideo** è `4R√2 ≈ 5.66R`, ma non è la misura naturale qui. La derivazione attuale `4R√2/(2R)=2√2 … =4` è incoerente e va **eliminata**.

### 1.2 Forma dell'ellisse taxicab (§3) — tassonomia corretta
- **Fuochi obliqui** (x₁≠x₂ **e** y₁≠y₂): **sempre un ottagono (8 vertici)**, per qualunque 2a>d₀. *Non* esiste un regime "esagono al crescere di k.*
- **Fuochi allineati** (orizzontali Δy=0 **o** verticali Δx=0, distinti): **esagono (6 vertici)**.
- **Degenere 2a=d₀**: rettangolo `[x₁,x₂]×[y₁,y₂]` (4 vertici) — già corretto in Prop. 3.2.
- **Fuochi coincidenti**: rombo (è la circonferenza).
- Esempio §3 **F₁(0,0), F₂(4,2), 2a=10**: d₀=6, k=2, **ottagono**, 8 vertici =
  `(-2,0) (0,-2) (4,-2) (6,0) (6,2) (4,4) (0,4) (-2,2)`; estensione x∈[-2,6], y∈[-2,4].
  → La riga attuale «k=2 < hw=2 → esagono (6 vertici)» è **doppiamente falsa** (disuguaglianza falsa **e** forma sbagliata: è un ottagono).

### 1.3 Parabola (§5)
- Il JS `parabolaSegments` è **corretto**. Per F(0,2), direttrice y=0: rami obliqui da `(±p, y_F)` al **vertice (0,1) = (0,(y_F+k)/2)`, poi due semirette verticali in su.
- Errore è **solo nel testo "Formula Master"**: il range dei due rami obliqui `k ≤ y ≤ y_F` è sbagliato; corretto è **`(y_F+k)/2 ≤ y ≤ y_F`**, con vertice a `y_V=(y_F+k)/2` (punto medio fuoco-direttrice).
- «Pendenza +2 / −2» è fuorviante: è `dx/dy=2` (la pendenza geometrica dy/dx è ½). Riformulare come «2 passi orizzontali per ogni passo verticale».

## 2. P1 — Correzioni (4 interventi)

### 2.1 §2 — blocco π₁
- In Teorema 2.1 aggiungere «**Perimetro taxicab: 8R**» accanto a perimetro euclideo/area.
- Sostituire il `formula-display` con:
  ```
  π₁ (taxicab) = perimetro taxi / diametro = 8R / 2R = 4

  Ogni lato del rombo, percorso "a isolati", misura |Δx|+|Δy| = R + R = 2R → 4 lati = 8R.
  (Il perimetro euclideo sarebbe 4R√2 ≈ 5.66 R, ma non è la misura naturale di questa geometria.)
  ```
- Tenere la frase «Il valore π₁ = 4 … è uno dei risultati più sorprendenti».

### 2.2 §3 — Proposizione 3.1 + esempio
- Riscrivere Prop. 3.1 secondo §1.2 (obliqui→ottagono sempre; allineati→esagono; degenere→rettangolo).
- Correggere la tabella dell'esempio: `d₀=6`, `k=2`, e sostituire le righe x_sin/x_des/Forma con:
  - «Vertice sinistro / destro»: x ∈ [−2, 6]; «alto / basso»: y ∈ [−2, 4];
  - «Forma»: **ottagono (8 vertici)**.

### 2.3 §5 — Formula Master + tabella regioni
- Range dei due rami obliqui: `(y_F+k)/2 ≤ y ≤ y_F`; aggiungere riga «Vertice: y = (y_F+k)/2 (metà strada fuoco–direttrice)».
- Tabella regioni B/C: cambiare «Pendenza +2/−2» in «x = 2y+… → 2 passi in x per 1 in y» (e simmetrico per C); rendere coerente la dicitura condizione/equazione.

### 2.4 a11y — contrasto + reduced-motion
- Nuova variabile `--ink-dim: #5b554c` (contrasto ≥ 4.5:1 su osso, da verificare). Usarla per i testi piccoli oggi a `opacity:0.5–0.6`: `.csb-label`, `.csb-param-label`, `.csb-output`, `.csb-sub-label`, `.mini-ctrl-label`, `.mini-engine-output`, caption figure. Rimuovere le `opacity` su testo piccolo.
- `.csb-status`: colore da `var(--tomato)` → `var(--ink)` (mantenere il peso; l'accento resta il bordo/sfondo, non il testo). Vietato pomodoro come **testo piccolo**.
- Reduced-motion: in `Hero.init()`/`start()` controllare `prefers-reduced-motion: reduce`; se attivo, disegnare **un solo frame statico** e non avviare il loop. Aggiungere `@media (prefers-reduced-motion: reduce){ html{ scroll-behavior:auto } }`.

## 3. P2 — Divulgazione

### 3.1 Hero (opzione A)
Struttura nuova di `.hero-content`:
- kicker tag invariato (`Metrica L₁ · Distanza di Manhattan`);
- `h1.hero-title` → **«E se π valesse esattamente 4?»** (con «4» o «π» in `.em` pomodoro — pomodoro su titolo grande = large text, contrasto ok);
- **nuovo** `p.hero-deck`: «Cambia il modo di misurare le distanze — non "in linea d'aria" ma "per isolati" — e la geometria si trasforma: i cerchi diventano quadrati, le ellissi ottagoni.»;
- riga identità mono piccola (sostituisce il vecchio sottotitolo ridondante): «Geometria del Taxi»;
- **scroll-cue**: `a.hero-scroll-cue` con «↓» (e/o «Inizia») che linka `#fondamenti`, **sempre visibile** (risolve "nessuna CTA all'arrivo"). Il bottone calcolatore continua a rivelarsi dopo §1 (logica invariata).
- CSS: `.hero-deck` (Bricolage, ~1.1–1.3rem, max-width ~46ch, opacità piena), `.hero-scroll-cue` (mono, pulse rispettoso di reduced-motion).

### 3.2 Sezione finale «In sintesi · curiosità · applicazioni» + footer
Nuova `<section id="sintesi" class="section-academic">` **dopo §5 e prima del vestibolo §6**:
- numero «§6» (e il vestibolo calcolatore diventa «§7»);
- titolo «In sintesi» + 1 paragrafo take-away;
- 3 callout brutalisti (riuso stile `.theorem`/box con accento pomodoro): «π = 4», «Il cerchio è un quadrato», «L'ellisse è un ottagono»;
- blocco «Dove si usa davvero» con 4–5 applicazioni reali concrete: navigatori/routing su griglia urbana; logistica e consegne; **distanza di Manhattan in ML** (k-NN, clustering); instradamento ortogonale dei circuiti (VLSI); analogia con il movimento della **torre** a scacchi;
- ponte al calcolatore («ora costruiscile tu →», che apre `GraphCalc`).
- `<footer>` brutalista: «Un'esplorazione della metrica L₁», crediti, riferimento ai documenti in `docs/`.

### 3.3 Doppio binario (cappelli + `<details>`) per §1–§5
Per ogni sezione:
- aggiungere un **cappello** intuitivo (1–2 frasi, linguaggio piano, metafora del taxi viva) prima dei blocchi formali;
- spostare i blocchi formali densi in `<details class="math-detail"><summary>Dettaglio matematico</summary>…</details>`. Cosa collassare per sezione:
  - **§1**: `<details>` su Def. 1.2 (scioglimento moduli) + il paragrafo sulle rette critiche. Restano visibili: cappello, Def. 1.1, tabella comparativa L₁/L₂, figura. Aggiungere cappello con **cammini minimi infiniti** e una riga su «L₁ è una vera metrica» + «non è invariante per rotazioni».
  - **§2**: `<details>` su tabella 4 regioni + Teorema 2.1. Restano: cappello (cerchio→rombo intuitivo), il fatto π=4 in evidenza (callout), mini-canvas.
  - **§3**: `<details>` su Def. 3.1, lista 9 regioni, Prop. 3.1, Prop. 3.2, tabella esempio. Resta: cappello (ellisse = «due taxi dai fuochi, somma costante») + frase chiave «di solito un ottagono» + mini-canvas.
  - **§4**: `<details>` su Def. 4.1, tabella regioni, Prop. 4.1. Resta: cappello (iperbole = «differenza costante»). (Sezione scarna: il cappello aggiunge il "perché".)
  - **§5**: `<details>` su tabella regioni + Formula Master. Resta: cappello (parabola = «equidistanza da fuoco e strada-direttrice») + mini-canvas.
- Stile `<details>/<summary>` brutalista: `summary` mono uppercase con marcatore (rombo o `+/–`), bordo inchiostro, niente outline default.
- **Metafora viva**: una frase "taxi" nel cappello di ogni sezione (§2 cerchio, §3 ellisse, §4 iperbole, §5 parabola).

### 3.4 Segnalazione interattività mini-canvas
- In ogni `.mini-engine-wrap` aggiungere una riga `.mini-engine-hint` (mono, `--ink-dim`): «Trascina i fuochi · muovi P · usa lo slider» (per la circonferenza: «Trascina il centro · muovi P»).
- Una riga di legenda che spiega P e le scalette: «P scorre sulla curva; le scalette sono i percorsi-taxi verso i fuochi e la loro somma/differenza resta costante.» (adattata per tipo).

## 4. Architettura / componenti toccati

- **HTML markup** (`<body>` dentro `.frame`): hero (deck + scroll-cue), 5 sezioni (cappelli + `<details>`), nuova sezione `#sintesi`, footer, rinumerazione §6→§7 del vestibolo.
- **CSS** (`<style>`): `--ink-dim`; `.hero-deck`, `.hero-scroll-cue`; `details.math-detail`/`summary`; `.mini-engine-hint`; `.sintesi-*`/callout; `footer`; blocco `@media (prefers-reduced-motion)`; aggiornare i selettori a testo piccolo per usare `--ink-dim`; `.csb-status` colore.
- **JS** (`<script>`): `Hero.init()/start()` guardia reduced-motion; **testi delle correzioni sono nel markup** (non nel JS). `ConicMath`/`GraphCalc`/`MiniEngine` logica **invariata**. (I numeri hardcoded del mini-output restano coerenti.)
- **Nessuna modifica a** `ConicMath` (firme e logica), né alla matematica di rendering: si toccano solo testo, struttura, CSS e la guardia reduced-motion dell'hero.

## 5. Verifica

- `node tools/test-conicmath.mjs` → «All assertions passed» (deve restare verde: non tocchiamo ConicMath).
- `node --check` sugli script estratti → exit 0.
- Visiva (screenshot headless Edge): hero nuovo (titolo π=4 + deck + scroll-cue); §1–§5 con cappello visibile e `<details>` chiusi di default; sezione `#sintesi` + footer; mini-canvas con hint; calcolatore invariato; contrasto label leggibile.
- Reduced-motion: con emulazione, l'hero non anima (frame statico), il pulse del cue è fermo.
- Coerenza matematica: i tre blocchi corretti (π=4, ottagono §3, range parabola §5) combaciano con i valori verificati in §1.

## 6. Vincoli

- Single-file inline; nessuna libreria nuova.
- `ConicMath` invariato; harness verde.
- Estetica Brutalista invariata; nessun nuovo colore tranne `--ink-dim` (grigio caldo per a11y).
- `<details>` nativo (niente JS per l'accordion del testo); progressive enhancement (senza JS resta aperto/leggibile).
