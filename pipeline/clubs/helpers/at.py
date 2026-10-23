# at.py cid spec.json u,v [u,v ...]: lidar, ground, model and which blocks cover the point
import sys,json,numpy as np
sys.path.insert(0,'/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub')
from bk import load,env,pcoords
cid,f=sys.argv[1:3];W,U,V,H,G,K=load(cid);S=json.load(open(f));px=U[0,1]-U[0,0]
for p in sys.argv[3:]:
    u,v=map(float,p.split(','));i=int(round((v-V[0,0])/px));j=int(round((u-U[0,0])/px))
    out=[]
    for n,b in enumerate(S.get('blocks',[])):
        h=env([b],np.array([u]),np.array([v]))[0]
        if h>-50: out.append(f'b{n}:{h:.1f}')
    for k,pt in enumerate(S.get('parts',[])):
        a,c=pcoords(pt,np.array([u]),np.array([v]))
        for n,b in enumerate(pt['blocks']):
            h=env([b],a,c)[0]
            if h>-50: out.append(f'p{k}.{n}:{h:.1f}')
    print(f'({u},{v}) H={np.nanmedian(H[i-1:i+2,j-1:j+2]):.2f} G={G[i,j]:.2f} ',' '.join(out))
