# Golf Go: building a requested course (nightly auto-build)

This folder (`pipeline/courses/` in the repo) is the whole course pipeline. Players ask for courses with the in-game
"Request a course" form; each request is a feedback note (kind `course`, message `[Request] <course> — <town>`, `ctx.request`).
The nightly task builds **at most two** courses per night (from two different players) and ships each one only if every check passes.
Each course is made the way hand-built courses are: playable course first (steps 1–6), then its clubhouse measured from the
lidar survey and dressed from photos, and its landmarks (steps 4c and 6b).

## 0. Setup (fresh session)
```
cd /home/claude/golf-go && git pull -q origin main
rm -rf /home/claude/golf && cp -r pipeline/courses /home/claude/golf && mkdir -p /home/claude/golf/{lidar2/data,lidar,work/base,work/test}
cp -r pipeline/clubs /home/claude/golf/clubs && mkdir -p /home/claude/golf/clubs/{data,work}
cd /home/claude/golf && [ -f lidar/game_greens.json ] || echo '{}' > lidar/game_greens.json; [ -f lidar2/cfg.json ] || echo '{}' > lidar2/cfg.json; [ -f lidar2/data/summary.json ] || echo '{"dem":{}}' > lidar2/data/summary.json
pip install --break-system-packages -q opencv-python-headless scipy scikit-image 2>/dev/null
```
Run lidar steps (`lidar2/*`, `sc3/soften.py`, `auto/build_wide.py`, `auto/trees.py`, `auto/setup_lidar.py`) **from /home/claude/golf**.
Run `auto/build_course.py` and `auto/consts.py` **inside /home/claude/golf/auto/<key>/**.
`gh api` REST routes work; GraphQL gh commands are blocked. Background servers die between tool calls: start
`python3 -m http.server` in the same command as the test that uses it.

## 1. Pick the request
- Refresh feedback: `gh api -X POST repos/hartwigcam98-star/golf-go/actions/workflows/feedback.yml/dispatches -f ref=main`, poll
  `gh run list --repo hartwigcam98-star/golf-go --workflow feedback.yml -L 1` until done, `git fetch origin feedback`.
  Notes are `NNNNN/note.json` on that branch (`git show origin/feedback:NNNNN/note.json`).
- Requests = notes with kind `course` and a message starting `[Request]`. State lives in `pipeline/courses/requests.json`
  (`{"<note id>": {"status": "built|skipped|failed|duplicate", "key":..., "why":..., "date":...}}`). Ignore notes already in it.
- Order: the course asked for by the most players first (group requests that are clearly the same course), then oldest.
  One request per player at a time (player_id): only a player's oldest unhandled request is considered; their later
  requests wait (don't record them) until that one is built, skipped or failed. The game also blocks a second request while
  one is waiting (client-side, 14-day expiry), so this is the server-side backstop.
- **Skip** (record status `skipped` + why, no build): not a real golf course; outside the lower 48 US states; private club
  (say so, Cam decides later); fewer than 18 holes; joke/abusive text. **Duplicate**: already in `COURSES` (check names/towns).
- Take the top **two** buildable requests (from different players). If one can't be built (see 3), record `failed` with the reason
  and try the next one, but build at most two. With two courses, do steps 2–6 for both: one fetch job can carry both
  (two keys in want/holes/steps, two search boxes), and `inject_auto.py` takes both keys. If one course fails its gates,
  inject and ship only the other (re-run inject_auto.py with just that key) and record the failure.

## 2. Research
Search the web for the course's scorecard: back (championship) tees with per-hole par, handicap, yardage. Prefer the club
site, then GolfPass, opengolfapi, 18birdies, Stymie; check that holes sum to the total and pars to the par. If the request
names tees, use those. Also: town, lat/lon, architect/year, turf (bent vs Bermuda), signature holes.
Pick a key (lowercase, 3–15 letters, not used in index.html) and a 3-letter SUF not used (`grep -c "COURSE_XYZ=" index.html`).
`mkdir -p auto/<key>` and write `auto/<key>/scorecard.json`: `{"tees":"Blue tees","yards":6700,"card":[[par,hcp,yds],...18]}`.
**Tee sets:** from the same card take the next two sets shorter than the back tees (exact names as printed, per-hole yards; skip combo
sets) and add them to `pipeline/courses/teecard.json` (in the golf-go repo) as
`"<key>": {"n":"Blue tees","b":[18 back yds],"s":[["White tees",[18 yds]],["Gold tees",[18 yds]]]}` in the game's hole order.
These become the Middle/Forward choices (markers take the colour in the name). No usable card rows: leave it out (the game estimates).

## 3. Fetch (GitHub Actions)
Write a job.json (`auto/mkjob.py` docstring) with a search box ±0.03° round the course, want/holes regex from the
course name. `python3 auto/mkjob.py job.json "/home/claude/golf-go/lidar job.py"`, then push that file to the
**autobuild** branch (not main):
```
cd /home/claude/golf-go && git checkout -q -B autobuild origin/main && git add "lidar job.py" && git commit -qm "Course data job: <name>" && git push -qf origin autobuild && git checkout -q main
```
The push starts `fetch.yml` (~10–30 min). Poll `gh run list --repo hartwigcam98-star/golf-go --workflow fetch.yml -L 1`.
Then `git clone -q --depth 1 -b course-data https://github.com/hartwigcam98-star/golf-go /home/claude/golf/run_<key>`.
Read `summary.json`: `errors`, `osm_golf_courses`, `picked`, `courses.<key>.greens` and `.points` (lidar project names and ground
density per green; good scans are 2020+ with several pts/m²).
- Wrong outline picked (two outlines, resort): rerun with `ids` (and want `^zzz$`). No outline but 18 OSM hole ways: rerun with
  `boxes` round the holes (+150 m). Holes only, no greens: trace greens from the photo (see course-pipeline-7.md in the
  project, Desert Canyon) or record `failed: OSM has no greens`. No OSM holes at all: `failed: course not mapped in
  OpenStreetMap` (tell Cam; he or the player can map it).
- If a course spans two outlines, merge both runs' green point sets (course-pipeline-8.md, Ridges).

## 4. Build the map and check it against the photo
`cd auto/<key> && python3 ../build_course.py <key> ../../run_<key> [holeIds.json]` → prints each hole's length vs the card.
Draw it: `python3 auto/draw.py <key> run_<key> /tmp/<key>.jpg 1.0` (from golf/) and **look at it** (Read the image). Check:
every hole runs tee→green the right way, ends on a real green, pars/routing make sense (next tee near the previous green),
nothing absurd. Fix with `auto/<key>/<key>_edits.json` (retag / drop / lines / add / tees; see build_course.py) and rebuild.
Typical fixes: a green mapped as a tee (retag), a reversed hole, back tees missing (zoom with draw.py's window args,
find the tee box, set `tees`). A tee spot must be on a mapped tee or fairway.

## 4b. Driving range
Every course gets one (players choose "Hit the range" on hole 1). In order:
1. **Mapped:** `auto/<key>/<key>_course.json` has `polys.range` (a range 180+ yd long near the clubhouse) → nothing to do.
2. **On the photo:** `python3 auto/draw.py <key> run_<key> /tmp/<key>_r.jpg 0.6 xa ya xb yb` with a window (course yards) round the
   clubhouse and 1st tee; look for the range (striped hitting area, target greens, open field). Pixel (px,py) = course yards
   (xa+px*0.6, ya+py*0.6). Trace it in `pipeline/ranges/traced.json`: `"<key>": {"P":[[x,y],...], "t":[x,y]}` with `t` at the hitting end
   (by the clubhouse / practice tee). Keep it clear of the holes.
3. **Shared:** a resort or neighbour already in the game with the same range → `pipeline/ranges/borrow.json`: `"<key>": "<other key>"`
   (or trace it in this course's yards, as Heritage does with True Blue's).
4. **Not found:** `python3 /home/claude/golf-go/pipeline/ranges/place.py <key> auto/<key>/<key>_course.json` puts one by the clubhouse,
   35+ yd clear of every hole. Say so in the report.

## 4c. Clubhouse and the extras job (start it now; it runs while you do step 5)
1. `python3 clubs/newclub.py find <key> run_<key> /tmp/<key>_club.jpg` (from golf/) lists clubhouse candidates and draws them,
   numbered, over the aerial. **Look at it.** The clubhouse is usually the biggest building by the 1st tee / 18th green with a
   parking lot and a cart staging area. `python3 clubs/newclub.py pick <key> <n>` records it in `pipeline/courses/extras/<key>.json`
   (if the map has no clubhouse there, trace it on the photo and use `pick <key> --ring '[[x,y],...]'`, course yards).
   It prints the "club" request (lat, lon, R). Add `"pref": [<newest lidar project name>]` from `summary.json`
   (`courses.<key>.greens[*].cand`; the newest year, e.g. `MN_Metro_B22` over `MN_TwinCities_2011`).
2. Dispatch the extras job for tonight's course(s) (clubhouse lidar + a clubhouse photo set + a course photo set):
```
REQ='{"<key>":{"club":{"lat":..,"lon":..,"R":..,"pref":["..."]},"name":"<course name>","town":"<town ST>","urls":["<club website>"],"must":"<regex the photo titles must match, e.g. heritage club|heritage golf>"}}'
gh api -X POST repos/hartwigcam98-star/golf-go/actions/workflows/extras.yml/dispatches -f ref=main -f "inputs[req]=$REQ"
```
   Poll `gh run list --repo hartwigcam98-star/golf-go --workflow extras.yml -L 1` (~2–10 min), then
   `git clone -q --depth 1 -b extras-data https://github.com/hartwigcam98-star/golf-go /home/claude/golf/run_extras`.
   Results: `<key>_lidar.npz`, `courseimg/<key>_club.jpg` and `courseimg/<key>_course.jpg` (labelled contact sheets; single
   photos in the folders of the same name), `log.txt`. Many photos are of other places with the same name: trust only
   what matches the map, the aerial and the lidar.

## 5. Lidar greens, ground, trees
From golf/:
```
python3 auto/setup_lidar.py <key> run_<key>
python3 lidar2/register.py <key>            # -> regshift (bunker depth should be clearly negative, -20..-60 cm)
python3 lidar2/reg_pts.py <key>             # best (dx,dy); ptshift = regshift - best -> write to lidar2/ptshift.json
python3 -c "import json;f='lidar2/sigma.json';o=json.load(open(f));o['<key>']=1.3;json.dump(o,open(f,'w'))"
python3 lidar2/build_patches2.py <key>
python3 sc3/soften.py <key> 3.4 3.2         # medians per green; anything still >4% needs a look (auto/gview.py)
python3 auto/build_wide.py <key>
python3 auto/trees.py <key> run_<key>
cd auto/<key> && python3 ../consts.py <key> <SUF> ../../run_<key>
```
If bunkers show ~0 depth the scan predates the course: no green patches from points (use the 1 m model, soften to ~3%).

### 5b. Lidar under the range (only when gate 6 says it's under 90%)
The course grid from `build_wide.py` usually covers the range. When `qa/range.js` reports less than 90%, in the golf-go repo:
`node pipeline/ranges/courses_json.js /home/claude/golf/work/index.html` (adds the new course's greens), then write
`pipeline/ranges/only.json` = `["<key>"]`, `pipeline/ranges/lidar_want.json` = `{"<key>": <box gate 6 printed>}`,
`pipeline/ranges/coords.json` = `{"<key>": [lat, lon]}` and push those to main (it runs `ranges.yml`, ~10–20 min). From the `range-data`
branch take `rlid_<key>.json` into `pipeline/ranges/rlid.json` as `"<key>": [...]`, then set `only.json` back to `[]`, re-run the sync
and gate 6. (The run log shows `greens N rms R`: R under ~1 yd means the patch lines up with the course.)

## 6. Inject, test, gates
Write `auto/<key>/meta.json` (inject_auto.py docstring). day = today's dailyNum + 2
(`python3 -c "import time;print(int(time.time()//86400)+2)"`). Pick an existing emblem that suits it:
gem castle cattail fork barn crown thistle meadow laurel townhall heartlake silverlakes lilypad windmill saguaro sun dove
furnace ridge rose cypress pine pines3 stream cairn oak heron magnolia palmetto bridge column scales dome dunes tusks shell
sedge compass rock peaks canyon loblolly lodge fish paddles loon. turf: `troy` (bentgrass, north), `heritage` (Bermuda,
south), `desertcanyon` (desert; also scen `desert`, trees `az`). trees: `north` (north woods), `south`, `az`, or `default`.
```
cd /home/claude/golf-go && git pull -q origin main
cp index.html /home/claude/golf/work/base_index.html && cp greens.js ground.js trees.js /home/claude/golf/work/base/
cd /home/claude/golf && python3 auto/inject_auto.py <key>
python3 /home/claude/golf-go/pipeline/ranges/sync.py work/index.html     # ranges, range lidar and tee sets from pipeline/ranges + teecard.json
python3 clubs/extras.py apply work/index.html work/ground.js <key>          # clubhouse, look, landmarks (once 6b has written them)
python3 test/mkharness.py work/index.html work/test/index.html && cp work/greens.js work/ground.js work/trees.js work/test/
```
### 6b. Clubhouse model, look and landmarks (clubs/; see clubs/MODELLING.md, LOOKKEYS.md, LANDMARKS.md)
1. **Model:** `cp run_extras/<key>_lidar.npz clubs/data/ && cd clubs && python3 bk.py prep <key>`, then model the building as
   roof blocks exactly as clubs/MODELLING.md says (look at dsm.jpg, aspect.jpg, facets.txt and the clubhouse photos; write
   blocks.json, fit, Read fit.jpg, iterate to median ≤ 0.3 yd, final.json + notes.txt). Copy `clubs/work/<key>/{final.json,meta.json,notes.txt}`
   to `pipeline/courses/extras/<key>_model/`. Then `python3 clubs/extras.py lid <key>` (from golf/). If the dsm shows no building
   (the survey is older than the clubhouse) or the scan is too sparse to read, skip the model and say so in the report.
2. **Look:** from the clubhouse photos write `"clublook"` into `pipeline/courses/extras/<key>.json` (clubs/LOOKKEYS.md: wall
   colour and material, trim, roof colour, `lo`/`lc`, `clk`, `ch`, `c`, patio `pt`/`um`/`fp`/`rw`; `fh` only when the photos show the
   main floor raised and the survey agrees; `yard:'none'` when it stands in sand, dune grass, prairie or desert). No clear photo of the
   clubhouse: leave clublook out (the region's default look).
3. **Course feel and landmarks:** from the course photos write `"cfeel"` (fountains, pond edges, bridge style) and, only for
   landmarks clearly on this course, `"cfeel2"` (clubs/LANDMARKS.md).
4. **Apply** (after every inject_auto + sync, before mkharness): `python3 clubs/extras.py apply work/index.html work/ground.js <key> [key2]`.
5. **Look at it:** with the harness up on 8766, `node clubs/render/shot2.js 8766 <key> /tmp/cl` and Read `/tmp/cl/<key>.png`:
   the clubhouse must look like a building (roofs closed, nothing floating, walls to the ground, porches on posts) and like
   the photos. Each landmark: `PORT=8766 node clubs/render/lmshot.js '[["<key>",x,y,45,8,"lm1"]]' /tmp/lm` and Read it. Fix or drop.

Hero picture: `cd work/test && (python3 -m http.server 8766 >/dev/null 2>&1 &); sleep 2; cd ../../qa && node hero.js '[["<key>",-1]]' /tmp`
then embed (480×270 JPEG q74 data URL) into `auto/<key>/hero.json` as `{"<key>": "data:image/jpeg;base64,..."}` and re-run inject + mkharness.
Look at the hero picture.

**Gates (all must pass, else do not ship):**
1. `node qa/qarun.js <key> /tmp/qa.json 8766`: no flags except a genuine double green ("huge green").
2. Every pinSlope ≤ 2.8.
3. Game total length within 5% of the card, and no hole more than 15% (or 40 yd) off its card (unless a reason is clear).
4. `node qa/smoke.js <key> 8766`: a result on every hole, no page errors (water/holed states are fine).
5. The full page loads with no page errors and the course plays (pick it from its state on the map).
6. `node qa/range.js <key> 8766` prints `RANGE PASS` (range found, tee and target inside it, a ball comes back to the mat).
   Lidar under 90% → step 5b, then re-run.
7. Step 6b's renders look right (or the part that didn't was dropped). A clubhouse model or landmark that can't be made right
   never blocks a course: drop it from extras/<key>.json, re-apply, and ship the course without it.

## 7. Ship (only after all gates pass)
```
cd /home/claude/golf && python3 sc3/ship.py "New course: <name>" "<name> in <town>: <one line, tees and yardage>. Requested by a player."   # two courses: "New courses: A and B" with one item each
cd /home/claude/golf-go && git status --short
```
Add an entry for the request to `pipeline/courses/requests.json` (`built`, key, date). Copy any changed pipeline files back
into `pipeline/courses/` (e.g. `auto/<key>/meta.json`, `*_edits.json`, scorecard; not the big json/npz data).
Commit `index.html greens.js ground.js trees.js sw.js pipeline/courses/ pipeline/ranges/` to main ("New course: <name> (player request)")
and push. If the push is rejected, pull, re-copy base, re-inject, re-test gate 5, push again.
For failures/skips: commit only `pipeline/courses/requests.json`.

## 8. Report to Cam (PushNotification)
Built: "<name> is live" (or both names) + tees/length vs card, its tee sets, where its range came from (mapped / traced / shared / placed),
its clubhouse (measured from the survey / map outline only, and why), its look (from photos / default) and any landmarks added, anything uncertain (pars that disagree, holes short of the card, softened greens),
and "say 'remove <name>' to undo". Skipped/failed: what and why. Nothing to do: no notification.
