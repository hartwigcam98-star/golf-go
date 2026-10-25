import sys,json,cv2,numpy as np
x0,y0,x1,y1=map(int,sys.argv[1:5]);out=sys.argv[5];sc=float(sys.argv[6])
F=2;Y0=480;g=np.load('g2.npy')
X0,X1,R0,R1=x0*F,x1*F,(y0-Y0)*F,(y1-Y0)*F
B=cv2.GaussianBlur(g,(0,0),sigmaX=24,sigmaY=17)
R=(g-B)[R0:R1,X0:X1]
# flatness: low local std of slope
G=g[R0:R1,X0:X1].astype(np.float64);gy,gx=np.gradient(G,0.43,0.30);sl=np.hypot(gx,gy)
v=np.clip((R+0.6)/1.2*255,0,255).astype(np.uint8);c=cv2.applyColorMap(v,cv2.COLORMAP_JET)
c[sl>0.35]=(c[sl>0.35]*0.35).astype(np.uint8)
T=json.load(open('trace.json'));P=lambda p:(int((p[0]-x0)*F),int((p[1]-y0)*F))
for k,h in T['holes'].items():
    L=[P(p) for p in h['line']]
    for p,q in zip(L,L[1:]):cv2.line(c,p,q,(255,255,255),2)
    cv2.putText(c,k,(L[0][0]+8,L[0][1]),0,1.2,(255,255,255),3)
    for t in h['tees']:cv2.circle(c,P(t),7,(255,0,255),2)
for x in range((x0//50+1)*50,x1,50):
    X=(x-x0)*F;cv2.line(c,(X,0),(X,c.shape[0]),(0,255,255) if x%100==0 else (0,120,120),1)
    if x%100==0:cv2.putText(c,str(x),(X+3,20),0,.8,(0,255,255),2)
for y in range((y0//50+1)*50,y1,50):
    Y=(y-y0)*F;cv2.line(c,(0,Y),(c.shape[1],Y),(0,255,255) if y%100==0 else (0,120,120),1)
    if y%100==0:cv2.putText(c,str(y),(3,Y-3),0,.8,(0,255,255),2)
cv2.imwrite(out,cv2.resize(c,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,85])
