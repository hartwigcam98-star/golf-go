"""Detect bunkers (bright sand) in NAIP near greens and along fairways; smooth outlines. writes bunkers_det.json {hole:[poly px]} + /tmp/bdet.jpg"""
import json,cv2,numpy as np,math
T=json.load(open('trace.json'));S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY'];GF=json.load(open('greens_final.json'))
im=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg');hsv=cv2.cvtColor(im,cv2.COLOR_BGR2HSV);lab=cv2.cvtColor(im,cv2.COLOR_BGR2LAB)
L=lab[...,0].astype(np.float32);sat=hsv[...,1].astype(np.float32)
Lb=cv2.blur(L,(41,31))
bb=lab[...,2].astype(np.float32)
sand=((L>186)&(sat<32)&(bb>126)&(bb<142)).astype(np.uint8)
sand=cv2.morphologyEx(sand,cv2.MORPH_OPEN,np.ones((2,2),np.uint8));sand=cv2.morphologyEx(sand,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
# zone: within 40 yd of a green or 25 yd of a fairway node / line
zone=np.zeros(L.shape,np.uint8)
for k,h in T['holes'].items():
    g=np.array(GF[k]);c=g.mean(0);cv2.ellipse(zone,(int(c[0]),int(c[1])),(int(38/YX),int(38/YY)),0,0,360,1,-1)
    for n in h.get('fairway',[]):cv2.ellipse(zone,(int(n[0]),int(n[1])),(int((n[2]+12)/YX),int((n[2]+12)/YY)),0,0,360,1,-1)
    for a,b in zip(h['line'],h['line'][1:]):cv2.line(zone,tuple(map(int,a)),tuple(map(int,b)),1,int(40/YX))
# not on roads/paths: paths are long thin; reject by shape
n,lab_,st,cen=cv2.connectedComponentsWithStats(sand&zone)
out={};vis=im.copy();keep=0
for i in range(1,n):
    x,y,w,h_,a=st[i];area=a*YX*YY
    if area<10 or area>500:continue
    reg=(lab_[y:y+h_,x:x+w]==i).astype(np.uint8)
    cs,_=cv2.findContours(reg,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);cn=max(cs,key=cv2.contourArea)
    (rw,rh)=cv2.minAreaRect(cn)[1];el=max(rw,rh)/max(1,min(rw,rh))
    fill=a/max(1,cv2.contourArea(cv2.convexHull(cn)))
    if el>4.5 or fill<0.55:continue   # paths, lines
    # nearest hole by green / line
    cx,cy=cen[i];best=None
    for k,h in T['holes'].items():
        g=np.array(GF[k]).mean(0);d=math.hypot((g[0]-cx)*YX,(g[1]-cy)*YY)
        for p,q in zip(h['line'],h['line'][1:]):
            p=np.array(p,float);q=np.array(q,float);dd=q-p;t=np.clip(((cx-p[0])*YX*YX*dd[0]+(cy-p[1])*YY*YY*dd[1])/max((dd[0]*YX)**2+(dd[1]*YY)**2,1e-9),0,1);Q=p+t*dd
            d=min(d,math.hypot((Q[0]-cx)*YX,(Q[1]-cy)*YY))
        if best is None or d<best[0]:best=(d,k)
    # smooth outline: dilate 1px then approx
    reg2=cv2.dilate(reg,np.ones((2,2),np.uint8));cs,_=cv2.findContours(reg2,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);cn=max(cs,key=cv2.contourArea)
    cn=cv2.approxPolyDP(cn,0.7,True)[:,0,:]
    if len(cn)<4:continue
    poly=[[round(float(p[0]+x),1),round(float(p[1]+y),1)] for p in cn]
    out.setdefault(best[1],[]).append(poly);keep+=1
    cv2.polylines(vis,[np.array(poly,np.int32)],True,(0,0,255),1)
json.dump(out,open('bunkers_det.json','w'))
print('bunkers',keep,{k:len(v) for k,v in sorted(out.items(),key=lambda t:int(t[0]))})
for k,g in GF.items():cv2.polylines(vis,[np.array(g,np.int32)],True,(0,255,255),1)
cv2.imwrite('/tmp/bdet.jpg',vis[520:2380,150:1560])
