#!/bin/bash
# clubbatch.sh : re-run every clubhouse (clubs/<id>.json from the home-hole capture) through prep_club + the Blender sky bake on
# GitHub, pack them to golf-go/b10/club/<id>.js and bump their versions
cd /home/claude/bc
until [ "$(head -1 queue.txt)" = CLUBS ]; do sleep 60; done   # the light-bake chain parks on this line
IDS=$(cd /home/claude/clubs && ls *.json | sed 's/\.json$//' | grep -v '^royal$')
for c in $IDS; do python3 prep_club.py /home/claude/clubs/$c.json clubs/$c.npz | tail -1; done
python3 - $IDS <<'PY'
import json,sys;json.dump(['club:'+c for c in sys.argv[1:]],open('matrix.json','w'));print(len(sys.argv)-1,'club jobs')
PY
git add -A matrix.json clubs && git commit -qm "Clubhouse bakes: recaptured from each course's home hole (patio faces the hole that runs past it)" && git push -q origin blender-club
sleep 20
ID=$(gh run list -R hartwigcam98-star/golf-go --branch blender-club --limit 1 --json databaseId -q '.[0].databaseId'); echo "run $ID"
until s=$(gh run view $ID -R hartwigcam98-star/golf-go --json status,conclusion -q '.status+" "+.conclusion' 2>/dev/null) && [[ $s == completed* ]]; do sleep 30; done; echo "$s"
cd /home/claude/data/x
for c in $IDS; do W=/tmp/bkc/$c; rm -rf $W; mkdir -p $W
  git fetch -q --depth 1 origin bake-club-$c && git archive FETCH_HEAD | tar x -C $W && python3 /home/claude/bc/packclub.py $W/$c.npz /home/claude/golf-go/b10/club/$c.js $c | tail -1 && \
  python3 -c "
import json,os;p='/home/claude/bc/club_ver.json';V=json.load(open(p)) if os.path.exists(p) else {};V['$c']=V.get('$c',1)+1;json.dump(V,open(p,'w'))" && git push -q origin --delete bake-club-$c 2>/dev/null
done
python3 /home/claude/bc/mkbake.py
cd /home/claude/golf-go && v=$(grep -o "b10/bake.js?v=[0-9]*" index.html | grep -o "[0-9]*$"); sed -i "s#b10/bake.js?v=$v#b10/bake.js?v=$((v+1))#" index.html
git add -A b10 index.html && git -c user.name=Claude -c user.email=noreply@anthropic.com commit -qm "Blender clubhouses: rebuilt from each course's home hole, so the patio, terrace and stairs face the course where you see them

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CZoovmstxp4BK9P5WWbpEJ" && git pull -q --rebase origin main && git push -q origin HEAD:main && git log --oneline -1
cd /home/claude/bc && git rm -q matrix.json && git commit -qm "Idle" && git push -q origin blender-club
sed -i 1d queue.txt; mkdir -p holes/CLUBS && touch holes/CLUBS/h18.json   # let the chain go on
echo CLUBS DONE
