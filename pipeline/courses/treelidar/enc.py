from common import *
import base64,re
S=np.load('seg_troy.npz');T=np.load('stats_troy.npz')
h=S['h'];area=S['area'];exg=T['exg'];Lm=T['L'];br=T['br']
keep=((exg>=0.06)|(Lm==0))&(area>=8)&(h>=3)
print('kept',keep.sum(),'of',len(h),'roofs',((exg<0.06)&(Lm>0)).sum(),'tiny',(area<8).sum())
con=(Lm<0.31)&(br>-0.005)&(Lm>0)
YD=1.09361
xy=S['xy'][keep];cr=S['cr'][keep]*YD;hh=h[keep]*YD;cb=S['cb'][keep]*YD;cn=con[keep]
print('conifer share',cn.mean().round(3),'h yd pct',np.percentile(hh,[10,50,90]).round(1),'cr yd',np.percentile(cr,[10,50,90]).round(1))
q=lambda a,T:base64.b64encode(np.ascontiguousarray(a).astype(T).tobytes()).decode()
L=dict(n=int(keep.sum()),xy=q(np.round(xy*2).clip(-32767,32767),np.int16),r=q(np.minimum(127,np.round(cr*10))+cn*128,np.uint8),
       h=q(np.minimum(255,np.round(hh*4)),np.uint8),cb=q(np.minimum(255,np.round(cb*4)),np.uint8))
json.dump(L,open('L_troy.json','w'));print('bytes',len(json.dumps(L)))
