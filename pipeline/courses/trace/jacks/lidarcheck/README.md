# Green lidar check (Jack's 18, Oct 26 2026)
Compares each green in the game with the raw lidar ground points, and rebuilds the green surfaces from them.
Work dir was /home/claude/jk (paths in the scripts).
1. `greens2.steps` (run.js on a hooked copy, `?b10=0`): each hole's green outline + game heights on a 0.5 yd grid -> g01..g18.json.
2. Lidar: a fetch job with `"steps":{"jacks":"points"}` and `"greens":{"jacks":[[W,S,E,N],...]}` (job.json; boxes from the outlines via origin.json).
   origin.json = course origin recovered from the clubhouse request (extras/jacks.json club.req lat/lon = vertex mean of club.pts).
   utm.py converts the points (UTM 15N, NAD83) to course yards; checked against jacks_model/meta.json utm<->o (mm).
3. compare.py: per green tilt / median / p90 / max slope and relief beyond the tilt, game vs lidar, with the best shift
   (gradient correlation). shift.json: global lidar shift (0,+1) yd.
4. rebuild.py: inside each green the lidar surface (0.75 yd smoothing for point noise), blended over 4 yd into the existing
   LIDG patch, same datum (median offset in a 2-6 yd ring). Writes rb/jacks_patches.json for greens.js.
5. Gates: qa/qarun.js and qa/smoke.js with `?b10=0` (startHole waits for the Blender clubhouse with b10 on).
Physics note: a ball rests on a green only below about 2.9% (MU_GREEN at Stimp 11 x MU_REST .45 / GACC 8); other courses' greens
have medians of 2-5%, so real greens in that range play like the rest of the game.

## Green outlines drawn by Cam (Oct 26)
Each green was sent as a 50-yd, 800 px aerial crop sampled on a course-yard grid (blank_meta.json: x0, y0, size_yd). Cam traced the
edges in red; the red line's interior became the outline (greens_drawn_by_cam.json, course yd). build_new.py cuts bunkers out of an
outline, grows a green's lidar patch when the new shape runs past it (13, 15), rebuilds every surface from the lidar on the new shape,
and moves a pin that ends up within 4 yd of the edge to the nearest spot under 2% slope (13, 15).
