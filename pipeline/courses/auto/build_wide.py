"""Course-wide 5-yd lidar ground -> auto/<key>/wide_<key>.json. usage (from golf/): python3 auto/build_wide.py key"""
import numpy as np,json,cv2,base64,sys
from scipy import ndimage as ndi
sys.path.insert(0,'/home/claude/golf/lidar');from build_patches import enc
ST=5.0
for name in sys.argv[1:]:
    X=np.array(json.load(open('naip/xf.json'))[name]);A=X[:2,:2];t=X[2];Ai=np.linalg.inv(A)
    m=json.load(open(f'lidar_{name}.json'));W,S,E,N=m['ext'];Z=np.load(f'lidar/{name}.npy').astype(np.float32);h,w=Z.shape
    bad0=~np.isfinite(Z)|(Z<-500)
    if bad0.any():Z[bad0]=np.median(Z[~bad0])
    Z=ndi.gaussian_filter(Z,ST*.9144*.6)
    cs=np.array([[W,N],[E,N],[E,S],[W,S]])@A+t;x0=np.sort(cs[:,0])[1]+3;x1=np.sort(cs[:,0])[2]-3;y0=np.sort(cs[:,1])[1]+3;y1=np.sort(cs[:,1])[2]-3
    nx=int((x1-x0)/ST)+1;ny=int((y1-y0)/ST)+1;GX,GY=np.meshgrid(x0+np.arange(nx)*ST,y0+np.arange(ny)*ST)
    LL=np.stack([GX-t[0],GY-t[1]],-1)@Ai;px=((LL[...,0]-W)/(E-W)*w-.5).astype(np.float32);py=((N-LL[...,1])/(N-S)*h-.5).astype(np.float32)
    Zy=cv2.remap(Z,px,py,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)*1.09361
    bad=~np.isfinite(Zy)|(Zy<-500)
    if bad.any():print(name,'filling',bad.sum(),'bad cells');Zy[bad]=np.median(Zy[~bad])
    zmin=float(Zy.min());q=np.round((Zy-zmin)*100).astype(np.int64);b=enc(q)
    json.dump([round(float(x0),2),round(float(y0),2),ST,nx,ny,round(zmin,3),base64.b64encode(b).decode()],open(f'auto/{name}/wide_{name}.json','w'))
    print(name,nx,ny,len(b)//1024,'KB','z range yd',round(zmin,1),round(float(Zy.max()),1))
