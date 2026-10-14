# Golf Go Next: plan

A more realistic version of Golf Go, built alongside the current game without disturbing it.

- The current game stays at the site root (`index.html`) and keeps getting fixes on `main`.
- The new version lives in `next/`, served at `…/golf-go/next/`. It is a prototype; it is not linked from the game.
- `sw.js` leaves every `next/` request to the network, so the offline cache never serves the old game in its place.
- `next/` uses its own browser-storage keys until we decide to share saves (career, bag) with the current game.

## Approach

- **Renderer:** three.js r170 `WebGPURenderer`, which falls back to WebGL2 where WebGPU isn't available, so it works on every phone the
  current game works on. Vendored in `next/vendor/` (no CDN, no build step); `index.html` maps `three`, `three/tsl` and
  `three/addons/` with an import map. Plain ES modules, so GitHub Pages serves it as is.
- **One game, two renderers:** physics, lies, wind, scoring, the meter and the course data must not be re-implemented in `next/`.
  - Now (milestone 1): `next/tools/export-hole.mjs` runs the current game headlessly and writes a hole's heights, surface map,
    shapes, pin and trees with the game's own code (`next/data/<course>/h<n>.json` + `.bin`). The renderer only draws that data.
  - Later: the game's core moves out of `index.html` into shared modules that both versions load, a step at a time. Each step is
    proven not to change the current game (same scripted shots, same results) before it ships; anything that can't be proven
    identical stays put.
- **Assets:** CC0 only (e.g. Poly Haven), so licensing stays simple.
- **Smoothness:** the frame-rate readout is in the prototype from day one; quality tiers come before anything ships to players.

## Milestones

1. **Scaffold** (done, Oct 2026): `next/` loads Troy Burne hole 1 from the exported data: terrain (1-yd mesh, 0.5-yd round the
   green), a surface texture painted from the surface map and shapes, water, pin, placeholder trees, sky, sun and shadows, free
   camera with tee / green / overhead views, fps readout. Service worker leaves `next/` alone.
2. **Look:** realistic sky and lighting (environment from the sky), real tree models in place of the placeholders, close-up turf
   and dense grass, bunker sand, water, and the surroundings past the hole (the game's DEM and wide ground) so trees and terrain
   run to the horizon. Quality tiers. Check on phones.
3. **Playable hole:** golfer, ball flight and the swing meter, driven by the shared core.
4. **Full course, then every course;** then decide when `next/` replaces the current game.

## How to work on it

- Export a hole: `NODE_PATH=$(npm root -g) node next/tools/export-hole.mjs troy 1` (needs Playwright + Chromium).
- Run locally: `python3 -m http.server` at the repo root, open `http://localhost:8000/next/`.
  `?c=<course>&h=<hole>` picks an exported hole; `?webgl=1` forces the WebGL2 backend.
- Current game data the export depends on: `buildHole`, `buildHeights` (`h.hg`, `h.gg`), `h.lg` / `LIE_CODES`, `turfOf()`,
  `R3T.list` and `h.farTrees`. If those change shape, update the exporter and re-export.
