"""Per-course config for the measured-trees job (tree_all.py, .github/workflows/trees.yml):
transform, lon/lat box, UTM EPSG, EPT candidates (newest first), bunkers, scenery.
usage: python3 mkcfg.py courses.json [key ...]     (courses.json from dump.js; no keys = every course in it)
Merges into cfg_trees.json next to this script. Needs the USGS EPT index:
  git clone -q --depth 1 --filter=blob:none --sparse https://github.com/hobuinc/usgs-lidar /home/claude/usgs-lidar
  git -C /home/claude/usgs-lidar sparse-checkout set boundaries"""
import json,math,re,glob,numpy as np,sys
import os
HERE=os.path.dirname(os.path.abspath(__file__));GG=os.path.abspath(os.path.join(HERE,'..','..','..'))
C=json.load(open(sys.argv[1]))
if len(sys.argv)>2:C={k:v for k,v in C.items() if k in sys.argv[2:]};XF=json.load(open(GG+'/pipeline/courses/naip/xf.json'))
orig={}
for f in glob.glob(GG+'/data/COURSE_*.js'):
    s=open(f).read();m=re.search(r'origin:\[([-\d.]+),\s*([-\d.]+)\]',s);suf=f.split('COURSE_')[1][:-3]
    if m:orig[suf]=(float(m.group(1)),float(m.group(2)))
src=''.join(open(f).read() for f in sorted(glob.glob(GG+'/src/*.js')))
ids={m.group(1):m.group(2) for m in re.finditer(r"(\w+):\{[^{}]{0,300}?course:COURSE_(\w+)",src)}
R=json.load(open('/home/claude/usgs-lidar/boundaries/resources.geojson'))['features']
def rings(geom):
    cs=geom['coordinates'];return [np.array(p[0]) for p in cs] if geom['type']=='MultiPolygon' else [np.array(cs[0])]
def pip(P,x,y):
    xs,ys=P[:,0],P[:,1];j=np.roll(np.arange(len(P)),1);c=((ys>y[:,None])!=(ys[j]>y[:,None]))&(x[:,None]<(xs[j]-xs)*(y[:,None]-ys)/(ys[j]-ys+1e-12)+xs);return c.sum(1)%2==1
RS=[(f['properties']['name'],rings(f['geometry']),np.concatenate(rings(f['geometry'])).min(0),np.concatenate(rings(f['geometry'])).max(0)) for f in R]
def year(n):
    n=re.sub(r'_LAS_\d{4}','',n)
    m=re.findall(r'(?<!\d)(20\d\d|19\d\d)(?!\d)',n);ys=[int(y) for y in m]
    b=re.findall(r'_B(\d\d)$',n)
    if b:ys.append(2000+int(b[0]))
    return max(ys) if ys else 0
out={}
for k,v in C.items():
    if k in XF:X=XF[k]
    else:
        suf=next(ids[i] for i in v['ids'] if i in ids);lat0,lon0=orig[suf];K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
        X=[[K,0],[0,-L],[-lon0*K,lat0*L]]
    A=np.array(X[:2]);t=np.array(X[2]);Ai=np.linalg.inv(A);e=v['ext']
    cs=np.array([[e[0],e[1]],[e[2],e[1]],[e[2],e[3]],[e[0],e[3]]]);ll=(cs-t)@Ai
    lo0,la0=ll.min(0);lo1,la1=ll.max(0);m=60/111000;bb=[lo0-m/math.cos(math.radians(la0)),la0-m,lo1+m/math.cos(math.radians(la0)),la1+m]
    zone=int((((lo0+lo1)/2)+180)//6)+1
    cand=[];gx,gy=np.meshgrid(np.linspace(bb[0],bb[2],9),np.linspace(bb[1],bb[3],9));gx=gx.ravel();gy=gy.ravel()
    for n,rg,mn,mx in RS:
        if mx[0]<bb[0] or mn[0]>bb[2] or mx[1]<bb[1] or mn[1]>bb[3]:continue
        ins=np.zeros(len(gx),bool)
        for P in rg:ins|=pip(P,gx,gy)
        cov=float(ins.mean())
        if cov>.3:cand.append((year(n),cov,n))
    cand.sort(key=lambda c:(-(c[1]>.9),-c[0],-c[1]))
    out[k]=dict(xf=X,bbox=[round(x,6) for x in bb],epsg=26900+zone,cand=[c[2] for c in cand][:4],cov=[round(c[1],2) for c in cand][:4],
                yrs=[c[0] for c in cand][:4],bunker=v['bunker'],scen=v['scen'],area_km2=round((bb[2]-bb[0])*(bb[3]-bb[1])*111*111*math.cos(math.radians(la0)),2))
    print(k.ljust(12),out[k]['epsg'],out[k]['area_km2'],list(zip(out[k]['cand'],out[k]['cov'])) or 'NO LIDAR COVERAGE (keeps the photo trees)')
F=os.path.join(HERE,'cfg_trees.json');old=json.load(open(F)) if os.path.exists(F) else {}
old.update({k:v for k,v in out.items() if v['cand']})
json.dump(old,open(F,'w'),separators=(',',':'));print(len(old),'courses in',F)
