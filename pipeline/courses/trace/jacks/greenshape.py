"""Smooth organic green outlines from greenseg masks: radial profile round the centroid, low-order Fourier smoothing, area kept 380-650 yd2.
writes greens_final.json {hole: poly(px)} and /tmp/gfinal.jpg"""
import json,cv2,numpy as np,math
T=json.load(open('trace.json'));S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY']
im=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg');lab=cv2.cvtColor(cv2.GaussianBlur(im,(0,0),1.2),cv2.COLOR_BGR2LAB).astype(np.float32)
CEN={'14':(1275,1597),'15':(1140,1742),'11':(1092,1478),'16':(1404,2279),'13':(1432,1138)}
FIX={'3':18,'9':18,'15':12,'16':12}
def mask(k):
    cx,cy=CEN.get(k,T['holes'][k]['green'][:2]);R=int(40/YX);Ry=int(40/YY);x0,y0=int(cx-R),int(cy-Ry)
    sub=lab[y0:y0+2*Ry,x0:x0+2*R];c=(int(cx-x0),int(cy-y0))
    seed=np.median(sub[c[1]-4:c[1]+5,c[0]-6:c[0]+7].reshape(-1,3),0);d=np.sqrt(((sub-seed)*[1.0,1.6,1.6])**2).sum(-1)
    res=[]
    for thr in range(6,30,2):
        m=(d<thr).astype(np.uint8);m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8));n,l_,_,_=cv2.connectedComponentsWithStats(m);l=l_[c[1],c[0]]
        if l==0:continue
        reg=(l_==l).astype(np.uint8);a=reg.sum()*YX*YY;res.append((thr,reg,a))
        if a>1600:break
    if k in FIX:best=min(res,key=lambda r:abs(r[0]-FIX[k]))
    else:
        cand=[(res[i+1][2]/max(res[i][2],1),i) for i in range(len(res)-1) if 250<=res[i][2]<=1100]
        best=res[max(cand)[1]] if cand else min(res,key=lambda r:abs(r[2]-500))
    return best[1],x0,y0
out={};tiles=[]
for k in T['holes']:
    reg,x0,y0=mask(k)
    reg=cv2.morphologyEx(reg,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,7)))
    ys,xs=np.nonzero(reg);X=xs*YX;Y=ys*YY;cx,cy=X.mean(),Y.mean()
    ang=np.arctan2(Y-cy,X-cx);rad=np.hypot(X-cx,Y-cy);nb=72;bins=((ang+math.pi)/(2*math.pi)*nb).astype(int)%nb
    r=np.array([np.percentile(rad[bins==b],96) if (bins==b).sum()>3 else np.nan for b in range(nb)])
    idx=np.arange(nb);good=np.isfinite(r);r=np.interp(idx,idx[good],r[good],period=nb)
    r=np.minimum(r,np.median(r)*1.6)
    Fc=np.fft.rfft(r);Fc[5:]=0;rs=np.fft.irfft(Fc,nb);rs=0.8*rs+0.2*rs.mean()
    area=0.5*np.sum(rs**2)*(2*math.pi/nb)
    sc=math.sqrt(min(650,max(380,area))/area);rs*=sc
    th=-math.pi+(idx+.5)*2*math.pi/nb
    poly=[[round((cx+rs[i]*math.cos(th[i]))/YX+x0,1),round((cy+rs[i]*math.sin(th[i]))/YY+y0,1)] for i in range(0,nb,2)]
    out[k]=poly
    t=im[y0:y0+reg.shape[0],x0:x0+reg.shape[1]].copy()
    cv2.polylines(t,[np.array([[p[0]-x0,p[1]-y0] for p in poly],np.int32)],True,(0,255,255),1)
    t=cv2.resize(t,(240,240));cv2.putText(t,f'{k} {area*sc*sc:.0f}y2',(4,16),0,.5,(255,255,255),1);tiles.append(t)
json.dump(out,open('greens_final.json','w'))
cv2.imwrite('/tmp/gfinal.jpg',np.vstack([np.hstack(tiles[i:i+6]) for i in range(0,18,6)]))
