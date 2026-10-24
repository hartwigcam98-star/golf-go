#!/usr/bin/env python3
"""Clubhouse block modelling toolkit (lidar -> roof blocks for the game's blockMass renderer).

  python3 bk.py prep <cid>            building frame + images + facet planes  -> work/<cid>/
  python3 bk.py fit <cid> [--free]    refine work/<cid>/blocks.json against the lidar -> work/<cid>/fit.json, fit.jpg
  python3 bk.py show <cid> <json>     render a blocks file against the lidar (no fitting) -> work/<cid>/show.jpg

Frame: u = building's long axis (yards), v = 90 deg clockwise from u (yards), heights in yards above the reference ground
(the 85th-percentile ground just outside the building = its upper entrance level). The images have a grid every 5 yd with
labels every 10 yd.

blocks.json: {"blocks":[[type,u0,u1,v0,v1,eave,pitch,ridge,(flags)],...]}
  type H  hip roof (slopes on all four sides, flat top if ridge < where they meet)
       GU gable, ridge along u (slopes face +v/-v, gable ends at u0/u1)
       GV gable, ridge along v
       SU shed sloping along u: height = eave + pitch*(u-u0), clamped between eave and ridge. eave is the height at u0;
          with a negative pitch u0 is the high side (eave > ridge), e.g. ['SU',0,4,0,9, 6.0,-0.5,4.0] falls from 6 at u0 to 4 at u1
       SV shed sloping along v (same, with v0)
       F  flat roof at height eave (pitch 0, ridge = eave)
       T  tower/cupola/chimney: box walls to eave with a hip cap to ridge (pitch ignored)
       BU0/BU1/BV0/BV1  bay or bow front: a half-ellipse inside the rectangle, its straight side at u0/u1/v0/v1, bulging across the
          rectangle, walls to eave and a conical roof rising to ridge at the middle of the straight side (pitch ignored); flag o = an
          open curved porch
  flags (optional string): 'o' open underneath (porch/veranda/deck/porte-cochere: posts, no walls),
                           'd' deck (flat floor with a railing, open below)
Heights: eave = height of the roof edge, ridge = top. Overlapping blocks are fine: the visible roof is the highest one
everywhere (valleys and hips come out of the union), exactly like the lidar's top surface.
"""
import sys,os,json,math,numpy as np,cv2
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from fit2 import prep,mask,frame
from fitter import YD
from facets import segment
from scipy.optimize import least_squares
A=os.path.dirname(os.path.abspath(__file__))
INV=json.load(open(A+'/inv.json'))
def invutm(E,N,zone):
    a=6378137.0;f=1/298.257223563;k0=0.9996;e2=f*(2-f);ep2=e2/(1-e2);e1=(1-math.sqrt(1-e2))/(1+math.sqrt(1-e2))
    x=E-500000;M=N/k0;mu=M/(a*(1-e2/4-3*e2**2/64-5*e2**3/256))
    p1=mu+(3*e1/2-27*e1**3/32)*math.sin(2*mu)+(21*e1**2/16-55*e1**4/32)*math.sin(4*mu)+(151*e1**3/96)*math.sin(6*mu)
    N1=a/math.sqrt(1-e2*math.sin(p1)**2);T1=math.tan(p1)**2;C1=ep2*math.cos(p1)**2;R1=a*(1-e2)/(1-e2*math.sin(p1)**2)**1.5;D=x/(N1*k0)
    lat=p1-(N1*math.tan(p1)/R1)*(D*D/2-(5+3*T1+10*C1-4*C1*C1-9*ep2)*D**4/24+(61+90*T1+298*C1+45*T1*T1-252*ep2-3*C1*C1)*D**6/720)
    lon=(D-(1+2*T1+C1)*D**3/6+(5-2*C1+28*T1-3*C1*C1+8*ep2+24*T1*T1)*D**5/120)/math.cos(p1)
    return math.degrees(lon)+(-183+6*zone),math.degrees(lat)
