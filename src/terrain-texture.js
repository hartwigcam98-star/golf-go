/* ---------- terrain texture ---------- */
function polyPath(g,P){g.beginPath();const p=P.pts;g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();}
function strokePl(g,pls){for(const pl of pls){g.beginPath();g.moveTo(pl[0][0],pl[0][1]);for(let i=1;i<pl.length;i++)g.lineTo(pl[i][0],pl[i][1]);g.stroke();}}
const pot=n=>{let p=1;while(p<n)p*=2;return Math.min(4096,p);};
/* ---------- regional ground cover (Oct 2026): what lies between the holes and under the trees ----------
   pine straw under the pines and oaks of the South, dark needle-and-leaf duff in the north woods, open sand blowouts in the
   Wisconsin barrens. Cosmetic only: the lie stays rough or fescue. h.cover: 1 straw, 2 duff, 3 sand, per 1-yd cell of h.lg. */
function coverAt(h,x,y){const C=h.cover,L=h.lg;if(!C||!L)return 0;const i=Math.floor(x-L.x0+.5),j=Math.floor(y-L.y0+.5);return i<0||j<0||i>=L.nx||j>=L.ny?0:C[j*L.nx+i];}
function coverRegion(){const id=CUR.data||CUR.id;if(CUR.scen==='desert')return 0;if(R3T_BARRENS[id])return 3;if(R3T_NORTH[id])return 2;if(id==='farmlinks')return 2;if(CUR.scen==='lowcountry'||R3T_SOUTH[id])return 1;return 0;}
function groundCover(h){if(h.cover!==undefined)return h.cover;h.cover=null;const reg=coverRegion(),L=h.lg;if(!reg||!L)return null;
  // the photo's trees, placed now so the ground under them can be painted (the species pass reuses them)
  if(R3.on&&R3T_COURSES[CUR.id]&&!h.naipDone){h.naipDone=1;try{r3NaipApply(h);}catch(e){}}
  const nx=L.nx,ny=L.ny,C=new Uint8Array(nx*ny),code=L.code,dm=L.dmown;let n=0;
  const ok=k=>(code[k]===0||code[k]===1)&&dm[k]>(code[k]===1?3.5:2.5);
  const disc=(x,y,r,v)=>{const i0=Math.max(0,Math.floor(x-r-L.x0)),i1=Math.min(nx-1,Math.ceil(x+r-L.x0)),j0=Math.max(0,Math.floor(y-r-L.y0)),j1=Math.min(ny-1,Math.ceil(y+r-L.y0));
    for(let j=j0;j<=j1;j++)for(let i=i0;i<=i1;i++){const dx=L.x0+i-x,dy=L.y0+j-y;if(dx*dx+dy*dy>r*r)continue;const k=j*nx+i;if(!C[k]&&ok(k)){C[k]=v;n++;}}};
  const trees=(h.allTrees||[]).concat(h.farTrees||[]);
  for(const t of trees){if(t.cactus)continue;const r=(t.r||3)*(reg===1?(t.con?1.15:.95):reg===2?1:t.con?1.05:.7);if(reg===3&&!t.con)continue;disc(t.x,t.y,r,reg===3?3:reg);}
  // inside the mapped woods the floor is straw or duff all through
  if(reg!==3)for(const P of h.woods||[]){const bb=P.bb;for(let j=Math.max(0,Math.floor(bb[1]-L.y0));j<=Math.min(ny-1,Math.ceil(bb[3]-L.y0));j++)for(let i=Math.max(0,Math.floor(bb[0]-L.x0));i<=Math.min(nx-1,Math.ceil(bb[2]-L.x0));i++){const k=j*nx+i;if(C[k]||!ok(k))continue;if(inPoly(P,L.x0+i,L.y0+j)){C[k]=reg;n++;}}}
  // the barrens: open sand drifts through the native areas, set back from the mown grass
  if(reg===3){const nz=(x,y)=>Math.sin(x*.043+y*.017)*Math.sin(x*.021-y*.039)+.45*Math.sin(x*.11+1.3)*Math.sin(y*.097-.7);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const k=j*nx+i;if(C[k]||code[k]!==0||dm[k]<5)continue;const x=L.x0+i,y=L.y0+j;if(nz(x,y)>(CUR.id==='sedge'?.62:.32)-Math.min(.25,(dm[k]-5)*.008)){C[k]=3;n++;}}}
  return h.cover=n?C:null;}
