"""Flower beds from the aerial: saturated non-green colours near a green -> polygons in course yards.
usage: python3 trace/flowers.py key runDir cx cy R out.jpg"""
import sys,json,numpy as np,cv2
k,R_,cx,cy,rad,out=sys.argv[1],sys.argv[2].rstrip('/')+'/',float(sys.argv[3]),float(sys.argv[4]),float(sys.argv[5]),sys.argv[6]
X=np.array(json.load(open('/home/claude/golf/naip/xf.json'))[k]);A=X[:2,:2];t=X[2]
meta=json.load(open(R_+f'naip_{k}.json'));W,S,E,N=meta['ext'];im=cv2.imread(R_+f'naip_{k}.jpg');h,w=im.shape[:2]
st=.25;n=int(2*rad/st);GX,GY=np.meshgrid(cx-rad+np.arange(n)*st,cy-rad+np.arange(n)*st)
LL=np.stack([GX-t[0],GY-t[1]],-1)@np.linalg.inv(A);px=((LL[...,0]-W)/(E-W)*w).astype(np.float32);py=((N-LL[...,1])/(N-S)*h).astype(np.float32)
ph=cv2.remap(im,px,py,cv2.INTER_LINEAR)
hsv=cv2.cvtColor(ph,cv2.COLOR_BGR2HSV).astype(int);H,Sa,V=hsv[...,0],hsv[...,1],hsv[...,2]
b,g,r=[ph[...,i].astype(int) for i in range(3)]
flower=((Sa>70)&((H<22)|(H>150))&(r>g+25))|((H>=18)&(H<34)&(Sa>110)&(V>150))   # reds/pinks/oranges, strong yellows
m=flower.astype(np.uint8);m=cv2.morphologyEx(m,cv2.MORPH_CLOSE,np.ones((9,9),np.uint8));m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((5,5),np.uint8))
cs,_=cv2.findContours(m,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_SIMPLE)
polys=[];vis=ph.copy()
for c in cs:
    a=cv2.contourArea(c)*st*st
    if a<12:continue
    c2=cv2.approxPolyDP(c,2.0,True)[:,0,:]
    P=[[round(float(cx-rad+q[0]*st),1),round(float(cy-rad+q[1]*st),1)] for q in c2]
    # dominant colours in this bed
    mm=np.zeros(m.shape,np.uint8);cv2.drawContours(mm,[c],-1,1,-1);sel=(mm>0)&flower
    cols=ph[sel].reshape(-1,3)
    Z=np.float32(cols);_,lab,cen=cv2.kmeans(Z,min(3,len(Z)),None,(cv2.TERM_CRITERIA_EPS+cv2.TERM_CRITERIA_MAX_ITER,20,1.0),3,cv2.KMEANS_PP_CENTERS)
    order=np.argsort(-np.bincount(lab.ravel()))
    hexs=['#%02x%02x%02x'%tuple(int(min(255,v*1.25)) for v in cen[i][::-1]) for i in order]
    polys.append({"p":P,"c":hexs,"a":round(a)})
    cv2.polylines(vis,[c2],True,(255,255,0),2)
print(len(polys),'beds',sum(p['a'] for p in polys),'sq yd',[ (p['a'],p['c']) for p in polys][:12])
json.dump(polys,open('/tmp/flp_%s.json'%k,'w'))
cv2.imwrite(out,np.hstack([ph,vis]))
