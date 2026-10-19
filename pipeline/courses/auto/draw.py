"""Course map over the NAIP photo: python3 draw.py key runDir out.jpg [res] [xa ya xb yb]"""
import sys,json,cv2,numpy as np
key,R,out=sys.argv[1],sys.argv[2].rstrip('/')+'/',sys.argv[3];res=float(sys.argv[4]) if len(sys.argv)>4 else .8
C=json.load(open(f'/home/claude/golf/auto/{key}/{key}_course.json'));X=np.array(json.load(open('/home/claude/golf/naip/xf.json'))[key]);A=X[:2,:2];t=X[2]
meta=json.load(open(f'{R}naip_{key}.json'));W,S,E,N=meta['ext'];im=cv2.imread(f'{R}naip_{key}.jpg');h,w=im.shape[:2]
pts=np.array([q for k in('fairway','green','tee') for P in C['polys'][k] for q in P])
if len(sys.argv)>8:xa,ya,xb,yb=map(float,sys.argv[5:9])
else:xa,ya=pts.min(0)-40;xb,yb=pts.max(0)+40
nx=int((xb-xa)/res);ny=int((yb-ya)/res);GX,GY=np.meshgrid(xa+np.arange(nx)*res,ya+np.arange(ny)*res)
LL=np.stack([GX-t[0],GY-t[1]],-1)@np.linalg.inv(A);px=((LL[...,0]-W)/(E-W)*w).astype(np.float32);py=((N-LL[...,1])/(N-S)*h).astype(np.float32)
I=cv2.remap(im,px,py,cv2.INTER_LINEAR);O=I.copy()
P=lambda q:[int((q[0]-xa)/res),int((q[1]-ya)/res)]
col={'fairway':(80,200,80),'green':(60,255,60),'tee':(255,160,60),'bunker':(150,240,255),'water':(255,80,40)}
for k in ('green','tee','bunker','water','fairway'):
    for Pp in C['polys'].get(k,[]):cv2.polylines(I,[np.array([P(q) for q in Pp],np.int32)],True,col[k],1 if k=='fairway' else 2)
for i,hh in enumerate(C['holes']):
    pl=np.array([P(q) for q in hh['line']],np.int32);cv2.polylines(I,[pl],False,(0,0,255),2);cv2.circle(I,tuple(pl[0]),5,(0,255,255),-1);cv2.circle(I,tuple(pl[-1]),5,(255,0,255),-1)
    m=pl[len(pl)//2] if len(pl)>2 else (pl[0]+pl[-1])//2
    cv2.putText(I,str(i+1),(int(m[0]),int(m[1])),cv2.FONT_HERSHEY_SIMPLEX,.9,(0,0,0),4);cv2.putText(I,str(i+1),(int(m[0]),int(m[1])),cv2.FONT_HERSHEY_SIMPLEX,.9,(255,255,255),2)
for gx in range(int(np.ceil(xa/100))*100,int(xb),100):
    for gy in range(int(np.ceil(ya/100))*100,int(yb),100):
        q=P((gx,gy));cv2.drawMarker(I,tuple(q),(255,255,255),cv2.MARKER_CROSS,8,1);cv2.putText(I,f'{gx},{gy}',(q[0]+2,q[1]-2),cv2.FONT_HERSHEY_SIMPLEX,.35,(255,255,255),1)
cv2.imwrite(out,I,[cv2.IMWRITE_JPEG_QUALITY,85]);print(I.shape)
