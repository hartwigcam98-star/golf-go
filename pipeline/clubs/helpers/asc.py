import sys,numpy as np
cid=sys.argv[1];st=float(sys.argv[2]) if len(sys.argv)>2 else 2
z=np.load(f'/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub/work/{cid}/frame.npz')
U,V,H,G,K=z['U'],z['V'],z['H'],z['G'],z['K']
ys,xs=np.nonzero(K)
if len(sys.argv)>3: u0,u1,v0,v1=map(float,sys.argv[3].split(','))
else: u0,u1,v0,v1=U[0,xs.min()]-4,U[0,xs.max()]+4,V[ys.min(),0]-4,V[ys.max(),0]+4
uu=np.arange(u0,u1,st);vv=np.arange(v0,v1,st)
px=U[0,1]-U[0,0]
def ix(u):return int(round((u-U[0,0])/px))
def iy(v):return int(round((v-V[0,0])/px))
print('      '+''.join(f'{u:>4.0f}' for u in uu))
for v in vv:
    row=[]
    for u in uu:
        a=H[iy(v):iy(v+st),ix(u):ix(u+st)]
        h=np.nanmedian(a) if a.size else np.nan
        k=K[iy(v):iy(v+st),ix(u):ix(u+st)].mean() if a.size else 0
        row.append(f'{h:4.1f}'+('' ) if not np.isnan(h) else '   .')
    print(f'{v:5.0f} '+''.join(row))
