/* ---------- bunkers: sand and faces ---------- */
/* Nov 2026 (Pappa's note #23 and the bunker plan): every mapped bunker carries what its aerial photo and the lidar ground
   measured (pipeline/courses/bunkers/bunker_all.py, inserted by insB.py): the colour of its sand, and how high the rim stands
   above the floor at 24 points round its edge. BUNK[course] = one array per bunker:
   [cx, cy, area, r, g, b, floor cm, steepest edge deg, face dir x, face dir y, lip0 .. lip23 cm] (course frame; lips start at the
   outline's most northerly point and run in outline order). r < 0 = the photo didn't show sand there (grass, shade): no colour. */
/*@data BUNK*/
/* the sand on each course, for how it looks and plays (bkSandSet): white is the game's sand before Nov 2026, unchanged.
   mu: rolling friction in it, hop: bounce, rel: how much a shot out of it releases, bury: chance of a plugged lie on a steep landing,
   col: the colour where a course's photo can't say */
const SAND_TYPES={
  white:{nm:'White sand',mu:28,hop:.02,rel:1,bury:0,col:null},
  soft:{nm:'Soft, fluffy sand',mu:34,hop:0,rel:.8,bury:.14,col:null},
  native:{nm:'Native sand',mu:21,hop:.05,rel:1.2,bury:.03,col:'#d9c9a0'},
  shell:{nm:'Crushed shell',mu:19,hop:.07,rel:1.3,bury:.01,col:'#ece6d6'},
  desert:{nm:'Desert sand',mu:22,hop:.05,rel:1.15,bury:.03,col:'#cdb58a'}};
const SAND_T={};
/* built bunker faces (Phase 2 trial): a course listed here gets a steep face on the high side of every bunker the lidar measured.
   s: the style (sod: stacked turf, near vertical; flash: sand thrown up the face; grass: turf to a sand floor), k: share of the
   measured rise (above the bunker's own low side) that becomes face, max: tallest face (yd) */
const BK_FACE={tiburon:{s:'sod',k:.9,max:1.3}};
const BK_STYLE={sod:{lean:.12,col:'#5b7a3a'},flash:{lean:.55,col:null},grass:{lean:.75,col:'#5f9a45'}};
const bkSand=()=>SAND_TYPES[SAND_T[CUR&&(CUR.data||CUR.id)]||SAND_T[CUR&&CUR.id]]||SAND_TYPES.white;
const MU_SAND0=28,HOP_SAND0=.02;
function bkSandSet(){const S=bkSand();MU.sand=S.mu;HOP_E.sand=S.hop;}
/* match the hole's bunkers to the measured ones (same outline: centroid within 3 yd, area within 40%), give each its colour,
   lips per outline point, and, on a faced course, the face height per point */
