import json,numpy as np,sys
import os;sys.path.insert(0,os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','lidar2'))
from utm import fwd,inv
X=np.array(json.load(open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','naip','xf.json')))['troy']);A=X[:2,:2];t=X[2];Ai=np.linalg.inv(A)
S=json.load(open('data/summary.json'))['courses']['troy'];C=np.array(S['ctrl'])
_x,_y=fwd(C[:,0],C[:,1],15);DX,DY=(C[:,2]-_x).mean(),(C[:,3]-_y).mean()
D=np.load('data/trees_troy.npz');x0u=float(D['x0']);y1u=float(D['y1'])
def c2u(cx,cy):
    ll=(np.stack([np.asarray(cx,float),np.asarray(cy,float)],-1)-t)@Ai;ux,uy=fwd(ll[...,0],ll[...,1],15);return ux+DX,uy+DY
def u2c(ux,uy):
    lon,lat=inv(np.asarray(ux)-DX,np.asarray(uy)-DY,15);return np.stack([lon,lat],-1)@A+t
def trees():
    import base64,re
    s=open(os.path.join(os.path.dirname(os.path.abspath(__file__)),'..','..','..','trees.js')).read();i=s.index('"troy":');j=s.index('}',i);d=json.loads(s[i+7:j+1])
    xy=np.frombuffer(base64.b64decode(d['xy']),np.int16).reshape(-1,2)/2.;r=np.frombuffer(base64.b64decode(d['r']),np.uint8)
    return xy,(r&127)/10.,r>>7,d
def naip_grid(cy,cx,sz,step=1.0):
    """NAIP photo resampled onto the 1-m UTM chm grid crop (rows cy.., cols cx..)"""
    import cv2
    jj,ii=np.mgrid[0:sz,0:sz]*step;ux=x0u+cx+ii+.5;uy=y1u-cy-jj-.5
    lon,lat=inv(ux-DX,uy-DY,15);out=np.zeros(ux.shape+(3,),np.uint8)
    for k in (0,1):
        m=json.load(open(f'nd/naip_troy{k}.json'));W_,S_,E_,N_=m['ext'];I=cv2.imread(f'nd/naip_troy{k}.jpg');h,w=I.shape[:2]
        px=((lon-W_)/(E_-W_)*w-.5).astype(np.float32);py=((N_-lat)/(N_-S_)*h-.5).astype(np.float32)
        s=cv2.remap(I,px,py,cv2.INTER_LINEAR,borderValue=(0,0,0));ok=(s.sum(-1)>0)&(out.sum(-1)==0);out[ok]=s[ok]
    return out
