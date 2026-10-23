"""Roof as planar facets: segment the lidar roof (in the building frame) into planes, then a label grid at STEP yd + plane list."""
import numpy as np, cv2, math
import scipy.ndimage as nd
def segment(U,V,H,Km,step=0.6):
    px=U[0,1]-U[0,0]
    Hs=cv2.GaussianBlur(H.astype(np.float32),(0,0),1.0)
    gv,gu=np.gradient(Hs);gu/=px;gv/=px
    sl=np.hypot(gu,gv);asp=(np.degrees(np.arctan2(gv,gu))+360)%360
    inner=(cv2.erode(Km.astype(np.uint8),np.ones((3,3),np.uint8))>0)
    # quantised orientation: flat, or one of 8 aspect sectors; steep (walls/edges) left unlabeled
    q=np.zeros(H.shape,np.int32)
    flat=(sl<0.1)&inner;q[flat]=1
    sec=((asp+22.5)//45).astype(int)%8
    ok=(sl>=0.1)&(sl<1.8)&inner;q[ok]=2+sec[ok]
    # local consistency: curvature high -> unlabeled
    lap=np.abs(cv2.Laplacian(Hs,cv2.CV_32F))/px/px
    q[lap>4.0]=0
    lab=np.zeros(H.shape,np.int32);nxt=1;planes={}
    for k in range(1,10):
        m=(q==k).astype(np.uint8)
        n,l,st,_=cv2.connectedComponentsWithStats(m,connectivity=4)
        for i in range(1,n):
            if st[i,4]*px*px<1.5: continue
            sel=l==i;lab[sel]=nxt;nxt+=1
    def fitplanes(lab):
        P={}
        for i in np.unique(lab):
            if i==0: continue
            sel=lab==i;u=U[sel];v=V[sel];h=H[sel]
            A=np.c_[np.ones_like(u),u,v]
            c,*_=np.linalg.lstsq(A,h,rcond=None)
            # robust refit
            r=np.abs(A@c-h);w=r<max(0.15,np.percentile(r,80))
            if w.sum()>6: c,*_=np.linalg.lstsq(A[w],h[w],rcond=None)
            P[i]=c
        return P
    P=fitplanes(lab)
    # reassign every building pixel to the best plane among labels within a window (twice)
    ids=np.array(sorted(P));
    for it in range(3):
        best=np.full(H.shape,1e9,np.float32);newlab=np.zeros_like(lab)
        dil={}
        for i in ids:
            m=(lab==i).astype(np.uint8)
            reach=cv2.dilate(m,np.ones((9,9),np.uint8))>0
            c=P[i];pred=c[0]+c[1]*U+c[2]*V;err=np.abs(pred-H).astype(np.float32)
            err[~reach]=1e9;upd=err<best;best[upd]=err[upd];newlab[upd]=i
        newlab[~Km]=0
        # pixels no plane explains (chimneys, vents, trees): keep as 'raw' (-1)
        newlab[(best>0.6)&Km]=-1
        lab=newlab
        # drop tiny regions, refit
        for i in ids:
            if (lab==i).sum()*px*px<1.0: lab[lab==i]=-1
        P=fitplanes(np.where(lab>0,lab,0));ids=np.array(sorted(P))
    return lab,P
def to_grid(U,V,H,Km,lab,P,step=0.6):
    """coarsen to a step-yd grid: each cell takes the majority label; -1/raw cells take the median height (flat)"""
    px=U[0,1]-U[0,0];f=max(1,int(round(step/px)))
    n0=(U.shape[0]//f)*f;n1=(U.shape[1]//f)*f
    L=lab[:n0,:n1].reshape(n0//f,f,n1//f,f).transpose(0,2,1,3).reshape(n0//f,n1//f,f*f)
    Hh=H[:n0,:n1].reshape(n0//f,f,n1//f,f).transpose(0,2,1,3).reshape(n0//f,n1//f,f*f)
    G=np.zeros(L.shape[:2],np.int32);Z=np.zeros(L.shape[:2],np.float32)
    for r in range(L.shape[0]):
        for c in range(L.shape[1]):
            v=L[r,c];nz=v[v!=0]
            if len(nz)<f*f*0.5: continue
            vals,cnt=np.unique(nz,return_counts=True);g=vals[np.argmax(cnt)];G[r,c]=g
            if g==-1: Z[r,c]=float(np.median(Hh[r,c][v==-1]))
    u0=float(U[0,0]);v0=float(V[0,0])
    return G,Z,u0,v0,step*f/ f if False else px*f
