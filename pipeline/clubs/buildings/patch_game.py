#!/usr/bin/env python3
"""Golf Go: real building heights, roof shapes and roof colours (BLDX from ground.js), added course buildings
(snack shacks, restrooms, shelters, cart barns) and a distance LOD for building geometry.
usage: python3 patch_game.py path/to/index.html   (patches in place; every anchor must match exactly once)"""
import sys
path = sys.argv[1]
s = open(path).read()

def rep(a, b):
    global s
    n = s.count(a)
    assert n == 1, (n, a[:120])
    s = s.replace(a, b)

# 1. clubhouse polygons carry their index in COURSE.polys.clubhouse (P.ci) so BLDX.c can be looked up
rep("h.buildings=grab('clubhouse');h.buildings.forEach(P=>P.club=true);",
    "h.buildings=(COURSE.polys.clubhouse||[]).map((p,i)=>{const P=mkPoly(p.map(loc),'clubhouse');P.ci=i;return P;}).filter(inB);h.buildings.forEach(P=>P.club=true);")

# 2. surround buildings carry their index in SURR.bld (P.bi)
rep("for(const B of S.bld){const pts=B[0].map(p=>[p[0]-T0[0],p[1]-T0[1]]);if(!near(pts[0][0],pts[0][1],900))continue;const P=mkPoly(pts,'bld');P.h=B[1];h.buildings.push(P);}",
    "for(let bi=0;bi<S.bld.length;bi++){const B=S.bld[bi],pts=B[0].map(p=>[p[0]-T0[0],p[1]-T0[1]]);if(!near(pts[0][0],pts[0][1],900))continue;const P=mkPoly(pts,'bld');P.h=B[1];P.bi=bi;h.buildings.push(P);}")

# 3. attach measured records and add the buildings the map is missing, before trees are kept out of buildings
rep("  if(CUR.surr)surrForHole(h);\n  // keep trees out of buildings",
    "  if(CUR.surr)surrForHole(h);\n  bldxForHole(h);\n  // keep trees out of buildings")

# 4. the building geometry
OLD_START = "  // buildings from their mapped footprints: stone plinth, walls with windows, hipped roof with an overhang\n  for(const q of h.buildings||[]){"
OLD_END = "  // cart-path bridges wherever a mapped path crosses water\n"
assert s.count(OLD_START) == 1 and s.count(OLD_END) == 1
i = s.index(OLD_START); j = s.index(OLD_END)
assert i < j
s = s[:i] + r"""  // buildings from their footprints; far from the hole's line they get the plain version (box walls + roof)
  const L0=h.line||[[0,0]],lodD=(typeof R3!=='undefined'&&(R3.q!=='high'||R3.perf>0))?200:350;
  const dLine=q=>{let m=hyp(q.x-L0[0][0],q.y-L0[0][1]);for(let i=0;i<L0.length-1;i++){const a=L0[i],c=L0[i+1],dx=c[0]-a[0],dy=c[1]-a[1],l2=dx*dx+dy*dy||1,t=clamp(((q.x-a[0])*dx+(q.y-a[1])*dy)/l2,0,1);m=Math.min(m,hyp(a[0]+dx*t-q.x,a[1]+dy*t-q.y));}
    return m-hyp(q.bb[2]-q.bb[0],q.bb[3]-q.bb[1])/2;};
  for(const q of h.buildings||[])bldDraw(h,q,out,ST,dLine(q)>lodD);
""" + s[j:]

