"""Clear game trees for the cut tee chutes (run after auto/trees.py):
 - explicit chutes in trace.json (mown strips): crowns kept 12 yd off the strip centre line
 - every tee that starts under real canopy (2022 lidar > 3 m): its line is cleared 8 yd either side out to the first open ground"""
import json,math,base64,numpy as np
G='/home/claude/golf/';T=json.load(open(G+'trace/trace.json'));N=json.load(open(G+'run_jacks/naip_jacks.json'));W,H=N['size'];e=N['ext']
lat0,lon0=json.load(open(G+'auto/jacks/jacks_course.json'))['origin'];K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
def cy(p):
    lon=e[0]+(p[0]+.5)*(e[2]-e[0])/W;lat=e[3]-(p[1]+.5)*(e[3]-e[1])/H;return ((lon-lon0)*K,-(lat-lat0)*L)
import os;os.chdir(G+'trace');exec(open('cross.py').read().split("if __name__")[0])
segs=[]
for k,hh in T['holes'].items():
    c=[cy(p) for p in hh.get('chute',[])];segs+=[(a,b,12) for a,b in zip(c,c[1:])]
    tot,runs,Ln=cross(hh['line'])
    if runs and runs[0][0]<=3:
        end=runs[0][1]
        for r in runs[1:]:
            if r[0]-end<12:end=r[1]
            else:break
        end=min(end+5,140)
        # cut the line at 'end' yards
        pts=[];acc=0;line=hh['line']
        for a,b in zip(line,line[1:]):
            sl=math.hypot((b[0]-a[0])*YX,(b[1]-a[1])*YY);pts.append(a)
            if acc+sl>=end:u=(end-acc)/sl;pts.append([a[0]+(b[0]-a[0])*u,a[1]+(b[1]-a[1])*u]);break
            acc+=sl
        c=[cy(p) for p in pts];segs+=[(a,b,8) for a,b in zip(c,c[1:])];print('hole',k,'tee under canopy: clearing first',end,'yd')
f=G+'auto/jacks/naip_jacks.json';D=json.load(open(f))
xy=np.frombuffer(base64.b64decode(D['xy']),np.int16).reshape(-1,2)/2.0;rb=np.frombuffer(base64.b64decode(D['r']),np.uint8)
r=(rb&127)/10.0
keep=np.ones(len(xy),bool)
for (ax,ay),(bx,by),wd in segs:
    dx,dy=bx-ax,by-ay;l=dx*dx+dy*dy or 1e-9;t=np.clip(((xy[:,0]-ax)*dx+(xy[:,1]-ay)*dy)/l,0,1)
    d=np.hypot(xy[:,0]-ax-dx*t,xy[:,1]-ay-dy*t);keep&=~(d<wd+r)
print('trees',len(xy),'removed',int((~keep).sum()))
D['n']=int(keep.sum());D['xy']=base64.b64encode(np.round(xy[keep]*2).astype(np.int16).tobytes()).decode();D['r']=base64.b64encode(rb[keep].tobytes()).decode()
json.dump(D,open(f,'w'))
