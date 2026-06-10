# Resa & accessibilità — design

**Data:** 2026-06-10
**File:** `index.html` (markup + CSS inline; un `<link>`/`<script>` KaTeX da CDN — unica dipendenza esterna, accettata).
**Backlog:** voci G1 (KaTeX), G2 (reduced-motion), G5 (meta/OG), G6 (accessibilità) di `docs/ROADMAP_MIGLIORAMENTI.md`.
**Nota:** solo progettazione; implementazione in blocco con le altre feature.

## 0. Obiettivo

Migliorare la **resa** (formule tipografiche, anteprime social) e l'**accessibilità/performance** del sito, senza toccare la logica del calcolatore né la matematica.

## 1. Contesto del codice

- `<head>` (righe 1–12): `lang="it"`, charset, viewport, mobile-web-app, `<title>`, favicon SVG, Google Fonts via CDN (già una dipendenza esterna). **Mancano:** `meta description`, Open Graph, Twitter card, `theme-color`.
- Formule: ~30 `<span class="formula">…</span>` nelle sezioni accademiche (≈ righe 537–838), con math **Unicode** (pedici `<sub>`, `₁`, `√`, `⟺`, `≤`, ecc.). La regola CSS `.formula` è a riga 76.
- Animazioni/transizioni CSS: `html{scroll-behavior:smooth}` (riga 15), `body{transition:…}` (riga 19), transizioni su `#calc-overlay`, pulsanti, ecc. **Non** esiste un blocco `@media (prefers-reduced-motion: reduce)`.
- I loop rAF in JS (hero, mini-canvas) **rispettano già** `prefers-reduced-motion` (vedi i rispettivi design/feature).
- Accessibilità: solo 2 `aria-label` (chiusura/drawer del calcolatore). Mancano: focus-visible, `aria-hidden` sui canvas decorativi, `role`/label sui mini-canvas, label su vari pulsanti-icona, skip-link; alcuni testi tenui hanno contrasto basso.

## 2. KaTeX (G1) — formule tipografiche con fallback

- **Caricamento:** nel `<head>`, `<link rel="stylesheet" href="…katex.min.css" integrity="…" crossorigin="anonymous">` e `<script defer src="…katex.min.js" integrity="…" crossorigin="anonymous"></script>` da un CDN stabile (es. jsdelivr), con **SRI** (`integrity`) e `crossorigin`.
- **Sorgente + fallback:** ogni `<span class="formula">` (e le math inline rilevanti) riceve un attributo **`data-tex`** con la sorgente TeX equivalente. Il **contenuto Unicode attuale resta** dentro lo span come **fallback leggibile**.
- **Rendering:** un piccolo init eseguito a `window.load` (o dopo il `defer` di KaTeX): `if (window.katex) document.querySelectorAll('.formula[data-tex]').forEach(el => { try { katex.render(el.getAttribute('data-tex'), el, {throwOnError:false, displayMode:false}); } catch(_){} });`. Se `window.katex` è assente (CDN irraggiungibile), **non si fa nulla** → restano le formule Unicode.
- **Ambito:** solo le formule **HTML**. Le equazioni disegnate su **canvas** (mini-output, box T3, readout sonda) NON usano KaTeX e restano invariate.
- **Display vs inline:** le formule "a blocco" (definizioni dei luoghi, es. `𝓔 = {…}`) possono usare `displayMode:true` per resa più grande; le inline `displayMode:false`. Si distinguono via una classe/attributo (es. `.formula.is-block` → display).
- La conversione TeX di ciascuna formula è enumerata nel piano (una tabella formula→TeX); il testo Unicode esistente è il fallback per ognuna.

## 3. reduced-motion + performance (G2)

- Aggiungere in fondo al `<style>` un blocco globale:
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
- I loop rAF (hero, mini-canvas) già non auto-animano sotto reduced-motion (logica nei rispettivi design). Nessuna ulteriore modifica JS richiesta da questa feature.

## 4. Meta / OpenGraph (G5)