def env(B,U,V):
    out=np.full(U.shape,-99.0)
    for b in B:
        t,u0,u1,v0,v1,e,p,cap=b[:8]
        du=np.minimum(U-u0,u1-U);dv=np.minimum(V-v0,v1-V);inside=(du>=0)&(dv>=0)
        if t[0]=='B':   # bay / bow front: a half-ellipse bulging away from its straight side (BU0 = side at u0, BU1, BV0, BV1), conical roof
            uc,vc=(u0+u1)/2,(v0+v1)/2
            if t=='BU0': x,y,ra,dd=V-vc,U-u0,(v1-v0)/2,u1-u0
            elif t=='BU1': x,y,ra,dd=V-vc,u1-U,(v1-v0)/2,u1-u0
            elif t=='BV0': x,y,ra,dd=U-uc,V-v0,(u1-u0)/2,v1-v0
            else: x,y,ra,dd=U-uc,v1-V,(u1-u0)/2,v1-v0
            r=np.hypot(x/max(ra,.01),y/max(dd,.01));inside=inside&(y>=0)&(r<=1);h=e+(max(cap,e)-e)*(1-r)
            out=np.where(inside,np.maximum(out,h),out);continue
        if t=='H': h=e+p*np.minimum(du,dv)
        elif t=='GU': h=e+p*dv
        elif t=='GV': h=e+p*du
        elif t=='SU': h=e+p*(U-u0)
        elif t=='SV': h=e+p*(V-v0)
        elif t=='T': h=e+(cap-e)*np.clip(np.minimum(du,dv)/max(.01,min(u1-u0,v1-v0)/2),0,1)
        else: h=np.full(U.shape,e)
        h=np.minimum(h,max(cap,e)) if t not in('SU','SV') else np.clip(h,min(e,cap),max(e,cap))
        out=np.where(inside,np.maximum(out,h),out)
    return out
def pcoords(pt,U,V):
    # a part (wing at its own angle): origin (du,dv) in the main frame, axis turned da degrees CCW (same sense as the main angle)
    c,s_=math.cos(math.radians(pt['da'])),math.sin(math.radians(pt['da']));Du,Dv=U-pt['du'],V-pt['dv'];return Du*c-Dv*s_,Du*s_+Dv*c
def env_spec(spec,U,V):
    out=env(spec.get('blocks',[]),U,V)
    for pt in spec.get('parts',[]):
        Up,Vp=pcoords(pt,U,V);out=np.maximum(out,env(pt['blocks'],Up,Vp))
    return out
def load(cid):
    W=f'{A}/work/{cid}';z=np.load(W+'/frame.npz');return W,z['U'],z['V'],z['H'],z['G'],z['K']
def img(Hh):
    Hh=np.nan_to_num(Hh,nan=-6);dx=np.gradient(Hh,axis=1);dy=np.gradient(Hh,axis=0);hs=np.clip(0.55+(-dx-dy)*2.5,0,1)
    lo,hi=np.percentile(Hh,2)-1,np.percentile(Hh,99.5)+.5
    col=cv2.applyColorMap((np.clip((Hh-lo)/(hi-lo),0,1)*255).astype(np.uint8),cv2.COLORMAP_JET).astype(float)/255
    return (col*(0.3+0.7*hs[...,None])*255).astype(np.uint8)
def grid(im,U,V,sc):
    u0=U[0,0];v0=V[0,0];px=U[0,1]-U[0,0]
    for u in range(int(math.ceil(u0/5))*5,int(U[0,-1])+1,5):
        x=int((u-u0)/px*sc);cv2.line(im,(x,0),(x,im.shape[0]),(255,255,255) if u%10==0 else (110,110,110),1)
        if u%10==0: cv2.putText(im,str(u),(x+2,12),0,.38,(255,255,255),1)
    for v in range(int(math.ceil(v0/5))*5,int(V[-1,0])+1,5):
        y=int((v-v0)/px*sc);cv2.line(im,(0,y),(im.shape[1],y),(255,255,255) if v%10==0 else (110,110,110),1)
        if v%10==0: cv2.putText(im,str(v),(2,y-2),0,.38,(255,255,255),1)
    return im
