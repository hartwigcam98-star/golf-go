import json,math,sys
def clip_poly(pts,box):
  x0,y0,x1,y1=box
  def clip(P,inside,inter):
    out=[]
    for i in range(len(P)):
      a,b=P[i-1],P[i];ia,ib=inside(a),inside(b)
      if ib:
        if not ia:out.append(inter(a,b))
        out.append(b)
      elif ia:out.append(inter(a,b))
    return out
  def ix(a,b,x):t=(x-a[0])/(b[0]-a[0]);return [x,a[1]+t*(b[1]-a[1])]
  def iy(a,b,y):t=(y-a[1])/(b[1]-a[1]);return [a[0]+t*(b[0]-a[0]),y]
  P=pts
  for inside,inter in [(lambda p:p[0]>=x0,lambda a,b:ix(a,b,x0)),(lambda p:p[0]<=x1,lambda a,b:ix(a,b,x1)),(lambda p:p[1]>=y0,lambda a,b:iy(a,b,y0)),(lambda p:p[1]<=y1,lambda a,b:iy(a,b,y1))]:
    if not P:break
    P=clip(P,inside,inter)
  return P
def clip_line(pts,box):
  x0,y0,x1,y1=box;inb=lambda p:x0<=p[0]<=x1 and y0<=p[1]<=y1
  out=[];cur=[]
  for p in pts:
    if inb(p):cur.append(p)
    else:
      if len(cur)>1:out.append(cur)
      cur=[]
  if len(cur)>1:out.append(cur)
  return out
def simplify(pts,tol=1.0):
  if len(pts)<3:return pts
  # Douglas-Peucker
  def dp(a,b):
    if b<=a+1:return [a]
    ax,ay=pts[a];bx,by=pts[b];dx,dy=bx-ax,by-ay;L=math.hypot(dx,dy) or 1e-9
    m,mi=0,a
    for i in range(a+1,b):
      d=abs((pts[i][0]-ax)*dy-(pts[i][1]-ay)*dx)/L
      if d>m:m,mi=d,i
    if m>tol:return dp(a,mi)+dp(mi,b)
    return [a]
  idx=dp(0,len(pts)-1)+[len(pts)-1]
  return [pts[i] for i in idx]
