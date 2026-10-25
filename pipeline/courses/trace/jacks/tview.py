"""aerial + detected tree crowns + game hole lines: python3 tview.py x0 y0 x1 y1 out sc (NAIP px)"""
import sys,json,base64,math,cv2,numpy as np
G='/home/claude/golf/';x0,y0,x1,y1=map(int,sys.argv[1:5]);out=sys.argv[5];sc=float(sys.argv[6])
C=json.load(open(G+'auto/jacks/jacks_course.json'));D=json.load(open(G+'auto/jacks/naip_jacks.json'));N=json.load(open(G+'run_jacks/naip_jacks.json'));W,H=N['size'];e=N['ext']
lat0,lon0=C['origin'];K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
def px(p):
    lon=p[0]/K+lon0;lat=lat0-p[1]/L;return ((lon-e[0])/(e[2]-e[0])*W-.5,(e[3]-lat)/(e[3]-e[1])*H-.5)
im=cv2.imread(G+'run_jacks/naip_jacks.jpg')[y0:y1,x0:x1].copy();im=cv2.resize(im,None,fx=sc,fy=sc)
P=lambda q:(int((q[0]-x0)*sc),int((q[1]-y0)*sc))
xy=np.frombuffer(base64.b64decode(D['xy']),np.int16).reshape(-1,2)/2.0;r=(np.frombuffer(base64.b64decode(D['r']),np.uint8)&127)/10.0
ov=im.copy()
for (x,y),rr in zip(xy,r):
    q=px((x,y))
    if x0-20<q[0]<x1+20 and y0-20<q[1]<y1+20: cv2.ellipse(ov,P(q),(max(1,int(rr/0.657*sc)),max(1,int(rr/0.951*sc))),0,0,360,(0,0,200),-1)
im=cv2.addWeighted(ov,0.35,im,0.65,0)
for k in ('fairway','tee','green'):
    for poly in C['polys'].get(k,[]):
        cv2.polylines(im,[np.array([P(px(p)) for p in poly],np.int32)],True,{'fairway':(0,255,255),'tee':(255,0,255),'green':(0,255,0)}[k],1)
for i,h in enumerate(C['holes']):
    Lq=[P(px(p)) for p in h['line']]
    for a,b in zip(Lq,Lq[1:]):cv2.line(im,a,b,(255,255,255),2)
    cv2.putText(im,str(i+1),(Lq[0][0]+6,Lq[0][1]),0,0.8,(255,255,255),2)
for x in range((x0//50+1)*50,x1,50):
    X=int((x-x0)*sc);cv2.line(im,(X,0),(X,im.shape[0]),(0,200,200),1);cv2.putText(im,str(x),(X+2,12),0,.4,(0,255,255),1)
for y in range((y0//50+1)*50,y1,50):
    Y=int((y-y0)*sc);cv2.line(im,(0,Y),(im.shape[1],Y),(0,200,200),1);cv2.putText(im,str(y),(2,Y-2),0,.4,(0,255,255),1)
cv2.imwrite(out,im,[cv2.IMWRITE_JPEG_QUALITY,85])
