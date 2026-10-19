import numpy as np,json,cv2,base64,sys
from scipy import ndimage as ndi
sys.path.insert(0,'lidar')
GG=json.load(open('lidar/game_greens.json'));M=14;SIG=1.3
def sampler(name):
    X=np.array(json.load(open('naip/xf.json'))[name]);A=X[:2,:2];t=X[2];Ai=np.linalg.inv(A)
    m=json.load(open(f'lidar_{name}.json'));W,S,E,N=m['ext'];Z=ndi.gaussian_filter(np.load(f'lidar/{name}.npy').astype(np.float32),SIG);h,w=Z.shape
    def s(GX,GY):
        LL=np.stack([GX-t[0],GY-t[1]],-1)@Ai;px=((LL[...,0]-W)/(E-W)*w-.5).astype(np.float32);py=((N-LL[...,1])/(N-S)*h-.5).astype(np.float32)
        return cv2.remap(Z,px,py,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)*1.09361
    return s
def enc(q):
    ny,nx=q.shape;p=np.zeros_like(q)
    p[0,1:]=q[0,:-1];p[1:,0]=q[:-1,0];p[1:,1:]=q[1:,:-1]+q[:-1,1:]-q[:-1,:-1]
    r=(q-p).ravel();z=np.where(r>=0,2*r,-2*r-1).astype(np.int64);out=bytearray()
    for v in z:
        while v>=128:out.append((v&127)|128);v>>=7
        out.append(v)
    return bytes(out)
def inp(P,x,y):return cv2.pointPolygonTest(np.array(P,np.float32),(float(x),float(y)),False)>=0
if __name__=='__main__':
    res={};tot=0
    for name,D in GG.items():
        s=sampler(name);pats=[];seen=set()
        for p in D['pins']:
            gi=next((i for i,P in enumerate(D['greens']) if inp(P,*p)),None)
            if gi is None:gi=min(range(len(D['greens'])),key=lambda i:np.hypot(*(np.mean(D['greens'][i],0)-p)))
            if gi in seen:continue
            seen.add(gi);a=np.array(D['greens'][gi]);x0,y0=np.floor(a.min(0)-M);x1,y1=np.ceil(a.max(0)+M)
            nx=int(x1-x0)+1;ny=int(y1-y0)+1;GX,GY=np.meshgrid(x0+np.arange(nx),y0+np.arange(ny));Zy=s(GX.astype(np.float64),GY.astype(np.float64))
            zmin=float(Zy.min());q=np.round((Zy-zmin)*1000).astype(np.int64);b=enc(q)
            pats.append([float(x0),float(y0),nx,ny,round(zmin,3),base64.b64encode(b).decode()]);tot+=len(b)
        res[name]=pats;print(name,len(pats),'patches',sum(len(p[5]) for p in pats)//1024,'KB b64')
    open('three/r3lidar.js','w').write('// green surrounds from USGS 3DEP lidar (public domain), 1-yd grids in course yards: [x0,y0,nx,ny,zmin,varint residuals in 1/1000 yd]\nconst LIDG='+json.dumps(res,separators=(',',':'))+';\n')
    print('total KB',tot//1024)

