"""Fit a clubhouse's massing to lidar: union of roof blocks [type,u0,u1,v0,v1,eave,pitch,ridge] in the building's own frame.
types: H hip, GU gable with the ridge along u, GV gable with the ridge along v, F flat. Heights in yards above the reference ground."""
import numpy as np, math, json, cv2, sys
from scipy.optimize import least_squares
from scipy.interpolate import griddata
YD=0.9144
def utm(lon,lat,zone):
    a=6378137.0;f=1/298.257223563;k0=0.9996;e2=f*(2-f);ep2=e2/(1-e2)
    lon0=np.radians(-183+6*zone);phi=np.radians(lat);lam=np.radians(lon)
    N=a/np.sqrt(1-e2*np.sin(phi)**2);T=np.tan(phi)**2;C=ep2*np.cos(phi)**2;A=np.cos(phi)*(lam-lon0)
    M=a*((1-e2/4-3*e2**2/64-5*e2**3/256)*phi-(3*e2/8+3*e2**2/32+45*e2**3/1024)*np.sin(2*phi)+(15*e2**2/256+45*e2**3/1024)*np.sin(4*phi)-(35*e2**3/3072)*np.sin(6*phi))
    x=k0*N*(A+(1-T+C)*A**3/6+(5-18*T+T*T+72*C-58*ep2)*A**5/120)+500000
    y=k0*(M+N*np.tan(phi)*(A*A/2+(5-T+9*C+4*C*C)*A**4/24+(61-58*T+T*T+600*C-330*ep2)*A**6/720))
    return x,y
class Geo:
    """game yards <-> lon/lat (the course builder's equirectangular frame) <-> UTM metres of the lidar grid"""
    def __init__(s,origin,epsg):
        s.zone=int(epsg)%100;s.xf=None
        if isinstance(origin,dict) and 'xf' in origin:
            A=np.array(origin['xf'],float);s.M=A[:2];s.t=A[2];s.Mi=np.linalg.inv(s.M);s.xf=True
        else:
            if isinstance(origin,dict): origin=origin['origin']
            s.lat0,s.lon0=origin;s.K=math.cos(math.radians(s.lat0))*111320*1.0936;s.L=110574*1.0936
    def g2ll(s,x,y):
        if s.xf:
            P=(np.stack([np.atleast_1d(np.asarray(x,float)),np.atleast_1d(np.asarray(y,float))],1)-s.t)@s.Mi
            lo,la=P[:,0],P[:,1]
            return (lo,la) if np.ndim(x) else (float(lo[0]),float(la[0]))
        return s.lon0+np.asarray(x)/s.K, s.lat0-np.asarray(y)/s.L
    def g2utm(s,x,y): lon,lat=s.g2ll(x,y);return utm(lon,lat,s.zone)
def env(B,U,V):
    out=np.full(U.shape,-99.0)
    for t,u0,u1,v0,v1,e,p,cap in B:
        du=np.minimum(U-u0,u1-U);dv=np.minimum(V-v0,v1-V);inside=(du>=0)&(dv>=0)
        if t=='H': d=np.minimum(du,dv)
        elif t=='GU': d=dv
        elif t=='GV': d=du
        else: d=np.zeros_like(U);p=0
        h=np.minimum(e+p*np.maximum(d,0),max(cap,e))
        out=np.where(inside,np.maximum(out,h),out)
    return out
def max_rect(M):
    """largest all-true rectangle in a boolean grid (histogram method); returns (area,r0,r1,c0,c1) inclusive-exclusive"""
    h=np.zeros(M.shape[1],int);best=(0,0,0,0,0)
    for r in range(M.shape[0]):
        h=np.where(M[r],h+1,0);st=[]
        for c in range(M.shape[1]+1):
            cur=h[c] if c<M.shape[1] else 0;start=c
            while st and st[-1][1]>=cur:
                s0,hh=st.pop();a=hh*(c-s0)
                if a>best[0]:best=(a,r-hh+1,r+1,s0,c)
                start=s0
            st.append((start,cur))
    return best
