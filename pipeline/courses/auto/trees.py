"""NAIP aerial photo -> tree crowns -> R3NAIP entry (auto/<key>/naip_<key>.json). usage (from golf/): python3 auto/trees.py key runDir"""
import numpy as np,json,cv2,sys,base64,math
from scipy import ndimage as ndi
name,R=sys.argv[1],sys.argv[2].rstrip('/')+'/'
X=np.array(json.load(open('/home/claude/golf/naip/xf.json'))[name]);meta=json.load(open(f'{R}naip_{name}.json'));W,S,E,N=meta['ext']
im=cv2.cvtColor(cv2.imread(f'{R}naip_{name}.jpg'),cv2.COLOR_BGR2RGB).astype(np.float32)/255;h,w=im.shape[:2]
A=X[:2,:2];t=X[2]
cs=np.stack([np.array([W,E,E,W]),np.array([N,N,S,S])],-1)@A+t;x0,y0=cs.min(0);x1,y1=cs.max(0)
RES=.8
gx=np.arange(x0,x1,RES);gy=np.arange(y0,y1,RES);GX,GY=np.meshgrid(gx,gy)
LL=(np.stack([GX-t[0],GY-t[1]],-1))@np.linalg.inv(A)
px=((LL[...,0]-W)/(E-W)*w).astype(np.float32);py=((N-LL[...,1])/(N-S)*h).astype(np.float32)
G=cv2.remap(im,px,py,cv2.INTER_LINEAR,borderMode=cv2.BORDER_CONSTANT,borderValue=(1,1,1))
R_,G_,B_=G[...,0],G[...,1],G[...,2];L=.3*R_+.59*G_+.11*B_;ExG=2*G_-R_-B_
Ls=cv2.blur(L,(5,5));sd=np.sqrt(np.maximum(cv2.blur(L*L,(7,7))-cv2.blur(L,(7,7))**2,0))
C=json.load(open(f'/home/claude/golf/auto/{name}/{name}_course.json'))['polys']
def fill(polys):
    m=np.zeros(L.shape,np.uint8)
    for P in polys:
        pts=np.array([[(p[0]-x0)/RES,(p[1]-y0)/RES] for p in P],np.int32);cv2.fillPoly(m,[pts],1)
    return m
wat=fill(C.get('water',[]))
wat=ndi.binary_dilation(wat>0,iterations=3)|((cv2.blur(L,(9,9))<.33)&(np.sqrt(np.maximum(cv2.blur(L*L,(9,9))-cv2.blur(L,(9,9))**2,0))<.022))
mownP=fill(C.get('fairway',[])+C.get('green',[])+C.get('tee',[]))
fw=fill(C.get('fairway',[])+C.get('green',[]))
Lf=float(np.median(Ls[fw>0])) if (fw>0).sum()>500 else .62
k=(Lf/.64)**.6
print('fairway L %.3f scale %.2f'%(Lf,k))
tree=((Ls<.47*k)&(ExG>.05*k)&((sd>.03*k)|(Ls<.36*k)))|((Ls<.40*k)&(ExG>.09*k))
tree&=~wat;tree=ndi.binary_opening(tree,iterations=1);tree=ndi.binary_closing(tree,iterations=2)
filled=ndi.binary_fill_holes(tree);gap=filled&~tree
mown=gap&(Ls>=.47*k)&(sd<.035);lab,n=ndi.label(mown)
if n:
    sz=ndi.sum(mown,lab,range(1,n+1));big=np.isin(lab,1+np.where(sz*RES*RES>40)[0]);big=ndi.binary_dilation(big,iterations=2)
    filled&=~(big&gap)
tree=filled&~wat&~(mownP>0)
lab,n=ndi.label(tree);sizes=ndi.sum(tree,lab,range(1,n+1));tree=np.isin(lab,1+np.where(sizes*RES*RES>12)[0])
dt=ndi.distance_transform_edt(tree)*RES;trees=[]
H,Wd=dt.shape;RMAX=7.5;RMIN=1.6
order=np.argsort(-dt,axis=None);taken=np.zeros(dt.shape,bool)
for idx in order:
    v=dt.flat[idx]
    if v<RMIN:break
    j,i=divmod(idx,Wd)
    if taken[j,i]:continue
    r=min(v,RMAX);trees.append([float(gx[i]),float(gy[j]),round(r,2)])
    rr=int(r*.85/RES)+1;j0,j1,i0,i1=max(0,j-rr),min(H,j+rr+1),max(0,i-rr),min(Wd,i+rr+1)
    yy,xx=np.ogrid[j0:j1,i0:i1];taken[j0:j1,i0:i1]|=((yy-j)**2+(xx-i)**2)<=rr*rr
out=[]
for x,y,r in trees:
    i=int((x-x0)/RES);j=int((y-y0)/RES);kk=max(1,int(r*.6/RES));p=(slice(max(0,j-kk),j+kk+1),slice(max(0,i-kk),i+kk+1))
    con=1 if (L[p].mean()<.31*k and (B_[p].mean()-R_[p].mean())>-.005) else 0
    out.append([round(x,1),round(y,1),r,con])
holes=json.load(open(f'/home/claude/golf/auto/{name}/{name}_course.json'))['holes']
segs=np.array([(a[0],a[1],b[0],b[1]) for hh in holes for a,b in zip(hh['line'],hh['line'][1:])])
O=np.array(out);ax,ay,bx,by=segs.T;dx=bx-ax;dy=by-ay;l=dx*dx+dy*dy
tt=np.clip(((O[:,0,None]-ax)*dx+(O[:,1,None]-ay)*dy)/np.maximum(l,1e-9),0,1)
dmin=np.hypot(O[:,0,None]-ax-dx*tt,O[:,1,None]-ay-dy*tt).min(1)
keep=[o for o,d in zip(out,dmin) if d<=380]
xy=np.array([[round(o[0]*2),round(o[1]*2)] for o in keep],np.int16).ravel()
rb=np.array([min(127,round(o[2]*10))|(o[3]<<7) for o in keep],np.uint8)
ex=[round(min(o[0] for o in keep),1),round(min(o[1] for o in keep),1),round(max(o[0] for o in keep),1),round(max(o[1] for o in keep),1)]
json.dump({'n':len(keep),'xy':base64.b64encode(xy.tobytes()).decode(),'r':base64.b64encode(rb.tobytes()).decode(),'ext':ex},open(f'/home/claude/golf/auto/{name}/naip_{name}.json','w'))
print(name,'detected',len(out),'kept',len(keep),'conifer share %.2f'%(sum(o[3] for o in keep)/max(1,len(keep))),'mean r %.2f'%np.mean([o[2] for o in keep]))
vis=(G*255).astype(np.uint8).copy();vis[tree]=(vis[tree]*.6+np.array([255,0,0])*.4).astype(np.uint8)
for x,y,r,c in keep:cv2.circle(vis,(int((x-x0)/RES),int((y-y0)/RES)),max(1,int(r/RES)),(255,255,0) if c else (0,255,255),1)
cv2.imwrite(f'/home/claude/golf/auto/{name}/trees_{name}.jpg',cv2.cvtColor(cv2.resize(vis,(vis.shape[1]//2,vis.shape[0]//2)),cv2.COLOR_RGB2BGR),[cv2.IMWRITE_JPEG_QUALITY,80])
