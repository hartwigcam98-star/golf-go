#!/bin/bash
# nextbatch.sh : take the next line of queue.txt (courses), bake them, push the light maps to the game
Q=/home/claude/bc/queue.txt; L=$(head -1 $Q); [ -z "$L" ] && { echo "queue empty"; exit 0; }
bash /home/claude/bc/batch.sh $L 2>&1 | grep -v "^warning\|negotiation\|fatal: expected" | tail -6
sed -i 1d $Q
python3 /home/claude/bc/mkbake.py
cd /home/claude/golf-go && v=$(grep -o "b10/bake.js?v=[0-9]*" index.html | grep -o "[0-9]*$"); sed -i "s#b10/bake.js?v=$v#b10/bake.js?v=$((v+1))#" index.html
git add -A b10 index.html && git -c user.name=Claude -c user.email=noreply@anthropic.com commit -qm "Blender trial: baked light for $L

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
Claude-Session: https://claude.ai/code/session_01CZoovmstxp4BK9P5WWbpEJ" && git pull -q --rebase origin main && git push -q origin HEAD:main && git log --oneline -1
for c in $L; do echo "$c $(ls b10/light/$c 2>/dev/null | grep -c webp) maps"; done
