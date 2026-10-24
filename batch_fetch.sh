#!/bin/bash
# batch_fetch.sh <course...> : after the bake run finishes, build the light maps (see batch.sh)
set -e
cd /home/claude/data/x
for c in "$@"; do
  mkdir -p /home/claude/golf-go/b10/light/$c; B="{"
  for f in /home/claude/bc/holes/$c/h*.npz; do h=$(basename $f .npz); W=/tmp/bk/$c/$h; rm -rf $W; mkdir -p $W/sun $W/sky
    for p in sun sky; do git fetch -q --depth 1 origin bake-$c-$h-$p && git archive FETCH_HEAD | tar x -C $W/$p; done
    python3 /home/claude/bc/combine.py $W/sun/$c/$h/raw_sun.npz $W/sky/$c/$h/raw_sky.npz $W > /dev/null && cp $W/light.webp /home/claude/golf-go/b10/light/$c/$h.webp
    git push -q origin --delete bake-$c-$h-sun bake-$c-$h-sky 2>/dev/null || true
  done
  python3 -c "
import json,glob,os
c='$c';o={}
for f in sorted(glob.glob('/home/claude/bc/holes/%s/h*.json'%c)):
    h=os.path.basename(f)[:-5];b=json.load(open(f))['b'];o[int(h[1:])-1]=[b[0],b[1],b[2]-b[0],b[3]-b[1]]
json.dump(o,open('/home/claude/golf-go/b10/light/%s/bounds.json'%c,'w'));print(c,len(o),'holes')"
done
cd /home/claude/bc && git rm -q matrix.json && git commit -qm "Idle" && git push -q origin blender-club
