# Blender pass for a course (pipeline/blender)

Every course in the game gets the Blender upgrade (shipped Oct 24 2026). For a new course this runs **after the course is live**
(RUNBOOK step 7b). It never blocks a course: anything that fails here is simply left out, and the game falls back to its
normal look for that part.

| Part | Where it ends up | How |
|---|---|---|
| Trees and leaves | `b10/trees.js`, `b10/leaves.webp` (shared, by species) | automatic: nothing to do per course |
| Clubhouse | `b10/club/<key>.js` | the game's own clubhouse (CLUBLID/CLUBLOOK, porches, terrace, stairs, plantings) captured from its **home hole**, window frames added, sky light baked in Cycles |
| Baked light | `b10/light/<key>/hNN.webp` + `bounds.json` → `b10/bake.js` | each hole's ground, trees and buildings baked in Cycles: R = sun visibility (real tree and building shadows), G = sky light |
| Before/after card | `blender/index.html`, `blender/img/<key>_{before,after}.jpg`, `blender/gallery.json` | the same camera with `?b10=0` (before) and without (now) |

Blender (4.2) runs on GitHub Actions on the **blender-club** branch (`.github/workflows/blenderclub.yml`; every push there
starts a run, so tool-only pushes say `[skip ci]`). `matrix.json` lists the jobs: `club:<key>` and `<key>/hNN:sun|sky`.
Hole scenes travel on the **bakedata** branch; each job pushes its result to its own `bake-…` branch, which is fetched and deleted.

## Steps
```
P=/home/claude/golf-go/pipeline/blender
bash $P/newcourse.sh setup                      # clones blender-club to /home/claude/bc
bash $P/newcourse.sh export <key> [key2]        # ~10-15 min a course (run in the background)
bash $P/newcourse.sh bake <key> [key2]          # one Actions run for both courses, ~30-60 min (background)
bash $P/newcourse.sh cand <key> [key2]          # 3 candidate views per course + /home/claude/b10work/shots/sheet_<keys>.jpg
#   Read the sheet and pick the most appealing view per course: the clubhouse clear and well framed, with the course
#   (green, water, trees) round it. Avoid views blocked by trees or with another building filling the foreground.
bash $P/newcourse.sh shoot <key>=<n> [key2=<n>] # before + after from that view, adds the card to blender/index.html
```
Then Read `/home/claude/b10work/shots/<key>_before.png` and `<key>_after.png`, and commit
`b10/ blender/ index.html` to main ("Blender pass: <name>") and push.

## Checks
- `export` prints `home hole N`, `errors []` and `18 holes exported` (or the course's hole count). No clubhouse found →
  no clubhouse bake (fine for a course whose clubhouse isn't modelled).
- `bake` prints `completed success`, then `<key>: 18 light maps, clubhouse yes`.
- The after picture shows the clubhouse standing on the ground with its terrace, stairs and umbrellas on the same side as
  in the before picture (they face the home hole), and the ground with soft shading and tree shadows.
  Swiftshader draws faint diagonal hatching and a square golfer shadow: that's the headless renderer, not the game.
- If the clubhouse looks wrong in the after picture: `git rm b10/club/<key>.js`, re-run `mkbake.py`, and say so in the report.
  If the light bake failed: remove `b10/light/<key>/` and re-run `mkbake.py`; the course plays with live shadows.

## Files
- `newcourse.sh` the steps above. Env: `GG` (golf-go clone), `BC` (blender-club clone), `W` (work dir), `PORT` (default 8767).
- `mkhook.py` the local copy of the game with test hooks (`__ev`, clubhouse capture `__CT`).
- `run.js`, `grab.js`, `export_guard.js` the headless step runner, clubhouse capture and hole-scene export.
- `prep_club.py` (window frames, ground for the bake), `packclub.py`, `packcourse.py`, `combine.py` (sun + sky → WebP), `mkbake.py`.
- `gal.js`, `sheet.py`, `mkgal.py`, `gallery_tpl.html` the before/after gallery.
- On blender-club: `bake.py` (hole light), `club_bake.py` (clubhouse sky light), `treegen.py`/`bake_trees.py`/`leafsheet.py` (the shared trees).

## Gotchas
- The clubhouse's terrace side faces whichever hole is being played in the old game. The Blender copy is fixed, so it is
  captured on the home hole (the hole whose line runs closest to it), which is also where it is seen most.
- `b10/club_ver.json` bumps a clubhouse's `?v=` when it is rebuilt; `mkbake.py` writes it into `bake.js`.
- Bump `b10/bake.js?v=` in index.html whenever bake.js changes (`bake` does it).
- Don't run two `bake`s at once from the same clone.
