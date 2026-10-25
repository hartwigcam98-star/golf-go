"""Route each par 4/5 line tee->green through open ground (2022 lidar canopy) and rebuild its fairway along the route.
python3 pathfix.py [hole ...]  (in place on trace.json)"""
import sys,json,math,heapq,numpy as np,cv2
F=2;Y0=480;g=np.load('g2.npy');s=np.load('s2.npy');hh=np.where(np.isfinite(s-g),s-g,0).astype(np.float32)
hh=cv2.morphologyEx(hh,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
H1=cv2.resize(cv2.dilate(hh,np.ones((5,5),np.uint8)),(hh.shape[1]//F,hh.shape[0]//F),interpolation=cv2.INTER_AREA)  # 1x NAIP grid, rows from Y0
S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY']
T=json.load(open('trace.json'))
# water mask from OSM water in run_jacks_t (lat/lon -> px)
N=json.load(open('/home/claude/golf/run_jacks/naip_jacks.json'));W,Hh=N['size'];e=N['ext']
O=json.load(open('/home/claude/golf/run_jacks_t/osm_jacks.json'))
wm=np.zeros(H1.shape,np.uint8)
def topx(lat,lon):return ((lon-e[0])/(e[2]-e[0])*W-.5,(e[3]-lat)/(e[3]-e[1])*Hh-.5-Y0)
for el in O['elements']:
    t=el.get('tags',{})
    if el['type']=='way' and t.get('natural')=='water' and 'geometry' in el:
        cv2.fillPoly(wm,[np.array([topx(q['lat'],q['lon']) for q in el['geometry']],np.int32)],1)
    if el['type']=='relation' and t.get('natural')=='water':
        for m in el['members']:
            if m.get('role')=='outer' and 'geometry' in m:cv2.fillPoly(wm,[np.array([topx(q['lat'],q['lon']) for q in m['geometry']],np.int32)],1)
cost=1.0+40.0*(H1>2.5)+8.0*(wm>0)
def seg_dist(P,a,b):
    a=np.array(a,float);b=np.array(b,float);d=b-a;l=(d*[YX,YY])@(d*[YX,YY])
    t=np.clip(((P-a)*[YX*YX,YY*YY])@d/max(l,1e-9),0,1);Q=a+t[:,None]*d;return np.hypot((P[:,0]-Q[:,0])*YX,(P[:,1]-Q[:,1])*YY)
def route(line,band=70):
    xs=[p[0] for p in line];ys=[p[1] for p in line]
    x0=int(min(xs)-band/YX);x1=int(max(xs)+band/YX);y0=int(min(ys)-band/YY);y1=int(max(ys)+band/YY)
    sub=cost[y0-Y0:y1-Y0,x0:x1].copy()
    yy,xx=np.mgrid[y0:y1,x0:x1];P=np.stack([xx.ravel(),yy.ravel()],1).astype(float)
    dmin=np.min([seg_dist(P,a,b) for a,b in zip(line,line[1:])],0).reshape(sub.shape)
    sub[dmin>band]=1e6
    sub=sub+0.004*dmin**2/10   # mild pull toward the traced line
    hgt,wid=sub.shape;sx,sy=int(line[0][0]-x0),int(line[0][1]-y0);gx,gy=int(line[-1][0]-x0),int(line[-1][1]-y0)
    dist=np.full(sub.shape,np.inf);dist[sy,sx]=0;prev=-np.ones(sub.shape,np.int64);pq=[(0.0,sy,sx)]
    nb=[(dy,dx,math.hypot(dx*YX,dy*YY)) for dy in (-1,0,1) for dx in (-1,0,1) if dx or dy]
    nb+=[(dy,dx,math.hypot(dx*YX,dy*YY)) for dy,dx in ((-1,-2),(-1,2),(1,-2),(1,2),(-2,-1),(-2,1),(2,-1),(2,1))]
    while pq:
        d,y,x=heapq.heappop(pq)
        if d>dist[y,x]:continue
        if (y,x)==(gy,gx):break
        for dy,dx,l in nb:
            Y,X=y+dy,x+dx
            if 0<=Y<hgt and 0<=X<wid:
                nd=d+l*(sub[y,x]+sub[Y,X])/2
                if nd<dist[Y,X]:dist[Y,X]=nd;prev[Y,X]=y*wid+x;heapq.heappush(pq,(nd,Y,X))
    path=[];c=gy*wid+gx
    while c>=0:path.append((c%wid+x0,c//wid+y0));c=prev[c//wid,c%wid]
    return path[::-1]
def rdp(pts,eps):
    pts=np.array(pts,float)
    def rec(i,j):
        if j<=i+1:return [i,j]
        d=seg_dist(pts[i+1:j],pts[i],pts[j]);k=int(np.argmax(d))+i+1
        if d[k-i-1]>eps:return rec(i,k)[:-1]+rec(k,j)
        return [i,j]
    return [tuple(pts[k]) for k in rec(0,len(pts)-1)]
def length(L):return sum(math.hypot((b[0]-a[0])*YX,(b[1]-a[1])*YY) for a,b in zip(L,L[1:]))
def tall_frac(L):
    n=0;t=0
    for a,b in zip(L,L[1:]):
        m=max(2,int(length([a,b])))
        for u in np.linspace(0,1,m,endpoint=False):
            x=a[0]+(b[0]-a[0])*u;y=a[1]+(b[1]-a[1])*u;n+=1;t+=H1[int(y-Y0),int(x)]>2.5
    return t/max(n,1)
ks=sys.argv[1:] or [k for k,v in T['holes'].items() if v['par']>=4]
for k in ks:
    h=T['holes'][k];old=h['line']
    p=route(old)
    for eps in (4,6,8,10,14):
        L=rdp(p,eps/YX)
        if len(L)<=5:break
    L=[list(map(lambda v:round(v,1),q)) for q in L];L[0]=old[0];L[-1]=old[-1]
    # rebuild fairway along the route: from where the old fairway began (distance along) to 25 yd short of the green
    fw=h.get('fairway',[])
    def along(L,q):
        best=(1e9,0);acc=0
        for a,b in zip(L,L[1:]):
            d=seg_dist(np.array([q],float),a,b)[0];sl=length([a,b])
            a_=np.array(a,float);bb=np.array(b,float);dd=bb-a_;l2=(dd*[YX,YY])@(dd*[YX,YY]);t=float(np.clip(((np.array(q)-a_)*[YX*YX,YY*YY])@dd/max(l2,1e-9),0,1))
            if d<best[0]:best=(d,acc+t*sl)
            acc+=sl
        return best[1]
    tot=length(L);f0=along(L,fw[0][:2]) if fw else tot*0.35;f1=tot-25
    def at(s_):
        acc=0
        for a,b in zip(L,L[1:]):
            sl=length([a,b])
            if acc+sl>=s_:u=(s_-acc)/sl;return [a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u],(b[0]-a[0])*YX/sl,(b[1]-a[1])*YY/sl
            acc+=sl
        return L[-1],0,1
    nf=[]
    if fw and f1>f0+30:
        n=max(3,int((f1-f0)/45)+1)
        for s_ in np.linspace(f0,f1,n):
            q,ux,uy=at(s_)
            # open width across the route
            nx,ny=-uy,ux;run=[];
            for side in (1,-1):
                d=0
                while d<40:
                    X=q[0]+side*nx*(d+1)/YX;Y=q[1]+side*ny*(d+1)/YY
                    if H1[int(Y-Y0),int(X)]>2.5 or wm[int(Y-Y0),int(X)]:break
                    d+=1
                run.append(d)
            off=(run[0]-run[1])/2;q=[q[0]+nx*off/YX,q[1]+ny*off/YY];hw=max(10,min(28,(run[0]+run[1])/2-3))
            nf.append([round(q[0],1),round(q[1],1),round(hw,1)])
        h['fairway']=nf
    h['line']=L
    print(f"{k:>2} len {length(old):.0f}->{length(L):.0f} canopy {tall_frac(old)*100:.0f}%->{tall_frac(L)*100:.0f}% pts {len(L)}")
json.dump(T,open('trace.json','w'),indent=1)
