# coordinate-descent refiner with parts: refine.py cid in.json out.json [span=2] [passes=3] [partpose=0/1]
import sys,json,math,numpy as np,cv2
sys.path.insert(0,'/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub')
from bk import load,env,pcoords,env_spec
from scipy.optimize import minimize_scalar
cid,fi,fo=sys.argv[1:4];span=float(sys.argv[4]) if len(sys.argv)>4 else 2;passes=int(sys.argv[5]) if len(sys.argv)>5 else 3
pose=len(sys.argv)>6 and sys.argv[6]=='1'
W,U,V,H,G,K=load(cid);spec=json.load(open(fi))
roi=(cv2.dilate(K.astype(np.uint8),np.ones((9,9),np.uint8))>0);sub=roi&((np.arange(U.shape[0])%2==0)[:,None])&((np.arange(U.shape[1])%2==0)[None,:])
Ur,Vr,Hr,Gr=U[sub],V[sub],H[sub],G[sub]
def fix(b):
    b=list(b)
    if b[0]=='F': b[6]=0;b[7]=b[5]
    return b
parts=spec.get('parts',[])
items=[(fix(b),-1) for b in spec.get('blocks',[])]+[(fix(b),k) for k,pt in enumerate(parts) for b in pt['blocks']]
def coords(k): return (Ur,Vr) if k<0 else pcoords(parts[k],Ur,Vr)
CO={k:coords(k) for k in range(-1,len(parts))}
def cost(P):
    r=np.clip(np.maximum(P,Gr)-Hr,-2.5,2.5)/.25;return float(np.sum(2*(np.sqrt(1+r*r)-1)))
def benv(b,k): return env([b],*CO[k])
LOCK=set(tuple(map(int,x.split(':'))) for x in spec.get('lock',[]))
orig=[list(b) for b,_ in items]
def total():
    P=np.full(Ur.shape,-99.)
    for b,k in items: P=np.maximum(P,benv(b,k))
    return P
for ps in range(passes):
    if pose:
        for k,pt in enumerate(parts):
            for key,steps in (('da',np.arange(-4,4.01,0.5)),('du',np.arange(-1.5,1.51,0.25)),('dv',np.arange(-1.5,1.51,0.25))):
                others=np.full(Ur.shape,-99.)
                for b,kk in items:
                    if kk!=k: others=np.maximum(others,benv(b,kk))
                base=pt[key];best=None
                for s in steps:
                    pt[key]=base+s;Up,Vp=pcoords(pt,Ur,Vr);P=others.copy()
                    for b,kk in items:
                        if kk==k: P=np.maximum(P,env([b],Up,Vp))
                    c=cost(P)
                    if best is None or c<best[0]: best=(c,pt[key])
                pt[key]=float(best[1]);CO[k]=coords(k)
    for i in range(len(items)):
        others=np.full(Ur.shape,-99.)
        for j2,(b2,k2) in enumerate(items):
            if j2!=i: others=np.maximum(others,benv(b2,k2))
        b,k=items[i]
        def c(bb): return cost(np.maximum(others,benv(fix(bb),k)))
        best=c(b)
        params=[1,2,3,4,5]+([6,7] if b[0]!='F' else [])
        if b[0]=='T': params=[1,2,3,4,5,7]
        for j in params:
            if (i,j) in LOCK: continue
            if j<=4:
                for x in np.arange(orig[i][j]-span,orig[i][j]+span+1e-6,0.25):
                    t=list(b);t[j]=float(x)
                    if t[2]-t[1]<0.75 or t[4]-t[3]<0.75: continue
                    v=c(t)
                    if v<best-1e-9: best=v;b=t
            else:
                lo,hi=(b[j]-2.5,b[j]+2.5) if j!=6 else ((-2,2) if b[0] in('SU','SV') else (0,2))
                def f(x,j=j):
                    t=list(b);t[j]=float(x);return c(t)
                r=minimize_scalar(f,bounds=(lo,hi),method='bounded',options={'xatol':0.01})
                if r.fun<best-1e-9: best=r.fun;b=list(b);b[j]=float(r.x)
        items[i]=(fix(b),k)
    out=dict(spec);rb=lambda b:[b[0]]+[round(float(v),2) for v in b[1:8]]+list(b[8:])
    out['blocks']=[rb(b) for b,k in items if k<0]
    if parts: out['parts']=[dict(pt,da=round(pt['da'],2),du=round(pt['du'],2),dv=round(pt['dv'],2),blocks=[rb(b) for b,kk in items if kk==k]) for k,pt in enumerate(parts)]
    P=np.maximum(env_spec(out,U,V),G);e=np.abs(P-H)[roi]
    print('pass',ps,'median %.3f rms %.2f >1yd %.1f%%'%(np.median(e),np.sqrt((e**2).mean()),(e>1).mean()*100),flush=True)
json.dump(out,open(fo,'w'),indent=0)
for b in out['blocks']: print(b)
for pt in out.get('parts',[]):
    print('part',pt['du'],pt['dv'],pt['da'])
    for b in pt['blocks']: print('   ',b)
