# compact map: each cell = h in half-yards (2 chars), '..' below 0.5yd, '##' >= 49 half yards
import sys,numpy as np
cid=sys.argv[1];st=float(sys.argv[2]);u0,u1,v0,v1=map(float,sys.argv[3].split(','))
z=np.load(f'/home/claude/golf/clubs/work/{cid}/frame.npz')
U,V,H=z['U'],z['V'],z['H'];px=U[0,1]-U[0,0]
ix=lambda u:int(round((u-U[0,0])/px));iy=lambda v:int(round((v-V[0,0])/px))
uu=np.arange(u0,u1,st);vv=np.arange(v0,v1,st)
print('     '+''.join(f'{int(u):<4d}' if i%2==0 else '' for i,u in enumerate(uu)))
for v in vv:
    s=''
    for u in uu:
        a=H[iy(v):iy(v+st),ix(u):ix(u+st)];h=np.nanmedian(a)
        s+= '..' if not h>0.5 else ('##' if h*2>=99 else f'{int(round(h*2)):2d}')
    print(f'{v:5.0f}'+s)
