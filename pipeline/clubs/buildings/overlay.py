import json,math,sys,cv2,numpy as np
k=sys.argv[1];out=sys.argv[2]
exec(open('/home/claude/golf/bld/convert.py').read().split("out = {}")[0].replace("keys = sys.argv[1].split(',') if len(sys.argv) > 1 else [k for k in E if os.path.exists(B + f'res/bld_{k}.json')]","keys=[]"))
toyd,toll=frame(k);P=cv2.imread(Q+f'photos/naip_{k}.jpg');M=json.load(open(Q+f'photos/naip_{k}.json'));W_,S_,E_,N_=M['ext'];Hh,Ww=P.shape[:2]
px=lambda x,y:(lambda lo,la:((lo-W_)/(E_-W_)*Ww,(N_-la)/(N_-S_)*Hh))(*toll(x,y))
X=json.load(open(B+'bldx.json'))[k]
for i,(ring,h) in enumerate(E[k]['bld']):
    if str(i) in X['b']:cv2.polylines(P,[np.round([px(*q) for q in ring]).astype(np.int32)],True,(255,255,255),2)
for i,ring in enumerate(E[k]['club']):cv2.polylines(P,[np.round([px(*q) for q in ring]).astype(np.int32)],True,(0,255,255),3)
for ring,rec,kind in X['a']:cv2.polylines(P,[np.round([px(*q) for q in ring]).astype(np.int32)],True,{'shack':(0,0,255),'barn':(255,0,255),'building':(0,128,255)}[kind],2)
for L in E[k]['lines']:cv2.polylines(P,[np.round([px(*q) for q in L]).astype(np.int32)],False,(255,0,0),2)
s=1600/max(P.shape[:2]);cv2.imwrite(out,cv2.resize(P,None,fx=s,fy=s))
