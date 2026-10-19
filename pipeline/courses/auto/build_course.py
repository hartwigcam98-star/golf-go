"""Course map: OSM (Overpass JSON from the fetch job) -> geojson -> buildlib (course/tb/surr json).
Run inside golf/auto/<key>/.  usage: python3 ../build_course.py key runDir [holeIdsJson]
Optional <key>_edits.json: retag [[x,y,from,to]], drop [[x,y,kind]], lines {ref:[[x,y],..]}, add [[kind,[[x,y],..]]], tees {ref:[x,y]} (course yards)."""
import json,math,sys,os
sys.path.insert(0,'/home/claude/golf/sandvalley');sys.path.insert(0,'/home/claude/golf/alabama')
from osm2gj import convert
key=sys.argv[1];R=sys.argv[2].rstrip('/')+'/';HID=json.load(open(sys.argv[3])) if len(sys.argv)>3 else None
S=json.load(open(R+'summary.json'))['courses'][key];osm=json.load(open(R+f'osm_{key}.json'))
gj=convert(osm);F=gj['features']
outline=[f for f in F if f['properties'].get('@id')==S['osm'][0]] if S['osm'] else []
def rings(g):
    if g['type']=='Polygon':return [g['coordinates'][0]]
    if g['type']=='MultiPolygon':return [p[0] for p in g['coordinates']]
    return []
OR=[r for f in outline for r in rings(f['geometry'])]
def pip(pt,r):
    x,y=pt;c=False
    for i in range(len(r)):
        x1,y1=r[i];x2,y2=r[i-1]
        if (y1>y)!=(y2>y) and x<(x2-x1)*(y-y1)/(y2-y1)+x1:c=not c
    return c
def mid(f):
    g=f['geometry'];c=g['coordinates']
    pts=c if g['type']=='LineString' else (c[0] if g['type']=='Polygon' else c[0][0] if g['type']=='MultiPolygon' else [c])
    return (sum(p[0] for p in pts)/len(pts),sum(p[1] for p in pts)/len(pts))
bb=S['bbox']
inb=lambda p:bb[0]<p[0]<bb[2] and bb[1]<p[1]<bb[3]
holes=[f for f in F if f['properties'].get('golf')=='hole' and f['geometry']['type']=='LineString' and f['properties'].get('ref')]
if HID is not None:holes=[f for f in holes if f['properties'].get('@id') in HID]
else:holes=[f for f in holes if (any(pip(q,r) for r in OR for q in f['geometry']['coordinates']) if OR else inb(mid(f)))]
refs=[int(h['properties'].get('ref',0)) for h in holes]
print('holes',len(holes),sorted(refs))
if len(set(refs))!=len(refs) or len(refs)!=18:print('BAD refs');[print(h['properties'].get('@id'),h['properties'].get('ref'),h['properties'].get('par'),mid(h)) for h in holes];sys.exit(1)
card=json.load(open('scorecard.json'))['card']
for h in holes:
    r=int(h['properties']['ref']);p=h['properties'].get('par')
    if p and int(p)!=card[r-1][0]:print('  par mismatch hole',r,'osm',p,'card',card[r-1][0])
lat0=(bb[1]+bb[3])/2;lon0=(bb[0]+bb[2])/2
K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
xy=lambda p:((p[0]-lon0)*K,-(p[1]-lat0)*L)
HL=[[xy(p) for p in h['geometry']['coordinates']] for h in holes]
def dline(p):
    best=1e9
    for Ls in HL:
        for a,b in zip(Ls,Ls[1:]):
            dx,dy=b[0]-a[0],b[1]-a[1];l=dx*dx+dy*dy;t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)) if l else 0
            best=min(best,math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t))
    return best
LIM={'green':90,'tee':120,'fairway':200,'bunker':200,'water_hazard':350,'lateral_water_hazard':350,'cartpath':200,'path':200,'clubhouse':400,'driving_range':400,'rough':200}
keep=[]
for f in F:
    g=f['properties'].get('golf')
    if f['properties'].get('leisure')=='golf_course':
        if outline and f is not outline[0]:continue
    if g and g!='hole':
        if g not in LIM or dline(xy(mid(f)))>LIM[g]:continue
    if g=='hole' and f not in holes:continue
    keep.append(f)
if outline:keep.remove(outline[0]);keep.insert(0,outline[0])
else:keep.insert(0,{'type':'Feature','properties':{'leisure':'golf_course','name':key,'@id':'box'},'geometry':{'type':'Polygon','coordinates':[[[bb[0],bb[1]],[bb[2],bb[1]],[bb[2],bb[3]],[bb[0],bb[3]],[bb[0],bb[1]]]]}})
for h in holes:h['properties']['ref']=str(int(h['properties']['ref']))
# hand edits in course yards: retag a polygon (nearest centroid), replace hole lines, add polygons
EF=f'{key}_edits.json'
if os.path.exists(EF):
    ED=json.load(open(EF));ll=lambda p:[p[0]/K+lon0,lat0-p[1]/L]
    for x,y,a,b in ED.get('retag',[]):
        cand=[f for f in keep if f['properties'].get('golf')==a and f['geometry']['type'] in('Polygon','MultiPolygon')]
        f=min(cand,key=lambda f:math.hypot(*(lambda m:(xy(m)[0]-x,xy(m)[1]-y))(mid(f))));f['properties']['golf']=b;print('  retag',a,'->',b,[round(v) for v in xy(mid(f))])
    for x,y,a in ED.get('drop',[]):
        cand=[f for f in keep if f['properties'].get('golf')==a];f=min(cand,key=lambda f:math.hypot(*(lambda m:(xy(m)[0]-x,xy(m)[1]-y))(mid(f))));keep.remove(f);print('  drop',a,[round(v) for v in xy(mid(f))])
    for ref,line in ED.get('lines',{}).items():
        h=next(h for h in holes if h['properties']['ref']==ref);h['geometry']={'type':'LineString','coordinates':[ll(p) for p in line]};print('  line',ref)
    for kind,P in ED.get('add',[]):
        keep.append({'type':'Feature','properties':{'golf':kind},'geometry':{'type':'Polygon','coordinates':[[ll(p) for p in P]+[ll(P[0])]]}});print('  add',kind)
json.dump({'type':'FeatureCollection','features':keep},open(f'{key}_b.geojson','w'))
from buildlib import build
build(f'{key}_b.geojson',lat0,lon0,card,key)
if os.path.exists(EF) and ED.get('tees'):   # fixed tee spots (buildlib snaps to tee centroids)
    import re
    C=json.load(open(f'{key}_course.json'));TB=json.load(open(f'{key}_tb.json'))
    for ref,p in ED['tees'].items():
        h=C['holes'][int(ref)-1];h['line'][0]=p;ln=round(sum(math.hypot(b[0]-a[0],b[1]-a[1]) for a,b in zip(h['line'],h['line'][1:])))
        TB[int(ref)-1]['tip']=re.sub(r'^A \d+-yard','A %d-yard'%ln,TB[int(ref)-1]['tip']);print('  tee',ref,'->',p,'len',ln)
    json.dump(C,open(f'{key}_course.json','w'),separators=(',',':'));json.dump(TB,open(f'{key}_tb.json','w'))
print('origin',lat0,lon0)