def facet_blocks(U,V,H,Km):
    """roof blocks from roof facets: opposite slopes meeting at a ridge make a wing; end slopes make it a hip; flats make flat blocks"""
    Hs=cv2.GaussianBlur(H.astype(np.float32),(0,0),1.2);gv,gu=np.gradient(Hs);gu*=4;gv*=4
    sl=np.hypot(gu,gv);asp=(np.degrees(np.arctan2(gv,gu))+360)%360
    km=Km&(cv2.erode(Km.astype(np.uint8),np.ones((3,3),np.uint8))>0)
    cls=np.zeros(H.shape,np.uint8)
    for k,a in enumerate([0,90,180,270]):
        d=np.abs(((asp-a)+180)%360-180);cls[(d<28)&(sl>0.15)&(sl<1.6)&km]=k+1
    cls[(sl<0.08)&km]=5
    F=[]
    for k in range(1,6):
        m=(cls==k).astype(np.uint8);m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
        n,lab,st,_=cv2.connectedComponentsWithStats(m)
        for i in range(1,n):
            if st[i,4]*0.0625<5: continue
            sel=lab==i;u=U[sel];v=V[sel];h=H[sel]
            A=np.c_[np.ones_like(u),u,v];c,*_=np.linalg.lstsq(A,h,rcond=None)
            F.append(dict(k=k,u0=float(np.percentile(u,1)),u1=float(np.percentile(u,99)),v0=float(np.percentile(v,1)),v1=float(np.percentile(v,99)),c=c,area=float(sel.sum()*0.0625),used=False,hmax=float(np.percentile(h,97)),hmin=float(np.percentile(h,3))))
    pl=lambda f,u,v:f['c'][0]+f['c'][1]*u+f['c'][2]*v
    ov=lambda a0,a1,b0,b1:max(0,min(a1,b1)-max(a0,b0))/max(1e-6,min(a1-a0,b1-b0))
    blocks=[]
    # ridges along u: k=2 rises +v (lower v side), k=4 rises -v (higher v side); along v: k=1 rises +u, k=3 rises -u
    for lo,hi,ax in [(2,4,'u'),(1,3,'v')]:
        A=[f for f in F if f['k']==lo];B=[f for f in F if f['k']==hi];pairs=[]
        for a in A:
            for b in B:
                if ax=='u':
                    o=ov(a['u0'],a['u1'],b['u0'],b['u1']);
                    if o<.4: continue
                    s1=a['c'][2];s2=b['c'][2]
                    if s1<=0.05 or s2>=-0.05: continue
                    um=(max(a['u0'],b['u0'])+min(a['u1'],b['u1']))/2
                    r=(pl(b,um,0)-pl(a,um,0))/(s1-s2)
                    if not(a['v1']-2<=r<=b['v0']+2): continue
                    hr=pl(a,um,r);gap=abs(hr-pl(b,um,r))
                else:
                    o=ov(a['v0'],a['v1'],b['v0'],b['v1'])
                    if o<.4: continue
                    s1=a['c'][1];s2=b['c'][1]
                    if s1<=0.05 or s2>=-0.05: continue
                    vm=(max(a['v0'],b['v0'])+min(a['v1'],b['v1']))/2
                    r=(pl(b,0,vm)-pl(a,0,vm))/(s1-s2)
                    if not(a['u1']-2<=r<=b['u0']+2): continue
                    hr=pl(a,r,vm);gap=abs(hr-pl(b,r,vm))
                if gap>0.8: continue
                pairs.append((o*min(a['area'],b['area']),a,b,r,hr))
        pairs.sort(key=lambda x:-x[0])
        for sc,a,b,r,hr in pairs:
            if a['used'] or b['used']: continue
            p=(abs(a['c'][2 if ax=='u' else 1])+abs(b['c'][2 if ax=='u' else 1]))/2
            if ax=='u':
                u0=min(a['u0'],b['u0']);u1=max(a['u1'],b['u1']);v0=a['v0'];v1=b['v1']
                e=min(pl(a,(u0+u1)/2,v0),pl(b,(u0+u1)/2,v1))
            else:
                v0=min(a['v0'],b['v0']);v1=max(a['v1'],b['v1']);u0=a['u0'];u1=b['u1']
                e=min(pl(a,u0,(v0+v1)/2),pl(b,u1,(v0+v1)/2))
            a['used']=b['used']=True
            blocks.append(['GU' if ax=='u' else 'GV',u0,u1,v0,v1,float(e),float(p),float(hr)])
    # hip ends: an end slope sitting at the end of a wing turns it into a hip and extends it
    for f in F:
        if f['used'] or f['k']==5: continue
        for b in blocks:
            t,u0,u1,v0,v1,e,p,cap=b
            if t in('GU','H') and f['k'] in(1,3) and ov(f['v0'],f['v1'],v0,v1)>.6:
                if f['k']==1 and abs(f['u1']-u0)<3.5 and f['u0']<u0+1: b[0]='H';b[1]=min(u0,f['u0']);f['used']=True;break
                if f['k']==3 and abs(f['u0']-u1)<3.5 and f['u1']>u1-1: b[0]='H';b[2]=max(u1,f['u1']);f['used']=True;break
            if t in('GV','H') and f['k'] in(2,4) and ov(f['u0'],f['u1'],u0,u1)>.6:
                if f['k']==2 and abs(f['v1']-v0)<3.5 and f['v0']<v0+1: b[0]='H';b[3]=min(v0,f['v0']);f['used']=True;break
                if f['k']==4 and abs(f['v0']-v1)<3.5 and f['v1']>v1-1: b[0]='H';b[4]=max(v1,f['v1']);f['used']=True;break
    # leftover single slopes: a wing whose other half is hidden, mirrored about its high edge
    for f in F:
        if f['used'] or f['k']==5 or f['area']<10: continue
        c=f['c'];hm=f['hmax'];lo=f['hmin']
        if f['k']==2: p=c[2];w=f['v1']-f['v0'];blocks.append(['GU',f['u0'],f['u1'],f['v0'],f['v1']+w,float(lo),float(p),float(hm)])
        if f['k']==4: p=-c[2];w=f['v1']-f['v0'];blocks.append(['GU',f['u0'],f['u1'],f['v0']-w,f['v1'],float(lo),float(p),float(hm)])
        if f['k']==1: p=c[1];w=f['u1']-f['u0'];blocks.append(['GV',f['u0'],f['u1']+w,f['v0'],f['v1'],float(lo),float(p),float(hm)])
        if f['k']==3: p=-c[1];w=f['u1']-f['u0'];blocks.append(['GV',f['u0']-w,f['u1'],f['v0'],f['v1'],float(lo),float(p),float(hm)])
        f['used']=True
    # flats
    for f in F:
        if f['k']!=5 or f['area']<6: continue
        h=float(np.median([f['hmin'],f['hmax']]));blocks.append(['F',f['u0'],f['u1'],f['v0'],f['v1'],h,0.0,h])
    return blocks
