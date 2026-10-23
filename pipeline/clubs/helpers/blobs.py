# blobs.py cid spec.json [thr] : list residual blobs (lidar-model) > thr in yd, area>=3 yd2, near the building
import sys,json,numpy as np,cv2
sys.path.insert(0,'/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub');import bk
cid=sys.argv[1];spec=json.load(open(sys.argv[2]));thr=float(sys.argv[3]) if len(sys.argv)>3 else 0.8
z=np.load(f'/tmp/claude-0/-home-claude/6ab24462-1809-5f44-97e3-eeb8e80b9130/scratchpad/allclub/work/{cid}/frame.npz');U,V,H,G,K=z['U'],z['V'],z['H'],z['G'],z['K']
M=np.maximum(bk.env_spec(spec,U,V),G);R=np.nan_to_num(H,nan=0)-M
roi=cv2.dilate(K.astype(np.uint8),np.ones((9,9),np.uint8))>0
for sgn,name in ((1,'LIDAR HIGHER (blue)'),(-1,'MODEL HIGHER (red)')):
    m=((sgn*R>thr)&roi).astype(np.uint8);m=cv2.morphologyEx(m,cv2.MORPH_OPEN,np.ones((3,3),np.uint8))
    n,lab,st,_=cv2.connectedComponentsWithStats(m);print(name)
    for i in np.argsort(-st[:,4]):
        if i==0 or st[i,4]<48: continue
        s=lab==i;print('  area %5.1f yd2  u %6.1f..%6.1f  v %6.1f..%6.1f  mean dz %+.1f  lidar mean %.1f'%(st[i,4]/16,U[s].min(),U[s].max(),V[s].min(),V[s].max(),R[s].mean(),H[s].mean()))
