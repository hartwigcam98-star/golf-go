"""Compare rebuilt patches with the shipped ones: python3 rg_cmp.py key"""
import json,sys,base64,numpy as np,cv2
sys.path.insert(0,'/home/claude/golf/lidar2')
from common import green_list,hole_of_green
key=sys.argv[1]
s=open('/home/claude/golf-go/greens.js').read();i=s.index('const LIDG=')+11;LG,_=json.JSONDecoder().raw_decode(s[i:])
NEW=json.load(open(f'/home/claude/golf/lidar2/patches_{key}.json'))[key]
def dec(b64,nx,ny,z0):
    bs=base64.b64decode(b64);n=nx*ny;r=np.zeros(n,np.int64);k=0
    for j in range(n):
        v=0;m=1
        while True:
            c=bs[k];k+=1;v+=(c&127)*m;m*=128
            if not c&128:break
        r[j]=-(v+1)//2 if v%2 else v//2
    R=r.reshape(ny,nx);q=np.zeros((ny,nx),np.int64);q[0]=np.cumsum(R[0])
    for y in range(1,ny):
        q[y,0]=q[y-1,0]+R[y,0];q[y,1:]=q[y,0]+np.cumsum(R[y,1:]+q[y-1,1:]-q[y-1,:-1])
    return z0+q/1000
def P(p):x0,y0,nx,ny,z0,b,st=p;return dict(x0=x0,y0=y0,st=st,Z=dec(b,nx,ny,z0),nx=nx,ny=ny)
def samp(pp,X,Y):
    fx=(X-pp['x0'])/pp['st'];fy=(Y-pp['y0'])/pp['st'];ok=(fx>=0)&(fy>=0)&(fx<=pp['nx']-1)&(fy<=pp['ny']-1)
    out=np.full(X.shape,np.nan);out[ok]=cv2.remap(pp['Z'].astype(np.float32),fx[ok].astype(np.float32).reshape(-1,1),fy[ok].astype(np.float32).reshape(-1,1),cv2.INTER_LINEAR).ravel();return out
def best(pl,cx,cy):
    c=[p for p in pl if p['x0']<cx<p['x0']+p['st']*(p['nx']-1) and p['y0']<cy<p['y0']+p['st']*(p['ny']-1)]
    return min(c,key=lambda p:np.hypot(p['x0']+p['st']*p['nx']/2-cx,p['y0']+p['st']*p['ny']/2-cy)) if c else None
NP=[P(p) for p in NEW];SP=[P(p) for p in LG[key]]
gl=green_list(key);H=hole_of_green(key);rows=[]
for gi,g in enumerate(gl):
    x0,y0=g.min(0);x1,y1=g.max(0);GX,GY=np.meshgrid(np.arange(x0,x1,.5),np.arange(y0,y1,.5))
    m=np.array([cv2.pointPolygonTest(g.astype(np.float32),(float(a),float(b)),False)>=0 for a,b in zip(GX.ravel(),GY.ravel())]).reshape(GX.shape)
    cx,cy=g.mean(0);a=best(NP,cx,cy);b=best(SP,cx,cy)
    za=samp(a,GX,GY);zb=samp(b,GX,GY)
    def med(z):gy,gx=np.gradient(z,.5);return float(np.nanmedian(np.hypot(gx,gy)[m])*100)
    d=(za-zb)[m];d=d[np.isfinite(d)];rms=float(np.sqrt(np.mean((d-np.median(d))**2))) if len(d) else np.nan
    rows.append((H[gi]+1,round(med(za),1),round(med(zb),1),round(rms*91.44,1),round(float(np.median(d))*91.44,0) if len(d) else None))
print(key,'hole new% shipped% rms_cm offset_cm');[print('  ',r) for r in rows]
json.dump(rows,open(f'/home/claude/rg/cmp_{key}.json','w'))
