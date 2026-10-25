"""tree map (lidar canopy) + trace.json lines and fairway nodes: python3 chmt.py x0 y0 x1 y1 out sc"""
import sys,json,cv2,numpy as np
x0,y0,x1,y1=map(int,sys.argv[1:5]);out=sys.argv[5];sc=float(sys.argv[6]);F=2;Y0=480
g=np.load('g2.npy');s=np.load('s2.npy');X0,X1,R0,R1=x0*F,x1*F,(y0-Y0)*F,(y1-Y0)*F
h=(s-g)[R0:R1,X0:X1];h=np.where(np.isfinite(h),h,0).astype(np.float32)
mos=cv2.imread('mos2.jpg')[R0:R1,X0:X1];v=np.clip(h/20*255,0,255).astype(np.uint8);c=cv2.applyColorMap(v,cv2.COLORMAP_INFERNO)
im=np.where((h>2.5)[...,None],cv2.addWeighted(c,0.6,mos,0.4,0),mos)
T=json.load(open('trace.json'));S=json.load(open('scale.json'))
P=lambda q:(int((q[0]-x0)*F),int((q[1]-y0)*F))
for k,hh in T['holes'].items():
    for n in hh.get('fairway',[]):cv2.ellipse(im,P(n),(int(n[2]/S['YX']*F),int(n[2]/S['YY']*F)),0,0,360,(0,255,255),1)
    L=[P(p) for p in hh['line']]
    for a,b in zip(L,L[1:]):cv2.line(im,a,b,(255,255,255),2)
    for q in L[1:-1]:cv2.circle(im,q,4,(255,255,0),-1)
    cv2.putText(im,k,(L[0][0]+6,L[0][1]),0,1.1,(255,255,255),3)
    cv2.circle(im,P(hh['green']),14,(0,255,0),2)
    for t in hh['tees']:cv2.circle(im,P(t),6,(255,0,255),2)
for x in range((x0//50+1)*50,x1,50):
    X=(x-x0)*F;cv2.line(im,(X,0),(X,im.shape[0]),(0,200,200),1);cv2.putText(im,str(x),(X+2,16),0,.6,(0,255,255),2)
for y in range((y0//50+1)*50,y1,50):
    Y=(y-y0)*F;cv2.line(im,(0,Y),(im.shape[1],Y),(0,200,200),1);cv2.putText(im,str(y),(2,Y-3),0,.6,(0,255,255),2)
cv2.imwrite(out,cv2.resize(im,None,fx=sc/F,fy=sc/F,interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,85])
