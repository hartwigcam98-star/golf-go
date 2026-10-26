import json,cv2,numpy as np,sys
GF=json.load(open('greens_final.json'));T=json.load(open('trace.json'));naip=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg')
ks=sys.argv[1].split(',');out=sys.argv[2];tiles=[]
for k in ks:
    g=np.array(GF[k]);c=g.mean(0);x0,y0=int(c[0]-32),int(c[1]-22);S=6
    a=cv2.resize(naip[y0:y0+44,x0:x0+64],(64*S,44*S),interpolation=cv2.INTER_CUBIC)
    b=a.copy();cv2.polylines(b,[((g-[x0,y0])*S).astype(np.int32)],True,(0,255,255),1)
    for gx in range(0,65,4):cv2.line(b,(gx*S,0),(gx*S,4),(0,200,200),1)
    cv2.putText(b,f'{k} x0={x0} y0={y0}',(4,16),0,.5,(255,255,255),1)
    tiles.append(np.hstack([a,b]))
cv2.imwrite(out,np.vstack(tiles))
