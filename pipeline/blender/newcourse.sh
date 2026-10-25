#!/bin/bash
# Blender pass for courses already in the game (pipeline/blender/README.md):
#   newcourse.sh setup                    clone the blender-club branch, make the hooked local copy of the game
#   newcourse.sh export <key> [key...]    clubhouse capture (from its home hole) + every hole's scene, for Blender
#                                         (= club + holes; each can be re-run on its own)
#   newcourse.sh bake   <key> [key...]    one GitHub Actions run: the clubhouse(s) and every hole's sun + sky light (CLUBONLY=1:
#                                         just the clubhouses, after a capture or prep_club.py change); then
#                                         b10/club/<key>.js, b10/light/<key>/hNN.webp, b10/bake.js and the bake.js?v bump
#   newcourse.sh cand   <key> [key...]    three candidate camera views per course + a contact sheet to pick from
#   newcourse.sh shoot  <key>=<n> [...]   before (?b10=0) and after from candidate n, then add them to blender/index.html
# Env: GG (golf-go clone), BC (blender-club clone), W (work dir), PORT (local server for the hooked copy)
set -e
GG=${GG:-/home/claude/golf-go}; P=$GG/pipeline/blender; BC=${BC:-/home/claude/bc}; W=${W:-/home/claude/b10work}; PORT=${PORT:-8767}
SRV=$W/srv; REPO=hartwigcam98-star/golf-go
mkdir -p $W/{clubs,scenes,shots,logs}
cmd=$1; shift || true
serve() {   # (re)make the hooked copy and serve it for the rest of this command
  python3 $P/mkhook.py $GG $SRV >/dev/null
  if ! curl -s -o /dev/null localhost:$PORT/index.html; then
    (cd $SRV && setsid -f python3 -m http.server $PORT >/dev/null 2>&1 </dev/null); sleep 2
    trap "pkill -f 'http.server $PORT' || true" EXIT   # ours: stop it when this command ends
  fi
}
case "$cmd" in
setup)
  [ -d $BC/.git ] || git clone -q --single-branch -b blender-club https://github.com/$REPO $BC
  git -C $BC pull -q origin blender-club; mkdir -p $BC/clubs $BC/holes
  python3 -c "import numpy, PIL" && node -e "require('playwright')" && echo "setup ok" ;;
club|export)
  serve
  for K in "$@"; do
    # 1. the clubhouse, captured on the hole that runs closest to it (its terrace and stairs face that hole, as in the game)
    python3 - $K $W <<'PY'
import json,sys
k,w=sys.argv[1],sys.argv[2]
pick=("let hi=-1,bs=1e9;for(let i=0;i<TB.length;i++){const h=buildHole(TB[i],i),L=h.line||[];for(const q of (h.buildings||[]))if(q.club&&!q.lmHide){let md=1e9;"
 "for(let k=0;k+1<L.length;k++){const a=L[k],b=L[k+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1;let t=((q.x-a[0])*dx+(q.y-a[1])*dy)/l2;t=Math.max(0,Math.min(1,t));"
 "md=Math.min(md,Math.hypot(a[0]+dx*t-q.x,a[1]+dy*t-q.y));}const sc=md-Math.sqrt(q.area)*.5;if(sc<bs){bs=sc;hi=i;}}}")
st=[["wait",9000],["ev","$('menuM').hidden=true;G.paused=false;0"],
    ["log","(()=>{setCourse('%s',false);%swindow.__CT=[];window.__HI=hi;if(hi>=0)startHole(hi);return 'home hole '+(hi+1);})()"%(k,pick)],["wait",9000],
    ["dumpf",["%s/clubs/%s.json"%(w,k),"grab.js"]]]