def run(src,lat0,lon0,box,course_polys,out):
  d=json.load(open(src));F=d['features']
  K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
  xy=lambda p:[(p[0]-lon0)*K,-(p[1]-lat0)*L]
  R=lambda pts:[[round(p[0]),round(p[1])] for p in pts]
  S={'box':box,'roads':[],'polys':{},'houses':[],'bld':[],'trees':[],'rows':[],'power':[],'mway':[]}
  def addpoly(k,ring):
    P=clip_poly([xy(q) for q in ring[:-1]],box)
    if len(P)>=3:
      P=simplify(P,1.5)
      if len(P)>=3:S['polys'].setdefault(k,[]).append(R(P))
  def rings(g):
    if g['type']=='Polygon':return [g['coordinates'][0]]
    if g['type']=='MultiPolygon':return [pl[0] for pl in g['coordinates']]
    return []
  roadw={'motorway':12,'motorway_link':6,'trunk':10,'primary':9,'secondary':8,'tertiary':7,'residential':6,'unclassified':5,'service':3.5,'track':3,'footway':1.5,'path':1.5,'cycleway':2,'living_street':5}
  driveways=[];streets=[]
  for f in F:
    p=f['properties'];g=f['geometry'];t=g['type']
    if 'building' in p and p.get('golf')=='clubhouse':continue  # the course export already has the clubhouse
    if 'building' in p and t in('Polygon','MultiPolygon'):
      for r in rings(g):
        P=clip_poly([xy(q) for q in r[:-1]],box)
        if len(P)>=3:
          b=p['building'];hgt={'commercial':6,'roof':4,'barn':7,'roundhouse':6,'house':5,'garage':3}.get(b,5)
          if p.get('building:levels'):
            try:hgt=float(p['building:levels'])*3.2
            except:pass
          S['bld'].append([R(P),hgt])
      continue
    hw=p.get('highway')
    if hw and t=='LineString':
      pts=[xy(q) for q in g['coordinates']]
      if hw=='service' and p.get('service')=='driveway':driveways.append(pts);continue
      w=roadw.get(hw,4);
      if p.get('bridge') in('yes','viaduct'):
        for seg in clip_line(pts,box):S.setdefault('bridges',[]).append([hw,w]+R(seg))

      if hw=='service' and p.get('service')=='parking_aisle':w=4
      for seg in clip_line(pts,box):
        seg=simplify(seg,.8);S['roads'].append([hw,w]+R(seg))
        if hw in('motorway',):S['mway'].append(R(seg))
        if hw in('residential','tertiary','secondary','primary','unclassified','living_street','service','trunk'):streets.append(seg)
      continue
    if hw=='rest_area':
      for r in rings(g):addpoly('grass',r)
      continue
    if p.get('amenity')=='parking':
      for r in rings(g):addpoly('park',r)
      continue
    nat=p.get('natural');lu=p.get('landuse');le=p.get('leisure')
    k=None
    if nat in('wood','scrub') or lu=='forest':k='wood'
    elif nat=='water' or lu in('basin','reservoir') or p.get('water'):k='water'
    elif nat=='wetland':k='wetland'
    elif nat in('grassland','heath') or lu=='meadow' or le=='nature_reserve':k='meadow'
    elif lu=='farmland':k='farm'
    elif lu=='residential':k='res'
    elif lu in('grass','recreation_ground','village_green') or le in('park','pitch','playground'):k='grass'
    elif lu in('commercial','retail','industrial'):k='comm'
    if k and t in('Polygon','MultiPolygon'):
      for r in rings(g):addpoly(k,r)
      continue
    if nat=='tree' and t=='Point':
      q=xy(g['coordinates'])
      if box[0]<q[0]<box[2] and box[1]<q[1]<box[3]:S['trees'].append([round(q[0]),round(q[1])])
      continue
    if nat=='tree_row' and t=='LineString':
      for seg in clip_line([xy(q) for q in g['coordinates']],box):S['rows'].append(R(seg))
      continue
    if p.get('power')=='line' and t=='LineString':
      for seg in clip_line([xy(q) for q in g['coordinates']],box):S['power'].append(R(seg))
      continue
    if p.get('waterway') and t=='LineString':
      for seg in clip_line([xy(q) for q in g['coordinates']],box):S['roads'].append(['stream',3]+R(seg))
  # houses at the far end of each driveway (the end that isn't on a street)
  def dist_pl(pt,pl):
    m=1e9
    for i in range(len(pl)-1):
      ax,ay=pl[i];bx,by=pl[i+1];dx,dy=bx-ax,by-ay;l=dx*dx+dy*dy
      t=max(0,min(1,((pt[0]-ax)*dx+(pt[1]-ay)*dy)/l)) if l else 0
      m=min(m,math.hypot(pt[0]-ax-dx*t,pt[1]-ay-dy*t))
    return m
  cps=[]
  for k in('fairway','green','tee','bunker'):
    for P in course_polys.get(k,[]):cps.append(P)
  def near_course(pt,r=18):
    for P in cps:
      xs=[q[0] for q in P];ys=[q[1] for q in P]
      if pt[0]<min(xs)-r or pt[0]>max(xs)+r or pt[1]<min(ys)-r or pt[1]>max(ys)+r:continue
      if dist_pl(pt,P+[P[0]])<r:return True
    return False
  import random;random.seed(7)
  for dw in driveways:
    a,b=dw[0],dw[-1]
    da=min((dist_pl(a,s) for s in streets),default=1e9);db=min((dist_pl(b,s) for s in streets),default=1e9)
    end,prev=(b,dw[-2]) if da<db else (a,dw[1])
    dx,dy=end[0]-prev[0],end[1]-prev[1];l=math.hypot(dx,dy) or 1;ux,uy=dx/l,dy/l
    hx,hy=end[0]+ux*9,end[1]+uy*9
    if not(box[0]<hx<box[2] and box[1]<hy<box[3]):continue
    if near_course([hx,hy]):continue
    rot=math.atan2(uy,ux)
    for dwp in dw:S['roads'].append(['driveway',3.2]+R(dw));break
    S['houses'].append([round(hx,1),round(hy,1),round(rot,2),round(random.uniform(15,21),1),round(random.uniform(11,15),1),random.randrange(8)])
  json.dump(S,open(out,'w'),separators=(',',':'))
  print(out,{k:(len(v) if isinstance(v,list) else {kk:len(vv) for kk,vv in v.items()}) for k,v in S.items()},'bytes',len(json.dumps(S,separators=(',',':'))))
tc=json.load(open('/home/claude/golf/course.json'))
run('troy-surroundings.geojson',44.900,-92.732,[-2150,-1550,950,1800],tc['polys'],'troy_surr.json')
sc=json.load(open('/home/claude/golf/stoneridge/course.json'))
run('stoneridge-surroundings.geojson',44.953,-92.83,[-1750,-1450,1700,1350],sc['polys'],'sr_surr.json')

