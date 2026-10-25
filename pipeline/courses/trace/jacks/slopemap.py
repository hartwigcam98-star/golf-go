import sys,json,base64,numpy as np,cv2
sys.path.insert(0,'/home/claude/golf/lidar2');from common import *

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

name='jacks';gl=green_list(name);PJ=json.load(open(f'/home/claude/golf/lidar2/patches_{name}.json'))[name];C=json.load(open(f'/home/claude/golf/auto/{name}/{name}_course.json'))
tiles=[]
for hn in range(1,19):
    pin=C['holes'][hn-1]['pin'];i=next(j for j,g in enumerate(gl) if inp(g,*pin));g=gl[i];px0,py0,nx,ny,z0,b,pst=PJ[i];Z=dec(b,nx,ny,z0)
    gy,gx=np.gradient(Z,pst);sl=np.hypot(gx,gy)*100
    c=g.mean(0);x0,y0=c-22;n=int(44/pst)
    xs=((x0+np.arange(n)*pst-px0)/pst).astype(np.float32);ys=((y0+np.arange(n)*pst-py0)/pst).astype(np.float32);MX,MY=np.meshgrid(xs,ys)
    S=cv2.remap(sl.astype(np.float32),MX,MY,cv2.INTER_LINEAR);Zr=cv2.remap(Z.astype(np.float32),MX,MY,cv2.INTER_LINEAR)
    col=np.zeros((n,n,3),np.uint8);t=np.clip(S/5,0,1)
    col[...,1]=(200*(1-np.clip((t-.5)*2,0,1))).astype(np.uint8);col[...,2]=(255*np.clip(t*2,0,1)).astype(np.uint8);col[...,0]=40
    m=np.zeros((n,n),np.uint8);cv2.fillPoly(m,[((g-[x0,y0])/pst).astype(np.int32)],1)
    col[m==0]=(col[m==0]*0.25).astype(np.uint8)
    # contour lines every 5 cm
    lv=np.floor(Zr*20);edge=(np.abs(np.diff(lv,axis=0,prepend=lv[:1]))+np.abs(np.diff(lv,axis=1,prepend=lv[:,:1])))>0
    col[edge&(m>0)]=(255,255,255)
    cv2.polylines(col,[((g-[x0,y0])/pst).astype(np.int32)],True,(255,255,255),1)
    cv2.circle(col,(int((pin[0]-x0)/pst),int((pin[1]-y0)/pst)),3,(255,0,255),-1)
    col=cv2.resize(col,(200,200),interpolation=cv2.INTER_NEAREST);cv2.putText(col,str(hn),(5,20),0,.7,(255,255,255),2);tiles.append(col)
key=np.zeros((30,1200,3),np.uint8);cv2.putText(key,'green = gentle   yellow ~2.5%   red = 5%+   white lines = 5 cm contours   pink = pin',(8,20),0,.55,(255,255,255),1)
cv2.imwrite(sys.argv[1],np.vstack([np.vstack([np.hstack(tiles[r:r+6]) for r in (0,6,12)]),key]))
