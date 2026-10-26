import json,numpy as np,glob
def st_(Z,M,st):
    gy,gx=np.gradient(Z,st);sl=np.hypot(gx,gy)*100
    YY,XX=np.mgrid[0:Z.shape[0],0:Z.shape[1]]*st
    A=np.c_[np.ones(M.sum()),XX[M],YY[M]];c=np.linalg.lstsq(A,Z[M],rcond=None)[0];res=Z[M]-A@c
    return np.hypot(c[1],c[2])*100,np.median(sl[M]),np.percentile(sl[M],90),sl[M].max(),(np.percentile(res,98)-np.percentile(res,2))*91.44
if __name__=='__main__':
    print('hole hi area  tilt%  med%  p90%  max%  relief cm')
    for f in sorted(glob.glob('g[0-9][0-9].json')):
        g=json.load(open(f));Z=np.array(g['Z']).reshape(g['ny'],g['nx']);M=np.array(g['M']).reshape(g['ny'],g['nx'])>0
        print('%3d %3d %5.0f'%(g['hole'],g['hi']+1,M.sum()*g['st']**2),' %5.2f %5.2f %5.2f %5.2f %6.1f'%st_(Z,M,g['st']))
