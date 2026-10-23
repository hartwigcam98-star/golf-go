# seg.py cid axis(v|u) a b step lo hi : for each line (v=const if axis v) print runs of similar height
import sys,numpy as np
cid,ax=sys.argv[1],sys.argv[2];a,b,st,lo,hi=map(float,sys.argv[3:8]);tol=float(sys.argv[8]) if len(sys.argv)>8 else .4
z=np.load(f'/home/claude/golf/clubs/work/{cid}/frame.npz');U,V,H,G=z['U'],z['V'],z['H'],z['G'];px=U[0,1]-U[0,0]
import os,math
PT=os.environ.get('PT')
def h(u,v):
    if PT:
        du,dv,da=map(float,PT.split(','));c,s_=math.cos(math.radians(da)),math.sin(math.radians(da));u,v=du+u*c+v*s_,dv-u*s_+v*c
    i=int(round((v-V[0,0])/px));j=int(round((u-U[0,0])/px));return float(np.nanmedian(H[i-1:i+2,j-1:j+2])),float(G[i,j])
for c in np.arange(a,b+1e-6,st):
    ts=np.arange(lo,hi+1e-6,0.5);vals=[h(t,c) if ax=='v' else h(c,t) for t in ts]
    out=[];s=0
    for k in range(1,len(ts)+1):
        if k==len(ts) or abs(vals[k][0]-vals[s][0])>tol:
            hh=np.mean([x[0] for x in vals[s:k]])
            if hh>0.6: out.append(f'{ts[s]:g}..{ts[k-1]:g}:{hh:.1f}' if k-1>s else f'{ts[s]:g}:{hh:.1f}')
            s=k
    print(f'{ax}={c:g} | '+'  '.join(out))
