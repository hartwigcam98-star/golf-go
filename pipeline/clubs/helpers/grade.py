"""Ground round each modelled clubhouse from the lidar: how far it falls below the entrance level, side by side. usage: python3 helpers/grade.py /home/claude/golf/clubs out.json"""
import sys,json,numpy as np,cv2,glob,os
D=sys.argv[1];sys.path.insert(0,D);import bk
out={}
for f in sorted(glob.glob(D+'/work/*/final.json')):
    cid=f.split('/')[-2];W=os.path.dirname(f)
    if not os.path.exists(W+'/frame.npz'):continue
    z=np.load(W+'/frame.npz');U,V,H,G=z['U'],z['V'],z['H'],z['G'];spec=json.load(open(f))
    closed=dict(spec);closed['blocks']=[b for b in spec.get('blocks',[]) if not(len(b)>8 and set(b[8])&set('od'))]
    closed['parts']=[dict(p,blocks=[b for b in p['blocks'] if not(len(b)>8 and set(b[8])&set('od'))]) for p in spec.get('parts',[])]
    E=bk.env_spec(closed,U,V);M=(E>-50).astype(np.uint8)
    px=U[0,1]-U[0,0];k=lambda yd:np.ones((int(2*yd/px)+1,)*2,np.uint8)
    ring=(cv2.dilate(M,k(4))>0)&~(cv2.dilate(M,k(1.5))>0)
    g=G[ring];g=g[np.isfinite(g)]
    if len(g)<50:continue
    # per side: split the ring into 16 sectors round the centre and take each sector's median
    ys,xs=np.nonzero(M);cu,cv=U[ys,xs].mean(),V[ys,xs].mean();ang=np.arctan2(V-cv,U-cu)
    sec=[float(np.median(G[ring&(ang>=a)&(ang<a+np.pi/8)])) for a in np.arange(-np.pi,np.pi,np.pi/8) if (ring&(ang>=a)&(ang<a+np.pi/8)).sum()>20]
    sec=np.array(sec)
    out[cid]=dict(top=round(float(np.percentile(g,95)),2),med=round(float(np.median(g)),2),low=round(float(np.percentile(g,5)),2),
                 below1=round(float((sec<-1).mean()),2),below25=round(float((sec<-2.5).mean()),2),secmin=round(float(sec.min()),2),secmax=round(float(sec.max()),2))
    print(f"{cid:12s} ring ground vs entrance level: 95%={out[cid]['top']:+.1f} median={out[cid]['med']:+.1f} 5%={out[cid]['low']:+.1f} | lowest side {out[cid]['secmin']:+.1f} highest side {out[cid]['secmax']:+.1f} | sides >1 yd below {out[cid]['below1']*100:.0f}%  >2.5 yd below {out[cid]['below25']*100:.0f}%")
json.dump(out,open(sys.argv[2],'w'),indent=1)
