"""fine view: python3 fv.py x0 y0 x1 y1 out [sc] ; coords in NAIP 1x px (same as trace.json). Panels: 2025 aerial | ground relief (tees/greens = flat raised pads)"""
import sys,json,cv2,numpy as np
x0,y0,x1,y1=map(int,sys.argv[1:5]);out=sys.argv[5];sc=float(sys.argv[6]) if len(sys.argv)>6 else 1.0
F=2;Y0=480
mos=cv2.imread('mos2.jpg');g=np.load('g2.npy')
X0,X1,R0,R1=x0*F,x1*F,(y0-Y0)*F,(y1-Y0)*F
a=mos[R0:R1,X0:X1].copy();G=g[R0:R1,X0:X1].astype(np.float64)
B=cv2.GaussianBlur(g,(0,0),sigmaX=20,sigmaY=14)[R0:R1,X0:X1]
R=G-B;v=np.clip((R+0.7)/1.4*255,0,255).astype(np.uint8);c=cv2.applyColorMap(v,cv2.COLORMAP_JET)
gy,gx=np.gradient(G,0.43,0.30);hs=np.clip(128+(-gx-gy)*120,0,255).astype(np.uint8)
c=cv2.addWeighted(c,0.6,cv2.cvtColor(hs,cv2.COLOR_GRAY2BGR),0.4,0)
T=json.load(open('trace.json'))
P=lambda p:(int((p[0]-x0)*F),int((p[1]-y0)*F))
for I in (a,c):
    for k,h in T['holes'].items():
        L=[P(p) for p in h['line']]
        for p,q in zip(L,L[1:]):cv2.line(I,p,q,(255,255,255),1)
        cv2.putText(I,k,(L[0][0]+6,L[0][1]),0,0.8,(255,255,255),2)
        for t in h['tees']:cv2.circle(I,P(t),6,(255,0,255),2)
        cv2.circle(I,P(h['green']),10,(0,255,0),1)
    for x in range((x0//25+1)*25,x1,25):
        X=(x-x0)*F;cv2.line(I,(X,0),(X,I.shape[0]),(0,220,220) if x%100==0 else (0,110,110),1)
        if x%50==0:cv2.putText(I,str(x),(X+2,14),0,.45,(0,255,255),1)
    for y in range((y0//25+1)*25,y1,25):
        Y=(y-y0)*F;cv2.line(I,(0,Y),(I.shape[1],Y),(0,220,220) if y%100==0 else (0,110,110),1)
        if y%50==0:cv2.putText(I,str(y),(2,Y-2),0,.45,(0,255,255),1)
o=np.hstack([a,c]);cv2.imwrite(out,cv2.resize(o,None,fx=sc,fy=sc,interpolation=cv2.INTER_AREA),[cv2.IMWRITE_JPEG_QUALITY,85])
