// Costruisce un unico index.html che incapsula le 5 bozze del CALCOLATORE (iframe srcdoc) + barra di navigazione.
const fs = require('fs');
const path = require('path');
const dir = __dirname;

const files = [
  ['c1', 'calc-1-editoriale.html',    '01 · Editoriale'],
  ['c2', 'calc-2-brutalista.html',    '02 · Brutalista'],
  ['c3', 'calc-3-tecnico-sepia.html', '03 · Tecnico seppia'],
  ['c4', 'calc-4-crt-ambra.html',     '04 · CRT ambra'],
  ['c5', 'calc-5-organico.html',      '05 · Organico'],
];

let embed = 'window.__BOZZE={};\n';
for (const [id, fn] of files) {
  const html = fs.readFileSync(path.join(dir, fn), 'utf8');
  // JSON.stringify => stringa JS valida; poi neutralizza eventuali </script> interni
  const js = JSON.stringify(html).replace(/<\/script/gi, '<\\/script');
  embed += `window.__BOZZE[${JSON.stringify(id)}]=${js};\n`;
}

const pagesJson = JSON.stringify(files.map(([id, , name]) => [id, name]));

const out = `<!doctype html>
<html lang="it">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<title>Calcolatore Grafico — 5 bozze di design</title>
<style>
  :root { --bar: 56px; }
  * { box-sizing: border-box; }
  html, body { margin: 0; height: 100%; background: #0b0b0c; }
  #stage { position: fixed; inset: 0 0 var(--bar) 0; width: 100%; height: calc(100vh - var(--bar)); border: 0; display: block; background: #fff; }
  #bar {
    position: fixed; left: 0; right: 0; bottom: 0; height: var(--bar); z-index: 10;
    display: flex; align-items: center; gap: 14px; padding: 0 14px;
    background: rgba(11,11,12,0.94); border-top: 1px solid #29292c; color: #d7d7da;
    font: 12px/1 'IBM Plex Mono', ui-monospace, monospace; letter-spacing: 0.03em;
  }
  #bar button { appearance: none; cursor: pointer; font: inherit; }
  .nav-btn { background: transparent; border: 1px solid #36363c; color: #d7d7da; width: 32px; height: 32px; border-radius: 7px; font-size: 14px; line-height: 1; }
  .nav-btn:hover { border-color: #6e6e76; color: #fff; }
  #label { min-width: 200px; }
  #label b { color: #fff; font-weight: 600; }
  #dots { display: flex; gap: 6px; margin-left: auto; }
  #dots button { background: transparent; border: 1px solid #36363c; color: #9a9aa0; min-width: 28px; height: 28px; border-radius: 7px; }
  #dots button:hover { border-color: #6e6e76; color: #fff; }
  #dots button.active { background: #ececef; color: #0b0b0c; border-color: #ececef; }
  #hint { color: #6a6a72; margin-left: 6px; }
  @media (max-width: 680px) { #label { min-width: 0; } #hint { display: none; } }
</style>
</head>
<body>
  <iframe id="stage" title="Anteprima bozza calcolatore"></iframe>
  <nav id="bar" aria-label="Navigazione fra le bozze del calcolatore">
    <button class="nav-btn" id="prev" aria-label="Bozza precedente">&#9664;</button>
    <span id="label"></span>
    <span id="dots"></span>
    <button class="nav-btn" id="next" aria-label="Bozza successiva">&#9654;</button>
    <span id="hint">&larr; &rarr; o 1&ndash;5</span>
  </nav>
  <script>${embed}</script>
  <script>
    const PAGES = ${pagesJson};
    const stage = document.getElementById('stage');
    const label = document.getElementById('label');
    const dots = document.getElementById('dots');
    let cur = 0;
    PAGES.forEach((p, i) => {
      const b = document.createElement('button');
      b.type = 'button'; b.textContent = String(i + 1);
      b.setAttribute('aria-label', 'Vai alla ' + p[1]);
      b.addEventListener('click', () => load(i));
      dots.appendChild(b);
    });
    function load(i) {
      cur = (i + PAGES.length) % PAGES.length;
      stage.srcdoc = window.__BOZZE[PAGES[cur][0]];
      label.innerHTML = 'Calcolatore <b>' + PAGES[cur][1] + '</b>';
      [...dots.children].forEach((d, j) => d.classList.toggle('active', j === cur));
      try { location.hash = String(cur + 1); } catch (e) {}
    }
    document.getElementById('prev').addEventListener('click', () => load(cur - 1));
    document.getElementById('next').addEventListener('click', () => load(cur + 1));
    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft') load(cur - 1);
      else if (e.key === 'ArrowRight') load(cur + 1);
      else if (e.key >= '1' && e.key <= '5') load(+e.key - 1);
    });
    const start = Math.max(0, Math.min(PAGES.length - 1, (parseInt(location.hash.slice(1), 10) || 1) - 1));
    load(start);
  </script>
</body>
</html>
`;

fs.writeFileSync(path.join(dir, 'index.html'), out, 'utf8');
console.log('Scritto calc/index.html (' + (out.length / 1024).toFixed(0) + ' KB)');
