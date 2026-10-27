# usage: gates.sh port key...   (serves /tmp/claude-0/site)
P=$1; shift
cd /tmp/claude-0/site && (python3 -m http.server $P >/dev/null 2>&1 &); sleep 2
cd /home/claude/golf/qa
for k in "$@"; do
  timeout 300 node qarun_b.js $k /tmp/qa_$k.json $P >/dev/null 2>&1
  python3 -c "
import json;q=json.load(open('/tmp/qa_$k.json'));f=[(h['h'],h['f']) for h in q if h['f']];p=[(h['h'],h['pinSlope']) for h in q if h['pinSlope']>2.8]
print('$k','holes',len(q),'flags',f,'maxpin',max(h['pinSlope'] for h in q),'over2.8',p)" 2>&1 | tail -1
  timeout 400 node smoke_b.js $k $P 2>&1 | tail -2 | tr '\n' ' '; echo
done
