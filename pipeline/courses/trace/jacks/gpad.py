"""green pad from the 2x lidar ground grid: smoothness (low local roughness) + relief, with outline overlay. python3 gpad.py hole out"""
import sys,json,cv2,numpy as np
k=sys.argv[1];out=sys.argv[2];GF=json.load(open('greens_final.json'));F=2;Y0=480
g=np.load('g2.npy');mos=cv2.imread('mos2.jpg');naip=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg')
P=np.array(GF[k]);c=P.mean(0);x0,y0=int(c[0]-32),int(c[1]-22);S=6
R0,R1,C0,C1=(y0-Y0)*F,(y0+44-Y0)*F,x0*F,(x0+64)*F
G=g[R0:R1,C0:C1].astype(np.float64)
B=cv2.GaussianBlur(G,(0,0),6);rel=G-cv2.GaussianBlur(G,(0,0),20)
gy,gx=np.gradient(cv2.GaussianBlur(G,(0,0),1.2),0.43,0.30);sl=np.hypot(gx,gy)*100
rough=np.abs(G-cv2.GaussianBlur(G,(0,0),2))
def col(v,lo,hi):return cv2.applyColorMap(np.clip((v-lo)/(hi-lo)*255,0,255).astype(np.uint8),cv2.COLORMAP_JET)
pan=[cv2.resize(naip[y0:y0+44,x0:x0+64],(64*S,44*S),interpolation=cv2.INTER_CUBIC),
     cv2.resize(col(rel,-0.4,0.4),(64*S,44*S)),cv2.resize(col(sl,0,12),(64*S,44*S)),cv2.resize(col(rough,0,0.06),(64*S,44*S))]
for p,t in zip(pan,['photo','relief','slope %','roughness']):
    cv2.polylines(p,[((P-[x0,y0])*S).astype(np.int32)],True,(255,255,255),1);cv2.putText(p,f'{k} {t} x0={x0} y0={y0}',(4,16),0,.5,(255,255,255),1)
    for gx_ in range(0,65,4):cv2.line(p,(gx_*S,0),(gx_*S,5),(255,255,255),1)
    for gy_ in range(0,45,4):cv2.line(p,(0,gy_*S),(5,gy_*S),(255,255,255),1)
cv2.imwrite(out,np.vstack([np.hstack(pan[:2]),np.hstack(pan[2:])]))
