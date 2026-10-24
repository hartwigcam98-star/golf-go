#!/bin/bash
# run nextbatch.sh until the queue is empty; wait for each course's hole export to finish first
EXP=/tmp/claude-0/-home-claude/7393ea9a-95fa-5217-b579-10869e9aabd9/tasks/bfv5904xr.output
while [ -s /home/claude/bc/queue.txt ]; do
  L=$(head -1 /home/claude/bc/queue.txt)
  for c in $L; do until [ -f /home/claude/bc/holes/$c/h18.json ] && { grep -q "^$c h" $EXP || ! grep -qw "$c" <<<"caledonia trueblue heritage pawplant orangeburg santee wyboo rossbridge legislator judge senator crsc crls valley ridge gnlinks gnlake slmh slbm farmlinks lookout wigwam dove desertcanyon"; }; do sleep 60; done; done
  echo "== $L $(date +%H:%M)"; bash /home/claude/bc/nextbatch.sh
done
echo QUEUE DONE
