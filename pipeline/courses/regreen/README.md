# Rebuilding a shipped course's greens from the lidar (Oct 27 2026)

Used to put 21 softened courses back on their measured surfaces. Works from the shipped game alone (no build dirs needed).
Scripts expect a work dir `/home/claude/rg` (copy this folder there) and the course pipeline at `/home/claude/golf` (RUNBOOK step 0).

1. Extract each course from index.html into `/home/claude/rg/<key>_course.json` (origin, green + bunker polygons, pins):
   see the snippet in the project doc claude/softened-greens-2026-10-27.md.
2. `python3 mkjob_rg.py key1,key2,... "/home/claude/golf-go/lidar job.py"` → push to `autobuild` (mode `pd`: 1 m DEM + green points only,
   green boxes from the shipped outlines in green_list order). ~20-30 min for 7 courses.
3. From /home/claude/golf: `python3 /home/claude/rg/rg_setup.py <key> run_dir`, `lidar2/register.py`, `lidar2/reg_pts.py`
   (ptshift = regshift − best), set sigma (values in lidar2/*.json match the original builds), `lidar2/build_patches2.py <key>`.
4. `python3 rg_cmp.py <key>`: unsoftened greens must come back at ~0 cm rms against the shipped ones (proves the registration).
5. `python3 rg_apply.py <greens.js> key...`, harness, `bash gates.sh <port> key...` (qa/qarun_b.js and smoke_b.js load with ?b10=0), stamp, commit.
