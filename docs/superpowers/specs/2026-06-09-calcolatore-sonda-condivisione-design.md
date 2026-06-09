# Calcolatore: Sonda P + Condivisione + Export PNG + Galleria — design

**Data:** 2026-06-09
**File:** `index.html` (unico file; solo `<script>` + markup/CSS inline).
**Backlog:** voci C2 (sonda P), C3 (condivisione URL + export), C4 (galleria) di `docs/ROADMAP_MIGLIORAMENTI.md`.
**Nota:** solo progettazione; implementazione in blocco con le altre feature.

## 0. Obiettivo

Quattro potenziamenti del calcolatore, attorno a un modello di stato comune:
1. **Sonda P** — un punto posizionabile che mostra le sue relazioni taxicab con **tutti** gli oggetti.
2. **Condivisione via URL** — stato della scena serializzato nell'hash, link condivisibile.
3. **Export PNG** — salva la scena come immagine.
4. **Galleria esempi** — scene precaricate, caricate con lo stesso meccanismo della condivisione.

## 1. Contesto del codice

`GraphCalc.state` (≈ riga 1760): `{ objects:[{id,name,type,params,color,visible,opacity}], nextId, pan:{x,y}, scale, snap, selectedId, isolatedId, mode, mouseWorld, showRegions, ... }`. params per tipo: asse/distanza `{p1:{x,y},p2:{x,y},showBisector?}`; circonferenza `{xc,yc,R}`; ellisse/iperbole `{x1,y1,x2,y2,twoA}`; parabola `{xF,yF,m,q,vertical}`; luogo `{equation}`.
- Sidebar renderizzata da `renderSidebar()` in `#calc-sidebar.innerHTML` (sezioni: header, snap+clear, crea oggetto, lista oggetti). I pulsanti chiamano `GraphCalc.*`.
- Canvas `#calc-canvas` (DPR-scalato); `_draw()` ridisegna; `toWorld/toCanvas` via il transform corrente.
- `open()`/`close()` aprono/chiudono l'overlay; `open()` è il punto giusto per il ripristino-da-URL.
- Helper geometrici già disponibili: `ConicMath.taxiDist`, `ConicMath.l1Corner`.

## 2. Modello di (de)serializzazione (condiviso)

Funzioni in `GraphCalc` (riusate da condivisione, ripristino-URL e galleria):
- `_serializeState()` → `{ v:1, objects: state.objects.map(o=>({name,type,params,color,visible,opacity})), view:{pan:{...},scale}, snap }`. (Si omettono gli `id`: vengono riassegnati al caricamento.)
- `_encode(data)` → base64 UTF-8-safe: `btoa(unescape(encodeURIComponent(JSON.stringify(data))))`.
- `_decode(str)` → `JSON.parse(decodeURIComponent(escape(atob(str))))` dentro try/catch (ritorna `null` se invalido).
- `_applyState(data)` → svuota e ricostruisce `state.objects` (riassegnando `id = nextId++` e ripristinando params/colore/visible/opacity), ripristina `pan/scale/snap`, azzera `selectedId/isolatedId/probe/showRegions`, poi `renderSidebar()` + `_draw()`. Validazione difensiva: ignora oggetti con `type` sconosciuto o params mancanti.

## 3. Sonda P (verso tutti gli oggetti)

