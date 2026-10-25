"""After sc3/soften.py: keep each green's broad contours, drop lidar lumps and sharp ridges.
plane tilt capped at 2.4%; residual smoothed (sigma 2.5 yd) and scaled so the steepest 10% of the green is <= 4.3% and nothing over 6.5%;
feathered into the surround over 5 yd. usage: python3 greenfix.py key"""
import sys,json,numpy as np,cv2,base64;sys.path.insert(0,'/home/claude/golf/lidar2');sys.path.insert(0,'/home/claude/golf/lidar')
from common import green_list,hole_of_green
from build_patches import enc
from scipy import ndimage as ndi
key=sys.argv[1];SIG=float(sys.argv[2]) if len(sys.argv)>2 else 2.5;P90=float(sys.argv[3]) if len(sys.argv)>3 else 4.3;MAXS=float(sys.argv[4]) if len(sys.argv)>4 else 6.5;TCAP=float(sys.argv[5])/100 if len(sys.argv)>5 else .024
f=f'/home/claude/golf/lidar2/patches_{key}.json';PJ=json.load(open(f));P=PJ[key]
exec(open('/home/claude/golf/sc3/soften.py').read().split('def dec')[1].split('gl=green_list')[0].join(['def dec','']))
gl=green_list(key);H=hole_of_green(key)
for gi,g in enumerate(gl):
    x0,y0,nx,ny,z0,b,st=P[gi];Z=dec(b,nx,ny,z0,1000)
    m=np.zeros(Z.shape,np.uint8);cv2.fillPoly(m,[((g-[x0,y0])/st).round().astype(np.int32)],1);m=m>0
    GX,GY=np.meshgrid(x0+np.arange(nx)*st,y0+np.arange(ny)*st)
    A=np.c_[np.ones(m.sum()),GX[m],GY[m]];c=np.linalg.lstsq(A,Z[m],rcond=None)[0];s=np.hypot(c[1],c[2]);fz=min(1,TCAP/s) if s>0 else 1
    cx,cy=GX[m].mean(),GY[m].mean();zc=c[0]+c[1]*cx+c[2]*cy;plane=zc+fz*(c[1]*(GX-cx)+c[2]*(GY-cy))
    res=Z-(c[0]+c[1]*GX+c[2]*GY);rs=ndi.gaussian_filter(res,SIG/st)
    d=ndi.distance_transform_edt(~m)*st;w=np.clip(1-d/5,0,1);w=w*w*(3-2*w)
    def stats(Zn):
        a,b_=np.gradient(Zn,st);sl=np.hypot(a,b_)[m]*100;return np.median(sl),np.percentile(sl,90),sl.max()
    s0=stats(Z);best=None
    for k in np.linspace(1.0,0.1,19):
        Zn=Z*(1-w)+(plane+k*rs)*w;md,p9,mx=stats(Zn)
        if p9<=P90 and mx<=MAXS:best=(k,Zn,md,p9,mx);break
    if best is None:best=(0.1,Zn,md,p9,mx)
    k,Zn,md,p9,mx=best;zmin=float(Zn.min());q=np.round((Zn-zmin)*1000).astype(np.int64)
    P[gi]=[x0,y0,nx,ny,round(zmin,3),base64.b64encode(enc(q)).decode(),st]
    print('hole %2d  before med %.1f p90 %.1f max %.1f  ->  med %.1f p90 %.1f max %.1f  (tilt %.1f%% x%.2f, contours x%.2f)'%(H[gi]+1,*s0,md,p9,mx,s*100,fz,k))
json.dump(PJ,open(f,'w'),separators=(',',':'))
