import json,cv2,numpy as np
F=2;Y0=480;g=np.load('g2.npy');s2=np.load('s2.npy');GF=json.load(open('greens_final.json'));S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY']
naip=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg');Z=6;tiles=[];rep={}
for k in [str(i) for i in range(1,19)]:
    P=np.array(GF[k]);c=P.mean(0);x0,y0=int(c[0]-34),int(c[1]-24);W,H=68,48
    G=cv2.GaussianBlur(g[(y0-Y0)*F:(y0-Y0+H)*F,x0*F:(x0+W)*F].astype(np.float64),(0,0),2.0)
    gy,gx=np.gradient(G,0.43,0.30);sl=np.hypot(gx,gy)*100
    m=np.zeros(G.shape,np.uint8);cv2.fillPoly(m,[np.round((P-[x0,y0])*F).astype(np.int32)],1)
    d=cv2.distanceTransform(1-m,cv2.DIST_L2,5)*min(YX,YY)/F
    ring=(d>1)&(d<=3.5);flat=(sl<4)
    # per direction (8 sectors) share of ring that is flat
    yy,xx=np.mgrid[0:G.shape[0],0:G.shape[1]];ang=np.degrees(np.arctan2((yy/F+y0-c[1])*YY,(xx/F+x0-c[0])*YX))%360
    sec={}
    for i,nm in enumerate(['E','SE','S','SW','W','NW','N','NE']):
        a0=(i*45-22.5)%360;sel=ring&(((ang-a0)%360)<45)
        sec[nm]=round(float(flat[sel].mean())*100) if sel.any() else 0
    rep[k]=sec
    a=cv2.resize(naip[y0:y0+H,x0:x0+W],(W*Z,H*Z),interpolation=cv2.INTER_CUBIC)
    b=cv2.resize(cv2.applyColorMap(np.clip(sl/10*255,0,255).astype(np.uint8),cv2.COLORMAP_JET),(W*Z,H*Z))
    for t in (a,b):cv2.polylines(t,[((P-[x0,y0])*Z).astype(np.int32)],True,(255,255,255),2)
    cv2.putText(a,f'{k}',(6,24),0,.8,(255,255,255),2)
    tiles.append(cv2.resize(np.hstack([a,b]),None,fx=.5,fy=.5))
for i in range(0,18,6):cv2.imwrite(f'/tmp/pads_{i//6}.jpg',np.vstack([np.hstack(tiles[j:j+2]) for j in range(i,i+6,2)]))
for k,v in rep.items():print(k,v,'  <-- check' if max(v.values())>=55 else '')
