"""Stepped approximation of a curved gable band (constant eave/pitch/ridge) following a ridge polyline.
band(cid, pts, w, e, p, cap, strips) ; strips = list of (mode, a, b) with mode 'GV' (a,b = v range) or 'GU' (u range).
Pixels are assigned to the strip containing them, restricted to those whose nearest ridge point is in that strip's mode
region (angle test), and to |dist to ridge| <= w+0.5 and K mask & H>hmin."""
import numpy as np, math, json
def band(cid,pts,w,e,p,cap,strips,hmin=8.0,base='/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub',extra_mask=None,sym_tol=1.5,minpix=30):
    z=np.load(f'{base}/work/{cid}/frame.npz');U,V,H,K=z['U'],z['V'],z['H'],z['K']
    P=np.array(pts,float);seg=np.diff(P,axis=0);sl=np.hypot(*seg.T);s=np.r_[0,np.cumsum(sl)]
    ss=np.linspace(0,s[-1],int(s[-1]*8)+2);R=np.c_[np.interp(ss,s,P[:,0]),np.interp(ss,s,P[:,1])]
    T=np.gradient(R,axis=0);T/=np.linalg.norm(T,axis=1)[:,None]
    m=K&(np.nan_to_num(H,nan=-9)>hmin)
    if extra_mask is not None: m&=extra_mask(U,V)
    uu=U[m];vv=V[m]
    # nearest ridge sample
    from scipy.spatial import cKDTree
    d,idx=cKDTree(R).query(np.c_[uu,vv])
    t=T[idx];rel=np.c_[uu,vv]-R[idx];cr=t[:,0]*rel[:,1]-t[:,1]*rel[:,0]  # side sign
    along=(rel*t).sum(1)
    ok=(d<=w+0.7)
    # past the ends of the polyline only keep within 0.7 yd
    end=((idx==0)&(along<-0.5))|((idx==len(R)-1)&(along>0.7))
    ok&=~end
    gv=np.abs(t[:,1])>=np.abs(t[:,0])
    out=[]
    for mode,a,b in strips:
        if mode=='GV': sel=ok&gv&(vv>=a)&(vv<b);mid=(a+b)/2
        else: sel=ok&~gv&(uu>=a)&(uu<b)
        if sel.sum()<minpix: continue
        ti=t[sel];cs=np.median(np.abs(ti[:,1] if mode=='GV' else ti[:,0]));pp=p*cs
        coord=uu[sel] if mode=='GV' else vv[sel]
        # ridge coordinate at strip middle: from ridge samples in the strip
        rs=R[(R[:,1]>=a)&(R[:,1]<b)] if mode=='GV' else R[(R[:,0]>=a)&(R[:,0]<b)]
        side=cr[sel]
        lo=np.percentile(coord,0.5);hi=np.percentile(coord,99.5)
        if len(rs): rc=np.mean(rs[:,0] if mode=='GV' else rs[:,1])
        else: rc=None
        def blk(t_,c0,c1,e_,p_,cap_):
            if mode=='GV': return [t_.replace('*','U'),round(c0,2),round(c1,2),round(a,2),round(b,2),round(e_,2),round(p_,3),round(cap_,2)]
            return [t_.replace('*','V'),round(a,2),round(b,2),round(c0,2),round(c1,2),round(e_,2),round(p_,3),round(cap_,2)]
        if rc is not None and lo<rc<hi and abs((rc-lo)-(hi-rc))<sym_tol:
            hw=(hi-lo)/2;c=(lo+hi)/2
            out.append(['GV' if mode=='GV' else 'GU',*blk('X',c-hw,c+hw,e,pp,cap)[1:]])
        else:
            # split at the ridge (or treat as a single shed if one side only)
            rcc=rc if rc is not None else None
            for sgn in (-1,1):
                cc=coord[side*sgn>0] if True else None
                if len(cc)<minpix//2: continue
                l=np.percentile(cc,0.5);h=np.percentile(cc,99.5)
                # which end is the eave: the end farther from the ridge
                if rcc is None: rcc_=np.median(coord)
                else: rcc_=rcc
                if abs(l-rcc_)>abs(h-rcc_):  # eave at low end, rising
                    hgt=min(cap,e+pp*(h-l));out.append(blk('S*',l,h,e,pp,hgt))
                else:
                    hgt=min(cap,e+pp*(h-l));out.append(blk('S*',l,h,hgt,-pp,e))
    return out