// flower beds traced from the aerial (CFEEL2 flp: [{p:[[x,y],..] course yd, c:[colours]}], e.g. SentryWorld's Flower Hole):
// banded drifts of colour painted into the ground, only on rough or native ground inside each bed
function paintFlowers(h,g,R){const F=(typeof CFEEL2!=='undefined'&&CFEEL2[CUR.id])||{},Q=F.flp,L=h.lg;if(!Q||!L)return;const T0=h.T0,b=h.bounds;
  for(const bd of Q){const pts=bd.p.map(q=>[q[0]-T0[0],q[1]-T0[1]]);let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const[x,y]of pts){x0=Math.min(x0,x);y0=Math.min(y0,y);x1=Math.max(x1,x);y1=Math.max(y1,y);}const P={pts,bb:[x0,y0,x1,y1]};
    if(x1<b[0]||x0>b[2]||y1<b[1]||y0>b[3])continue;const cols=(bd.c&&bd.c.length?bd.c:['#c8302a','#e8c23a','#d8762e','#d96a8a']).map(hexc),sd=R()*100;
    const ok=(x,y)=>{const c=lieCodeAt(h,x,y);return(c===0||c===1||c===7)&&inPoly(P,x,y);};
    const band=(x,y)=>{const v=Math.sin(x*.09+y*.05+sd)+.7*Math.sin(x*.04-y*.11+sd*1.7)+.4*Math.sin((x+y)*.21+sd*.3);return cols[Math.min(cols.length-1,Math.floor((v+2.1)/4.2*cols.length))];};
    const rgb=(c,k)=>'rgb('+Math.round(Math.min(1,c[0]*k)*255)+','+Math.round(Math.min(1,c[1]*k)*255)+','+Math.round(Math.min(1,c[2]*k)*255)+')';
    // base: each yard cell the colour of its drift, slightly dark (the foliage between the blooms)
    const nx=Math.ceil(x1-x0)+1,ny=Math.ceil(y1-y0)+1,m=document.createElement('canvas');m.width=nx;m.height=ny;const mc=m.getContext('2d'),id=mc.createImageData(nx,ny);
    for(let j=0;j<ny;j++)for(let i=0;i<nx;i++){const x=x0+i,y=y0+j;if(!ok(x,y))continue;const c=band(x,y),o=(j*nx+i)*4;id.data[o]=c[0]*170;id.data[o+1]=c[1]*170;id.data[o+2]=c[2]*170;id.data[o+3]=255;}
    mc.putImageData(id,0,0);g.save();g.imageSmoothingEnabled=true;g.filter='blur(0.5px)';g.drawImage(m,x0-.5,y0-.5,nx,ny);g.filter='none';
    // blooms: dense dots in the drift colour, a few leaves and the odd bloom of a neighbouring colour
    const N=(x1-x0)*(y1-y0)*30;for(let q=0;q<N;q++){const x=x0+R()*(x1-x0),y=y0+R()*(y1-y0);if(!ok(x,y))continue;const u=R();
      if(u<.12){g.fillStyle='rgba(46,84,34,.7)';g.beginPath();g.arc(x,y,.15+R()*.2,0,TAU);g.fill();continue;}
      const c=u>.95?cols[(R()*cols.length)|0]:band(x+(R()-.5)*3,y+(R()-.5)*3);g.fillStyle=rgb(c,.85+R()*.35);g.beginPath();g.arc(x,y,.14+R()*.22,0,TAU);g.fill();}
    g.restore();}}
