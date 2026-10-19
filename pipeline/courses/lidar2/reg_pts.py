"""Register a course map to lidar using the raw ground points around its greens (for courses whose 1 m DEM is from an older, sparser scan)."""
import sys;sys.path.insert(0,'/home/claude/golf/lidar2')
from register import *
from grid import fit
from scipy.spatial import cKDTree
name=sys.argv[1];C=json.load(open('/home/claude/golf/'+cj[name]));P=load_pts(name);gl=green_list(name)
xs=[];ys=[];zs=[]
for gi in P:
    d=max(P[gi].values(),key=lambda d:len(d['x']));xs.append(d['x']);ys.append(d['y']);zs.append(d['z'])
x=np.concatenate(xs);y=np.concatenate(ys);z=np.concatenate(zs);T=cKDTree(np.c_[x,y])
def s(GX,GY):   # local mean height of the points within 1.2 yd (nan where none)
    q=np.c_[np.ravel(GX),np.ravel(GY)];dd,ii=T.query(q,k=12,distance_upper_bound=1.2);ok=np.isfinite(dd);w=np.where(ok,1,0)
    zz=np.where(ok,z[np.minimum(ii,len(z)-1)],0);out=(zz*w).sum(1)/np.maximum(w.sum(1),1);out[w.sum(1)<3]=np.nan;return out.reshape(np.shape(GX))
XR=json.loads(sys.argv[2]) if len(sys.argv)>2 else [-3,3];YR=json.loads(sys.argv[3]) if len(sys.argv)>3 else [-3,3]
ins,outs=bunker_sets(name)
pins=[h['pin'] for h in C['holes']]
keep=[i for i,(a,b) in enumerate(ins) if min(np.hypot(np.mean(a)-p[0],np.mean(b)-p[1]) for p in pins)<45 and len(a)<4000]
ins=[ins[i] for i in keep];outs=[outs[i] for i in keep]
def dep(ox,oy):
    v=[]
    for a,b in zip(ins,outs):
        zi=s(a[0]+ox,a[1]+oy);zo=s(b[0]+ox,b[1]+oy)
        if np.isfinite(zi).sum()>5 and np.isfinite(zo).sum()>5:v.append(np.nanmean(zi)-np.nanmean(zo))
    return np.mean(v) if v else 0
res={(round(ox,2),round(oy,2)):dep(ox,oy) for ox in np.arange(XR[0],XR[1]+.01,.5) for oy in np.arange(YR[0],YR[1]+.01,.5)}
k=min(res,key=res.get);print(name,len(ins),'best',k,round(res[k]*100/YD,1),'cm at0',round(res[(0.0,0.0)]*100/YD,1))
print(' x:',[round(res[(xx,k[1])]*100/YD,1) for xx in np.round(np.arange(XR[0],XR[1]+.01,.5),2)]);print(' y:',[round(res[(k[0],yy)]*100/YD,1) for yy in np.round(np.arange(YR[0],YR[1]+.01,.5),2)])