Nel `<head>` aggiungere:
- `<meta name="description" content="…">` (descrizione concisa del sito: geometria del taxi / metrica L₁ / coniche e calcolatore interattivo).
- Open Graph: `og:type=website`, `og:title`, `og:description`, `og:locale=it_IT`, `og:url` (URL del sito; se non noto, si può omettere `og:url` o usare un placeholder documentato).
- Twitter: `twitter:card=summary`, `twitter:title`, `twitter:description`.
- `<meta name="theme-color" content="#050505">`.
- **`og:image` omesso** (richiederebbe un'immagine ospitata, incompatibile col single-file). Documentato come limite noto; eventuale immagine futura è un follow-up.

## 5. Accessibilità (G6)

- **Focus visibile:** stile globale `:focus-visible { outline: 2px solid #6366f1; outline-offset: 2px; }` (e rimozione di eventuali `outline:none` problematici).
- **Skip-link:** un link "Salta al contenuto" come primo figlio del `<body>`, visibile solo al focus, che porta al primo `<section>` di contenuto.
- **Canvas decorativi:** `aria-hidden="true"` sui canvas dell'hero (`#hero-grid-bg`, `#hero-grid-cursor`, e `#hero-taxi` se presente) — sono decorativi.
- **Mini-canvas:** `role="img"` + `aria-label` descrittivo su ciascuno (es. "Circonferenza taxicab: un quadrato ruotato di 45°"), poiché sono illustrazioni informative.
- **Pulsanti-icona:** aggiungere `aria-label` (o `title`) ai pulsanti che usano solo emoji/simboli e ne sono privi (toggle snap, strumenti, drawer, ecc.).
- **Contrasti:** alzare il contrasto dei testi più tenui dove compromette la leggibilità (es. alcune `rgba(255,255,255,0.12)`), mantenendo l'estetica.
- **Tastiera:** verificare che la chrome del calcolatore sia operabile da tastiera (apri/chiudi; ESC chiude già); il bottone "Calcolatore Grafico" è già un `<button>`.
- `lang="it"` già presente; titoli `h1/h2` già strutturati.

## 6. Architettura

Tutto in `index.html`: markup (`<head>` meta + `data-tex` + attributi a11y), CSS (reduced-motion, focus-visible, skip-link, contrasti), e un piccolo `<script>` init per KaTeX. KaTeX è l'unica dipendenza esterna (CDN, con SRI e fallback).

## 7. Verifica

- **KaTeX:** con CDN raggiungibile, le formule HTML sono rese da KaTeX; **simulando il CDN irraggiungibile** (bloccando la richiesta nei devtools), restano le formule Unicode leggibili. Math su canvas invariata.
- **reduced-motion:** con `prefers-reduced-motion: reduce` (emulazione devtools), niente scorrimento animato della griglia hero, niente transizioni; il sito resta usabile.
- **Meta/OG:** ispezione nei devtools / anteprima di un validatore social: title/description/OG/twitter/theme-color presenti e corretti.
- **a11y:** navigazione completa da **tastiera** (Tab raggiunge skip-link, sezioni, bottoni; focus visibile ovunque; ESC chiude il calcolatore); uno **screen reader / checker** (es. axe) senza errori critici sui controlli; canvas decorativi non annunciati, mini-canvas annunciati con la label.
- Nessun errore in console; `ConicMath`/harness invariati.

## 8. Fuori scope

- `og:image` con immagine personalizzata (single-file).
- Accessibilità *completa* del canvas del calcolatore (intrinsecamente difficile per un'app canvas): ci si limita a label/chrome/tastiera ragionevoli.
- Migrazione delle equazioni su canvas a KaTeX (non possibile su canvas).
- Modifiche alla logica/matematica.

## 9. Vincoli

- KaTeX via CDN è l'**unica** eccezione al single-file (con SRI + degradazione graziosa). Nessun'altra libreria.
- Firme pubbliche di `ConicMath`/`GraphCalc` invariate.
- Nessuna regressione visiva o funzionale su hero/sezioni/calcolatore.
