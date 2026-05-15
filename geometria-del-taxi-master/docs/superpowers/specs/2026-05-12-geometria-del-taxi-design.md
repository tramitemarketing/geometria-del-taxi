# Design Spec — Geometria del Taxi (Metrica L₁)
**Data:** 2026-05-12  
**Output:** `C:\Users\gioff\Desktop\CLAUDE CODE\index.html`  
**Stack:** HTML + CSS + JS vanilla. Google Fonts CDN only.

---

## 1. Obiettivo

Sito didattico accademico monopagina sulla Geometria del Taxi (metrica L₁). Tono: dispensa di ricerca universitaria — sobrio, preciso, autorevole — con un'introduzione visivamente audace.

---

## 2. Architettura generale

### File
- Singolo `index.html` con CSS inline in `<style>` e JS inline in `<script>` al fondo del `<body>`
- Nessun file esterno eccetto Google Fonts CDN

### Google Fonts
```
Playfair Display: 700, 800         → hero title, engine title
IBM Plex Mono: 400, 500            → monospace, formule, label, sottotitolo hero
Spectral: 400 (reg + italic), 600  → corpo testo accademico
```

### JS — Module Pattern (namespace objects)
```js
const ConicMath = { /* algoritmi puri per tutte le coniche */ }
const Hero      = { init(), animate(), destroy() }
const MiniEngine = { init(canvasId, conicType), draw(), destroy() }
const MainEngine = { init(), draw(), updateParams() }
```

### Sezioni del documento
| ID          | Tipo     | Background |
|-------------|----------|------------|
| `#hero`     | Hero     | `#050505`  |
| `#fondamenti`   | Academic | `#FAFAFA`  |
| `#circonferenza` | Academic | `#FAFAFA`  |
| `#ellisse`  | Academic | `#FAFAFA`  |
| `#iperbole` | Academic | `#FAFAFA`  |
| `#parabola` | Academic | `#FAFAFA`  |
| `#esplora`  | Engine   | `#050505`  |

---

## 3. Sezione 1 — Hero

### Visual
- Altezza: `100vh`, `min-height: 600px`
- Background: `#050505`
- Contenuto centrato verticalmente e orizzontalmente

### Animazione griglia (due layer SVG)
- **Layer 1** (sempre visibile, `opacity: 0.05`): griglia `40×40px`, `requestAnimationFrame`, offset X/Y incrementano di `0.5px/frame`, wrapping a modulo `40`
- **Layer 2** (visibile solo vicino al cursore, `opacity: 0.4`): stesso pattern, `maskImage: radial-gradient(300px circle at {x}px {y}px, black, transparent)` aggiornato su `mousemove`
- Pattern SVG: `path "M 40 0 L 0 0 0 40"`, `stroke: currentColor`, `strokeWidth: 1`
- `IntersectionObserver` sul `#hero`: `cancelAnimationFrame` quando esce dal viewport, `requestAnimationFrame` quando rientra

### Blob luce
- Top-right: `rgba(245,158,11,0.3)`, `400×400px`, `filter: blur(120px)`, `position: absolute`
- Bottom-left: `rgba(59,130,246,0.3)`, `420×420px`, `filter: blur(120px)`, `position: absolute`

### Tipografia
- Titolo: **Playfair Display 800**, `clamp(2.5rem, 6vw, 5rem)`, `color: #ffffff`, `line-height: 1.15`
  - Testo: *"Quando la retta più breve non è la diagonale"*
- Sottotitolo: **IBM Plex Mono 400**, `clamp(0.75rem, 1.5vw, 1rem)`, `letter-spacing: 0.22em`, `text-transform: uppercase`, `color: rgba(255,255,255,0.5)`
  - Testo: `GEOMETRIA DEL TAXI — METRICA L₁`

### Transizione verso sezioni bianche
- `IntersectionObserver` sulla prima sezione accademica (`#fondamenti`)
- Quando entra nel viewport: `body` ottiene classe `.light-mode`, che fa transitare `background-color` da `#050505` a `#FAFAFA` con `transition: background-color 0.6s ease`

---

## 4. Sezioni §1–§5 — Accademiche