function bkAttach(h){const D=BUNK[CUR.data||CUR.id]||BUNK[CUR.id],F=BK_FACE[CUR.data||CUR.id]||BK_FACE[CUR.id];h.bkF=null;
  if(!D||!h.bunkers.length)return;const faced=[];
  for(const b of h.bunkers){const cx=b.x+h.T0[0],cy=b.y+h.T0[1];let best=null,bd=3;
    for(const r of D){const d=Math.hypot(r[0]-cx,r[1]-cy);if(d<bd&&r[2]>b.area*.6&&r[2]<b.area*1.67){bd=d;best=r;}}
    if(!best)continue;b.meas=best;
    if(best[3]>=0)b.rgb=[best[3],best[4],best[5]];
    // lips onto the outline's own points, by distance along it from its most northerly point
    const P=b.pts,n=P.length;let i0=0;for(let i=1;i<n;i++)if(P[i][1]<P[i0][1])i0=i;
    const L=[0];let tot=0;for(let k=0;k<n;k++){const a=P[(i0+k)%n],c=P[(i0+k+1)%n];tot+=Math.hypot(c[0]-a[0],c[1]-a[1]);L.push(tot);}
    const lip=new Array(n);for(let k=0;k<n;k++){const f=L[k]/tot*24,j=Math.floor(f)%24,t=f-Math.floor(f);lip[(i0+k)%n]=(best[10+j]*(1-t)+best[10+(j+1)%24]*t)/91.44;}
    b.lip=lip;
    if(F&&b.area<2500){const s=lip.slice().sort((p,q)=>p-q),lo=s[Math.floor(n*.25)];
      let fh=lip.map(v=>clamp((v-lo)*F.k,0,F.max));fh=fh.map((v,i)=>(fh[(i+n-1)%n]+2*v+fh[(i+1)%n])/4);   // a touch of smoothing along the edge
      fh=fh.map(v=>v<.22?0:v);
      if(fh.some(v=>v>0)){b.fh=fh;b.fs=F.s;faced.push(b);}}}
  if(!faced.length)return;
  // outward normals per point (the outline's turning direction decides which side is out)
  for(const b of faced){const P=b.pts,n=P.length;let a=0;for(let i=0;i<n;i++){const p=P[i],q=P[(i+1)%n];a+=p[0]*q[1]-q[0]*p[1];}const sg=a>0?1:-1;
    b.nrm=P.map((p,i)=>{const A=P[(i+n-1)%n],B=P[(i+1)%n];let tx=B[0]-A[0],ty=B[1]-A[1];const l=Math.hypot(tx,ty)||1;return[ty/l*sg,-tx/l*sg];});
    {const p=P[0],q=b.nrm[0];if(inPoly(b,p[0]+q[0]*.6,p[1]+q[1]*.6))b.nrm=b.nrm.map(v=>[-v[0],-v[1]]);}
    let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(const p of P){x0=Math.min(x0,p[0]);y0=Math.min(y0,p[1]);x1=Math.max(x1,p[0]);y1=Math.max(y1,p[1]);}b.fbb=[x0-5,y0-5,x1+5,y1+5];}
  h.bkF=faced;}
// rim height per outline point: the ground 0.8 yd outside it, before any face is dug (called by buildHeights, before the grid)
function bkRims(h){if(!h.bkF)return;h._nf=1;for(const b of h.bkF)b.rim=b.pts.map((p,i)=>rawH(h,p[0]+b.nrm[i][0]*.8,p[1]+b.nrm[i][1]*.8));h._nf=0;}
// the nearest point of a faced bunker's edge: distance (negative inside), and the face height and rim height there
function bkNear(b,x,y){const P=b.pts,n=P.length;let m=1e9,mi=0,mt=0;
  for(let i=0;i<n;i++){const a=P[i],c=P[(i+1)%n],dx=c[0]-a[0],dy=c[1]-a[1],l=dx*dx+dy*dy;let t=l?((x-a[0])*dx+(y-a[1])*dy)/l:0;t=t<0?0:t>1?1:t;const ex=a[0]+dx*t-x,ey=a[1]+dy*t-y,d=ex*ex+ey*ey;if(d<m){m=d;mi=i;mt=t;}}
  const j=(mi+1)%n,d=Math.sqrt(m);return{d:inPoly(b,x,y)?-d:d,fh:b.fh[mi]*(1-mt)+b.fh[j]*mt,rim:b.rim?b.rim[mi]*(1-mt)+b.rim[j]*mt:0,i:mi,t:mt};}
// the floor dug down at the foot of a face (rawH): full depth for the first stretch in, easing back to the bunker's own floor
function bkDig(h,x,y,H){if(h._nf)return H;for(const b of h.bkF){const B=b.fbb;if(x<B[0]||x>B[2]||y<B[1]||y>B[3])continue;const q=bkNear(b,x,y);if(q.d>=0||q.fh<=0)continue;
    const s=-q.d,wd=1+1.6*q.fh;if(s>=wd)continue;const tg=q.rim-q.fh,k=smooth(wd*.5,wd,s);H=Math.min(H,tg+(Math.max(H,tg)-tg)*k);}
  return H;}
