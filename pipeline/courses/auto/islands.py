"""Find fairways/greens/tees lying inside water polygons (lost multipolygon holes) and cut them out of the water as keyhole rings.
usage (from golf/): python3 auto/islands.py key [write]"""
import json,sys,math,numpy as np,cv2
k=sys.argv[1];f=f'auto/{k}/{k}_course.json';C=json.load(open(f));P=C['polys']
def bb(R):a=np.array(R);return a.min(0),a.max(0)
def mask(R,o,s):m=np.zeros(s,np.uint8);cv2.fillPoly(m,[np.round((np.array(R)-o)).astype(np.int32)],1);return m
fix=[]
for wi,W in enumerate(P['water']):
    lo,hi=bb(W);o=lo-2;s=(int(hi[1]-lo[1])+5,int(hi[0]-lo[0])+5);mw=mask(W,o,s)
    for kind in ('green','tee','fairway'):
        for i,R in enumerate(P[kind]):
            a,b=bb(R)
            if (a<lo).any() or (b>hi).any():continue
            mr=mask(R,o,s);n=mr.sum()
            if n<20:continue
            ov=(mr&mw).sum()/n
            if ov>0.8:fix.append((wi,kind,i,round(ov,2),int(n)))
print(fix)
def keyhole(W,R):
    W=[tuple(p) for p in W];R=[tuple(p) for p in R]
    # ring orientation: hole opposite to outer
    sa=lambda Q:sum(Q[i][0]*Q[i-1][1]-Q[i-1][0]*Q[i][1] for i in range(len(Q)))
    if (sa(W)>0)==(sa(R)>0):R=R[::-1]
    bi,bj,bd=0,0,1e18
    for i,p in enumerate(W):
        for j,q in enumerate(R):
            d=(p[0]-q[0])**2+(p[1]-q[1])**2
            if d<bd:bi,bj,bd=i,j,d
    return [list(p) for p in W[:bi+1]+R[bj:]+R[:bj+1]+W[bi:]]
if len(sys.argv)>2 and fix:
    by={}
    for wi,kind,i,ov,n in fix:by.setdefault(wi,[]).append(P[kind][i])
    for wi,holes in by.items():
        for R in sorted(holes,key=lambda R:-len(R)):P['water'][wi]=keyhole(P['water'][wi],R)
    json.dump(C,open(f,'w'),separators=(',',':'));print('cut',sum(len(v) for v in by.values()),'islands')
