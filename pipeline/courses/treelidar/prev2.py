from common import *
import cv2,sys
S=np.load('seg_troy.npz');T=np.load('stats_troy.npz');ph=np.load('ph_troy.npy')
cy,cx,sz=int(sys.argv[1]),int(sys.argv[2]),int(sys.argv[3]);out=sys.argv[4];TH=float(sys.argv[5]) if len(sys.argv)>5 else .06
SC=3;im=cv2.resize(ph[cy:cy+sz,cx:cx+sz],None,fx=SC,fy=SC,interpolation=cv2.INTER_LINEAR)
REG=np.array((0.62,1.0));ux,uy=c2u(*(S['xy']+REG).T);fx=(ux-x0u-cx)*SC;fy=(y1u-uy-cy)*SC
keep=(T['exg']>=TH)|(T['L']==0)
for x,y,r,h,k,b in zip(fx,fy,S['cr'],S['h'],keep,S['cb']):
  if 0<=x<sz*SC and 0<=y<sz*SC:
    c=(0,0,255) if k else (255,80,0);cv2.circle(im,(int(x),int(y)),int(r*SC),c,1)
    if k and sz<=200:cv2.putText(im,f'{h:.0f}/{b:.0f}',(int(x)-10,int(y)+4),0,.33,(255,255,255),1)
cv2.imwrite(out,im)