def fit(cid,lid,origin,fp,look=None,dbg=None):
    D=np.load(lid);dsm=D['dsm'];gr=D['ground'];bc=D['bld'];X0,Y0,X1,Y1=D['box'];rs=float(D['res']);E=int(D['epsg']);G=Geo(origin,E)
    n=dsm.shape[0]
    # ground: fill the 1 m grid and upsample
    gi=np.argwhere(np.isfinite(gr));gv=gr[np.isfinite(gr)]
    yy,xx=np.mgrid[0:gr.shape[0],0:gr.shape[1]]
    gf=griddata(gi,gv,(yy,xx),method='linear');m=~np.isfinite(gf)
    if m.any(): gf[m]=griddata(gi,gv,(yy[m],xx[m]),method='nearest')
    gfull=cv2.resize(gf.astype(np.float32),(n,n),interpolation=cv2.INTER_LINEAR)
    d2=dsm.copy();bad=~np.isfinite(d2)
    if bad.any():
        import scipy.ndimage as nd
        idx=nd.distance_transform_edt(bad,return_distances=False,return_indices=True);d2=d2[tuple(idx)]
    nd_=(d2-gfull)
    # footprint (game yards) to grid
    fx,fy=G.g2utm([p[0] for p in fp],[p[1] for p in fp])
    fpx=np.stack([(np.array(fx)-X0)/rs,(Y1-np.array(fy))/rs],1).astype(np.float32)
    FPm=np.zeros((n,n),np.uint8);cv2.fillPoly(FPm,[fpx.astype(np.int32)],1)
    near=cv2.dilate(FPm,np.ones((int(6/rs),int(6/rs)),np.uint8))
    rough=np.abs(cv2.Laplacian(d2.astype(np.float32),cv2.CV_32F,ksize=3))
    BM=((nd_>1.8)&(near>0)&((bc>0)|(rough<1.6))).astype(np.uint8)
    BM=cv2.morphologyEx(BM,cv2.MORPH_OPEN,np.ones((5,5),np.uint8));BM=cv2.morphologyEx(BM,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    k,lab,st,_=cv2.connectedComponentsWithStats(BM)
    keep=np.zeros_like(BM)
    for i in range(1,k):
        ov=(FPm[lab==i]>0).mean()
        if st[i,4]*rs*rs>25 and ov>.3: keep[lab==i]=1
    if keep.sum()*rs*rs<40: return dict(err='no building in lidar',area=float(keep.sum()*rs*rs))
    # frame: dominant edge direction of the kept mask (mod 90)
    cs,_=cv2.findContours(keep,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);angs=[];wts=[]
    for c in cs:
        P=c[:,0,:].astype(float)
        for i in range(0,len(P),2):
            v=P[(i+8)%len(P)]-P[i];L=np.hypot(*v)
            if L>5: angs.append(math.degrees(math.atan2(-v[1],v[0]))%90);wts.append(L)
    hist,ed=np.histogram(angs,bins=90,range=(0,90),weights=wts);hs=np.convolve(np.r_[hist[-2:],hist,hist[:2]],np.ones(5),'valid')
    ang=ed[np.argmax(hs)]+.5   # degrees, u axis = ang anticlockwise from east
    # centre and reference ground
    ys,xs=np.nonzero(keep);cxp,cyp=xs.mean(),ys.mean()
    cE=X0+cxp*rs;cN=Y1-cyp*rs
    A=math.radians(ang);ca,sa=math.cos(A),math.sin(A)
    # sample into the frame at 0.25 yd: u east-ish, v pointing 90 deg clockwise from u (south-ish), in yards
    R=float(np.hypot(*(np.array(keep.shape)))*rs/YD/2)
    ext=max(abs(xs-cxp).max(),abs(ys-cyp).max())*rs/YD+8
    uu=np.arange(-ext,ext,0.25);U,V=np.meshgrid(uu,uu)
    Em=cE+(U*ca+V*sa)*YD;Nm=cN+(U*sa-V*ca)*YD
    mapx=((Em-X0)/rs).astype(np.float32);mapy=((Y1-Nm)/rs).astype(np.float32)
    Hm=cv2.remap(d2.astype(np.float32),mapx,mapy,cv2.INTER_LINEAR);Gm=cv2.remap(gfull,mapx,mapy,cv2.INTER_LINEAR)
    Km=cv2.remap(keep.astype(np.float32),mapx,mapy,cv2.INTER_NEAREST)>0.5
    ring=(cv2.dilate(Km.astype(np.uint8),np.ones((25,25),np.uint8))>0)&~(cv2.dilate(Km.astype(np.uint8),np.ones((9,9),np.uint8))>0)
    gref=float(np.percentile(Gm[ring],90));iref=np.argmin(np.abs(np.where(ring,Gm,1e9)-gref))
    refu,refv=float(U.flat[iref]),float(V.flat[iref])
    H=(Hm-gref)/YD;Gy=(Gm-gref)/YD
    blocks=facet_blocks(U,V,H,Km)
    sub=(np.arange(U.shape[0])%3==0)[:,None]&(np.arange(U.shape[1])%3==0)[None,:]
    # joint refinement (edges + heights) against the whole roof
    roi=(cv2.dilate(Km.astype(np.uint8),np.ones((9,9),np.uint8))>0)&sub
    Ur=U[roi];Vr=V[roi];Hr=H[roi];Gr=Gy[roi]
    def unpack(x):return [[b[0]]+list(x[i*7:(i+1)*7]) for i,b in enumerate(blocks)]
    def res(x):
        B=unpack(x);pred=np.maximum(env(B,Ur,Vr),Gr);return np.clip(pred-Hr,-2.5,2.5)
    x0=np.array(sum([b[1:] for b in blocks],[]),float)
    lb=[];ub=[]
    for b in blocks: lb+= [b[1]-3,b[2]-3,b[3]-3,b[4]-3,-10,0,-10];ub+=[b[1]+3,b[2]+3,b[3]+3,b[4]+3,30,2.5 if b[0]!='F' else 1e-6,40]
    x0=np.clip(x0,np.array(lb)+1e-6,np.array(ub)-1e-6)
    sol=least_squares(res,x0,loss='soft_l1',f_scale=.3,bounds=(lb,ub),max_nfev=3000)
    B=unpack(sol.x);r=res(sol.x)
    # residual towers / cupolas / chimneys: blobs standing >1.5 yd above the fitted roof
    pred=np.maximum(env(B,U,V),Gy);diff=(H-pred)*Km
    blob=(diff>1.5).astype(np.uint8);blob=cv2.morphologyEx(blob,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    k2,l2,st2,_=cv2.connectedComponentsWithStats(blob);feats=[]
    for i in range(1,k2):
        a2=st2[i,4]*0.0625
        if a2<0.8: continue
        mm=l2==i;u=U[mm];v=V[mm];top=float(np.percentile(H[mm],95));base=float(np.median(pred[mm]))
        feats.append(dict(kind='chim' if a2<5 else 'tower',u0=float(u.min()),u1=float(u.max()),v0=float(v.min()),v1=float(v.max()),base=base,top=top,area=a2))
    out=dict(cid=cid,o_utm=[cE,cN],a=ang,ref=[refu,refv],gref=gref,blocks=[[b[0]]+[round(float(v),2) for v in b[1:]] for b in B],feats=feats,
             err_med=float(np.median(np.abs(r))),err_rms=float(np.sqrt((r**2).mean())),area=float(Km.sum()*0.0625),zone=G.zone)
    # centre in game yards
    lon,lat=None,None
    # invert UTM roughly by search around the footprint centroid
    gx=np.mean([p[0] for p in fp]);gy=np.mean([p[1] for p in fp])
    for _ in range(5):
        ex,ny=G.g2utm(gx,gy);gx+= (cE-ex)/YD;gy-= (cN-ny)/YD
    out['o']=[round(float(gx),2),round(float(gy),2)]
    # grid convergence: angle of game +x in UTM
    e1,n1=G.g2utm(gx+50,gy);e0,n0=G.g2utm(gx,gy);conv=math.degrees(math.atan2(n1-n0,e1-e0))
    out['a_game']=round(ang-conv,2)
    if dbg:
        def img(A):
            dx=np.gradient(A,axis=1);dy=np.gradient(A,axis=0);hs=np.clip(0.55+(-dx-dy)*3,0,1)
            col=cv2.applyColorMap((np.clip((A+4)/16,0,1)*255).astype(np.uint8),cv2.COLORMAP_JET).astype(float)/255
            return (col*(0.3+0.7*hs[...,None])*255).astype(np.uint8)
        P2=np.maximum(env(B,U,V),Gy);rr=np.clip((P2-H)/3,-1,1);rim=np.zeros(H.shape+(3,),np.uint8);rim[...,2]=(np.clip(rr,0,1)*255*Km);rim[...,0]=(np.clip(-rr,0,1)*255*Km)
        im=np.hstack([img(H),img(P2),rim]);sc=max(1,int(900/im.shape[1]*1.0));
        im=cv2.resize(im,None,fx=900/im.shape[1],fy=900/im.shape[1])
        cv2.putText(im,f'{cid} med {out["err_med"]:.2f} rms {out["err_rms"]:.2f} n{len(B)}',(5,15),0,.45,(255,255,255),1)
        cv2.imwrite(dbg,im)
    return out
