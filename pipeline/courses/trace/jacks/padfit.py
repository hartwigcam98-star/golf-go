"""Fit a green's outline to the flat lidar pad (slope < thr) grown out from the current outline by at most M yd. python3 padfit.py hole thr M [write]"""
import sys,json,cv2,numpy as np,math
k=sys.argv[1];thr=float(sys.argv[2]);M=float(sys.argv[3]);GF=json.load(open('greens_final.json'));F=2;Y0=480
S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY']
g=np.load('g2.npy');P=np.array(GF[k]);c=P.mean(0);x0,y0=int(c[0]-40),int(c[1]-30)
R0,C0=(y0-Y0)*F,x0*F;G=g[R0:R0+60*F,C0:C0+80*F].astype(np.float64)
gy,gx=np.gradient(cv2.GaussianBlur(G,(0,0),1.5),0.43,0.30);sl=np.hypot(gx,gy)*100
cur=np.zeros(G.shape,np.uint8);cv2.fillPoly(cur,[np.round((P-[x0,y0])*F).astype(np.int32)],1)
# growth limit: M yd outside the current outline (in grid px: x px = YX/F yd, y px = YY/F yd)
d=cv2.distanceTransform(1-cur,cv2.DIST_L2,5)*min(YX,YY)/F
YYg,XXg=np.mgrid[0:G.shape[0],0:G.shape[1]];quad=(XXg>=(c[0]-x0)*F-2*F)&(YYg>=(c[1]-y0)*F-2*F)
flat=((sl<thr)&(d<=M)&quad).astype(np.uint8)
flat=cv2.morphologyEx(flat,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,5)))
n,lab=cv2.connectedComponents(flat);cy_,cx_=int((c[1]-y0)*F),int((c[0]-x0)*F);reg=(lab==lab[cy_,cx_]).astype(np.uint8)
reg=reg|cur;reg=cv2.morphologyEx(reg,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
reg=cv2.morphologyEx(reg,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
cs,_=cv2.findContours(reg,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);cn=max(cs,key=cv2.contourArea)[:,0,:].astype(float)
# smooth: radial Fourier
X=cn[:,0]/F*YX;Y=cn[:,1]/F*YY;mx,my=X.mean(),Y.mean();ang=np.arctan2(Y-my,X-mx);rad=np.hypot(X-mx,Y-my)
nb=72;bins=((ang+math.pi)/(2*math.pi)*nb).astype(int)%nb;r=np.array([rad[bins==b].max() if (bins==b).any() else np.nan for b in range(nb)])
idx=np.arange(nb);ok=np.isfinite(r);r=np.interp(idx,idx[ok],r[ok],period=nb);Fc=np.fft.rfft(r);Fc[6:]=0;r=np.fft.irfft(Fc,nb)
th=-math.pi+(idx+.5)*2*math.pi/nb
new=[[round((mx+r[i]*math.cos(th[i]))/YX+x0,1),round((my+r[i]*math.sin(th[i]))/YY+y0,1)] for i in range(0,nb,2)]
a0=cv2.contourArea(P.astype(np.float32))*YX*YY;a1=cv2.contourArea(np.array(new,np.float32))*YX*YY;print(k,'area',round(a0),'->',round(a1))
naip=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg');Sz=6;im=cv2.resize(naip[y0:y0+60,x0:x0+80],(80*Sz,60*Sz),interpolation=cv2.INTER_CUBIC)
sv=cv2.applyColorMap(np.clip(sl/12*255,0,255).astype(np.uint8),cv2.COLORMAP_JET);sv=cv2.resize(sv,(80*Sz,60*Sz))
for p in (im,sv):
    cv2.polylines(p,[((P-[x0,y0])*Sz).astype(np.int32)],True,(255,255,255),1);cv2.polylines(p,[((np.array(new)-[x0,y0])*Sz).astype(np.int32)],True,(0,255,255),2)
cv2.imwrite('/tmp/padfit_%s.jpg'%k,np.hstack([im,sv]))
if len(sys.argv)>4:GF[k]=new;json.dump(GF,open('greens_final.json','w'));print('written')
