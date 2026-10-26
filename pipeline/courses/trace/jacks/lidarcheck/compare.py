import json,glob,numpy as np
from scipy.interpolate import griddata
from scipy import ndimage as ndi
from utm import to_course
from stats import st_
d=np.load('cd/pts_jacks.npz');S=json.load(open('cd/summary.json'))['courses']['jacks']['points']
SIG=0.7   # yd: same light smoothing on both surfaces so lidar noise (~3 cm) doesn't read as slope
out={}
print('hole | game: tilt  med  p90  max relief | lidar: tilt  med  p90  max relief | shift(yd) corr | pts/m2')
for gi in range(18):
    g=json.load(open('g%02d.json'%(gi+1)));nx,ny,st=g['nx'],g['ny'],g['st']
    Zg=np.array(g['Z']).reshape(ny,nx);M=np.array(g['M']).reshape(ny,nx)>0
    res=max(S[str(gi)],key=lambda r:S[str(gi)][r]['gdens'])
    k=lambda n:d[f'g{gi}|{res}|{n}']
    E=k('ox')+k('x')/100.;N=k('oy')+k('y')/100.;z=k('z')/1000./0.9144   # metres -> yards like the game
    cx,cy=to_course(E,N)
    # a 4 yd bigger window for the shift search
    pad=8;X=g['X0']+(np.arange(-pad,nx+pad))*st;Y=g['Y0']+(np.arange(-pad,ny+pad))*st;XX,YY=np.meshgrid(X,Y)
    Zl=griddata((cx,cy),z,(XX,YY),method='linear')
    Zl=np.where(np.isnan(Zl),np.nanmean(Zl),Zl);Zl=ndi.gaussian_filter(Zl,SIG/st)
    Zgs=ndi.gaussian_filter(Zg,SIG/st)
    # best shift: compare slopes (gradients) so the different height bases don't matter
    gyg,gxg=np.gradient(Zgs,st);best=None
    for dy in range(-pad,pad+1,2):
        for dx in range(-pad,pad+1,2):
            Zs=Zl[pad+dy:pad+dy+ny,pad+dx:pad+dx+nx];gy,gx=np.gradient(Zs,st)
            c=np.corrcoef(np.r_[gx[M],gy[M]],np.r_[gxg[M],gyg[M]])[0,1]
            if best is None or c>best[0]:best=(c,dx,dy)
    c,dx,dy=best;Zs=Zl[pad+dy:pad+dy+ny,pad+dx:pad+dx+nx]
    a=st_(Zgs,M,st);b=st_(Zs,M,st)
    print('%3d  | %5.2f %4.2f %4.2f %5.2f %5.1f cm | %5.2f %4.2f %4.2f %5.2f %5.1f cm | %+4.1f %+4.1f %5.2f | %.1f %s'%(gi+1,*a,*b,dx*st,dy*st,c,S[str(gi)][res]['gdens'],res))
    out[gi+1]=dict(game=a,lidar=b,shift=[dx*st,dy*st],corr=c,res=res)
    np.save('lid_%02d.npy'%(gi+1),Zs);np.save('gam_%02d.npy'%(gi+1),Zgs)
json.dump(out,open('compare.json','w'))
