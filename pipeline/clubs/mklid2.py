"""CLUBLID (block models) for ground.js from work/<cid>/final.json (or fit.json) + meta.json. usage: mklid2.py in.js out.js [ids...]"""
import json,os,sys,glob
alias=json.load(open('alias.json'));T={}
for d in sorted(glob.glob('work/*/')):
    cid=d.rstrip('/').split('/')[-1]
    f=d+'final.json' if os.path.exists(d+'final.json') else None
    if not f: continue
    m=json.load(open(d+'meta.json'));b=json.load(open(f))
    R=lambda bl:[[x[0]]+[round(float(v),2) for v in x[1:8]]+([x[8]] if len(x)>8 and x[8] else []) for x in bl]
    T[cid]=dict(o=m['o'],a=m['a'],ref=m['ref'],blocks=R(b.get('blocks',[])))
    if b.get('st'): T[cid]['st']=b['st']   # stairs from the raised porches, [u,v,width] (from photos)
    if os.path.exists(d+'frame.npz'):
        import bk;T[cid]['gr']=bk.ring(cid,b)
    if b.get('parts'):   # wings at their own angle: origin (du,dv) in the main frame, angle main+da (deg, CCW)
        import math;A=math.radians(m['a']);T[cid]['parts']=[dict(o=[round(m['o'][0]+p['du']*math.cos(A)+p['dv']*math.sin(A),2),round(m['o'][1]-p['du']*math.sin(A)+p['dv']*math.cos(A),2)],a=round(m['a']+p['da'],2),blocks=R(p['blocks'])) for p in b['parts']]
for a,b in alias.items():
    if b in T: T[a]=T[b]
only=sys.argv[3:]
if only: T={k:v for k,v in T.items() if k in only}
src=open(sys.argv[1]).read().split('\n');src=[l for l in src if not l.startswith('const CLUBLID=') and not l.startswith('// clubhouses measured from USGS')]
i=[j for j,l in enumerate(src) if l.startswith('const BLDX=')][0]
src.insert(i+1,"// clubhouses measured from USGS 3DEP lidar (public domain): roof blocks in each building's frame (see blockMass)\nconst CLUBLID="+json.dumps(T,separators=(',',':'))+';')
open(sys.argv[2],'w').write('\n'.join(src));print(len(T),'clubhouses',sorted(T))
