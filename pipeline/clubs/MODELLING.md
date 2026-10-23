# Modelling a clubhouse from lidar (bk.py)

Used by the nightly course build (RUNBOOK step 6b) and by hand. CL = the working copy of this folder (`/home/claude/golf/clubs`).
The building is described as a small set of roof "blocks" in its own frame; the game draws walls, roofs, windows and posts from
them (`blockMass` in index.html) and colours them from the course's CLUBLOOK.

## Toolkit
Read the docstring at the top of CL/bk.py first (block types and conventions). Commands (run from CL):
- `python3 bk.py prep <cid>`: builds the building frame and writes CL/work/<cid>/: dsm.jpg (lidar heights in the frame, grid every 5 yd, labels every 10 yd; u is horizontal, v vertical, v increases downward), aspect.jpg (roof facets coloured by which way they slope, 1-yd contour lines), aerial.jpg (only for some Minnesota courses), facets.txt (the main roof planes with their extents in u/v and their height equations). It prints meta (building area, max height, ground range round it).
- write CL/work/<cid>/blocks.json, then `python3 bk.py fit <cid>`: least-squares refines your blocks (edges move at most 1 yd, `--free` allows 2 yd) and writes fit.json + fit.jpg (left: lidar, middle: your model, right: residual, red = model too high, blue = model too low) and prints median/rms error.
- `python3 bk.py show <cid> <file.json>` renders any blocks file against the lidar without fitting.
Heights are yards above the reference ground (the building's upper entrance level); ground beside the building may be lower (walkout levels) — the game runs walls down to the real ground automatically. Walls are drawn just inside each block's rectangle and topped by that block's roof line, so gable ends, hips and shed sides come out right automatically. Overlapping blocks are fine and expected: the visible roof is the highest block at each point (like the lidar's top surface), so cross wings, valleys and hips come from overlaps. The game also adds windows per storey, doors, the entry, patios and a flag by itself, so model only the massing.

## How to model each building
1. Run prep and look at dsm.jpg, aspect.jpg (and aerial.jpg if present) with the Read tool, and read facets.txt. Opposite facets meeting at a line are a gable or hip wing; facets on all four sides = hip; vertical triangle-free ends = gable. Low roofs running along a wall (often 3-4.5 yd high) are usually porches, verandas or covered patios; flat areas at floor level standing above lower ground are decks.
2. For context about what the real building looks like, use the course's clubhouse photos (`/home/claude/golf/run_extras/courseimg/<key>_club.jpg`, single photos in the folder of that name; from the extras job, RUNBOOK 4c) and the aerial crop. The lidar is the truth for shape and height; the photos tell you which parts are porches, towers, cupolas, etc.
3. Write blocks.json: as few blocks as describe the building well (typically 3-15, up to ~30 for big complex buildings). Use H/GU/GV/SU/SV/F/T. Flags: "o" open underneath (porch/veranda/porte-cochère/covered walk: drawn with posts instead of walls), "d" deck (flat floor with railing, open below). Chimneys, cupolas, towers, big dormers = T blocks (or small GU/GV blocks for dormers). Ignore trees (rough blobs, usually red/orange speckle in dsm.jpg; residual blobs that are trees can't be fixed and that's fine). Ignore separate neighbouring buildings (cart barns etc.) unless attached.
4. Fit, look at fit.jpg, fix what's wrong (missing wing, wrong roof type, wrong ridge height, a block that should be split), refit. Aim for median error ≤ 0.3 yd and no large coloured residual areas on the building itself. The median is easy to meet (it includes ground), so also run `python3 helpers/blobs.py <key> work/<key>/fit.json 0.8`: it lists residual patches over 0.8 yd; every big one on the roof (not a tree) must be explained or fixed. Use `--free` if edges are far off. Iterate as needed — accuracy matters, this is the point of the work.
5. When happy, copy fit.json to `CL/work/<key>/final.json` (that is the file `extras.py lid` and `mklid2.py` read), and write notes.txt there: one line per block saying what it is (e.g. "main two-storey hip", "front porch", "west wing gable"), the final error stats, and anything doubtful (e.g. "lidar is from 2017; building may have changed", "trees cover the east end", "wing at 30 degrees to the frame approximated by two blocks").
If a course's prep fails or finds no building (sedge and lido may be problems: their mask may have missed most of the building), look at the dsm image anyway; if the building is visible but the automatic mask missed it, you can still model it from dsm.jpg/facets by eye and fit — the fit uses all heights near the mask, not just the mask. If there really is nothing usable, write notes.txt saying so and skip final.json.

## Wings at an angle (parts)
A wing turned more than ~10 degrees from the main frame goes in `"parts":[{"du":U,"dv":V,"da":DEG,"blocks":[...]}]` beside "blocks":
(du,dv) is the part's origin in main-frame coordinates and da turns its u axis (+30 points it toward (+u,-v), -30 toward (+u,+v)).
fit and show handle parts; fit refines the part blocks but not du/dv/da, so try a few da values (helpers/pview.py prints heights in a part's frame).
Examples: models/pines (Y plan), models/legend (curved lodge as segments), models/lehman, models/mystic (octagon), models/interlachen.

## Rules the renderer applies (so you don't have to)
- A T block under 2.6 yd on its short side and 4.5 yd on its long side is drawn as a chimney (flat-capped stack in the chimney colour,
  at most 1.6 yd over the roof round it). A small cupola must carry flag `k` to stay a cupola (models/santee, models/wyboo).
  `bk.py fit` doesn't move T block edges much, so set their size by hand.
- Blocks hidden inside other blocks are fine: walls are drawn, but walls inside the building never show and get no windows.
  An `o` block running partly under a higher roof is fine too (its posts stand where it's open).
- Clocks: flag `c` on a T block puts clock faces on that tower; flag `c` on a GU/GV block puts a clock high in its gable ends
  (where they show). Without a `c` flag, the tallest T block at least 2.5 yd wide gets the clock when the CLUBLOOK has `clk`.
  Examples: models/legends (tower), models/edinburgh (gable).
- Verandas and porches must carry the "o" flag or they are drawn as solid walls (Oxmoor Valley's wrap-round veranda needed it).

## Reference models
models/<course>/final.json + notes.txt for the 39 clubhouses done on Oct 23 2026 (e.g. models/quarry: 2 blocks; models/caledonia:
11 blocks with a veranda; models/edinburgh: 30 blocks).

Helpers (run from CL): `helpers/blobs.py` (residual patches), `helpers/pview.py` (heights in a part's frame), `helpers/crop.py` (zoom into fit.jpg), `helpers/prof.py` (height profiles). `bk.py fit` output piped to `head` raises BrokenPipeError after fit.json is written; harmless.