// the ground the ball and the golfer stand on beside a face: the rim right up to the edge (the 2-yd grid would sag into the bunker)
function bkHFix(h,x,y,v){for(const b of h.bkF){const B=b.fbb;if(x<B[0]||x>B[2]||y<B[1]||y>B[3])continue;const q=bkNear(b,x,y);if(q.fh<=.05)continue;
    if(q.d>=0&&q.d<2.5)return v+(q.rim-v)*(1-smooth(1.5,2.5,q.d))*Math.min(1,q.fh/.3);
    if(q.d<0&&-q.d<.6)return Math.min(v,q.rim-q.fh);}
  return v;}
/* a ball moving from (x0,y0) to (x1,y1) at height Y (ball bottom): does it run into a face from inside the bunker, below the rim?
   Returns the edge point, its outward normal and how far below the top it struck (yd), or null */
function bkFaceHit(x0,y0,x1,y1,Y){const h=G.hole;if(!h||!h.bkF)return null;
  for(const b of h.bkF){const B=b.fbb;if(Math.max(x0,x1)<B[0]||Math.min(x0,x1)>B[2]||Math.max(y0,y1)<B[1]||Math.min(y0,y1)>B[3])continue;
    const P=b.pts,n=P.length;
    for(let i=0;i<n;i++){const j=(i+1)%n;if(b.fh[i]<=0&&b.fh[j]<=0)continue;const a=P[i],c=P[j];
      const ex=c[0]-a[0],ey=c[1]-a[1],mx=x1-x0,my=y1-y0,den=mx*ey-my*ex;if(Math.abs(den)<1e-9)continue;
      const t=((a[0]-x0)*ey-(a[1]-y0)*ex)/den,u=((a[0]-x0)*my-(a[1]-y0)*mx)/den;if(t<0||t>1||u<0||u>1)continue;
      const nx=b.nrm[i][0]*(1-u)+b.nrm[j][0]*u,ny=b.nrm[i][1]*(1-u)+b.nrm[j][1]*u;if(mx*nx+my*ny<=0)continue;   // only on the way out
      const top=b.rim[i]*(1-u)+b.rim[j]*u,fh=b.fh[i]*(1-u)+b.fh[j]*u;if(fh<=.05||Y>=top-.02)continue;
      const l=Math.hypot(nx,ny)||1;return{x:x0+mx*t,y:y0+my*t,nx:nx/l,ny:ny/l,below:top-Y,fh,top};}}
  return null;}
/* the sand's colour on the ground: the course's sand (its own photo colour, or the sand type's), varied bunker to bunker by how
   each one's photo colour differs from the course's typical bunker (wet, shaded, older sand), at most 12% either way */
const BK_MED={};
function bkMed(){const k=CUR.data||CUR.id;if(k in BK_MED)return BK_MED[k];const D=BUNK[k]||BUNK[CUR.id];let m=null;
  if(D){const R=D.filter(r=>r[3]>=0);if(R.length>=3){m=[3,4,5].map(c=>{const v=R.map(r=>r[c]).sort((p,q)=>p-q);return v[v.length>>1];});}}return BK_MED[k]=m;}
function bkCol(b,base){const S=bkSand(),c0=hexRgb(S.col||base),m=bkMed();let f=[1,1,1];
  if(b.rgb&&m)f=[0,1,2].map(i=>clamp(Math.sqrt((b.rgb[i]+8)/(m[i]+8)),.88,1.12));
  return '#'+c0.map((v,i)=>Math.round(clamp(v*f[i],0,255)).toString(16).padStart(2,'0')).join('');}
