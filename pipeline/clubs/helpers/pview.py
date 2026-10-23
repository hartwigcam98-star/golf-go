# pview.py cid du dv da u0 u1 v0 v1 [step]  -> prints lidar heights sampled in a part frame (rows = part v, cols = part u)
import sys,math,numpy as np
from scipy.ndimage import map_coordinates
cid=sys.argv[1];du,dv,da,u0,u1,v0,v1=map(float,sys.argv[2:9]);st=float(sys.argv[9]) if len(sys.argv)>9 else 1
z=np.load(f'/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub/work/{cid}/frame.npz');U,H=z['U'],np.nan_to_num(z['H'],nan=-9)
a=U[0,0];px=U[0,1]-U[0,0];c,s=math.cos(math.radians(da)),math.sin(math.radians(da))
us=np.arange(u0,u1+1e-6,st);vs=np.arange(v0,v1+1e-6,st)
print('      '+''.join('%5.0f'%x for x in us))
for vp in vs:
    # inverse: main = origin + up*(c,-s) + vp*(s,c)
    M=[(du+up*c+vp*s,dv-up*s+vp*c) for up in us]
    h=map_coordinates(H,[[ (m[1]-a)/px for m in M],[(m[0]-a)/px for m in M]],order=1)
    print('%5.1f '%vp+''.join('%5.1f'%x for x in h))
