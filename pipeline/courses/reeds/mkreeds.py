"""Cattail / reed stands from the lidar canopy: python3 mkreeds.py key runDir -> /home/claude/reeds/reeds_<key>.json (+ preview png)
A 2-yd cell is a stand when the vegetation over it is 0.5-3.5 m tall and nothing tree-tall is near, inside the mapped water or
wetland, or within 6 yd of the shore at 1.0-3.5 m (taller than mown or native grass)."""
import json,math,sys,base64,numpy as np,cv2
sys.path.insert(0,'/home/claude/golf/lidar2')
from utm import fwd
from scipy import ndimage as ndi
key,R=sys.argv[1],sys.argv[2].rstrip('/')+'/'
W=json.load(open(f'/home/claude/reeds/{key}_w.json'));lat0,lon0=W['origin']
K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
D=np.load(R+f'chm_{key}.npz');top=D['top'].astype(np.float32);gr=D['ground'].astype(np.float32);cnt=D['cnt'];x0u=float(D['x0']);y1u=float(D['y1']);epsg=int(D['epsg'])
zone=epsg-32600 if epsg>32600 else epsg-26900
# ground under everything: the nearest ground return (water and dense stands have none)
bad=~np.isfinite(gr);idx=ndi.distance_transform_edt(bad,return_distances=False,return_indices=True);gf=gr[tuple(idx)]
gf=cv2.GaussianBlur(gf,(0,0),2.0)
veg=np.where(cnt>0,top-gf,np.nan).astype(np.float32);veg=np.where(np.isfinite(veg),veg,-1)
vegm=cv2.medianBlur(np.clip(veg*10+10,0,255).astype(np.uint8),3).astype(np.float32)/10-1   # metres, -1 = no returns
tall=ndi.maximum_filter(veg,size=9)    # anything over 5 m within ~4 m
# course-yard grid
polys=lambda L_:[np.array(p) for p in L_ if len(p)>2]
WP=polys(W['water'])+polys(W['swater'])+polys(W['wetland'])
allp=np.concatenate(polys(W['mown']));x0,y0=np.floor(allp.min(0)-300);x1,y1=np.ceil(allp.max(0)+300)   # the course and what can be seen from it
st=2.0;nx=int((x1-x0)/st)+1;ny=int((y1-y0)/st)+1
gx,gy=np.meshgrid(x0+(np.arange(nx)+.5)*st,y0+(np.arange(ny)+.5)*st)
ux,uy=fwd(gx/K+lon0,lat0-gy/L,zone)
px=(ux-x0u).astype(np.float32);py=(y1u-uy).astype(np.float32)
V=cv2.remap(vegm,px,py,cv2.INTER_NEAREST,borderValue=-1);TT=cv2.remap(tall,px,py,cv2.INTER_NEAREST,borderValue=99)
def rast(PL,dil=0):
    m=np.zeros((ny,nx),np.uint8)
    for p in PL:cv2.fillPoly(m,[((p-[x0,y0])/st).round().astype(np.int32)],1)
    if dil:m=cv2.dilate(m,np.ones((2*dil+1,2*dil+1),np.uint8))
    return m>0