- **Stato:** `state.probe = {x,y} | null`, `state.probeActive = false`.
- **UI:** toggle "🔍 Sonda" in una nuova sezione della sidebar. Quando attiva, il calcolatore entra in una modalità in cui il **clic** su canvas posiziona/sposta P (P è **trascinabile**; snap alla griglia se `state.snap`). Mouse+touch (riusa la gestione puntatore esistente del canvas).
- **Calcolo per oggetto** (la grandezza caratteristica valutata in P, con esito **dentro ● / sul bordo ◉ / fuori ○** secondo il segno, soglia bordo `|v|<ε`):
  - circonferenza: `v = taxiDist(P,C) − R`;
  - ellisse: `v = taxiDist(P,F₁)+taxiDist(P,F₂) − 2a`;
  - iperbole: `v = |taxiDist(P,F₁)−taxiDist(P,F₂)| − 2a` (mostra il valore; "sul bordo" se ≈0);
  - parabola: `v = taxiDist(P,F) − dDir(P)` con `dDir = |a·x+b·y+c|/(|a|+|b|)`;
  - asse: `v = taxiDist(P,P₁) − taxiDist(P,P₂)` (segno = punto più vicino; ≈0 sull'asse);
  - luogo: `v = f(P) − g(P)` (valutando l'equazione; ≈0 sulla curva);
  - distanza: esclusa dalla sonda (non è un luogo).
- **Readout (sidebar):** una riga per oggetto con pallino-colore, nome, il valore numerico (2 decimali) e il glifo di esito. Aggiornata mentre P si muove.
- **Canvas:** P disegnato come pallino bianco evidenziato; da P una **scaletta L₁** sottile (`P → l1Corner(P,E) → E`) all'elemento di riferimento `E` di ogni oggetto (centro per la circonferenza; fuoco più vicino per ellisse/iperbole; fuoco per la parabola; entrambi i punti per l'asse), nel **colore dell'oggetto** a bassa opacità.
- **Complementarità con T3:** la sonda mostra *distanze e dentro/fuori* su tutti gli oggetti; T3 resta per *regione + equazione sciolta* su hover dell'oggetto isolato. Nessuna sovrapposizione di responsabilità.

## 4. Condivisione via URL

- Pulsante "🔗 Condividi": `link = location.origin + location.pathname + '#calc=' + _encode(_serializeState())`; `navigator.clipboard.writeText(link)` → toast "Link copiato!" (fallback: aggiorna `location.hash` e mostra il toast). Aggiorna anche `location.hash` per riflettere lo stato corrente.
- **Ripristino:** in `open()` (e all'avvio se il calcolatore è già aperto), se `location.hash` inizia con `#calc=`, `const data=_decode(hash.slice(6)); if(data) _applyState(data);`. Hash assente/invalido → nessuna azione (scena vuota normale).
- Toast: piccolo elemento temporaneo (CSS inline) in basso al centro dell'overlay, auto-nascosto dopo ~1.8s.

## 5. Export PNG

- Pulsante "📷 PNG":
  1. salva `state.mouseWorld`/`state.probe`/`state.showRegions`, li azzera temporaneamente e `_draw()` (così non si esportano overlay di hover/sonda);
  2. **compositing su canvas offscreen** (robusto rispetto allo sfondo trasparente di `_draw`): `const off=document.createElement('canvas'); off.width=canvas.width; off.height=canvas.height; const oc=off.getContext('2d'); oc.fillStyle='#050505'; oc.fillRect(0,0,off.width,off.height); oc.drawImage(canvas,0,0);`
  3. `const a=document.createElement('a'); a.href=off.toDataURL('image/png'); a.download='geometria-taxi.png'; a.click();`
  4. ripristina lo stato salvato e `_draw()`.
- Esporta alla risoluzione corrente del canvas (DPR incluso).

## 6. Galleria esempi

- Pulsante "📂 Esempi" → pannello (lista inline espandibile nella sidebar) con ~5 voci. Ogni voce è un oggetto-dati nello **stesso formato** di `_serializeState()`:
  - "Ellisse ottagono" (fuochi obliqui, 2a grande);
  - "Iperbole verticale" (fuochi su asse verticale);
  - "Parabola obliqua" (direttrice obliqua);
  - "Asse obliquo" (due punti generici);
  - "Le coniche a confronto" (più oggetti insieme).
- Click su una voce → se `state.objects.length>0` chiede conferma ("Sostituire la scena corrente?"), poi `_applyState(preset)`.
- I preset sono definiti come costanti dati in `GraphCalc` (array di `{name, data}`), così il caricamento riusa esattamente `_applyState`.

## 7. Architettura

- **Serializzazione:** `_serializeState`/`_encode`/`_decode`/`_applyState` — unico punto di verità per condivisione, URL e galleria.
- **Sonda:** stato `probe/probeActive`; toggle + handler puntatore (posiziona/trascina P) integrati nella gestione esistente del canvas; `_drawProbe(ctx,t)` chiamato in coda a `_draw()`; readout costruito in `renderSidebar()`.
- **UI sidebar:** nuova sezione "Strumenti" con i pulsanti 🔍 Sonda, 🔗 Condividi, 📷 PNG, 📂 Esempi (e il pannello galleria / readout sonda quando attivi).
- **Toast + download:** utility minime inline.
- Geometria riusata: `taxiDist`, `l1Corner`. Nessuna nuova funzione in `ConicMath`.

## 8. Verifica

- **Round-trip condivisione/galleria (chiave):** costruire una scena, "Condividi", ricaricare la pagina con l'hash → scena **identica** (oggetti, params, view); caricare ogni preset della galleria → scena attesa; hash corrotto → ignorato senza errori.
- **Export PNG:** il file scaricato si apre, ha sfondo scuro, mostra la scena senza overlay di hover/sonda.
- **Sonda:** posizionare P in punti noti → valori `v` e esito dentro/bordo/fuori corretti per ogni tipo; scalette color-coded coerenti; trascinamento fluido mouse+touch.
- **Visiva:** nessun errore in console; sidebar e canvas coerenti; T3 e il resto del calcolatore invariati.
- *(Quasi tutto è IO/DOM/rendering: il round-trip è la verifica principale. `_encode`/`_decode` sono pure e banali; se serve, si può fare un check manuale in console — `_decode(_encode(x))` deep-equal a `x`.)*

## 9. Fuori scope

- Persistenza lato server / account.
- Sonda su "distanza"; T3 (overlay regioni) non viene toccato.
- Compressione avanzata dell'URL (base64 di JSON è sufficiente; se un URL risultasse troppo lungo è un limite accettabile per scene grandi).
- Modifica della matematica delle coniche.

## 10. Vincoli

- Tutto inline in `index.html`; nessuna libreria/file esterno.
- Firme pubbliche di `ConicMath` invariate (la feature è tutta in `GraphCalc`/UI).
- Mouse + touch via pointer events; nessuna regressione su creazione/oggetti/T3 esistenti.