def cmd_prep(cid):
    v=INV[cid];W=f'{A}/work/{cid}';os.makedirs(W,exist_ok=True)
    S=prep(f'{A}/data/{cid}_lidar.npz',v['geo'],v['main']['pts']);keep,_=mask(S);ang,cE,cN=frame(S,keep);rs=S['rs']
    ys,xs=np.nonzero(keep);ext=math.hypot(np.ptp(xs),np.ptp(ys))*rs/YD/2+8
    # refine the frame from the roof itself: sloped facets face the building's axes
    for _ in range(2):
        a=math.radians(ang);ca,sa=math.cos(a),math.sin(a);uu=np.arange(-ext,ext,0.5);U,V=np.meshgrid(uu,uu)
        Em=cE+(U*ca+V*sa)*YD;Nm=cN+(U*sa-V*ca)*YD;mx=((Em-S['X0'])/rs).astype(np.float32);my=((S['Y1']-Nm)/rs).astype(np.float32)
        Hq=cv2.remap(S['d2'].astype(np.float32),mx,my,cv2.INTER_LINEAR)/YD;Kq=cv2.remap(keep.astype(np.float32),mx,my,cv2.INTER_NEAREST)>.5
        Hs=cv2.GaussianBlur(Hq,(0,0),1.0);gv,gu=np.gradient(Hs);gu/=0.5;gv/=0.5;sl=np.hypot(gu,gv);m=Kq&(sl>.15)&(sl<1.5)
        if m.sum()<200: break
        th=(np.degrees(np.arctan2(gv[m],gu[m]))+45)%90-45;hist,ed=np.histogram(th,bins=90,range=(-45,45),weights=sl[m]);hs_=np.convolve(np.r_[hist[-3:],hist,hist[:3]],np.ones(7),'valid')
        d=float(ed[np.argmax(hs_)]+.5)
        if abs(d)<1: break
        ang=ang-d
    a=math.radians(ang);ca,sa=math.cos(a),math.sin(a)
    uu=np.arange(-ext,ext,0.25);U,V=np.meshgrid(uu,uu);Em=cE+(U*ca+V*sa)*YD;Nm=cN+(U*sa-V*ca)*YD
    mx=((Em-S['X0'])/rs).astype(np.float32);my=((S['Y1']-Nm)/rs).astype(np.float32)
    Hm=cv2.remap(S['d2'].astype(np.float32),mx,my,cv2.INTER_LINEAR);Gm=cv2.remap(S['g'],mx,my,cv2.INTER_LINEAR);Km=cv2.remap(keep.astype(np.float32),mx,my,cv2.INTER_NEAREST)>.5
    K8=Km.astype(np.uint8);ring=(cv2.dilate(K8,np.ones((25,25),np.uint8))>0)&~(cv2.dilate(K8,np.ones((9,9),np.uint8))>0)
    gref=float(np.percentile(Gm[ring],85));iref=int(np.argmin(np.where(ring,np.abs(Gm-gref),1e9)));ref=[float(U.flat[iref]),float(V.flat[iref])]
    H=(Hm-gref)/YD;G=(Gm-gref)/YD
    # game-yard centre and frame angle
    Gg=S['G'];gx=np.mean([p[0] for p in v['main']['pts']]);gy=np.mean([p[1] for p in v['main']['pts']])
    for _ in range(6):
        ex_,ny_=Gg.g2utm(gx,gy);gx+=(cE-ex_)/YD;gy-=(cN-ny_)/YD
    e1,n1=Gg.g2utm(gx+50,gy);e0,n0=Gg.g2utm(gx,gy);conv=math.degrees(math.atan2(n1-n0,e1-e0))
    np.savez_compressed(W+'/frame.npz',U=U,V=V,H=H,G=G,K=Km)
    meta=dict(cid=cid,o=[round(float(gx),2),round(float(gy),2)],a=round(ang-conv,3),ref=[round(r,2) for r in ref],gref=gref,utm=[cE,cN],ang_utm=ang,zone=Gg.zone)
    json.dump(meta,open(W+'/meta.json','w'))
    sc=3;im=grid(cv2.resize(img(H),None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST),U,V,sc);cv2.imwrite(W+'/dsm.jpg',im)
    # aspect + contours (facets)
    Hs=cv2.GaussianBlur(H.astype(np.float32),(0,0),1.2);gv,gu=np.gradient(Hs);gu*=4;gv*=4;sl=np.hypot(gu,gv);asp=(np.degrees(np.arctan2(gv,gu))+360)%360
    hsv=np.zeros(H.shape+(3,),np.uint8);hsv[...,0]=(asp/2).astype(np.uint8);hsv[...,1]=np.clip(sl/0.6*255,0,255).astype(np.uint8);hsv[...,2]=np.where(Km,220,90).astype(np.uint8)
    im2=cv2.cvtColor(hsv,cv2.COLOR_HSV2BGR);im2=cv2.resize(im2,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST)
    for lv in np.arange(math.floor(np.percentile(H[Km],2)) if Km.any() else 0,math.ceil(np.percentile(H[Km],99.8)) if Km.any() else 10,1.0):
        m=(cv2.resize(Hs,None,fx=sc,fy=sc)>lv).astype(np.uint8);cs,_=cv2.findContours(m,cv2.RETR_LIST,cv2.CHAIN_APPROX_NONE);cv2.drawContours(im2,cs,-1,(255,255,255) if lv%2==0 else (40,40,40),1)
    cv2.imwrite(W+'/aspect.jpg',grid(im2,U,V,sc))
    # aerial in the frame: prefer the Minnesota high-res photo (lon/lat bbox), else NAIP (UTM box)
    D=np.load(f'{A}/data/{cid}_lidar.npz');X0,Y0,X1,Y1=[float(x) for x in D['box']];zone=Gg.zone
    aer=None
    for lay in ['met25','fsa2025']:   # (the NAIP downloads are not registered to the lidar box, so they are left out)
        f=f'{A}/data/{cid}_{lay}.jpg'
        if not os.path.exists(f): continue
        im=cv2.imread(f)
        if im is None: continue
        if lay=='naip': ax=(Em-X0)/(X1-X0)*im.shape[1];ay=(Y1-Nm)/(Y1-Y0)*im.shape[0]
        else:
            Wl,Sl=invutm(X0,Y0,zone);El,Nl=invutm(X1,Y1,zone)
            # the WMS box was requested as the lon/lat corners of the UTM box
            LO=np.zeros_like(Em);LA=np.zeros_like(Em)
            for i in range(0,Em.shape[0]):
                pass
            # linear map is close enough over 200 m: use the corners
            fx=(Em-X0)/(X1-X0);fy=(Nm-Y0)/(Y1-Y0)
            lon=Wl+(El-Wl)*fx;lat=Sl+(Nl-Sl)*fy
            ax=(lon-Wl)/(El-Wl)*im.shape[1];ay=(Nl-lat)/(Nl-Sl)*im.shape[0]
        aer=cv2.remap(im,ax.astype(np.float32),ay.astype(np.float32),cv2.INTER_LINEAR);aname=lay;break
    if aer is not None: cv2.imwrite(W+'/aerial.jpg',grid(cv2.resize(aer,None,fx=sc,fy=sc,interpolation=cv2.INTER_LINEAR),U,V,sc))
    # facet planes
    lab,P=segment(U,V,H,Km);rows=[]
    for i,c in P.items():
        m=lab==i;ar=m.sum()*0.0625
        if ar<4: continue
        u=U[m];vv=V[m];h=H[m];rows.append((ar,float(np.percentile(u,2)),float(np.percentile(u,98)),float(np.percentile(vv,2)),float(np.percentile(vv,98)),c,float(np.percentile(h,3)),float(np.percentile(h,97))))
    rows.sort(key=lambda r:-r[0])
    with open(W+'/facets.txt','w') as f:
        f.write('area  u-range        v-range        plane h = a + bu*u + bv*v      (slope dir)    h-range\n')
        for ar,u0,u1,v0,v1,c,h0,h1 in rows[:60]:
            d='flat' if abs(c[1])<.08 and abs(c[2])<.08 else ('rises +u' if abs(c[1])>abs(c[2]) and c[1]>0 else 'rises -u' if abs(c[1])>abs(c[2]) else 'rises +v' if c[2]>0 else 'rises -v')
            f.write(f'{ar:5.0f} u[{u0:6.1f},{u1:6.1f}] v[{v0:6.1f},{v1:6.1f}] h={c[0]:6.2f}{c[1]:+.3f}u{c[2]:+.3f}v  {d:9s} h[{h0:.1f},{h1:.1f}]\n')
    ground=G[(~Km)&(cv2.dilate(K8,np.ones((13,13),np.uint8))>0)]
    print(json.dumps(dict(meta,aerial=aname if aer is not None else None,building_area=round(float(Km.sum()*0.0625)),hmax=round(float(np.percentile(H[Km],99.5)),2) if Km.any() else None,
        ground_around=[round(float(np.percentile(ground,5)),2),round(float(np.percentile(ground,95)),2)] if ground.size else None)))
    print(open(W+'/facets.txt').read())