function hexRgb(h){h=String(h).replace('#','');if(h.length===3)h=h.split('').map(c=>c+c).join('');const n=parseInt(h,16);return[(n>>16)&255,(n>>8)&255,n&255];}
/* the drawn faces: a wall down the high side of each faced bunker, and a strip of turf over its top (the ground mesh is a 2-yd
   grid: under the strip it is let down to the bunker floor, so the floor runs flat to the foot of the wall). The wall's look
   comes from the course's style. */
function bkMeshH(h,x,y,v){for(const b of h.bkF){const B=b.fbb;if(x<B[0]||x>B[2]||y<B[1]||y>B[3])continue;const q=bkNear(b,x,y);if(q.fh<=.05)continue;
    if(q.d>=-.2&&q.d<2.2)return Math.min(v,q.rim-q.fh);}
  return v;}
function bkWallCanvas(s){const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),R=rng(4242);
  if(s==='sod'){   // stacked turf: layers of grass-topped sod, dark soil seams, blocks staggered
    g.fillStyle='#3d3222';g.fillRect(0,0,256,256);const L=6,hh=256/L;
    for(let k=0;k<L;k++){let x=-R()*60;while(x<256){const w=50+R()*50,y=k*hh;const gr=g.createLinearGradient(0,y,0,y+hh);
        gr.addColorStop(0,'#5f7d3c');gr.addColorStop(.35,'#4e6a32');gr.addColorStop(.75,'#5a4a30');gr.addColorStop(1,'#43372a');g.fillStyle=gr;g.fillRect(x+1.5,y+2,w-3,hh-4);
        g.strokeStyle='rgba(120,150,80,.55)';g.lineWidth=1;for(let i=0;i<w/2;i++){const px=x+R()*w,py=y+2+R()*5;g.beginPath();g.moveTo(px,py);g.lineTo(px+(R()-.5)*3,py-3-R()*4);g.stroke();}
        x+=w;}}}
  else if(s==='grass'){g.fillStyle='#4f7f38';g.fillRect(0,0,256,256);for(let i=0;i<2500;i++){g.fillStyle=R()<.5?'rgba(95,140,65,.6)':'rgba(55,90,40,.6)';g.fillRect(R()*256,R()*256,1.5,3+R()*4);}}
  else{g.fillStyle='#e9e0c8';g.fillRect(0,0,256,256);for(let i=0;i<1800;i++){g.fillStyle=R()<.5?'rgba(255,250,235,.5)':'rgba(170,150,115,.35)';g.fillRect(R()*256,R()*256,1+R()*2,1+R()*2);}}
  return c;}