### CSS globale `.section-academic`
- `background: #FAFAFA`, `color: #1a1a1a`
- Font corpo: **Spectral**, `font-size: clamp(0.95rem, 1.1vw, 1.05rem)`, `line-height: 1.78`, `text-align: justify`
- `max-width: 960px`, `margin: 0 auto`, `padding: 5rem 2rem`

### Componenti riusabili
| Classe              | Descrizione |
|---------------------|-------------|
| `.section-number`   | IBM Plex Mono 10px, uppercase, `color: #999` |
| `.section-title`    | Spectral 600, `clamp(1.4rem, 2vw, 1.8rem)`, border-bottom |
| `.definition-box`   | Border-left 3px `#1a1a1a`, italic Spectral, background `#f5f5f5` |
| `.theorem`          | Border 1px `#ccc`, con `.theorem-label` Mono uppercase |
| `.formula`          | IBM Plex Mono inline, `background: #f0f0f0` |
| `.formula-display`  | IBM Plex Mono block, centrato, `background: #f5f5f5`, `border: 1px solid #e8e8e8` |
| `table.paper-table` | Borders minimalisti, th Mono uppercase |

### Layout split 65/35
```html
<div class="section-split">
  <div class="section-text"><!-- testo matematico --></div>
  <div class="section-figure"><!-- mini-engine canvas --></div>
</div>
```
- Desktop: `display: flex`, gap `2rem`
- Mobile (`< 768px`): `flex-direction: column` — canvas **sotto** il testo

### §1 Fondamenti — figura destra
La sezione §1 (Fondamenti) **non ha mini-engine**: ha una SVG statica che sovrappone cerchio L₂ e quadrato L₁ con etichette. Non c'è parametro da variare in questa sezione introduttiva.

### Mini-Engine (lato destro di ogni sezione conica §2–§5)
- Canvas `280×280px` con sfondo `#0f0f0f`, border-radius `6px`
- Griglia scura, assi, conica del colore della sezione
- 1–2 slider parametro principale sotto il canvas
- `IntersectionObserver`: il loop `rAF` parte solo quando il canvas è nel viewport
- `MiniEngine.init(canvasId, conicType, defaultParams)` — usa `ConicMath` per il disegno

**Mini-engine per sezione:**
- §2 Circonferenza: slider R (0.5–5), centro fisso (0,0)
- §3 Ellisse: slider 2a (maggiore di d₀), F₁ e F₂ fissi a (-2,0) e (2,0)
- §4 Iperbole: slider 2a (0 < 2a < d₀), stessi fuochi
- §5 Parabola: slider p = yF − k (0.5–4), fuoco fisso (0,p), direttrice y=0

---

## 5. Contenuto matematico sezione per sezione

### §1 — Fondamenti Teorici
- Paragrafo introduttivo della metafora taxi/griglia
- `definition-box` Def 1.1 (distanza Manhattan) + Def 1.2 (scioglimento modulo)
- `paper-table` comparativa L₁ vs L₂ (5 righe, 3 colonne)

### §2 — Circonferenza Taxicab
- `definition-box` definizione formale
- Spiegazione 4 regioni + tabella (4 righe: RI NE, RII NW, RIII SW, RIV SE)
- `theorem` Teorema 2.1 (vertici, perimetro 4R√2, area 2R²)
- Nota π₁ = 4

### §3 — Ellisse Taxicab
- `definition-box` + setup d₀ e k
- Spiegazione griglia 3×3 (9 regioni)
- Risultati per regione (casi fondamentali, testo + tabella parziale)
- `theorem` Proposizione 3.1 (ottagono/esagono/rettangolo)
- `theorem` Proposizione 3.2 (caso degenere: regione bidimensionale)
- Esempio numerico F₁(0,0), F₂(4,2), 2a=10 → tabella compatta

### §4 — Iperbole Taxicab
- `definition-box` + due rami ±2a
- Analisi 9 regioni per Ramo 1 (casi non banali)
- `theorem` Proposizione 4.1

### §5 — Parabola Taxicab
- `definition-box` + spiegazione distanza L₁ da direttrice orizzontale
- Tabella 4 regioni (A, B, C, D)
- `formula-display` Formula Master (4 rami)
- Menzione caso direttrice obliqua

