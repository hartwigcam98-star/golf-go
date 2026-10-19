"""Photo + point hillshade + patch hillshade for greens: python3 gview.py key runDir out.jpg hole [hole...]"""
import sys,base64;sys.path.insert(0,'/home/claude/golf/lidar2')
from common import *
from scipy.interpolate import griddata
name,R,out=sys.argv[1],sys.argv[2].rstrip('/')+'/',sys.argv[3];holes=[int(h) for h in sys.argv[4:]]
gl=green_list(name);H=hole_of_green(name);P=load_pts(name);PJ=json.load(open(f'/home/claude/golf/lidar2/patches_{name}.json'))[name]
C=json.load(open(f'/home/claude/golf/auto/{name}/{name}_course.json'))
X=np.array(XF[name]);A=X[:2,:2];t=X[2]
meta=json.load(open(R+f'naip_{name}.json'));W,S,E,N=meta['ext'];im=cv2.imread(R+f'naip_{name}.jpg');h,w=im.shape[:2]
def dec(b64,nx,ny,z0):
    bs=base64.b64decode(b64);q=np.zeros(nx*ny,np.int64);k=0
    for i in range(nx*ny):
        v=0;m=1
        while True:
            c=bs[k];k+=1;v+=(c&127)*m;m*=128
            if not c&128:break
        r=-(v+1)//2 if v%2 else v//2;x=i%nx
        p=0 if i==0 else (q[i-1] if i<nx else (q[i-nx] if x==0 else q[i-1]+q[i-nx]-q[i-nx-1]))
        q[i]=p+r
    return (z0+q/1000).reshape(ny,nx)
rows=[]
for hn in holes:
    pin=C['holes'][hn-1]['pin'];i=next((j for j,g in enumerate(gl) if inp(g,*pin)),None)
    if i is None:print('no green for',hn);continue
    g=gl[i];c=g.mean(0);st=.25;x0,y0=c-35;n=int(70/st);GX,GY=np.meshgrid(x0+np.arange(n)*st,y0+np.arange(n)*st)
    LL=np.stack([GX-t[0],GY-t[1]],-1)@np.linalg.inv(A);px=((LL[...,0]-W)/(E-W)*w).astype(np.float32);py=((N-LL[...,1])/(N-S)*h).astype(np.float32)
    ph=cv2.remap(im,px,py,cv2.INTER_LINEAR);panels=[ph]
    if i in P:
        d=max(P[i].values(),key=lambda d:len(d['x']));Z=griddata((d['x'],d['y']),d['z'],(GX,GY),method='linear');Z=np.where(np.isfinite(Z),Z,np.nanmedian(Z))
        gy,gx=np.gradient(Z,st);panels.append(cv2.cvtColor(np.clip(128+(-gx-gy)*300,0,255).astype(np.uint8),cv2.COLOR_GRAY2BGR))
    px0,py0,nx,ny,z0,b,pst=PJ[i];Zp=dec(b,nx,ny,z0);Zr=cv2.remap(Zp.astype(np.float32),((GX-px0)/pst).astype(np.float32),((GY-py0)/pst).astype(np.float32),cv2.INTER_LINEAR)
    gy,gx=np.gradient(Zr,st);sl=np.clip(np.hypot(gx,gy)*100*25,0,255).astype(np.uint8);panels.append(cv2.applyColorMap(sl,cv2.COLORMAP_JET))
    for I in panels:
        cv2.polylines(I,[((g-[x0,y0])/st).astype(np.int32)],True,(0,255,0),2)
        for B in C['polys']['bunker']:cv2.polylines(I,[((np.array(B)-[x0,y0])/st).astype(np.int32)],True,(0,255,255),1)
        cv2.circle(I,(int((pin[0]-x0)/st),int((pin[1]-y0)/st)),5,(0,0,255),-1)
    cv2.putText(panels[0],str(hn),(8,30),cv2.FONT_HERSHEY_SIMPLEX,1,(255,255,255),2)
    while len(panels)<3:panels.append(np.zeros_like(ph))
    rows.append(np.hstack(panels))
cv2.imwrite(out,cv2.resize(np.vstack(rows),None,fx=.5,fy=.5),[cv2.IMWRITE_JPEG_QUALITY,85])
