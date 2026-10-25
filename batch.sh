#!/bin/bash
# batch.sh <course...> : bake every hole of these courses on GitHub (sun + sky in parallel), build the WebP light maps into
# golf-go/b10/light/<course>/hNN.webp and write b10/light/<course>/bounds.json
set -e
cd /home/claude/bc
R=https://github.com/hartwigcam98-star/golf-go
if [ -z "$RESUME" ]; then
rm -rf /tmp/bd && mkdir -p /tmp/bd/holes && for c in "$@"; do cp -r holes/$c /tmp/bd/holes/; done
BD=bakedata-$1-$(date +%s); echo $BD > bakebranch.txt   # this run's own hole data (a shared branch let one run overwrite another's)
( cd /tmp/bd && git init -q -b $BD && git add -A && git -c user.name=Claude -c user.email=noreply@anthropic.com commit -qm "bake data: $*" && git push -q -f $R $BD )
python3 - "$@" <<'PY'
import json,sys,glob,os
items=[]
for c in sys.argv[1:]:
    for f in sorted(glob.glob('holes/%s/h*.npz'%c)):
        h=os.path.basename(f)[:-4]; items+=['%s/%s:sun'%(c,h),'%s/%s:sky'%(c,h)]
json.dump(items,open('matrix.json','w'));print(len(items),'jobs')
PY
git add -A matrix.json bakebranch.txt .github bake.py combine.py batch.sh packcourse.py && git commit -qm "Light bakes: $*" && git push -q origin blender-club
sleep 20
SHA=$(git rev-parse HEAD); ID=""; for t in $(seq 30); do ID=$(gh run list -R hartwigcam98-star/golf-go --branch blender-club --limit 20 --json databaseId,headSha -q ".[] | select(.headSha==\"$SHA\") | .databaseId" | head -1); [ -n "$ID" ] && break; sleep 10; done; echo "run $ID"   # the run for our own commit
else ID=$RESUME; fi
until s=$(gh run view $ID -R hartwigcam98-star/golf-go --json status,conclusion -q '.status+" "+.conclusion' 2>/dev/null) && [[ $s == completed* ]]; do sleep 30; done; echo "$s"
gh run view $ID -R hartwigcam98-star/golf-go --json conclusion -q .conclusion || true
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
git push -q origin --delete $(cat /home/claude/bc/bakebranch.txt) 2>/dev/null || true
cd /home/claude/bc && git rm -q --ignore-unmatch matrix.json && git commit -qm "Idle [skip ci]" && git push -q origin blender-club
