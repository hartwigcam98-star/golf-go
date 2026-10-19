import json,math,random,re,sys
sys.path.insert(0,'/home/claude/golf/surr')
exec(open('/home/claude/golf/surr/conv.py').read().split("tc=json.load")[0])  # clip_poly, clip_line, simplify, run
def build(src,lat0,lon0,card,out):
  d=json.load(open(src));F=d['features']
  K=math.cos(math.radians(lat0))*111320*1.0936;L=110574*1.0936
  xy=lambda p:[round((p[0]-lon0)*K,1),round(-(p[1]-lat0)*L,1)]
  def area(r):return sum(r[i][0]*r[(i+1)%len(r)][1]-r[(i+1)%len(r)][0]*r[i][1] for i in range(len(r)))/2
  def keyhole(pl):
    O=pl[0][:-1] if pl[0][0]==pl[0][-1] else pl[0][:]
    for I in pl[1:]:
      I=I[:-1] if I[0]==I[-1] else I[:]
      if len(I)<3:continue
      if (area(O)>0)==(area(I)>0):I=I[::-1]
      best=None
      for a,q in enumerate(I[::max(1,len(I)//60)]):
        for b,o in enumerate(O):
          d=(q[0]-o[0])**2+(q[1]-o[1])**2
          if best is None or d<best[0]:best=(d,a*max(1,len(I)//60),b)
      _,ia,ob=best
      O=O[:ob+1]+I[ia:]+I[:ia+1]+[O[ob]]+O[ob+1:]
    return O+[O[0]]
  def rings(f):
    g=f['geometry']
    if g['type']=='Polygon':return [keyhole(g['coordinates'])]
    if g['type']=='MultiPolygon':return [keyhole(pl) for pl in g['coordinates']]
    return []
  gc=[f for f in F if f['properties'].get('leisure')=='golf_course'][0]
  polys={k:[] for k in ['fairway','green','tee','bunker','water','range','clubhouse','wood']};paths=[]
  for f in F:
    p=f['properties'];g=p.get('golf');t=f['geometry']['type'];k=None
    if g in('fairway','green','tee','bunker'):k=g
    elif g in('water_hazard','lateral_water_hazard'):k='water'
    elif g=='driving_range':k='range'
    elif g=='clubhouse':k='clubhouse'
    if k and t in('Polygon','MultiPolygon'):
      for r in rings(f):polys[k].append([xy(q) for q in r[:-1]])
    if g in('cartpath','path') and t=='LineString':paths.append([xy(q) for q in f['geometry']['coordinates']])
  # the course's own box, for pulling in nearby natural water and buildings
  allp=[q for k in('fairway','green','tee','bunker') for P in polys[k] for q in P]
  bx=[min(q[0] for q in allp)-150,min(q[1] for q in allp)-150,max(q[0] for q in allp)+150,max(q[1] for q in allp)+150]
  inb=lambda P:any(bx[0]<q[0]<bx[2] and bx[1]<q[1]<bx[3] for q in P)
  for f in F:
    p=f['properties'];t=f['geometry']['type']
    if t not in('Polygon','MultiPolygon'):continue
    if p.get('golf'):continue
    if p.get('natural')=='water' or p.get('landuse') in('basin','reservoir'):
      for r in rings(f):
        P=[xy(q) for q in r[:-1]]
        if inb(P) and len(P)<4000:polys['water'].append(P)
    if 'building' in p and p.get('golf')=='clubhouse':
      for r in rings(f):polys['clubhouse'].append([xy(q) for q in r[:-1]])
  def inpoly(pts,x,y):
    c=False
    for i in range(len(pts)):
      x1,y1=pts[i];x2,y2=pts[i-1]
      if (y1>y)!=(y2>y) and x<(x2-x1)*(y-y1)/(y2-y1)+x1:c=not c
    return c
  def cen(pts):
    a=cx=cy=0
    for i in range(len(pts)):
      x1,y1=pts[i-1];x2,y2=pts[i];cr=x1*y2-x2*y1;a+=cr;cx+=(x1+x2)*cr;cy+=(y1+y2)*cr
    a/=2;return [cx/(6*a),cy/(6*a)] if a else pts[0]
  ln=lambda Ls:sum(math.hypot(Ls[k+1][0]-Ls[k][0],Ls[k+1][1]-Ls[k][1]) for k in range(len(Ls)-1))
  def inner(P):
    c=cen(P)
    if inpoly(P,*c):return c
    xs=[q[0] for q in P];ys=[q[1] for q in P];best=None
    for i in range(21):
      for j in range(21):
        x=min(xs)+(max(xs)-min(xs))*i/20;y=min(ys)+(max(ys)-min(ys))*j/20
        if inpoly(P,x,y):
          d=math.hypot(x-c[0],y-c[1])
          if best is None or d<best[0]:best=(d,[x,y])
    return best[1] if best else c
  tees=[inner(t) for t in polys['tee']]
  holes=[]
  hs=sorted([f for f in F if f['properties'].get('golf')=='hole'],key=lambda f:int(f['properties']['ref']))
  for f in hs:
    pr=f['properties'];ref=int(pr['ref']);par=card[ref-1][0];hcp=card[ref-1][1];yd=card[ref-1][2]
    line=[xy(q) for q in f['geometry']['coordinates']]
    # hole ways are tee->green; flip if the start is nearer a green
    def nearest(pt,arr):return min(math.hypot(pt[0]-a[0],pt[1]-a[1]) for a in arr)
    gcs=[cen(G) for G in polys['green']]
    if nearest(line[0],gcs)<nearest(line[-1],gcs):line=line[::-1]
    end=line[-1]
    G=min(polys['green'],key=lambda G:-1 if inpoly(G,*end) else math.hypot(cen(G)[0]-end[0],cen(G)[1]-end[1]))
    c=cen(G);pin=[round((end[0]+c[0])/2,1),round((end[1]+c[1])/2,1)] if inpoly(G,*end) else [round(c[0],1),round(c[1],1)]
    if not inpoly(G,*pin):pin=[round(c[0],1),round(c[1],1)]
    line[-1]=pin
    s=line[0];n=line[1];dx,dy=n[0]-s[0],n[1]-s[1];l=math.hypot(dx,dy);ux,uy=dx/l,dy/l;best=None
    for t in tees:
      vx,vy=t[0]-s[0],t[1]-s[1];along=vx*ux+vy*uy;lat=abs(-vx*uy+vy*ux)
      if -110<along<l-40 and lat<15+abs(along)*.15:
        cand=[[round(t[0],1),round(t[1],1)]]+line[1:];L_=ln(cand)
        sc=abs(L_-yd)+(0 if L_<=yd+12 else 40)
        if best is None or sc<best[0]:best=(sc,cand[0])
    if best:line[0]=best[1]
    if not any(inpoly(T,*line[0]) for T in polys['tee']):
      tc=min(tees,key=lambda t:math.hypot(t[0]-line[0][0],t[1]-line[0][1]))
      if math.hypot(tc[0]-line[0][0],tc[1]-line[0][1])<45:print('  snapped tee',ref,round(math.hypot(tc[0]-line[0][0],tc[1]-line[0][1])));line[0]=[round(tc[0],1),round(tc[1],1)]
    holes.append({'par':par,'hcp':hcp,'line':line,'pin':pin,'pinGap':0})
    print(ref,par,'len',round(ln(line)),'card',yd,'pin ok',inpoly(G,*pin))
  course={'holes':holes,'polys':polys,'paths':paths,'origin':[lat0,lon0]}
  json.dump(course,open(out+'_course.json','w'),separators=(',',':'))
  # hole notes from the mapped features
  num={1:'One',2:'Two',3:'Three',4:'Four',5:'Five',6:'Six',7:'Seven',8:'Eight',9:'Nine',10:'Ten',11:'Eleven',12:'Twelve',13:'Thirteen',14:'Fourteen',15:'Fifteen',16:'Sixteen'}
  words=lambda n:num.get(n,str(n))
  def dseg(p,a,b):
    dx,dy=b[0]-a[0],b[1]-a[1];l=dx*dx+dy*dy;t=max(0,min(1,((p[0]-a[0])*dx+(p[1]-a[1])*dy)/l)) if l else 0
    return math.hypot(p[0]-a[0]-dx*t,p[1]-a[1]-dy*t),(dx*(p[1]-a[1])-dy*(p[0]-a[0]))
  def near(Ls,p):
    best=(1e9,0)
    for i in range(len(Ls)-1):
      dd,cr=dseg(p,Ls[i],Ls[i+1])
      if dd<best[0]:best=(dd,cr)
    return best
  ang=lambda a,b:math.degrees(math.atan2(b[0]-a[0],-(b[1]-a[1])))
  bc=[cen(b) for b in polys['bunker']];wc=[(cen(w),w) for w in polys['water']]
  TB=[]
  for i,h in enumerate(holes):
    Ls=h['line'];pin=h['pin'];par=h['par'];L0=round(ln(Ls))
    turn=(ang(Ls[-2],Ls[-1])-ang(Ls[0],Ls[1])+540)%360-180
    fair=[b for b in bc if near(Ls,b)[0]<28 and math.hypot(b[0]-pin[0],b[1]-pin[1])>30]
    gs=[b for b in bc if math.hypot(b[0]-pin[0],b[1]-pin[1])<=30]
    lr=set('right' if near(Ls,b)[1]>0 else 'left' for b in gs)
    water=[]
    for w0,w in wc:
      if len(w)>2000:continue
      dmin=min(near(Ls,p)[0] for p in w[::max(1,len(w)//200)])
      if dmin<40:water.append(('right' if near(Ls,w0)[1]>0 else 'left',math.hypot(w0[0]-pin[0],w0[1]-pin[1])<70))
    shape='plays straight away' if abs(turn)<12 else ('bends gently %s'%('right' if turn>0 else 'left') if abs(turn)<30 else 'doglegs hard %s'%('right' if turn>0 else 'left'))
    s_='A %d-yard par %d that %s.'%(L0,par,shape) if par>3 else 'A %d-yard par 3.'%L0
    if fair:s_+=(' %s bunker%s pinch%s the landing area.' if par>3 else ' %s bunker%s sit%s short of the green.')%(words(len(fair)),'s' if len(fair)>1 else '',('' if len(fair)>1 else 'es') if par>3 else ('' if len(fair)>1 else 's'))
    if gs:s_+=' %s guard%s the green on %s.'%('A bunker' if len(gs)==1 else words(len(gs))+' bunkers','s' if len(gs)==1 else '','both sides' if len(lr)>1 else 'the '+list(lr)[0])
    if water:
      byg=[w for w in water if w[1]];w=(byg or water)[0];s_+=' Water sits %s of the %s.'%(w[0],'green' if w[1] else 'hole')
    random.seed(1300+i+len(out))
    TB.append({'par':par,'tip':s_,'green':{'elev':round(random.uniform(.6,1.4),1),'spine':random.choice([0,0,.5,.8]),'tier':random.choice([0,0,0,.6])},'slope':[round(random.uniform(-.28,.28),2),round(random.uniform(-.32,.22),2)],'bumps':[]})
  json.dump(TB,open(out+'_tb.json','w'))
  for t in TB[:3]:print(t['tip'])
  # surroundings (everything that isn't the golf course)
  run(src,lat0,lon0,[bx[0]-1300,bx[1]-1300,bx[2]+1300,bx[3]+1300],polys,out+'_surr.json')