def residual_img(cid,B,out):
    W,U,V,H,G,K=load(cid);P=np.maximum(env_spec(B,U,V) if isinstance(B,dict) else env(B,U,V),G);sc=3
    r=np.clip((P-H)/2,-1,1);rim=np.zeros(H.shape+(3,),np.uint8);dil=cv2.dilate(K.astype(np.uint8),np.ones((9,9),np.uint8))>0
    rim[...,2]=(np.clip(r,0,1)*255*dil);rim[...,0]=(np.clip(-r,0,1)*255*dil)
    ims=[grid(cv2.resize(x,None,fx=sc,fy=sc,interpolation=cv2.INTER_NEAREST),U,V,sc) for x in (img(H),img(P),rim)]
    cv2.imwrite(out,np.hstack(ims))
    roi=dil;e=np.abs(P-H)[roi];return float(np.median(e)),float(np.sqrt((e**2).mean())),float((e>1).mean())
def cmd_fit(cid,free=False):
    W,U,V,H,G,K=load(cid);spec=json.load(open(W+'/blocks.json'));B=[list(b) for b in spec.get('blocks',[])]+[list(b) for pt in spec.get('parts',[]) for b in pt['blocks']]
    nb=len(spec.get('blocks',[]));PI=[None]*nb+[k for k,pt in enumerate(spec.get('parts',[])) for b in pt['blocks']]
    roi=(cv2.dilate(K.astype(np.uint8),np.ones((9,9),np.uint8))>0);sub=roi&((np.arange(U.shape[0])%2==0)[:,None])&((np.arange(U.shape[1])%2==0)[None,:])
    Ur,Vr,Hr,Gr=U[sub],V[sub],H[sub],G[sub]
    idx=[];x0=[];lb=[];ub=[]
    for i,b in enumerate(B):
        t=b[0];span=2.0 if free else 1.0
        for j in range(1,5): idx.append((i,j));x0.append(b[j]);lb.append(b[j]-span);ub.append(b[j]+span)
        for j in (5,6,7):
            if t=='F' and j in (6,7): continue
            if t=='T' and j==6: continue
            idx.append((i,j));x0.append(b[j])
            if j==6: lb.append(-2.0 if t in('SU','SV') else 0.0);ub.append(2.0)
            else: lb.append(b[j]-2.5);ub.append(b[j]+2.5)
    x0=np.clip(np.array(x0,float),np.array(lb)+1e-6,np.array(ub)-1e-6)
    def un(x):
        BB=[list(b) for b in B]
        for (i,j),v in zip(idx,x): BB[i][j]=float(v)
        for b in BB:
            if b[0]=='F': b[6]=0;b[7]=b[5]
        return BB
    def tospec(BB):
        sp=dict(spec);sp['blocks']=BB[:nb];sp['parts']=[dict(pt,blocks=[BB[i] for i in range(nb,len(BB)) if PI[i]==k]) for k,pt in enumerate(spec.get('parts',[]))]
        if not sp['parts']: del sp['parts']
        return sp
    def res(x): return np.clip(np.maximum(env_spec(tospec(un(x)),Ur,Vr),Gr)-Hr,-2.5,2.5)
    sol=least_squares(res,x0,bounds=(lb,ub),loss='soft_l1',f_scale=.25,max_nfev=4000)
    BB=un(sol.x);BB=[[b[0]]+[round(v,2) for v in b[1:8]]+list(b[8:]) for b in BB]
    spec=tospec(BB);json.dump(spec,open(W+'/fit.json','w'),indent=0)
    st=residual_img(cid,spec,W+'/fit.jpg');print('median %.2f yd  rms %.2f  share off by >1yd %.1f%%'%(st[0],st[1],st[2]*100))
    for b in BB: print(b)
