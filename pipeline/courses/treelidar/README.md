# Measured trees from the lidar (Nov 2026, Troy Burne first, test link `?tl=1`)

Each tree is measured from the USGS lidar point cloud instead of guessed from the photo: where it stands (the treetop),
its height, its crown radius and the height of its lowest branches. Stored as `R3NAIP[<course>].L` in `trees.js`:
`n`, `xy` (Int16, half-yards, course frame), `r` (crown radius in tenths of a yard, +128 = conifer), `h` and `cb`
(height and crown base in quarter-yards). Without `?tl=1` the game ignores it.

## Steps (run from a scratch folder; scripts expect `data/` = the lidar run, `nd/` = the photo run)
1. **Lidar job.** Set the course in `JOB` in `tree_job.py` (EPT project = the course's newest scan, from the old
   `lidar-data` summary; EPSG of its UTM zone; lon/lat box round the course's tree extent `R3NAIP[id].ext`).
   On a branch, copy it to `lidar job.py` and `fetch_tree.yml` over `.github/workflows/fetch.yml` (it pushes to the
   `tree-lidar-data` branch, not `course-data`). About 3 minutes for Troy (96 tiles, 30 M points). Output
   `trees_<key>.npz`: `chm` (1 m, highest return above ground, dm), `gnd`, `prof` (2 m cells x 32 one-metre
   height-above-ground bins, return counts).
2. **Photo job.** `naip_job.py` the same way (two halves of the box). Clone `tree-lidar-data` again into `nd/`
   (each run replaces the branch, so keep the lidar files first).
3. `python3 seg.py`: treetops (variable-window maxima on the closed, smoothed canopy), crowns (watershed, cut at
   1.2 + 0.32 h m from the top and below 35% of its height), height = crown max, crown base = the height below which
   8% of the crown's returns over 2 m lie (capped at 0.7 h). Positions go to the course map with the lidar
   registration (`lidar2/regshift.json`).
4. `python3 build.py`: photo stats per crown (greenness, brightness, blue-red).
5. `python3 enc.py`: drops roofs (photo greenness < 0.06), specks (< 8 m²) and anything under 3 m; conifer = dark and
   blue in the photo; writes `L_<key>.json`. Paste it into the course's `R3NAIP` entry as `"L":{...}`.
6. Check with `prev2.py row col size out.png` (photo with the crowns, height/base labels; blue = dropped).

## Game (all gated by `tlOn()`)
- `r3NaipLoad` / `r3NaipApply`: the measured list instead of the photo list; `t.r` = crown radius, `t.mh`, `t.mb`.
- `r3TreeFlush`: living versions only; each version re-shaped to the nearest of five crown-base shares
  (`R3T_BK`, `r3tWarp`: trunk stretches, crown squeezes, brush at the foot removed, leaf cards move whole);
  scaled to the real crown radius and height, not trimmed back from the fairway.
- `r3tFarBuild`: far cards sized from the measurements. Ball: `top = t.mh`; the crown it meets is the drawn one.
- `b10K()` returns nothing on the trial, so the trees cast live shadows (the baked maps are of the old trees).

## Troy Burne numbers
21,617 crowns found, 20,568 kept (1,011 roofs, 55 specks). Heights 8.9 / 17.7 / 24.7 yd (10th/50th/90th pct),
crown radius 3.2 / 4.9 / 6.9 yd, conifers 7%. The photo list had 68,292 discs capped at 7.5 yd, many on lawns and roofs.
Scan: WI_StWide_4_StCroix_2021 (spring 2021, leaf-off).
