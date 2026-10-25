"""remove trees over the cut tee chutes: crowns kept at least 4 yd off a 16-yd strip (centre line + 12 yd + crown radius)"""
import json,math,base64,numpy as np
G='/home/claude/golf/';T=json.load(open(G+'trace/trace.json'));N=json.load(open(G+'run_jacks/naip_jacks.json'));W,H=N['size'];e=N['ext']
lat0,lon0=json.load(open(G+'auto/jacks/jacks_course.json'))['origin'];K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
def cy(p):
    lon=e[0]+(p[0]+.5)*(e[2]-e[0])/W;lat=e[3]-(p[1]+.5)*(e[3]-e[1])/H;return ((lon-lon0)*K,-(lat-lat0)*L)
segs=[]
for h in T['holes'].values():
    c=[cy(p) for p in h.get('chute',[])]
    segs+=list(zip(c,c[1:]))
f=G+'auto/jacks/naip_jacks.json';D=json.load(open(f))
xy=np.frombuffer(base64.b64decode(D['xy']),np.int16).reshape(-1,2)/2.0;rb=np.frombuffer(base64.b64decode(D['r']),np.uint8)
r=(rb&127)/10.0   # crown radius in course yards (stored x10)
keep=np.ones(len(xy),bool)
for (ax,ay),(bx,by) in segs:
    dx,dy=bx-ax,by-ay;l=dx*dx+dy*dy;t=np.clip(((xy[:,0]-ax)*dx+(xy[:,1]-ay)*dy)/l,0,1)
    d=np.hypot(xy[:,0]-ax-dx*t,xy[:,1]-ay-dy*t);keep&=~(d<12+r)
print('trees',len(xy),'removed',int((~keep).sum()))
xy2=xy[keep];rb2=rb[keep]
D['n']=int(keep.sum());D['xy']=base64.b64encode(np.round(xy2*2).astype(np.int16).tobytes()).decode();D['r']=base64.b64encode(rb2.tobytes()).decode()
json.dump(D,open(f,'w'))
