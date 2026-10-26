import json,base64,numpy as np
from scipy.interpolate import griddata
from scipy import ndimage as ndi
from utm import to_course
GJ='/home/claude/golf-go/greens.js'
def load_patches():
    s=open(GJ).read();i=s.index('"jacks":');j=s.index(']]',i)+2;return json.loads(s[i+8:j]),s,i+8,j
def dec(b64,nx,ny,z0,sc=1000):
    bs=base64.b64decode(b64);r=[];v=0;m=1
    for c in bs:
        v+=(c&127)*m;m*=128
        if not c&128:r.append(v);v=0;m=1
    z=np.array(r,np.int64);res=np.where(z%2==1,-(z+1)//2,z//2).reshape(ny,nx);q=np.zeros((ny,nx),np.int64)
    for y in range(ny):
        for x in range(nx):
            p=0 if (x==0 and y==0) else (q[y,x-1] if y==0 else (q[y-1,x] if x==0 else q[y,x-1]+q[y-1,x]-q[y-1,x-1]))
            q[y,x]=p+res[y,x]
    return z0+q/sc
def enc(q):
    ny,nx=q.shape;p=np.zeros_like(q)
    p[0,1:]=q[0,:-1];p[1:,0]=q[:-1,0];p[1:,1:]=q[1:,:-1]+q[:-1,1:]-q[:-1,:-1]
    r=(q-p).ravel();z=np.where(r>=0,2*r,-2*r-1).astype(np.int64);out=bytearray()
    for v in z:
        v=int(v)
        while v>=128:out.append((v&127)|128);v>>=7
        out.append(v)
    return base64.b64encode(bytes(out)).decode()
D=np.load('/home/claude/jk/cd/pts_jacks.npz');S=json.load(open('/home/claude/jk/cd/summary.json'))['courses']['jacks']['points']
def points(h):
    gi=h-1;res=max(S[str(gi)],key=lambda r:S[str(gi)][r]['gdens']);k=lambda n:D[f'g{gi}|{res}|{n}']
    E=k('ox')+k('x')/100.;N=k('oy')+k('y')/100.;z=k('z')/1000./0.9144;cx,cy=to_course(E,N);return np.c_[cx,cy],z
def lidar_on(h,XX,YY,shift=(0,0),sig=.75,st=.5):
    P,z=points(h);Zl=griddata(P+np.array(shift),z,(XX,YY),method='linear');ok=~np.isnan(Zl)
    Zl=np.where(ok,Zl,np.nanmean(Zl));return ndi.gaussian_filter(Zl,sig/st),ok