json.dump(st,open('%s/logs/club_%s.json'%(w,k),'w'))
PY
    (cd $P && PORT=$PORT Q="?b10=0" NOUI=1 timeout 900 node run.js $W/logs/club_$K.json > $W/logs/club_$K.log 2>&1) || true
    grep -h "home hole\|errors" $W/logs/club_$K.log | tr '\n' ' '; echo
    python3 $P/prep_club.py $W/clubs/$K.json $BC/clubs/$K.npz || echo "$K: no clubhouse to bake"
  done
  [ "$cmd" = club ] && exit 0
  ;;&
holes|export)
  serve
  for K in "$@"; do
    # 2. every hole: ground, trees (the Blender tree models), buildings - the scene the light is baked from
    D=$W/scenes/$K; mkdir -p $D
    python3 - $K $D $W <<'PY'
import json,sys
k,d,w=sys.argv[1:4];s=[["wait",9000]]
for i in range(18):
    s+=[["ev","(()=>{$('introM').hidden=true;G.paused=false;window.__skip=!(%d<TB.length);if(!window.__skip)startHole(%d);return 0;})()"%(i,i)],["wait",6500],
        ["dumpf",["%s/h%02d.json"%(d,i+1),"export_guard.js"]]]
json.dump(s,open('%s/logs/sx_%s.json'%(w,k),'w'))
PY
    (cd $P && PORT=$PORT Q="?b10=1&c=$K" NOUI=1 timeout 3000 node run.js $W/logs/sx_$K.json > $W/logs/sx_$K.log 2>&1) || true
    grep "errors" $W/logs/sx_$K.log | tail -1
    python3 $P/packcourse.py $K $D $BC/holes/$K | tail -1
    echo "$K: $(ls $BC/holes/$K | grep -c 'h.*json') holes exported"
  done ;;
