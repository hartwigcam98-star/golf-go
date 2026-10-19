import numpy as np,json,cv2,sys
sys.path.insert(0,'/home/claude/golf/lidar2')
from utm import inv
D='/home/claude/golf/lidar2/data/'
GG=json.load(open('/home/claude/golf/lidar/game_greens.json'));XF=json.load(open('/home/claude/golf/naip/xf.json'))
CFG=json.load(open('/home/claude/golf/lidar2/cfg.json'));SUMM=json.load(open(D+'summary.json'))
YD=1.09361
def xf(name):
    X=np.array(XF[name]);return X[:2,:2],X[2]
from utm import fwd
SHIFT={}
for _n,_d in SUMM['dem'].items():
    _c=np.array(_d['ctrl']);_x,_y=fwd(_c[:,0],_c[:,1],_d['epsg']-26900);SHIFT[_n]=((_c[:,2]-_x).mean(),(_c[:,3]-_y).mean())
def utm2course(name,x,y):
    A,t=xf(name);dx,dy=SHIFT[name];lon,lat=inv(np.asarray(x)-dx,np.asarray(y)-dy,CFG[name]['epsg']-26900);return np.stack([lon,lat],-1)@A+t
def inp(P,x,y):return cv2.pointPolygonTest(np.array(P,np.float32),(float(x),float(y)),False)>=0
def green_list(name):
    D_=GG[name];out=[];seen=set()
    for p in D_['pins']:
        gi=next((i for i,P in enumerate(D_['greens']) if inp(P,*p)),None)
        if gi is None:gi=min(range(len(D_['greens'])),key=lambda i:np.hypot(*(np.mean(D_['greens'][i],0)-p)))
        if gi in seen:continue
        seen.add(gi);out.append(np.array(D_['greens'][gi]))
    return out
NEW_COURSES={'sandvalley','mammoth','lido','sedge'}
OLD_COURSES={'troy','stoneridge','caledonia','trueblue','rossbridge','senator','judge','legislator','heritage','pawplant','deacon','lehman','maddens','pines','preserve','orangeburg','santee','wyboo','mystic','legends','chaska','prestwick','royal','farmlinks','desertcanyon','crsc','crls'}
BOX_COURSES={'wilderness','quarry','legend','cambrian','jewel','ridges','edinburgh','willingers','northfork'}
def hole_of_green(name):
    """for courses fetched per hole: the first hole that uses each unique green (green_list order)"""
    D_=GG[name];out=[];seen=set()
    for hi,p in enumerate(D_['pins']):
        gi=next((i for i,P in enumerate(D_['greens']) if inp(P,*p)),None)
        if gi is None:gi=min(range(len(D_['greens'])),key=lambda i:np.hypot(*(np.mean(D_['greens'][i],0)-p)))
        if gi in seen:continue
        seen.add(gi);out.append(hi)
    return out
def load_pts(name):
    P=np.load(D+f'pts_{name}.npz');G={}
    for k in P.files:
        g,r,f=k.split('|');G.setdefault(int(g[1:]),{}).setdefault(r,{})[f]=P[k]
    if name in NEW_COURSES:
        H=hole_of_green(name);G={i:G[h] for i,h in enumerate(H) if h in G}
    elif name in BOX_COURSES or name not in OLD_COURSES:   # point sets are in map-green order: match each game green to the box holding its centre
        gl=green_list(name);A,t=xf(name);Ai=np.linalg.inv(A);boxes=CFG[name]['greens'];M={}
        for i,g in enumerate(gl):
            lo,la=(g.mean(0)-t)@Ai
            js=[j for j,b in enumerate(boxes) if b[0]<=lo<=b[2] and b[1]<=la<=b[3] and j in G]
            if js:M[i]=G[min(js,key=lambda j:np.hypot((boxes[j][0]+boxes[j][2])/2-lo,((boxes[j][1]+boxes[j][3])/2-la)*1.4))]
        G=M
    res={}
    for gi,rr in G.items():
        for r,d in rr.items():
            x=d['ox']+d['x']/100.;y=d['oy']+d['y']/100.;C=utm2course(name,x,y)
            res.setdefault(gi,{})[r]=dict(x=C[:,0],y=C[:,1],z=d['z']/1000.*YD)
    return res
def dem_sampler(name,sig=0):
    """Square-pixel 1 m UTM DEM from the new download, sampled at course-yard points (heights in yards)."""
    from utm import fwd
    from scipy import ndimage as ndi
    d=np.load(D+f'dem_{name}.npz');Z=d['z'].astype(np.float32);x0=float(d['x0']);y1=float(d['y1']);zone=int(d['epsg'])-26900
    if sig:Z=ndi.gaussian_filter(Z,sig)
    A,t=xf(name);Ai=np.linalg.inv(A);dx,dy=SHIFT[name]
    def s(GX,GY):
        LL=np.stack([np.asarray(GX,float)-t[0],np.asarray(GY,float)-t[1]],-1)@Ai
        ux,uy=fwd(LL[...,0],LL[...,1],zone);ux=ux+dx;uy=uy+dy
        px=(ux-x0-.5).astype(np.float32);py=(y1-uy-.5).astype(np.float32)
        return cv2.remap(Z,px,py,cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)*YD
    return s
def S1(s,x,y):
    x=np.asarray(x,float).ravel();y=np.asarray(y,float).ravel();n=len(x);m=-(-n//1000)*1000
    X=np.pad(x,(0,m-n),mode='edge').reshape(-1,1000);Y=np.pad(y,(0,m-n),mode='edge').reshape(-1,1000)
    return s(X,Y).ravel()[:n]
