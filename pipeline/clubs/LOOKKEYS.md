# Golf Go clubhouse look keys (CLUBLOOK[courseId])

Each course's clubhouse is drawn from its footprint (or its lidar block model, CLUBLID) plus these look keys. With a lidar
model the massing keys (eh, rs, rp, gb, ga, ag, oct, dm, cu, tw, xg, eg, v, po, pc, bal) are ignored because the model
already has the real shape; colours, materials, `lo`/`lc`, the patio, `clk`, `ch` and `c` still apply. Units are yards (1 storey ≈ 3.1 yd).
Colours are '#rrggbb'. Omit a key to get the default.

## Walls
- `w` wall colour (required). `m` material: `siding` (lap lines) | `board` (board and batten) | `log` | `stone` (block coursing) | `stucco` (plain) | `tudor` (half-timbering, colour `tc`) | `brick` (fine courses).
- `t` trim colour: window frames, corner boards, eave band, porch posts if no `c`.
- `s` stone colour (plinth, chimneys if no `ch`, pillars, terrace walls). `b` plinth height (default 0.5; 1.4 for a tall stone base).
- `lo` height of a brick/stone ground storey, `lc` its colour (e.g. brick lower floor with siding above).
- `ar` arched openings in a raised ground storey: 'dark' or 'glass'.
- `sh` shutter colour beside each window. `aw` canvas awning colour over ground-floor windows.
- `wg` {w, m}: side wings in a different material from the main block.

## Size and roof (no lidar model only, except r)
- `eh` eave height (1 storey ≈ 3.5–4.5, 2 storeys ≈ 6.5–8, 3 ≈ 10). `rs` roof rise above the eave (steep manor 6–8, ordinary 3.5–5, low ranch 2–3). `rp` wing roof steepness cap (default 0.42; 0.55 steep).
- `r` roof colour. Slate ~#474c52, weathered shake ~#6b6a66, green metal ~#2f5a46, red ~#8b3a2b, white/silver metal ~#d0d3d1, brown shingle ~#5e4a3a.
- `gb` gable ends on the main wing, `ga` gables on every wing, `ag` A-frame wings with glass gable ends, `fl` flat roof with parapet, `oct` octagon.
- `dm` dormers per side (1–4). `cu` cupola (`cus` scale 1–2.2). `ch` chimney colour.
- `tw` tower height above the eave (`twc` colour, `clk` clock faces; with a lidar model `clk` puts the clock on the model's tower).

## Course-side and entry features (no lidar model only)
- `xg` tall cross gables on the course side (1–4); `xgw:'win'` window rows instead of tall glass; `xgt:0` no timbers; `xgc:1` clock in the middle gable.
- `eg` entry cross gable (half-width yd). `v` porch: 'front' | 'wrap' | 'none'; `c` porch post / column colour (also the posts under a lidar model's open blocks).
- `po` columned portico, `pc` porte-cochère (`pcc` post colour), `bal` second-storey iron balcony, `cbn` cart barn under a cross gable.

## Patio (always applies)
- `pt` patio floor on the course side: stone | brick | paver | deck | reddeck. Omit for no patio.
- `um` umbrella colours, comma list ('' = none). `fp` fire pits with Adirondack chairs.
- `rw` low stone wall / railing round it. `ph` raise it this many yd. `stp` steps down. `ir` black iron railing.

## How to choose (from the clubhouse photo set)
1. Colours and material first: sample by eye from sunlit walls, not shadow; real whites read about #efede6, avoid pure white.
2. Roof colour (`r`) from the photos (the aerial helps).
3. Signature features: clock (`clk`), patio floor, umbrellas, fire pits, railing.
4. Don't add features the real building doesn't have. If the photos don't clearly show the clubhouse, keep the default look (leave clublook out).
Examples: `CLUBLOOK` in index.html (every course has one), e.g. caledonia, legends, prestwick.
