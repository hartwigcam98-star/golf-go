"""Put bld/bldx.json into the repo's ground.js as const BLDX (replacing an older one)."""
import json,re
R='/home/claude/golf-go/ground.js';t=open(R).read()
X=json.load(open('/home/claude/golf/bld/bldx.json'))
line='\n// buildings measured from USGS lidar (heights, roof shapes) with roof colours from the NAIP aerial photo; a = course buildings the map lacks\nconst BLDX='+json.dumps(X,separators=(',',':'))+';\n'
i=t.find('\n// buildings measured from USGS lidar')
if i>=0:t=t[:i]
t=t.rstrip('\n')+'\n'+line
open(R,'w').write(t);print('BLDX bytes',len(line))