function paintCover(h,g,R){const C=groundCover(h);if(!C)return;const L=h.lg,nx=L.nx,ny=L.ny;
  const BASE={1:[122,86,56],2:[92,76,56],3:[214,198,160]};
  const m=document.createElement('canvas');m.width=nx;m.height=ny;const mc=m.getContext('2d'),id=mc.createImageData(nx,ny);
  for(let k=0;k<C.length;k++){const v=C[k];if(!v)continue;const b=BASE[v],o=k*4,j=((k*2654435761)>>>24)/255*.16-.08;id.data[o]=b[0]*(1+j);id.data[o+1]=b[1]*(1+j);id.data[o+2]=b[2]*(1+j);id.data[o+3]=v===3?235:225;}
  mc.putImageData(id,0,0);g.save();g.imageSmoothingEnabled=true;g.filter='blur(0.6px)';g.drawImage(m,L.x0-.5,L.y0-.5,nx,ny);g.filter='none';
  const at=(x,y)=>{const i=Math.floor(x-L.x0+.5),j=Math.floor(y-L.y0+.5);return i<0||j<0||i>=nx||j>=ny?0:C[j*nx+i];};
  // texture: straw needles, duff with ferns and moss, sand with marram tufts and ripples
  const N=nx*ny/2.2;for(let q=0;q<N;q++){const x=L.x0+R()*nx,y=L.y0+R()*ny,v=at(x,y);if(!v)continue;const u=R();
    if(v===1){if(u<.7){g.strokeStyle=u<.35?'rgba(176,122,70,.55)':'rgba(96,58,30,.5)';g.lineWidth=.12;const a=R()*TAU,l=.5+R()*.9;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}
      else{g.fillStyle=u<.9?'rgba(110,70,38,.35)':'rgba(70,96,46,.35)';g.beginPath();g.arc(x,y,.3+R()*.7,0,TAU);g.fill();}}
    else if(v===2){if(u<.45){g.fillStyle=u<.25?'rgba(52,42,32,.55)':'rgba(104,84,60,.45)';g.beginPath();g.arc(x,y,.25+R()*.6,0,TAU);g.fill();}
      else if(u<.8){g.fillStyle=u<.62?'rgba(70,104,48,.55)':'rgba(96,128,62,.5)';g.beginPath();g.ellipse(x,y,.5+R()*.9,.25+R()*.4,R()*TAU,0,TAU);g.fill();}
      else{g.strokeStyle='rgba(150,120,80,.4)';g.lineWidth=.12;const a=R()*TAU,l=.4+R()*.7;g.beginPath();g.moveTo(x,y);g.lineTo(x+Math.cos(a)*l,y+Math.sin(a)*l);g.stroke();}}
    else{if(u<.22){g.fillStyle=u<.12?'rgba(118,122,72,.6)':'rgba(150,150,96,.5)';g.beginPath();g.arc(x,y,.3+R()*.8,0,TAU);g.fill();}
      else if(u<.5){g.fillStyle=u<.36?'rgba(236,224,192,.4)':'rgba(176,156,120,.3)';g.beginPath();g.ellipse(x,y,.8+R()*1.6,.15+R()*.2,.4,0,TAU);g.fill();}}}
  g.restore();}