def ring(cid,spec=None,n=24):
    """survey ground samples round the building, [u,v,ground above the reference] about 4 yd outside its closed blocks: the game sets the
    model's height from the median offset to its own ground there (lidF), so one odd spot can't sink or lift it"""
    W,U,V,H,G,K=load(cid);spec=spec or json.load(open(W+'/final.json'))
    cl=lambda bl:[b for b in bl if not(len(b)>8 and set(b[8])&set('od'))]
    sp=dict(spec,blocks=cl(spec.get('blocks',[])),parts=[dict(p,blocks=cl(p['blocks'])) for p in spec.get('parts',[])])
    M=(env_spec(sp,U,V)>-50).astype(np.uint8);px=U[0,1]-U[0,0]
    d=cv2.dilate(M,np.ones((int(8/px)+1,)*2,np.uint8));cs,_=cv2.findContours(d,cv2.RETR_EXTERNAL,cv2.CHAIN_APPROX_NONE)
    if not cs: return []
    c=max(cs,key=len)[:,0,:];out=[]
    for x,y in c[::max(1,len(c)//n)]:
        g=G[y,x]
        if np.isfinite(g): out.append([round(float(U[y,x]),2),round(float(V[y,x]),2),round(float(g),2)])
    return out
def cmd_show(cid,f):
    W,*_=load(cid);spec=json.load(open(f));st=residual_img(cid,spec,W+'/show.jpg');print('median %.2f yd  rms %.2f  share off by >1yd %.1f%%'%(st[0],st[1],st[2]*100))
if __name__=='__main__':
    c=sys.argv[1]
    if c=='prep': cmd_prep(sys.argv[2])
    elif c=='fit': cmd_fit(sys.argv[2],'--free' in sys.argv)
    elif c=='show': cmd_show(sys.argv[2],sys.argv[3])
