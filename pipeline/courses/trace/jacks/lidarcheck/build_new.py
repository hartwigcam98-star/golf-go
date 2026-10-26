import json,numpy as np,cv2
from scipy import ndimage as ndi
from matplotlib.path import Path
from course import load
from common2 import load_patches,dec,enc,lidar_on
from geo import segdist
SH=json.load(open('shift.json'))['shift']
H,P,*_=load();D={int(k):np.array(v,float) for k,v in json.load(open('drawn/polys.json')).items()}
LP,src,a,b=load_patches()
st=.25
def raster(poly,X0,Y0,nx,ny,s):
    m=np.zeros((ny,nx),np.uint8);cv2.fillPoly(m,[((np.asarray(poly)-[X0,Y0])/s).round().astype(np.int32)],1);return m>0
newpolys={};newpatch=[];pins={};rep=[]
for h in range(1,19):
    poly=D[h]
    # 1. greens don't take bunker sand: cut any bunker (+0.6 yd) out of the outline
    lo=poly.min(0)-3;hi=poly.max(0)+3;nx=int((hi[0]-lo[0])/st)+1;ny=int((hi[1]-lo[1])/st)+1
    m=raster(poly,lo[0],lo[1],nx,ny,st);cut=0
    for bp in P['bunker']:
        bp=np.array(bp)
        if bp[:,0].max()<lo[0] or bp[:,0].min()>hi[0] or bp[:,1].max()<lo[1] or bp[:,1].min()>hi[1]:continue
        bm=ndi.binary_dilation(raster(bp,lo[0],lo[1],nx,ny,st),iterations=int(.6/st));cut+=int((m&bm).sum());m&=~bm
    if cut:
        cs,_=cv2.findContours(m.astype(np.uint8),cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);cn=max(cs,key=cv2.contourArea)[:,0,:].astype(np.float32)
        cn=cv2.approxPolyDP(cn,1.0,True)[:,0,:];poly=np.c_[lo[0]+cn[:,0]*st,lo[1]+cn[:,1]*st].round(1)
    newpolys[h]=poly
    # 2. patch: the old one, grown if the new green (+10 yd) runs past it
    x0,y0,nx,ny,z0,b64,ps=LP[h-1];Zp=dec(b64,nx,ny,z0)
    gx0=min(x0,np.floor(poly[:,0].min()-10));gy0=min(y0,np.floor(poly[:,1].min()-10))
    gx1=max(x0+(nx-1)*ps,np.ceil(poly[:,0].max()+10));gy1=max(y0+(ny-1)*ps,np.ceil(poly[:,1].max()+10))
    NX=int(round((gx1-gx0)/ps))+1;NY=int(round((gy1-gy0)/ps))+1;XX,YY=np.meshgrid(gx0+np.arange(NX)*ps,gy0+np.arange(NY)*ps)
    Zl,ok=lidar_on(h,XX,YY,SH,.75,ps)
    ix=int(round((x0-gx0)/ps));iy=int(round((y0-gy0)/ps));old=np.zeros((NY,NX),bool);old[iy:iy+ny,ix:ix+nx]=True
    Zbase=np.zeros((NY,NX));Zbase[iy:iy+ny,ix:ix+nx]=Zp
    off=np.median((Zbase-Zl)[old&ok])                                   # lidar onto the patch's datum
    Zbase=np.where(old,Zbase,Zl+off)                                      # grown area: lidar ground
    gm=raster(poly,gx0,gy0,NX,NY,ps);d=ndi.distance_transform_edt(~gm)*ps;w=np.clip(1-d/4,0,1);w=w*w*(3-2*w);w[~ok]=0
    Zn=Zbase*(1-w)+(Zl+off)*w;zmin=float(Zn.min());q=np.round((Zn-zmin)*1000).astype(np.int64)
    newpatch.append([float(gx0),float(gy0),NX,NY,round(zmin,3),enc(q),ps])
    # 3. pin: keep it unless it is within 4 yd of the new edge; then the nearest spot 4+ yd in with slope under 2%
    pin=np.array(H[h-1]['pin']);dd=segdist(pin,poly)
    if not Path(poly).contains_point(pin) or dd<4:
        gy,gx=np.gradient(ndi.gaussian_filter(Zn,.5/ps),ps);sl=np.hypot(gx,gy)*100
        din=ndi.distance_transform_edt(gm)*ps;cand=(din>=4.5)&(sl<2.0)
        if not cand.any():cand=(din>=4.5)&(sl<np.percentile(sl[din>=4.5],20))
        j=np.argmin(np.where(cand,np.hypot(XX-pin[0],YY-pin[1]),1e9));pn=[round(float(XX.flat[j]),1),round(float(YY.flat[j]),1)]
        pins[h]=pn;rep.append((h,'pin moved',list(pin),'->',pn,'%.1f%%'%sl.flat[j]))
    rep.append((h,'patch grown' if (NX,NY)!=(nx,ny) else 'patch same','bunker cut %d cells'%cut if cut else ''))
json.dump({'polys':{h:p.tolist() for h,p in newpolys.items()},'patches':newpatch,'pins':pins},open('drawn/build.json','w'))
for r in rep:
    if 'same' not in r[1] or r[2]:print(*r)
