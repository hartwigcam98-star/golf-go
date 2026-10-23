"""Clubhouse roof from lidar as planar facets on a 0.5 yd grid in the building's frame (for the game's lidar clubhouse renderer)."""
import numpy as np, math, json, cv2, sys
from scipy.interpolate import griddata
import scipy.ndimage as nd
sys.path.insert(0,__file__.rsplit('/',1)[0])
from fitter import Geo, YD
from facets import segment
def prep(lid,origin,fp):
    D=np.load(lid);dsm=D['dsm'];gr=D['ground'];bc=D['bld'];X0,Y0,X1,Y1=[float(v) for v in D['box']];rs=float(D['res']);E=int(D['epsg']);G=Geo(origin,E);n=dsm.shape[0]
    gi=np.argwhere(np.isfinite(gr));gv=gr[np.isfinite(gr)];yy,xx=np.mgrid[0:gr.shape[0],0:gr.shape[1]]
    gf=griddata(gi,gv,(yy,xx),method='linear');m=~np.isfinite(gf)
    if m.any(): gf[m]=griddata(gi,gv,(yy[m],xx[m]),method='nearest')
    f=n/gr.shape[0];gfull=cv2.resize(gf.astype(np.float32),(n,n),interpolation=cv2.INTER_LINEAR)
    d2=dsm.copy();bad=~np.isfinite(d2)
    if bad.mean()>0.02:   # sparse survey: fill the empty cells linearly between the measured ones
        vi=np.argwhere(~bad);vv=d2[~bad];bi=np.argwhere(bad)
        d2[bad]=griddata(vi,vv,bi,method='linear');bad=~np.isfinite(d2)
    if bad.any(): idx=nd.distance_transform_edt(bad,return_distances=False,return_indices=True);d2=d2[tuple(idx)]
    fx,fy=G.g2utm([p[0] for p in fp],[p[1] for p in fp])
    fpx=np.stack([(np.array(fx)-X0)/rs,(Y1-np.array(fy))/rs],1)
    FPm=np.zeros((n,n),np.uint8);cv2.fillPoly(FPm,[np.round(fpx).astype(np.int32)],1)
    mu=D['multi'] if 'multi' in D.files else None
    if mu is not None: mu=cv2.resize(mu,(n,n),interpolation=cv2.INTER_NEAREST)
    return dict(mu=mu,d2=d2,g=gfull,bc=bc,FPm=FPm,X0=X0,Y0=Y0,X1=X1,Y1=Y1,rs=rs,G=G,n=n)
