import json,cv2,numpy as np,math
F=2;Y0=480;g=np.load('g2.npy');GF=json.load(open('greens_final.json'));S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY']
naip=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg');L=cv2.cvtColor(naip,cv2.COLOR_BGR2LAB)[...,0].astype(float)
Gs=cv2.GaussianBlur(g.astype(np.float64),(0,0),2.0);gy,gx=np.gradient(Gs,0.43,0.30);SL=np.hypot(gx,gy)*100
out={}
for k in [str(i) for i in range(1,19)]:
    P=np.array(GF[k]);c=P.mean(0);res=[]
    for a in range(0,360,15):
        ux,uy=math.cos(math.radians(a)),math.sin(math.radians(a))
        # outline crossing along the ray (yd)
        r0=None
        for r in np.arange(0,40,0.25):
            x=c[0]+ux*r/YX;y=c[1]+uy*r/YY
            if cv2.pointPolygonTest(P.astype(np.float32),(x,y),False)<0:r0=r;break
        bank=None;lum=[]
        for r in np.arange(r0,r0+14,0.25):
            x=c[0]+ux*r/YX;y=c[1]+uy*r/YY;R=int((y-Y0)*F);C=int(x*F)
            if r<r0+4:lum.append(L[int(y),int(x)])
            if SL[R,C]>8:bank=r-r0;break
        res.append((a,round(r0,1),bank if bank is None else round(bank,1),round(np.mean(lum))))
    out[k]=res
    flags=[(a,b,l) for a,r0,b,l in res if (b is None or b>5) and l<95]
    print(k,'shadowed big gaps (deg,gap,lum):',flags)
json.dump(out,open('/tmp/shadowgap.json','w'))
