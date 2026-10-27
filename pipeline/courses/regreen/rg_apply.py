"""Swap LIDG[key] in a greens.js for the rebuilt patches: python3 rg_apply.py greens.js key..."""
import json,sys
f=sys.argv[1];s=open(f).read();i=s.index('const LIDG=')+11;L,end=json.JSONDecoder().raw_decode(s[i:])
for k in sys.argv[2:]:
    new=json.load(open(f'/home/claude/golf/lidar2/patches_{k}.json'))[k]
    assert len(new)==len(L[k]),(k,len(new),len(L[k]));L[k]=new
# keep key order and separators as shipped
seg=s[i:i+end];sep=(',',':') if '":[[' in seg[:200] else None
open(f,'w').write(s[:i]+json.dumps(L,separators=(',',':'))+s[i+end:])
print('applied',sys.argv[2:])
