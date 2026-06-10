# Calcolatore: Undo/Redo + scorciatoie (C5) — design

**Data:** 2026-06-10
**File:** `index.html` (tutto in `GraphCalc`).
**Backlog:** voce C5 di `docs/ROADMAP_MIGLIORAMENTI.md`.
**Nota:** solo progettazione; implementazione in blocco con le altre feature.

## 0. Obiettivo

Aggiungere al calcolatore una **cronologia annulla/ripeti** degli oggetti, con pulsanti e scorciatoie da tastiera. Autosufficiente: gli oggetti sono già dati serializzabili, quindi gli snapshot sono cloni profondi di `state.objects` (nessuna dipendenza da altre feature).

## 1. Contesto del codice

- `GraphCalc.state.objects`: array di `{id,name,type,params,color,visible,opacity}` (params per tipo, con punti annidati `{x,y}` per asse/distanza). Tutti dati JSON-serializzabili.
- `state.nextId`, `state.selectedId`, `state.isolatedId`, `state.isOpen`.
- Azioni mutanti esistenti: `_createObject` (via `confirmValue` o `_placePendingPoint`), `deleteObject`, `clearAll`, `_setParam` (commit di coordinate/parametri, `onchange`), `_setParamQuiet` (live, `oninput`/drag — **non** commit), `_applyControlPointDrag` (drag live di un punto di controllo; il rilascio avviene in `_onMouseUp`), `setObjColor`, `renameObject`, `toggleVisible`, `setObjOpacity`. (Con le feature in coda: `loadPreset`, ripristino da URL.)
- `renderSidebar()` ricostruisce la sidebar; `_draw()` ridisegna; `open()`/`close()` aprono/chiudono l'overlay.

## 2. Modello di cronologia

- Stato in `GraphCalc`: `history = []` (array di **stringhe** `JSON.stringify(state.objects)`), `histIndex = -1`, `applyingHistory = false`. Cap: **`HISTORY_MAX = 50`**.
- `_snapshot()` → `JSON.stringify(state.objects)`.
- `_pushHistory()`:
  - se `applyingHistory` → return (nessuna voce durante un ripristino);
  - tronca le voci oltre `histIndex` (`history.length = histIndex+1`), accoda `_snapshot()`, `histIndex = history.length-1`;
  - se `history.length > HISTORY_MAX`, rimuove dalla testa e decrementa `histIndex`;
  - evita duplicati consecutivi: se lo snapshot è identico all'ultimo, non accoda.
- **Baseline:** all'`open()`, se la cronologia è vuota (o si vuole ripartire), `history=[]; histIndex=-1; _pushHistory()` registra lo stato iniziale (tipicamente scena vuota), così l'undo può tornarci.

## 3. Undo / Redo

- `_restoreSnapshot(s)`:
  - `applyingHistory = true`;
  - `state.objects = JSON.parse(s)` (clone profondo);
  - `state.nextId = max(0, ...ids) + 1`;
  - se `state.selectedId`/`state.isolatedId` non corrispondono più a un oggetto presente → azzerarli (e `showRegions=false` se isolamento perso); pulire `expandedIds` dalle voci non più esistenti;
  - `renderSidebar(); _draw();`
  - `applyingHistory = false`.
- `undo()`: se `histIndex > 0` → `histIndex--; _restoreSnapshot(history[histIndex]);`.
- `redo()`: se `histIndex < history.length-1` → `histIndex++; _restoreSnapshot(history[histIndex]);`.
- **Scope:** solo `state.objects`. `pan`/`scale` (vista) **non** vengono modificati dall'undo/redo (per non spostare la vista quando si annulla un'azione sul contenuto).

## 4. Punti di snapshot (azioni "commit")

