"""Jack's 18 greens straight from the 2022 lidar (Cam: 'fully real'): inside each green the measured surface (light 0.75 yd smoothing
for point noise), blended over 4 yd into the existing patch outside; outside that the patch is unchanged."""
import json,numpy as np,cv2
from scipy import ndimage as ndi
from common2 import *
SH=json.load(open('shift.json'))['shift']
P,src,a,b=load_patches();new=[];rep=[]
for h in range(1,19):
    g=json.load(open('g%02d.json'%h));x0,y0,nx,ny,z0,b64,st=P[h-1]
    Zp=dec(b64,nx,ny,z0);XX,YY=np.meshgrid(x0+np.arange(nx)*st,y0+np.arange(ny)*st)
    Zl,ok=lidar_on(h,XX,YY,SH,.75,st)
    poly=np.array(g['poly']);m=np.zeros((ny,nx),np.uint8);cv2.fillPoly(m,[((poly-[x0,y0])/st).round().astype(np.int32)],1);m=m>0
    d=ndi.distance_transform_edt(~m)*st;w=np.clip(1-d/4,0,1);w=w*w*(3-2*w);w[~ok]=0
    ring=(d>2)&(d<6)&ok;off=np.median(Zp[ring]-Zl[ring])   # same datum as the patch at the green's edge
    Zn=Zp*(1-w)+(Zl+off)*w
    zmin=float(Zn.min());q=np.round((Zn-zmin)*1000).astype(np.int64)
    new.append([x0,y0,nx,ny,round(zmin,3),enc(q),st]);np.save('rb/new_%02d.npy'%h,Zn);np.save('rb/old_%02d.npy'%h,Zp)
    rep.append((h,round(float(off)*91.44,1),round(float(np.abs(Zn-Zp)[m].max())*91.44,1)))
print('hole, datum offset cm, biggest change inside the green cm');print(rep)
json.dump(new,open('rb/jacks_patches.json','w'),separators=(',',':'))
