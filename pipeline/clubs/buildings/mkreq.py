"""Build the request for the buildings lidar job from bld/export.json: per course the footprints near play (lon/lat),
the hole lines (for the detection zone) and the bbox. usage: python3 mkreq.py keys(comma or 'all') out.json"""
import json,math,sys,numpy as np
E=json.load(open('/home/claude/golf/bld/export.json'));XF=json.load(open('/home/claude/golf/naip/xf.json'))
keys=list(E) if sys.argv[1]=='all' else sys.argv[1].split(',')
def tolonlat(k):
    o=E[k]['origin']
    if o:
        lat0,lon0=o;K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
        return lambda x,y:[round(lon0+x/K,7),round(lat0-y/L,7)]
    A=np.array(XF[k]);M=A[:2];t=A[2];Mi=np.linalg.inv(M)
    return lambda x,y:[round(float(v),7) for v in (np.array([x,y])-t)@Mi]
def dseg(p,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1];l=dx*dx+dy*dy;t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)) if l else 0
    return math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t)
R={}
for k in keys:
    v=E[k];f=tolonlat(k);lines=v['lines']
    near=lambda p,d:any(dseg(p,a,b)<d for L in lines for a,b in zip(L,L[1:]))
    fps=[]
    for i,P in enumerate(v['club']):fps.append(['c%d'%i,[f(*q) for q in P]])
    for i,(P,h) in enumerate(v['bld']):
        if len(P)<3:continue
        cx=sum(q[0] for q in P)/len(P);cy=sum(q[1] for q in P)/len(P)
        if near((cx,cy),260):fps.append(['b%d'%i,[f(*q) for q in P[:60]]])
    L2=[[f(*q) for q in L] for L in lines]
    allp=[q for _,r in fps for q in r]+[q for L in L2 for q in L]
    lo=[q[0] for q in allp];la=[q[1] for q in allp];m=0.0025
    R[k]=dict(bbox=[min(lo)-m,min(la)-m*.75,max(lo)+m,max(la)+m*.75],fps=fps,lines=L2)
    print(k,'footprints',len(fps),'bbox km',round((R[k]['bbox'][2]-R[k]['bbox'][0])*111*math.cos(math.radians(R[k]['bbox'][1])),1),round((R[k]['bbox'][3]-R[k]['bbox'][1])*111,1))
json.dump(R,open(sys.argv[2],'w'),separators=(',',':'))
