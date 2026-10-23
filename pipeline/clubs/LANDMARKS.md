# Course feel and landmarks for a new course (CFEEL, CFEEL2)

Source: the course photo set from the extras job (`courseimg/<key>_course.jpg` + single photos), plus the aerial
(`auto/draw.py` crops). Write what you find into `pipeline/courses/extras/<key>.json` as `"cfeel"` and `"cfeel2"`.
Everything here is optional: when the photos don't clearly show something on THIS course, leave it out. A wrong landmark is
worse than none (the Oct 23 QA removed invented bridges, a windmill that wasn't there and two waterfalls).
Many photos in a set are of other places with the same name: ignore anything that doesn't match the course map or aerial.
Reference: the notes per course in the Golf Game project doc claude/course-landmarks.md, and CFEEL/CFEEL2 in index.html.

## CFEEL (water and bridges): `"cfeel": {"fo":n, "pe":"...", "br":"..."}`
- `fo`: number of spray fountains in ponds (0–3); fountains go into the largest ponds first. Only for fountains in ponds on
  the course (not a fountain in the entrance drive circle).
- `pe`: pond edge near greens and tees: `boulder` (rock rip-rap), `wall` (stacked stone or concrete walls), `timber`
  (wooden bulkheads). Omit for natural grass and reed banks (the default and the most common).
- `br`: cart bridge style: `stone`, `white` (white-railed), `grey` (weathered grey boardwalk), `truss` (steel truss).
  Omit for plain brown timber (the default).

## CFEEL2 (landmarks), course yards from the map; check every placement on the aerial
- `flw: {"tee"|"green"|"bridge"|"bank": "#colour"}`: flower beds (begonias behind tees or greens, azaleas at bridge ends or
  along banks) when photos show beds as a feature of the course.
- `rock: "granite"|"taconite"|"sandstone"`: rock outcrops and boulders in the rough (north woods, quarry or ledge country).
  `stone: 1`: an entrance boulder with the course name.
- `snag: [x, y]`: a dead white tree by a pond or green.
- `farm: [["silo"|"windmill"|"barn", x, y]]`; `barn: {"c":"#colour","at":[x,y],"L":5,"W":4.5,"eh":3.2}` (or `"fit":1` to
  replace a mapped building at that spot).
- `spans: [[x0,y0,x1,y1,"truss"|"grey",lift]]`: a real bridge that the map doesn't have, end to end over water or a road.
- `cov: [x, y]`: put a covered-bridge roof on the mapped bridge nearest that point.
- `gz: "gazebo"|"pavilion"`: auto-placed on a pond bank behind a green.
- `wf: [[x, y]]`, `wfS`: a waterfall at a bank point (it falls toward the nearest water). Only for a real, clearly
  photographed waterfall into a pond.
Don't use `mill`, `chateau`, `sign`, `tw`, `twMax`, `twBlock` or `marble`: they were made for one course each.

## Check
After `clubs/extras.py apply`, render each landmark from the course (the harness on port 8766):
`PORT=8766 node clubs/render/lmshot.js '[["<key>",x,y,45,8,"lm1"]]' /tmp/lm` and Read the picture. It must stand on dry
ground (or span water for a bridge), out of the line of play, and look like the photos. Fix or drop anything that doesn't.