RTH=0.30
def mask(S):
    d2,g,bc,FPm,rs=S['d2'],S['g'],S['bc'],S['FPm'],S['rs']
    nd_=d2-g;near=cv2.dilate(FPm,np.ones((int(10/rs),int(10/rs)),np.uint8))>0
    # planarity: what's left after a smooth surface is taken out, spread over a 5x5 window (roofs are planes, trees are not)
    n_=d2.shape[0];c4=d2[:n_//4*4,:n_//4*4].reshape(n_//4,4,n_//4,4).max(axis=(1,3)).astype(np.float32)
    hp=c4-cv2.GaussianBlur(c4,(0,0),1.0);r4=np.sqrt(cv2.blur(hp*hp,(3,3)));rough=cv2.resize(r4,(n_,n_),interpolation=cv2.INTER_NEAREST)
    hasB=(bc[FPm>0]>0).mean()>0.2
    if hasB:
        BM=(cv2.morphologyEx((bc>0).astype(np.uint8),cv2.MORPH_CLOSE,np.ones((5,5),np.uint8))>0)&(nd_>1.5)
    elif S.get('mu') is not None:
        # trees: a good share of their returns are not the last of their pulse
        veg=cv2.GaussianBlur(S['mu'].astype(np.float32),(0,0),2.0)>255*0.22
        BM=(nd_>1.8)&~veg
    else:
        BM=(nd_>1.8)&(rough<RTH)
    BM=(BM&near).astype(np.uint8)
    BM=cv2.morphologyEx(BM,cv2.MORPH_OPEN,np.ones((5,5),np.uint8));BM=cv2.morphologyEx(BM,cv2.MORPH_CLOSE,np.ones((7,7),np.uint8))
    k,lab,st,_=cv2.connectedComponentsWithStats(BM);keep=np.zeros_like(BM)
    for i in range(1,k):
        sel=lab==i;a=st[i,4]*rs*rs;ov=(FPm[sel]>0).mean();cov=(sel&(FPm>0)).sum()/max(1,(FPm>0).sum())
        if a>20 and (ov>.3 or cov>.25): keep[sel]=1
    # fill holes (courtyards stay if big)
    ff=nd.binary_fill_holes(keep);holes=ff&~(keep>0);hl,hn=nd.label(holes)
    for i in range(1,hn+1):
        if (hl==i).sum()*rs*rs<15: keep[hl==i]=1
    return keep,hasB
def frame(S,keep):
    rs=S['rs'];cs,_=cv2.findContours(keep,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);angs=[];wts=[]
    for c in cs:
        P=c[:,0,:].astype(float)
        for i in range(0,len(P),2):
            v=P[(i+10)%len(P)]-P[i];L=np.hypot(*v)
            if L>7: angs.append(math.degrees(math.atan2(-v[1],v[0]))%90);wts.append(L)
    hist,ed=np.histogram(angs,bins=90,range=(0,90),weights=wts);hs=np.convolve(np.r_[hist[-2:],hist,hist[:2]],np.ones(5),'valid')
    ang=float(ed[np.argmax(hs)]+.5)
    ys,xs=np.nonzero(keep);cE=S['X0']+xs.mean()*rs;cN=S['Y1']-ys.mean()*rs
    return ang,cE,cN
def tidy(G,PL,Hc,Uc,Vc,st):
    G=G.copy();PL=[list(p) for p in PL];nv,nu=G.shape;UU,VV=np.meshgrid(Uc,Vc)
    def pv(l,r,c): p=PL[l-1];return p[0]+p[1]*Uc[c]+p[2]*Vc[r]
    def areas(): return np.bincount(G.ravel(),minlength=len(PL)+1)*st*st
    for it in range(3):
        A=areas();small=set(l for l in range(1,len(PL)+1) if 0<A[l]<2.2)
        rr,cc=np.nonzero(np.isin(G,list(small))) if small else ([],[])
        for r,c in zip(rr,cc):
            best=None
            for dr in range(-3,4):
                for dc in range(-3,4):
                    r2,c2=r+dr,c+dc
                    if 0<=r2<nv and 0<=c2<nu:
                        l=G[r2,c2]
                        if l and l not in small:
                            e=abs(pv(l,r,c)-Hc[r,c])
                            if best is None or e<best[0]: best=(e,l)
            if best and best[0]<0.45: G[r,c]=best[1]
    # leftovers still in small labels: compact raised bits keep a flat top at their median height
    A=areas()
    for l in range(1,len(PL)+1):
        if 0<A[l]<2.2:
            m=G==l;PL[l-1]=[float(np.median(Hc[m])),0.0,0.0]
    # merge near-identical neighbouring planes
    changed=True
    while changed:
        changed=False
        pairs={}
        for a_,b_ in ((G[:,:-1],G[:,1:]),(G[:-1,:],G[1:,:])):
            m=(a_!=b_)&(a_>0)&(b_>0)
            for x,y in zip(a_[m],b_[m]): pairs[(min(x,y),max(x,y))]=pairs.get((min(x,y),max(x,y)),0)+1
        for (a,b),n in sorted(pairs.items(),key=lambda t:-t[1]):
            pa,pb=PL[a-1],PL[b-1]
            if abs(pa[1]-pb[1])<0.07 and abs(pa[2]-pb[2])<0.07:
                m=(G==a)|(G==b);d=np.abs((pa[0]+pa[1]*UU[m]+pa[2]*VV[m])-(pb[0]+pb[1]*UU[m]+pb[2]*VV[m]))
                if np.median(d)<0.2:
                    Aa=np.c_[np.ones(m.sum()),UU[m],VV[m]];c,*_=np.linalg.lstsq(Aa,Hc[m],rcond=None)
                    if np.median(np.abs(Aa@c-Hc[m]))<0.2:
                        G[G==b]=a;PL[a-1]=[float(c[0]),float(c[1]),float(c[2])];changed=True;break
    # outline: drop spurs, fill notches
    for it in range(2):
        B=G>0;nb=np.zeros_like(G)
        nb[1:,:]+=B[:-1,:];nb[:-1,:]+=B[1:,:];nb[:,1:]+=B[:,:-1];nb[:,:-1]+=B[:,1:]
        G[B&(nb<=1)]=0
        fill=(~B)&(nb>=3)
        for r,c in zip(*np.nonzero(fill)):
            cand=[G[r2,c2] for r2,c2 in ((r-1,c),(r+1,c),(r,c-1),(r,c+1)) if 0<=r2<nv and 0<=c2<nu and G[r2,c2]]
            if cand: G[r,c]=max(set(cand),key=cand.count)
    return G,PL
def build(cid,lid,origin,fp,dbg=None,step=0.5):
    S=prep(lid,origin,fp);keep,hasB=mask(S)
    if keep.sum()*S['rs']**2<40: return dict(cid=cid,err='no building found in lidar')
    ang,cE,cN=frame(S,keep);rs=S['rs'];A=math.radians(ang);ca,sa=math.cos(A),math.sin(A)
    ys,xs=np.nonzero(keep);ext=math.hypot(np.ptp(xs),np.ptp(ys))*rs/YD/2+3
    uu=np.arange(-ext,ext,0.25);U,V=np.meshgrid(uu,uu)
    Em=cE+(U*ca+V*sa)*YD;Nm=cN+(U*sa-V*ca)*YD
    mx=((Em-S['X0'])/rs).astype(np.float32);my=((S['Y1']-Nm)/rs).astype(np.float32)
    Hm=cv2.remap(S['d2'].astype(np.float32),mx,my,cv2.INTER_LINEAR);Gm=cv2.remap(S['g'],mx,my,cv2.INTER_LINEAR)
    Km=cv2.remap(keep.astype(np.float32),mx,my,cv2.INTER_NEAREST)>.5
    # reference ground: the highest ground in a ring just outside the building (its upper entrance level)
    K8=Km.astype(np.uint8);ring=(cv2.dilate(K8,np.ones((25,25),np.uint8))>0)&~(cv2.dilate(K8,np.ones((9,9),np.uint8))>0)
    gref=float(np.percentile(Gm[ring],85));iref=int(np.argmin(np.where(ring,np.abs(Gm-gref),1e9)));refu,refv=float(U.flat[iref]),float(V.flat[iref])
    H=(Hm-gref)/YD;Gy=(Gm-gref)/YD
    lab,P=segment(U,V,H,Km)
    # majority filter the labels, then coarsen to the step grid
    f=int(round(step/0.25));n0=(U.shape[0]//f)*f;n1=(U.shape[1]//f)*f
    L=lab[:n0,:n1].reshape(n0//f,f,n1//f,f).transpose(0,2,1,3).reshape(n0//f,n1//f,f*f);Hh=H[:n0,:n1].reshape(n0//f,f,n1//f,f).transpose(0,2,1,3).reshape(n0//f,n1//f,f*f)
    Kc=Km[:n0,:n1].reshape(n0//f,f,n1//f,f).mean(axis=(1,3))>=.5
    G=np.zeros(L.shape[:2],np.int32);Z=np.full(L.shape[:2],np.nan,np.float32)
    for r in range(L.shape[0]):
        for c in range(L.shape[1]):
            if not Kc[r,c]: continue
            v=L[r,c];nz=v[v!=0]
            if len(nz)==0: G[r,c]=-1;Z[r,c]=float(np.median(Hh[r,c]));continue
            vals,cnt=np.unique(nz,return_counts=True);g=int(vals[np.argmax(cnt)]);G[r,c]=g
            if g==-1: Z[r,c]=float(np.median(Hh[r,c]))
    # raw cells (vents, chimneys, cupola sides, trees over the roof): flat planes at quantised heights
    planes=[];idmap={}
    for i,c in sorted(P.items()):
        if (G==i).sum()==0: continue
        idmap[i]=len(planes)+1;planes.append([round(float(c[0]),3),round(float(c[1]),4),round(float(c[2]),4)])
    raw=G==-1
    if raw.any():
        q=np.round(Z[raw]/0.25)*0.25
        for hv in np.unique(q):
            idmap[('r',hv)]=len(planes)+1;planes.append([float(hv),0.0,0.0])
    out=np.zeros(G.shape,np.int32)
    for i,j in idmap.items():
        if isinstance(i,tuple): continue
        out[G==i]=j
    if raw.any():
        rr,cc=np.nonzero(raw)
        for r_,c_ in zip(rr,cc): out[r_,c_]=idmap[('r',float(np.round(Z[r_,c_]/0.25)*0.25))]
    # speckle clean: a lone cell takes its neighbours' label when its own plane is within 0.2 yd of theirs
    u0=float(U[0,0]);v0=float(V[0,0]);st=0.25*f
    Uc=u0+(np.arange(out.shape[1])+.5)*st;Vc=v0+(np.arange(out.shape[0])+.5)*st
    for it in range(2):
        o2=out.copy()
        for r in range(1,out.shape[0]-1):
            for c in range(1,out.shape[1]-1):
                l=out[r,c]
                if l==0: continue
                nb=[out[r-1,c],out[r+1,c],out[r,c-1],out[r,c+1]];nb=[x for x in nb if x]
                if not nb or l in nb: continue
                vals,cnt=np.unique(nb,return_counts=True);m=int(vals[np.argmax(cnt)])
                if cnt.max()>=3:
                    pa=planes[l-1];pb=planes[m-1];ha=pa[0]+pa[1]*Uc[c]+pa[2]*Vc[r];hb=pb[0]+pb[1]*Uc[c]+pb[2]*Vc[r]
                    if abs(ha-hb)<0.35: o2[r,c]=m
        out=o2
    # tidy: tiny facets and loose cells join the neighbouring plane that explains them, near-identical neighbours merge,
    # the outline loses single-cell spurs; what stays apart from the planes (chimneys, vents, cupolas) becomes flat tops
    Hcell=cv2.resize(H[:n0,:n1],(len(Uc),len(Vc)),interpolation=cv2.INTER_AREA)
    out,planes=tidy(out,planes,Hcell,Uc,Vc,st)
    # crop to the building
    rows=np.nonzero(out.any(1))[0];cols=np.nonzero(out.any(0))[0]
    out=out[rows[0]:rows[-1]+1,cols[0]:cols[-1]+1];u0+=cols[0]*st;v0+=rows[0]*st
    # drop unused planes and renumber
    used=sorted(set(np.unique(out))-{0});ren={o:i+1 for i,o in enumerate(used)};planes=[planes[o-1] for o in used]
    out2=np.zeros_like(out)
    for o,i in ren.items(): out2[out==o]=i
    # run-length encode row by row: [label,count,...]
    rle=[];flat=out2.ravel();i=0
    while i<len(flat):
        j=i
        while j<len(flat) and flat[j]==flat[i] and j-i<4000: j+=1
        rle+= [int(flat[i]),j-i];i=j
    # game-yard centre and angle
    Gg=S['G'];gx=np.mean([p[0] for p in fp]);gy=np.mean([p[1] for p in fp])
    for _ in range(6):
        ex,ny=Gg.g2utm(gx,gy);gx+=(cE-ex)/YD;gy-=(cN-ny)/YD
    e1,n1=Gg.g2utm(gx+50,gy);e0,n0_=Gg.g2utm(gx,gy);conv=math.degrees(math.atan2(n1-n0_,e1-e0))
    # check: rebuilt heights vs lidar
    UU,VV=np.meshgrid(Uc[cols[0]:cols[-1]+1],Vc[rows[0]:rows[-1]+1]);R=np.full(out2.shape,np.nan)
    for i,p in enumerate(planes): m=out2==i+1;R[m]=p[0]+p[1]*UU[m]+p[2]*VV[m]
    Hc=cv2.resize(H,(len(Uc),len(Vc)),interpolation=cv2.INTER_AREA)[rows[0]:rows[-1]+1,cols[0]:cols[-1]+1]
    mm=np.isfinite(R);err=float(np.median(np.abs(R[mm]-Hc[mm])))
    res=dict(cid=cid,o=[round(float(gx),2),round(float(gy),2)],a=round(ang-conv,3),s=st,u0=round(u0,3),v0=round(v0,3),nu=int(out2.shape[1]),nv=int(out2.shape[0]),
             P=planes,L=rle,ref=[round(refu,2),round(refv,2)],err=round(err,3),area=round(float((out2>0).sum()*st*st),1),hasB=bool(hasB),
             hmax=round(float(np.nanmax(R)),2))
    if dbg:
        def img(A):
            A=np.nan_to_num(A,nan=-4);dx=np.gradient(A,axis=1);dy=np.gradient(A,axis=0);hs=np.clip(0.55+(-dx-dy)*1.2,0,1)
            col=cv2.applyColorMap((np.clip((A+4)/16,0,1)*255).astype(np.uint8),cv2.COLORMAP_JET).astype(float)/255
            return (col*(0.3+0.7*hs[...,None])*255).astype(np.uint8)
        Hfull=cv2.resize(H,(len(Uc),len(Vc)),interpolation=cv2.INTER_AREA)[max(0,rows[0]-8):rows[-1]+9,max(0,cols[0]-8):cols[-1]+9]
        Rp=np.full(Hfull.shape,np.nan);r0=rows[0]-max(0,rows[0]-8);c0=cols[0]-max(0,cols[0]-8);Rp[r0:r0+R.shape[0],c0:c0+R.shape[1]]=R
        im=np.hstack([img(Hfull),img(Rp)]);s2=1000/im.shape[1];im=cv2.resize(im,None,fx=s2,fy=s2,interpolation=cv2.INTER_NEAREST)
        cv2.putText(im,f'{cid} err {err:.2f} yd  planes {len(planes)}  {"cls6" if hasB else "rough"}',(5,16),0,.5,(255,255,255),1);cv2.imwrite(dbg,im)
    return res
if __name__=='__main__':
    cid,lid,ol,fpj,out=sys.argv[1:6]
    r=build(cid,lid,json.loads(ol),json.loads(fpj),dbg=out.replace('.json','.jpg'))
    json.dump(r,open(out,'w'),separators=(',',':'));print(cid,r.get('err'),r.get('area'),len(r.get('P',[])),len(json.dumps(r)))