inW=rast(polys(W['water'])+polys(W['swater']));inWet=rast(polys(W['wetland']))&~inW;fringe=rast(WP,3)&~inW&~inWet;mown=rast(polys(W['mown'])+polys(W['bunker']),1)
# the photo: open water reads dark; lidar returns off the water surface are not stands
nm=json.load(open(R+f'naip_{key}.json'));NI=cv2.imread(R+f'naip_{key}.jpg');Wn,Sn,En,Nn=nm['ext'];hn,wn=NI.shape[:2]
pxn=((gx/K+lon0-Wn)/(En-Wn)*wn).astype(np.float32);pyn=((Nn-(lat0-gy/L))/(Nn-Sn)*hn).astype(np.float32)
PH=cv2.remap(cv2.GaussianBlur(NI,(0,0),1.5),pxn,pyn,cv2.INTER_LINEAR).astype(np.float32)/255
LUM=.11*PH[...,0]+.59*PH[...,1]+.3*PH[...,2];EXG=(2*PH[...,1]-PH[...,0]-PH[...,2])/(PH.sum(-1)+1e-3)
dark=(LUM<.3)|((EXG<.04)&(LUM<.45))   # open water: dark, or grey-blue with glints
green=(EXG>.06)&(LUM>.3)
reed=((inW&(((V>=.5)&(V<=3.5))|(green&(V>=.2)&(V<=3.5))))|((inWet&(V>=.8)&(V<=3.5))|(fringe&(V>=1.0)&(V<=3.5))))&(TT<5)&~mown&~dark   # wet meadows: only growth taller than the grasses
# clean: drop specks under 3 cells, fill pinholes
reed=ndi.binary_closing(reed,np.ones((2,2)))&(inW|inWet|fringe)&~mown
lab,n=ndi.label(reed);sz=ndi.sum(reed,lab,range(1,n+1));reed&=np.isin(lab,1+np.where(sz>=3)[0])
H=np.where(reed,np.clip(np.round(V*2)*5,10,30),0).astype(np.uint8)   # stand height in dm, to the half metre
# near the water, where the scan shows nothing over 3 m, the photo's "trees" are cattails, shrubs or grass: 1 = no tree here
notree=rast(WP,6)&(ndi.maximum_filter(V,size=3)<3.0)&(H==0)
H[notree]=1
f=H.ravel();out=bytearray();i=0;N=len(f)
def vi(x):
    while True:
        b=x&127;x>>=7
        if x:out.append(b|128)
        else:out.append(b);break
# runs: varint gap of zeros, varint run length, one value byte (the run is all that value)
while i<N:
    j=i
    while j<N and f[j]==0:j+=1
    if j>=N:break
    k=j
    while k<N and f[k]==f[j]:k+=1
    vi(j-i);vi(k-j);out.append(int(f[j]));i=k
E={'x0':float(x0),'y0':float(y0),'st':st,'nx':nx,'ny':ny,'d':base64.b64encode(bytes(out)).decode()}
json.dump(E,open(f'/home/claude/reeds/reeds_{key}.json','w'))
print(key,'cells',int(reed.sum()),'area sq yd',int(reed.sum()*st*st),'in water',int((reed&inW).sum()),'fringe',int((reed&fringe).sum()),'bytes',len(out),'grid',nx,ny)
# preview over the NAIP photo
try:
    nm=json.load(open(R+f'naip_{key}.json'));im=cv2.imread(R+f'naip_{key}.jpg');Wn,Sn,En,Nn=nm['ext'];h,w=im.shape[:2]
    pxn=((gx/K+lon0-Wn)/(En-Wn)*w).astype(np.float32);pyn=((Nn-(lat0-gy/L))/(Nn-Sn)*h).astype(np.float32)
    ph=cv2.remap(im,pxn,pyn,cv2.INTER_LINEAR)
    ov=ph.copy();ov[reed]=(0.5*ov[reed]+0.5*np.array([0,140,255])).astype(np.uint8)
    for p in WP:cv2.polylines(ov,[((p-[x0,y0])/st).round().astype(np.int32)],True,(255,120,0),1)
    big=cv2.resize(np.hstack([ph,ov]),None,fx=1.0,fy=1.0);cv2.imwrite(f'/home/claude/reeds/prev_{key}.jpg',big,[cv2.IMWRITE_JPEG_QUALITY,85])
    vv=np.clip((V+1)*60,0,255).astype(np.uint8);cv2.imwrite(f'/home/claude/reeds/veg_{key}.jpg',cv2.applyColorMap(vv,cv2.COLORMAP_JET))
except Exception as e:print('preview',e)
