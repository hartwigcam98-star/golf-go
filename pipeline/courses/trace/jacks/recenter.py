"""Re-centre fairway nodes and interior line points on open ground (2022 lidar canopy < 2.5 m) and fit fairway widths.
python3 recenter.py [hole ...]  (writes trace.json; keeps tees and greens)"""
import sys,json,math,numpy as np,cv2
F=2;Y0=480;g=np.load('g2.npy');s=np.load('s2.npy');h=np.where(np.isfinite(s-g),s-g,0).astype(np.float32)
h=cv2.morphologyEx(h,cv2.MORPH_CLOSE,np.ones((3,3),np.uint8))
water=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg')  # not used for masks; water handled by OSM
S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY']
def tall(x,y):
    r=int((y-Y0)*F);c=int(x*F)
    if r<0 or c<0 or r>=h.shape[0] or c>=h.shape[1]:return True
    return h[r,c]>2.5
def profile(x,y,ux,uy,span=50):
    # ux,uy unit along-hole in yards space; perpendicular samples every yard
    nx,ny=-uy,ux;vals=[]
    for d in range(-span,span+1):
        X=x+nx*d/YX;Y=y+ny*d/YY;vals.append(tall(X,Y))
    return np.array(vals)
def recentre(x,y,ux,uy,maxshift=25):
    v=profile(x,y,ux,uy);span=(len(v)-1)//2
    # open runs
    runs=[];st=None
    for i,t in enumerate(v):
        if not t and st is None:st=i
        if (t or i==len(v)-1) and st is not None:runs.append((st,i if t else i+1));st=None
    if not runs:return x,y,None
    best=min(runs,key=lambda r:(0 if r[0]<=span<r[1] else min(abs(r[0]-span),abs(r[1]-span)))-0.02*(r[1]-r[0]))
    mid=(best[0]+best[1]-1)/2-span;w=(best[1]-best[0])
    if abs(mid)>maxshift or w<10:return x,y,None
    nx,ny=-uy,ux
    return x+nx*mid/YX,y+ny*mid/YY,w
def unit(a,b):
    dx=(b[0]-a[0])*YX;dy=(b[1]-a[1])*YY;l=math.hypot(dx,dy) or 1;return dx/l,dy/l
T=json.load(open('trace.json'));ks=sys.argv[1:] or list(T['holes'])
for k in ks:
    hh=T['holes'][k];fw=hh.get('fairway',[])
    for it in range(3):
        for i,n in enumerate(fw):
            a=fw[max(i-1,0)];b=fw[min(i+1,len(fw)-1)];ux,uy=unit(a,b)
            x,y,w=recentre(n[0],n[1],ux,uy)
            if w:n[0],n[1]=round(x,1),round(y,1);n[2]=round(max(10,min(30,w/2-3)),1)
    L=hh['line']
    for it in range(3):
        for i in range(1,len(L)-1):
            ux,uy=unit(L[i-1],L[i+1]);x,y,w=recentre(L[i][0],L[i][1],ux,uy)
            if w:L[i]=[round(x,1),round(y,1)]
    print(k,'fairway',[[round(a),round(b),c] for a,b,c in fw],'line',[[round(a),round(b)] for a,b in L])
json.dump(T,open('trace.json','w'),indent=1)
