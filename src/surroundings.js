/* ---------- surroundings (real houses, roads, woods and fields around the course) ---------- */
const SURR={ready:null};
function surrPrep(){const C=CUR;if(SURR.ready===C.id)return SURR;const S=C.surr;SURR.ready=C.id;SURR.S=S;bldxPark(S);
  const[x0,y0,x1,y1]=S.box,ww=x1-x0,hh=y1-y0;
  // woods / yards / water mask at 4 yd per cell for tree placement and the distant canopy
  const MS=4,mw=Math.ceil(ww/MS),mh=Math.ceil(hh/MS),mc=document.createElement('canvas');mc.width=mw;mc.height=mh;const m=mc.getContext('2d',{willReadFrequently:true});
  m.scale(1/MS,1/MS);m.translate(-x0,-y0);const fillP=(list,col)=>{m.fillStyle=col;for(const P of list||[]){m.beginPath();m.moveTo(P[0][0],P[0][1]);for(let i=1;i<P.length;i++)m.lineTo(P[i][0],P[i][1]);m.closePath();m.fill();}};
  fillP(S.polys.res,'rgb(0,255,0)');fillP(S.polys.grass,'rgb(0,0,0)');fillP(S.polys.park,'rgb(0,0,0)');fillP(S.polys.wood,'rgb(255,0,0)');fillP(COURSE.polys.wood,'rgb(255,0,0)');
  fillP(S.polys.wetland,'rgb(0,0,0)');fillP(S.polys.water,'rgb(0,0,255)');fillP(COURSE.polys.water,'rgb(0,0,255)');
  for(const k of['fairway','green','tee','bunker'])fillP(COURSE.polys[k],'rgb(0,0,0)');
  m.lineCap='round';m.strokeStyle='rgb(0,0,0)';for(const r of S.roads){m.lineWidth=r[1]+4;m.beginPath();m.moveTo(r[2][0],r[2][1]);for(let i=3;i<r.length;i++)m.lineTo(r[i][0],r[i][1]);m.stroke();}
  const id=m.getImageData(0,0,mw,mh).data;SURR.mask={x0,y0,MS,mw,mh,d:id};
  // painted ground for everything outside the hole being played
  let TWs=2048;if(PERF.level>=1)TWs=1024;const c=document.createElement('canvas');c.width=TWs;c.height=TWs;const g=c.getContext('2d');g.scale(TWs/ww,TWs/hh);g.translate(-x0,-y0);
  const R=rng(31),poly=(P)=>{g.beginPath();g.moveTo(P[0][0],P[0][1]);for(let i=1;i<P.length;i++)g.lineTo(P[i][0],P[i][1]);g.closePath();};
  const blot=(n,cols,rmin,rmax,clipList)=>{for(let i=0;i<n;i++){const px=x0+R()*ww,py=y0+R()*hh,r=rmin+R()*(rmax-rmin),gr=g.createRadialGradient(px,py,0,px,py,r);gr.addColorStop(0,cols[Math.floor(R()*cols.length)]);gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(px-r,py-r,2*r,2*r);}};
  const links=C.scen==='links';
  const lowc=C.scen==='lowcountry',desC=C.scen==='desert';g.fillStyle=desC?'#bfa47f':links?'#a9a064':lowc?'#3e5530':'#8f9a55';g.fillRect(x0,y0,ww,hh);blot(ww*hh/900,desC?['rgba(226,206,170,.3)','rgba(120,112,78,.28)','rgba(150,118,92,.25)']:['rgba(214,196,120,.25)','rgba(96,110,54,.25)','rgba(150,150,80,.2)'],10,40);
  const layer=(list,fill,extra)=>{for(const P of list||[]){poly(P);g.fillStyle=fill;g.fill();if(extra){g.save();poly(P);g.clip();extra(P);g.restore();}}};
  layer(S.polys.meadow,'#a79d5e',()=>{});
  layer(S.polys.farm,'#b7a864',P=>{let L=0,a=0;for(let i=0;i<P.length;i++){const q=P[i],r=P[(i+1)%P.length],l=hyp(r[0]-q[0],r[1]-q[1]);if(l>L){L=l;a=Math.atan2(r[1]-q[1],r[0]-q[0]);}}
    g.translate(P[0][0],P[0][1]);g.rotate(a);for(let k=-400;k<400;k++){g.fillStyle=(k&1)?'rgba(140,128,70,.35)':'rgba(205,190,120,.25)';g.fillRect(-4000,k*3,8000,3);}});
  layer(S.polys.grass,'#71a24c');layer(S.polys.comm,'#9d998c');
  layer(S.polys.res,'#77a650',P=>{for(let i=0;i<40;i++){const px=P[0][0]+(R()-.5)*300,py=P[0][1]+(R()-.5)*300,r=6+R()*14;g.fillStyle=R()<.5?'rgba(140,190,95,.35)':'rgba(70,120,50,.3)';g.beginPath();g.arc(px,py,r,0,TAU);g.fill();}});
  layer(S.polys.wood,'#2e4f25',()=>{});layer(COURSE.polys.wood,'#2e4f25');
  blot(0,[],0,0);
  layer(S.polys.wetland,lowc?'#9aa062':'#62815a',lowc?()=>{g.strokeStyle='rgba(70,100,110,.55)';g.lineWidth=2;for(let i=0;i<60;i++){const x=x0+R()*ww,y=y0+R()*hh;g.beginPath();g.moveTo(x,y);g.bezierCurveTo(x+40,y+30,x+60,y-40,x+120,y+10);g.stroke();}}:null);
  const water=(list)=>layer(list,'#3f7fb4',P=>{g.fillStyle='rgba(120,180,220,.35)';for(let i=0;i<30;i++){g.fillRect(P[0][0]+(R()-.5)*400,P[0][1]+(R()-.5)*400,12,1.2);}});
  water(S.polys.water);
  layer(S.polys.park,'#6f6e6a',()=>{g.strokeStyle='rgba(235,235,225,.5)';g.lineWidth=.3;for(let k=-300;k<300;k+=3){g.beginPath();g.moveTo(-2e4,k);g.lineTo(2e4,k);g.stroke();}});
  // roads, widest first so junctions read cleanly
  const RC={motorway:['#4f4f4f','#e8e2c8'],motorway_link:['#555','#555'],trunk:['#555','#ddd'],primary:['#5a5a5a','#e9e2b0'],secondary:['#5d5d5d','#e9e2b0'],tertiary:['#626262',null],residential:['#6b6b6a',null],unclassified:['#6b6b6a',null],living_street:['#6b6b6a',null],service:['#777672',null],driveway:['#8e8b84',null],footway:['#b9b2a2',null],path:['#b0a78f',null],cycleway:['#9d9a92',null],track:['#9c8d6a',null],stream:['#3c78a8',null]};
  g.lineCap='round';g.lineJoin='round';
  const road=r=>{g.beginPath();g.moveTo(r[2][0],r[2][1]);for(let i=3;i<r.length;i++)g.lineTo(r[i][0],r[i][1]);};
  const rs=S.roads.slice().sort((a,b)=>a[1]-b[1]);
  for(const r of rs){const cc=RC[r[0]]||RC.service;if(r[0]==='stream'||r[0]==='footway')continue;road(r);g.strokeStyle='rgba(60,60,55,.5)';g.lineWidth=r[1]+1.2;g.stroke();}
  for(const r of rs){const cc=RC[r[0]]||RC.service;road(r);g.strokeStyle=cc[0];g.lineWidth=r[1];g.stroke();if(cc[1]&&r[1]>=7){g.setLineDash([3,6]);g.strokeStyle=cc[1];g.lineWidth=.35;g.stroke();g.setLineDash([]);}}
  // the rest of the golf course, so neighbouring holes look right from a distance
  g.lineWidth=14;g.strokeStyle=links?'#8e9a4c':'#4f8a3c';for(const P of COURSE.polys.fairway){poly(P);g.stroke();}
  for(const P of COURSE.polys.fairway){poly(P);g.fillStyle='#6fb24a';g.fill();}
  for(const P of COURSE.polys.tee){poly(P);g.fillStyle='#7fc158';g.fill();}
  for(const P of COURSE.polys.green){g.lineWidth=4;g.strokeStyle='#62a948';poly(P);g.stroke();g.fillStyle='#96d56e';g.fill();}
  water(COURSE.polys.water);
  for(const P of COURSE.polys.bunker){poly(P);g.fillStyle='#efe8d6';g.fill();}
  g.strokeStyle='#bdb7aa';g.lineWidth=2.4;for(const pl of COURSE.paths){g.beginPath();g.moveTo(pl[0][0],pl[0][1]);for(let i=1;i<pl.length;i++)g.lineTo(pl[i][0],pl[i][1]);g.stroke();}
  SURR.canvas=c;
  if(SURR.tex&&SURR.tex.dispose)SURR.tex.dispose();SURR.tex=r3CanvasTex(c);return SURR;}
