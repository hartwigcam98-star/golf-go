"""Request for the clubhouse/parking job (cbjob.py) from bld/export.json. usage: python3 cbreq.py keys|all out.json"""
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
R={}
for k in keys:
    v=E[k];f=tolonlat(k);L=v['lines']
    if len(L)<18:continue
    t1=L[0][0];g18=L[17][-1];t10=L[9][0];g9=L[8][-1]
    c=[(t1[0]+g18[0])/2,(t1[1]+g18[1])/2] if math.hypot(t1[0]-g18[0],t1[1]-g18[1])<600 else t1
    club=v.get('club') or []
    cl=[sum(q[0] for q in club[0])/len(club[0]),sum(q[1] for q in club[0])/len(club[0])] if club else None
    have=[]
    for P,h in v.get('bld',[]):
        if len(P)<3:continue
        x=sum(q[0] for q in P)/len(P);y=sum(q[1] for q in P)/len(P)
        if math.hypot(x-c[0],y-c[1])<520:have.append(f(x,y))
    R[k]=dict(center=f(*c),starts=[f(*t1),f(*g18),f(*t10),f(*g9)],has_club=bool(club),club_ll=f(*cl) if cl else None,have=have[:400])
json.dump(R,open(sys.argv[2],'w'),separators=(',',':'));print(len(R),'courses')
