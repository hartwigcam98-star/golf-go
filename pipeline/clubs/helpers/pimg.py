# pimg.py cid du dv da out.jpg [half=30]: lidar resampled into a part frame, dsm-style with grid + aspect overlay side by side
import sys,math,numpy as np,cv2
sys.path.insert(0,'/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub')
from bk import load,img,grid
cid=sys.argv[1];du,dv,da=map(float,sys.argv[2:5]);out=sys.argv[5];half=float(sys.argv[6]) if len(sys.argv)>6 else 30
W,U,V,H,G,K=load(cid);px=U[0,1]-U[0,0]
uu=np.arange(-half,half,0.25);Up,Vp=np.meshgrid(uu,uu)
c,s=math.cos(math.radians(da)),math.sin(math.radians(da))
Um=du+Up*c+Vp*s;Vm=dv-Up*s+Vp*c
mx=((Um-U[0,0])/px).astype(np.float32);my=((Vm-V[0,0])/px).astype(np.float32)
Hp=cv2.remap(H.astype(np.float32),mx,my,cv2.INTER_LINEAR)
sc=3;a=grid(cv2.resize(img(Hp),None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST),Up,Vp,sc)
Hs=cv2.GaussianBlur(Hp,(0,0),1.2);gv,gu=np.gradient(Hs);gu*=4;gv*=4;sl=np.hypot(gu,gv);asp=(np.degrees(np.arctan2(gv,gu))+360)%360
hsv=np.zeros(Hp.shape+(3,),np.uint8);hsv[...,0]=(asp/2).astype(np.uint8);hsv[...,1]=np.clip(sl/0.6*255,0,255).astype(np.uint8);hsv[...,2]=200
b=cv2.cvtColor(hsv,cv2.COLOR_HSV2BGR);b=cv2.resize(b,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
for lv in np.arange(2,16,1.0):
    m=(cv2.resize(Hs,None,fx=sc,fy=sc)>lv).astype(np.uint8);cs,_=cv2.findContours(m,cv2.RETR_LIST,cv2.CHAIN_APPROX_NONE);cv2.drawContours(b,cs,-1,(255,255,255) if lv%2==0 else (40,40,40),1)
b=grid(b,Up,Vp,sc)
cv2.imwrite(out,np.hstack([a,b]))
