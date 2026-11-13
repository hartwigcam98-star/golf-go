# Measured trees from the lidar (Nov 2026)

Every tree is measured from the USGS lidar point cloud instead of guessed from the aerial photo: where it stands (the
treetop), its height, its crown radius and the height of its lowest branches. Stored as `R3NAIP[<key>].L` in `trees.js`:
`n`, `xy` (Int16, half-yards, course frame), `r` (crown radius in tenths of a yard, +128 = conifer), `h` and `cb`
(height and crown base in quarter-yards). The game uses it on every course that has it (`tlOn()`); `?tl=0` shows the
old photo trees. A course with no `L` (no public lidar, e.g. Kings North) keeps its photo trees.

## Run it (one GitHub Actions job per course, in parallel)
1. **Course list.** With a harness page served (`pipeline/courses/test/mkharness.py`, e.g. on port 8766 as `_h.html`):
   `PORT=8766 PAGE=_h.html node dump.js /tmp/courses.json` (tree extent, bunkers, scenery for every course).
2. **Config.** Clone the USGS EPT index once (see `mkcfg.py`), then `python3 mkcfg.py /tmp/courses.json [key ...]`.
   It merges the courses into `cfg_trees.json`: transform to lon/lat (`naip/xf.json`, else the course origin), the box,
   the UTM zone, the EPT scans that cover it (newest first) and the bunker outlines. "NO LIDAR COVERAGE" = skip.
3. **Job.** Write `only.json` = `["key", ...]` (or `[]` for every course in the config) and push both files to the
   `trees-all` branch (from main):
   ```
   cd /home/claude/golf-go && git checkout -q -B trees-all origin/main && git add pipeline/courses/treelidar/cfg_trees.json pipeline/courses/treelidar/only.json
   git commit -qm "Measured trees: <keys>" && git push -qf origin trees-all && git checkout -q main
   ```
   `.github/workflows/trees.yml` runs `tree_all.py <key>` per course (~5–15 min each, 20 at a time) and pushes every
   course's `L.json`, `prev.jpg` and `summary.json` to the `trees-data` branch. Read it with
   `git clone -q --depth 1 -b trees-data https://github.com/hartwigcam98-star/golf-go /tmp/td`.
4. **Check** each course's `summary.json` (scan, points, `reg` = lidar-to-map shift found on the bunkers, crowns, kept,
   roofs, heights) and **look at** `prev.jpg` (a 300 m square: kept crowns red with height/base in metres, dropped blue).
5. **Insert:** `python3 insL.py /tmp/td [key ...]`, then `python3 tools/stamp.py`, test, commit `trees.js`.
   To change a filter without fetching again: edit `rules()` in `refilter.py`, run `python3 refilter.py /tmp/td [key ...]`
   (it rebuilds each `L.json` from the run's `crowns.npz`, every crown found with its stats), then insert again.
6. **Light:** a course's Blender light is baked with the trees it was exported with. `newcourse.sh export` now records
   which (`trees.txt`, then `b10/light/<key>/mt.json` and `mt:1` in `b10/bake.js`); the game uses the baked light only when it
   matches the trees shown, otherwise live shadows. So after new measured trees, re-run the Blender pass for the course:
   `bash pipeline/blender/rebake.sh [N] [key ...]` exports and bakes the next N courses still on old light (or the keys
   given) and pushes to main; it prints `REBAKE DONE` when none is left.

## What `tree_all.py` does
- **Scan:** the first candidate (newest first) with points and ground over the middle of the course.
- **Grids (UTM, 250 m tiles, PDAL `filters.hag_nn`):** 1 m canopy height (highest return above ground), 1 m ground, and a
  2 m × 32-bin profile of returns by height above ground.
- **Photo:** NAIP (TNM service, USDA PRIME as fallback) resampled onto the same grid.
- **Registration:** the shift (±6 m) that sinks the mapped bunkers deepest into the lidar ground (as `lidar2/register.py`).
  Positions go onto the course map minus that shift.
- **Crowns:** treetops (variable-window maxima on the closed, smoothed canopy) and watershed crowns, each cut at
  1.2 + 0.32 h m from its top and below 35% of its height.
  - Height = the crown's maximum.
  - Crown radius = √(area/π).
  - Crown base = the height below which 8% of the crown's returns over 2 m lie (at most 0.7 h).
- **Stray returns:** a 1 m cell's top is capped 1 m above the highest 3-m band of its 2-m column holding 3+ returns
  (31 m and up only when the crown reaches it without a gap), so birds and haze can't make 40 m "trees".
- **Clutter** (`"clutter": 1` in the config; Dacotah only so far): drops crowns with fewer than 2 returns over 2 m per m²
  and holds a crown's top to 2 m over 99% of its returns. Dacotah's 2023 scan has bands of stray returns at 20–35 m across
  fields and fairways; they made about 1,580 thin "trees" (a handful of returns high up over bare ground, against a median
  of 18/m² in a real crown, even leaf-off). The run also saves `dens` and `h99` per crown in `crowns.npz`, and
  `"diag": 1` saves the grids (`grids.npz`, with the uncapped canopy and the photo) to re-find crowns offline.
- **Filters:**
  - roofs: photo greenness under 0.06 (0 on desert courses), not dark, and smooth (sd < 1.5 m); or a flat top
    (sd < 0.45 m) over 40 m²;
  - open water: no ground return within 8 m and not green in the photo;
  - specks under 8 m² and anything under 3 m.
- **Conifer:** dark and blue in the photo.

## Game (src)
- `r3NaipLoad` / `r3NaipApply`: the measured list replaces the photo list; `t.r` = crown radius, `t.mh` height, `t.mb` base.
- `r3TreeFlush`: living versions only (no snags). Each version is re-shaped to the nearest of five crown-base shares
  (`R3T_BK`, `r3tWarp`):
  - the trunk stretches;
  - leaf cards move whole, by their lowest corner;
  - brush at the foot goes.
- The version is then scaled to the real crown radius and height, and its crown is not trimmed back from the fairway.
- `r3tFarBuild`: far cards sized from the measurements. Ball: `top = t.mh`; the crown it meets is the drawn one (`treeCrown`).

## All courses (Nov 4 2026)
56 of 57 course data sets measured (Kings North: no public lidar). Heights typically 8–25 yd (10th–90th percentile)
in Minnesota/Wisconsin, 12–33 yd in Alabama/Georgia/South Carolina, 4–12 yd on the Arizona desert courses.

## First run: Troy Burne (Nov 4 2026)
- 21,617 crowns found and 20,568 kept (1,011 roofs, 55 specks).
- Heights 8.9 / 17.7 / 24.7 yd (10th / 50th / 90th percentile); crown radius 3.2 / 4.9 / 6.9 yd; conifers 7%.
- The old photo list had 68,292 discs capped at 7.5 yd, many of them on lawns and roofs.
- Scan: WI_StWide_4_StCroix_2021 (spring 2021, leaf-off).
