set -e
cd /home/claude/golf
python3 auto/build_wide.py jacks | tail -1
python3 auto/trees.py jacks run_jacks_t | tail -1
python3 trace/lidar_trees.py | tail -1
python3 trace/chute_trees.py | tail -1
(cd auto/jacks && python3 ../consts.py jacks JAK ../../run_jacks_t | tail -1)
python3 auto/inject_auto.py jacks | tail -1
python3 /home/claude/golf-go/pipeline/ranges/sync.py work/index.html | tail -1
python3 clubs/extras.py apply work/index.html work/ground.js jacks | tail -1
python3 - <<'PY'
f='/home/claude/golf/work/index.html';s=open(f).read()
a="// Deerwood, MN: Jack's 18 (player request): OpenStreetMap, USGS NED/3DEP, USDA NAIP"
assert s.count(a)==1
s=s.replace(a,"// Deerwood, MN: Jack's 18 (player request): holes, greens and bunkers traced from USDA NAIP and the club's routing map (OSM has only the boundary), routed and treed from 2022 lidar, OSM water/roads, USGS 3DEP")
open(f,'w').write(s)
PY
python3 test/mkharness.py work/index.html work/test/index.html && cp work/greens.js work/ground.js work/trees.js work/test/
