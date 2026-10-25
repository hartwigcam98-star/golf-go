import json,cv2,numpy as np
D='/home/claude/dl/fine/';d=np.load(D+'jacks_dem2x.npz');EXT=d['ext'];W=int(d['W']);H=int(d['H']);Y0=int(d['Y0']);F=int(d['F'])
g=d['g'].astype(np.float32);g[g<0]=np.nan;g=g/100+float(d['z0'])
s=d['s'].astype(np.float32);s[s<0]=np.nan;s=s/100+float(d['z0'])
# fill ground gaps
from scipy import ndimage
m=np.isnan(g);idx=ndimage.distance_transform_edt(m,return_distances=False,return_indices=True);g=g[tuple(idx)]
np.save('g2.npy',g.astype(np.float32));np.save('s2.npy',s.astype(np.float32))
dlon=(EXT[2]-EXT[0])/W;dlat=(EXT[3]-EXT[1])/H
mos=np.zeros((g.shape[0],W,3),np.uint8)
for t in json.load(open(D+'air_tiles.json')):
    im=cv2.imread(D+t['f']);w,s_,e,n=t['bbox']
    c0=(w-EXT[0])/dlon;c1=(e-EXT[0])/dlon;r0=(EXT[3]-n)/dlat-Y0;r1=(EXT[3]-s_)/dlat-Y0
    C0,C1,R0,R1=int(round(c0)),int(round(c1)),int(round(r0)),int(round(r1))
    rs=cv2.resize(im,(C1-C0,R1-R0),interpolation=cv2.INTER_AREA)
    rr0=max(R0,0);rr1=min(R1,mos.shape[0]);cc0=max(C0,0);cc1=min(C1,W)
    mos[rr0:rr1,cc0:cc1]=rs[rr0-R0:rr1-R0,cc0-C0:cc1-C0]
cv2.imwrite('mos2.jpg',mos,[cv2.IMWRITE_JPEG_QUALITY,90]);print(g.shape,mos.shape,Y0,F)