function buildTerrain(h){
  const[x0,y0,x1,y1]=h.bounds,ww=x1-x0,hh=y1-y0;
  let TW=pot(ww*6),TH=pot(hh*6);while(TW*TH>8.4e6){if(TW/ww>TH/hh)TW/=2;else TH/=2;}
  const mk=()=>{const c=document.createElement('canvas');c.width=TW;c.height=TH;const g=c.getContext('2d');g.scale(TW/ww,TH/hh);g.translate(-x0,-y0);return[c,g];};
  const[c,g]=mk();const R=rng(7);const TU=turfOf(),ST=TU.st;
  // native fescue
  const DES=CUR.scen==='desert';
  /* v2 (Oct 2026): living fescue rather than straw - a sage/olive base, darker green tussocks and drifts of golden seed heads */
  g.fillStyle=DES?'#c8ac85':h.low?'#8f7a4e':TU.fe?turfHex('#a29f5e',TU.fe):'#a29f5e';g.fillRect(x0,y0,ww,hh);
  for(let i=0;i<ww*hh/160;i++){const px=x0+R()*ww,py=y0+R()*hh,r=5+R()*16,gr=g.createRadialGradient(px,py,0,px,py,r);const lt=R()<.5;gr.addColorStop(0,DES?(lt?'rgba(232,212,176,.3)':'rgba(150,118,84,.22)'):lt?'rgba(222,202,128,.3)':'rgba(84,100,52,.3)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(px-r,py-r,2*r,2*r);}
  if(!DES&&!h.low)for(let i=0;i<ww*hh/12;i++){const px=x0+R()*ww,py=y0+R()*hh,q=R();   // tussocks and seed-head wisps
    if(q<.55){g.fillStyle=R()<.6?'rgba(88,104,56,.32)':'rgba(116,126,70,.3)';g.beginPath();g.arc(px,py,.4+R()*1.1,0,TAU);g.fill();}
    else{g.fillStyle=R()<.7?'rgba(226,208,140,.28)':'rgba(240,226,170,.24)';g.beginPath();g.ellipse(px,py,.5+R()*1.2,.2+R()*.35,R()*.6-.3,0,TAU);g.fill();}}
  if(DES)for(let i=0;i<ww*hh/9;i++){const px=x0+R()*ww,py=y0+R()*hh,q=R();   // desert floor: creosote and bursage shrubs, rocks, bare washes
    if(q<.55){g.fillStyle=R()<.5?'rgba(96,104,66,.55)':'rgba(120,124,80,.5)';g.beginPath();g.arc(px,py,.35+R()*.9,0,TAU);g.fill();}
    else if(q<.8){g.fillStyle=R()<.5?'rgba(120,96,76,.5)':'rgba(170,150,128,.55)';g.fillRect(px,py,.25+R()*.35,.2+R()*.3);}
    else{g.fillStyle='rgba(222,200,160,.18)';g.beginPath();g.arc(px,py,1.5+R()*3,0,TAU);g.fill();}}
  if(CUR.surr){surrPrep();const S=CUR.surr,T0=h.T0;g.save();g.translate(-T0[0],-T0[1]);
    const pl=(P)=>{g.beginPath();g.moveTo(P[0][0],P[0][1]);for(let i=1;i<P.length;i++)g.lineTo(P[i][0],P[i][1]);g.closePath();};
    for(const P of S.polys.res||[]){pl(P);g.fillStyle='rgba(112,162,74,.93)';g.fill();}
    for(const P of S.polys.grass||[]){pl(P);g.fillStyle='rgba(108,158,72,.9)';g.fill();}
    for(const P of S.polys.farm||[]){pl(P);g.fillStyle='rgba(180,166,98,.85)';g.fill();}
    for(const P of S.polys.wood||[]){pl(P);g.fillStyle='rgba(78,92,48,.85)';g.fill();}
    for(const P of S.polys.park||[]){pl(P);g.fillStyle='#5f605f';g.fill();g.lineWidth=.9;g.strokeStyle='#b9b4a8';g.stroke();}
    g.strokeStyle='rgba(236,234,224,.8)';g.lineWidth=.14;g.lineCap='butt';
    for(const P of S.polys.park||[]){if(P.length<3||P.length>400)continue;const bb=[1e9,1e9,-1e9,-1e9];for(const q of P){bb[0]=Math.min(bb[0],q[0]-T0[0]);bb[1]=Math.min(bb[1],q[1]-T0[1]);bb[2]=Math.max(bb[2],q[0]-T0[0]);bb[3]=Math.max(bb[3],q[1]-T0[1]);}
      if(bb[2]<x0||bb[0]>x1||bb[3]<y0||bb[1]>y1)continue;g.beginPath();
      lotStalls(P,(x,y,ang)=>{const ca=Math.cos(ang),sa=Math.sin(ang);for(const o of[-1.45,1.45]){const bx=x+o*ca,by=y+o*sa;g.moveTo(bx+2.3*sa,by-2.3*ca);g.lineTo(bx-2.3*sa,by+2.3*ca);}});g.stroke();}
    for(const P of S.polys.water||[]){pl(P);g.fillStyle='#3f7fb4';g.fill();}
    g.lineCap='round';g.lineJoin='round';
    for(const r of S.roads){if(r[0]==='stream'||r[0]==='footway')continue;g.beginPath();g.moveTo(r[2][0],r[2][1]);for(let i=3;i<r.length;i++)g.lineTo(r[i][0],r[i][1]);
      g.strokeStyle=r[0]==='driveway'?'#8e8b84':r[0]==='service'?'#777672':'#666665';g.lineWidth=r[1];g.stroke();}
    g.restore();}
  // rough, painted from the surface map with soft edges into the fescue
  { const L=h.lg,m=document.createElement('canvas'),RC=turfRGB([74,140,60],TU.ro);m.width=L.nx;m.height=L.ny;const mc=m.getContext('2d'),id=mc.createImageData(L.nx,L.ny);
    for(let k=0;k<L.code.length;k++){if(L.code[k]!==0){id.data[k*4]=RC[0];id.data[k*4+1]=RC[1];id.data[k*4+2]=RC[2];id.data[k*4+3]=255;}}
    mc.putImageData(id,0,0);g.save();g.imageSmoothingEnabled=true;g.drawImage(m,x0-.5,y0-.5,L.nx,L.ny);g.restore(); }
  try{paintCover(h,g,rng(11));}catch(e){}   try{paintFlowers(h,g,rng(13));}catch(e){}
  g.lineCap='round';g.lineJoin='round';
  // a paved apron round the clubhouse
  // (a surveyed clubhouse on a lawn gets a mulched planting bed along its walls and a narrow walk instead)
  {const LKg=CLUBLOOK[CUR.id]||(CUR.data&&CLUBLOOK[CUR.data])||{};
  for(const P of h.buildings||[])if(P.club){polyPath(g,P);g.lineJoin='miter';
    if(lidOf(P,h)&&LKg.yard!=='none'&&CUR.scen!=='desert'){g.strokeStyle='#5b4632';g.lineWidth=5.4;g.stroke();g.strokeStyle='#4d3a29';g.lineWidth=4.2;g.stroke();g.strokeStyle='#b4afa4';g.lineWidth=1.6;g.stroke();g.fillStyle='#b4afa4';g.fill();}
    else{g.strokeStyle='#9c978d';g.lineWidth=8.4;g.stroke();g.strokeStyle='#b9b4a9';g.lineWidth=7.6;g.stroke();g.fillStyle='#b9b4a9';g.fill();}g.lineJoin='round';}}
  // cart paths
  g.strokeStyle='#a8a296';g.lineWidth=2.6;strokePl(g,h.paths);g.strokeStyle='#c9c4b8';g.lineWidth=1.9;strokePl(g,h.paths);
  // fairways: first cut, then mown stripes clipped to the real outline
  const FC=turfHex('#5ea247',TU.fw),FS=turfPair('#7cc255','#69ad47',TU.fw,ST[1]);g.strokeStyle=FC;g.lineWidth=5;for(const P of h.fairways){polyPath(g,P);g.stroke();}
  g.save();g.beginPath();for(const P of h.fairways){const p=P.pts;g.moveTo(p[0][0],p[0][1]);for(let i=1;i<p.length;i++)g.lineTo(p[i][0],p[i][1]);g.closePath();}g.clip();
  g.translate(0,0);g.rotate(h.axis);const SW=ST[0],NK=Math.ceil(1320/SW);for(let k=-NK;k<NK;k++){g.fillStyle=(k&1)?FS[0]:FS[1];g.fillRect(-2000,k*SW,4000,SW);}
  if(ST[2]>0){g.globalAlpha=ST[2]*.5;g.rotate(Math.PI/2);for(let k=-NK;k<NK;k++){g.fillStyle=(k&1)?FS[0]:FS[1];g.fillRect(-2000,k*SW,4000,SW);}g.globalAlpha=1;}g.restore();
  // tee boxes
  const TC=turfHex('#80c65a',TU.te);for(const P of h.tees){g.strokeStyle=FC;g.lineWidth=1.2;polyPath(g,P);g.stroke();g.fillStyle=TC;g.fill();}
  // water
  for(const w of h.water){
    g.lineWidth=4;g.strokeStyle='#3a7a36';polyPath(g,w);g.stroke();
    const gr=g.createRadialGradient(w.x,w.y,1,w.x,w.y,Math.max(w.bb[2]-w.bb[0],w.bb[3]-w.bb[1])/2);
    gr.addColorStop(0,'#62c6ee');gr.addColorStop(1,'#2476ad');g.fillStyle=gr;polyPath(g,w);g.fill();
    g.lineWidth=1.2;g.strokeStyle='#1d628f';g.stroke();
    g.save();polyPath(g,w);g.clip();g.strokeStyle='rgba(255,255,255,.3)';g.lineWidth=.6;
    for(let i=0;i<w.area/90;i++){const px=w.bb[0]+R()*(w.bb[2]-w.bb[0]),py=w.bb[1]+R()*(w.bb[3]-w.bb[1]);g.beginPath();g.moveTo(px-2.5,py);g.quadraticCurveTo(px,py-1,px+2.5,py);g.stroke();}
    g.restore();
  }
  // greens with a collar
  const GC=turfHex('#98d86f',TU.gr),GS=turfPair('#98d86f','#8ecd66',TU.gr,ST[3])[1],CC=turfHex('#62a948',[(TU.gr[0]+TU.fw[0])/2,(TU.gr[1]+TU.fw[1])/2,(TU.gr[2]+TU.fw[2])/2]);
  for(const P of h.greens){g.lineWidth=7;g.strokeStyle=CC;polyPath(g,P);g.stroke();
    g.save();polyPath(g,P);g.clip();g.fillStyle=GC;g.fill();g.translate(P.x,P.y);g.rotate(h.axis+.6);
    for(let k=-16;k<16;k++){if(k&1){g.fillStyle=GS;g.fillRect(-80,k*4,160,4);}}g.restore();}
  // white-sand bunkers
  for(const b of h.bunkers){
    g.lineWidth=2;g.strokeStyle=turfHex(TU.sand,[0,1.1,.82]);polyPath(g,b);g.stroke();
    g.fillStyle=TU.sand;g.fill();
    g.save();polyPath(g,b);g.clip();g.strokeStyle='rgba(170,150,110,.35)';g.lineWidth=1.4;polyPath(g,b);g.stroke();
    g.restore();
  }
  for(const P of h.tees)if(P.syn){g.strokeStyle=FC;g.lineWidth=1.2;polyPath(g,P);g.stroke();g.fillStyle=TC;g.fill();}
  g.strokeStyle='rgba(255,255,255,.85)';g.lineWidth=.7;g.setLineDash([3,3]);g.strokeRect(x0+.6,y0+.6,ww-1.2,hh-1.2);g.setLineDash([]);
  return c;
}

