# Cattails and reeds (REEDS in trees.js), Oct 28 2026

Stands of cattails/reeds drawn as instanced clumps (index.html `r3Reeds`, `r3ReedLOD`), from a 2-yd grid per course:
value 0 nothing, 1 "no tree here" (ground by the water where the lidar shows nothing over 3 m: photo "trees" there are dropped),
10-30 a stand (height in dm). Run-length coded: varint gap, varint run length, one value byte.

1. `<key>_w.json`: origin + course water, surroundings water and wetland, mown and bunker polygons (extracted from index.html COURSE_/SURR_).
2. `python3 mkjob_reeds.py key:EPTproject:epsg[,...] "lidar job.py"` → push to `autobuild` (lidar top surface and ground on a
   1 m UTM grid round the water + the NAIP photo; ~15 min for two courses). EPT project = the newest scan in the course's summary.
3. `python3 mkreeds.py key runDir` → `reeds_<key>.json` + previews. Rules: in mapped water, vegetation 0.5-3.5 m (or 0.2 m+ where
   the photo is green); in wetland polygons 0.8-3.5 m; within 6 yd of the shore 1.0-3.5 m; never on mown ground or under
   anything over 5 m; open water (dark or grey in the photo) excluded. Look at the preview over the photo.
4. Add the entry to `const REEDS={...}` at the end of trees.js, stamp, test (renders: clubs/render/lmshot_b.js), ship.
Blender: removing photo trees changes the baked shadows, so re-run `newcourse.sh export` + `bake` for the course afterwards.
