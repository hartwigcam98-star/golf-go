import numpy as np
from scipy.spatial import cKDTree
def fit(px,py,pz,gx,gy,sig,order=2,K=400,chunk=2500):
    if gx.size>chunk:
        fx,fy=gx.ravel(),gy.ravel();R=[fit(px,py,pz,fx[i:i+chunk],fy[i:i+chunk],sig,order,K,chunk) for i in range(0,len(fx),chunk)]
        return tuple(np.concatenate([r[k] for r in R]).reshape(gx.shape) for k in range(4))
    """Gaussian-weighted local polynomial fit of scattered points at nodes (gx,gy). Returns z, slope (dz/dx,dz/dy), weight sum."""
    T=cKDTree(np.c_[px,py]);Q=np.c_[gx.ravel(),gy.ravel()]
    d,ix=T.query(Q,k=K,distance_upper_bound=3*sig)
    ok=np.isfinite(d);ix=np.where(ok,ix,0)
    dx=px[ix]-Q[:,:1];dy=py[ix]-Q[:,1:];w=np.where(ok,np.exp(-.5*(d/sig)**2),0)
    cols=[np.ones_like(dx),dx,dy]+([dx*dx,dx*dy,dy*dy] if order==2 else [])
    X=np.stack(cols,-1);Wx=X*w[...,None]
    M=np.einsum('nki,nkj->nij',Wx,X)+np.eye(len(cols))*1e-9;b=np.einsum('nki,nk->ni',Wx,pz[ix])
    ws=w.sum(1);good=ws>(4 if order==2 else 2)
    sol=np.full((len(Q),len(cols)),np.nan)
    sol[good]=np.linalg.solve(M[good],b[good][...,None])[...,0]
    sh=gx.shape
    return sol[:,0].reshape(sh),sol[:,1].reshape(sh),sol[:,2].reshape(sh),ws.reshape(sh)

