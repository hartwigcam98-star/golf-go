#!/bin/bash
# rebake.sh [N] [key ...]: re-run the Blender light for courses whose baked light predates their measured trees
# (pipeline/courses/treelidar). The game only uses a course's baked light when it was baked with the trees it shows
# (b10/light/<id>/mt.json -> mt:1 in b10/bake.js); until then that course has live shadows. Each run takes the next N
# courses (default 6) in the order below, or the keys given: export the holes (local, ~5 min a course), one GitHub bake run
# (club skipped: the clubhouse bake doesn't involve trees), then commit and push to main.
# Prints "REBAKE DONE" when no course is left.
set -e
GG=${GG:-/home/claude/golf-go}; P=$GG/pipeline/blender; BC=${BC:-/home/claude/bc}; N=${1:-6}; shift || true
cd $GG && git pull -q origin main
KEYS="$*"
if [ -z "$KEYS" ]; then KEYS=$(python3 - $N <<'PY'
import json, os, re, glob, sys
n = int(sys.argv[1]); src = ''.join(open(f).read() for f in sorted(glob.glob('src/*.js')))
data = {m.group(1): m.group(2) for m in re.finditer(r"(\w+):\{[^{}]{0,400}?data:'(\w+)'", src)}
tj = open('trees.js').read(); haveL = set(re.findall(r'"(\w+)":\{"n":\d+,"xy":"[^"]*","r":"[^"]*","ext":\[[^\]]*\],"L":', tj))
todo = []
for d in sorted(glob.glob('b10/light/*/bounds.json')):
    c = d.split('/')[-2]
    if os.path.exists('b10/light/%s/mt.json' % c): continue
    if data.get(c, c) in haveL: todo.append(c)
print(' '.join(todo[:n]))
PY
); fi
[ -n "$KEYS" ] || { echo "REBAKE DONE"; exit 0; }
echo "rebake: $KEYS"
bash $P/newcourse.sh setup
bash $P/newcourse.sh holes $KEYS
for K in $KEYS; do [ -f $BC/holes/$K/trees.txt ] || { echo "$K: export did not see the measured trees, left out"; KEYS=$(echo " $KEYS " | sed "s/ $K / /"); }; done
[ -n "$(echo $KEYS)" ] || exit 1
NOCLUB=1 bash $P/newcourse.sh bake $KEYS
cd $GG && git add b10 src index.html sw.js && git -c user.name=Claude -c user.email=noreply@anthropic.com commit -qm "Blender light rebaked with the measured trees: $KEYS" \
  && (git push -q origin HEAD:main || (git pull -q --rebase origin main && git push -q origin HEAD:main))
for K in $KEYS; do echo "$K: $(ls b10/light/$K | grep -c webp) light maps, $( [ -f b10/light/$K/mt.json ] && echo measured trees || echo NOT marked)"; done
