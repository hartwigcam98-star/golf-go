# residual map, 1 char per step: '.' |r|<.4 ; '+' model high .4-1.5 ; '#' high >1.5 ; '-' model low ; '=' low >1.5 ; ' ' outside roi
import sys,json,numpy as np,cv2
sys.path.insert(0,'/home/claude/golf/clubs')
from bk import load,env,env_spec
cid=sys.argv[1];f=sys.argv[2];st=float(sys.argv[3]) if len(sys.argv)>3 else 1
W,U,V,H,G,K=load(cid);S=json.load(open(f))
P=np.maximum(env_spec(S,U,V),G);R=P-H;dil=cv2.dilate(K.astype(np.uint8),np.ones((9,9),np.uint8))>0
ys,xs=np.nonzero(dil);px=U[0,1]-U[0,0];s=max(1,int(round(st/px)))
y0,y1,x0,x1=ys.min(),ys.max(),xs.min(),xs.max()
cols=list(range(x0,x1,s))
print('      '+''.join((f'{int(round(U[0,x]))}'+' '*10)[:10] if i%10==0 else '' for i,x in enumerate(cols)))
for y in range(y0,y1,s):
    line=''
    for x in cols:
        m=dil[y:y+s,x:x+s]
        if m.mean()<.5: line+=' ';continue
        r=np.median(R[y:y+s,x:x+s][m])
        line+='.' if abs(r)<.4 else ('+' if 0<r<1.5 else '#' if r>=1.5 else '-' if r>-1.5 else '=')
    print(f'{V[y,0]:5.0f} '+line)