---

## 6. Sezione §6 — Engine Principale ("Esplora")

### Visual
- Background `#050505`, stesso tono dell'hero
- Titolo: **Playfair Display 700**, grande, bianco — "Esplora"
- Sottotitolo: IBM Plex Mono, grigio, uppercase

### Canvas multi-conica
- Dimensione: `min(600px, 95vw)` × stessa larghezza (quadrato), `background: #0a0a0a`
- Griglia scura, assi più marcati, label assi IBM Plex Mono
- Ogni conica ha il proprio colore:
  - Circonferenza: `#e63946` (rosso)
  - Ellisse: `#3b82f6` (blu)
  - Iperbole: `#f59e0b` (ambra)
  - Parabola: `#22c55e` (verde)
- Linee critiche (regionali) in tratteggiato `rgba(color, 0.3)`
- Pan (drag) + zoom (wheel) sul canvas principale

### Pannello controlli
Quattro sezioni accordion collassabili, una per conica:
```
[●] Circonferenza  ▾
    xc: [slider]  yc: [slider]  R: [slider]
    → Perimetro = ...  Area = ...  π₁ = 4

[●] Ellisse  ▾
    ...

[○] Iperbole  ▾  (collassato di default)
    ...

[○] Parabola  ▾  (collassato di default)
    ...
```
- Cerchio pieno `[●]` = conica attiva; cerchio vuoto `[○]` = inattiva
- Click sull'header toglie/attiva la conica e dispiega/chiude i controlli

### Output live per ogni conica attiva
Mostrato sotto gli slider della rispettiva sezione.

---

## 7. Algoritmi di disegno (ConicMath)

Tutti i calcoli vivono in `ConicMath`, usato sia dai MiniEngine che dal MainEngine.

### Circonferenza
Calcola 4 vertici `VN, VE, VS, VW` e disegna 4 segmenti.

### Ellisse
1. Calcola `d₀ = |x₂-x₁| + |y₂-y₁|`, `k = a - d₀/2`
2. Calcola vertici nelle 9 regioni con le formule del metodo 9 regioni
3. Filtra vertici coincidenti (casi degeneri)
4. Connette i vertici in ordine → poligono chiuso

### Iperbole
Due rami calcolati separatamente con il metodo 9 regioni per `d₁(P,F₁) - d₁(P,F₂) = +2a` e `-2a`. Ogni ramo è un poligono aperto.

### Parabola
4 segmenti: 2 semirette verticali (troncate a `yF + 5` unità) + 2 rami inclinati (da `y=k` a `y=yF`).

### Clipping
Funzione `clipToViewport(x1,y1,x2,y2, worldBounds)` — Cohen-Sutherland — riusata dall'esistente per troncare segmenti al viewport.

---

## 8. Responsività

| Breakpoint | Comportamento |
|---|---|
| `> 768px` | Split 65/35, canvas mini-engine a destra |
| `≤ 768px` | Colonne impilate, canvas sotto il testo |
| Engine canvas | `min(600px, 95vw)` — quadrato adattivo |

---

## 9. Performance e accessibilità

- `rAF` hero: cancellato da `IntersectionObserver` quando `#hero` esce dal viewport
- Mini-engine `rAF`: ogni loop parte/ferma via `IntersectionObserver` per quel canvas
- Ogni sezione ha `id` (es. `#circonferenza`) per navigazione diretta
- Font caricati con `display=swap` per evitare FOIT

---

## 10. Decisioni fissate

| Decisione | Scelta |
|---|---|
| File output | `C:\Users\gioff\Desktop\CLAUDE CODE\index.html` |
| Vecchio tool bisettrice | Abbandonato — non incluso nel nuovo sito |
| Font corpo accademico | **Spectral** (Google Fonts) |
| SVG sezioni | Mini-engine Canvas interattivo (non SVG statico) |
| Engine finale | Multi-conica (tutte e 4 sullo stesso canvas con toggle) |
| JS architecture | Module pattern (namespace object literals) |
| Framework | Nessuno — vanilla JS puro |