bake)
  cd $BC && git pull -q origin blender-club
  rm -rf /tmp/bd && mkdir -p /tmp/bd/holes && for K in "$@"; do [ -n "$CLUBONLY" ] || cp -r $BC/holes/$K /tmp/bd/holes/; done; touch /tmp/bd/holes/.keep
  BD=bakedata-$1-$(date +%s); echo $BD > bakebranch.txt   # this run's own hole-data branch (runs never share one)
  (cd /tmp/bd && git init -q -b $BD && git add -A && git -c user.name=Claude -c user.email=noreply@anthropic.com commit -qm "bake data: $*" && git push -q -f https://github.com/$REPO $BD)
  python3 - "$@" <<'PY'
import json,sys,glob,os
items=[]
for c in sys.argv[1:]:
    if os.path.exists('clubs/%s.npz'%c): items.append('club:'+c)
    if os.environ.get('CLUBONLY'): continue
    for f in sorted(glob.glob('holes/%s/h*.npz'%c)):
        h=os.path.basename(f)[:-4]; items+=['%s/%s:sun'%(c,h),'%s/%s:sky'%(c,h)]
json.dump(items,open('matrix.json','w'));print(len(items),'jobs')
PY
  git add -f matrix.json bakebranch.txt $(for K in "$@"; do [ -f clubs/$K.npz ] && echo clubs/$K.npz; done) && git -c user.name=Claude -c user.email=noreply@anthropic.com commit -qm "Blender pass: $*" && git push -q origin blender-club
  SHA=$(git rev-parse HEAD); ID=""   # the run for our own commit (other pushes may start runs too)
  for t in $(seq 40); do sleep 10; ID=$(gh run list -R $REPO --branch blender-club --limit 20 --json databaseId,headSha -q ".[] | select(.headSha==\"$SHA\") | .databaseId" | head -1); [ -n "$ID" ] && break; done
  echo "run $ID"; [ -n "$ID" ] || { echo "no run started"; exit 1; }
  until s=$(gh run view $ID -R $REPO --json status,conclusion -q '.status+" "+.conclusion' 2>/dev/null) && [[ $s == completed* ]]; do sleep 30; done; echo "$s"
  for K in "$@"; do
    if git fetch -q --depth 1 origin bake-club-$K 2>/dev/null; then T=/tmp/bkc/$K; rm -rf $T; mkdir -p $T; git archive FETCH_HEAD | tar x -C $T
      [ -f $GG/b10/club/$K.js ] && python3 -c "
import json,os;p='$GG/b10/club_ver.json';V=json.load(open(p)) if os.path.exists(p) else {};V['$K']=V.get('$K',1)+1;json.dump(V,open(p,'w'))"
      python3 $P/packclub.py $T/$K.npz $GG/b10/club/$K.js $K | tail -1; rm -rf $T; git push -q origin --delete bake-club-$K 2>/dev/null || true; fi
    [ -n "$CLUBONLY" ] && { echo "$K: clubhouse $([ -f $GG/b10/club/$K.js ] && echo yes || echo no)"; continue; }
    mkdir -p $GG/b10/light/$K
    for f in $BC/holes/$K/h*.npz; do h=$(basename $f .npz); T=/tmp/bk/$K/$h; rm -rf $T; mkdir -p $T/sun $T/sky
      for p in sun sky; do git fetch -q --depth 1 origin bake-$K-$h-$p && git archive FETCH_HEAD | tar x -C $T/$p; done
      python3 $P/combine.py $T/sun/$K/$h/raw_sun.npz $T/sky/$K/$h/raw_sky.npz $T > /dev/null && cp $T/light.webp $GG/b10/light/$K/$h.webp; rm -rf $T   # raw bakes are ~0.3 GB a hole: free the disk as we go
      git push -q origin --delete bake-$K-$h-sun bake-$K-$h-sky 2>/dev/null || true
    done
    python3 -c "
import json,glob,os
o={}
for f in sorted(glob.glob('$BC/holes/$K/h*.json')):
    h=os.path.basename(f)[:-5];b=json.load(open(f))['b'];o[int(h[1:])-1]=[b[0],b[1],b[2]-b[0],b[3]-b[1]]
json.dump(o,open('$GG/b10/light/$K/bounds.json','w'))"
    echo "$K: $(ls $GG/b10/light/$K | grep -c webp) light maps, clubhouse $([ -f $GG/b10/club/$K.js ] && echo yes || echo no)"
  done
  git push -q origin --delete $BD 2>/dev/null || true
  (git rm -q --ignore-unmatch matrix.json && git -c user.name=Claude -c user.email=noreply@anthropic.com commit -qm "Idle [skip ci]" && git push -q origin blender-club) || true
  python3 $P/mkbake.py $GG
  cd $GG && v=$(grep -o "b10/bake.js?v=[0-9]*" index.html | grep -o "[0-9]*$"); sed -i "s#b10/bake.js?v=$v#b10/bake.js?v=$((v+1))#" index.html
  echo "bake.js?v=$((v+1)) - commit b10/ and index.html" ;;
cand)
  serve; L=$(echo "$@" | tr ' ' ',')
  (cd $P && timeout 3000 node gal.js $PORT cand $L $W/shots) | grep -v '^$'
  python3 $P/sheet.py $W/shots $L $W/shots/sheet_$(echo "$@" | tr ' ' '_').jpg ;;
shoot)
  serve; KS=""
  for a in "$@"; do K=${a%%=*}; N=${a##*=}; KS="$KS $K"
    python3 -c "
import json,os;C=json.load(open('$W/shots/cands.json'));f='$W/shots/cams.json';A=json.load(open(f)) if os.path.exists(f) else {};A['$K']=C['$K'][$N];json.dump(A,open(f,'w'))"; done
  L=$(echo $KS | tr ' ' ',')
  (cd $P && timeout 3000 node gal.js $PORT before $L $W/shots && timeout 3000 node gal.js $PORT after $L $W/shots) | grep -v '^$'
  python3 $P/mkgal.py $GG $W/shots $KS ;;
*) sed -n 2,9p $0; exit 1 ;;
esac