# 5. helpers: records, added buildings, footprint rectangle, the drawing itself
NEW_FN = r"""/* ---- buildings with measured heights / roof shapes / roof colours (BLDX in ground.js: lidar + aerial photo) ----
   BLDX[id]={c:{clubhouseIdx:rec},b:{surrBldIdx:rec},a:[[pts(course yd),rec,kind]]}, rec=[eaveH,ridgeRise,roof 0 flat|1 gable|2 hip,ridgeDeg,roofCol] */
function bldxForHole(h){if(typeof BLDX==='undefined'||!BLDX)return;const Xc=BLDX[CUR.id]||null,Xs=Xc||(CUR.data&&BLDX[CUR.data])||null;if(!Xs)return;
  for(const q of h.buildings){const r=q.ci!=null?(Xc&&Xc.c&&Xc.c[q.ci]):q.bi!=null?(Xs.b&&Xs.b[q.bi]):null;if(r&&r.length)q.rec=r;}
  const T0=h.T0,b=h.bounds,near=(x,y,r)=>x>b[0]-r&&x<b[2]+r&&y>b[1]-r&&y<b[3]+r;
  (Xs.a||[]).forEach((A,i)=>{if(!A||!A[0]||A[0].length<3)return;const pts=A[0].map(p=>[p[0]-T0[0],p[1]-T0[1]]);if(!pts.some(p=>near(p[0],p[1],900)))return;
    const P=mkPoly(pts,'bld');P.rec=A[1]&&A[1].length?A[1]:null;P.bk=['shack','barn','building'].includes(A[2])?A[2]:'building';P.ai=i;h.buildings.push(P);});}
// the footprint's bounding rectangle: smallest one, or one along a measured ridge (snapped to the footprint's own axes within ~20 deg)
function bldOBB(p,want){const proj=t=>{const ux=Math.cos(t),uy=Math.sin(t);let u0=1e9,u1=-1e9,v0=1e9,v1=-1e9;
    for(const q of p){const u=q[0]*ux+q[1]*uy,v=q[1]*ux-q[0]*uy;if(u<u0)u0=u;if(u>u1)u1=u;if(v<v0)v0=v;if(v>v1)v1=v;}return{t,ux,uy,u0,u1,v0,v1,ar:Math.max(1e-6,(u1-u0)*(v1-v0))};};
  let best=null;for(let i=0;i<p.length;i++){const a=p[i],c=p[(i+1)%p.length];if(hyp(c[0]-a[0],c[1]-a[1])<.3)continue;const o=proj(Math.atan2(c[1]-a[1],c[0]-a[0]));if(!best||o.ar<best.ar)best=o;}
  if(!best)best=proj(0);
  if(want!=null){let dd=1e9,tt=best.t;for(let k=0;k<4;k++){const c=best.t+k*Math.PI/2,d=Math.abs(Math.atan2(Math.sin(want-c),Math.cos(want-c)));if(d<dd){dd=d;tt=c;}}return dd<.35?proj(tt):proj(want);}
  return best.u1-best.u0>=best.v1-best.v0?best:proj(best.t+Math.PI/2);}
// drop corners that bend the outline less than tol yards (far buildings)
function bldSimplify(p,tol){p=p.slice();while(p.length>4){let bi=-1,bd=tol;for(let i=0;i<p.length;i++){const a=p[(i+p.length-1)%p.length],b=p[i],c=p[(i+1)%p.length],l=hyp(c[0]-a[0],c[1]-a[1])||1e-6,d=Math.abs((c[0]-a[0])*(b[1]-a[1])-(c[1]-a[1])*(b[0]-a[0]))/l;if(d<bd){bd=d;bi=i;}}if(bi<0)break;p.splice(bi,1);}return p;}
// triangles wound to face their normal (the building mesh is single-sided)
function triO(out,a,b,c,col,n){if(dot3(cross(sub(b,a),sub(c,a)),n)<0)pushTri(out,a,c,b,col,n,n,n);else pushTri(out,a,b,c,col,n,n,n);}
function quadO(out,a,b,c,d,col,n){triO(out,a,b,c,col,n);triO(out,a,c,d,col,n);}
const BLD_LUM=c=>.3*c[0]+.59*c[1]+.11*c[2],BLD_LIGHTW=['#e6e1d6','#d9d4c8','#cfd5d6','#e3d8c2','#d8dcd2'],BLD_DARKW=['#b5a690','#a39c8c','#9a6b56','#b3ab9c','#8d979c'],BLD_BARNW=['#b9b09c','#8c9a86','#a8aba6','#9c8b72','#7d8a92'];
// a photo roof colour, a little darker and greyer so it sits right under the game's sun
function bldRoofCol(c){const r=((c>>16)&255)/255,g=((c>>8)&255)/255,b=(c&255)/255,l=.3*r+.59*g+.11*b,k=.9-.2*l;return[(r*.8+l*.2)*k,(g*.8+l*.2)*k,(b*.8+l*.2)*k];}
function bldDraw(h,q,out,ST,simple){let p=q.pts.slice();if(p.length<3)return;const A=Math.abs(polyArea(p));if(A<8)return;
  const rec=q.rec||null,kind=q.bk||null,club=!!q.club,ex=!!(rec||kind),gh=(q.gh||0)-.2,hs=Math.abs(Math.round(q.x*7.3+q.y*13.1))%9973;
  let H1,rise=null,rt=2;
  if(rec){H1=Math.max(2.2,+rec[0]||0)+.2;rise=Math.max(0,+rec[1]||0);rt=clamp(rec[2]|0,0,2);if(rt&&rise<.3)rt=0;}
  else if(kind){H1=kind==='shack'?2.7:kind==='barn'?4.4:4.2;if(kind!=='building'){rt=1;rise=kind==='shack'?1.1:.9;}}
  else H1=q.h||(club?(A>900?7.2:4.6):4.2);
  // on a slope the walls still clear the high side of the footprint
  {let g1=-1e9;for(const c of p)g1=Math.max(g1,hAtH(h,c[0],c[1]));if(isFinite(g1))H1=Math.max(H1,g1-gh+2);}
  // gables (and measured hips) are drawn on the footprint's rectangle when the footprint fills most of it
  let ob=null,rect=false;
  if(ex||simple){ob=bldOBB(p,rec&&rt&&rec[3]!=null&&isFinite(rec[3])?rec[3]*Math.PI/180:null);
    if(A/ob.ar>=.8&&((ex&&rt)||simple))rect=true;if(rt===1&&!rect)rt=2;}
  const P2=(u,v)=>[u*ob.ux-v*ob.uy,u*ob.uy+v*ob.ux];
  if(rect)p=[P2(ob.u0,ob.v0),P2(ob.u1,ob.v0),P2(ob.u1,ob.v1),P2(ob.u0,ob.v1)];else if(simple&&p.length>6)p=bldSimplify(p,1);
  // clockwise footprints only: the mesh is single-sided and walls must face out (mapped footprints come in both windings)
  if(polyArea(p)>0)p=p.slice().reverse();const s=-1;
  // colours: the course style for clubs and course buildings, a photo roof colour when there is one, walls chosen to suit it
  let wall=hexc(club||kind==='shack'?ST.wall:'#cfc8bb'),roof=hexc(club||kind==='shack'?ST.roof:'#57524c');
  if(kind==='barn'){wall=hexc(BLD_BARNW[hs%5]);roof=hexc('#6d706f');}
  if(ex&&rt===0)roof=hexc('#8d8b86');
  if(rec&&rec[4]!=null&&isFinite(rec[4])){roof=bldRoofCol(rec[4]);const lr=BLD_LUM(roof);
    if(!club&&!kind)wall=hexc(lr<.55?BLD_LIGHTW[hs%5]:BLD_DARKW[hs%5]);
    else if(Math.abs(BLD_LUM(wall)-lr)<.12)wall=hexc(lr<.5?BLD_LIGHTW[hs%5]:BLD_DARKW[hs%5]);}
  const stone=hexc(ST.stone),trim=hexc(ST.trim),glass=hexc('#2b3a46');
  const flat=ex&&rt===0,Htop=flat?H1+.45:H1,plinth=kind&&kind!=='building'?.3:club?1.1:.5;
  let rows=[];if(!simple&&kind!=='shack'&&kind!=='barn'){if(!ex)rows=H1>6?[[1.8,3.3],[4.6,6.1]]:[[1.6,3.1]];else for(let y=club?1.8:1.5;y+1.5<H1-.3&&rows.length<6;y+=3.1)rows.push([y,y+1.5]);}
  // walls: stone plinth, siding, a trim band under the eave (or the parapet coping), rows of windows
  for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],ex2=b[0]-a[0],ez=b[1]-a[1],L=hyp(ex2,ez);if(L<.2)continue;
    const n=[ez/L*s,0,-ex2/L*s];
    const wq=(y0,y1,col,o=0)=>{const A0=[a[0]+n[0]*o,gh+y0,a[1]+n[2]*o],B0=[b[0]+n[0]*o,gh+y0,b[1]+n[2]*o],B1=[b[0]+n[0]*o,gh+y1,b[1]+n[2]*o],A1=[a[0]+n[0]*o,gh+y1,a[1]+n[2]*o];pushTri(out,A0,B0,B1,col,n,n,n);pushTri(out,A0,B1,A1,col,n,n,n);};
    if(simple){wq(0,Htop,wall);continue;}
    wq(0,plinth,stone,.12);wq(plinth,Htop,wall);wq(Htop-.35,Htop,trim,.05);
    const nw=Math.floor(L/(club?3.2:3.8));
    for(let k=0;k<nw;k++){const t=(k+.5)/nw,cx=a[0]+ex2*t,cz=a[1]+ez*t,hw=club?.75:.6,ux=ex2/L*hw,uz=ez/L*hw;
      for(const[y0,y1]of rows){if(y1>H1-.3)continue;const o=.06,P0=[cx-ux+n[0]*o,gh+y0,cz-uz+n[2]*o],P1=[cx+ux+n[0]*o,gh+y0,cz+uz+n[2]*o],P2=[cx+ux+n[0]*o,gh+y1,cz+uz+n[2]*o],P3=[cx-ux+n[0]*o,gh+y1,cz-uz+n[2]*o];
        pushTri(out,P0,P1,P2,glass,n,n,n);pushTri(out,P0,P2,P3,glass,n,n,n);}}}
  const shadeOf=nf=>.82+.18*Math.max(0,dot3(nf,nrm([-.5,.6,.6])));
  const slope=(a,b,c,d,under)=>{let nn=nrm(cross(sub(b,a),sub(d,a)));if(nn[1]<0)nn=mul(nn,-1);quadO(out,a,b,c,d,mul(roof,shadeOf(nn)),nn);if(under)quadO(out,a,b,c,d,mul(trim,.8),mul(nn,-1));};
  let top=null;   // a point on the roof for the club's chimney
  if(rt===2&&!rect){
    // hipped roof: overhanging eave ring rising to an inset ridge ring
    const minW=Math.sqrt(A)*.5;let rd=Math.min(club?7:4.5,minW*.45);if(ex&&ob)rd=Math.min(rd,(ob.v1-ob.v0)*.45);const rh=rise!=null?rise:club?rd*.62:rd*.7;
    const eave=insetPoly(p,-.7),ridge=insetPoly(p,rd),yE=gh+H1-.05,yR=gh+H1+rh;
    for(let i=0;i<p.length;i++){const j=(i+1)%p.length,a=[eave[i][0],yE,eave[i][1]],b=[eave[j][0],yE,eave[j][1]],c=[ridge[j][0],yR,ridge[j][1]],d=[ridge[i][0],yR,ridge[i][1]];
      const nn=nrm(cross(sub(b,a),sub(d,a)));const nf=nn[1]<0?mul(nn,-1):nn,sh=.82+.18*Math.max(0,dot3(nf,nrm([-.5,.6,.6])));
      quadO(out,a,b,c,d,mul(roof,sh),nf);
      if(simple)continue;
      // underside of the eave
      const w0=[p[i][0],yE,p[i][1]],w1=[p[j][0],yE,p[j][1]];triO(out,a,w1,b,mul(trim,.8),[0,-1,0]);triO(out,a,w0,w1,mul(trim,.8),[0,-1,0]);}
    for(const[a,b2,c2]of earClip(ridge))triO(out,[a[0],yR,a[1]],[b2[0],yR,b2[1]],[c2[0],yR,c2[1]],mul(roof,.95),[0,1,0]);
    if(club&&!simple){const c0=ridge[0],c1=ridge[Math.floor(ridge.length/2)];boxO(out,c0[0]*.8+c1[0]*.2,yR+.9,c0[1]*.8+c1[1]*.2,.8,1.6,.8,0,stone);}}
  else if(rt>0){
    // gable or hip on the footprint's rectangle, ridge along u
    const o=kind==='shack'?.4:.6,hw=(ob.v1-ob.v0)/2,vm=(ob.v0+ob.v1)/2,rs=rise!=null?rise:(club?.62:.7)*Math.min(club?7:4.5,Math.sqrt(A)*.225,hw),yW=gh+H1,yR=yW+rs,yE=yW-.05-rs*o/Math.max(hw,.5),R3d=(u,v,y)=>{const c=P2(u,v);return[c[0],y,c[1]];};
    const vs0=ob.v0-o,vs1=ob.v1+o;
    if(rt===1){const og=kind==='shack'?.3:.45,ua=ob.u0-og,ub=ob.u1+og;
      slope(R3d(ua,vs0,yE),R3d(ub,vs0,yE),R3d(ub,vm,yR),R3d(ua,vm,yR),!simple);slope(R3d(ub,vs1,yE),R3d(ua,vs1,yE),R3d(ua,vm,yR),R3d(ub,vm,yR),!simple);
      // gable-end triangles in the wall colour (and a trim strip along the verge)
      for(const[u,sg]of[[ob.u0,-1],[ob.u1,1]]){const nn=[ob.ux*sg,0,ob.uy*sg];triO(out,R3d(u,ob.v0,yW),R3d(u,ob.v1,yW),R3d(u,vm,yR),mul(wall,.96),nn);
        if(!simple){const uu=u+sg*og;for(const v of[vs0,vs1])quadO(out,R3d(uu,v,yE-.18),R3d(uu,vm,yR-.18),R3d(uu,vm,yR+.02),R3d(uu,v,yE+.02),trim,nn);}}
      top=R3d(ob.u0+(ob.u1-ob.u0)*.75,vm,yR);}
    else{const ue0=ob.u0-o,ue1=ob.u1+o,hh=(vs1-vs0)/2;let ru0=ue0+hh,ru1=ue1-hh;if(ru0>ru1)ru0=ru1=(ue0+ue1)/2;
      slope(R3d(ue0,vs0,yE),R3d(ue1,vs0,yE),R3d(ru1,vm,yR),R3d(ru0,vm,yR),!simple);slope(R3d(ue1,vs1,yE),R3d(ue0,vs1,yE),R3d(ru0,vm,yR),R3d(ru1,vm,yR),!simple);
      for(const[a,b,c]of[[R3d(ue0,vs1,yE),R3d(ue0,vs0,yE),R3d(ru0,vm,yR)],[R3d(ue1,vs0,yE),R3d(ue1,vs1,yE),R3d(ru1,vm,yR)]]){let nn=nrm(cross(sub(b,a),sub(c,a)));if(nn[1]<0)nn=mul(nn,-1);
        triO(out,a,b,c,mul(roof,shadeOf(nn)),nn);if(!simple)triO(out,a,b,c,mul(trim,.8),mul(nn,-1));}
      top=R3d(ru0+(ru1-ru0)*.2,vm,yR);}
    if(club&&!simple&&top)boxO(out,top[0],top[1]+.6,top[2],.8,1.6,.8,ob.t,stone);}
  else{
    // flat roof: membrane inside a low parapet with a coping, and a few rooftop units on the big ones
    const yT=gh+Htop,yF=gh+H1+.05;
    if(simple){for(const[a,b2,c2]of earClip(p))triO(out,[a[0],yT,a[1]],[b2[0],yT,b2[1]],[c2[0],yT,c2[1]],roof,[0,1,0]);}
    else{const inr=insetPoly(p,.3),cop=mul(stone,1.08);
      for(let i=0;i<p.length;i++){const j=(i+1)%p.length,a=p[i],b=p[j],L=hyp(b[0]-a[0],b[1]-a[1]);if(L<.2)continue;const n=[(b[1]-a[1])/L*s,0,-(b[0]-a[0])/L*s],ni=mul(n,-1);
        quadO(out,[a[0],yT,a[1]],[b[0],yT,b[1]],[inr[j][0],yT,inr[j][1]],[inr[i][0],yT,inr[i][1]],cop,[0,1,0]);
        quadO(out,[inr[i][0],yF,inr[i][1]],[inr[j][0],yF,inr[j][1]],[inr[j][0],yT,inr[j][1]],[inr[i][0],yT,inr[i][1]],mul(wall,.8),ni);}
      for(const[a,b2,c2]of earClip(inr))triO(out,[a[0],yF,a[1]],[b2[0],yF,b2[1]],[c2[0],yF,c2[1]],roof,[0,1,0]);
      if(A>250&&kind!=='barn'){const nU=Math.min(3,1+Math.floor(A/700)),uc=(ob.u0+ob.u1)/2,vc=(ob.v0+ob.v1)/2,span=(ob.u1-ob.u0)*.5;
        for(let k=0;k<nU;k++){const u=uc+(nU>1?(k/(nU-1)-.5)*span:0),v=vc+((hs>>k)&1?.2:-.2)*(ob.v1-ob.v0)*.5,c=P2(u,v);if(!inPoly(q,c[0],c[1]))continue;
          boxO(out,c[0],yF+.55,c[1],1.1,.55,.8,ob.t,hexc('#a9aba7'));}}}}
  if(simple)return;
  // the longest wall: where a club's entry canopy, a shack's serving window or a barn's doors go
  let bi=0,bl=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],l=hyp(b[0]-a[0],b[1]-a[1]);if(l>bl){bl=l;bi=i;}}
  if(kind==='shack'||kind==='barn'){   // of the long walls, the one facing the hole
    const L0=h.line||[[0,0]];let tx=L0[0][0],ty=L0[0][1],td=1e9;for(const c of L0){const d=hyp(c[0]-q.x,c[1]-q.y);if(d<td){td=d;tx=c[0];ty=c[1];}}
    let bs=-1e9;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],l=hyp(b[0]-a[0],b[1]-a[1]);if(l<bl*.85)continue;const sc=((b[1]-a[1])*s*(tx-(a[0]+b[0])/2)-(b[0]-a[0])*s*(ty-(a[1]+b[1])/2))/l;if(sc>bs){bs=sc;bi=i;}}}
  const edge=k=>{const a=p[k%p.length],b=p[(k+1)%p.length],L=hyp(b[0]-a[0],b[1]-a[1])||1,ex2=(b[0]-a[0])/L,ez=(b[1]-a[1])/L;return{a,b,L,ex:ex2,ez,mx:(a[0]+b[0])/2,mz:(a[1]+b[1])/2,nx:ez*s,nz:-ex2*s,rot:Math.atan2(ez,ex2)};};
  const panel=(E,t,hw,y0,y1,col,o)=>{const cx=E.a[0]+(E.b[0]-E.a[0])*t,cz=E.a[1]+(E.b[1]-E.a[1])*t,n=[E.nx,0,E.nz];hw=Math.min(hw,E.L*.45);
    quadO(out,[cx-E.ex*hw+E.nx*o,gh+y0,cz-E.ez*hw+E.nz*o],[cx+E.ex*hw+E.nx*o,gh+y0,cz+E.ez*hw+E.nz*o],[cx+E.ex*hw+E.nx*o,gh+y1,cz+E.ez*hw+E.nz*o],[cx-E.ex*hw+E.nx*o,gh+y1,cz-E.ez*hw+E.nz*o],col,n);};
  if(club){const E=edge(bi),a=E.a,b=E.b,ex2=E.ex,ez=E.ez,mx=E.mx,mz=E.mz,nx=E.nx,nz=E.nz,rot=E.rot,cy=Math.min(4.3,H1-.5);
    // entry canopy on the longest wall
    boxO(out,mx+nx*2.6,gh+cy,mz+nz*2.6,3.2,.25,2.8,rot,trim);
    for(const sx of[-2.8,2.8])boxO(out,mx+nx*4.9+ex2*sx,gh+cy/2-.05,mz+nz*4.9+ez*sx,.35,cy/2-.05,.35,rot,stone);}
  else if(kind==='shack'){const E=edge(bi),D=edge(bi+1),W=edge(bi+3),aw=hexc(['#2f6b4a','#7a2f2a','#2f4f7a'][hs%3]),yw=Math.min(2.25,H1-.25);
    // serving window with a counter and an awning, a door round the side, one small window opposite
    panel(E,.5,.95,1.05,Math.min(2.0,H1-.45),glass,.06);boxO(out,E.mx+E.nx*.28,gh+1.02,E.mz+E.nz*.28,Math.min(1.05,E.L*.45),.05,.28,E.rot,trim);
    boxO(out,E.mx+E.nx*.6,gh+yw,E.mz+E.nz*.6,Math.min(1.25,E.L*.48),.05,.62,E.rot,aw);
    panel(D,.5,.5,plinth,Math.min(2.1,H1-.3),hexc('#6b4a33'),.06);panel(W,.5,.45,1.3,Math.min(2.0,H1-.4),glass,.06);}
  else if(kind==='barn'){const E=edge(bi),nd=clamp(Math.floor(E.L/6),1,5),dh=Math.min(3.6,H1-.7),hw=Math.min(1.7,E.L/nd*.36),door=mul(hexc('#d4d5d0'),.95),rib=hexc('#9a9c99');
    // roll-up doors along the long wall, ribbed, with a header; a man door on the end wall
    for(let k=0;k<nd;k++){const t=(k+.5)/nd;panel(E,t,hw+.15,dh,dh+.3,trim,.07);panel(E,t,hw,plinth,dh,door,.06);for(const y of[.33,.66])panel(E,t,hw,plinth+(dh-plinth)*y-.05,plinth+(dh-plinth)*y+.05,rib,.08);}
    panel(edge(bi+1),.3,.5,plinth,Math.min(2.2,H1-.4),hexc('#5d6a72'),.06);}
}
"""
rep("function buildStructures(h,out){", NEW_FN + "function buildStructures(h,out){")

open(path, 'w').write(s)
print('patched', path)
