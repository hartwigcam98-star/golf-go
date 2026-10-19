"""Soften greens whose lidar surface reads too steep: cap the plane tilt and scale the undulation until the median slope
inside the outline is about TARGET, feathered out over 5 yd. usage: python3 soften.py key maxMedian target"""
import sys,json,numpy as np,cv2,base64;sys.path.insert(0,'/home/claude/golf/lidar2');sys.path.insert(0,'/home/claude/golf/lidar')
from common import green_list,hole_of_green
from build_patches import enc
from scipy import ndimage as ndi
key=sys.argv[1];MX=float(sys.argv[2]);TG=float(sys.argv[3]);TILT=.022
f=f'/home/claude/golf/lidar2/patches_{key}.json';PJ=json.load(open(f));P=PJ[key]
def dec(b64,nx,ny,z0,sc):
    bs=base64.b64decode(b64);q=np.zeros(nx*ny,np.int64);k=0
    for i in range(nx*ny):
        v=0;m=1
        while True:
            c=bs[k];k+=1;v+=(c&127)*m;m*=128
            if not c&128:break
        r=-(v+1)//2 if v%2 else v//2;x=i%nx
        p=0 if i==0 else (q[i-1] if i<nx else (q[i-nx] if x==0 else q[i-1]+q[i-nx]-q[i-nx-1]))
        q[i]=p+r
    return (z0+q/sc).reshape(ny,nx)
gl=green_list(key);H=hole_of_green(key);report=[]
for gi,g in enumerate(gl):
    x0,y0,nx,ny,z0,b,st=P[gi];Z=dec(b,nx,ny,z0,1000)
    m=np.zeros(Z.shape,np.uint8);cv2.fillPoly(m,[((g-[x0,y0])/st).round().astype(np.int32)],1);m=m>0
    gy,gx=np.gradient(Z,st);med=np.median(np.hypot(gx,gy)[m])*100;report.append((H[gi]+1,round(med,1)))
    if med<=MX:continue
    GX,GY=np.meshgrid(x0+np.arange(nx)*st,y0+np.arange(ny)*st)
    A=np.c_[np.ones(m.sum()),GX[m],GY[m]];c=np.linalg.lstsq(A,Z[m],rcond=None)[0]
    plane=c[0]+c[1]*GX+c[2]*GY;res=Z-plane;s=np.hypot(c[1],c[2]);f_=min(1,TILT/s) if s>0 else 1
    cx,cy=GX[m].mean(),GY[m].mean();zc=c[0]+c[1]*cx+c[2]*cy;plane2=zc+f_*(c[1]*(GX-cx)+c[2]*(GY-cy))
    d=ndi.distance_transform_edt(~m)*st;w=np.clip(1-d/5,0,1);w=w*w*(3-2*w)
    best=None
    for k in np.linspace(.2,1,17):
        Zn=Z*(1-w)+(plane2+k*res)*w;a,b_=np.gradient(Zn,st);md=np.median(np.hypot(a,b_)[m])*100
        if best is None or abs(md-TG)<abs(best[0]-TG):best=(md,k,Zn)
    md,k,Zn=best;zmin=float(Zn.min());q=np.round((Zn-zmin)*1000).astype(np.int64)
    P[gi]=[x0,y0,nx,ny,round(zmin,3),base64.b64encode(enc(q)).decode(),st]
    print('hole',H[gi]+1,'median %.1f%% -> %.1f%%'%(med,md),'tilt %.1f%% x%.2f'%(s*100,f_),'undulation x%.2f'%k)
print('medians',report)
json.dump(PJ,open(f,'w'),separators=(',',':'))
