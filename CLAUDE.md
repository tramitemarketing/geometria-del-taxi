# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project overview

"Geometria del Taxi" is an Italian-language educational web page about taxicab geometry (L₁ / Manhattan metric). It presents the theory and interactive visualizations of taxicab conics: circle, ellipse, hyperbola, and parabola.

## Running the project

Open `index.html` directly in a browser — no build step, no server, no dependencies. Everything is self-contained in that single file.

To run the built-in math tests, open the browser console and call:
```js
ConicMath.runTests()
```

## Architecture

The entire app lives in `index.html` (root of repo) as inline HTML, CSS, and JS. The JS is organized into four IIFE modules that expose a global object each:

### `ConicMath`
Pure math layer — no DOM, no canvas. Returns vertex arrays for each conic type:
- `circleVertices(xc, yc, R)` → 4 vertices (N/E/S/W diamond)
- `ellipseVertices(x1, y1, x2, y2, twoA)` → 4–8 vertex polygon, or `null` if invalid
- `hyperbolaVertices(x1, y1, x2, y2, twoA)` → `{ branch1, branch2 }` each as `[{x,y}]`, or `null`
- `parabolaSegments(xF, yF, k, yExtent)` → array of 4 `{ from, to }` segments
- `runTests()` → `console.assert`-based self-tests

### `MiniEngine`
Canvas rendering utilities + factory for the small inline canvases shown alongside each academic section. Key functions: `makeTransform`, `drawGrid`, `drawPoint`, `drawPolyline`, `drawSegment`, `create(canvasId, conicType, defaultParams, outputEl)`.

Each mini-engine uses `IntersectionObserver` for lazy initialization and is connected to `<input type=range>` sliders via `updateParam(key, val)`.

### `MainEngine`
The full interactive canvas in the `#esplora` section. Supports pan (drag), zoom (scroll wheel, touch), and toggling/layering all four conics simultaneously. State held in a single `state` object. Panel toggle logic: inactive → active+open → active+closed → inactive.

### `Hero`
Two-layer animated grid in the hero section. One layer scrolls continuously; the other is masked to a radial gradient that follows the cursor. Paused via `IntersectionObserver` when scrolled away.

## Key design constraints

- **No absolute positioning of conics** — all shapes are derived algebraically from the 9-region method (critical lines partition the plane, moduli are expanded per region). Any change to conic rendering should preserve this approach.
- **World-to-canvas transform** — `makeTransform` centers the view on `(cx, cy)` with a given `scale`. All drawing uses world coordinates; the transform handles flipping the y-axis.
- **Coordinate system** — canvas y increases downward, world y increases upward. The transform handles this inversion; `ConicMath` works in standard math coordinates.

## Older version

`calcolatore grafico old/index.html` is a previous prototype (dark theme, input-field UI, no academic sections). It is kept for reference only.
