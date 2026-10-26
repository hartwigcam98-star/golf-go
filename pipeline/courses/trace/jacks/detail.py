import sys,json,cv2,numpy as np
F=2;Y0=480;g=np.load('g2.npy');GF=json.load(open('greens_final.json'))
naip=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg');tiles=[]
for k in sys.argv[1].split(','):
    P=np.array(GF[k]);c=P.mean(0);x0,y0=int(c[0]-34),int(c[1]-24);W,H=68,48;Z=7
    G=cv2.GaussianBlur(g[(y0-Y0)*F:(y0-Y0+H)*F,x0*F:(x0+W)*F].astype(np.float64),(0,0),2.0)
    gy,gx=np.gradient(G,0.43,0.30);sl=np.hypot(gx,gy)*100
    lv=np.floor(G/0.2);edge=(np.abs(np.diff(lv,axis=0,prepend=lv[:1]))+np.abs(np.diff(lv,axis=1,prepend=lv[:,:1])))>0
    b=cv2.applyColorMap(np.clip(sl/10*255,0,255).astype(np.uint8),cv2.COLORMAP_JET);b[edge]=(255,255,255)
    a=cv2.resize(naip[y0:y0+H,x0:x0+W],(W*Z,H*Z),interpolation=cv2.INTER_CUBIC);b=cv2.resize(b,(W*Z,H*Z))
    for t in (a,b):
        cv2.polylines(t,[((P-[x0,y0])*Z).astype(np.int32)],True,(0,0,0),3)
        for gx_ in range(0,W+1,4):cv2.line(t,(gx_*Z,0),(gx_*Z,8),(0,0,0),2)
        for gy_ in range(0,H+1,4):cv2.line(t,(0,gy_*Z),(8,gy_*Z),(0,0,0),2)
    cv2.putText(a,f'{k}  x0={x0} y0={y0} (ticks 4px)',(8,26),0,.7,(255,255,255),2)
    tiles.append(np.hstack([a,b]))
cv2.imwrite(sys.argv[2],cv2.resize(np.vstack(tiles),None,fx=.55,fy=.55))