// what the map says is at a course-frame point: 'wood' | 'yard' | 'water' | 'open' | 'clear'
function surrAt(x,y){const M=SURR.mask;if(!M)return'open';const i=Math.floor((x-M.x0)/M.MS),j=Math.floor((y-M.y0)/M.MS);if(i<0||j<0||i>=M.mw||j>=M.mh)return'open';
  const k=(j*M.mw+i)*4,d=M.d;if(d[k+2]>128)return'water';if(d[k]>128)return'wood';if(d[k+1]>128)return'yard';if(d[k+3]>128)return'clear';return'open';}
const HOUSE_COL=['#e8e2d4','#c9d3d8','#d8c6a8','#a9b8a2','#ece8e0','#b7a58c','#dcd6cc','#8e9aa6'],ROOF_COL=['#4b4f55','#5a3e33','#3f4a57','#6b645c'];
// per hole: the real homes, buildings and trees near it, in the hole's own frame
function surrForHole(h){if(!CUR.surr)return;surrPrep();const S=CUR.surr,T0=h.T0,b=h.bounds,cx=(b[0]+b[2])/2,cy=(b[1]+b[3])/2,R=rng(900+G.hi*7);
  const near=(x,y,r)=>x>b[0]-r&&x<b[2]+r&&y>b[1]-r&&y<b[3]+r;
  h.houses=[];for(const q of S.houses){const x=q[0]-T0[0],y=q[1]-T0[1];if(!near(x,y,900))continue;
    h.houses.push({x,y,w:q[3],d:q[4],rot:q[2],col:HOUSE_COL[q[5]%HOUSE_COL.length],roof:ROOF_COL[q[5]%ROOF_COL.length]});}
  for(let bi=0;bi<S.bld.length;bi++){const B=S.bld[bi],pts=B[0].map(p=>[p[0]-T0[0],p[1]-T0[1]]);if(!near(pts[0][0],pts[0][1],900))continue;const P=mkPoly(pts,'bld');P.h=B[1];P.bi=bi;h.buildings.push(P);}
  // woods from the map join the course's own woods for tree placement inside the hole
  for(const P of S.polys.wood||[]){const Q=mkPoly(P.map(p=>[p[0]-T0[0],p[1]-T0[1]]),'wood');if(!(Q.bb[2]<b[0]-60||Q.bb[0]>b[2]+60||Q.bb[3]<b[1]-60||Q.bb[1]>b[3]+60))h.woods.push(Q);}
  // a ring of simpler trees out to ~400 yds: woods filled in, yards dotted with shade trees
  const far=[];const R0=400,st=9;
  for(let y=b[1]-R0;y<b[3]+R0;y+=st)for(let x=b[0]-R0;x<b[2]+R0;x+=st){
    const jx=x+(R()-.5)*st*.9,jy=y+(R()-.5)*st*.9;
    const inside=jx>b[0]+2&&jx<b[2]-2&&jy>b[1]+2&&jy<b[3]-2;if(inside)continue;
    const k=surrAt(jx+T0[0],jy+T0[1]);
    const lowc=CUR.scen==='lowcountry';if(k==='wood'||(lowc&&k==='open')){if(R()<.18)continue;}else if(k==='yard'){if(R()>(lowc?.14:.07))continue;}else if(k==='open'){if(R()>(CUR.scen==='links'?.002:.012))continue;}else continue;
    const dB=Math.max(b[0]-jx,jx-b[2],b[1]-jy,jy-b[3],0);
    far.push({x:jx,y:jy,r:6+R()*5,sp:lowc?(R()<.55?'lpine':'liveoak'):R()<(k==='wood'?.28:.35)?'pine':R()<.7?'oak':'maple',shade:R(),d:dB});}
  for(const t of S.trees||[]){const x=t[0]-T0[0],y=t[1]-T0[1];if(near(x,y,R0))far.push({x,y,r:7+R()*4,sp:'oak',shade:R(),d:0});}
  if(far.length>3600){far.sort((a,b2)=>a.d-b2.d);far.length=3600;}
  h.farTrees=far;
  // homes stand in cleared lots: drop hole trees that land on top of a house
  const clear=(x,y)=>h.houses.some(q=>hyp(q.x-x,q.y-y)<q.w*.8);
  h.trees=h.trees.filter(t=>!clear(t.x,t.y));h.farTrees=h.farTrees.filter(t=>!clear(t.x,t.y));
  h.allTrees=h.allTrees.filter(t=>!clear(t.x,t.y));}

