"""Extend green outlines into tree shadow where the lidar pad continues. python3 shadowext.py [write]"""
import sys,json,cv2,numpy as np,math
F=2;Y0=480;g=np.load('g2.npy');GF=json.load(open('greens_final.json'));S=json.load(open('scale.json'));YX,YY=S['YX'],S['YY']
naip=cv2.imread('/home/claude/golf/run_jacks/naip_jacks.jpg');Lum=cv2.GaussianBlur(cv2.cvtColor(naip,cv2.COLOR_BGR2LAB)[...,0].astype(np.float32),(0,0),1.5)
K=4   # work grid: 4 px per NAIP px
tiles=[];new={};rep={}
for k in [str(i) for i in range(1,19)]:
    P=np.array(GF[k]);c=P.mean(0);x0,y0=int(c[0]-34),int(c[1]-24);W,H=68,48
    G=cv2.GaussianBlur(g[(y0-Y0)*F:(y0-Y0+H)*F,x0*F:(x0+W)*F].astype(np.float64),(0,0),2.0)
    gy,gx=np.gradient(G,0.43,0.30);sl=cv2.resize(np.hypot(gx,gy)*100,(W*K,H*K))
    lum=cv2.resize(Lum[y0:y0+H,x0:x0+W],(W*K,H*K))
    s2=np.load('s2.npy') if 'S2' not in globals() else S2
    globals()['S2']=s2
    can=s2[(y0-Y0)*F:(y0-Y0+H)*F,x0*F:(x0+W)*F]-g[(y0-Y0)*F:(y0-Y0+H)*F,x0*F:(x0+W)*F];can=np.where(np.isfinite(can),can,0).astype(np.float32)
    can=cv2.resize(cv2.dilate(can,np.ones((3,3),np.uint8)),(W*K,H*K))
    cur=np.zeros((H*K,W*K),np.uint8);cv2.fillPoly(cur,[np.round((P-[x0,y0])*K).astype(np.int32)],1)
    pxyd=min(YX,YY)/K
    dcur=cv2.distanceTransform(1-cur,cv2.DIST_L2,5)*pxyd
    pad=((sl<6)&(dcur<8)).astype(np.uint8)|cur
    pad=cv2.morphologyEx(pad,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(9,9)))
    n,lab=cv2.connectedComponents(pad);pad=(lab==lab[int((c[1]-y0)*K),int((c[0]-x0)*K)]).astype(np.uint8)
    # collar: green stops 2 yd inside the pad edge (bank)
    dpad=cv2.distanceTransform(pad,cv2.DIST_L2,5)*pxyd
    inner=(dpad>2.0).astype(np.uint8)
    shadow=(cv2.blur((lum<105).astype(np.float32),(9,9))>0.5)
    ext=inner&(1-cur)&shadow.astype(np.uint8)&(can<2.0).astype(np.uint8)
    ext=cv2.morphologyEx(ext,cv2.MORPH_OPEN,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(7,7)))
    area=ext.sum()*(YX/K)*(YY/K)
    a0=cur.sum()*(YX/K)*(YY/K);rep[k]=(round(a0),round(area))
    a=cv2.resize(naip[y0:y0+H,x0:x0+W],(W*K,H*K),interpolation=cv2.INTER_CUBIC)
    vis=a.copy();vis[ext>0]=(vis[ext>0]*0.4+np.array([0,255,255])*0.6).astype(np.uint8)
    cv2.polylines(vis,[np.round((P-[x0,y0])*K).astype(np.int32)],True,(255,255,255),1)
    cs,_=cv2.findContours(pad,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);cv2.drawContours(vis,cs,-1,(255,0,255),1)
    if area>=15:
        reg=cur|ext;reg=cv2.morphologyEx(reg,cv2.MORPH_CLOSE,cv2.getStructuringElement(cv2.MORPH_ELLIPSE,(13,13)))
        cs,_=cv2.findContours(reg,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE);cn=max(cs,key=cv2.contourArea)[:,0,:]/K
        X=cn[:,0]*YX;Y=cn[:,1]*YY;mx,my=X.mean(),Y.mean();ang=np.arctan2(Y-my,X-mx);rad=np.hypot(X-mx,Y-my)
        nb=72;bins=((ang+math.pi)/(2*math.pi)*nb).astype(int)%nb;r=np.array([rad[bins==b].max() if (bins==b).any() else np.nan for b in range(nb)])
        idx=np.arange(nb);ok=np.isfinite(r);r=np.interp(idx,idx[ok],r[ok],period=nb);Fc=np.fft.rfft(r);Fc[6:]=0;r=np.fft.irfft(Fc,nb)
        th=-math.pi+(idx+.5)*2*math.pi/nb
        Q=[[round((mx+r[i]*math.cos(th[i]))/YX+x0,1),round((my+r[i]*math.sin(th[i]))/YY+y0,1)] for i in range(0,nb,2)]
        new[k]=Q;cv2.polylines(vis,[np.round((np.array(Q)-[x0,y0])*K).astype(np.int32)],True,(0,255,0),2)
    cv2.putText(vis,f'{k} +{round(area)}',(5,18),0,.6,(255,255,255),2)
    tiles.append(np.hstack([a,vis]))
for k,v in rep.items():print(k,'area',v[0],'shadow extension',v[1],'<-' if k in new else '')
cv2.imwrite('/tmp/sx.jpg',cv2.resize(np.vstack([np.hstack(tiles[i:i+2]) for i in range(0,18,2)]),None,fx=.45,fy=.45))
json.dump(new,open('/tmp/sx_new.json','w'))
