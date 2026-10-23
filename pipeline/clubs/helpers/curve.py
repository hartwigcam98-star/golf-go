"""Generate stepped GV/GU slices following a curved gable ridge polyline.
curve(pts, w, e, p, cap, step=3.5, maxoff=1.8) -> list of blocks"""
import numpy as np, math
def curve(pts,w,e,p,cap,step=3.5,maxoff=1.8):
    P=np.array(pts,float)
    # dense resample
    seg=np.hypot(*np.diff(P,axis=0).T);s=np.r_[0,np.cumsum(seg)];L=s[-1]
    ss=np.linspace(0,L,int(L*10)+2);D=np.c_[np.interp(ss,s,P[:,0]),np.interp(ss,s,P[:,1])]
    def at(t):
        q=np.c_[np.interp(t,s,P[:,0]),np.interp(t,s,P[:,1])][0]
        t0=max(0,t-1.5);t1=min(L,t+1.5)
        a=np.array([np.interp(t1,s,P[:,0])-np.interp(t0,s,P[:,0]),np.interp(t1,s,P[:,1])-np.interp(t0,s,P[:,1])])
        return q,a/np.linalg.norm(a)
    out=[];t=0
    while t<L-1e-6:
        q,d=at(t);mode='GV' if abs(d[1])>=abs(d[0]) else 'GU'
        tan=abs(d[0]/d[1]) if mode=='GV' else abs(d[1]/d[0])
        # slice length along axis
        la=min(step,2*maxoff/max(tan,1e-3)); ds=la/max(abs(d[1]) if mode=='GV' else abs(d[0]),1e-3)
        t1=min(L,t+ds)
        if L-t1<0.6*ds: t1=L
        qa,_=at(t);qb,_=at(t1);qm,dm=at((t+t1)/2)
        cs=abs(dm[1]) if mode=='GV' else abs(dm[0])
        hw=w/cs;pp=p*cs
        if mode=='GV':
            v0,v1=sorted([qa[1],qb[1]]);out.append(['GV',round(qm[0]-hw,2),round(qm[0]+hw,2),round(v0,2),round(v1,2),e,round(pp,3),cap])
        else:
            u0,u1=sorted([qa[0],qb[0]]);out.append(['GU',round(u0,2),round(u1,2),round(qm[1]-hw,2),round(qm[1]+hw,2),e,round(pp,3),cap])
        t=t1
    return out
