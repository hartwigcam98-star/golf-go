"""Segment each green's real outline from the NAIP photo (region grow from the traced centre in Lab colour), report area and write greenseg.json; draws /tmp/gseg.jpg"""
import json,cv2,numpy as np,math
T=json.load(open('trace.json'));S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY']
im=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg');lab=cv2.cvtColor(cv2.GaussianBlur(im,(0,0),1.2),cv2.COLOR_BGR2LAB).astype(np.float32)
out={};tiles=[]
CEN={'14':(1275,1597),'15':(1140,1742),'11':(1092,1478),'16':(1410,2273),'13':(1432,1138)}
for k,h in T['holes'].items():
    cx,cy=CEN.get(k,h['green'][:2]);R=int(40/YX);Ry=int(40/YY)
    x0,y0=int(cx-R),int(cy-Ry);sub=lab[y0:y0+2*Ry,x0:x0+2*R];c=(int(cx-x0),int(cy-y0))
    seed=np.median(sub[c[1]-4:c[1]+5,c[0]-6:c[0]+7].reshape(-1,3),0)
    d=np.sqrt(((sub-seed)*[1.0,1.6,1.6])**2).sum(-1)
    res=[]
    for thr in range(6,30,2):
        m=(d<thr).astype(np.uint8);m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
        n,lab_,st,_=cv2.connectedComponentsWithStats(m);l=lab_[c[1],c[0]]
        if l==0:continue
        reg=(lab_==l).astype(np.uint8);area=reg.sum()*YX*YY;res.append((thr,reg,area))
        if area>1600:break
    best=None
    # take the threshold just before the biggest relative jump in area (the edge of the green), area 250..1100
    cand=[(res[i+1][2]/max(res[i][2],1),i) for i in range(len(res)-1) if 250<=res[i][2]<=1100]
    if cand:best=res[max(cand)[1]]
    elif res:best=min(res,key=lambda r:abs(r[2]-500))
    if best is None:print(k,'no region');continue
    thr,reg,area=best
    reg=cv2.morphologyEx(reg,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,5)))
    reg=cv2.morphologyEx(reg,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(5,4)))
    cs,_=cv2.findContours(reg,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);cn=max(cs,key=cv2.contourArea)
    cn=cv2.approxPolyDP(cn,1.2,True)[:,0,:]
    poly=[[round(float(p[0]+x0),1),round(float(p[1]+y0),1)] for p in cn]
    area=cv2.contourArea(cn.astype(np.float32))*YX*YY
    out[k]={'thr':thr,'area':round(area),'poly':poly}
    t=im[y0:y0+2*Ry,x0:x0+2*R].copy()
    cv2.polylines(t,[cn.astype(np.int32)],True,(0,255,255),1)
    # old ellipse
    g=h['green'];cv2.ellipse(t,c,(int(g[2]/YX),int(g[3]/YY)),0,0,360,(255,0,255),1)
    t=cv2.resize(t,(240,240));cv2.putText(t,f'{k} {round(area)}y2 t{thr}',(4,16),0,0.45,(255,255,255),1);tiles.append(t)
json.dump(out,open('greenseg.json','w'))
while len(tiles)%6:tiles.append(np.zeros_like(tiles[0]))
g=np.vstack([np.hstack(tiles[i:i+6]) for i in range(0,len(tiles),6)]);cv2.imwrite('/tmp/gseg.jpg',g)
print({k:v['area'] for k,v in out.items()})
