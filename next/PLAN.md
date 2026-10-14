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
2. **Look.**
   - Part 1 (done, Oct 2026):
     - Code split into `src/` modules (data, sky, terrain, trees).
     - Sky light: a physical sky lighting the scene (PMREM), sun shadows, haze.
     - Turf and sand: the game's CC0 photo detail and normal maps (`assets/`), fading with distance; the hole's edge eased onto
       the surroundings.
     - Surroundings: the game's surroundings mesh and map texture out to the horizon (bare ground: the game's raised "canopy"
       stand-in for far woods read as mesas, so it is left out).
     - Trees: the game's species prototypes and placements (`treeGroups` in the export) with bark normal maps, the leaf atlas
       and back-lit leaves; far trees as crossed-card impostors baked at load.
     - Quality tiers (`?q=low|med|high`, Med on phones) and a frame-cost readout (JS ms; GPU ms where the browser reports it).
   - Part 2 (next):
     - Dense grass blades round the camera (rough and fescue), with wind.
     - Wind in the trees.
     - Distant forest silhouettes past the far trees; impostors that also work from above.
     - Mowing sheen, time-of-day presets.
     - Tune against phone numbers.
   - Data size: a hole's export is about 7 MB, mostly tree prototypes repeated per hole. They should become one file per course.
3. **Playable hole:** golfer, ball flight and the swing meter, driven by the shared core.
4. **Full course, then every course;** then decide when `next/` replaces the current game.

## How to work on it

- Export a hole: `NODE_PATH=$(npm root -g) node next/tools/export-hole.mjs troy 1` (needs Playwright + Chromium).
- Run locally: `python3 -m http.server` at the repo root, open `http://localhost:8000/next/`.
  `?c=<course>&h=<hole>` picks an exported hole; `?webgl=1` forces the WebGL2 backend; `?q=low|med|high` sets quality;
  `?view=tee|green|above` starts in a view; `?hide=hole,skirt,apron` hides ground meshes (debugging).
- Current game data the export depends on: `buildHole`, `buildHeights` (`h.hg`, `h.gg`), `h.lg` / `LIE_CODES`, `turfOf()`,
  `R3T.groups` (tree prototypes and placements), `h.farTrees`, `R3.skirt` / `R3.flat` / `SURR.tex` / `R3.GU.gSS` (surroundings),
  `demRel`. If those change shape, update the exporter and re-export.