function r3BunkerFaces(h){const T=THREE;for(const m of R3.bkM||[])r3Dispose(m);R3.bkM=[];if(!h.bkF||!R3.on)return;
  R3.bkMat=R3.bkMat||{};const acc={},C={p:[],i:[]},g=h.hg,nat=(x,y)=>{const fx=clamp((x-g.x0)/g.st,0,g.nx-1.001),fy=clamp((y-g.y0)/g.st,0,g.ny-1.001),i=fx|0,j=fy|0,tx=fx-i,ty=fy-j,d=g.data,n=g.nx;return(d[j*n+i]*(1-tx)+d[j*n+i+1]*tx)*(1-ty)+(d[(j+1)*n+i]*(1-tx)+d[(j+1)*n+i+1]*tx)*ty;};
  for(const b of h.bkF){const P=b.pts,n=P.length,st=BK_STYLE[b.fs]||BK_STYLE.sod;
    if(!R3.bkMat[b.fs]){const tx=r3CanvasTex(bkWallCanvas(b.fs),{srgb:true,repeat:true});R3.bkMat[b.fs]=r3Patch(new T.MeshStandardMaterial({map:tx,roughness:.95,metalness:0,side:T.DoubleSide}),{});}
    // runs of points with a face (plus one plain point at each end, so the wall tapers out)
    const on=b.fh.map(v=>v>0);if(!on.some(x=>x))continue;let s0=on.findIndex((v,i)=>v&&!on[(i+n-1)%n]);if(s0<0)s0=0;
    const runs=[];let cur=null;for(let k=0;k<=n;k++){const i=(s0+k)%n;if(on[i]){if(!cur){cur=[(i+n-1)%n];runs.push(cur);}cur.push(i);}else if(cur){cur.push(i);cur=null;}}
    const W=acc[b.fs]||(acc[b.fs]={p:[],u:[],i:[]});
    for(const R of runs){const m=R.length,w0=W.p.length/3,c0=C.p.length/3;let len=0;
      for(let k=0;k<m;k++){const i=R[k],p=P[i],q=b.nrm[i],fh=b.fh[i],top=b.rim[i]+.01;if(k)len+=Math.hypot(p[0]-P[R[k-1]][0],p[1]-P[R[k-1]][1]);
        const bx=p[0]-q[0]*st.lean*fh,by=p[1]-q[1]*st.lean*fh;
        W.p.push(p[0],top,p[1],bx,top-fh-.35,by);W.u.push(len/1.4,0,len/1.4,(fh+.35)/.65);
        const ox=p[0]+q[0]*4.2,oy=p[1]+q[1]*4.2;C.p.push(p[0],top,p[1],ox,nat(ox,oy)+.01,oy);}
      // the strip over the top must face up whichever way the outline runs
      const a0=C.p.slice(c0*3,c0*3+9),e1=[a0[3]-a0[0],a0[5]-a0[2]],e2=[a0[6]-a0[0],a0[8]-a0[2]],up=e1[1]*e2[0]-e1[0]*e2[1]>0;
      for(let k=0;k<m-1;k++){const a=k*2;W.i.push(w0+a,w0+a+1,w0+a+2,w0+a+2,w0+a+1,w0+a+3);
        if(up)C.i.push(c0+a,c0+a+1,c0+a+2,c0+a+2,c0+a+1,c0+a+3);else C.i.push(c0+a,c0+a+2,c0+a+1,c0+a+2,c0+a+3,c0+a+1);}}}
  // one mesh per wall style and one for the turf strips: a handful of draw calls per hole, however many bunkers
  for(const fs in acc){const W=acc[fs];if(!W.i.length)continue;const wg=new T.BufferGeometry();wg.setAttribute('position',new T.Float32BufferAttribute(W.p,3));wg.setAttribute('uv',new T.Float32BufferAttribute(W.u,2));wg.setIndex(W.i);wg.computeVertexNormals();R3.bkM.push(r3Add(wg,R3.bkMat[fs],{recv:true}));}
  if(C.i.length){const cg=new T.BufferGeometry();cg.setAttribute('position',new T.Float32BufferAttribute(C.p,3));cg.setIndex(C.i);cg.computeVertexNormals();R3.bkM.push(r3Add(cg,R3.mat.ground,{recv:true}));}}
/* a rival in a bunker: if the shot at the pin would run into the face, play out sideways at the smallest angle that clears it
   (or, failing that, out the back), as a real player would */
function bkClears(a){const c=curClub(),P=shortPlan(),c2=P.carry,ap=shotApex(c,c2)*shotMods().apex,y0=hAt(G.ball.x,G.ball.y)+.03,[dx,dz]=dirOf(a);let lx=G.ball.x,lz=G.ball.y;
  for(let i=1;i<=24;i++){const u=i/24,qx=G.ball.x+dx*c2*u,qz=G.ball.y+dz*c2*u,Y=y0+ap*arcH(u);if(bkFaceHit(lx,lz,qx,qz,Y-.03))return false;lx=qx;lz=qz;if(u>.4)break;}return true;}
function bkAiAim(a){if(bkClears(a))return a;for(let k=1;k<=9;k++)for(const sg of[1,-1]){const b=a+sg*k*.17;if(bkClears(b))return b;}return a+Math.PI;}