`_pushHistory()` viene chiamato **dopo** ciascuna azione che modifica `state.objects`:
- creazione: `confirmValue` e il ramo di `_placePendingPoint` che chiama `_createObject` direttamente;
- `deleteObject`, `clearAll`;
- `_setParam` (commit di coordinate/parametri via `onchange`);
- **fine drag** di un punto di controllo/fuoco: in `_onMouseUp`, se in questo gesto era attivo `state.draggingPoint` (o il probe se presente), accodare uno snapshot;
- `setObjColor`, `renameObject`, `toggleVisible`, `setObjOpacity`;
- caricamento esempio/URL (`loadPreset`/`_applyState`, se presenti) — accodano dopo l'applicazione.
Il **live** (`_setParamQuiet`, `_applyControlPointDrag` durante il movimento) **non** accoda: si accoda solo al commit/rilascio, per non inondare la cronologia. La de-duplica (§2) evita voci ridondanti.

## 5. Scorciatoie da tastiera

- Listener `keydown` (su `window`) attivo **solo a calcolatore aperto** (`state.isOpen`); aggiunto in `open()`, rimosso in `close()`.
- Ignorato quando il focus è in un campo editabile: se `e.target` è `INPUT`/`TEXTAREA`/`SELECT` o `isContentEditable`, non intercettare (così il rinomina/equazione funzionano).
- Mappa: `Ctrl/Cmd+Z` (senza Shift) → `undo()`; `Ctrl/Cmd+Shift+Z` **o** `Ctrl+Y` → `redo()`; `Delete`/`Backspace` → elimina l'oggetto selezionato (`deleteObject(state.selectedId)` se presente). `preventDefault()` sugli eventi gestiti. (`Esc` resta gestito altrove per chiudere.)

## 6. UI

- Due pulsanti nella sezione "Strumenti" della sidebar: **↩ Annulla** (`onclick=GraphCalc.undo()`) e **↪ Ripeti** (`GraphCalc.redo()`), con `title` che indica la scorciatoia.
- **Disabilitati** quando non disponibili: `↩` disabilitato se `histIndex<=0`, `↪` se `histIndex>=history.length-1` (attributo `disabled` + stile attenuato). Lo stato si aggiorna a ogni `renderSidebar()`.

## 7. Architettura

Tutto in `GraphCalc`: stato `history/histIndex/applyingHistory/HISTORY_MAX`; funzioni `_snapshot/_pushHistory/_restoreSnapshot/undo/redo`; hook di `_pushHistory` nelle azioni mutanti (§4); handler tastiera in `open()`/`close()`; pulsanti in `renderSidebar()`; metodi pubblici `undo, redo`. Snapshot = cloni di dati puri (`state.objects`); nessuna dipendenza da `ConicMath` o da altre feature.

## 8. Verifica

Visiva/funzionale:
- creare/eliminare/spostare oggetti, cambiare parametri/colori → **Annulla** riporta allo stato precedente, **Ripeti** lo riapplica; la sequenza è coerente anche dopo più azioni;
- trascinando uno slider o un fuoco, la cronologia riceve **una** voce al rilascio, non una per frame;
- `Canc` elimina il selezionato; le scorciatoie non interferiscono mentre si scrive nel campo rinomina/equazione;
- i pulsanti ↩/↪ si **disabilitano** agli estremi della cronologia;
- la vista (pan/zoom) non cambia con undo/redo;
- nessuna regressione su creazione/T3/sonda/condivisione; nessun errore in console; `ConicMath`/harness invariati.

## 9. Fuori scope

- Undo della vista (pan/zoom): escluso per scelta (undo = contenuto).
- Persistenza della cronologia tra sessioni.
- Undo granulare durante il drag (si accoda solo al rilascio).

## 10. Vincoli

- Tutto in `GraphCalc`/inline; nessuna libreria.
- Firme pubbliche di `ConicMath` invariate; aggiunti `undo`, `redo` ai metodi pubblici di `GraphCalc`.
- Cap cronologia `HISTORY_MAX = 50`.
- Convive con sonda/condivisione/galleria (le loro azioni mutanti accodano uno snapshot).
