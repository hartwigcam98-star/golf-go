import sys;sys.path.insert(0,'/home/claude/golf/lidar2')
from common import *
from grid import fit
SIGS=[0.6,0.7,0.8,0.9,1.0,1.1,1.2,1.3,1.4,1.6,1.8,2.0,2.3,2.6,3.0]
rng=np.random.default_rng(1);out={}
for name in (sys.argv[1:] or CFG):
    P=load_pts(name);gl=green_list(name);res={}
    for gi in range(0,len(gl),2):
        g=gl[gi];d=max(P[gi].values(),key=lambda d:len(d['x']));x0,y0=g.min(0);x1,y1=g.max(0)
        gx,gy=np.meshgrid(np.arange(x0,x1,1.0),np.arange(y0,y1,1.0))
        inside=np.array([[cv2.pointPolygonTest(g.astype(np.float32),(float(a),float(b)),False)>=0 for a,b in zip(ra,rb)] for ra,rb in zip(gx,gy)])
        half=rng.random(len(d['x']))<.5
        for sig in SIGS:
            r=[fit(d['x'][h],d['y'][h],d['z'][h],gx,gy,sig,2) for h in (half,~half)]
            ds=np.hypot(r[0][1]-r[1][1],r[0][2]-r[1][2])[inside];res.setdefault(sig,[]).append(np.nanmedian(ds)/2)
    med={s:float(np.median(v)) for s,v in res.items()}
    pick=min([s for s,v in med.items() if v<=.0015] or [3.0]);out[name]=pick
    print(name,pick,{s:round(v*100,3) for s,v in med.items()})
import os;f='/home/claude/golf/lidar2/sigma.json';o=json.load(open(f)) if os.path.exists(f) else {};o.update(out);json.dump(o,open(f,'w'))

