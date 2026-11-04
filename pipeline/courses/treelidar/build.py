"""lidar trees -> filter (photo greenness, not a roof) -> conifer flag -> R3NAIP.troy.L"""
from common import *
import cv2,base64
from scipy import ndimage as ndi
S=np.load('seg_troy.npz');lab=np.load('lab_troy.npy');n=int(S['n'])
PH=naip_grid(0,0,3000)[:, :2000].astype(np.float32)/255 if False else None
H,W=lab.shape
ph=np.zeros((H,W,3),np.float32)
for r0 in range(0,H,1000):
    blk=naip_grid(r0,0,max(W,1000))[:min(1000,H-r0),:W].astype(np.float32)/255;ph[r0:r0+blk.shape[0]]=blk
np.save('ph_troy.npy',(ph*255).astype(np.uint8))
B,G,R=ph[...,0],ph[...,1],ph[...,2];sm=B+G+R+1e-3
exg=(2*G-R-B)/sm;L=.11*B+.59*G+.3*R
# crown core (inner 70%) stats
idx=np.arange(1,n+1)
mexg=ndi.mean(exg,lab,idx);mL=ndi.mean(L,lab,idx);mBR=ndi.mean(B-R,lab,idx)
chm=D['chm']/10.;sd=ndi.standard_deviation(ndi.gaussian_filter(chm,.7),lab,idx)
np.savez('stats_troy.npz',exg=mexg,L=mL,br=mBR,sd=sd)
print('exg pct',np.percentile(mexg,[5,10,25,50,75]).round(3),'L',np.percentile(mL,[5,50,95]).round(2),'sd',np.percentile(sd,[5,25,50]).round(2))
