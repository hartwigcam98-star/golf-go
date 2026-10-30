/* ---------- built things: clubhouse, other buildings, bridges, parked cars, flags ---------- */
function polyArea(p){let a=0;for(let i=0;i<p.length;i++){const q=p[i],r=p[(i+1)%p.length];a+=q[0]*r[1]-r[0]*q[1];}return a/2;}
// move every corner inward (d>0) or outward (d<0) along its bisector
function insetPoly(p,d){const s=Math.sign(polyArea(p))||1,n=p.length,out=[];
  for(let i=0;i<n;i++){const a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n];
    let e1=[b[0]-a[0],b[1]-a[1]],e2=[c[0]-b[0],c[1]-b[1]];const l1=hyp(e1[0],e1[1])||1,l2=hyp(e2[0],e2[1])||1;e1=[e1[0]/l1,e1[1]/l1];e2=[e2[0]/l2,e2[1]/l2];
    const n1=[-e1[1]*s,e1[0]*s],n2=[-e2[1]*s,e2[0]*s];let bx=n1[0]+n2[0],by=n1[1]+n2[1];const bl=hyp(bx,by);
    if(bl<1e-3){bx=n1[0];by=n1[1];}else{bx/=bl;by/=bl;}const k=d/Math.max(.4,bx*n1[0]+by*n1[1]);out.push([b[0]+bx*k,b[1]+by*k]);}
  return out;}
function boxO(out,cx,cy,cz,hx,hy,hz,rot,col,bottom){const c=Math.cos(rot),sn=Math.sin(rot),P=(x,y,z)=>[cx+x*c-z*sn,cy+y,cz+x*sn+z*c],R=(x,z)=>[x*c-z*sn,0,x*sn+z*c];
  const f=(a,b,cc,d,n,k)=>{const cl=mul(col,k);pushTri(out,a,b,cc,cl,n,n,n);pushTri(out,a,cc,d,cl,n,n,n);};
  f(P(-hx,hy,-hz),P(-hx,hy,hz),P(hx,hy,hz),P(hx,hy,-hz),[0,1,0],1);
  f(P(-hx,-hy,hz),P(hx,-hy,hz),P(hx,hy,hz),P(-hx,hy,hz),R(0,1),.9);f(P(hx,-hy,-hz),P(-hx,-hy,-hz),P(-hx,hy,-hz),P(hx,hy,-hz),R(0,-1),.86);
  f(P(hx,-hy,hz),P(hx,-hy,-hz),P(hx,hy,-hz),P(hx,hy,hz),R(1,0),.95);f(P(-hx,-hy,-hz),P(-hx,-hy,hz),P(-hx,hy,hz),P(-hx,hy,-hz),R(-1,0),.8);}
/* each course's real clubhouse, from photos: w wall, m material (siding|board|log|stone|stucco|tudor|brick), t trim, s stone, b stone base (yd),
   lo/lc a brick or stone ground storey (height, colour), r roof colour, v porch (wrap|front|none), c columns, po full-height portico, cu cupola, sh shutters,
   ch chimney colour, fl flat (pueblo) roof, tc tudor timber */
const CLUBLOOK={
  rushcreek:{"w":"#d8ccb4","m":"tudor","tc":"#4a3a2e","t":"#5a4a3c","r":"#6e675f","s":"#9a8f80","b":1.0,"ch":"#8f8577","c":"#5a4a3c","pt":"stone","um":"#d8c9a8,#d8c9a8,#d8c9a8","fp":1,"rw":1},
  sentryworld:{"w":"#6b4a34","m":"board","t":"#4a3324","r":"#7a3b2a","s":"#9c9384","b":1.4,"c":"#5a3d28","pt":"stone","fp":1,"um":""},
  lawsonia:{"w":"#b08660","m":"brick","t":"#5b4532","r":"#7a3d2c","s":"#8f7f6c","c":"#5b4532","aw":"#2f5a3a","pt":"deck","um":"","rw":1},
  kingsnorth:{"w":"#efede6","m":"stucco","t":"#efede6","r":"#9a7b5e","s":"#cfc6b4","c":"#efede6","pt":"paver","um":""},
  dacotah:{"w":"#e4d9c3","m":"stucco","t":"#5a4a3c","r":"#2e6f62","s":"#a39380","b":1.4,"c":"#e4d9c3","pt":"deck","um":"","rw":1},
  jacks:{"w":"#7a5238","m":"siding","t":"#5b3b2a","r":"#7b4636","s":"#8a7f72","ch":"#7d7266","c":"#5b3b2a","pt":"deck","um":"#c8342c,#c8342c,#c8342c","rw":1},
  farmlinks:{"w":"#45433f","m":"siding","t":"#dcdad0","s":"#ad9b78","b":0.4,"r":"#c2c4c2","v":"front","c":"#dcdad0","ch":"#a39580","dm":3,"pt":"stone","rw":1,"um":"#8e3b3a","fp":1,"rs":4.6},
  royal:{"w":"#eeede7","m":"stucco","t":"#efede6","s":"#b9b4a8","b":0.4,"r":"#2f5a46","eh":7,"rs":4.5,"v":"none","c":"#efede6","cu":1,"cus":1.5,"ch":"#eeede7","pt":"stone","um":"#f4f2ec","ph":2.6,"rw":1,"stp":1,"ar":"glass"},
  troy:{"pt":"paver","um":"#1f2c4a,#b0282e","w":"#c9c6bb","m":"siding","t":"#efede6","s":"#a99e8c","r":"#5c5d5a","v":"front","c":"#efede6","po":1,"dm":3,"eh":4.2,"rs":4},
  stoneridge:{"wb":1,"pt":"brick","um":"#5a3d2e","w":"#d9d0b8","m":"stucco","t":"#3f3a35","s":"#7a5646","b":1.0,"r":"#4c5052","v":"front","rw":1,"c":"#d9d0b8","rs":3,"xg":1,"xgw":"win","xgt":0,"fp":1},
  caledonia:{"ar":"dark","pt":"brick","um":"","w":"#efede6","m":"siding","t":"#f6f5f0","lo":2.3,"lc":"#7f7260","r":"#6e6555","v":"wrap","c":"#f6f5f0","ch":"#cfc8ba","stp":1,"rs":4.5,"xg":1,"xgw":"win","xgt":0,"xgc":1,"fh":2.3,"bd":{"h":1,"fl":"#d42a2a"},"eb":[-1.8,-20.23,3.7,-20.23,4.9,1.2,0.43]},
  trueblue:{"dm":3,"w":"#eceeeb","m":"siding","t":"#f6f5f0","r":"#4a7cc0","v":"wrap","c":"#f6f5f0","ch":"#eceeeb","gb":1,"eh":4.2,"rs":5.8,"fh":0.6},
  sandvalley:{"w":"#c8b697","m":"board","t":"#3f3e3b","s":"#8a8378","b":0.4,"r":"#4a4d51","v":"front","c":"#8c7a62","xg":2,"xgw":"win","xgt":0,"bal":1,"ch":"#b59a6e","eh":7,"rs":5,"rp":0.5,"pt":"paver","fp":1,"um":"","yard":"none"},
  mammoth:{"w":"#c8b697","m":"board","t":"#3f3e3b","s":"#8a8378","b":0.4,"r":"#4a4d51","v":"front","c":"#8c7a62","xg":2,"xgw":"win","xgt":0,"bal":1,"ch":"#b59a6e","eh":7,"rs":5,"rp":0.5,"pt":"paver","fp":1,"um":"","yard":"none"},
  wilderness:{"pt":"brick","um":"#1f1f1f","w":"#c8b98c","m":"board","t":"#7a3626","s":"#b2a48f","b":0.5,"r":"#3d5a4f","v":"wrap","c":"#b2a48f","ch":"#7a6656","dm":1,"rw":1,"ph":1},
  quarry:{"pt":"stone","um":"#b8322b","rw":1,"w":"#cdc6b6","m":"siding","t":"#3a332c","s":"#8d8880","b":1.2,"r":"#3a4641","v":"none","c":"#cdc6b6","pc":1,"pcc":"#8d8880"},
  legend:{"pt":"deck","um":"#3d3a36","rw":1,"w":"#735740","m":"siding","t":"#c4a46e","s":"#9a948a","b":0.6,"r":"#3e4a43","v":"none","c":"#c4a46e","ch":"#9a948a","gb":1,"dm":4,"pc":1,"pcc":"#b08a5a"},
  heritage:{"pt":"brick","um":"","w":"#efede6","m":"siding","t":"#f6f5f0","r":"#3c3f42","v":"none","c":"#f6f5f0","po":1,"sh":"#2c3133","ch":"#efede6","eh":6.8,"fh":0.7,"bd":{"h":1}},
  pawplant:{"dm":4,"w":"#efede6","m":"siding","t":"#f6f5f0","lo":0.8,"lc":"#8d6c62","r":"#d0d3d1","v":"front","c":"#f6f5f0","cu":1,"sh":"#2f3436","ch":"#efe9db","eh":3.8,"rs":4.6,"ga":1,"xg":1,"xgw":"win","xgt":0,"fh":0.8,"bd":{"h":1}},
  deacon:{"pt":"stone","um":"#2e5848","fp":1,"w":"#3d362f","m":"log","t":"#2b2722","s":"#9c8462","b":1,"r":"#3a6866","v":"front","c":"#9c8462","dm":2,"eg":4.5,"ch":"#a8a092","eh":4.2,"rs":5},
  lehman:{"w":"#d9cfbb","m":"stucco","t":"#5a4433","s":"#8f8a82","b":1.2,"r":"#6e5a4c","gb":1,"eh":4.5,"rs":5,"tw":5,"twc":"#d9cfbb","clk":1,"xg":1,"ch":"#8f8a82","pc":1,"pcc":"#5a4433","v":"front","c":"#5a4433","pt":"stone","um":"#e8e2d2","rw":1,"ph":0.8},
  maddens:{"pt":"stone","um":"#2f6b5c","w":"#7a5a3e","m":"siding","t":"#4a3626","s":"#9c968c","b":0.6,"r":"#3f5550","v":"wrap","c":"#7d5d3c","ch":"#a9a6a0","dm":2,"xg":1},
  pines:{"pt":"reddeck","um":"#b3302b","rw":1,"w":"#4d4640","m":"siding","t":"#e2dccd","s":"#9a8f80","b":0.9,"r":"#6e625a","v":"front","c":"#7d756b","ga":1,"xg":1,"xgw":"win","xgt":0,"dm":1},
  preserve:{"pt":"reddeck","um":"#b3302b","rw":1,"w":"#7a5638","m":"log","t":"#3a2c22","s":"#948a7c","b":0.6,"r":"#4e6b4d","v":"front","c":"#e6e3dc","dm":1,"ch":"#d6d2ca","ph":1.5,"ga":1},
  orangeburg:{"pc":1,"pcc":"#cfc0a0","pt":"brick","um":"","ir":1,"w":"#ddcba5","m":"stucco","t":"#efe8d6","s":"#a8916e","b":0.6,"r":"#57544f","v":"none","c":"#cfc0a0","xg":2,"xgw":"win","xgt":0,"eh":4,"rs":3.6,"rp":0.3,"cu":1},
  santee:{"pt":"brick","um":"","w":"#ecebe3","m":"siding","t":"#f6f5f0","r":"#8a9c6e","v":"front","c":"#f6f5f0","cu":1,"sh":"#2f3b3f","ch":"#a39b85","ga":1},
  wyboo:{"pt":"paver","um":"","w":"#a59d94","m":"board","t":"#f4f2ec","s":"#8a4c3a","b":0.9,"r":"#6e6a68","v":"front","c":"#f4f2ec","ga":1,"cu":1},
  valley:{"w":"#e2d7c4","m":"siding","t":"#f4f2ec","lo":3.2,"lc":"#a46a52","ar":"dark","r":"#857a6a","v":"wrap","c":"#f4f2ec","cu":1,"ch":"#a46a52","xg":1,"xgw":"win","xgt":0,"eg":5,"pt":"paver","um":"","fp":1,"stp":1,"eh":7,"fh":3.2},
  gnlake:{"ar":"dark","pt":"brick","um":"","w":"#a4a7a3","m":"siding","t":"#f4f2ec","lo":4.1,"lc":"#8a5444","r":"#8a8478","v":"wrap","c":"#f4f2ec","cu":1,"ch":"#8a5444","eh":6.8,"xg":1,"xgw":"win","xgt":0,"stp":1,"fh":4.1,"bd":{"h":1,"fl":"#7d2f45"}},
  lookout:{"pt":"stone","um":"#8b5a42","w":"#c9aa83","m":"stucco","t":"#6b4f3a","s":"#9a8468","b":1,"r":"#8b5a42","v":"none","fl":1,"yard":"none"},
  wigwam:{"aw":"#c9b088","pt":"stone","um":"#b3302b","w":"#efede6","m":"stucco","t":"#7a5a3e","b":0.3,"v":"none","fl":1,"eh":4,"yard":"none"},
  dove:{"pt":"paver","um":"#6b4a33","w":"#c9b49a","m":"stucco","t":"#6b5440","b":0.3,"v":"none","fl":1,"yard":"none"},
  interlachen:{"w":"#e8e0cc","m":"tudor","t":"#3e2e24","tc":"#3e2e24","s":"#94604a","b":0.6,"lo":2.8,"lc":"#94604a","ar":"dark","r":"#7a6350","gb":1,"ga":1,"eh":7.5,"rs":6,"rp":0.55,"xg":3,"xgc":1,"ch":"#e8e0cc","v":"none","pt":"stone","um":"#e9e4d6","rw":1,"ph":1.2,"stp":1},
  windsong:{"gb":1,"pt":"stone","um":"","rw":1,"fp":1,"w":"#7a4632","m":"board","t":"#3a2a20","lo":1.2,"lc":"#8b4636","r":"#6b635b","v":"front","c":"#4a3326","ch":"#d9d6cf","yard":"none"},
  hazeltine:{"wg":{"w":"#5f6366","m":"board"},"tw":6,"twc":"#d2ccbd","clk":1,"pc":1,"pcc":"#8a6a48","pt":"stone","um":"#3d3f40","fp":1,"w":"#d2ccbd","m":"stone","t":"#6e2f2a","s":"#c4bba7","b":0.6,"r":"#5e6163","v":"front","c":"#b07a45","ch":"#d2ccbd","gb":1,"eh":7,"rs":5},
  slmh:{"pt":"brick","um":"#2f4f3a","w":"#ece4d4","m":"siding","t":"#fbfaf6","lo":1,"lc":"#9a8f80","r":"#6a5d52","v":"wrap","c":"#fbfaf6","cu":1,"cus":1.4,"ch":"#8e5a44","xg":1,"xgw":"win","xgt":0},
  legends:{"tw":5,"twc":"#efeae0","clk":1,"bal":1,"pt":"stone","um":"#2f6fae","fp":1,"rw":1,"w":"#ddd0b4","m":"siding","t":"#efeae0","lo":3,"lc":"#c4a77c","r":"#6e665f","v":"front","c":"#c4a77c","cu":1,"eh":7,"rs":4.5,"xg":1,"xgt":0},
  chaska:{"pt":"paver","um":"#5b2b2f","w":"#787a7c","m":"siding","t":"#dedcd5","s":"#8f8c86","b":0.5,"r":"#6e6a66","v":"wrap","c":"#5f6062","rs":7,"rp":0.55,"dm":1},
  prestwick:{"gb":1,"ga":1,"eh":6,"rs":5.5,"rp":0.55,"xg":3,"xgc":1,"cbn":1,"pc":1,"pcc":"#4e3a2c","ph":1.5,"stp":1,"ir":1,"pt":"stone","um":"#2f5f9e,#b3302b,#c8708e","rw":1,"w":"#ebe3cf","m":"tudor","t":"#4e3a2c","tc":"#4e3a2c","s":"#c4bfb0","b":1.6,"r":"#6b5444","v":"none","ch":"#c4bfb0"},
  legislator:{"w":"#ebe5d8","m":"siding","t":"#f6f4ee","s":"#b8b0a2","r":"#77726a","rs":5,"v":"wrap","c":"#f6f4ee","cu":1,"cus":1.4,"ch":"#d6cfc2","eh":6.5,"ga":1,"xg":1,"xgw":"win","xgt":0,"pt":"brick","um":"#7a2f2a","stp":1,"fh":1.4,"lo":1.4,"lc":"#8e4a3a","ar":"dark","bd":{"h":1,"fl":"#7a2e4e"}},
  judge:{"w":"#ebe5d8","m":"siding","t":"#f6f4ee","s":"#b8b0a2","r":"#77726a","rs":5,"v":"wrap","c":"#f6f4ee","cu":1,"cus":1.4,"ch":"#d6cfc2","eh":6.5,"ga":1,"xg":1,"xgw":"win","xgt":0,"pt":"brick","um":"#7a2f2a","stp":1,"fh":1.4,"lo":1.4,"lc":"#8e4a3a","ar":"dark","bd":{"h":1,"fl":"#7a2e4e"}},
  senator:{"w":"#ebe5d8","m":"siding","t":"#f6f4ee","s":"#b8b0a2","r":"#77726a","rs":5,"v":"wrap","c":"#f6f4ee","cu":1,"cus":1.4,"ch":"#d6cfc2","eh":6.5,"ga":1,"xg":1,"xgw":"win","xgt":0,"pt":"brick","um":"#7a2f2a","stp":1,"fh":1.4,"lo":1.4,"lc":"#8e4a3a","ar":"dark","bd":{"h":1,"fl":"#7a2e4e"}},
  crls:{"w":"#85503f","m":"brick","t":"#f4f2ec","s":"#c9b48c","r":"#6b6760","v":"wrap","c":"#f4f2ec","cu":1,"ch":"#8a4a3a","xg":1,"xgw":"win","xgt":0,"eg":4,"pt":"stone","rw":1,"ph":2,"stp":1},
  crsc:{"w":"#85503f","m":"brick","t":"#f4f2ec","s":"#c9b48c","r":"#6b6760","v":"wrap","c":"#f4f2ec","cu":1,"ch":"#8a4a3a","xg":1,"xgw":"win","xgt":0,"eg":4,"pt":"stone","rw":1,"ph":2,"stp":1},
  lido:{"cus":2.2,"w":"#f0eee7","m":"siding","t":"#efede6","r":"#86817b","v":"front","c":"#efede6","cu":1,"pt":"paver","um":"","b":0,"yard":"none"},
  mystic:{"oct":1,"cu":1,"cus":1.5,"w":"#cdbd9f","m":"stucco","s":"#86705f","b":1,"t":"#e6dfcf","r":"#4f7d70","v":"wrap","c":"#86705f","dm":1,"pt":"paver","um":"#2f5f9e","rw":1,"ph":1,"stp":1},
  rossbridge:{"m":"stone","w":"#dccfae","s":"#a69679","t":"#ece5d3","lo":3.2,"lc":"#a69679","r":"#5f6266","rs":7.5,"rp":0.6,"v":"none","dm":4,"ch":"#b9a988","xg":3,"xgw":"win","xgt":0,"eg":5,"tw":8,"twc":"#d8cba8","pt":"paver","um":"#2a96a8,#e8dfcc","fp":1,"rw":1},
  sedge:{"w":"#a8785a","m":"brick","t":"#2b2b2b","r":"#4a4f55","gb":1,"eh":6.5,"rs":2.5,"rp":0.25,"v":"none","pt":"paver","b":0,"um":"","yard":"none"},
  northfork:{"w":"#ddcdb0","m":"stucco","t":"#ece6d6","s":"#bfae92","b":0.5,"r":"#46564d","eh":5,"rs":5,"xg":3,"xgw":"win","xgt":0,"tw":4.5,"twc":"#ddcdb0","v":"none","c":"#ece6d6","pt":"paver","um":"#26344f"},
  desertcanyon:{"w":"#cfb196","m":"stucco","t":"#5e4433","s":"#b58b74","b":0.6,"r":"#8a5f48","fl":1,"eh":4.6,"v":"front","c":"#6e4c34","pc":1,"pcc":"#7a5638","pt":"stone","ph":1.4,"ir":1,"um":"","yard":"none"},
  willingers:{"w":"#a8aaa1","m":"siding","t":"#efede6","s":"#9d968a","b":0.4,"r":"#56585a","rs":4.2,"v":"none","c":"#efede6","eg":2.2,"pt":"deck","ph":2.6,"ir":1,"um":"#2f6db5"},
  ridges:{"w":"#eceae3","m":"siding","t":"#f4f3ee","s":"#b5ada0","b":0.4,"r":"#4a6d58","eh":6.8,"rs":4.2,"ga":1,"cu":1,"cus":1.3,"v":"none","c":"#f4f3ee","pt":"deck","ph":3,"um":"","stp":1},
  jewel:{"w":"#c9bfa3","m":"stucco","t":"#ddd5bd","s":"#b3a68a","b":0.5,"r":"#7f786c","eh":6.5,"rs":3.2,"rp":0.4,"xg":1,"xgw":"win","xgt":0,"v":"none","c":"#e0d8c0","pc":1,"pcc":"#e0d8c0","pt":"stone","um":"","ph":1.2,"ir":1,"stp":1},
  edinburgh:{"w":"#a38a6c","m":"stone","t":"#35553f","s":"#8f7a60","b":0.8,"r":"#5e5d5a","v":"none","c":"#a38a6c","ch":"#8f7a60","eh":8,"rs":7.5,"rp":0.55,"xg":3,"xgw":"win","xgt":0,"xgc":1,"dm":3,"pt":"stone","um":"#c4452f,#e8e2d2,#d9822b","rw":1,"ph":0.8,"eg":4.5}};
CLUBLOOK.ridge=CLUBLOOK.valley;CLUBLOOK.gnlinks=CLUBLOOK.gnlake;CLUBLOOK.slbm=CLUBLOOK.slmh;
const STYLE={lowcountry:{wall:'#ecebe4',trim:'#3d4b3f',stone:'#b8b2a6',roof:'#5b6166'},prairie:{wall:'#9c7d5e',trim:'#4a3a2e',stone:'#8d8375',roof:'#4a4038'},links:{wall:'#d6ccb8',trim:'#5a4b3c',stone:'#9a9184',roof:'#3b4a52'}};
/* ---- buildings with measured heights / roof shapes / roof colours (BLDX in ground.js: lidar + aerial photo) ----
   BLDX[id]={c:{clubhouseIdx:rec},b:{surrBldIdx:rec},a:[[pts(course yd),rec,kind]]}, rec=[eaveH,ridgeRise,roof 0 flat|1 gable|2 hip,ridgeDeg,roofCol] */
// the clubhouse grounds: mown lawn (rough, not fescue) within 16 yd of a clubhouse, as photos of almost every clubhouse show; courses
// whose clubhouse stands in sand, dune grass, prairie or desert planting say so with CLUBLOOK yard:'none'
function clubLawn(h){const L=h.lg;if(!L)return;const LK=CLUBLOOK[CUR.id]||(CUR.data&&CLUBLOOK[CUR.data])||{};if(LK.yard==='none'||CUR.scen==='desert')return;
  for(const q of h.buildings||[]){if(!q.club)continue;const bb=q.bb,R=16;
    for(let j=Math.max(0,Math.floor(bb[1]-R-L.y0));j<=Math.min(L.ny-1,Math.ceil(bb[3]+R-L.y0));j++)for(let i=Math.max(0,Math.floor(bb[0]-R-L.x0));i<=Math.min(L.nx-1,Math.ceil(bb[2]+R-L.x0));i++){
      const k=j*L.nx+i;if(L.code[k]!==0)continue;if(polyDist(q,L.x0+i,L.y0+j,R+1)<=R)L.code[k]=1;}}}
function bldxForHole(h){if(typeof BLDX==='undefined'||!BLDX)return;const Xc=BLDX[CUR.id]||null,Xs=Xc||(CUR.data&&BLDX[CUR.data])||null;if(!Xs)return;
  if(Xs.nc){const LK=CLUBLOOK[CUR.id];for(const q of h.buildings)if(q.ci!=null){q.club=false;q.bk='building';if(LK&&LK.wb&&q.area<600){q.bk='barn';q.wbarn=1;}}}   // StoneRidge: the map's small 'clubhouse' is the white barn on 11
  for(const q of h.buildings){const r=q.ci!=null?(Xc&&Xc.c&&Xc.c[q.ci]):q.bi!=null?(Xs.b&&Xs.b[q.bi]):null;if(r&&r.length)q.rec=r;}
  const T0=h.T0,b=h.bounds,near=(x,y,r)=>x>b[0]-r&&x<b[2]+r&&y>b[1]-r&&y<b[3]+r;
  (Xs.a||[]).forEach((A,i)=>{if(!A||!A[0]||A[0].length<3)return;const pts=A[0].map(p=>[p[0]-T0[0],p[1]-T0[1]]);if(!pts.some(p=>near(p[0],p[1],900)))return;
    const P=mkPoly(pts,'bld');P.rec=A[1]&&A[1].length?A[1]:null;if(A[2]==='club'){P.club=true;P.bk=null;}else P.bk=['shack','barn','building'].includes(A[2])?A[2]:'building';P.ai=i;h.buildings.push(P);});
  // a clubhouse placed from photos replaces whatever older outline sat on the same spot
  const CL=h.buildings.filter(q=>q.club&&q.ai!=null);if(CL.length)h.buildings=h.buildings.filter(q=>(q.club&&q.ai!=null)||!CL.some(c=>inPoly(c,q.x,q.y)||inPoly(q,c.x,c.y)));}
// parking lots measured with the clubhouses (BLDX[id].p, course yd) join the map's lots unless one already covers them
function bldxPark(S){if(!S||S._bp||typeof BLDX==='undefined'||!BLDX)return;S._bp=1;const X=BLDX[CUR.id]||(CUR.data&&BLDX[CUR.data]);if(!X||!X.p)return;
  const have=(S.polys.park||[]).map(P=>mkPoly(P,'lot'));S.polys.park=S.polys.park||[];
  for(const R of X.p){if(!R||R.length<3)continue;const Q=mkPoly(R,'lot');if(have.some(H=>inPoly(H,Q.x,Q.y)||inPoly(Q,H.x,H.y)))continue;S.polys.park.push(R);have.push(Q);}}
// a lot's stalls: rows 6.4 yd apart along its longest side (every third one an aisle), 2.9 yd stalls; f(x,y,ang,u,v) per stall
function lotStalls(P,f){const Q=mkPoly(P,'lot');let L=0,ang=0;for(let i=0;i<P.length;i++){const a=P[i],c=P[(i+1)%P.length],l=hyp(c[0]-a[0],c[1]-a[1]);if(l>L){L=l;ang=Math.atan2(c[1]-a[1],c[0]-a[0]);}}
  const ca=Math.cos(ang),sa=Math.sin(ang);
  for(let v=-120;v<120;v+=6.4)for(let u=-160;u<160;u+=2.9){if(((v/6.4)|0)%3===2)continue;const x=Q.x+u*ca-v*sa,y=Q.y+u*sa+v*ca;if(!inPoly(Q,x,y)||polyDist(Q,x,y,4)>-2.2)continue;f(x,y,ang,Q);}}
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
/* building sanity (Oct 19 2026 check): (1) the same footprint loaded twice (a map clubhouse and a lidar "extra" building, or two
   copies of an OSM outline) is drawn once, keeping the clubhouse, then the one with a measured roof; (2) a house-sized building whose
   lidar eave reads over 12 yd measured the trees over it (Interlachen, Pines): it gets a normal 3.6-yd eave; (3) an outline that
   contains three or more other buildings is an area drawn as a building (Prestwick's 46,000 sq yd block), not a building: dropped. */
function bldOverlap(a,c){if(a.bb[2]<c.bb[0]||c.bb[2]<a.bb[0]||a.bb[3]<c.bb[1]||c.bb[3]<a.bb[1])return 0;
  const x0=Math.max(a.bb[0],c.bb[0]),x1=Math.min(a.bb[2],c.bb[2]),y0=Math.max(a.bb[1],c.bb[1]),y1=Math.min(a.bb[3],c.bb[3]),st=Math.max(.5,Math.sqrt((x1-x0)*(y1-y0)/300));let n=0;
  for(let y=y0+st/2;y<y1;y+=st)for(let x=x0+st/2;x<x1;x+=st)if(inPoly(a,x,y)&&inPoly(c,x,y))n++;return n*st*st/Math.max(1,Math.min(a.area,c.area));}
function bldSanity(h){const B=h.buildings||[];if(!B.length)return;
  const rank=q=>(q.club?4:0)+(q.rec?2:0)+(q.ci!=null||q.ai!=null?1:0),drop=new Set();
  for(let i=0;i<B.length;i++)for(let j=i+1;j<B.length;j++){const a=B[i],c=B[j];if(drop.has(a)||drop.has(c))continue;
    const r=a.area/Math.max(1,c.area);if(r<.75||r>1.33)continue;if(bldOverlap(a,c)>.6){const lose=rank(a)>=rank(c)?c:a,keep=lose===a?c:a;if(lose.club)keep.club=true;if(!keep.rec&&lose.rec)keep.rec=lose.rec;drop.add(lose);}}
  for(const q of B){if(drop.has(q)||q.club||q.area<2000)continue;let n=0;for(const o of B)if(o!==q&&!drop.has(o)&&o.area<q.area*.5&&inPoly(q,o.x,o.y)&&++n>=3)break;if(n>=3)drop.add(q);}
  if(drop.size)h.buildings=B.filter(q=>!drop.has(q));
  // the map's clubhouse outline is only loaded on holes whose box holds it; a lidar copy of the same footprint loaded on the other
  // holes is that clubhouse too (Troy, The Legends, FarmLinks: plain grey box from most holes before)
  const X=typeof BLDX!=='undefined'&&BLDX?(BLDX[CUR.id]||(CUR.data&&BLDX[CUR.data])):null;
  if(!(X&&(X.nc||(X.a||[]).some(a=>a&&a[2]==='club')))&&(COURSE.polys.clubhouse||[]).length){const T0=h.T0,CP=COURSE.polys.clubhouse.map(P=>mkPoly(P.map(p=>[p[0]-T0[0],p[1]-T0[1]]),'clubhouse'));
    for(const q of h.buildings)if(!q.club){const c=CP.find(c=>{const r=q.area/Math.max(1,c.area);return r>.75&&r<1.33&&bldOverlap(q,c)>.6;});if(c){q.club=true;q.bk=null;}}}
  for(const q of h.buildings)if(!q.club&&q.rec&&q.rec[0]>12&&q.area<800){q.rec=q.rec.slice();q.rec[0]=3.6;}}
// no trees growing through buildings: clear round every building, and wider round a clubhouse (its porch, terrace, steps and drive)
function bldTreeClear(h){const blds=(h.buildings||[]).filter(q=>q.area>6);if(!blds.length)return;
  const hit=t=>blds.some(q=>{if(t.x<q.bb[0]-40||t.x>q.bb[2]+40||t.y<q.bb[1]-40||t.y>q.bb[3]+40)return false;return polyDist(q,t.x,t.y,40)<(t.r||8)*.7+(q.club?14:3);});
  h.trees=(h.trees||[]).filter(t=>!hit(t));h.allTrees=(h.allTrees||[]).filter(t=>!hit(t));if(h.farTrees)h.farTrees=h.farTrees.filter(t=>!hit(t));}
// a footprint broken into its wings: the biggest rectangles (in the footprint's own axes) that fill it, largest first
function bldWings(q,p,ob){if(q._w!==undefined)return q._w;const g=.7,nu=Math.ceil((ob.u1-ob.u0)/g),nv=Math.ceil((ob.v1-ob.v0)/g);if(nu*nv>40000||nu<4||nv<4)return q._w=null;
  const P2=(u,v)=>[u*ob.ux-v*ob.uy,u*ob.uy+v*ob.ux],Q={pts:p,bb:q.bb};const M=new Uint8Array(nu*nv);let tot=0;
  for(let j=0;j<nv;j++)for(let i=0;i<nu;i++){const c=P2(ob.u0+(i+.5)*g,ob.v0+(j+.5)*g);if(inPoly(Q,c[0],c[1])){M[j*nu+i]=1;tot++;}}
  const W=[],H=new Int32Array(nu);let cov=0;
  for(let it=0;it<7;it++){let best=null;H.fill(0);
    for(let j=0;j<nv;j++){for(let i=0;i<nu;i++)H[i]=M[j*nu+i]===1?H[i]+1:0;
      const st=[];for(let i=0;i<=nu;i++){const hh=i<nu?H[i]:0;let s0=i;while(st.length&&st[st.length-1][1]>=hh){const[si,sh]=st.pop();const w=i-si,a=w*sh;if(sh*g>=3.5&&w*g>=3.5&&(!best||a>best.a))best={a,i0:si,i1:i,j0:j-sh+1,j1:j+1};s0=si;}st.push([s0,hh]);}}
    if(!best||best.a*g*g<14)break;for(let j=best.j0;j<best.j1;j++)for(let i=best.i0;i<best.i1;i++)if(M[j*nu+i]===1){M[j*nu+i]=2;cov++;}
    W.push([ob.u0+best.i0*g,ob.u0+best.i1*g,ob.v0+best.j0*g,ob.v0+best.j1*g]);if(cov>=tot*.93)break;}
  return q._w=W.length>1?W:null;}
// the lidar-modelled clubhouse for building q on this course, if there is one
function lidOf(q,h){const L=typeof CLUBLID!=='undefined'&&(CLUBLID[CUR.id]||(CUR.data&&CLUBLID[CUR.data]));if(!L||!q.club)return null;
  const ox=L.o[0]-h.T0[0],oz=L.o[1]-h.T0[1];if(hyp(q.x-ox,q.y-oz)>Math.max(18,Math.sqrt(q.area)*.6))return null;
  return L.blocks||L.parts?L:null;}
/* A clubhouse modelled on its lidar survey (CLUBLID: one per course, built with the bk.py toolkit): roof blocks in the building's own frame,
   [type,u0,u1,v0,v1,eave,pitch,ridge,flags]; H hip, GU/GV gable with the ridge along u/v, SU/SV shed, F flat, T tower or cupola;
   flag o = open underneath (porch, veranda, porte-cochere: posts, no walls), d = deck (railing). Overlapping blocks make the real
   roof: the highest surface shows everywhere, so valleys and hips come from the union. Walls in the clubhouse's own materials
   (CLUBLOOK colours), windows per storey, gable ends that follow the roof; bldDraw keeps the doors, entry, patio and flag. */
// the main eave of a lidar clubhouse in world height: the area-weighted median eave of its closed blocks (towers, porches and decks aside)
// the height the model stands on: with survey ground samples round the building (gr: [u,v,ground above the reference]) the median
// offset between the game's ground and the survey's, so one odd spot (a bunker lip, a path cut) can't sink or lift the building
function lidF(h,L){const a=L.a*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),X=(u,v)=>L.o[0]-h.T0[0]+u*ca+v*sa,Z=(u,v)=>L.o[1]-h.T0[1]-u*sa+v*ca;
  if(!L.gr||L.gr.length<6)return hAtH(h,X(L.ref[0],L.ref[1]),Z(L.ref[0],L.ref[1]));const d=L.gr.map(q=>hAtH(h,X(q[0],q[1]),Z(q[0],q[1]))-q[2]).sort((x,y)=>x-y);return d[d.length>>1];}
function lidEave(h,L){const F=lidF(h,L);
  const E=[],R=[];for(const b of(L.blocks||[]).concat(...(L.parts||[]).map(p=>p.blocks)))if(b[0]!=='T'&&!/[od]/.test(b[8]||'')){const w=(b[2]-b[1])*(b[4]-b[3]);
    E.push([b[0]==='SU'||b[0]==='SV'?Math.min(b[5],b[7]):b[5],w]);R.push([Math.max(b[5],b[7]),w]);}
  const med=A=>{A.sort((x,y)=>x[0]-y[0]);const tot=A.reduce((s,e)=>s+e[1],0);let acc=0;for(const e of A){acc+=e[1];if(acc>=tot/2)return e[0];}return 4;};
  const e=F+med(E);lidEave.top=Math.max(e,F+med(R));return e;}
function blockMass(h,q,out,L,C){
  // wings set at their own angle (a Y- or V-plan) come as parts, each with its own frame; heights stay on the main reference ground
  if(L.parts){const F0=lidF(h,L);let ev=[],sh=[];
    const one=r=>{ev.push(r.eave);sh=sh.concat(r.shrubs||[]);};
    if(L.blocks&&L.blocks.length)one(blockMass(h,q,out,{o:L.o,a:L.a,ref:L.ref,blocks:L.blocks,st:L.st},Object.assign({},C,{F:F0})));
    for(const pt of L.parts)one(blockMass(h,q,out,{o:pt.o,a:pt.a,ref:[0,0],blocks:pt.blocks},Object.assign({},C,{F:F0,stair:0})));
    ev.sort((x,y)=>x-y);return{F:F0,eave:ev[ev.length>>1],shrubs:sh};}
  if(L.st&&C.st==null)C=Object.assign({},C,{st:L.st});
  const a=L.a*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),ox=L.o[0]-h.T0[0],oz=L.o[1]-h.T0[1],B0=L.blocks;
  const X=(u,v)=>ox+u*ca+v*sa,Z=(u,v)=>oz-u*sa+v*ca,gAt=(u,v)=>hAtH(h,X(u,v),Z(u,v)),F=C.F!=null?C.F:lidF(h,L),P=(u,v,y)=>[X(u,v),F+y,Z(u,v)];
  const DU=[ca,0,-sa],DV=[sa,0,ca],UP=[0,1,0],nU=k=>[DU[0]*k,0,DU[2]*k],nV=k=>[DV[0]*k,0,DV[2]*k];
  const shade=n=>.82+.18*Math.max(0,dot3(n,nrm([-.5,.6,.6]))),q4=(A,B2,C2,D,col,n)=>quadO(out,A,B2,C2,D,col,n);
  const rc=n=>mul(C.roof,shade(n)),ov=b=>b[0]==='T'?.15:b[0]==='C'?.1:b[0]==='F'?.05:Math.min(.6,(Math.min(b[2]-b[1],b[4]-b[3]))*.08);
  // a bay or bow front (types BU0/BU1/BV0/BV1, after its straight side): a half-ellipse bulging out from that side, under a conical roof
  const bayG=b=>{const[t,u0,u1,v0,v1]=b,uc=(u0+u1)/2,vc=(v0+v1)/2;return t==='BU0'?{c:[u0,vc],T:[0,1],N:[1,0],ra:(v1-v0)/2,d:u1-u0}:t==='BU1'?{c:[u1,vc],T:[0,1],N:[-1,0],ra:(v1-v0)/2,d:u1-u0}:
    t==='BV0'?{c:[uc,v0],T:[1,0],N:[0,1],ra:(u1-u0)/2,d:v1-v0}:{c:[uc,v1],T:[1,0],N:[0,-1],ra:(u1-u0)/2,d:v1-v0};};
  const bayR=(b,u,v)=>{const g=bayG(b),x=(u-g.c[0])*g.T[0]+(v-g.c[1])*g.T[1],y=(u-g.c[0])*g.N[0]+(v-g.c[1])*g.N[1];return y<-1e-6?9:Math.hypot(x/g.ra,y/g.d);};
  const isBay=b=>b[0][0]==='B';
  // the roof height of block b at (u,v), or -1e9 outside it
  const rh=(b,u,v)=>{const[t,u0,u1,v0,v1,e,p,cap]=b;if(u<u0-1e-6||u>u1+1e-6||v<v0-1e-6||v>v1+1e-6)return -1e9;
    if(t[0]==='B'){const r=bayR(b,u,v);return r>1+1e-6?-1e9:e+(Math.max(cap,e)-e)*(1-r);}const du=Math.min(u-u0,u1-u),dv=Math.min(v-v0,v1-v);
    let y=t==='H'?e+p*Math.min(du,dv):t==='GU'?e+p*dv:t==='GV'?e+p*du:t==='SU'?e+p*(u-u0):t==='SV'?e+p*(v-v0):t==='T'?Math.min(cap,Math.max(e,cap-(cap-e)*(1-Math.min(du,dv)/Math.max(.01,Math.min(u1-u0,v1-v0)/2)))):e;
    return t==='SU'||t==='SV'?Math.min(Math.max(y,Math.min(e,cap)),Math.max(e,cap)):Math.min(y,Math.max(cap,e));};
  // a tower block too slim for a room (under 2.6 x 4.5 yd, unless flagged k for a cupola) is a chimney: a flat-capped stack in the chimney colour, standing at most ~1.6 yd over the roof
  // around it (a stray flagpole or tree point can lift the survey's top)
  const B=B0.map(b=>{if(b[0]!=='T'||(b[8]||'').includes('k')||Math.min(b[2]-b[1],b[4]-b[3])>=2.6||Math.max(b[2]-b[1],b[4]-b[3])>4.5)return b;const uc=(b[1]+b[2])/2,vc=(b[3]+b[4])/2;
    let r=-1e9;for(const o of B0)if(o!==b&&o[0]!=='T')r=Math.max(r,rh(o,uc,vc));const top=r>-1e8?Math.min(Math.max(b[5],b[7]),r+1.6):Math.max(b[5],b[7]);
    return['C',b[1],b[2],b[3],b[4],top,0,top,b[8]];});
  const inBlk=(u,v,me)=>B.some(b=>b!==me&&!(b[8]||'').includes('o')&&(isBay(b)?bayR(b,u,v)<.97:u>b[1]+ov(b)&&u<b[2]-ov(b)&&v>b[3]+ov(b)&&v<b[4]-ov(b)));
  // roofs
  const hipShell=(u0,u1,v0,v1,hb,p,cap,col)=>{let t=p>0?(cap-hb)/p:0;t=Math.max(0,Math.min(t,(u1-u0)/2,(v1-v0)/2));const ht=hb+p*t,U0=u0+t,U1=u1-t,V0=v0+t,V1=v1-t;
    if(t>0){const nS=nrm([DV[0]*p,1,DV[2]*p]),nN=nrm([-DV[0]*p,1,-DV[2]*p]),nE=nrm([DU[0]*p,1,DU[2]*p]),nW=nrm([-DU[0]*p,1,-DU[2]*p]);
      q4(P(u0,v1,hb),P(u1,v1,hb),P(U1,V1,ht),P(U0,V1,ht),col||rc(nS),nS);q4(P(u1,v0,hb),P(u0,v0,hb),P(U0,V0,ht),P(U1,V0,ht),col||rc(nN),nN);
      q4(P(u1,v1,hb),P(u1,v0,hb),P(U1,V0,ht),P(U1,V1,ht),col||rc(nE),nE);q4(P(u0,v0,hb),P(u0,v1,hb),P(U0,V1,ht),P(U0,V0,ht),col||rc(nW),nW);}
    if(U1-U0>.05&&V1-V0>.05)q4(P(U0,V0,ht),P(U1,V0,ht),P(U1,V1,ht),P(U0,V1,ht),col||C.roof,UP);};
  const bayPts=(b,k0)=>{const g=bayG(b),K=k0||16,pts=[];for(let k=0;k<=K;k++){const th=Math.PI*k/K;pts.push([g.c[0]+g.T[0]*Math.cos(th)*g.ra+g.N[0]*Math.sin(th)*g.d,g.c[1]+g.T[1]*Math.cos(th)*g.ra+g.N[1]*Math.sin(th)*g.d]);}return pts;};
  const wN=(A2,B2,g)=>{const dx=B2[0]-A2[0],dy=B2[1]-A2[1],l=hyp(dx,dy)||1;let nu=dy/l,nv=-dx/l;const mx=(A2[0]+B2[0])/2-g.c[0],my=(A2[1]+B2[1])/2-g.c[1];if(nu*mx+nv*my<0){nu=-nu;nv=-nv;}return[nu*ca+nv*sa,0,-nu*sa+nv*ca];};
  for(const b of B){const[t,u0,u1,v0,v1,e,p,cap]=b,fl=b[8]||'';
    if(t[0]==='B'){const g=bayG(b),pts=bayPts(b),ap=P(g.c[0],g.c[1],Math.max(cap,e));for(let k=0;k<pts.length-1;k++){const A2=P(pts[k][0],pts[k][1],e),B2=P(pts[k+1][0],pts[k+1][1],e),nn=nrm(cross(sub(B2,A2),sub(ap,A2)));
        const n2=nn[1]<0?mul(nn,-1):nn;triO(out,A2,B2,ap,rc(n2),n2);const wn=wN(pts[k],pts[k+1],g);q4(P(pts[k][0],pts[k][1],e-.3),P(pts[k+1][0],pts[k+1][1],e-.3),P(pts[k+1][0],pts[k+1][1],e),P(pts[k][0],pts[k][1],e),C.trim,wn);}continue;}
    if(t==='H'||t==='T'){if(t==='T'){const o=ov(b),tw=Math.min(u1-u0,v1-v0)/2,pp=Math.max(.3,(cap-e)/Math.max(.3,tw));hipShell(u0,u1,v0,v1,e,pp,cap);}else hipShell(u0,u1,v0,v1,e,p,cap);}
    else if(t==='GU'||t==='GV'){const along=t==='GU',w=along?v1-v0:u1-u0,tt=Math.max(0,Math.min(w/2,p>0?(cap-e)/p:0)),ht=e+p*tt;
      const Q=(s,r,y)=>along?P(s,r,y):P(r,s,y),s0=along?u0:v0,s1=along?u1:v0,r0=along?v0:u0,r1=along?v1:u1,S1=along?u1:v1,DD=along?DV:DU;
      const nA=nrm([-DD[0]*p,1,-DD[2]*p]),nB=nrm([DD[0]*p,1,DD[2]*p]);
      q4(Q(s0,r0,e),Q(S1,r0,e),Q(S1,r0+tt,ht),Q(s0,r0+tt,ht),rc(nA),nA);q4(Q(s0,r1,e),Q(S1,r1,e),Q(S1,r1-tt,ht),Q(s0,r1-tt,ht),rc(nB),nB);
      if(r1-tt>r0+tt+.05)q4(Q(s0,r0+tt,ht),Q(S1,r0+tt,ht),Q(S1,r1-tt,ht),Q(s0,r1-tt,ht),C.roof,UP);
}
    else if(t==='C'){q4(P(u0-.08,v0-.08,e+.1),P(u1+.08,v0-.08,e+.1),P(u1+.08,v1+.08,e+.1),P(u0-.08,v1+.08,e+.1),mul(C.ch,.8),UP);
      for(const[A2,B2,n]of[[[u0,v0],[u1,v0],nV(-1)],[[u1,v0],[u1,v1],nU(1)],[[u1,v1],[u0,v1],nV(1)],[[u0,v1],[u0,v0],nU(-1)]]){const d=[n[0]*.08,0,n[2]*.08],A3=P(A2[0],A2[1],e-.2),B3=P(B2[0],B2[1],e-.2);
        q4([A3[0]+d[0],A3[1],A3[2]+d[2]],[B3[0]+d[0],B3[1],B3[2]+d[2]],[B3[0]+d[0],B3[1]+.3,B3[2]+d[2]],[A3[0]+d[0],A3[1]+.3,A3[2]+d[2]],mul(C.ch,.85),n);}}
    else if(t==='SU'||t==='SV'){const along=t==='SU';const corners=[[u0,v0],[u1,v0],[u1,v1],[u0,v1]].map(([u,v])=>P(u,v,rh(b,u,v)));
      const n=nrm(along?[-DU[0]*p,1,-DU[2]*p]:[-DV[0]*p,1,-DV[2]*p]);q4(corners[0],corners[1],corners[2],corners[3],rc(n),n);}
    else{q4(P(u0,v0,e),P(u1,v0,e),P(u1,v1,e),P(u0,v1,e),fl.includes('d')?C.deck:C.flat,UP);
      for(const[A2,B2,n]of[[[u0,v0],[u1,v0],nV(-1)],[[u1,v0],[u1,v1],nU(1)],[[u1,v1],[u0,v1],nV(1)],[[u0,v1],[u0,v0],nU(-1)]]){
        if(fl.includes('d')){q4(P(A2[0],A2[1],e+.95),P(B2[0],B2[1],e+.95),P(B2[0],B2[1],e+1.07),P(A2[0],A2[1],e+1.07),C.trim,n);}
        else q4(P(A2[0],A2[1],e-.3),P(B2[0],B2[1],e-.3),P(B2[0],B2[1],e+(fl.includes('o')?0:.35)),P(A2[0],A2[1],e+(fl.includes('o')?0:.35)),C.trim,n);}}}
  // the clock on the clock tower (the tallest tower block wide enough for one): a face on each side below its eave
  // a gable carrying a clock (flag c on a GU/GV block): a face high in each gable end that shows over the roofs in front of it
  const face=(c,n,T,r)=>{const pt=(ang,rr,o)=>[c[0]+T[0]*Math.cos(ang)*rr+n[0]*o,c[1]+Math.sin(ang)*rr,c[2]+T[2]*Math.cos(ang)*rr+n[2]*o];
    for(let j=0;j<12;j++){const a1=j/12*TAU,a2=(j+1)/12*TAU;triO(out,[c[0]+n[0]*.03,c[1],c[2]+n[2]*.03],pt(a1,r+.12,.025),pt(a2,r+.12,.025),C.trim,n);triO(out,[c[0]+n[0]*.05,c[1],c[2]+n[2]*.05],pt(a1,r,.05),pt(a2,r,.05),[.95,.94,.9],n);}
    for(const[ang,len,w]of[[1.1,r*.55,.06],[2.6,r*.8,.04]]){triO(out,pt(ang+Math.PI/2,w,.07),pt(ang-Math.PI/2,w,.07),pt(ang,len,.07),[.12,.12,.12],n);}};
  for(const b of B){if(!(b[8]||'').includes('c')||(b[0]!=='GU'&&b[0]!=='GV'))continue;const[t,u0,u1,v0,v1,e,p,cap]=b,along=t==='GU',w=along?v1-v0:u1-u0,top=Math.min(cap,e+p*w/2),r=Math.min(1.05,w*.16,(top-e)*.3);
    if(r<.4)continue;const yc=e+(top-e)*.38;
    for(const sg of[-1,1]){const u=along?(sg<0?u0:u1)-sg*ov(b):(u0+u1)/2,v=along?(v0+v1)/2:(sg<0?v0:v1)-sg*ov(b),n=along?nU(sg):nV(sg),T=along?DV:DU,uo=u+(along?sg*.8:0),vo=v+(along?0:sg*.8);
      if(B.some(o=>o!==b&&rh(o,uo,vo)>yc-r-.2))continue;face(P(u,v,yc),n,T,r);}}
  let clockB=null;
  if(C.clk||B.some(b=>b[0]==='T'&&(b[8]||'').includes('c'))){let tb=B.find(b=>b[0]==='T'&&(b[8]||'').includes('c'))||null;if(!tb)for(const b of B)if(b[0]==='T'&&Math.min(b[2]-b[1],b[4]-b[3])>=2.5&&(!tb||Math.max(b[5],b[7])>Math.max(tb[5],tb[7])))tb=b;
    if(tb){clockB=tb;const[,u0,u1,v0,v1,e]=tb,uc=(u0+u1)/2,vc=(v0+v1)/2,r=Math.min(1.05,Math.min(u1-u0,v1-v0)*.28),yc=e-r-.45,hu=(u1-u0)/2-.1,hv=(v1-v0)/2-.1;
      if(yc-r>gAt(uc,vc)-F+2)for(const[n,du,dv,T]of[[nU(1),hu,0,DV],[nU(-1),-hu,0,nV(-1)],[nV(1),0,hv,nU(-1)],[nV(-1),0,-hv,DU]]){const c=P(uc+du,vc+dv,yc),
        pt=(ang,rr,o)=>[c[0]+T[0]*Math.cos(ang)*rr+n[0]*o,c[1]+Math.sin(ang)*rr,c[2]+T[2]*Math.cos(ang)*rr+n[2]*o];
        for(let j=0;j<12;j++){const a1=j/12*TAU,a2=(j+1)/12*TAU;triO(out,[c[0]+n[0]*.03,c[1],c[2]+n[2]*.03],pt(a1,r+.12,.025),pt(a2,r+.12,.025),C.trim,n);triO(out,[c[0]+n[0]*.05,c[1],c[2]+n[2]*.05],pt(a1,r,.05),pt(a2,r,.05),[.95,.94,.9],n);}
        for(const[ang,len,w]of[[1.1,r*.55,.06],[2.6,r*.8,.04]]){const A=pt(ang+Math.PI/2,w,.07),B2=pt(ang-Math.PI/2,w,.07),D=pt(ang,len,.07);triO(out,A,B2,D,[.12,.12,.12],n);}}}}
  // porches and verandas of a clubhouse whose main floor stands above the ground (CLUBLOOK fh, from photos and the survey): a floor at that
  // height on a skirt (brick arches when the look has them, else lattice between piers), a railing where it stands high, posts from the
  // floor, and one stair down from the longest open side
  const FH=C.fh||0,shrubs=[],arC=C.ar==='glass'?C.glass:hexc('#2a2522');
  const floored=b=>(b[8]||'').includes('o')&&!(b[8]||'').includes('n')&&FH>=.45&&b[5]>FH+2||(b[8]||'').includes('d')&&FH>=.45;
  const flH=b=>(b[8]||'').includes('d')?b[5]:FH;
  const arches=(A,B2,n,g0,g1,top,sp)=>{const L0=hyp(B2[0]-A[0],B2[1]-A[1]);if(L0<1.6)return;const na=Math.max(1,Math.round(L0/sp)),w=Math.min(.7,L0/na*.3);
    for(let k=0;k<na;k++){const t=(k+.5)/na,u=A[0]+(B2[0]-A[0])*t,v=A[1]+(B2[1]-A[1])*t,g=g0+(g1-g0)*t,yt=top-.45-w;if(yt-g<.5)continue;const T=[(B2[0]-A[0])/L0,(B2[1]-A[1])/L0],o=.04;
      const W=(s2,y)=>{const pp=P(u+T[0]*s2,v+T[1]*s2,y);return[pp[0]+n[0]*o,pp[1],pp[2]+n[2]*o];};q4(W(-w,g+.05),W(w,g+.05),W(w,yt),W(-w,yt),arC,n);
      for(let j=0;j<6;j++){const a1=j/6*Math.PI,a2=(j+1)/6*Math.PI;triO(out,W(0,yt),W(Math.cos(a1)*w,yt+Math.sin(a1)*w),W(Math.cos(a2)*w,yt+Math.sin(a2)*w),arC,n);}}};
  // stairs down from the raised floor: where the photos put them (CLUBLID st: [u,v,width,dir] in the model frame, snapped to the nearest
  // open edge of a raised porch, deck or wall; dir 0 runs straight out, 1/-1 runs alongside the wall), else one centred on the longest open porch edge
  const stairs=[],sides4=b=>{const[,u0,u1,v0,v1]=b;return[[u0,v1,u1,v1,nV(1)],[u1,v0,u0,v0,nV(-1)],[u1,v1,u1,v0,nU(1)],[u0,v0,u0,v1,nU(-1)]];};
  const openEdge=(b,a0,b0,a1,b1,n)=>{const mu=(a0+a1)/2,mv=(b0+b1)/2,on=[n[0]*ca-n[2]*sa,n[0]*sa+n[2]*ca];return!B.some(o=>o!==b&&(!(o[8]||'').includes('o')||floored(o))&&rh(o,mu+on[0]*1.5,mv+on[1]*1.5)>-1e8);};
  const mkStair=(b,a0,b0,a1,b1,n,w,t,mode)=>{const on=[n[0]*ca-n[2]*sa,n[0]*sa+n[2]*ca],Lr=hyp(a1-a0,b1-b0),T=[(a1-a0)/Lr,(b1-b0)/Lr],eu=a0+(a1-a0)*t,ev=b0+(b1-b0)*t;
    return mode?{b,D:[T[0]*mode,T[1]*mode],A:on,w,su:eu+on[0]*(w+.05),sv:ev+on[1]*(w+.05),fh:floored(b)?flH(b):FH}:{b,D:on,A:T,w,su:eu,sv:ev,fh:floored(b)?flH(b):FH};};
  if(C.stair!==0&&FH>=.45){
    if(C.st&&C.st.length)for(const[su,sv,sw,md,kind,td]of C.st){let best=null;for(const b of B){const op=(b[8]||'').includes('o');if(b[0]==='T'||b[0]==='C'||op&&!floored(b)||(b[8]||'').includes('d')&&Math.abs(b[5]-FH)>.6)continue;
        for(const[a0,b0,a1,b1,n]of sides4(b)){if(!openEdge(b,a0,b0,a1,b1,n))continue;const L2=(a1-a0)**2+(b1-b0)**2,t=clamp(((su-a0)*(a1-a0)+(sv-b0)*(b1-b0))/L2,0,1),pu=a0+(a1-a0)*t,pv=b0+(b1-b0)*t,d=hyp(su-pu,sv-pv);
          if(!best||d<best.d)best={d,b,a0,b0,a1,b1,n,t};}}
      if(best){const{b,a0,b0,a1,b1,n}=best,Lr=hyp(a1-a0,b1-b0),tr=(kind||'').includes('t'),w=tr?sw/2:Math.min(sw/2,Lr/2-.2),t=md||tr?best.t:clamp(best.t,(w+.2)/Lr,1-(w+.2)/Lr);stairs.push(Object.assign(mkStair(b,a0,b0,a1,b1,n,w,t,md||0),{kind:kind||'',td:td||0}));}}
    else if(!C.st){let best=-1,bs=null;for(const b of B){if(!floored(b)||(b[8]||'').includes('d'))continue;for(const[a0,b0,a1,b1,n]of sides4(b)){const Lr=hyp(a1-a0,b1-b0);
        if(Lr<4||!openEdge(b,a0,b0,a1,b1,n))continue;if(Lr>best){best=Lr;bs=mkStair(b,a0,b0,a1,b1,n,Math.min(FH>2?2.2:1.6,Lr*.18),.5,0);}}}
      if(bs)stairs.push(bs);}}
  // each stair is drawn as flights. st[4] (from photos) is a string of letters:
  //   u/U = two flights doubling back at a landing (second flight on the + or - side); l/r = turning left/right at a landing
  //   w = white-painted timber stair (landing on posts); s = stone treads; b = the bottom two steps in brick and a little wider
  //   t = a paved terrace st[5] yd deep, then long low steps with brick nosings (width not limited to the porch edge)
  //   m = a brick walk down the middle of a terrace and its steps
  //   c = brick cheek walls with a pier at the top (instead of handrails); k = black iron handrail (one in the middle with c)
  //   h = sloped clipped-hedge banks either side; e = a pair of tall slim cypresses beside the upper flight
  const ICOt=typeof ICO0!=='undefined'?ICO0:[],blob=(x,y,z,rx,ry,rz,col)=>{for(const[a1,b1,c1]of ICOt){const Pq=v=>[x+v[0]*rx,y+v[1]*ry+ry,z+v[2]*rz];pushTri(out,Pq(a1),Pq(b1),Pq(c1),col);}};
  const wd=(du,dv)=>[du*ca+dv*sa,0,-du*sa+dv*ca],nTri=(A1,B1,C1)=>{const n=nrm(cross(sub(B1,A1),sub(C1,A1)));return n[1]<0?[-n[0],-n[1],-n[2]]:n;};
  for(const st of stairs){const{D,A,w}=st,top=st.fh,kd=st.kind||'',terr=kd.includes('t'),wood=kd.includes('w'),rise=terr?.16:.17,run=terr?.9:.3,
      stepC=terr?hexc('#bdb8ae'):wood?mul(C.trim,.9):kd.includes('s')?C.stone:mul(C.fc,1.06),noseC=C.lc||C.fc,brickC=mul(C.fc,1.02);
    const railC=kd.includes('k')?hexc('#1e1e1e'):C.trim;st.rects=[];
    const flight=(su,sv,D,y0,maxN,pre)=>{let y=y0,d=0;const au=Math.abs(D[0])>.5,st0=[];
      if(pre>0){y-=.15;const cu=su+D[0]*pre/2,cv=sv+D[1]*pre/2,g=Math.min(gAt(su,sv),gAt(su+D[0]*pre,sv+D[1]*pre),gAt(cu,cv))-F,c=P(cu,cv,0),gb=Math.min(g,y)-.3;
        boxO(out,c[0],F+(gb+y)/2,c[2],au?pre/2:w,(y-gb)/2,au?w:pre/2,-a,stepC);if(kd.includes('m'))boxO(out,c[0],F+y+.015,c[2],au?pre/2:1.3,.02,au?1.3:pre/2,-a,noseC);
        for(const sg of[-1,1]){const Aq=[-D[1]*sg,D[0]*sg],o=w+.02,p0=[su+Aq[0]*o,sv+Aq[1]*o],p1=[p0[0]+D[0]*pre,p0[1]+D[1]*pre],g0=gb,g1=gb;
          quadO(out,P(p0[0],p0[1],g0),P(p1[0],p1[1],g1),P(p1[0],p1[1],y+.01),P(p0[0],p0[1],y+.01),noseC,wd(Aq[0],Aq[1]));}
        d=pre;}
      for(let k=0;k<(maxN||60)&&y>-30;k++){const cu=su+D[0]*(d+run/2),cv=sv+D[1]*(d+run/2),g=gAt(cu,cv)-F;if(y-rise<=g+.05)break;y-=rise;st0.push([cu,cv,y,g]);d+=run;}
      st0.forEach(([cu,cv,yy,g],k)=>{const c=P(cu,cv,0),gb=Math.min(g,yy)-.3,bot=kd.includes('b')&&k>=st0.length-2,ww=bot?w+.4:w;
        boxO(out,c[0],F+(gb+yy)/2,c[2],au?run/2:ww,(yy-gb)/2,au?ww:run/2,-a,bot?brickC:stepC);
        if(kd.includes('m'))boxO(out,c[0],F+yy+.015,c[2],au?run/2+.005:1.3,.02,au?1.3:run/2+.005,-a,noseC);
        if(terr){const nu=cu+D[0]*(run/2-.07),nv=cv+D[1]*(run/2-.07),cn=P(nu,nv,0);boxO(out,cn[0],F+yy-.06,cn[2],au?.08:w+.01,.065,au?w+.01:.08,-a,noseC);}});
      const AA=[-D[1],D[0]];st.rects.push({su,sv,D,A:AA,w,len:d});
      const ce=kd.includes('c');
      if(ce&&kd.includes('k')){const tp=P(su,sv,y0+.9),bot=P(su+D[0]*d,sv+D[1]*d,y+.9),nW=wd(AA[0],AA[1]);
        quadO(out,[tp[0],tp[1]-.05,tp[2]],[bot[0],bot[1]-.05,bot[2]],[bot[0],bot[1]+.03,bot[2]],[tp[0],tp[1]+.03,tp[2]],railC,nW);quadO(out,[tp[0],tp[1]-.05,tp[2]],[bot[0],bot[1]-.05,bot[2]],[bot[0],bot[1]+.03,bot[2]],[tp[0],tp[1]+.03,tp[2]],railC,[-nW[0],0,-nW[2]]);
        for(const f of[0,.5,1]){const pp=P(su+D[0]*d*f,sv+D[1]*d*f,0),yy=y0+(y-y0)*f;boxO(out,pp[0],F+yy+.45,pp[2],.03,.45,.03,-a,railC);}}
      if(pre>0&&C.yard!=='none')for(const sg of[-1,1])for(let f=.4;f<pre;f+=.75){const hu=su+AA[0]*(w+.55)*sg+D[0]*f,hv=sv+AA[1]*(w+.55)*sg+D[1]*f,nn=wd(AA[0]*sg,AA[1]*sg);shrubs.push([X(hu,hv),Z(hu,hv),.5,nn[0],nn[2]]);}
      // sides: cheek walls (with a pier at the top), handrails, hedge banks, cypresses
      for(const sg of[-1,1]){const ru=su+AA[0]*(w+.05)*sg,rv=sv+AA[1]*(w+.05)*sg,nW=wd(AA[0]*sg,AA[1]*sg),eu=ru+D[0]*d,ev=rv+D[1]*d;
        if(ce){const g0=gAt(ru,rv)-F,g1=gAt(eu,ev)-F,T0=P(ru,rv,y0+.45),T1=P(eu,ev,y+.45),B0_=P(ru,rv,Math.min(g0,y0)-.3),B1_=P(eu,ev,Math.min(g1,y)-.3);
          const o=[nW[0]*.3,0,nW[2]*.3],Oo=p=>[p[0]+o[0],p[1],p[2]+o[2]];
          quadO(out,B0_,B1_,T1,T0,C.fc,[-nW[0],0,-nW[2]]);quadO(out,Oo(B0_),Oo(B1_),Oo(T1),Oo(T0),C.fc,nW);
          quadO(out,T0,T1,Oo(T1),Oo(T0),mul(C.fc,1.15),[0,1,0]);quadO(out,B1_,T1,Oo(T1),Oo(B1_),mul(C.fc,.95),wd(D[0],D[1]));
          const pc=P(ru+AA[0]*.15*sg+D[0]*.25,rv+AA[1]*.15*sg+D[1]*.25,0);boxO(out,pc[0],F+(Math.min(g0,y0)-.3+y0+1.25)/2,pc[2],.3,(y0+1.25-Math.min(g0,y0)+.3)/2,.3,-a,C.fc);
          boxO(out,pc[0],F+y0+1.3,pc[2],.34,.05,.34,-a,mul(C.stone,1.1));}
        else if(!terr||kd.includes('k')){const tp=P(ru,rv,y0+.9),bot=P(eu,ev,y+.9);
          quadO(out,[tp[0],tp[1]-.06,tp[2]],[bot[0],bot[1]-.06,bot[2]],[bot[0],bot[1]+.03,bot[2]],[tp[0],tp[1]+.03,tp[2]],railC,nW);
          for(let k=0;k<=Math.ceil(d/.9);k++){const f=Math.min(1,k*.9/Math.max(.01,d)),pu=ru+D[0]*d*f,pv=rv+D[1]*d*f,yy=y0+(y-y0)*f,pp=P(pu,pv,yy);boxO(out,pp[0],F+yy+.45,pp[2],.025,.45,.025,-a,railC);}}
        if(kd.includes('h')){const iu=su+AA[0]*(w+(ce?.4:.12))*sg,iv=sv+AA[1]*(w+(ce?.4:.12))*sg,bw=Math.min(4.5,Math.max(2,d*.9)),hc=hexc('#2c4a24'),hc2=hexc('#3a5c2e');
          const ou=iu+AA[0]*bw*sg,ov2=iv+AA[1]*bw*sg,fu=iu+D[0]*d,fv=iv+D[1]*d,Wt=P(iu,iv,y0-.15),Wg=P(iu,iv,gAt(iu,iv)-F-.2),Og=P(ou,ov2,gAt(ou,ov2)-F-.05),Fg=P(fu,fv,gAt(fu,fv)-F-.05);
          triO(out,Wt,Og,Fg,hc2,nTri(Wt,Og,Fg));triO(out,Wt,Wg,Fg,hc,[-nW[0],0,-nW[2]]);triO(out,Wt,Wg,Og,hc,wd(-D[0],-D[1]));
          for(let f=.15;f<.95;f+=.12){const bu=ou+(fu-ou)*f+(D[0]+AA[0]*sg)*.45,bv=ov2+(fv-ov2)*f+(D[1]+AA[1]*sg)*.45,nn=wd(D[0]+AA[0]*sg,D[1]+AA[1]*sg),nl=hyp(nn[0],nn[2]);shrubs.push([X(bu,bv),Z(bu,bv),.3,nn[0]/nl,nn[2]/nl]);}}
        if(kd.includes('e')&&!st.ev){const cu2=su+AA[0]*(w+(ce?1.0:.8))*sg+D[0]*Math.min(d*.45,1.6),cv2=sv+AA[1]*(w+(ce?1.0:.8))*sg+D[1]*Math.min(d*.45,1.6),pp=P(cu2,cv2,gAt(cu2,cv2)-F-.1);
          blob(pp[0],pp[1],pp[2],.42,2.3,.42,hexc('#2b4724'));blob(pp[0],pp[1]+3.2,pp[2],.24,.75,.24,hexc('#2f4e27'));}}
      st.ev=1;
      return{y,d,eu:su+D[0]*d,ev:sv+D[1]*d};};
    const H0=top-(gAt(st.su+D[0]*1.5,st.sv+D[1]*1.5)-F),n1=Math.max(2,Math.round(H0/rise/2));
    if(/[uUlr]/.test(kd)){const f1=flight(st.su,st.sv,D,top,n1),y1=f1.y,lw=2*w,us=kd.includes('U')?-1:1,ut=/[uU]/.test(kd);
      // the landing: a slab on a brick base (on posts for a timber stair), then the second flight
      const lr=ut?(us>0?[0,lw,-w,3*w+.1]:[0,lw,-3*w-.1,w]):[0,lw,-w,w],cu=f1.eu+D[0]*(lr[0]+lr[1])/2+A[0]*(lr[2]+lr[3])/2,cv=f1.ev+D[1]*(lr[0]+lr[1])/2+A[1]*(lr[2]+lr[3])/2,g=gAt(cu,cv)-F,c=P(cu,cv,0),au=Math.abs(D[0])>.5;
      const hx=au?(lr[1]-lr[0])/2:(lr[3]-lr[2])/2,hz=au?(lr[3]-lr[2])/2:(lr[1]-lr[0])/2;
      if(wood){boxO(out,c[0],F+y1-.12,c[2],hx,.12,hz,-a,stepC);boxO(out,c[0],F+y1-.3,c[2],hx+.02,.07,hz+.02,-a,C.trim);
        for(const sx of[-1,1])for(const sz of[-1,1]){const cp=[c[0]+(sx*(hx-.12))*Math.cos(-a)-(sz*(hz-.12))*Math.sin(-a),0,c[2]+(sx*(hx-.12))*Math.sin(-a)+(sz*(hz-.12))*Math.cos(-a)],gp=hAtH(h,cp[0],cp[2]);
          boxO(out,cp[0],(gp+F+y1-.24)/2,cp[2],.1,(F+y1-.24-gp)/2+.05,.1,-a,C.trim);}
        // railing round the landing's open sides
        const L0=[c[0],F+y1,c[2]],sgO=kd.includes('l')?1:-1,outD=ut?[-D[0],-D[1]]:[A[0]*sgO,A[1]*sgO];for(const[ex,ez,lx,lz]of[[hx,0,0,hz],[-hx,0,0,hz],[0,hz,hx,0],[0,-hz,hx,0]]){const sd=[Math.sign(ex),Math.sign(ez)];if(-sd[0]*D[0]-sd[1]*D[1]>.7||sd[0]*outD[0]+sd[1]*outD[1]>.7)continue;const ctr=[L0[0]+ex*Math.cos(-a)-ez*Math.sin(-a),L0[1]+.92,L0[2]+ex*Math.sin(-a)+ez*Math.cos(-a)];
          boxO(out,ctr[0],ctr[1],ctr[2],Math.max(.03,lx),.035,Math.max(.03,lz),-a,C.trim);}}
      else boxO(out,c[0],F+(Math.min(g,y1)-.3+y1)/2,c[2],hx,(y1-Math.min(g,y1)+.3)/2,hz,-a,stepC);
      st.rects.push({su:f1.eu,sv:f1.ev,D,A,w:Math.max(-lr[2],lr[3]),len:lw});
      if(ut)flight(f1.eu+A[0]*(2*w+.1)*us,f1.ev+A[1]*(2*w+.1)*us,[-D[0],-D[1]],y1);
      else{const sg=kd.includes('l')?1:-1;flight(f1.eu+D[0]*w+A[0]*w*sg,f1.ev+D[1]*w+A[1]*w*sg,[A[0]*sg,A[1]*sg],y1);}}
    else flight(st.su,st.sv,D,top,0,terr?(st.td||0):0);
    st.len=st.rects[0].len;}
  // an elliptical "eyebrow" arch in a porch front (CLUBLOOK eb: [u0,v0,u1,v1,spring height,rise,roof pitch] in the model frame):
  // a white arched fascia between two columns with the porch roof swept up over it
  if(C.eb&&C.eb.length>=6){const[u0,v0,u1,v1,sp,rs,pt0]=C.eb,pt=pt0||.45,Lb=hyp(u1-u0,v1-v0),T=[(u1-u0)/Lb,(v1-v0)/Lb];let N=[-T[1],T[0]];if(N[0]*(u0+u1)+N[1]*(v0+v1)<0)N=[-N[0],-N[1]];
    const nw=wd(N[0],N[1]),K=16,pts=[];for(let k=0;k<=K;k++){const s=k/K,y=sp+rs*Math.sqrt(Math.max(0,1-(2*s-1)**2));pts.push([u0+(u1-u0)*s+N[0]*.06,v0+(v1-v0)*s+N[1]*.06,y]);}
    for(let k=0;k<K;k++){const[ua,va,ya]=pts[k],[ub,vb,yb]=pts[k+1];
      quadO(out,P(ua,va,ya-.34),P(ub,vb,yb-.34),P(ub,vb,yb+.04),P(ua,va,ya+.04),C.trim,nw);quadO(out,P(ua,va,ya-.34),P(ub,vb,yb-.34),P(ub,vb,yb+.04),P(ua,va,ya+.04),mul(C.trim,.85),[-nw[0],0,-nw[2]]);
      quadO(out,P(ua,va,ya-.34),P(ub,vb,yb-.34),P(ub-N[0]*.25,vb-N[1]*.25,yb-.34),P(ua-N[0]*.25,va-N[1]*.25,ya-.34),mul(C.trim,.8),[0,-1,0]);
      const da=(ya-sp)/pt+1.2,db=(yb-sp)/pt+1.2,Ba=[ua-N[0]*da,va-N[1]*da,ya+.04+1.2*pt],Bb=[ub-N[0]*db,vb-N[1]*db,yb+.04+1.2*pt];
      const R0=P(ua,va,ya+.04),R1=P(ub,vb,yb+.04),R2=P(Bb[0],Bb[1],Bb[2]),R3=P(Ba[0],Ba[1],Ba[2]),nr=nTri(R0,R1,R2);
      quadO(out,R0,R1,R2,R3,C.roof,nr);quadO(out,P(ua,va,ya-.3),P(ub,vb,yb-.3),P(Bb[0],Bb[1],Bb[2]-.36),P(Ba[0],Ba[1],Ba[2]-.36),mul(C.trim,.78),[-nr[0],-nr[1],-nr[2]]);}}
  const inStair=(u,v,bb)=>stairs.some(st=>(!bb||st.b===bb)&&(st.rects||[]).some(r=>{const du=u-r.su,dv=v-r.sv,along=du*r.D[0]+dv*r.D[1],across=du*r.A[0]+dv*r.A[1];
    return Math.abs(across)<r.w+.4&&along>-1.2&&along<r.len+1.2;}));
  // walls (and posts under open roofs)
  const ext=[];
  for(const b of B){const[t,u0,u1,v0,v1,e,p,cap]=b,fl=b[8]||'',o=ov(b),U0=u0+o,U1=u1-o,V0=v0+o,V1=v1-o;
    if(t[0]==='B'){const g=bayG(b),pts=bayPts(b),open=fl.includes('o'),fb=open&&FH>=.45&&!fl.includes('n')?FH:null;
      if(fb!=null){const c0=P(g.c[0],g.c[1],fb);for(let k=0;k<pts.length-1;k++)triO(out,c0,P(pts[k][0],pts[k][1],fb),P(pts[k+1][0],pts[k+1][1],fb),C.pf,UP);}
      for(let k=0;k<pts.length-1;k++){const[ua,va]=pts[k],[ub,vb]=pts[k+1],n=wN(pts[k],pts[k+1],g),ga=gAt(ua,va)-F,gb=gAt(ub,vb)-F;
        if(!open){q4(P(ua,va,ga-.3),P(ub,vb,gb-.3),P(ub,vb,e-.03),P(ua,va,e-.03),C.wall,n);ext.push([ua,va,ub,vb,n,ga,gb,e,0,0]);continue;}
        if(fb!=null){q4(P(ua,va,ga-.3),P(ub,vb,gb-.3),P(ub,vb,fb-.25),P(ua,va,fb-.25),C.fc,n);q4(P(ua,va,fb-.25),P(ub,vb,fb-.25),P(ub,vb,fb),P(ua,va,fb),C.trim,n);
          if(fb-Math.min(ga,gb)>.6&&!inStair((ua+ub)/2,(va+vb)/2)){q4(P(ua,va,fb+.92),P(ub,vb,fb+.92),P(ub,vb,fb+1.0),P(ua,va,fb+1.0),C.trim,n);q4(P(ua,va,fb+.1),P(ub,vb,fb+.1),P(ub,vb,fb+.16),P(ua,va,fb+.16),C.trim,n);
            const c=P((ua+ub)/2,(va+vb)/2,0);boxO(out,c[0],F+fb+.53,c[2],.025,.38,.025,-a,C.trim);}}
        if(k%2===0){const g0=fb!=null?fb:ga,y=e-.3;if(y-g0>.4){const c=P(ua,va,0);boxO(out,c[0],F+(g0+y)/2,c[2],.12,(y-g0)/2,.12,-a,C.post);}}}
      if(C.yard!=='none')for(let k=0;k<pts.length-1;k+=2){const[ua,va]=pts[k],[ub,vb]=pts[k+1],n=wN(pts[k],pts[k+1],g),on=[n[0]*ca-n[2]*sa,n[0]*sa+n[2]*ca],u=(ua+ub)/2+on[0]*.95,v=(va+vb)/2+on[1]*.95;
        if(!inStair(u,v)&&!B.some(o2=>rh(o2,u,v)>-1e8))shrubs.push([X(u,v),Z(u,v),.6,n[0],n[2]]);}
      continue;}
    const sides=[[U0,V1,U1,V1,nV(1)],[U1,V0,U0,V0,nV(-1)],[U1,V1,U1,V0,nU(1)],[U0,V0,U0,V1,nU(-1)]];
    if(floored(b)){const FH=flH(b),dk=fl.includes('d');if(!dk)q4(P(u0,v0,FH),P(u1,v0,FH),P(u1,v1,FH),P(u0,v1,FH),C.pf,UP);
      for(const[a0,b0,a1,b1,n]of[[u0,v1,u1,v1,nV(1)],[u1,v0,u0,v0,nV(-1)],[u1,v1,u1,v0,nU(1)],[u0,v0,u0,v1,nU(-1)]]){const Lr=hyp(a1-a0,b1-b0),mu=(a0+a1)/2,mv=(b0+b1)/2,on=[n[0]*ca-n[2]*sa,n[0]*sa+n[2]*ca];
        if(Lr<.2||B.some(o2=>o2!==b&&(!(o2[8]||'').includes('o')||floored(o2))&&rh(o2,mu+on[0]*.4,mv+on[1]*.4)>-1e8))continue;   // inside the house or against the next porch
        const m=Math.max(1,Math.round(Lr/1.2));
        for(let k=0;k<m;k++){const t0=k/m,t1=(k+1)/m,ua=a0+(a1-a0)*t0,va=b0+(b1-b0)*t0,ub=a0+(a1-a0)*t1,vb=b0+(b1-b0)*t1,ga=gAt(ua,va)-F,gb=gAt(ub,vb)-F;
          if(FH-.25>Math.min(ga,gb)+.05)q4(P(ua,va,ga-.3),P(ub,vb,gb-.3),P(ub,vb,FH-.25),P(ua,va,FH-.25),!(C.lo>0)&&FH-Math.min(ga,gb)>1.6?C.wall:C.fc,n);
          q4(P(ua,va,FH-.25),P(ub,vb,FH-.25),P(ub,vb,FH),P(ua,va,FH),C.trim,n);
          // railing where the floor stands well above the ground, except at the stair
          const um=(ua+ub)/2,vm=(va+vb)/2;if(!dk&&FH-Math.min(ga,gb)>.6&&!inStair(um+on[0]*.3,vm+on[1]*.3,b)){const o3=.06,R_=(u,v,y)=>{const pp=P(u-on[0]*o3,v-on[1]*o3,y);return pp;};
            q4(R_(ua,va,FH+.92),R_(ub,vb,FH+.92),R_(ub,vb,FH+1.0),R_(ua,va,FH+1.0),C.trim,n);q4(R_(ua,va,FH+.1),R_(ub,vb,FH+.1),R_(ub,vb,FH+.16),R_(ua,va,FH+.16),C.trim,n);
            for(let j=0;j<3;j++){const f=(j+.5)/3,c=R_(ua+(ub-ua)*f,va+(vb-va)*f,0);boxO(out,c[0],F+FH+.53,c[2],.025,.38,.025,-a,C.trim);}}}
        if(C.ar&&FH-Math.min(gAt(a0,b0),gAt(a1,b1))+F>1.8)arches([a0,b0],[a1,b1],n,gAt(a0,b0)-F,gAt(a1,b1)-F,FH-.25,2.4);
        else if(FH>1.2){const np=Math.max(1,Math.round(Lr/2.4));for(let k=0;k<np;k++){const t0=(k+.18)/np,t1=(k+.82)/np,ua=a0+(a1-a0)*t0,va=b0+(b1-b0)*t0,ub=a0+(a1-a0)*t1,vb=b0+(b1-b0)*t1,g=Math.max(gAt(ua,va),gAt(ub,vb))-F,o4=.03;
          if(FH-.45-g<.4)continue;const W=(u,v,y)=>{const pp=P(u,v,y);return[pp[0]+n[0]*o4,pp[1],pp[2]+n[2]*o4];};q4(W(ua,va,g+.1),W(ub,vb,g+.1),W(ub,vb,FH-.45),W(ua,va,FH-.45),!(C.lo>0)&&FH-g>1.6?C.glass:mul(C.fc,.45),n);}}}}
    if(fl.includes('o')||fl.includes('d')){const base=floored(b)?flH(b):null;if(!(floored(b)&&fl.includes('d')))for(const[a0,b0,a1,b1,n]of sides){const Lr=hyp(a1-a0,b1-b0),m=Math.max(1,Math.round(Lr/3.2));
        for(let k=0;k<=m;k++){const u=a0+(a1-a0)*k/m,v=b0+(b1-b0)*k/m;if(inBlk(u,v,b))continue;const g=base!=null?base:gAt(u,v)-F,y=(fl.includes('d')?e:rh(b,u,v))-.3;if(y-g<.4)continue;
          boxO(out,X(u,v),F+(g+y)/2,Z(u,v),.11,(y-g)/2,.11,-a,fl.includes('d')?C.trim:C.post);}}
      // foundation shrubs along the porch skirt
      if(floored(b)&&C.yard!=='none')for(const[a0,b0,a1,b1,n]of[[u0,v1,u1,v1,nV(1)],[u1,v0,u0,v0,nV(-1)],[u1,v1,u1,v0,nU(1)],[u0,v0,u0,v1,nU(-1)]]){const Lr=hyp(a1-a0,b1-b0),on=[n[0]*ca-n[2]*sa,n[0]*sa+n[2]*ca];
        for(let d=1.2;d<Lr-1;d+=2.3){const u=a0+(a1-a0)*d/Lr+on[0]*.9,v=b0+(b1-b0)*d/Lr+on[1]*.9;if(inStair(u,v)||B.some(o2=>rh(o2,u,v)>-1e8))continue;shrubs.push([X(u,v),Z(u,v),Math.min(.85,.45+(flH(b)-(gAt(u,v)-F))*.18),n[0],n[2]]);}}
      continue;}
    for(const[a0,b0,a1,b1,n]of sides){const Lr=hyp(a1-a0,b1-b0);if(Lr<.05)continue;const ts=[0,1];const ns=Math.max(1,Math.round(Lr/2));for(let k=1;k<ns;k++)ts.push(k/ns);
      // breakpoints where the roof line kinks (gable peaks, ridge ends)
      for(const s of[(u0+u1)/2,(v0+v1)/2]){const tt=Math.abs(a1-a0)>1e-6?(s-a0)/(a1-a0):(s-b0)/(b1-b0);if(tt>0&&tt<1)ts.push(tt);}
      const rr=Math.max(0,p>0?(cap-e)/p:0);for(const d of[rr,-rr])for(const s of[(Math.abs(a1-a0)>1e-6?(u0+u1)/2:(v0+v1)/2)+d]){const tt=Math.abs(a1-a0)>1e-6?(s-a0)/(a1-a0):(s-b0)/(b1-b0);if(tt>0&&tt<1)ts.push(tt);}
      ts.sort((x,y)=>x-y);
      for(let k=0;k<ts.length-1;k++){const t0=ts[k],t1=ts[k+1];if(t1-t0<1e-4)continue;const ua=a0+(a1-a0)*t0,va=b0+(b1-b0)*t0,ub=a0+(a1-a0)*t1,vb=b0+(b1-b0)*t1;
        const ya=rh(b,ua,va),yb=rh(b,ub,vb),ga=gAt(ua,va)-F-.3,gb=gAt(ub,vb)-F-.3;if(ya<-1e8||yb<-1e8)continue;
        q4(P(ua,va,ga),P(ub,vb,gb),P(ub,vb,yb-.03),P(ua,va,ya-.03),t==='C'?C.ch:C.wall,n);
        const um=(ua+ub)/2+(n[0]*ca-n[2]*sa)*.7,vm=(va+vb)/2+(n[0]*sa+n[2]*ca)*.7;
        ext.push([ua,va,ub,vb,n,ga+.3,gb+.3,Math.min(ya,yb),inBlk(um,vm,b)||t==='C'||b===clockB?1:0,t===`T`?1:0]);}
      // eave trim
      if(t!=='T'&&t!=='C')q4(P(a0,b0,rh(b,a0,b0)-.32),P(a1,b1,rh(b,a1,b1)-.32),P(a1,b1,rh(b,a1,b1)-.02),P(a0,b0,rh(b,a0,b0)-.02),C.trim,n);}}
  // dressing: plinth, siding courses, windows per storey on walls that face open air
  const eaves=[];
  for(const[ua,va,ub,vb,n,g0,g1,yt,hid,tw]of ext){const Lr=hyp(ub-ua,vb-va),o=.035,Q=(t,y)=>{const p_=P(ua+(ub-ua)*t,va+(vb-va)*t,y);return[p_[0]+n[0]*o,p_[1],p_[2]+n[2]*o];};
    if(hid)continue;const gl=Math.max(g0,g1),gm=Math.min(g0,g1);if(!tw)eaves.push(yt);
    // the foundation shows from the ground up to the main floor (where the ground falls more than 1.6 yd below the floor the wall is a
    // walk-out storey in the house's own material, as at True Blue, unless the look has a brick ground storey)
    const walk=FH-gl>1.6&&!(C.lo>0),ft=walk?gl+C.plinth:Math.max(gl+C.plinth,FH+.08);if(!tw&&yt-gm>1.5&&ft>gm-.1)q4(Q(0,g0-.3),Q(1,g1-.3),Q(1,Math.max(g1,ft)),Q(0,Math.max(g0,ft)),C.fc,n);
    // a brick or stone ground storey, then the wall material: lap or log courses, battens, stone coursing or tudor timbers
    const yb=C.lo>0?Math.max(C.lo,ft):ft;if(C.lo>0&&yb>gm+.5)q4(Q(0,g0-.3),Q(1,g1-.3),Q(1,Math.max(g1,yb)),Q(0,Math.max(g0,yb)),C.lc,n);
    const lowS=C.ar&&C.lo>0&&!tw&&C.lo-gl>1.8;if(lowS)arches([ua,va],[ub,vb],n,g0,g1,C.lo,2.4);
    if(C.yard!=='none'&&!tw&&Lr>1.6)for(let d=.9;d<Lr-.6;d+=2.3){const on=[n[0]*ca-n[2]*sa,n[0]*sa+n[2]*ca],u=ua+(ub-ua)*d/Lr+on[0]*.95,v=va+(vb-va)*d/Lr+on[1]*.95;
      if(inStair(u,v)||B.some(o2=>rh(o2,u,v)>-1e8))continue;shrubs.push([X(u,v),Z(u,v),Math.min(.85,.45+Math.max(0,ft-(gAt(u,v)-F))*.2),n[0],n[2]]);}
    if(C.lines&&yt-gl>1)for(let y=Math.max(gl,yb)+C.lines;y<yt-.4;y+=C.lines)q4(Q(0,y),Q(1,y),Q(1,y+(C.mat==='log'?.08:.04)),Q(0,y+(C.mat==='log'?.08:.04)),C.line,n);
    if((C.mat==='board'||C.mat==='tudor')&&yt-gl>1){const nb=Math.max(1,Math.round(Lr/(C.mat==='tudor'?1.4:.75))),w=(C.mat==='tudor'?.08:.04)/Lr,y0=Math.max(gl,yb),col=C.mat==='tudor'?C.tc:C.line;
      for(let k=0;k<nb;k++){const t=(k+.5)/nb;q4(Q(t-w,y0),Q(t+w,y0),Q(t+w,yt-.3),Q(t-w,yt-.3),col,n);}
      if(C.mat==='tudor'){const ym=y0+(yt-y0)*.45;q4(Q(0,ym),Q(1,ym),Q(1,ym+.14),Q(0,ym+.14),col,n);q4(Q(0,y0),Q(1,y0),Q(1,y0+.16),Q(0,y0+.16),col,n);}}
    if(Lr<1.3)continue;const nw=Math.max(1,Math.floor(Lr/2.3));
    for(let fy=tw?yt-1.6:lowS?C.lo+.7:walk?gl+.95:Math.max(gl+.95,FH+.9);fy+1.0<yt-.3;fy+=3.3){const wh=Math.min(1.5,yt-.35-fy);if(wh<.7)break;
      for(let k=0;k<nw;k++){const t=(k+.5)/nw,hw=Math.min(.55,Lr/nw*.3)/Lr;q4(Q(t-hw-.05/Lr,fy-.08),Q(t+hw+.05/Lr,fy-.08),Q(t+hw+.05/Lr,fy+wh+.08),Q(t-hw-.05/Lr,fy+wh+.08),C.frame,n);
        const o2=.05,R2=(tt,y)=>{const p_=P(ua+(ub-ua)*tt,va+(vb-va)*tt,y);return[p_[0]+n[0]*o2,p_[1],p_[2]+n[2]*o2];};q4(R2(t-hw,fy),R2(t+hw,fy),R2(t+hw,fy+wh),R2(t-hw,fy+wh),C.glass,n);}}}
  eaves.sort((x,y)=>x-y);return{F,eave:F+(eaves.length?eaves[eaves.length>>1]:3),shrubs};}
function bldDraw(h,q,out,ST,simple){let p=q.pts.slice();if(p.length<3)return;const A=Math.abs(polyArea(p));if(A<8)return;
  const rec=q.rec||null,kind=q.bk||null,club=!!q.club,ex=!!(rec||kind),gh=(q.gh||0)-.2,hs=Math.abs(Math.round(q.x*7.3+q.y*13.1))%9973;
  let H1,rise=null,rt=2;
  if(rec){H1=Math.max(2.2,+rec[0]||0)+.2;rise=Math.max(0,+rec[1]||0);rt=clamp(rec[2]|0,0,2);if(rt&&rise<.3)rt=0;}
  else if(kind){H1=kind==='shack'?2.7:kind==='barn'?4.4:4.2;if(kind!=='building'){rt=1;rise=kind==='shack'?1.1:.9;}if(q.wbarn){H1=5;rise=3.4;}}
  else H1=q.h||(club?(A>900?7.2:4.6):4.2);
  let LK=club?(CLUBLOOK[CUR.id]||(CUR.data&&CLUBLOOK[CUR.data])||null):null;
  // a clubhouse measured from lidar draws its own walls and roof (blockMass); the look's extra massing (gables, towers, porches) is in the survey already
  const LD=!simple&&club?lidOf(q,h):null;if(LD&&LK)LK=Object.assign({},LK,{xg:0,eg:0,tw:0,cu:0,ch:0,dm:0,oct:0,pc:0,po:0,bal:0,clk:0,v:'none',lo:0,ga:0,gb:0});
  if(LK&&LK.fl)rt=0;
  if(LK&&LK.eh)H1=Math.max(H1,LK.eh+.2);if(LK&&LK.rs!=null&&rt)rise=LK.rs;
  // on a slope the walls still clear the high side of the footprint
  {let g1=-1e9;for(const c of p)g1=Math.max(g1,hAtH(h,c[0],c[1]));if(isFinite(g1))H1=Math.max(H1,g1-gh+2);}
  // gables (and measured hips) are drawn on the footprint's rectangle when the footprint fills most of it
  let ob=null,rect=false;
  if(ex||simple||club){ob=bldOBB(p,rec&&rt&&rec[3]!=null&&isFinite(rec[3])?rec[3]*Math.PI/180:null);
    if(A/ob.ar>=.8&&((ex&&rt)||simple))rect=true;}
  if(LK&&LK.gb&&rect&&rt===2)rt=1;const rt0=rt;if(rt===1&&!rect)rt=2;
  const wings=!simple&&rt>0&&!rect&&(club||ex||A>150)&&ob&&!(LK&&LK.oct)?bldWings(q,p,ob):null;
  const P2=(u,v)=>[u*ob.ux-v*ob.uy,u*ob.uy+v*ob.ux];
  if(rect)p=[P2(ob.u0,ob.v0),P2(ob.u1,ob.v0),P2(ob.u1,ob.v1),P2(ob.u0,ob.v1)];else if(simple&&p.length>6)p=bldSimplify(p,1);
  // clockwise footprints only: the mesh is single-sided and walls must face out (mapped footprints come in both windings)
  if(polyArea(p)>0)p=p.slice().reverse();const s=-1;
  // the longest wall: where a club's entry canopy, a shack's serving window or a barn's doors go; of the long walls, the one facing a target
  let bi=0,bl=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],l=hyp(b[0]-a[0],b[1]-a[1]);if(l>bl){bl=l;bi=i;}}
  const faceTo=(tx,ty,minL,skip)=>{let r=-1,bs=-1e9;for(let i=0;i<p.length;i++){if(i===skip)continue;const a=p[i],b=p[(i+1)%p.length],l=hyp(b[0]-a[0],b[1]-a[1]);if(l<minL)continue;const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dl=hyp(tx-mx,ty-my)||1;
      const sc=((b[1]-a[1])*s*(tx-mx)-(b[0]-a[0])*s*(ty-my))/l/dl;if(sc>bs){bs=sc;r=i;}}return r;};
  const holePt=()=>{const L0=h.line||[[0,0]];let tx=L0[0][0],ty=L0[0][1],td=1e9;for(const c of L0){const d=hyp(c[0]-q.x,c[1]-q.y);if(d<td){td=d;tx=c[0];ty=c[1];}}return[tx,ty];};
  let pi=-1;const doors=[];   // [wall, t, half width]: no windows there
  if(!simple){
    if(kind==='shack'||kind==='barn'){const[tx,ty]=holePt(),k=faceTo(tx,ty,bl*.85,-1);if(k>=0)bi=k;}
    else if(club){
      // entry toward the nearest parking lot, porch toward the course
      let lot=null,ld=260;if(CUR.surr)for(const P0 of CUR.surr.polys.park||[]){let cx=0,cy=0;for(const c of P0){cx+=c[0];cy+=c[1];}cx=cx/P0.length-h.T0[0];cy=cy/P0.length-h.T0[1];const d=hyp(cx-q.x,cy-q.y);if(d<ld){ld=d;lot=[cx,cy];}}
      // entry: toward the lot (or away from the course), never out over water; porch toward the course
      const[tx,ty]=holePt(),wetAt=(x,y)=>h.water.some(w=>inPoly(w,x,y)),dryOut=k=>{const a=p[k],b=p[(k+1)%p.length],l=hyp(b[0]-a[0],b[1]-a[1])||1,nx=(b[1]-a[1])/l*s,nz=-(b[0]-a[0])/l*s,mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2;return!wetAt(mx+nx*6,mz+nz*6)&&!wetAt(mx+nx*2.5,mz+nz*2.5);};
      const pick=(x,y,minL,skip)=>{let r=-1,bs=-1e9;for(let i=0;i<p.length;i++){if(i===skip||!dryOut(i))continue;const a=p[i],b=p[(i+1)%p.length],l=hyp(b[0]-a[0],b[1]-a[1]);if(l<minL)continue;const mx=(a[0]+b[0])/2,my=(a[1]+b[1])/2,dl=hyp(x-mx,y-my)||1,sc=((b[1]-a[1])*s*(x-mx)-(b[0]-a[0])*s*(y-my))/l/dl;if(sc>bs){bs=sc;r=i;}}return r;};
      if(lot){const k=pick(lot[0],lot[1],bl*.5,-1);if(k>=0)bi=k;pi=faceTo(tx,ty,Math.min(bl*.5,9),bi);}
      else{pi=faceTo(tx,ty,Math.min(bl*.5,9),-1);const k=pick(2*q.x-tx,2*q.y-ty,bl*.4,pi);if(k>=0)bi=k;if(pi===bi)pi=-1;}
      if(LK&&LK.xg){const k=faceTo(tx,ty,bl*.6,bi);if(k>=0)pi=k;}
      doors.push([bi,.5,1.6]);if(pi>=0)doors.push([pi,.5,Math.min(5,hyp(p[(pi+1)%p.length][0]-p[pi][0],p[(pi+1)%p.length][1]-p[pi][1])*.25)]);}
    else if(ex)doors.push([bi,.5,.75]);}
  // colours: the course style for clubs and course buildings, a photo roof colour when there is one, walls chosen to suit it
  let wall=hexc(club||kind==='shack'?ST.wall:'#cfc8bb'),roof=hexc(club||kind==='shack'?ST.roof:'#57524c');
  if(kind==='barn'){wall=hexc(BLD_BARNW[hs%5]);roof=hexc('#6d706f');}
  if(q.wbarn){wall=hexc('#f3f1ea');roof=hexc('#3b3d3f');}
  if(ex&&rt===0)roof=hexc('#8d8b86');
  if(rec&&rec[4]!=null&&isFinite(rec[4])){roof=bldRoofCol(rec[4]);const lr=BLD_LUM(roof);
    if(!club&&!kind)wall=hexc(lr<.55?BLD_LIGHTW[hs%5]:BLD_DARKW[hs%5]);
    else if(Math.abs(BLD_LUM(wall)-lr)<.12)wall=hexc(lr<.5?BLD_LIGHTW[hs%5]:BLD_DARKW[hs%5]);}
  if(LK){wall=hexc(LK.w);if(LK.r)roof=hexc(LK.r);else if(rt===0)roof=hexc('#8d8b86');}
  const stone=hexc(LK&&LK.s||ST.stone),trim=hexc(LK&&LK.t||ST.trim),glass=hexc('#2b3a46'),fancy=(ex||club)&&kind!=='barn'&&!simple,frame=LK?trim:club?mul(trim,1.15):BLD_LUM(wall)<.62?hexc('#ece9e2'):hexc('#5f5a52');
  const flat=(ex||LK&&LK.fl)&&rt===0,Htop=flat?H1+.45:H1,plinth=LK?(LK.b!=null?LK.b:.5):kind&&kind!=='building'?.3:club?1.1:.5;
  let rows=[];if(!simple&&kind!=='shack'&&kind!=='barn'){if(!ex)rows=H1>6?[[1.8,3.3],[4.6,6.1]]:[[1.6,3.1]];else for(let y=club?1.8:1.5;y+1.5<H1-.3&&rows.length<6;y+=3.1)rows.push([y,y+1.5]);
    if(!rows.length&&H1>2.5)rows.push([Math.max(plinth+.25,.9),Math.min(H1-.55,2.6)]);}
  if(LD){const MM=LK&&LK.m,ln=MM==='siding'?.42:MM==='log'?.38:MM==='brick'?.5:0;
    const LK0=club?(CLUBLOOK[CUR.id]||(CUR.data&&CLUBLOOK[CUR.data])||{}):{};
    const LDr=blockMass(h,q,out,LD,{wall:MM==='stone'?mul(wall,.84):wall,roof,trim,stone,glass,frame,flat:hexc('#9d9a93'),deck:hexc('#b0a48e'),post:LK0.c?hexc(LK0.c):trim,plinth:Math.min(plinth,1.2),
      lines:MM==='stone'?.55:ln,line:mul(wall,MM==='log'?.68:MM==='brick'?.86:MM==='stone'?.78:.83),mat:MM,tc:hexc(LK0.tc||LK0.t||'#3e2e24'),lo:LK0.lo||0,lc:hexc(LK0.lc||'#8a6a58'),clk:LK0.clk,ch:LK0.ch?hexc(LK0.ch):mul(stone,.9),
      fh:LK0.fh||0,fc:LK0.fc?hexc(LK0.fc):LK0.lo?hexc(LK0.lc||'#8a6a58'):stone,pf:hexc(LK0.pf||'#a39c90'),ar:LK0.ar,yard:LK0.yard,eb:LK0.eb});
    H1=Math.max(2.4,LDr.eave-gh);q._shr=LDr.shrubs;}
  // walls: stone plinth, siding, a trim band under the eave (or the parapet coping), rows of windows
  if(!LD)for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length],ex2=b[0]-a[0],ez=b[1]-a[1],L=hyp(ex2,ez);if(L<.2)continue;
    const n=[ez/L*s,0,-ex2/L*s];
    // a side wing in its own material (Hazeltine's grey board-and-batten wings beside the stone main block)
    const sideW=!!(LK&&LK.wg&&wings&&ob&&(()=>{const mx=(a[0]+b[0])/2,mz=(a[1]+b[1])/2,u=mx*ob.ux+mz*ob.uy,v=mz*ob.ux-mx*ob.uy,w=wings[0];return u<w[0]-1.2||u>w[1]+1.2||v<w[2]-1.2||v>w[3]+1.2;})()),WL=sideW?hexc(LK.wg.w):wall;
    const wq=(y0,y1,col,o=0)=>{const A0=[a[0]+n[0]*o,gh+y0,a[1]+n[2]*o],B0=[b[0]+n[0]*o,gh+y0,b[1]+n[2]*o],B1=[b[0]+n[0]*o,gh+y1,b[1]+n[2]*o],A1=[a[0]+n[0]*o,gh+y1,a[1]+n[2]*o];pushTri(out,A0,B0,B1,col,n,n,n);pushTri(out,A0,B1,A1,col,n,n,n);};
    if(simple){wq(0,Htop,WL);continue;}
    const MM=sideW&&LK.wg.m||(LK&&LK.m),M=MM;wq(0,plinth,stone,.12);wq(plinth,Htop,M==='stone'?mul(WL,.84):WL);wq(Htop-.35,Htop,trim,.05);
    const rq=(t0,t1,y0,y1,col,o)=>{const A0=[a[0]+ex2*t0+n[0]*o,gh+y0,a[1]+ez*t0+n[2]*o],B0=[a[0]+ex2*t1+n[0]*o,gh+y0,a[1]+ez*t1+n[2]*o],B1=[B0[0],gh+y1,B0[2]],A1=[A0[0],gh+y1,A0[2]];pushTri(out,A0,B0,B1,col,n,n,n);pushTri(out,A0,B1,A1,col,n,n,n);};
    // the clubhouse's own walls: a brick or stone ground storey, then lap siding, board and batten, logs, stone, brick or tudor timbers
    if(LK&&!simple){const lo=LK.lo?Math.min(LK.lo,Htop-1):0,yb=Math.max(plinth,lo),yt=Htop-.35;
      if(lo>plinth){wq(plinth,lo,hexc(LK.lc),.015);wq(lo-.12,lo,trim,.035);
        // arched openings in a raised ground storey (dark doors/vents, or a glass arcade)
        if(LK.ar&&lo-plinth>1.3&&L>3){const na=Math.max(1,Math.floor(L/2.8)),aw=Math.min(.75,L/na*.32),y0=plinth+.12,y1=lo-.35-aw,ac=LK.ar==='glass'?mul(glass,1.3):hexc('#2a2622');
          for(let k=0;k<na;k++){const t=(k+.5)/na,cx=a[0]+ex2*t,cz=a[1]+ez*t,ux=ex2/L,uz=ez/L,o=.05,P_=(du,y)=>[cx+ux*du+n[0]*o,gh+y,cz+uz*du+n[2]*o];
            quadO(out,P_(-aw,y0),P_(aw,y0),P_(aw,y1),P_(-aw,y1),ac,n);for(let j=0;j<6;j++){const a1=Math.PI*j/6,a2=Math.PI*(j+1)/6;triO(out,P_(0,y1),P_(Math.cos(a1)*aw,y1+Math.sin(a1)*aw),P_(Math.cos(a2)*aw,y1+Math.sin(a2)*aw),ac,n);}
            if(LK.ar==='glass'){const P2_=(du,y)=>[cx+ux*du+n[0]*.07,gh+y,cz+uz*du+n[2]*.07];quadO(out,P2_(-.04,y0),P2_(.04,y0),P2_(.04,y1+aw),P2_(-.04,y1+aw),trim,n);}}}}
      if(MM==='siding'||MM==='log'||MM==='brick'){const st=M==='log'?.38:M==='brick'?.5:.42,hh=M==='log'?.08:M==='brick'?.025:.045,c=mul(WL,M==='log'?.68:M==='brick'?.86:.83);for(let y=yb+st;y<yt-.1;y+=st)rq(0,1,y,y+hh,c,.025);}
      else if(M==='board'){const nb=Math.max(1,Math.floor(L/.75)),w=.05/L,c=mul(WL,.8);for(let k=0;k<nb;k++){const t=(k+.5)/nb;rq(t-w,t+w,yb,yt,c,.025);}}
      else if(M==='stone'){let r=0;for(let y=yb;y<yt-.2;y+=.55,r++){const y1=Math.min(yt,y+.49);for(let u=(r&1)*-.55;u<L;u+=1.1){const t0=Math.max(0,u+.04)/L,t1=Math.min(L,u+1.06)/L;if(t1<=t0)continue;const hv=((Math.round(u*7)+r*13+hs)%7)/7;rq(t0,t1,y,y1,mul(WL,.95+hv*.1),.02);}}}
      else if(M==='tudor'){const tc=hexc(LK.tc||LK.t),nb=Math.max(1,Math.round(L/1.4)),w=.08/L,ym=yb+(yt-yb)*.45;rq(0,1,yb,yb+.16,tc,.025);rq(0,1,ym,ym+.14,tc,.025);
        for(let k=0;k<=nb;k++){const t=k/nb;rq(Math.max(0,t-w),Math.min(1,t+w),yb,yt,tc,.025);}
        for(let k=0;k<nb;k+=2){const t0=k/nb,t1=Math.min(1,(k+1)/nb);if(yt-ym>1.2)quadO(out,[a[0]+ex2*t0+n[0]*.028,gh+ym+.14,a[1]+ez*t0+n[2]*.028],[a[0]+ex2*(t0+w*2)+n[0]*.028,gh+ym+.14,a[1]+ez*(t0+w*2)+n[2]*.028],[a[0]+ex2*t1+n[0]*.028,gh+yt,a[1]+ez*t1+n[2]*.028],[a[0]+ex2*(t1-w*2)+n[0]*.028,gh+yt,a[1]+ez*(t1-w*2)+n[2]*.028],tc,n);}}}
    // corner boards
    if(fancy&&L>1.2){const c=.26/L;rq(0,c,plinth,Htop-.35,frame,.045);rq(1-c,1,plinth,Htop-.35,frame,.045);}
    const nw=Math.floor(L/(club?3.2:3.8)),dz=doors.filter(d=>d[0]===i);
    for(let k=0;k<nw;k++){const t=(k+.5)/nw,cx=a[0]+ex2*t,cz=a[1]+ez*t,hw=club?.75:.6,ux=ex2/L*hw,uz=ez/L*hw;
      for(const[y0,y1]of rows){if(y1>H1-.3)continue;if(LK&&LK.ar&&LK.lo&&y0<LK.lo)continue;if(y0<3&&dz.some(d=>Math.abs(t-d[1])*L<d[2]+hw+.35))continue;const o=.06,P0=[cx-ux+n[0]*o,gh+y0,cz-uz+n[2]*o],P1=[cx+ux+n[0]*o,gh+y0,cz+uz+n[2]*o],P2=[cx+ux+n[0]*o,gh+y1,cz+uz+n[2]*o],P3=[cx-ux+n[0]*o,gh+y1,cz-uz+n[2]*o];
        if(fancy){const fw=(hw+.13)/L;rq(t-fw,t+fw,y0-.16,y1+.13,frame,.045);if(club)rq(t-.04/L,t+.04/L,y0,y1,frame,.075);
          if(LK&&LK.aw&&y0<3){const ac=hexc(LK.aw),fw2=(hw+.25)/L,A0=[a[0]+ex2*(t-fw2)+n[0]*.05,gh+y1+.45,a[1]+ez*(t-fw2)+n[2]*.05],B0=[a[0]+ex2*(t+fw2)+n[0]*.05,gh+y1+.45,a[1]+ez*(t+fw2)+n[2]*.05],B1=[B0[0]+n[0]*.95,gh+y1-.2,B0[2]+n[2]*.95],A1=[A0[0]+n[0]*.95,gh+y1-.2,A0[2]+n[2]*.95];
            let nn=nrm(cross(sub(B0,A0),sub(A1,A0)));if(nn[1]<0)nn=mul(nn,-1);quadO(out,A0,B0,B1,A1,ac,nn);quadO(out,A0,B0,B1,A1,mul(ac,.75),mul(nn,-1));
            for(const P of[[A1,B1]])quadO(out,P[0],P[1],[P[1][0],P[1][1]-.22,P[1][2]],[P[0][0],P[0][1]-.22,P[0][2]],mul(ac,.9),n);}   // canvas awning with a valance
          if(LK&&LK.sh){const sc=hexc(LK.sh),sw=.5/L;rq(t-fw-sw,t-fw-.03/L,y0-.1,y1+.08,sc,.05);rq(t+fw+.03/L,t+fw+sw,y0-.1,y1+.08,sc,.05);}}
        pushTri(out,P0,P1,P2,glass,n,n,n);pushTri(out,P0,P2,P3,glass,n,n,n);}}}
  const shadeOf=nf=>.82+.18*Math.max(0,dot3(nf,nrm([-.5,.6,.6])));
  const slope=(a,b,c,d,under)=>{let nn=nrm(cross(sub(b,a),sub(d,a)));if(nn[1]<0)nn=mul(nn,-1);quadO(out,a,b,c,d,mul(roof,shadeOf(nn)),nn);if(under)quadO(out,a,b,c,d,mul(trim,.8),mul(nn,-1));};
  let top=null,peak=null;   // points on the roof for the club's chimney and cupola
  const chim=LK&&LK.ch?hexc(LK.ch):stone;
  if(LD){}else if(wings){
    // each wing gets its own roof: ridge along its long side, a rise to suit its width (the measured rise on the main wing), hips or gables;
    // the wings' roofs run into each other the way a real clubhouse's cross wings do
    const yE=gh+H1-.05,o=.6,w0=wings[0],sh0=Math.min(w0[1]-w0[0],w0[3]-w0[2]),R0=rise!=null?rise:(club?.62:.7)*Math.min(club?7:4.5,sh0/2);
    const R3w=(u,v,y)=>{const c=P2(u,v);return[c[0],y,c[1]];},gab=rt0===1||(LK&&LK.gb);
    wings.forEach((w,k)=>{let[u0,u1,v0,v1]=w;const along=u1-u0>=v1-v0,L2=along?u1-u0:v1-v0,S2=along?v1-v0:u1-u0,rs=Math.max(.8,Math.min(R0*S2/sh0,R0*1.05,S2*(LK&&LK.rp||.42))),yR=yE+rs;
      const Q=(a,b)=>along?[a,b]:[b,a];   // (along, across) -> (u, v)
      const a0=(along?u0:v0)-o,a1=(along?u1:v1)+o,c0=(along?v0:u0)-o,c1=(along?v1:u1)+o,cm=(c0+c1)/2,hh=(c1-c0)/2,P_=(a,c,y)=>{const q2=Q(a,c);return R3w(q2[0],q2[1],y);};
      if((gab&&(k===0||(LK&&LK.ga)))||(LK&&LK.ag)){slope(P_(a0,c0,yE),P_(a1,c0,yE),P_(a1,cm,yR),P_(a0,cm,yR),true);slope(P_(a1,c1,yE),P_(a0,c1,yE),P_(a0,cm,yR),P_(a1,cm,yR),true);
        for(const[a,sg]of[[a0+o,-1],[a1-o,1]]){const nn=along?[ob.ux*sg,0,ob.uy*sg]:[-ob.uy*sg,0,ob.ux*sg];triO(out,P_(a,c0+o,yE+.05),P_(a,c1-o,yE+.05),P_(a,cm,yR-.1),mul(wall,.96),nn);
          // A-frame wing ends in glass (The Pines): a big triangular window from the eave to the peak, with dark mullions
          if(LK&&LK.ag){const dx=sg*.06,gl=mul(glass,1.4),mc=hexc(LK.t||'#2e2620'),i0=c0+o+.5,i1=c1-o-.5,yt=yR-.6,yb=gh+Math.max(plinth,.4)+.2,Pg=(c,y)=>P_(a+dx,c,y);
            quadO(out,Pg(i0,yb),Pg(i1,yb),Pg(i1,yE),Pg(i0,yE),gl,nn);triO(out,Pg(i0,yE),Pg(i1,yE),Pg(cm,yt),gl,nn);
            const P2g=(c,y)=>P_(a+dx*1.6,c,y),nm=Math.max(2,Math.round((i1-i0)/1.4));for(let j=1;j<nm;j++){const c=i0+(i1-i0)*j/nm,top=yE+(yt-yE)*(1-Math.abs(c-cm)/((i1-i0)/2));quadO(out,P2g(c-.06,yb),P2g(c+.06,yb),P2g(c+.06,top),P2g(c-.06,top),mc,nn);}
            for(const y of[yE-.1,(yb+yE)/2])quadO(out,P2g(i0,y-.06),P2g(i1,y-.06),P2g(i1,y+.06),P2g(i0,y+.06),mc,nn);}}}
      else{let r0=a0+hh,r1=a1-hh;if(r0>r1)r0=r1=(a0+a1)/2;
        slope(P_(a0,c0,yE),P_(a1,c0,yE),P_(r1,cm,yR),P_(r0,cm,yR),true);slope(P_(a1,c1,yE),P_(a0,c1,yE),P_(r0,cm,yR),P_(r1,cm,yR),true);
        for(const[a,b,c]of[[P_(a0,c1,yE),P_(a0,c0,yE),P_(r0,cm,yR)],[P_(a1,c0,yE),P_(a1,c1,yE),P_(r1,cm,yR)]]){let nn=nrm(cross(sub(b,a),sub(c,a)));if(nn[1]<0)nn=mul(nn,-1);triO(out,a,b,c,mul(roof,shadeOf(nn)),nn);triO(out,a,b,c,mul(trim,.8),mul(nn,-1));}}
      if(k===0){top=P_(a0+(a1-a0)*.78,cm,yR);peak=P_((a0+a1)/2,cm,yR);
        // dormers along both long slopes of the main wing
        if(club&&LK&&LK.dm){const nd=Math.min(LK.dm,Math.max(1,Math.floor((L2-6)/4.5)));for(const sd of[-1,1])for(let j=0;j<nd;j++){const a=a0+o+(L2)*(j+.5)/nd,cE=sd<0?c0+o:c1-o,cin=cE-sd*Math.min(hh*.55,2.4),yb=yE+rs*(1-Math.abs(cin-cm)/hh)*.05+.15,
          yb2=yE+rs*Math.max(0,1-Math.abs(cE-sd*1.1-cm)/hh)+.05,hw=.8,ft=yE+.35,fh=1.5,dc=hexc(LK.t||'#f2f0ea');
          const F0=P_(a-hw,cE-sd*.9,ft),F1=P_(a+hw,cE-sd*.9,ft),F2=P_(a+hw,cE-sd*.9,ft+fh),F3=P_(a-hw,cE-sd*.9,ft+fh),Ap=P_(a,cE-sd*.9,ft+fh+.75),nf=along?[-ob.uy*sd,0,ob.ux*sd]:[ob.ux*sd,0,ob.uy*sd];
          quadO(out,F0,F1,F2,F3,dc,nf);triO(out,F3,F2,Ap,dc,nf);const g0=P_(a-hw*.6,cE-sd*.93,ft+.2),g1=P_(a+hw*.6,cE-sd*.93,ft+.2),g2=P_(a+hw*.6,cE-sd*.93,ft+fh-.15),g3=P_(a-hw*.6,cE-sd*.93,ft+fh-.15);quadO(out,g0,g1,g2,g3,glass,nf);
          const B0=P_(a-hw-.15,cE-sd*.8,ft+fh-.05),B1=P_(a+hw+.15,cE-sd*.8,ft+fh-.05),Bk0=P_(a-hw-.15,cin,ft+fh+.5),Bk1=P_(a+hw+.15,cin,ft+fh+.5);
          slope(B0,P_(a,cE-sd*.8,ft+fh+.8),P_(a,cin,ft+fh+.95),Bk0,false);slope(B1,P_(a,cE-sd*.8,ft+fh+.8),P_(a,cin,ft+fh+.95),Bk1,false);
          for(const sg of[-1,1]){const S0=P_(a+sg*hw,cE-sd*.9,ft),S1=P_(a+sg*hw,cin,ft),S2=P_(a+sg*hw,cin,ft+fh+.4),S3=P_(a+sg*hw,cE-sd*.9,ft+fh);quadO(out,S0,S1,S2,S3,mul(dc,.9),along?[ob.ux*sg,0,ob.uy*sg]:[-ob.uy*sg,0,ob.ux*sg]);}}}}});
    if(club&&!simple&&top)boxO(out,top[0],top[1]+.6,top[2],.8,1.6,.8,ob.t,chim);}
  else if(rt===2&&!rect){
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
    {let cx=0,cz=0;for(const r of ridge){cx+=r[0];cz+=r[1];}peak=[cx/ridge.length,yR,cz/ridge.length];if(!inPoly(q,peak[0],peak[2]))peak=null;}
    if(club&&!simple){const c0=ridge[0],c1=ridge[Math.floor(ridge.length/2)];boxO(out,c0[0]*.8+c1[0]*.2,yR+.9,c0[1]*.8+c1[1]*.2,.8,1.6,.8,0,chim);}}
  else if(rt>0){
    // gable or hip on the footprint's rectangle, ridge along u
    const o=kind==='shack'?.4:.6,hw=(ob.v1-ob.v0)/2,vm=(ob.v0+ob.v1)/2,rs=rise!=null?rise:(club?.62:.7)*Math.min(club?7:4.5,Math.sqrt(A)*.225,hw),yW=gh+H1,yR=yW+rs,yE=yW-.05-rs*o/Math.max(hw,.5),R3d=(u,v,y)=>{const c=P2(u,v);return[c[0],y,c[1]];};
    const vs0=ob.v0-o,vs1=ob.v1+o;
    if(rt===1){const og=kind==='shack'?.3:.45,ua=ob.u0-og,ub=ob.u1+og;
      slope(R3d(ua,vs0,yE),R3d(ub,vs0,yE),R3d(ub,vm,yR),R3d(ua,vm,yR),!simple);slope(R3d(ub,vs1,yE),R3d(ua,vs1,yE),R3d(ua,vm,yR),R3d(ub,vm,yR),!simple);
      // gable-end triangles in the wall colour (and a trim strip along the verge)
      for(const[u,sg]of[[ob.u0,-1],[ob.u1,1]]){const nn=[ob.ux*sg,0,ob.uy*sg];triO(out,R3d(u,ob.v0,yW),R3d(u,ob.v1,yW),R3d(u,vm,yR),mul(wall,.96),nn);
        if(!simple){const uu=u+sg*og;for(const v of[vs0,vs1])quadO(out,R3d(uu,v,yE-.18),R3d(uu,vm,yR-.18),R3d(uu,vm,yR+.02),R3d(uu,v,yE+.02),trim,nn);}}
      top=R3d(ob.u0+(ob.u1-ob.u0)*.75,vm,yR);peak=R3d((ob.u0+ob.u1)/2,vm,yR);}
    else{const ue0=ob.u0-o,ue1=ob.u1+o,hh=(vs1-vs0)/2;let ru0=ue0+hh,ru1=ue1-hh;if(ru0>ru1)ru0=ru1=(ue0+ue1)/2;
      slope(R3d(ue0,vs0,yE),R3d(ue1,vs0,yE),R3d(ru1,vm,yR),R3d(ru0,vm,yR),!simple);slope(R3d(ue1,vs1,yE),R3d(ue0,vs1,yE),R3d(ru0,vm,yR),R3d(ru1,vm,yR),!simple);
      for(const[a,b,c]of[[R3d(ue0,vs1,yE),R3d(ue0,vs0,yE),R3d(ru0,vm,yR)],[R3d(ue1,vs0,yE),R3d(ue1,vs1,yE),R3d(ru1,vm,yR)]]){let nn=nrm(cross(sub(b,a),sub(c,a)));if(nn[1]<0)nn=mul(nn,-1);
        triO(out,a,b,c,mul(roof,shadeOf(nn)),nn);if(!simple)triO(out,a,b,c,mul(trim,.8),mul(nn,-1));}
      top=R3d(ru0+(ru1-ru0)*.2,vm,yR);peak=R3d((ru0+ru1)/2,vm,yR);}
    if(club&&!simple&&top)boxO(out,top[0],top[1]+.6,top[2],.8,1.6,.8,ob.t,chim);}
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
  const edge=k=>{const a=p[k%p.length],b=p[(k+1)%p.length],L=hyp(b[0]-a[0],b[1]-a[1])||1,ex2=(b[0]-a[0])/L,ez=(b[1]-a[1])/L;return{a,b,L,ex:ex2,ez,mx:(a[0]+b[0])/2,mz:(a[1]+b[1])/2,nx:ez*s,nz:-ex2*s,rot:Math.atan2(ez,ex2)};};
  // doors and porches sit on the ground in front of their wall (higher than the footprint's lowest corner on a slope)
  let lift=0;const liftAt=E=>clamp(hAtH(h,E.mx+E.nx*2.5,E.mz+E.nz*2.5)-gh,0,Math.max(0,H1-3.4));
  // the whole side of the footprint's rectangle facing a point (for jagged outlines whose real walls are all short jogs)
  const facade=(tx,ty)=>{if(!ob)return null;let best=null;for(const[a,b]of[[[ob.u0,ob.v0],[ob.u1,ob.v0]],[[ob.u1,ob.v0],[ob.u1,ob.v1]],[[ob.u1,ob.v1],[ob.u0,ob.v1]],[[ob.u0,ob.v1],[ob.u0,ob.v0]]]){
      let A=P2(...a),B=P2(...b);const L=hyp(B[0]-A[0],B[1]-A[1])||1,mx=(A[0]+B[0])/2,mz=(A[1]+B[1])/2;let ex2=(B[0]-A[0])/L,ez=(B[1]-A[1])/L,nx=ez*s,nz=-ex2*s;
      const cx=P2((ob.u0+ob.u1)/2,(ob.v0+ob.v1)/2);if(nx*(mx-cx[0])+nz*(mz-cx[1])<0){[A,B]=[B,A];ex2=-ex2;ez=-ez;nx=-nx;nz=-nz;}
      const dl=hyp(tx-mx,ty-mz)||1,sc=(nx*(tx-mx)+nz*(ty-mz))/dl;if(!best||sc>best.sc)best={a:A,b:B,L,ex:ex2,ez,mx,mz,nx,nz,rot:Math.atan2(ez,ex2),sc};}return best;};
  const xgBays=P=>{const n=LK.xg,hw2=Math.min(P.L/n*.4,5.5);return{n,hw2,cs:[...Array(n)].map((_,k)=>(k-(n-1)/2)*P.L/n*.92)};};
  const courseSide=()=>{if(pi<0)return null;const E=edge(pi);if(!ob)return E;const[tx,ty]=holePt(),F=facade(tx,ty);return F&&E.L<F.L*.7?Object.assign(F,{fac:1}):E;};
  const panel=(E,t,hw,y0,y1,col,o)=>{const cx=E.a[0]+(E.b[0]-E.a[0])*t,cz=E.a[1]+(E.b[1]-E.a[1])*t,n=[E.nx,0,E.nz],g=gh+lift;hw=Math.min(hw,E.L*.45);
    quadO(out,[cx-E.ex*hw+E.nx*o,g+y0,cz-E.ez*hw+E.nz*o],[cx+E.ex*hw+E.nx*o,g+y0,cz+E.ez*hw+E.nz*o],[cx+E.ex*hw+E.nx*o,g+y1,cz+E.ez*hw+E.nz*o],[cx-E.ex*hw+E.nx*o,g+y1,cz-E.ez*hw+E.nz*o],col,n);};
  if(club){const E=edge(bi),a=E.a,b=E.b,ex2=E.ex,ez=E.ez,mx=E.mx,mz=E.mz,nx=E.nx,nz=E.nz,rot=E.rot;lift=liftAt(E);const cy=Math.min(4.3,H1-lift-.5),g1=gh+lift;
    const colC=LK&&LK.c?hexc(LK.c):stone;
    if(LK&&LK.po){
      // a full-height portico: columns to the eave, an entablature and a pediment facing out
      const pw=Math.min(E.L*.42,9)/2,dp=3.6,ph=Math.max(3,H1-lift-.35),yt=g1+ph,nc=Math.max(4,2*Math.round(pw/1.9)),R3e=(u,v,y)=>[mx+ex2*u+nx*v,y,mz+ez*u+nz*v];
      for(let k=0;k<nc;k++){const u=-pw+.3+(2*pw-.6)*k/(nc-1),c=R3e(u,dp-.35,0),cg=Math.min(g1,hAtH(h,c[0],c[2]))-.2;boxO(out,c[0],(cg+yt)/2,c[2],.26,(yt-cg)/2,.26,rot,colC);}
      boxO(out,mx+nx*dp/2,yt+.25,mz+nz*dp/2,pw+.2,.25,dp/2+.1,rot,trim);
      const pr=Math.min(2.4,pw*.45),y2=yt+.5;slope(R3e(-pw-.35,-.1,y2),R3e(0,-.1,y2+pr),R3e(0,dp+.25,y2+pr),R3e(-pw-.35,dp+.25,y2),false);slope(R3e(pw+.35,-.1,y2),R3e(pw+.35,dp+.25,y2),R3e(0,dp+.25,y2+pr),R3e(0,-.1,y2+pr),false);
      triO(out,R3e(-pw-.2,dp+.2,y2),R3e(pw+.2,dp+.2,y2),R3e(0,dp+.2,y2+pr-.1),trim,[nx,0,nz]);}
    else{
    if(LK&&LK.pc){
      // a porte-cochère: heavy timber (or stucco) posts carrying a gabled roof out over the drive
      const pw=3.6,dp=7.5,ph=Math.min(4.6,Math.max(3.4,H1-lift-.4)),R3c=(u,v,y)=>[mx+ex2*u+nx*v,y,mz+ez*u+nz*v],pcol=hexc(LK.pcc||LK.c||'#8a6a48');
      for(const u of[-pw+.3,pw-.3])for(const v of[dp*.45,dp-.4]){const c=R3c(u,v,0),cg=Math.min(g1,hAtH(h,c[0],c[2]))-.2;boxO(out,c[0],(cg+g1+ph)/2,c[2],.32,(g1+ph-cg)/2,.32,rot,pcol);boxO(out,c[0],cg+.5,c[2],.45,.5,.45,rot,stone);}
      for(const u of[-pw+.3,pw-.3]){const c=R3c(u,dp/2,0);boxO(out,c[0],g1+ph-.15,c[2],.2,.2,dp/2,rot,pcol);}
      const yb=g1+ph+.05,yr=yb+pw*.75;slope(R3c(-pw-.4,-.2,yb),R3c(-pw-.4,dp+.4,yb),R3c(0,dp+.4,yr),R3c(0,-.2,yr),true);slope(R3c(pw+.4,dp+.4,yb),R3c(pw+.4,-.2,yb),R3c(0,-.2,yr),R3c(0,dp+.4,yr),true);
      triO(out,R3c(-pw-.3,dp+.38,yb),R3c(pw+.3,dp+.38,yb),R3c(0,dp+.38,yr-.05),mul(pcol,1.1),[nx,0,nz]);
      {const bar=(x1,y1,x2,y2,w)=>{const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy)||1,px=-dy/l*w,py=dx/l*w;quadO(out,R3c(x1+px,dp+.42,y1+py),R3c(x2+px,dp+.42,y2+py),R3c(x2-px,dp+.42,y2-py),R3c(x1-px,dp+.42,y1-py),mul(pcol,.7),[nx,0,nz]);};bar(-pw,yb+.1,pw,yb+.1,.12);bar(0,yb+.1,0,yr-.2,.1);bar(0,yb+.4,-pw*.55,yb+pw*.32,.08);bar(0,yb+.4,pw*.55,yb+pw*.32,.08);}}
    else{
    // entry canopy on the longest wall
    boxO(out,mx+nx*2.6,g1+cy,mz+nz*2.6,3.2,.25,2.8,rot,trim);
    for(const sx of[-2.8,2.8]){const cg=Math.min(g1,hAtH(h,mx+nx*4.9+ex2*sx,mz+nz*4.9+ez*sx))-.2;boxO(out,mx+nx*4.9+ex2*sx,(cg+g1+cy)/2,mz+nz*4.9+ez*sx,.35,(g1+cy-cg)/2,.35,rot,colC);}}}
    q.ent=[mx,mz,nx,nz];
    // glass double doors under it
    const dh=Math.min(2.7,cy-.3);panel(E,.5,1.6,plinth-.05,dh+.15,frame,.05);panel(E,.5,1.42,plinth,dh,glass,.07);panel(E,.5,.05,plinth,dh,frame,.09);
    // a flagpole off the entry, flying the course colours
    { const fx=mx+nx*8.5+ex2*Math.min(E.L*.5+2,9),fz=mz+nz*8.5+ez*Math.min(E.L*.5+2,9),g0=hAtH(h,fx,fz),FS=typeof r3FlagStyle==='function'?r3FlagStyle(CUR.id):{bg:'#1f4f8a',fg:'#ffffff'},fb=hexc(FS.bg),ff=hexc(FS.fg||'#ffffff');
      boxO(out,fx,g0+.2,fz,.35,.2,.35,rot,stone);boxO(out,fx,g0+4.7,fz,.07,4.5,.07,rot,[.92,.92,.9]);boxO(out,fx,g0+9.25,fz,.13,.1,.13,rot,[.85,.7,.3]);
      const w=2.5,hgt=1.55,y1=g0+9.05,ux=ex2,uz=ez,F=(t0,t1,ya,yb,col,o)=>{const A0=[fx+ux*t0+nx*o,ya,fz+uz*t0+nz*o],B0=[fx+ux*t1+nx*o,ya,fz+uz*t1+nz*o],B1=[B0[0],yb,B0[2]],A1=[A0[0],yb,A0[2]];
        quadO(out,A0,B0,B1,A1,col,[nx,0,nz]);quadO(out,A0,B0,B1,A1,mul(col,.82),[-nx,0,-nz]);};
      F(.08,w,y1-hgt,y1,fb,0);F(.08,w,y1-hgt*.62,y1-hgt*.38,ff,.012);F(.08,w,y1-hgt*.62,y1-hgt*.38,ff,-.012);}
    // covered porches: the course side (or every side for a wraparound veranda): deck, posts, railing and a shed roof
    const porch=(P,full,fr)=>{lift=liftAt(P);if(H1-lift<=3.2)return;const pw=full?P.L/2+.05:Math.min(P.L*.62,18)/2,dp=full?3:3.4,pc=[P.mx+P.nx*dp/2,P.mz+P.nz*dp/2];
      let gl=gh+lift;for(const[u,v]of[[-pw,0],[pw,0],[-pw,dp],[pw,dp]])gl=Math.min(gl,hAtH(h,P.mx+P.ex*u+P.nx*v,P.mz+P.ez*u+P.nz*v));
      const yt=gh+lift+Math.max(.35,Math.min(plinth,1.2)*.6),yb=gl-.3,ph=Math.max(2.4,Math.min(3.2,H1-lift-.7)),deckC=hexc(LK&&LK.lo?LK.lc:'#8b6b4e'),post=LK&&LK.c?hexc(LK.c):mul(trim,1.25);
      boxO(out,pc[0],(yt+yb)/2,pc[1],pw,(yt-yb)/2,dp/2,P.rot,deckC);
      const np=Math.max(2,Math.round(pw*2/3.2)+1);for(let k=0;k<np;k++){const u=-pw+.2+(pw*2-.4)*k/(np-1);boxO(out,P.mx+P.ex*u+P.nx*(dp-.2),yt+ph/2,P.mz+P.ez*u+P.nz*(dp-.2),.14,ph/2,.14,P.rot,post);}
      boxO(out,P.mx+P.nx*(dp-.2),yt+.95,P.mz+P.nz*(dp-.2),pw-.1,.05,.06,P.rot,post);
      if(!full)for(const sg of[-1,1])boxO(out,P.mx+P.ex*sg*(pw-.2)+P.nx*dp/2,yt+.95,P.mz+P.ez*sg*(pw-.2)+P.nz*dp/2,.06,.05,dp/2-.1,P.rot,post);
      // the roof slopes down away from the wall
      const yr0=yt+ph+.55,yr1=yt+ph+.05,ov=full?.05:.3,R3p=(u,v,y)=>[P.mx+P.ex*u+P.nx*v,y,P.mz+P.ez*u+P.nz*v];
      slope(R3p(-pw-ov,-.1,yr0),R3p(pw+ov,-.1,yr0),R3p(pw+ov,dp+.35,yr1),R3p(-pw-ov,dp+.35,yr1),true);
      quadO(out,R3p(-pw-ov,dp+.35,yr1-.22),R3p(pw+ov,dp+.35,yr1-.22),R3p(pw+ov,dp+.35,yr1+.02),R3p(-pw-ov,dp+.35,yr1+.02),trim,[P.nx,0,P.nz]);
      // french doors onto it
      if(fr){const nd=Math.max(1,Math.floor(pw*2/4));for(let k=0;k<nd;k++){const t=.5+((k+.5)/nd-.5)*pw*2/P.L*.8;panel(P,t,.85,plinth-.05,Math.min(2.6,H1-lift-.5)+.12,frame,.05);panel(P,t,.72,plinth,Math.min(2.6,H1-lift-.5),glass,.07);}}};
    const pv=LK&&LK.v||'front';
    if(pv==='wrap'){const ws=[];for(let k=0;k<p.length;k++){const e=edge(k);if(k!==bi&&e.L>=5)ws.push([e.L,k]);}ws.sort((x,y)=>y[0]-x[0]);
      for(const[,k]of ws.slice(0,6))porch(edge(k),true,k===pi);if(pi>=0){const P=edge(pi);q.por=[P.mx,P.mz,P.nx,P.nz];}}
    else if(pv==='front'&&pi>=0){const P=edge(pi);q.por=[P.mx,P.mz,P.nx,P.nz];porch(P,false,true);}
    // the patio or deck on the course side, as in photos of each clubhouse: floor (stone, brick, pavers or decking), tables with umbrellas,
    // fire pits ringed with Adirondack chairs, a stone wall or a railing where it stands above the ground
    if(LK&&LK.pt&&pi>=0){const P=courseSide(),pv0=P.fac?(pv==='none'?-.4:3.6):pv==='front'?3.6:pv==='wrap'?3.3:.1,Wf=Math.min(P.L*.8,26)/2,blocked=(x,y)=>[h.greens,h.tees,h.water,h.bunkers,h.fairways].some(L=>L.some(Q=>inPoly(Q,x,y)))||(h.buildings||[]).some(Q=>Q!==q&&inPoly(Q,x,y));
      // a cart barn under the right-hand gable keeps the terrace to its left
      let uA=-Wf,uB=Wf;if(LK.cbn&&LK.xg){const B=xgBays(P);uB=Math.min(Wf,B.cs[B.n-1]-B.hw2-.3);uA=Math.max(-Wf,-P.L/2+1);}
      const W=(uB-uA)/2,uo=(uA+uB)/2,R3q=(u,v)=>[P.mx+P.ex*(u+uo)+P.nx*v,P.mz+P.ez*(u+uo)+P.nz*v];let D=Math.min(14,Math.max(7,W*.7));
      while(D>4&&[[-W,pv0+D],[W,pv0+D],[0,pv0+D],[-W,pv0+D/2],[W,pv0+D/2]].some(([u,v])=>{const c=R3q(u,v);return blocked(c[0],c[1]);}))D-=1;
      if(D>4){lift=liftAt(P);let gmin=1e9,gmax=-1e9;for(let u=-W;u<=W+.01;u+=W/2)for(let v=pv0;v<=pv0+D+.01;v+=D/2){const c=R3q(u,v),g=hAtH(h,c[0],c[1]);gmin=Math.min(gmin,g);gmax=Math.max(gmax,g);}
        const deck=LK.pt==='deck'||LK.pt==='reddeck',ft=Math.max(gmax+.12,gh+lift+(deck?Math.min(.9,plinth*.6):.12),LK.ph?gmin+LK.ph:-1e9),fb=gmin-.3,raised=ft-gmin>.7;
        const fc=hexc({stone:'#b8ae9c',brick:'#9b5d48',paver:'#c4bba9',deck:'#8a6a4c',reddeck:'#7c3f35'}[LK.pt]||'#b8ae9c'),c0=R3q(0,pv0+D/2);
        // the floor slab (its sides read as a stone retaining wall when raised) and a border
        if(deck&&raised){boxO(out,c0[0],ft-.15,c0[1],W,.15,D/2,P.rot,fc);
          // a raised deck stands on posts over a dark skirt
          for(let u=-W+.3;u<=W-.29;u+=Math.max(1.5,(2*W-.6)/Math.round((2*W-.6)/2.6)))for(let v=pv0+.3;v<=pv0+D-.29;v+=Math.max(1.5,(D-.6)/Math.round((D-.6)/2.6))){const c=R3q(u,v),g=hAtH(h,c[0],c[1]);if(ft-.3-g<.05)continue;boxO(out,c[0],(ft-.3+g-.2)/2,c[1],.13,(ft-.3-g+.2)/2,.13,P.rot,mul(fc,.75));}}
        else boxO(out,c0[0],(ft+fb)/2,c0[1],W,(ft-fb)/2,D/2,P.rot,raised&&!deck?mul(stone,.95):fc);
        q._pat=[c0[0],c0[1],W,D/2,P.rot];
        if(raised&&!deck)boxO(out,c0[0],ft-.04,c0[1],W-.05,.05,D/2-.05,P.rot,fc);
        // a walkout level under a tall terrace: arched openings (glass arcade or dark doors) in its front wall
        if(raised&&!deck&&LK.ar&&ft-gmin>2){const na=Math.max(2,Math.floor(2*W/3)),nf=[P.nx,0,P.nz],ac=LK.ar==='glass'?mul(glass,1.35):hexc('#2a2622');
          for(let k=0;k<na;k++){const u=-W+(k+.5)*2*W/na,c=R3q(u,pv0+D+.02),g=hAtH(h,c[0],c[1]),aw=Math.min(1.1,W/na*.7),y0=Math.max(g,fb)+.05,y1=ft-.45-aw;if(y1<y0+.6)continue;const Q_=(du,y)=>{const cc=R3q(u+du,pv0+D+.03);return[cc[0],y,cc[1]];};
            quadO(out,Q_(-aw-.12,y0),Q_(aw+.12,y0),Q_(aw+.12,y1),Q_(-aw-.12,y1),hexc(LK.t||'#4a3426'),nf);quadO(out,Q_(-aw,y0),Q_(aw,y0),Q_(aw,y1),Q_(-aw,y1),ac,nf);
            for(let j=0;j<6;j++){const a1=Math.PI*j/6,a2=Math.PI*(j+1)/6;triO(out,Q_(0,y1),Q_(Math.cos(a1)*aw,y1+Math.sin(a1)*aw),Q_(Math.cos(a2)*aw,y1+Math.sin(a2)*aw),ac,nf);}}}
        if(!deck){const bc=mul(fc,.82);for(const[u,v,hu,hv]of[[0,pv0+D-.2,W,.2],[-W+.2,pv0+D/2,.2,D/2],[W-.2,pv0+D/2,.2,D/2]]){const c=R3q(u,v);boxO(out,c[0],ft+.005,c[1],hu,.012,hv,P.rot,bc);}}
        else{const bc=mul(fc,.78),nb=Math.floor(D/.5);for(let k=1;k<nb;k++){const c=R3q(0,pv0+k*.5);boxO(out,c[0],ft+.004,c[1],W-.05,.008,.025,P.rot,bc);}}
        // railing round a raised deck, a low stone wall round a raised terrace (or wherever the course asks for one)
        // steps down from a raised terrace or deck toward the course, at the far end of the front edge, with posts and rails
        const stp=raised&&(LK.stp||ft-gmin>1),su=W-(LK.cbn?1.6:2.2),sw=1.4;
        if(stp){const c=R3q(su,pv0+D),g1=hAtH(h,...R3q(su,pv0+D+6)),drop=Math.max(.4,ft-g1),n=Math.max(2,Math.round(drop/.19)),rr=drop/n,tr=.36,sc=deck?fc:mul(stone,1.1);
          for(let k=0;k<n;k++){const v=pv0+D+tr*(k+.5),cc=R3q(su,v),yt=ft-rr*(k+1)+rr,yb=Math.min(yt-.1,hAtH(h,cc[0],cc[1])-.3);boxO(out,cc[0],(yt+yb)/2,cc[1],sw,(yt-yb)/2,tr/2,P.rot,mul(sc,k&1?.96:1));}
          const rail=LK.ir?hexc('#1e1e1e'):deck?mul(trim,1.2):mul(stone,1.05),run=n*tr;
          for(const sg of[-1,1]){const u=su+sg*(sw+.1),c0s=R3q(u,pv0+D),c1s=R3q(u,pv0+D+run),g2=hAtH(h,c1s[0],c1s[1]);
            boxO(out,c1s[0],g2+.55,c1s[1],.22,.6,.22,P.rot,mul(stone,1.08));
            const a=[c0s[0],ft+.95,c0s[1]],b=[c1s[0],g2+.95,c1s[1]],n2=nrm(cross(sub(b,a),[0,1,0])),A2=[a[0],a[1]-.06,a[2]],B2=[b[0],b[1]-.06,b[2]];quadO(out,A2,B2,b,a,rail,n2);quadO(out,A2,B2,b,a,rail,mul(n2,-1));
            for(let k=0;k<=n;k+=2){const t=k/n,x=a[0]+(b[0]-a[0])*t,z=a[2]+(b[2]-a[2])*t,y=a[1]+(b[1]-a[1])*t;boxO(out,x,y-.45,z,.025,.45,.025,P.rot,rail);}}}
        if(raised||LK.rw){const rc=deck?mul(trim,1.2):mul(stone,1.05),rh=deck?.95:.55,rw2=deck?.05:.22,front=stp?[[(-W+su-sw-.15)/2,pv0+D-rw2,(su-sw-.15+W)/2,rw2],[(su+sw+.15+W)/2,pv0+D-rw2,Math.max(.01,(W-su-sw-.15)/2),rw2]]:[[0,pv0+D-rw2,W,rw2]];
          for(const[u,v,hu,hv]of[...front,[-W+rw2,pv0+D/2,rw2,D/2],[W-rw2,pv0+D/2,rw2,D/2]]){const c=R3q(u,v);boxO(out,c[0],ft+rh/2,c[1],hu,rh/2,hv,P.rot,rc);
            if(LK.ir&&!deck){const ic=hexc('#1e1e1e');boxO(out,c[0],ft+rh+.45,c[1],hu>hv?hu:.025,.025,hv>hu?hv:.025,P.rot,ic);const n3=Math.max(2,Math.round((hu>hv?hu:hv)*2/.5));for(let k=0;k<=n3;k++){const t=k/n3*2-1,cc=R3q(u+(hu>hv?t*hu:0),v+(hu>hv?0:t*hv));boxO(out,cc[0],ft+rh+.22,cc[1],.018,.23,.018,P.rot,ic);}}
            if(deck){const n2=Math.max(2,Math.round((hu>hv?hu:hv)*2/1.6));for(let k=0;k<=n2;k++){const t=k/n2*2-1,cc=R3q(u+(hu>hv?t*hu:0),v+(hu>hv?0:t*hv));boxO(out,cc[0],ft+rh/2,cc[1],.05,rh/2,.05,P.rot,rc);}}}
}
        // furniture
        const UM=(LK.um||'').split(',').filter(Boolean).map(hexc),tbl=hexc('#3b3a37'),chairC=hexc(LK.fp?'#d9d2c2':'#2f2e2c'),RR=rng(hs+7);
        const table=(x,z,k)=>{boxO(out,x,ft+.72,z,.5,.03,.5,P.rot,tbl);boxO(out,x,ft+.36,z,.05,.36,.05,P.rot,tbl);
          for(const[du,dv]of[[.85,0],[-.85,0],[0,.85],[0,-.85]]){const cx=x+P.ex*du+P.nx*dv,cz=z+P.ez*du+P.nz*dv;boxO(out,cx,ft+.24,cz,.22,.24,.22,P.rot,chairC);}
          if(UM.length){const uc=UM[k%UM.length],ap=[x,ft+2.75,z],r=1.45,cs=[];boxO(out,x,ft+1.4,z,.035,1.38,.035,P.rot,[.9,.9,.88]);
            for(let j=0;j<8;j++){const a=j/8*TAU+P.rot;cs.push([x+Math.cos(a)*r,ft+2.2,z+Math.sin(a)*r]);}
            for(let j=0;j<8;j++){const a2=cs[j],b2=cs[(j+1)%8];let nn=nrm(cross(sub(b2,a2),sub(ap,a2)));if(nn[1]<0)nn=mul(nn,-1);triO(out,a2,b2,ap,mul(uc,shadeOf(nn)),nn);triO(out,a2,b2,ap,mul(uc,.7),mul(nn,-1));}}};
        const firepit=(x,z)=>{boxO(out,x,ft+.25,z,.75,.25,.75,P.rot,stone);boxO(out,x,ft+.505,z,.5,.01,.5,P.rot,hexc('#2a2622'));
          for(let j=0;j<5;j++){const a=j/5*TAU+.3,cx=x+Math.cos(a)*2,cz=z+Math.sin(a)*2;boxO(out,cx,ft+.3,cz,.35,.3,.4,a+Math.PI/2,hexc('#c9b99a'));}};
        const fps=LK.fp?Math.min(2,Math.max(1,Math.floor(W/7))):0;let k=0;
        for(let j=0;j<fps;j++){const u=fps===1?W*.55:(j?W*.55:-W*.55),c=R3q(u,pv0+D*.55);firepit(c[0],c[1]);}
        for(let v=pv0+2.2;v<pv0+D-1.5;v+=3.6)for(let u=-W+2;u<W-1.8;u+=3.6){if(fps&&Math.abs(Math.abs(u)-W*.55)<3.4&&Math.abs(v-(pv0+D*.55))<3.4)continue;if(RR()<.15||k>=14)continue;const c=R3q(u+(RR()-.5)*.4,v);table(c[0],c[1],k++);}
        q.pat=[c0[0],c0[1],P.nx,P.nz];q._ft=ft;}}
    // tall cross gables on the course side (Prestwick): a shallow bay up to the eave, a steep gable roof running back into the main roof,
    // timbered gable end and a tall glass window
    const xgRun=(P,XB,ent)=>{const n=XB.n,hw2=XB.hw2,yE=gh+H1-.05,rs=Math.min(hw2*1.3,(rise!=null?rise:4)*1.2+1),yR=yE+rs,vf=.45,vb=-Math.max(3,hw2*1.4),R3x=(u,v,y)=>[P.mx+P.ex*u+P.nx*v,y,P.mz+P.ez*u+P.nz*v],nf=[P.nx,0,P.nz],tc=hexc(LK.tc||LK.t);
      for(let k=0;k<n;k++){const c=XB.cs[k],y0=gh+lift;if(ent&&LK.m!=='stone'&&0)continue;
        quadO(out,R3x(c-hw2,vf,y0),R3x(c+hw2,vf,y0),R3x(c+hw2,vf,yE),R3x(c-hw2,vf,yE),LK.m==='stone'?mul(wall,.84):wall,nf);
        // stone gable fronts get the same coursing as the walls
        if(LK.m==='stone'){let r=0;const L2=hw2*2;for(let y=y0+plinth;y<yE-.2;y+=.55,r++){const y1=Math.min(yE-.05,y+.49);for(let u=(r&1)*-.55;u<L2;u+=1.1){const u0=Math.max(0,u+.04),u1=Math.min(L2,u+1.06);if(u1<=u0)continue;const hv=((Math.round(u*7)+r*13+hs+k*5)%7)/7;quadO(out,R3x(c-hw2+u0,vf+.02,y),R3x(c-hw2+u1,vf+.02,y),R3x(c-hw2+u1,vf+.02,y1),R3x(c-hw2+u0,vf+.02,y1),mul(wall,.95+hv*.1),nf);}}}
        for(const sg of[-1,1])quadO(out,R3x(c+sg*hw2,P.fac?-5:0,y0),R3x(c+sg*hw2,vf,y0),R3x(c+sg*hw2,vf,yE),R3x(c+sg*hw2,P.fac?-5:0,yE),mul(wall,.9),[P.ex*sg,0,P.ez*sg]);
        triO(out,R3x(c-hw2,vf,yE),R3x(c+hw2,vf,yE),R3x(c,vf,yR-.15),wall,nf);
        slope(R3x(c-hw2-.45,vf+.5,yE-.3),R3x(c,vf+.5,yR+.05),R3x(c,vb,yR+.05),R3x(c-hw2-.45,vb,yE-.3),true);
        slope(R3x(c+hw2+.45,vf+.5,yE-.3),R3x(c+hw2+.45,vb,yE-.3),R3x(c,vb,yR+.05),R3x(c,vf+.5,yR+.05),true);
        // bargeboards and timbers
        const vc=LK.xgt===0?mul(stone,1.05):tc;
        for(const sg of[-1,1]){const a=R3x(c+sg*(hw2+.45),vf+.52,yE-.3),b=R3x(c,vf+.52,yR+.05),d=sub(b,a),l=hyp(d[0],d[2])||1,px=-P.ez*0,py=.28;quadO(out,a,b,[b[0],b[1]-py,b[2]],[a[0],a[1]-py,a[2]],vc,nf);}
        if(LK.xgt!==0)quadO(out,R3x(c-hw2,vf+.03,yE-.12),R3x(c+hw2,vf+.03,yE-.12),R3x(c+hw2,vf+.03,yE+.08),R3x(c-hw2,vf+.03,yE+.08),tc,nf);
        // a clock face in the middle gable's peak
        if(LK.xgc&&k===Math.floor(n/2)){const cc=R3x(c,vf+.07,yE+rs*.42),r=Math.min(1.1,hw2*.28),ux=P.ex,uz=P.ez;
          for(let j=0;j<12;j++){const a1=j/12*TAU,a2=(j+1)/12*TAU;triO(out,cc,[cc[0]+ux*Math.cos(a1)*(r+.15),cc[1]+Math.sin(a1)*(r+.15),cc[2]+uz*Math.cos(a1)*(r+.15)],[cc[0]+ux*Math.cos(a2)*(r+.15),cc[1]+Math.sin(a2)*(r+.15),cc[2]+uz*Math.cos(a2)*(r+.15)],tc,nf);}
          const c2=[cc[0]+P.nx*.02,cc[1],cc[2]+P.nz*.02];for(let j=0;j<12;j++){const a1=j/12*TAU,a2=(j+1)/12*TAU;triO(out,c2,[c2[0]+ux*Math.cos(a1)*r,c2[1]+Math.sin(a1)*r,c2[2]+uz*Math.cos(a1)*r],[c2[0]+ux*Math.cos(a2)*r,c2[1]+Math.sin(a2)*r,c2[2]+uz*Math.cos(a2)*r],[.95,.94,.9],nf);}
          const c3=[c2[0]+P.nx*.02,c2[1],c2[2]+P.nz*.02],hand=(ang,len,w)=>{const dx=Math.cos(ang),dy=Math.sin(ang);quadO(out,[c3[0]-ux*dy*w,c3[1]+dx*w,c3[2]-uz*dy*w],[c3[0]+ux*(dx*len-dy*w),c3[1]+dy*len+dx*w,c3[2]+uz*(dx*len-dy*w)],[c3[0]+ux*(dx*len+dy*w),c3[1]+dy*len-dx*w,c3[2]+uz*(dx*len+dy*w)],[c3[0]+ux*dy*w,c3[1]-dx*w,c3[2]+uz*dy*w],[.1,.1,.1],nf);};hand(Math.PI/2,r*.78,.05);hand(Math.PI/6,r*.52,.06);}
        if(ent){const dw=1.5,dh=Math.min(2.7,H1-lift-.5),fr=hexc(LK.t||'#f2f0ea');quadO(out,R3x(c-dw-.15,vf+.05,y0+plinth-.05),R3x(c+dw+.15,vf+.05,y0+plinth-.05),R3x(c+dw+.15,vf+.05,y0+dh+.2),R3x(c-dw-.15,vf+.05,y0+dh+.2),fr,nf);quadO(out,R3x(c-dw,vf+.07,y0+plinth),R3x(c+dw,vf+.07,y0+plinth),R3x(c+dw,vf+.07,y0+dh),R3x(c-dw,vf+.07,y0+dh),glass,nf);quadO(out,R3x(c-.05,vf+.09,y0+plinth),R3x(c+.05,vf+.09,y0+plinth),R3x(c+.05,vf+.09,y0+dh),R3x(c-.05,vf+.09,y0+dh),fr,nf);}
        if(LK.xgw==='win'){
          // ordinary windows on each storey of the gable front, one small window up in the gable
          const nwx=hw2>3.2?2:1,fr=hexc(LK.t||'#f2f0ea');for(const[ya,yb]of rows){if(gh+yb>yE-.3)continue;for(let j=0;j<nwx;j++){const u=c+(nwx===1?0:(j?1:-1)*hw2*.45),hw=.75;if(ent&&ya<3&&Math.abs(u-c)<2.4)continue;
            quadO(out,R3x(u-hw-.13,vf+.04,gh+lift*0+ya-.16),R3x(u+hw+.13,vf+.04,gh+ya-.16),R3x(u+hw+.13,vf+.04,gh+yb+.13),R3x(u-hw-.13,vf+.04,gh+yb+.13),fr,nf);
            quadO(out,R3x(u-hw,vf+.06,gh+ya),R3x(u+hw,vf+.06,gh+ya),R3x(u+hw,vf+.06,gh+yb),R3x(u-hw,vf+.06,gh+yb),glass,nf);
            quadO(out,R3x(u-.04,vf+.08,gh+ya),R3x(u+.04,vf+.08,gh+ya),R3x(u+.04,vf+.08,gh+yb),R3x(u-.04,vf+.08,gh+yb),fr,nf);}}
          if(!(LK.xgc&&k===Math.floor(n/2))&&rs>2.2){const yw=yE+rs*.25,hw=.55;quadO(out,R3x(c-hw-.12,vf+.04,yw-.12),R3x(c+hw+.12,vf+.04,yw-.12),R3x(c+hw+.12,vf+.04,yw+1.1),R3x(c-hw-.12,vf+.04,yw+1.1),fr,nf);quadO(out,R3x(c-hw,vf+.06,yw),R3x(c+hw,vf+.06,yw),R3x(c+hw,vf+.06,yw+.98),R3x(c-hw,vf+.06,yw+.98),glass,nf);}
          continue;}
        // the tall window: mullions through the gable
        const gw=hw2*.62,gy0=ent?y0+3.3:y0+Math.max(plinth,.4)+.3,gy1=yE+rs*.42;quadO(out,R3x(c-gw-.15,vf+.04,gy0-.15),R3x(c+gw+.15,vf+.04,gy0-.15),R3x(c+gw+.15,vf+.04,gy1+.15),R3x(c-gw-.15,vf+.04,gy1+.15),tc,nf);
        quadO(out,R3x(c-gw,vf+.06,gy0),R3x(c+gw,vf+.06,gy0),R3x(c+gw,vf+.06,gy1),R3x(c-gw,vf+.06,gy1),mul(glass,1.45),nf);
        for(let j=1;j<5;j++){const u=c-gw+gw*2*j/5;quadO(out,R3x(u-.07,vf+.08,gy0),R3x(u+.07,vf+.08,gy0),R3x(u+.07,vf+.08,gy1),R3x(u-.07,vf+.08,gy1),tc,nf);}
        // timber truss in the gable peak: a collar beam, king post and two struts
        {const yb=gy1+.3,yt=yR-.5,hwb=hw2*Math.max(.15,(yR-.15-yb)/rs)*.92,bar=(x1,y1,x2,y2,w)=>{const dx=x2-x1,dy=y2-y1,l=Math.hypot(dx,dy)||1,px=-dy/l*w,py=dx/l*w;quadO(out,R3x(x1+px,vf+.06,y1+py),R3x(x2+px,vf+.06,y2+py),R3x(x2-px,vf+.06,y2-py),R3x(x1-px,vf+.06,y1-py),tc,nf);};
          if(yt>yb+.6){bar(c-hwb,yb,c+hwb,yb,.09);bar(c,yb,c,yt,.08);bar(c,yb+.15,c-hwb*.6,yb+(yt-yb)*.55,.06);bar(c,yb+.15,c+hwb*.6,yb+(yt-yb)*.55,.06);}}
        for(const y of[gy0+(gy1-gy0)*.45,gy0+(gy1-gy0)*.75])quadO(out,R3x(c-gw,vf+.08,y-.05),R3x(c+gw,vf+.08,y-.05),R3x(c+gw,vf+.08,y+.05),R3x(c-gw,vf+.08,y+.05),tc,nf);}
      };
    if(LK&&LK.eg&&club){const E=edge(bi);if(E.L>8){lift=liftAt(E);xgRun(E,{n:1,hw2:Math.min(E.L*.22,LK.eg>1?LK.eg:4.2),cs:[0]},1);}}
    if(LK&&LK.xg&&pi>=0){const P=courseSide(),XB=xgBays(P),n=XB.n,hw2=XB.hw2,yE=gh+H1-.05,rs=Math.min(hw2*1.3,(rise!=null?rise:4)*1.2+1),yR=yE+rs,vf=.45,vb=-Math.max(3,hw2*1.4),R3x=(u,v,y)=>[P.mx+P.ex*u+P.nx*v,y,P.mz+P.ez*u+P.nz*v],nf=[P.nx,0,P.nz],tc=hexc(LK.tc||LK.t);
      xgRun(P,XB,0);
      // the cart barn: a lower level under the right-hand gable, opening onto the course (a brown overhead door and an open bay),
      // with a deck over it on stone pillars, umbrellas, and carts parked out front
      if(LK.cbn){const c=XB.cs[n-1],bw=hw2+.2,gb=Math.min(...[-bw,0,bw].map(du=>hAtH(h,...R3x(c+du,vf+5,0).filter((_,i)=>i!==1)))),ft0=q._ft||gh+lift+.5,yd=Math.max(ft0+1.1,gb+2.9),dp=4.2,stn=mul(stone,1.05),brn=hexc('#5b3f2c'),blk=hexc('#1d1a17');
        quadO(out,R3x(c-bw,vf+.02,gb-.3),R3x(c+bw,vf+.02,gb-.3),R3x(c+bw,vf+.02,yd),R3x(c-bw,vf+.02,yd),mul(wall,.78),nf);
        const dw=bw*.42,d0=c-dw;quadO(out,R3x(d0-.18,vf+.05,gb),R3x(d0+dw*2+.18,vf+.05,gb),R3x(d0+dw*2+.18,vf+.05,yd-.37),R3x(d0-.18,vf+.05,yd-.37),hexc('#3a2a1e'),nf);quadO(out,R3x(d0,vf+.06,gb),R3x(d0+dw*2,vf+.06,gb),R3x(d0+dw*2,vf+.06,yd-.55),R3x(d0,vf+.06,yd-.55),brn,nf);
        for(let j=1;j<6;j++){const y=gb+(yd-.55-gb)*j/6;quadO(out,R3x(d0,vf+.08,y-.03),R3x(d0+dw*2,vf+.08,y-.03),R3x(d0+dw*2,vf+.08,y+.03),R3x(d0,vf+.08,y+.03),mul(brn,.8),nf);}
        // deck and pillars
        const dc=R3x(c,vf+dp/2,0);q.cbv=[dc[0],dc[2],P.nx,P.nz];boxO(out,dc[0],yd-.15,dc[2],bw+.3,.15,dp/2,P.rot,mul(brn,1.25));
        for(const du of[-bw,0,bw]){const pc=R3x(c+du,vf+dp-.3,0),g=hAtH(h,pc[0],pc[2]);boxO(out,pc[0],(yd+.9+g-.2)/2,pc[2],.4,(yd+.9-g+.2)/2,.4,P.rot,stn);boxO(out,pc[0],yd+.95,pc[2],.48,.06,.48,P.rot,mul(stn,1.08));}
        const ic=hexc('#1e1e1e');for(const[u0,u1,v0,v1]of[[-bw,bw,dp-.3,dp-.3],[-bw,-bw,0,dp-.3],[bw,bw,0,dp-.3]]){const a=R3x(c+u0,vf+v0,yd+.9),b=R3x(c+u1,vf+v1,yd+.9),m=[(a[0]+b[0])/2,0,(a[2]+b[2])/2],L=hyp(b[0]-a[0],b[2]-a[2])/2;
          boxO(out,m[0],yd+.9,m[2],u0===u1?.025:L,.025,u0===u1?L:.025,P.rot,ic);const nn=Math.max(2,Math.round(L*2/.5));for(let j=0;j<=nn;j++){const t=j/nn;boxO(out,a[0]+(b[0]-a[0])*t,yd+.45,a[2]+(b[2]-a[2])*t,.018,.45,.018,P.rot,ic);}}
        const UMc=hexc('#2f5f9e');for(const du of[-bw*.45,bw*.45]){const x=R3x(c+du,vf+dp*.55,0),ap=[x[0],yd+2.6,x[2]],cs=[];boxO(out,x[0],yd+1.3,x[2],.035,1.3,.035,P.rot,[.9,.9,.88]);boxO(out,x[0],yd+.36,x[2],.45,.03,.45,P.rot,hexc('#3b3a37'));
          for(let j=0;j<8;j++){const a=j/8*TAU;cs.push([x[0]+Math.cos(a)*1.35,yd+2.05,x[2]+Math.sin(a)*1.35]);}for(let j=0;j<8;j++){const a2=cs[j],b2=cs[(j+1)%8];let nn=nrm(cross(sub(b2,a2),sub(ap,a2)));if(nn[1]<0)nn=mul(nn,-1);triO(out,a2,b2,ap,mul(UMc,shadeOf(nn)),nn);triO(out,a2,b2,ap,mul(UMc,.7),mul(nn,-1));}}
        // golf carts parked in front of the barn
        for(const du of[-1.6,0,1.6]){const x=R3x(c+du+.8,vf+dp+3.2,0),g=hAtH(h,x[0],x[2]),cr=P.rot;boxO(out,x[0],g+.5,x[2],.62,.32,1.25,cr,[.93,.93,.9]);boxO(out,x[0],g+.22,x[2],.66,.2,.9,cr,[.12,.12,.12]);boxO(out,x[0]-Math.sin(cr)*-.25,g+.98,x[2]+Math.cos(cr)*-.25,.58,.16,.35,cr,[.25,.2,.17]);boxO(out,x[0],g+1.5,x[2],.66,.04,1.0,cr,[.78,.8,.8]);
          for(const sg of[-1,1])for(const sx of[-1,1])boxO(out,x[0]+Math.cos(cr)*sx*.55-Math.sin(cr)*sg*.8,g+1.15,x[2]+Math.sin(cr)*sx*.55+Math.cos(cr)*sg*.8,.03,.35,.03,cr,[.2,.2,.2]);
          boxO(out,x[0]+Math.sin(cr)*.45,g+.68,x[2]-Math.cos(cr)*.45,.5,.06,.25,cr,[.15,.15,.15]);}}}
    // a clock tower at one end of the main block (Hazeltine's limestone chimney tower, Legends' white tower)
    if(LK&&LK.tw&&ob){const tc2=hexc(LK.twc||LK.w),u=ob.u1-1.9,v=(ob.v0+ob.v1)/2,c=P2(u,v),hb=1.7,yt=gh+H1+LK.tw,tr=ob.t,co=Math.cos(tr),si=Math.sin(tr);
      boxO(out,c[0],(gh+yt)/2,c[1],hb,(yt-gh)/2,hb,tr,tc2);boxO(out,c[0],yt+.1,c[1],hb+.18,.12,hb+.18,tr,mul(tc2,.9));
      const ap=[c[0],yt+2.2,c[1]],cs=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,b])=>[c[0]+(a*co-b*si)*(hb+.3),yt+.2,c[1]+(a*si+b*co)*(hb+.3)]);
      for(let k=0;k<4;k++){const a2=cs[k],b2=cs[(k+1)%4];let nn=nrm(cross(sub(b2,a2),sub(ap,a2)));if(nn[1]<0)nn=mul(nn,-1);triO(out,a2,b2,ap,mul(roof,shadeOf(nn)),nn);}
      if(LK.clk)for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=a*co-b*si,nz=a*si+b*co,cx=c[0]+nx*(hb+.03),cz=c[1]+nz*(hb+.03),tx=-nz,tz=nx,yc=yt-1.3,r=1.05,n3=[nx,0,nz];
        for(let j=0;j<10;j++){const a1=j/10*TAU,a2=(j+1)/10*TAU;triO(out,[cx,yc,cz],[cx+tx*Math.cos(a1)*r,yc+Math.sin(a1)*r,cz+tz*Math.cos(a1)*r],[cx+tx*Math.cos(a2)*r,yc+Math.sin(a2)*r,cz+tz*Math.cos(a2)*r],[.95,.94,.9],n3);}
        const hand=(ang,len,w)=>{const dx=Math.cos(ang),dy=Math.sin(ang);quadO(out,[cx+tx*(-dy*w)+nx*.02,yc+dx*w,cz+tz*(-dy*w)+nz*.02],[cx+tx*(dx*len-dy*w)+nx*.02,yc+dy*len+dx*w,cz+tz*(dx*len-dy*w)+nz*.02],[cx+tx*(dx*len+dy*w)+nx*.02,yc+dy*len-dx*w,cz+tz*(dx*len+dy*w)+nz*.02],[cx+tx*(dy*w)+nx*.02,yc-dx*w,cz+tz*(dy*w)+nz*.02],[.1,.1,.1],n3);};hand(Math.PI/2,.8,.05);hand(Math.PI/6,.55,.06);}}
    // a second-storey balcony with an iron railing across the course side, on posts
    if(LK&&LK.bal&&pi>=0&&H1-lift>5){const P=courseSide(),bw=Math.min(P.L*.32,10),yb=gh+lift+Math.min(3.6,H1-lift-2.2),dp=1.8,ic=hexc('#1e1e1e'),R3b=(u,v,y)=>[P.mx+P.ex*u+P.nx*v,y,P.mz+P.ez*u+P.nz*v],bo=-P.L*.18;
      const c0=R3b(bo,dp/2+.1,0);boxO(out,c0[0],yb-.12,c0[2],bw,.12,dp/2,P.rot,mul(trim,1.1));
      for(const u of[-bw+.2,0,bw-.2]){const c=R3b(bo+u,dp,0),g=Math.min(yb,hAtH(h,c[0],c[2]))-.2;boxO(out,c[0],(g+yb)/2,c[2],.18,(yb-g)/2,.18,P.rot,LK.c?hexc(LK.c):stone);}
      const c1=R3b(bo,dp+.05,0);boxO(out,c1[0],yb+.95,c1[2],bw,.03,.03,P.rot,ic);for(let k=0;k<=Math.round(bw*2/.45);k++){const c=R3b(bo-bw+k*.45,dp+.05,0);boxO(out,c[0],yb+.47,c[2],.018,.47,.018,P.rot,ic);}
      for(const sg of[-1,1]){const c=R3b(bo+sg*bw,dp/2+.1,0);boxO(out,c[0],yb+.95,c[2],.03,.03,dp/2,P.rot,ic);}}
    // a cupola on the ridge
    if(LK&&LK.cu&&peak){const K=LK.cus||1,c=hexc(LK.t||'#f2f0ea'),r0=ob?ob.t:0,hb=.95*K,y0=peak[1]+.2-(K-1)*.6;boxO(out,peak[0],y0+.55*K,peak[2],hb,.75*K,hb,r0,c);
      {const co=Math.cos(r0),si=Math.sin(r0);for(const[a,b]of[[1,0],[-1,0],[0,1],[0,-1]]){const nx=a*co-b*si,nz=a*si+b*co,ox=(a?hb+.02:0),oz=(b?hb+.02:0),cx=peak[0]+(a*ox)*co-(b*oz)*si,cz=peak[2]+(a*ox)*si+(b*oz)*co,tx=-nz,tz=nx,w=hb*.7;quadO(out,[cx-tx*w,y0+.35*K,cz-tz*w],[cx+tx*w,y0+.35*K,cz+tz*w],[cx+tx*w,y0+1.1*K,cz+tz*w],[cx-tx*w,y0+1.1*K,cz-tz*w],mul(glass,1.25),[nx,0,nz]);}}
      const co=Math.cos(r0),si=Math.sin(r0),C=(u,v)=>[peak[0]+u*co-v*si,y0+1.35*K,peak[2]+u*si+v*co],ap=[peak[0],y0+(1.35+1.15*Math.min(K,1.3))*K,peak[2]],cs=[C(-1.2*K,-1.2*K),C(1.2*K,-1.2*K),C(1.2*K,1.2*K),C(-1.2*K,1.2*K)];
      for(let k=0;k<4;k++){const a2=cs[k],b2=cs[(k+1)%4];let nn=nrm(cross(sub(b2,a2),sub(ap,a2)));if(nn[1]<0)nn=mul(nn,-1);triO(out,a2,b2,ap,mul(roof,shadeOf(nn)),nn);}}}
  else if(ex&&!kind&&doors.length||kind==='building'&&doors.length){const E=edge(bi);lift=liftAt(E);const dh=Math.min(2.3,H1-lift-.5);
    // a plain door with a frame and a little hood
    panel(E,.5,.62,plinth-.05,dh+.12,frame,.05);panel(E,.5,.5,plinth,dh,hexc(['#4b5560','#6b4a33','#7a2f2a','#2f4f3a'][hs%4]),.07);
    boxO(out,E.mx+E.nx*.45,gh+lift+dh+.35,E.mz+E.nz*.45,.85,.06,.45,E.rot,mul(roof,1.05));lift=0;}
  else if(kind==='shack'){lift=0;const E=edge(bi),D=edge(bi+1),W=edge(bi+3),aw=hexc(['#2f6b4a','#7a2f2a','#2f4f7a'][hs%3]),yw=Math.min(2.25,H1-.25);
    // serving window with a counter and an awning, a door round the side, one small window opposite
    panel(E,.5,.95,1.05,Math.min(2.0,H1-.45),glass,.06);boxO(out,E.mx+E.nx*.28,gh+1.02,E.mz+E.nz*.28,Math.min(1.05,E.L*.45),.05,.28,E.rot,trim);
    boxO(out,E.mx+E.nx*.6,gh+yw,E.mz+E.nz*.6,Math.min(1.25,E.L*.48),.05,.62,E.rot,aw);
    panel(D,.5,.5,plinth,Math.min(2.1,H1-.3),hexc('#6b4a33'),.06);panel(W,.5,.45,1.3,Math.min(2.0,H1-.4),glass,.06);}
  else if(kind==='barn'){const E=edge(bi),nd=clamp(Math.floor(E.L/6),1,5),dh=Math.min(3.6,H1-.7),hw=Math.min(1.7,E.L/nd*.36),door=mul(hexc('#d4d5d0'),.95),rib=hexc('#9a9c99');
    // roll-up doors along the long wall, ribbed, with a header; a man door on the end wall
    for(let k=0;k<nd;k++){const t=(k+.5)/nd;panel(E,t,hw+.15,dh,dh+.3,trim,.07);panel(E,t,hw,plinth,dh,door,.06);for(const y of[.33,.66])panel(E,t,hw,plinth+(dh-plinth)*y-.05,plinth+(dh-plinth)*y+.05,rib,.08);}
    panel(edge(bi+1),.3,.5,plinth,Math.min(2.2,H1-.4),hexc('#5d6a72'),.06);}
  // foundation planting round a surveyed clubhouse: clipped shrubs along the walls and porch skirts, kept off the entry walk, the patio,
  // the stair, water and the course (photos show beds and lawn against these buildings, not native grass)
  if(q._shr&&q._shr.length){const E=edge(bi),pt=q._pat,R=rng(hs+7),GR=['#2f4826','#3a5a2c','#284022','#44602f'].map(hexc);
    const shrubO=(x,y,z,sz,col)=>{const sx=sz*(.9+R()*.4),sy=sz*(.7+R()*.3),sz2=sz*(.9+R()*.4),sd=R()*100;
      const Pq=v=>{const k=1+.16*Math.sin(v[0]*5.1+sd)*Math.sin(v[2]*4.3+sd*.7)+.1*Math.sin(v[1]*6.7+sd);return[x+v[0]*sx*k,y+v[1]*sy*k+sy*.6,z+v[2]*sz2*k];};
      const c=mul(col,.85+R()*.3);for(const[a1,b1,c1]of ICO0){if(a1[1]+b1[1]+c1[1]<-1.5)continue;pushTri(out,Pq(a1),Pq(b1),Pq(c1),c);}};
    // CLUBLOOK bd (from photos): h = a continuous clipped hedge instead of single shrubs, fl = a bed of flowers in front of it
    const BD=(CLUBLOOK[CUR.id]||(CUR.data&&CLUBLOOK[CUR.data])||{}).bd||{},FL=BD.fl?hexc(BD.fl):null;let k2=0;
    for(const[x,z,sz,nx,nz]of q._shr){if(hyp(x-E.mx,z-E.mz)<3.4)continue;
      if(pt){const dx=x-pt[0],dz=z-pt[1],c=Math.cos(pt[4]),s2=Math.sin(pt[4]),lu=dx*c+dz*s2,lv=-dx*s2+dz*c;if(Math.abs(lu)<pt[2]+1.3&&Math.abs(lv)<pt[3]+1.3)continue;}
      const lc=lieCodeAt(h,x,z);if(lc>1||lc<0||h.water.some(w=>inPoly(w,x,z)))continue;
      if(BD.h){const tx=-(nz||0),tz=nx||0;for(const o of[-.75,0,.75])shrubO(x+tx*o,hAtH(h,x+tx*o,z+tz*o)-.12,z+tz*o,.55,GR[1]);}
      else shrubO(x,hAtH(h,x,z)-.12,z,sz*(.85+R()*.3),GR[(R()*GR.length)|0]);
      if(FL&&nx!=null)for(let j=0;j<3;j++){const fx=x+nx*.9+(R()-.5)*1.6,fz=z+nz*.9+(R()-.5)*1.6;shrubO(fx,hAtH(h,fx,fz)-.08,fz,.2+R()*.08,R()<.2?GR[2]:FL);}
      k2++;}}
}
/* ---------- course landmarks, second set (Oct 2026): steel truss, boardwalk and covered bridges, farm windmill/silo/barns,
   flower beds, rock outcrops and ledges, waterfalls, gazebos, hotel towers, hay bales, a dead snag and entrance boulders.
   Placed by rules from the course map (photos give what, not exactly where), anchored in course yards so they show from every hole. */
const CFEEL2={sentryworld:{"flp":[{"p":[[-422.5,45.2],[-413.8,43.5],[-400.0,51.0],[-397.0,56.5],[-401.0,63.0],[-410.0,68.0],[-417.0,76.5],[-422.5,84.5],[-429.0,89.5],[-434.0,87.0],[-432.5,76.5],[-427.5,66.5],[-425.0,55.2]],"c":["#c8302a","#e8c23a","#d8762e","#b8262a"]},{"p":[[-400.0,57.0],[-392.5,51.5],[-385.0,49.0],[-376.2,47.5],[-371.0,51.5],[-370.0,58.0],[-377.5,61.5],[-385.0,60.5],[-393.0,62.0],[-398.0,61.5]],"c":["#c22a28","#d8742c","#e8c23a"]},{"p":[[-362.0,67.5],[-356.0,67.5],[-349.5,76.5],[-342.0,82.5],[-332.0,85.0],[-324.5,91.5],[-323.5,102.0],[-330.0,105.5],[-336.5,100.5],[-344.0,94.5],[-352.5,92.0],[-360.0,87.0],[-364.0,78.0]],"c":["#c22a28","#e8c23a","#d96a8a","#d8762e"]},{"p":[[-412.5,110.0],[-402.5,112.5],[-390.0,119.0],[-380.0,124.0],[-373.5,129.0],[-366.0,131.5],[-357.0,134.0],[-349.5,136.5],[-339.5,139.0],[-336.0,149.0],[-342.5,153.0],[-355.0,153.5],[-365.0,154.0],[-377.5,149.5],[-385.5,139.0],[-395.5,127.0],[-405.0,120.5],[-411.5,115.5]],"c":["#c8302a","#d8762e","#e8c23a","#d96a8a"]}]},lawsonia:{"stone":1},kingsnorth:{"flw":{"bank":"#e0408a"}},baker:{"barn":{"c":"#b3261e","at":[87.4,-593.4],"fit":1}},northfork:{spans:[[-306,170,-320,220,'truss',5.2]]},rossbridge:{br:'truss',pe:'ledge',wf:[[180,32],[559,38]],wfS:1.7,mill:[-97,-27,0],chateau:1,flw:{bridge:'#e57aa8',bank:'#e0679f'}},
  slmh:{br:'grey'},slbm:{br:'grey'},legends:{br:'grey'},windsong:{br:'grey',farm:[['silo',-580,400]],spans:[[-375,513,-288,472,'grey',0]]},maddens:{br:'grey',cov:[121,-219],gz:'pavilion'},
  mystic:{wf:['auto',[-529,476]],wfS:1.3,sign:'Mystic Lake',gz:'gazebo',tw:40,twMax:15000,twBlock:1},wilderness:{tw:20,rock:'granite',snag:[561,-547],stone:1},quarry:{rock:'taconite',stone:1},
  troy:{pe:'ledge',barn:{c:'#3d3b38',at:[-542,-569],L:5,W:4.5,eh:3.2}},stoneridge:{barn:{c:'#f1efe8',at:[15,359],fit:1}},
  legend:{flw:{tee:'#c8242c'}},pines:{flw:{green:'#d02a2e'}},farmlinks:{marble:5}};
function lmAnchors(){if(CUR._lm&&CUR._lm.id===CUR.id)return CUR._lm;const F=CFEEL[CUR.id]||{},C=COURSE,A={id:CUR.id,list:[]};CUR._lm=A;if(!C||!C.holes)return A;
  const P=C.polys,W=(P.water||[]).map(p=>p._mw||(p._mw=mkPoly(p,'water'))),G=(P.green||[]).map(p=>p._mg||(p._mg=mkPoly(p,'green')));
  const wet=(x,y)=>W.some(w=>inPoly(w,x,y));
  // which way the water lies from a bank point: the average of the directions that reach water within 5 yd
  const intoWater=(x,y)=>{let sx=0,sy=0;for(let k=0;k<24;k++){const a=k/24*TAU;if(wet(x+Math.cos(a)*5,y+Math.sin(a)*5)){sx+=Math.cos(a);sy+=Math.sin(a);}}return Math.atan2(sy,sx);};
  const mown=(x,y,r)=>['fairway','green','tee'].some(k=>(P[k]||[]).some(q=>{const Q=q._mp||(q._mp=mkPoly(q,k));return polyDist(Q,x,y,r+2)<r;}));
  for(const[k,x,y]of F.farm||[]){const g=G.slice().sort((a,b)=>hyp(a.x-x,a.y-y)-hyp(b.x-x,b.y-y))[0];A.list.push({k,x,y,a:g?Math.atan2(g.y-y,g.x-x):0});}
  if(F.barn&&F.barn.at){const[x,y]=F.barn.at,g=G.slice().sort((a,b)=>hyp(a.x-x,a.y-y)-hyp(b.x-x,b.y-y))[0];A.list.push({k:'barn',x,y,a:g?Math.atan2(g.y-y,g.x-x)+Math.PI/2:0,c:F.barn.c,L:F.barn.L,W:F.barn.W,eh:F.barn.eh,fit:F.barn.fit});}
  // waterfalls: given bank spots, or 'auto' = the bank nearest a green with no mown grass within 5 yd
  if(F.wf){const used=new Set();for(const spec of F.wf){let x,y;if(spec==='auto'){let best=null;for(const w of W){const p=w.pts;for(let i=0;i<p.length;i+=2){const[px,py]=p[i];if(mown(px,py,5))continue;for(const g of G){if(used.has(g))continue;const d=polyDist(g,px,py,40);if(d<26&&(!best||d<best.d))best={d,g,x:px,y:py};}}}if(!best)continue;used.add(best.g);x=best.x;y=best.y;}else[x,y]=spec;
      A.list.push({k:'wf',x,y,a:intoWater(x,y)});}}
  // a gazebo or pavilion on the bank of a pond behind a green
  if(F.gz){let best=null;for(const w of W){if(w.area<800)continue;for(const g of G){const p=w.pts;for(let i=0;i<p.length;i+=3){const d=polyDist(g,p[i][0],p[i][1],60);if(d>10&&d<45&&!mown(p[i][0],p[i][1],6)&&(!best||w.area>best.w.area*1.2||(w.area>best.w.area*.8&&d<best.d)))best={d,w,x:p[i][0],y:p[i][1]};}}}
    if(best)A.list.push({k:F.gz,x:best.x,y:best.y,a:intoWater(best.x,best.y)});}
  if(F.snag)A.list.push({k:'snag',x:F.snag[0],y:F.snag[1]});
  if(F.mill)A.list.push({k:'mill',x:F.mill[0],y:F.mill[1],a:F.mill[2]||0});
  if(F.cov)A.list.push({k:'cov',x:F.cov[0],y:F.cov[1]});
  for(const sp of F.spans||[])A.list.push({k:'span',x:(sp[0]+sp[2])/2,y:(sp[1]+sp[3])/2,sp});
  return A;}
/* Clubhouses built from survey data rather than the generic house kit. The Royal Golf Club (Lake Elmo): the old 3M Tartan Park clubhouse,
   rebuilt in 2017, measured from the 2022 Minnesota state lidar (each wing's hip roof fitted to the point cloud: footprint, eave, pitch
   and ridge, to about 0.15 yd) and the 2025 Metro aerial photo, and dressed from photos: white walls under two-tier grey-green metal hip
   roofs, a long band of glass round the main floor, a big square lantern cupola over the dining room, a white chimney, the walkout lower
   level on the course side, the deck with white umbrellas at the west end, a glass-railed balcony along the south front, golf carts lined
   up below it and three paved fire-pit circles on the lawn. Block = [name,u0,u1,v0,v1,eave,pitch,ridge] in yards, in the building's own
   frame (u along the long axis, 24 deg north of east; v toward the course), heights above the parking-lot grade. */
const CLUBMODEL={royal:{"o":[228.0,-282.0],"a":24,"ov":1.2,"blocks":[["NW",-23.79,-11.5,-26.18,-2.0,3.87,0.41,6.26],["C2",-24.93,3.42,-11.83,9.12,2.62,0.45,6.88],["C",-16.05,12.66,-7.77,20.04,2.68,0.46,6.7],["W",-34.5,-14.13,-2.79,11.08,2.58,0.57,5.85],["SB",-3.72,11.83,7.95,24.0,2.67,0.53,6.16],["EH",3.61,28.45,1.58,18.2,2.64,0.49,6.15],["EV",16.22,25.35,-11.93,8.05,3.44,0.47,4.97],["NC",-0.14,16.28,-22.63,-9.7,2.59,0.56,5.47],["Nflat",-0.2,6.0,-11.0,-6.5,3.45,0,3.45]],"cup":[-5.3,2.0,2.9,9.3,9.0,10.5],"chim":[-23.75,-22.25,-4.75,-3.0,8.2],"deck":[-36.8,-17.2,11.8,21.8],"fp":[[197.0,-295.6],[205.5,-274.2],[196.7,-270.0],[201.4,-259.5],[217.8,-266.8],[217.2,-268.7],[221.9,-258.8],[232.9,-263.7],[234.7,-260.1],[246.8,-265.5],[245.4,-271.1],[259.8,-277.6],[254.0,-290.6],[250.9,-289.5],[245.6,-301.6],[239.4,-298.8],[244.6,-286.4],[239.3,-284.3],[235.5,-292.7],[227.0,-289.2],[229.2,-291.0],[228.3,-293.1],[226.0,-292.1],[225.6,-293.0],[237.2,-298.2],[233.0,-307.7],[220.2,-302.0],[224.3,-292.1],[212.2,-286.7],[206.2,-299.7]],"ref":[-5,-30],"pits":[[-25.7,26.7,2.6],[-42.0,21.2,2.4],[-10.8,25.0,2.0]],"yard":[-40.7,-22.7,-14.9,0.8],"annex":{"p":[[174,-259],[187,-262],[190,-247],[177,-245]],"c":[182,-253],"e":2.6,"r":2.6}}};
function clubModelFp(h){const M=CLUBMODEL[CUR.id];if(!M||!h.buildings)return;const cl=h.buildings.filter(q=>q.club);if(!cl.length)return;
  const c=cl.sort((a,b)=>b.area-a.area)[0],T0=h.T0,P=mkPoly(M.fp.map(p=>[p[0]-T0[0],p[1]-T0[1]]),c.kind||'bld');
  for(const k of Object.keys(c))if(!(k in P))P[k]=c[k];P.cm=1;P.lmHide=1;h.buildings[h.buildings.indexOf(c)]=P;
  const a=M.a*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),uv=q=>{const dx=q.x+T0[0]-M.o[0],dy=q.y+T0[1]-M.o[1];return[dx*ca-dy*sa,dx*sa+dy*ca];};
  for(const q of h.buildings)if(q!==P){const[u,v]=uv(q),d=M.deck;if(u>d[0]-2&&u<d[1]+2&&v>d[2]-2&&v<d[3]+2)q.lmHide=1;if(M.annex&&hyp(q.x+T0[0]-M.annex.c[0],q.y+T0[1]-M.annex.c[1])<5)q.lmHide=1;}}
function clubModel(h,out){const M=CLUBMODEL[CUR.id];if(!M)return;const T0=h.T0,a=M.a*Math.PI/180,ca=Math.cos(a),sa=Math.sin(a),ox=M.o[0]-T0[0],oz=M.o[1]-T0[1];
  const X=(u,v)=>ox+u*ca+v*sa,Z=(u,v)=>oz-u*sa+v*ca,gAt=(u,v)=>hAtH(h,X(u,v),Z(u,v)),F=gAt(M.ref[0],M.ref[1]),P=(u,v,y)=>[X(u,v),F+y,Z(u,v)];
  const b=h.bounds;if(ox<b[0]-700||ox>b[2]+700||oz<b[1]-700||oz>b[3]+700)return;
  const DU=[ca,0,-sa],DV=[sa,0,ca],UP=[0,1,0],rot=-a,R=rng(9157);
  const C={wall:hexc('#f3f3ef'),trim:hexc('#fbfbf8'),glass:hexc('#3e5262'),glass2:hexc('#3a4a56'),roof:hexc('#4b5452'),skirt:hexc('#606a67'),band:hexc('#26323a'),deck:hexc('#b9b2a4'),pave:hexc('#d6d0c4'),dark:hexc('#3a3632')};
  const nU=s=>[DU[0]*s,0,DU[2]*s],nV=s=>[DV[0]*s,0,DV[2]*s];
  const q4=(A,B,Cc,D,col,n)=>quadO(out,A,B,Cc,D,col,n);
  // a hip roof shell on a rectangle from height hb, pitch p, flat top at cap (or a ridge where the slopes meet); ring=true leaves the top open
  const hip=(u0,u1,v0,v1,hb,p,cap,col,ring,tmax)=>{let t=p>0?(cap-hb)/p:0;t=Math.max(0,Math.min(t,(u1-u0)/2,(v1-v0)/2,tmax??1e9));const ht=hb+p*t,U0=u0+t,U1=u1-t,V0=v0+t,V1=v1-t;
    if(t>0){q4(P(u0,v1,hb),P(u1,v1,hb),P(U1,V1,ht),P(U0,V1,ht),col,nrm([DV[0]*p,1,DV[2]*p]));q4(P(u1,v0,hb),P(u0,v0,hb),P(U0,V0,ht),P(U1,V0,ht),col,nrm([-DV[0]*p,1,-DV[2]*p]));
      q4(P(u1,v1,hb),P(u1,v0,hb),P(U1,V0,ht),P(U1,V1,ht),col,nrm([DU[0]*p,1,DU[2]*p]));q4(P(u0,v0,hb),P(u0,v1,hb),P(U0,V1,ht),P(U0,V0,ht),col,nrm([-DU[0]*p,1,-DU[2]*p]));}
    if(!ring&&U1-U0>.05&&V1-V0>.05)q4(P(U0,V0,ht),P(U1,V0,ht),P(U1,V1,ht),P(U0,V1,ht),col,UP);return[U0,U1,V0,V1,ht];};
  // vertical band round a rectangle
  const band=(u0,u1,v0,v1,y0,y1,col)=>{q4(P(u0,v1,y0),P(u1,v1,y0),P(u1,v1,y1),P(u0,v1,y1),col,nV(1));q4(P(u0,v0,y0),P(u1,v0,y0),P(u1,v0,y1),P(u0,v0,y1),col,nV(-1));
    q4(P(u1,v0,y0),P(u1,v1,y0),P(u1,v1,y1),P(u1,v0,y1),col,nU(1));q4(P(u0,v0,y0),P(u0,v1,y0),P(u0,v1,y1),P(u0,v0,y1),col,nU(-1));};
  const box=(u,v,y,hu,hy,hv,col)=>boxO(out,X(u,v),F+y,Z(u,v),hu,hy,hv,rot,col);
  const inDeck=(u,v)=>{const d=M.deck;return u>d[0]-.5&&u<d[1]+.5&&v>d[2]-.5&&v<d[3]+.5;};
  const inBlk=(u,v,me)=>M.blocks.some(B=>B!==me&&u>B[1]+M.ov-.05&&u<B[2]-M.ov+.05&&v>B[3]+M.ov-.05&&v<B[4]-M.ov+.05);
  const balc=[];
  // walls: white, down to the ground (the lower level walks out on the course side), a glass band round the main floor, windows on the
  // lower level where it stands clear of the ground
  for(const B of M.blocks){const[,u0,u1,v0,v1,e,p]=B,o=M.ov,wt=e+p*o-.05;const sides=[[u0+o,v1-o,u1-o,v1-o,nV(1)],[u1-o,v0+o,u0+o,v0+o,nV(-1)],[u1-o,v1-o,u1-o,v0+o,nU(1)],[u0+o,v0+o,u0+o,v1-o,nU(-1)]];
    for(const[a0,b0,a1,b1,n]of sides){const L=hyp(a1-a0,b1-b0),ns=Math.max(1,Math.round(L/2));
      for(let k=0;k<ns;k++){const t0=k/ns,t1=(k+1)/ns,ua=a0+(a1-a0)*t0,va=b0+(b1-b0)*t0,ub=a0+(a1-a0)*t1,vb=b0+(b1-b0)*t1,um=(ua+ub)/2,vm=(va+vb)/2;
        if(inBlk(um+n[0]*ca*.3-n[2]*sa*.3,vm+(n[0]*sa+n[2]*ca)*.3,B))continue;   // inside another wing
        const g0=Math.min(gAt(ua,va),gAt(ub,vb),gAt(um,vm))-F-.4;q4(P(ua,va,g0),P(ub,vb,g0),P(ub,vb,wt),P(ua,va,wt),C.wall,n);
        const off=[n[0]*.04,0,n[2]*.04],Pq=(u,v,y)=>{const r=P(u,v,y);return[r[0]+off[0],r[1],r[2]+off[2]];};
        // main floor glass with white mullions; the parking side gets separate windows
        const north=n===sides[1][4]&&v0<-5,ga=north?.3:.06,gb=north?.7:.94;
        q4(Pq(ua+(ub-ua)*ga,va+(vb-va)*ga,.45),Pq(ua+(ub-ua)*gb,va+(vb-va)*gb,.45),Pq(ua+(ub-ua)*gb,va+(vb-va)*gb,2.45),Pq(ua+(ub-ua)*ga,va+(vb-va)*ga,2.45),C.glass,n);
        // the lower level, where the ground falls away
        if(g0<-2.4){if(k%2===0)q4(Pq(ua+(ub-ua)*.3,va+(vb-va)*.3,Math.max(g0+1.0,-2.9)),Pq(ua+(ub-ua)*.7,va+(vb-va)*.7,Math.max(g0+1.0,-2.9)),Pq(ua+(ub-ua)*.7,va+(vb-va)*.7,-1.3),Pq(ua+(ub-ua)*.3,va+(vb-va)*.3,-1.3),C.glass2,n);
          if(!inDeck(um+(n[0]*ca-n[2]*sa)*1.5,vm+(n[0]*sa+n[2]*ca)*1.5))balc.push([ua,va,ub,vb,n]);}}}}
  // white slab line between the floors where the lower level shows
  for(const[ua,va,ub,vb,n]of balc){const d=1.5,nu=n[0]*ca-n[2]*sa,nv=n[0]*sa+n[2]*ca,o2=(u,v)=>[u+nu*d,v+nv*d];const A2=o2(ua,va),B2=o2(ub,vb);
    // the balcony along the course side: deck, white fascia, glass rail on white posts
    q4(P(ua,va,-.05),P(ub,vb,-.05),P(B2[0],B2[1],-.05),P(A2[0],A2[1],-.05),C.deck,UP);q4(P(A2[0],A2[1],-.45),P(B2[0],B2[1],-.45),P(B2[0],B2[1],-.05),P(A2[0],A2[1],-.05),C.trim,n);
    q4(P(A2[0],A2[1],.05),P(B2[0],B2[1],.05),P(B2[0],B2[1],1.05),P(A2[0],A2[1],1.05),hexc('#9fb4bd'),n);q4(P(A2[0],A2[1],1.0),P(B2[0],B2[1],1.0),P(B2[0],B2[1],1.12),P(A2[0],A2[1],1.12),C.trim,n);
    box(A2[0],A2[1],.55,.06,.55,.06,C.trim);}
  // roofs: a lighter skirt round the eaves, a dark glazed step, then the main hip in darker standing-seam metal
  for(const B of M.blocks){const[,u0,u1,v0,v1,e,p,cap]=B;if(!(p>0)){q4(P(u0,v0,e),P(u1,v0,e),P(u1,v1,e),P(u0,v1,e),C.roof,UP);band(u0,u1,v0,v1,e-.35,e,C.trim);continue;}
    const s=1.5,r=hip(u0,u1,v0,v1,e,p,cap,C.skirt,true,s);band(u0,u1,v0,v1,e-.22,e,C.trim);
    const[U0,U1,V0,V1,ht]=r;band(U0+.05,U1-.05,V0+.05,V1-.05,ht,ht+.38,C.band);hip(U0+.05,U1-.05,V0+.05,V1-.05,ht+.38,p,cap+.15,C.roof,false);}
  // the lantern cupola over the dining room: white walls with a ring of windows, a hipped cap
  {const[u0,u1,v0,v1,wt,top]=M.cup,i=.45;band(u0+i,u1-i,v0+i,v1-i,5.6,wt,C.wall);const n=4;
    for(let k=0;k<n;k++)for(const sd of[0,1,2,3]){const t=(k+.5)/n;let A,Bp,nn;const w=.32/n;
      if(sd<2){const v=sd?v1-i+.04:v0+i-.04,uu=u0+i+(u1-u0-2*i)*t,hw=(u1-u0-2*i)*w*1.3;A=[uu-hw,v];Bp=[uu+hw,v];nn=nV(sd?1:-1);}else{const u=sd===3?u1-i+.04:u0+i-.04,vv=v0+i+(v1-v0-2*i)*t,hw=(v1-v0-2*i)*w*1.3;A=[u,vv-hw];Bp=[u,vv+hw];nn=nU(sd===3?1:-1);}
      q4(P(A[0],A[1],wt-1.55),P(Bp[0],Bp[1],wt-1.55),P(Bp[0],Bp[1],wt-.35),P(A[0],A[1],wt-.35),C.glass,nn);}
    band(u0,u1,v0,v1,wt-.18,wt,C.trim);hip(u0,u1,v0,v1,wt,(top-wt)/Math.min((u1-u0)/2,(v1-v0)/2),top,C.roof,false);box((u0+u1)/2,(v0+v1)/2,top+.35,.08,.35,.08,C.dark);}
  // the white chimney on the west wing
  {const[u0,u1,v0,v1,top]=M.chim;box((u0+u1)/2,(v0+v1)/2,(top+4)/2,(u1-u0)/2,(top-4)/2,(v1-v0)/2,C.wall);box((u0+u1)/2,(v0+v1)/2,top+.08,(u1-u0)/2+.12,.1,(v1-v0)/2+.12,C.dark);}
  // the deck at the west end: on the main floor over the lawn, white columns, white rail, tables under white umbrellas
  {const[u0,u1,v0,v1]=M.deck;q4(P(u0,v0,-.02),P(u1,v0,-.02),P(u1,v1,-.02),P(u0,v1,-.02),hexc('#a99f8f'),UP);band(u0,u1,v0,v1,-.5,-.02,C.trim);
    for(let u=u0+.5;u<=u1;u+=6.4)for(const v of[v1-.5,v0+(v1-v0)*.45]){const g=gAt(u,v)-F;if(g<-.6){box(u,v,(g-.5)/2,.22,(-.5-g)/2+.3,.22,C.trim);box(u,v,g+.45,.34,.6,.34,hexc('#a59a86'));}}
    // the open colonnade under it: a paved patio where the carts stage
    {const n=6;for(let i=0;i<n;i++)for(let j=0;j<n;j++){const a0=u0+(u1-u0)*i/n,a1=u0+(u1-u0)*(i+1)/n,b0=v0+(v1-v0)*j/n,b1=v0+(v1-v0)*(j+1)/n;
      q4(P(a0,b0,gAt(a0,b0)-F+.06),P(a1,b0,gAt(a1,b0)-F+.06),P(a1,b1,gAt(a1,b1)-F+.06),P(a0,b1,gAt(a0,b1)-F+.06),C.pave,UP);}}
    const rail=(a0,b0,a1,b1,n)=>{q4(P(a0,b0,.05),P(a1,b1,.05),P(a1,b1,1.0),P(a0,b0,1.0),hexc('#a9bec6'),n);q4(P(a0,b0,1.0),P(a1,b1,1.0),P(a1,b1,1.12),P(a0,b0,1.12),C.trim,n);
      const L=hyp(a1-a0,b1-b0),m=Math.max(1,Math.round(L/2.2));for(let k=0;k<=m;k++){const t=k/m;box(a0+(a1-a0)*t,b0+(b1-b0)*t,.56,.05,.56,.05,C.trim);}};
    rail(u0,v1,u1,v1,nV(1));rail(u0,v0,u0,v1,nU(-1));rail(u1,v0+3,u1,v1,nU(1));
    for(let i=0;i<3;i++)for(let j=0;j<4;j++){const u=u0+2.6+j*((u1-u0-5.2)/3),v=v0+2+i*((v1-v0-4)/2);box(u,v,.42,.5,.03,.5,C.dark);box(u,v,1.1,.04,1.1,.04,C.trim);
      const cy=2.2,r=1.35;for(let k=0;k<8;k++){const a1=k/8*TAU,a2=(k+1)/8*TAU,A1=P(u+Math.cos(a1)*r,v+Math.sin(a1)*r,cy-.35),A2=P(u+Math.cos(a2)*r,v+Math.sin(a2)*r,cy-.35),T=P(u,v,cy+.15);triO(out,A1,A2,T,C.trim,UP);}}}
  // the walled service yard north-west (the white-walled square in the photos)
  if(M.yard){const[u0,u1,v0,v1]=M.yard,cs=[[u0,v1],[u1,v1],[u1,v0],[u0,v0]],ns=[nV(1),nU(1),nV(-1),nU(-1)];
    for(let k=0;k<4;k++){const[a0,b0]=cs[k],[a1,b1]=cs[(k+1)%4],m=Math.max(1,Math.round(hyp(a1-a0,b1-b0)/2));for(let j=0;j<m;j++){const t0=j/m,t1=(j+1)/m,A=[a0+(a1-a0)*t0,b0+(b1-b0)*t0],B=[a0+(a1-a0)*t1,b0+(b1-b0)*t1],ga=gAt(...A)-F,gb=gAt(...B)-F;
      q4(P(A[0],A[1],ga-.3),P(B[0],B[1],gb-.3),P(B[0],B[1],gb+2.3),P(A[0],A[1],ga+2.3),C.wall,ns[k]);q4(P(A[0],A[1],ga+2.3),P(B[0],B[1],gb+2.3),P(B[0],B[1],gb+2.42),P(A[0],A[1],ga+2.42),C.trim,ns[k]);}}}
  // the square annex by the deck: white walls under a dark green pyramid roof (2025 aerial)
  if(M.annex){const A=M.annex,pts=A.p.map(q=>[q[0]-T0[0],q[1]-T0[1]]),n=pts.length,gs=pts.map(q=>hAtH(h,q[0],q[1])),g0=Math.min(...gs)-.3,et=Math.max(...gs)+A.e,cx=pts.reduce((s,q)=>s+q[0],0)/n,cz=pts.reduce((s,q)=>s+q[1],0)/n;
    for(let k=0;k<n;k++){const q=pts[k],r=pts[(k+1)%n],nn=nrm([r[1]-q[1],0,-(r[0]-q[0])]),o=[(q[0]+r[0])/2-cx,(q[1]+r[1])/2-cz],sg=o[0]*nn[0]+o[1]*nn[2]>0?1:-1,N=[nn[0]*sg,0,nn[2]*sg];
      quadO(out,[q[0],g0,q[1]],[r[0],g0,r[1]],[r[0],et,r[1]],[q[0],et,q[1]],C.wall,N);
      const L=hyp(r[0]-q[0],r[1]-q[1]),m=Math.max(1,Math.round(L/3.5));for(let j=0;j<m;j++){const t=(j+.5)/m,x=q[0]+(r[0]-q[0])*t+N[0]*.04,z=q[1]+(r[1]-q[1])*t+N[2]*.04,gh=hAtH(h,x,z);boxO(out,x,Math.max(gh+1.2,et-1.6),z,.55,.6,.03,Math.atan2(r[1]-q[1],r[0]-q[0]),C.glass);}
      const ov=.6,Q=[q[0]+(q[0]-cx)/hyp(q[0]-cx,q[1]-cz)*ov,q[1]+(q[1]-cz)/hyp(q[0]-cx,q[1]-cz)*ov],Rr=[r[0]+(r[0]-cx)/hyp(r[0]-cx,r[1]-cz)*ov,r[1]+(r[1]-cz)/hyp(r[0]-cx,r[1]-cz)*ov];
      triO(out,[Q[0],et-.25,Q[1]],[Rr[0],et-.25,Rr[1]],[cx,et+A.r,cz],hexc('#3f5a4c'),nrm([N[0],1.4,N[2]]));}}
  // fire-pit circles on the lawn below: pavers, a dark stone ring, Adirondack chairs
  for(const[u,v,r]of M.pits||[]){const g=gAt(u,v)-F+.06,n=20;for(let k=0;k<n;k++){const a1=k/n*TAU,a2=(k+1)/n*TAU;triO(out,P(u,v,g),P(u+Math.cos(a1)*r,v+Math.sin(a1)*r,g),P(u+Math.cos(a2)*r,v+Math.sin(a2)*r,g),C.pave,UP);}
    for(let k=0;k<10;k++){const a1=k/10*TAU;box(u+Math.cos(a1)*.65,v+Math.sin(a1)*.65,g+.2,.18,.2,.18,hexc('#5a5550'));}
    for(let k=0;k<5;k++){const an=k/5*TAU+.3,cu=u+Math.cos(an)*(r-.7),cv=v+Math.sin(an)*(r-.7),ch=hexc('#ece8de');box(cu,cv,g+.2,.24,.04,.24,ch);box(cu+Math.cos(an)*.24,cv+Math.sin(an)*.24,g+.42,.2,.24,.2,ch);}}
  // golf carts lined up below the deck facing the putting green, and yellow mums along the front (the putting-green photo)
  {const d=M.deck;for(let k=0;k<8;k++){const u=d[0]+1.5+k*2.1,v=d[3]+2.6,g=gAt(u,v)-F,cc=hexc('#f0efea'),dk=hexc('#2b2b2b');box(u,v,g+.5,.55,.3,.85,cc);box(u,v,g+1.75,.62,.05,.95,cc);
      for(const s2 of[-1,1])box(u,v+s2*.8,g+1.15,.04,.6,.04,dk);box(u,v-.2,g+.9,.45,.12,.35,dk);}
    for(const B of M.blocks)if(B[0]==='SB'||B[0]==='EH')for(let u=B[1]+M.ov+1.2;u<B[2]-M.ov-1;u+=3){const v=B[4]-M.ov+.9,g=gAt(u,v)-F;box(u,v,g+.18,1.05,.2,.35,hexc('#e9c21f'));}}
}
function courseFeelPre(h){const F=CFEEL[CUR.id]||{};if(!F.tw&&!F.barn&&!F.farm&&!F.mill)return;const A=lmAnchors(),T0=h.T0;
  if(F.tw){const big=(h.buildings||[]).filter(q=>!q.club&&q.area>1400&&q.area<=(F.twMax||1e9)).sort((a,b)=>b.area-a.area)[0];if(big){if(!F.twBlock)big.rec=[F.tw,0,0,null,big.rec&&big.rec[4]];else big.lmHide=1;big.lmTower=1;}}
  for(const o of A.list)if(o.k==='barn'||o.k==='silo'||o.k==='windmill'||o.k==='mill'){const x=o.x-T0[0],y=o.y-T0[1];for(const q of h.buildings||[])if(!q.club&&x>q.bb[0]-9&&x<q.bb[2]+9&&y>q.bb[1]-9&&y<q.bb[3]+9){q.lmHide=1;
      // the barn takes the mapped building's own size and orientation
      if((o.fit||o.k==='mill')&&!o.fitD&&x>q.bb[0]-1&&x<q.bb[2]+1&&y>q.bb[1]-1&&y<q.bb[3]+1){const ob=bldOBB(q.pts,null);o.fitD=[(ob.u1-ob.u0)/2,(ob.v1-ob.v0)/2,ob.t];o.gb=q.gh;}}}}
function courseFeel2(h,out){const F=CFEEL[CUR.id]||{},b=h.bounds,T0=h.T0,R=rng(((T0[0]*7)|0)^((T0[1]*11)|0)^5531),A=lmAnchors();
  const inB=(x,y,m)=>x>b[0]-m&&x<b[2]+m&&y>b[1]-m&&y<b[3]+m;
  const cyl=(x,y0,z,r,ht,n,col,top)=>{for(let k=0;k<n;k++){const a1=k/n*TAU,a2=(k+1)/n*TAU,A1=[x+Math.cos(a1)*r,y0,z+Math.sin(a1)*r],A2=[x+Math.cos(a2)*r,y0,z+Math.sin(a2)*r],B1=[A1[0],y0+ht,A1[2]],B2=[A2[0],y0+ht,A2[2]],nn=[Math.cos((a1+a2)/2),0,Math.sin((a1+a2)/2)];quadO(out,A1,A2,B2,B1,mul(col,.9+.1*nn[0]),nn);if(top)triO(out,B1,B2,[x,y0+ht,z],col,[0,1,0]);}};
  const dome=(x,y0,z,r,ht,col)=>{const n=12;for(let k=0;k<n;k++){const a1=k/n*TAU,a2=(k+1)/n*TAU;for(let j=0;j<4;j++){const e1=j/4*Math.PI/2,e2=(j+1)/4*Math.PI/2,P=(a,e)=>[x+Math.cos(a)*Math.cos(e)*r,y0+Math.sin(e)*ht,z+Math.sin(a)*Math.cos(e)*r];let nn=nrm([Math.cos(a1),.6,Math.sin(a1)]);quadO(out,P(a1,e1),P(a2,e1),P(a2,e2),P(a1,e2),mul(col,.85+.15*Math.max(0,nn[0])),nn);}}};
  const rock=(x,y,z,s,col,flat)=>{const sx=s*(.9+R()*.6),sy=s*(flat?.35:.6+R()*.35),sz=s*(.8+R()*.5),ra=R()*TAU,ca=Math.cos(ra),sa=Math.sin(ra),sd=R()*100;
    const P=q=>{const k=1+.2*Math.sin(q[0]*5.1+sd)*Math.sin(q[2]*4.3+sd*.7)+.12*Math.sin(q[1]*6.7+sd*1.3),lx=q[0]*sx*k,ly=q[1]*sy*k,lz=q[2]*sz*k;return[x+lx*ca-lz*sa,y+ly+sy*.2,z+lx*sa+lz*ca];};
    const c=mul(col,.85+R()*.3);for(const[a,b2,c2]of ICO0){if(a[1]+b2[1]+c2[1]<-1.2)continue;pushTri(out,P(a),P(b2),P(c2),c);}};
  const bed=(x,z,col,n,spread)=>{n*=2;spread*=1.5;for(let k=0;k<n;k++){const px=x+(R()-.5)*spread,pz=z+(R()-.5)*spread,gy=hAtH(h,px,pz),lc=lieCodeAt(h,px,pz);if(lc>1||lc<0)continue;rock(px,gy-.05,pz,.3+R()*.2,R()<.25?[.2,.36,.16]:hexc(col),false);}};
  // bridges: truss sides, a roof over the longest one, azaleas at the ends
  const BR=h._bridges||[];
  if(F.br==='truss')for(const pts of BR){const n=pts.length,e0=hAtH(h,pts[0][0],pts[0][1]),e1=hAtH(h,pts[n-1][0],pts[n-1][1]),Y=i=>{const t=i/(n-1);return(e0*(1-t)+e1*t)+.35+.6*Math.sin(Math.PI*t);},col=hexc('#6e4430');
    for(let i=0;i<n-1;i++){const a=pts[i],c=pts[i+1],dx=c[0]-a[0],dz=c[1]-a[1],L=hyp(dx,dz)||1,px=-dz/L*1.45,pz=dx/L*1.45,t0=i/(n-1),t1=(i+1)/(n-1),H0=1.3+1.4*Math.sin(Math.PI*t0),H1=1.3+1.4*Math.sin(Math.PI*t1);
      for(const sg of[-1,1]){const ax=a[0]+px*sg,az=a[1]+pz*sg,bx=c[0]+px*sg,bz=c[1]+pz*sg,ya=Y(i),yb=Y(i+1),nn=[px*sg/1.45,0,pz*sg/1.45];
        quadO(out,[ax,ya+H0-.12,az],[bx,yb+H1-.12,bz],[bx,yb+H1+.08,bz],[ax,ya+H0+.08,az],col,nn);quadO(out,[ax,ya+H0-.12,az],[bx,yb+H1-.12,bz],[bx,yb+H1+.08,bz],[ax,ya+H0+.08,az],mul(col,.8),mul(nn,-1));
        if(i%2===0){boxO(out,ax,ya+H0/2,az,.06,H0/2,.06,0,col);const m=[(ax+bx)/2,0,(az+bz)/2];quadO(out,[ax,ya,az],[ax+(bx-ax)*.15,ya,az+(bz-az)*.15],[bx,yb+H1,bz],[bx-(bx-ax)*.15,yb+H1,bz-(bz-az)*.15],mul(col,.9),nn);}}}
    const a=pts[0],c=pts[n-1];for(const[q,yy]of[[a,e0],[c,e1]])boxO(out,q[0],yy-.4,q[1],1.9,.8,1.2,Math.atan2(c[1]-a[1],c[0]-a[0]),hexc('#9a958a'));}
  if(F.cov&&BR.length){const CV=A.list.find(o=>o.k==='cov'),pts=CV&&BR.find(p=>{const m=p[p.length>>1];return hyp(m[0]+T0[0]-CV.x,m[1]+T0[1]-CV.y)<10;});if(pts){const n=pts.length,e0=hAtH(h,pts[0][0],pts[0][1]),e1=hAtH(h,pts[n-1][0],pts[n-1][1]),Y=i=>{const t=i/(n-1);return(e0*(1-t)+e1*t)+.35+.6*Math.sin(Math.PI*t);},rc=hexc('#5b4636'),wc=hexc('#8a6a4c');
    for(let i=0;i<n-1;i++){const a=pts[i],c=pts[i+1],dx=c[0]-a[0],dz=c[1]-a[1],L=hyp(dx,dz)||1,px=-dz/L*1.6,pz=dx/L*1.6,ya=Y(i)+2.6,yb=Y(i+1)+2.6;
      for(const sg of[-1,1]){const nn=nrm([px*sg,1.2,pz*sg]);quadO(out,[a[0]+px*sg,ya,a[1]+pz*sg],[c[0]+px*sg,yb,c[1]+pz*sg],[c[0],yb+1.2,c[1]],[a[0],ya+1.2,a[1]],rc,nn);
        quadO(out,[a[0]+px*sg*.95,ya-.9,a[1]+pz*sg*.95],[c[0]+px*sg*.95,yb-.9,c[1]+pz*sg*.95],[c[0]+px*sg*.95,yb,c[1]+pz*sg*.95],[a[0]+px*sg*.95,ya,a[1]+pz*sg*.95],wc,[px*sg,0,pz*sg]);
        if(i%3===0)boxO(out,a[0]+px*sg*.95,(Y(i)+ya)/2,a[1]+pz*sg*.95,.09,(ya-Y(i))/2,.09,0,wc);}}}}
  if(F.flw&&F.flw.bridge)for(const pts of BR)for(const q of[pts[0],pts[pts.length-1]])for(const sg of[-1,1]){const a=pts[1]||q,dx=a[0]-q[0],dz=a[1]-q[1],l=hyp(dx,dz)||1;bed(q[0]-dz/l*3.2*sg,q[1]+dx/l*3.2*sg,F.flw.bridge,9,3);}

  for(const o of A.list){if(o.k!=='span')continue;const[x0,y0,x1,y1,st,lift]=o.sp,ax=x0-T0[0],az=y0-T0[1],bx2=x1-T0[0],bz2=y1-T0[1];if(!inB((ax+bx2)/2,(az+bz2)/2,400))continue;
    const n=Math.max(2,Math.ceil(hyp(bx2-ax,bz2-az)/1.5)),pts=[];for(let k=0;k<=n;k++)pts.push([ax+(bx2-ax)*k/n,az+(bz2-az)*k/n]);
    const e0=hAtH(h,ax,az),e1=hAtH(h,bx2,bz2);let wl=-1e9;for(const w of h.water||[])if(w.lvl!=null&&pts.some(p=>inPoly(w,p[0],p[1]))){const q=pts.find(p=>inPoly(w,p[0],p[1]));wl=Math.max(wl,wLvl(w,q[0],q[1]));}
    const Y=i=>{const t=i/n;return Math.max((e0*(1-t)+e1*t)+.35+(lift?lift*Math.sin(Math.PI*Math.min(1,Math.max(0,(t-.02)/.96))):.25*Math.sin(Math.PI*t)),wl+.45);};
    const dc=hexc(st==='truss'?'#6f6a63':'#8e8a80'),rc=hexc(st==='truss'?'#6e4430':'#77736b'),wd=st==='truss'?1.7:1.4,ang=Math.atan2(bz2-az,bx2-ax);
    for(let i=0;i<n;i++){const a=pts[i],c=pts[i+1],dx=c[0]-a[0],dz=c[1]-a[1],L=hyp(dx,dz)||1,px=-dz/L*wd,pz=dx/L*wd,ya=Y(i),yb=Y(i+1);
      quadO(out,[a[0]-px,ya,a[1]-pz],[c[0]-px,yb,c[1]-pz],[c[0]+px,yb,c[1]+pz],[a[0]+px,ya,a[1]+pz],mul(dc,i%2?1:.92),[0,1,0]);
      for(const sg of[-1,1]){const sx=a[0]+px*sg,sz=a[1]+pz*sg,ex=c[0]+px*sg,ez=c[1]+pz*sg,nn=[px*sg/wd,0,pz*sg/wd];quadO(out,[sx,ya-.4,sz],[ex,yb-.4,ez],[ex,yb,ez],[sx,ya,sz],mul(rc,.8),nn);
        if(st==='truss'){const t0=i/n,t1=(i+1)/n,H0=1.4+1.6*Math.sin(Math.PI*t0),H1=1.4+1.6*Math.sin(Math.PI*t1);quadO(out,[sx,ya+H0-.14,sz],[ex,yb+H1-.14,ez],[ex,yb+H1+.08,ez],[sx,ya+H0+.08,sz],rc,nn);quadO(out,[sx,ya+H0-.14,sz],[ex,yb+H1-.14,ez],[ex,yb+H1+.08,ez],[sx,ya+H0+.08,sz],mul(rc,.8),mul(nn,-1));
          if(i%2===0){boxO(out,sx,ya+H0/2,sz,.07,H0/2,.07,0,rc);quadO(out,[sx,ya+.05,sz],[sx+(ex-sx)*.2,ya+.05,sz+(ez-sz)*.2],[ex,yb+H1,ez],[ex-(ex-sx)*.2,yb+H1,ez-(ez-sz)*.2],mul(rc,.9),nn);}}
        else{quadO(out,[sx,ya+.95,sz],[ex,yb+.95,ez],[ex,yb+1.05,ez],[sx,ya+1.05,sz],rc,[0,1,0]);if(i%2===0)boxO(out,sx,ya+.5,sz,.07,.5,.07,0,rc);}}
      if(!lift&&i%3===0)for(const sg of[-1,1]){const gx=a[0]+px*sg*.9,gz=a[1]+pz*sg*.9,gb=Math.min(hAtH(h,gx,gz),wl)-.5;boxO(out,gx,(ya+gb)/2,gz,.09,(ya-gb)/2,.09,0,mul(rc,.9));}}
    // stone-block abutments under a span carried over a road
    if(lift)for(const[q,yy]of[[pts[0],Y(0)],[pts[n],Y(n)]]){const gq=hAtH(h,q[0],q[1]);boxO(out,q[0],(yy+gq-.6)/2,q[1],1.4,(yy-gq+.6)/2,wd+.6,ang,hexc('#9a958a'));}
    (h._bridges||(h._bridges=[]));}
  // flower beds behind the tees or behind the greens
  // azalea drifts along the pond and creek banks (Ross Bridge's spring photos): a bed every ~26 yd of shore, 3.5 yd up the bank
  if(F.flw&&F.flw.bank){let c=0;for(const w of h.water||[]){if((w.area||0)<250)continue;const P=w.pts;let acc=13;for(let i=0;i<P.length&&c<16;i++){const a=P[i],b=P[(i+1)%P.length],dx=b[0]-a[0],dz=b[1]-a[1],l=hyp(dx,dz)||1;acc+=l;if(acc<26)continue;acc=0;
      if(!inB(a[0],a[1],-5)||R()<.35)continue;let nx=-dz/l,nz=dx/l;if(inPoly(w,a[0]+nx*3.5,a[1]+nz*3.5)){nx=-nx;nz=-nz;}const bx=a[0]+nx*3.5,bz=a[1]+nz*3.5;if(lieCodeAt(h,bx,bz)>1)continue;c++;bed(bx,bz,F.flw.bank,10,3.4);bed(bx+dx/l*3,bz+dz/l*3,F.flw.bank,6,2.4);}}}
  if(F.flw&&F.flw.tee&&h.line){const L0=h.line,a=L0[0],c=L0[1],dx=c[0]-a[0],dz=c[1]-a[1],l=hyp(dx,dz)||1,ux=dx/l,uz=dz/l,pin=L0[L0.length-1];
    const T=(h.tees||[]).filter(P=>!P.syn&&hyp(P.x-a[0],P.y-a[1])<50&&Math.abs((P.x-a[0])*uz-(P.y-a[1])*ux)<15).sort((p,q)=>((p.x-a[0])*ux+(p.y-a[1])*uz)-((q.x-a[0])*ux+(q.y-a[1])*uz))[0];
    if(T){let bx=T.x,bz=T.y;for(let s2=0;s2<40&&polyDist(T,bx,bz,8)>-3.5;s2++){bx-=ux;bz-=uz;}for(let s2=0;s2<80&&(polyDist(T,bx,bz,8)<3||(h.tees||[]).some(P=>polyDist(P,bx,bz,8)<3)||lieCodeAt(h,bx,bz)>1);s2++){bx-=ux;bz-=uz;}
      for(let k=-2;k<=2;k++)bed(bx-uz*k*1.6,bz+ux*k*1.6,F.flw.tee,6,1.4);}}
  if(F.flw&&F.flw.green)for(const P of h.greens||[]){const L0=h.line,q=L0[L0.length-2]||L0[0],dx=P.x-q[0],dz=P.y-q[1],l=hyp(dx,dz)||1,r=Math.sqrt(P.area/Math.PI)+4;for(let k=-3;k<=3;k++){const a=Math.atan2(dz,dx)+k*.16;let rr=Math.sqrt(P.area/Math.PI)*.5,x,z;for(;rr<r+18;rr+=1){x=P.x+Math.cos(a)*rr;z=P.y+Math.sin(a)*rr;if(polyDist(P,x,z,8)>3.5&&lieCodeAt(h,x,z)<=1)break;}if(rr>=r+18)continue;bed(x,z,F.flw.green,5,1.5);}}
  // anchored landmarks
  for(const o of A.list){const x=o.x-T0[0],z=o.y-T0[1];if(!inB(x,z,o.k==='windmill'||o.k==='silo'?600:350))continue;const g=hAtH(h,x,z);
    if(o.k==='windmill'){const ht=14,tc=hexc('#8f9294');for(const[dx,dz]of[[-1.6,-1.6],[1.6,-1.6],[1.6,1.6],[-1.6,1.6]]){const B=[x+dx,g,z+dz],T=[x+dx*.2,g+ht,z+dz*.2],nn=nrm([dx,0,dz]);quadO(out,[B[0]-.08,B[1],B[2]],[B[0]+.08,B[1],B[2]],[T[0]+.08,T[1],T[2]],[T[0]-.08,T[1],T[2]],tc,nn);quadO(out,[B[0],B[1],B[2]-.08],[B[0],B[1],B[2]+.08],[T[0],T[1],T[2]+.08],[T[0],T[1],T[2]-.08],tc,nn);}
      for(let j=1;j<5;j++){const y=g+ht*j/5,w=1.6*(1-j/5*.8);for(const[a1,a2]of[[[-w,-w],[w,-w]],[[w,-w],[w,w]],[[w,w],[-w,w]],[[-w,w],[-w,-w]]])boxO(out,x+(a1[0]+a2[0])/2,y,z+(a1[1]+a2[1])/2,Math.abs(a2[0]-a1[0])/2+.05,.05,Math.abs(a2[1]-a1[1])/2+.05,0,tc);}
      const hx=x+Math.cos(o.a)*.4,hz=z+Math.sin(o.a)*.4,hy=g+ht+.3,ux=Math.cos(o.a),uz=Math.sin(o.a);boxO(out,x,hy,z,.5,.35,.5,o.a,tc);
      for(let k=0;k<16;k++){const a=k/16*TAU,ca=Math.cos(a),sa=Math.sin(a),r0=.5,r1=2.6,px=-uz,pz=ux;const P=(r,da)=>[hx+ux*.6+px*Math.cos(a+da)*r,hy+Math.sin(a+da)*r,hz+uz*.6+pz*Math.cos(a+da)*r];quadO(out,P(r0,-.09),P(r0,.09),P(r1,.14),P(r1,-.14),hexc('#b9bbb8'),[ux,0,uz]);}
      quadO(out,[hx-ux*.6,hy,hz-uz*.6],[hx-ux*3.4,hy+.2,hz-uz*3.4],[hx-ux*3.4,hy+1.4,hz-uz*3.4],[hx-ux*.6,hy+.5,hz-uz*.6],hexc('#9c9e9b'),[-uz,0,ux]);}
    else if(o.k==='silo'){cyl(x,g-.2,z,2.6,15,16,hexc('#8f8b84'),false);for(let j=1;j<6;j++)cyl(x,g+j*2.6,z,2.64,.1,16,hexc('#7d7972'),false);dome(x,g+14.8,z,2.7,2.3,hexc('#c8ccd0'));
      const ca=Math.cos(o.a),sa=Math.sin(o.a);boxO(out,x+ca*2.75,g+7.4,z+sa*2.75,.45,7.6,.45,o.a,hexc('#ecebe6'));}
    else if(o.k==='barn'){const FD=o.fitD,L2=FD?Math.max(3,FD[0]-.3):(o.L||9),W2=FD?Math.max(3,FD[1]-.3):(o.W||6.5),eh=o.eh||(FD?Math.min(4.6,Math.max(3.2,W2*.6)):4.2),rr=Math.min(4.2,W2*.75),ang=FD?FD[2]:o.a,ca=Math.cos(ang),sa=Math.sin(ang),P=(u,v,y)=>[x+u*ca-v*sa,g+y,z+u*sa+v*ca],wc=hexc(o.c),tc=mul(wc,BLD_LUM(wc)>.6?.82:1.6);
      boxO(out,x,g+eh/2-.3,z,L2,eh/2+.3,W2,ang,wc);for(const sg of[-1,1]){const nn=nrm([-sa*sg,1.1,ca*sg]);quadO(out,P(-L2-.4,sg*(W2+.5),eh-.25),P(L2+.4,sg*(W2+.5),eh-.25),P(L2+.4,sg*W2*.45,eh+rr*.75),P(-L2-.4,sg*W2*.45,eh+rr*.75),hexc('#4a4744'),nn);
        quadO(out,P(-L2-.4,sg*W2*.45,eh+rr*.75),P(L2+.4,sg*W2*.45,eh+rr*.75),P(L2+.4,0,eh+rr),P(-L2-.4,0,eh+rr),hexc('#4a4744'),nrm([-sa*sg*.4,1,ca*sg*.4]));}
      for(const su of[-1,1]){const nn=[ca*su,0,sa*su],u=su*(L2+.01);triO(out,P(u,-W2,eh),P(u,W2,eh),P(u,0,eh+rr),wc,nn);quadO(out,P(u,-W2,eh),P(u,-W2*.45,eh+rr*.75),P(u,0,eh+rr),P(u,-W2*.45,eh),wc,nn);
        const u2=su*(L2+.03);quadO(out,P(u2,-2,0),P(u2,2,0),P(u2,2,3.6),P(u2,-2,3.6),tc,nn);quadO(out,P(u2*1.001,-.08,0),P(u2*1.001,.08,0),P(u2*1.001,.08,3.6),P(u2*1.001,-.08,3.6),wc,nn);}}
    else if(o.k==='wf'){const ux=Math.cos(o.a),uz=Math.sin(o.a),px=-uz,pz=ux,base=g-.1,stc=F.pe==='ledge'?hexc('#b59a72'):hexc('#8f8a80'),okR=(xx,zz)=>{const c=lieCodeAt(h,xx,zz);return c<2||c===6;};
      const S=F.wfS||1;let wl=null;for(const w of h.water||[])if(w.lvl!=null&&inPoly(w,x+ux*2*S,z+uz*2*S))wl=wLvl(w,x+ux*2*S,z+uz*2*S);const bot=wl!=null?Math.min(base-.2,wl):base-.4,top=Math.max(base+2.3*S,bot+2.2*S);
      for(let k=0;k<16;k++){const u=(R()-.5)*7,v=-.6-R()*3.4,xx=x+px*u+ux*v,zz=z+pz*u+uz*v;if(!okR(xx,zz))continue;rock(xx,base+R()*1.6,zz,.8+R()*.8,stc,R()<.5);}
      // the rock face behind the falling water: a lip, the ledges it drops over, and boulders either side
      rock(x-ux*.9*S,top-.6*S,z-uz*.9*S,1.3*S,stc,true);for(let j=0;j<3;j++){const sj=(j+.5)/3,vv=(-.3+2.1*Math.pow(sj,.8)-.5)*S,yy=top-(top-bot)*Math.pow(sj,1.5)-.5*S;rock(x+ux*vv,yy,z+uz*vv,.8*S,mul(stc,.8),true);
        for(const sg of[-1,1])rock(x+ux*(vv+.2)+px*sg*(1.5+sj*.4)*S,yy+.2,z+uz*(vv+.2)+pz*sg*(1.5+sj*.4)*S,.75*S,stc,true);}
      // the moving water (sheet and foam pool) is its own animated mesh: r3Waterfalls
      (h._wfs||(h._wfs=[])).push({x,z,ux,uz,top,bot,S});}
    else if(o.k==='gazebo'||o.k==='pavilion'){const wc=hexc(o.k==='gazebo'?'#efede6':'#7a5a3c'),rc=hexc(o.k==='gazebo'?'#3f5a4a':'#5b4636'),r=o.k==='gazebo'?3:3.6,n=o.k==='gazebo'?8:4,yb=g+.3;
      cyl(x,yb-.6,z,r+.3,.6,n,hexc('#8a6a4c'),true);for(let k=0;k<n;k++){const a=k/n*TAU+(n===4?Math.PI/4:0);boxO(out,x+Math.cos(a)*r,yb+1.4,z+Math.sin(a)*r,.12,1.4,.12,0,wc);}
      for(let k=0;k<n;k++){const a1=k/n*TAU+(n===4?Math.PI/4:0),a2=(k+1)/n*TAU+(n===4?Math.PI/4:0),A1=[x+Math.cos(a1)*(r+.6),yb+2.8,z+Math.sin(a1)*(r+.6)],A2=[x+Math.cos(a2)*(r+.6),yb+2.8,z+Math.sin(a2)*(r+.6)],T=[x,yb+4.6,z];let nn=nrm(cross(sub(A2,A1),sub(T,A1)));if(nn[1]<0)nn=mul(nn,-1);triO(out,A1,A2,T,rc,nn);triO(out,A1,A2,T,mul(wc,.7),mul(nn,-1));}}
    else if(o.k==='mill'){/* Ross Bridge's old stone mill house at the head of the creek (photos 18 and 25): honey-coloured stacked stone, a steep
      grey roof with a little cupola on the ridge and a timber lean-to, and the creek pouring out from under it down the stones into the pond */
      const FD=o.fitD,ang=FD?FD[2]:o.a,ca=Math.cos(ang),sa=Math.sin(ang),L2=FD?Math.min(6,Math.max(4,FD[0]-.3)):5,W2=FD?Math.min(4.2,Math.max(3,FD[1]-.3)):3.6,rr=3.6,st=hexc('#c39a62'),dk=hexc('#9c7a4c'),rf=hexc('#625c57'),wd=hexc('#7a5a3c'),win=hexc('#2d2a28'),
        cg=[[-1,-1],[-1,1],[1,-1],[1,1]].map(([su,sv])=>hAtH(h,x+su*L2*ca-sv*W2*sa,z+su*L2*sa+sv*W2*ca)),gm=Math.max(...cg),gg=Math.min(g,...cg)-.4;const eh=Math.min(9.5,Math.max(6.5,gm-gg+5)),P=(u,v,y)=>[x+u*ca-v*sa,gg+y,z+u*sa+v*ca];
      boxO(out,x,gg+eh/2-.6,z,L2,eh/2+.6,W2,ang,st);for(let yy=1.4;yy<eh-.6;yy+=1.4)boxO(out,x,gg+yy,z,L2+.03,.05,W2+.03,ang,mul(st,.9));boxO(out,x,gg+eh-.15,z,L2+.12,.15,W2+.12,ang,dk);
      for(const sg of[-1,1]){const nn=nrm([-sa*sg,1.05,ca*sg]);quadO(out,P(-L2-.5,sg*(W2+.5),eh-.4),P(L2+.5,sg*(W2+.5),eh-.4),P(L2+.5,0,eh+rr),P(-L2-.5,0,eh+rr),rf,nn);}
      for(const su of[-1,1])triO(out,P(su*(L2+.01),-W2,eh),P(su*(L2+.01),W2,eh),P(su*(L2+.01),0,eh+rr),st,[ca*su,0,sa*su]);
      for(const su of[-1,1])for(let yy=eh-3.4;yy>.8;yy-=2.9){const c=P(su*(L2+.06),0,yy);boxO(out,c[0],c[1]+.6,c[2],.05,.6,.5,ang,win);}
      for(const sv of[-1,1])for(let yy=eh-3.4;yy>.8;yy-=2.9)for(const uu of[-L2*.5,L2*.5]){const c=P(uu,sv*(W2+.06),yy);boxO(out,c[0],c[1]+.6,c[2],.5,.6,.05,ang,win);}
      {const c=P(L2*.25,0,0);boxO(out,c[0],gg+eh+rr+.5,c[2],.55,.55,.55,ang,hexc('#e8e2d4'));for(const[a1,a2]of[[[-1,-1],[1,-1]],[[1,-1],[1,1]],[[1,1],[-1,1]],[[-1,1],[-1,-1]]]){const A1=[c[0]+(a1[0]*ca-a1[1]*sa)*.75,gg+eh+rr+1.05,c[2]+(a1[0]*sa+a1[1]*ca)*.75],A2=[c[0]+(a2[0]*ca-a2[1]*sa)*.75,gg+eh+rr+1.05,c[2]+(a2[0]*sa+a2[1]*ca)*.75];triO(out,A1,A2,[c[0],gg+eh+rr+2,c[2]],rf,nrm([(A1[0]+A2[0])/2-c[0],.8,(A1[2]+A2[2])/2-c[2]]));}}
      // the creek comes out from under the mill: find the water, open an arch in the wall facing it and let it fall down the stones
      const wetAt=(xx,zz)=>(h.water||[]).find(w=>inPoly(w,xx,zz));let bd=null;
      for(let k=0;k<36;k++){const an=k/36*TAU,dx=Math.cos(an),dz=Math.sin(an);for(let r=3;r<16;r+=.5){const w=wetAt(x+dx*r,z+dz*r);if(w){if(!bd||r<bd.r)bd={r,an,dx,dz,w};break;}}}
      const ls=bd&&(bd.dx*ca+bd.dz*sa)<0?-1:1;
      {const gl=hAtH(h,...(q=>[q[0],q[2]])(P(-ls*(L2+2),0,0)))-gg;boxO(out,...(q=>[q[0],gg+gl+2.6,q[2]])(P(-ls*(L2+2.1),0,0)),2.1,.08,W2*.75,ang,wd);for(const vv of[-1,1]){const c=P(-ls*(L2+4),vv*W2*.7,0);boxO(out,c[0],gg+gl+1.3,c[2],.1,1.3,.1,ang,wd);}
        const nn=nrm([-ca*ls,1.6,-sa*ls]);quadO(out,P(-ls*(L2+4.3),-W2*.85,gl+2.7),P(-ls*(L2+4.3),W2*.85,gl+2.7),P(-ls*L2,W2*.85,gl+3.9),P(-ls*L2,-W2*.85,gl+3.9),rf,nn);}
      if(bd){const{dx,dz}=bd,lu=dx*ca+dz*sa,lv=-dx*sa+dz*ca,eW=Math.min(Math.abs(lu)>.01?L2/Math.abs(lu):1e9,Math.abs(lv)>.01?W2/Math.abs(lv):1e9),px=-dz,pz=dx,
          bx=x+dx*bd.r,bz=z+dz*bd.r,bot=wLvl(bd.w,bx+dx*1.5,bz+dz*1.5),S=1.35,lip=Math.max(eW+.1,bd.r-1.4*S),lx=x+dx*lip,lz=z+dz*lip,top=Math.max(bot+2.4,gg+2.8);
        const wx=x+dx*(eW+.08),wz=z+dz*(eW+.08);quadO(out,[wx-px*1.1,top-.3,wz-pz*1.1],[wx+px*1.1,top-.3,wz+pz*1.1],[wx+px*1.1,top+1.5,wz+pz*1.1],[wx-px*1.1,top+1.5,wz-pz*1.1],hexc('#1d1b1a'),[dx,0,dz]);
        if(lip>eW+.6){const m=(eW+lip)/2,cx=x+dx*m,cz=z+dz*m,hl=(lip-eW)/2;for(const sg of[-1,1])boxO(out,cx+px*1.25*sg,top-.25,cz+pz*1.25*sg,hl,.55,.25,Math.atan2(dz,dx),dk);
          boxO(out,cx,top-.75,cz,hl,.45,1.2,Math.atan2(dz,dx),dk);quadO(out,[x+dx*eW-px*1,top-.2,z+dz*eW-pz*1],[x+dx*eW+px*1,top-.2,z+dz*eW+pz*1],[lx+px*1,top-.25,lz+pz*1],[lx-px*1,top-.25,lz-pz*1],hexc('#5f8fa0'),[0,1,0]);}
        for(let k=0;k<10;k++){const sg=k%2?1:-1,t=(k>>1)/5;rock(lx+px*sg*(1.5+R()*.6)+dx*(t*2.4-.3),top-.6-(top-bot)*t,lz+pz*sg*(1.5+R()*.6)+dz*(t*2.4-.3),.75,dk,true);}
        (h._wfs||(h._wfs=[])).push({x:lx+dx*.35*S,z:lz+dz*.35*S,ux:dx,uz:dz,top:top-.2,bot,S});}}
    else if(o.k==='snag'){const c=hexc('#cfccc2');cyl(x,g-.2,z,.62,11,7,c,true);cyl(x,g+10.6,z,.38,2.2,6,c,true);for(let k=0;k<7;k++){const a=k*2.1+R()*.5,y=g+3.2+k*1.15,l=3.2+R()*2.2-k*.2;const A1=[x,y,z],B1=[x+Math.cos(a)*l,y+l*.6,z+Math.sin(a)*l];quadO(out,[A1[0]-.34,A1[1],A1[2]],[A1[0]+.34,A1[1],A1[2]],[B1[0]+.14,B1[1],B1[2]],[B1[0]-.14,B1[1],B1[2]],c,[0,0,1]);quadO(out,[A1[0],A1[1],A1[2]-.34],[A1[0],A1[1],A1[2]+.34],[B1[0],B1[1],B1[2]+.14],[B1[0],B1[1],B1[2]-.14],c,[1,0,0]);quadO(out,[A1[0]-.34,A1[1],A1[2]],[A1[0]+.34,A1[1],A1[2]],[B1[0]+.14,B1[1],B1[2]],[B1[0]-.14,B1[1],B1[2]],c,[0,0,-1]);quadO(out,[A1[0],A1[1],A1[2]-.34],[A1[0],A1[1],A1[2]+.34],[B1[0],B1[1],B1[2]+.14],[B1[0],B1[1],B1[2]-.14],c,[-1,0,0]);}}}
  // a chateau's skyline on the club building (the Renaissance Ross Bridge hotel): round corner turrets with tall slate spires and steep
  // stone gables along the long walls, above the measured walls and roof
  if(F.chateau)for(const q of h.buildings||[])if(q.club&&q.rec){const LD=lidOf(q,h),p=bldSimplify(q.pts.slice(),2.5),n=p.length,gh=(q.gh||0)-.2,eave=LD?lidEave(h,LD):gh+Math.max(2.4,+q.rec[0]||0)+.2,stc=hexc('#e2d6b8'),sl=hexc('#3f4652');
    let ar=0;for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n];ar+=a[0]*b[1]-b[0]*a[1];}const cw=ar<0?1:-1;let tc=0;
    for(let i=0;i<n&&tc<9;i++){const a=p[(i+n-1)%n],b=p[i],c=p[(i+1)%n],d1=[b[0]-a[0],b[1]-a[1]],d2=[c[0]-b[0],c[1]-b[1]],l1=hyp(d1[0],d1[1]),l2=hyp(d2[0],d2[1]);if(l1<6||l2<6)continue;
      const crs=(d1[0]*d2[1]-d1[1]*d2[0])*cw;if(crs>0)continue;tc++;const r=2.4,top=LD?Math.max(eave+3.5,lidEave.top+1):eave+3.5;cyl(b[0],gh,b[1],r,top-gh,12,stc,false);for(let k=0;k<12;k++){const a1=k/12*TAU,a2=(k+1)/12*TAU,A1=[b[0]+Math.cos(a1)*(r+.3),top,b[1]+Math.sin(a1)*(r+.3)],A2=[b[0]+Math.cos(a2)*(r+.3),top,b[1]+Math.sin(a2)*(r+.3)],T=[b[0],top+8.5,b[1]];triO(out,A1,A2,T,sl,nrm([Math.cos((a1+a2)/2),.45,Math.sin((a1+a2)/2)]));}}
    // the stone wall gables: the lidar model already carries the measured cross gables, so only the hand-sized building gets them
    if(!LD)for(let i=0;i<n;i++){const a=p[i],b=p[(i+1)%n],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz);if(L<18)continue;const ux=dx/L,uz=dz/L,nx=-uz*cw*-1,nz=ux*cw*-1,m=Math.floor(L/15);
      for(let k=0;k<m;k++){const t=(k+.5)/m*L,cx=a[0]+ux*t+nx*.2,cz=a[1]+uz*t+nz*.2,hw=3.2,gt=6.8,B1=[cx-ux*hw,eave-.2,cz-uz*hw],B2=[cx+ux*hw,eave-.2,cz+uz*hw],T=[cx,eave+gt,cz];
        triO(out,B1,B2,T,stc,[nx,0,nz]);const bx=cx-nx*5,bz=cz-nz*5;for(const sg of[-1,1]){const E=[cx+ux*hw*sg,eave-.2,cz+uz*hw*sg];quadO(out,E,T,[T[0]-nx*5,T[1],T[2]-nz*5],[E[0]-nx*5,E[1],E[2]-nz*5],sl,nrm([ux*sg,.8,uz*sg]));}
        boxO(out,cx+nx*.05,eave+1.6,cz+nz*.05,.8,1.1,.06,Math.atan2(uz,ux),hexc('#2f3a44'));}}}
  // a hotel tower: a hotel-sized block rising out of the middle of the mapped building, which keeps its measured height (Mystic Lake;
  // raising the whole footprint made a 160 yd wall)
  if(F.twBlock)for(const q of h.buildings||[])if(q.lmTower){const ob=bldOBB(q.pts,null),cu=(ob.u0+ob.u1)/2,cv=(ob.v0+ob.v1)/2,cx=cu*ob.ux-cv*ob.uy,cz=cu*ob.uy+cv*ob.ux,g=hAtH(h,cx,cz);
    /* Mystic Lake's hotel from the photos: two long cream wings banded with teal ribbon windows, a taller cream centre core with a
       teal glass block near the top, and the red "Mystic Lake" script sign on a cream panel above the core */
    const B=(u,v,y0,y1,hu,hv,col)=>boxO(out,cx+u*ob.ux-v*ob.uy,g+(y0+y1)/2,cz+u*ob.uy+v*ob.ux,hu,(y1-y0)/2,hv,ob.t,col);
    const cream=hexc('#e4ddcf'),teal=hexc('#5b96a3'),glass=hexc('#4a8796'),cap=hexc('#cfc7b8');
    const Hw=Math.min(F.tw-10,33),Hc=F.tw+6,cH=10,cD=10,WL=Math.max(20,Math.min(58,(ob.u1-ob.u0)*.5-cH)),wD=Math.min(7.5,(ob.v1-ob.v0)*.3);
    for(const sg of[-1,1]){const wu=sg*(cH+WL/2-.5);B(wu,0,-.5,Hw,WL/2,wD,cream);for(let y=4;y<Hw-1.5;y+=3.4)B(wu,0,y,y+1.7,WL/2+.05,wD+.07,teal);B(wu,0,Hw,Hw+.7,WL/2+.2,wD+.2,cap);}
    B(0,0,-.5,Hc,cH,cD,cream);for(let y=4;y<Hc-17;y+=3.4)B(0,0,y,y+.5,cH+.05,cD+.05,mul(cream,.9));B(0,0,Hc-16,Hc-7,cH*.62,cD+.1,glass);B(0,0,Hc,Hc+.6,cH+.2,cD+.2,cap);
    const pw=cH*1.1,ph=7.5;B(0,0,Hc+.6,Hc+.6+ph,pw,1.6,hexc('#efe8da'));
    if(F.sign)for(const sg of[-1,1]){const nx=-ob.uy*sg,nz=ob.ux*sg;(h._signs||(h._signs=[])).push({x:cx+nx*1.68,z:cz+nz*1.68,y:g+Hc+.6+ph/2,nx,nz,w:pw*2-.6,hgt:ph-.6,text:F.sign,bg:'#efe8da',fg:'#b3212e',font:'italic 700 %px Georgia,"Times New Roman",serif'});}}
  // the engraved boulder at the clubhouse entrance
  if(F.stone)for(const q of h.buildings||[])if(q.club&&q.ent){const nx=q.ent[2],nz=q.ent[3],x=q.ent[0]+nx*13,z=q.ent[1]+nz*13,g=hAtH(h,x,z),ca=Math.cos(Math.atan2(nz,nx)),sa=Math.sin(Math.atan2(nz,nx));const tx=-nz,tz=nx;for(const[a2,b2,c2]of ICO1){const P=v=>{const k2=1+.12*Math.sin(v[0]*4.1+1.3)*Math.sin(v[2]*3.7);const lu=v[0]*1.6*k2,lv=v[2]*3.2*k2,ly=v[1]*1.25*k2;return[x+nx*lu+tx*lv,g+.9+ly,z+nz*lu+tz*lv];};if(a2[1]+b2[1]+c2[1]<-1.5)continue;pushTri(out,P(a2),P(b2),P(c2),[.56,.54,.5]);}
    const fx=x+nx*1.62,fz=z+nz*1.62;quadO(out,[fx-tx*1.7,g+.55,fz-tz*1.7],[fx+tx*1.7,g+.55,fz+tz*1.7],[fx+tx*1.7,g+1.55,fz+tz*1.7],[fx-tx*1.7,g+1.55,fz-tz*1.7],[.3,.29,.27],[nx,0,nz]);}
  // rock outcrops and ledges on the steep, wild ground (the Iron Range's granite)
  if(F.rock&&h.lg){const L=h.lg,col=F.rock==='granite'?[.6,.55,.53]:F.rock==='taconite'?[.44,.42,.41]:[.72,.66,.55],slab=F.rock==='taconite'?.75:.5;let n=0;
    for(let t=0;t<700&&n<38;t++){const x=b[0]+R()*(b[2]-b[0]),z=b[1]+R()*(b[3]-b[1]),i=Math.floor(x-L.x0+.5),j=Math.floor(z-L.y0+.5);if(i<1||j<1||i>=L.nx-1||j>=L.ny-1)continue;const k=j*L.nx+i;if(L.code[k]!==0||L.dmown[k]<9)continue;
      const sl=hyp(hAtH(h,x+1.5,z)-hAtH(h,x-1.5,z),hAtH(h,x,z+1.5)-hAtH(h,x,z-1.5))/3;if(sl<.22&&R()>.12)continue;n++;if(h._feel&&!h._feel.rpos)h._feel.rpos=[x,z];const m=3+Math.floor(R()*5);for(let q=0;q<m;q++){const px=x+(R()-.5)*5,pz=z+(R()-.5)*5;rock(px,hAtH(h,px,pz)-.3,pz,.9+R()*1.6,col,(sl>.3||F.rock==='taconite')&&R()<slab);}}}
  // the marble outcrop round a downhill par-3 tee (FarmLinks)
  if(F.marble&&G.hi===F.marble-1&&h.line){const a=h.line[0],c=h.line[1],dx=c[0]-a[0],dz=c[1]-a[1],l=hyp(dx,dz)||1,ux=dx/l,uz=dz/l;const T=(h.tees||[]).filter(P=>!P.syn).sort((p,q)=>hyp(p.x-a[0],p.y-a[1])-hyp(q.x-a[0],q.y-a[1]))[0];if(T){const r=Math.sqrt(T.area)*.5+4,cx=T.x+ux*r*.6-uz*r,cz=T.y+uz*r*.6+ux*r;for(let k=0;k<6;k++){const x=cx+(R()-.5)*5,z=cz+(R()-.5)*5;if(lieCodeAt(h,x,z)>1)continue;rock(x,hAtH(h,x,z)-.5,z,1.3+R()*1.2,[.74,.73,.7],R()<.35);}}}
  // round hay bales on the farm fields
  if(F.hay&&CUR.surr){for(const P0 of CUR.surr.polys.farm||[]){const P=mkPoly(P0.map(q=>[q[0]-T0[0],q[1]-T0[1]]),'farm');if(P.bb[2]<b[0]-200||P.bb[0]>b[2]+200||P.bb[3]<b[1]-200||P.bb[1]>b[3]+200)continue;let n=0;
    for(let t=0;t<200&&n<26;t++){const x=P.bb[0]+R()*(P.bb[2]-P.bb[0]),z=P.bb[1]+R()*(P.bb[3]-P.bb[1]);if(!inPoly(P,x,z))continue;n++;const g=hAtH(h,x,z),a=R()*TAU,ca=Math.cos(a),sa=Math.sin(a),r=.85,w=.75,c=hexc('#b89a5a');
      for(let k=0;k<10;k++){const a1=k/10*TAU,a2=(k+1)/10*TAU,Q=(ang,sd)=>[x+ca*sd*w-sa*Math.cos(ang)*r,g+r+Math.sin(ang)*r-.05,z+sa*sd*w+ca*Math.cos(ang)*r];const nn=[-sa*Math.cos((a1+a2)/2),Math.sin((a1+a2)/2),ca*Math.cos((a1+a2)/2)];quadO(out,Q(a1,-1),Q(a2,-1),Q(a2,1),Q(a1,1),mul(c,.85+.15*Math.max(0,nn[1])),nn);triO(out,[x+ca*w,g+r,z+sa*w],Q(a1,1),Q(a2,1),mul(c,1.1),[ca,0,sa]);triO(out,[x-ca*w,g+r,z-sa*w],Q(a1,-1),Q(a2,-1),mul(c,1.1),[-ca,0,-sa]);}}}}}
/* ---------- course landmarks (Oct 2026): pond fountains, stone or boulder pond edges, bridge styles, and the city skyline
   on the horizon where one is in view. CFEEL[courseId]: fo fountains (largest ponds first), pe pond edge 'boulder'|'wall'|'timber',
   br bridge style 'stone'|'white' (default timber), sky true for a city skyline on the horizon (off by default: from the ground
   the towers are only a few pixels at 15+ km and trees hide them). */
const CFEEL={"crls":{"pe":"timber"},"crsc":{"pe":"timber"},"dove":{"fo":2,"pe":"boulder"},"edinburgh":{"pe":"boulder"},"hazeltine":{"br":"stone"},"interlachen":{"fo":1},"judge":{"pe":"timber"},"legend":{"pe":"boulder"},"legends":{"fo":1,"pe":"wall"},"legislator":{"pe":"timber"},"lookout":{"pe":"wall"},"mystic":{"fo":3,"pe":"timber"},"orangeburg":{"fo":1,"pe":"wall"},"pawplant":{"fo":2,"pe":"timber"},"pines":{"fo":1,"pe":"boulder"},"preserve":{"fo":1},"prestwick":{"fo":1},"quarry":{"pe":"boulder"},"ridges":{"fo":1},"santee":{"br":"white"},"troy":{"fo":2},"valley":{"pe":"timber"},"wigwam":{"pe":"wall"},"wilderness":{"pe":"boulder"},"willingers":{"fo":1},"wyboo":{"pe":"timber"},"jacks":{"fo":0},"dacotah":{"fo":0,"pe":"boulder","br":"grey"},"kingsnorth":{"fo":0,"pe":"timber","br":"grey"},"sentryworld":{"fo":0},"rushcreek":{"fo":0,"br":"stone"}};
for(const k in CFEEL2)CFEEL[k]=Object.assign({},CFEEL2[k],CFEEL[k]||{},CFEEL2[k].pe?{pe:CFEEL2[k].pe}:{});
const SKYLINES=[{lat:44.9778,lon:-93.2650,n:26,hmax:241,spread:1400,seed:11},{lat:44.9490,lon:-93.0930,n:14,hmax:143,spread:900,seed:23},
  {lat:33.4484,lon:-112.0740,n:16,hmax:148,spread:1200,seed:37},{lat:33.5186,lon:-86.8104,n:12,hmax:139,spread:900,seed:41}];
function courseFeel(h,out){const DBG=h._feel={fo:0,pe:0,sky:0};const F=CFEEL[CUR.id]||{},b=h.bounds,L0=h.line||[[0,0]],R=rng(((h.T0[0]*3)|0)^((h.T0[1]*5)|0)^9091);
  const near=(x,y,d)=>{for(let i=0;i<L0.length-1;i++){const a=L0[i],c=L0[i+1],dx=c[0]-a[0],dy=c[1]-a[1],l2=dx*dx+dy*dy||1,t=clamp(((x-a[0])*dx+(y-a[1])*dy)/l2,0,1);if(hyp(a[0]+dx*t-x,a[1]+dy*t-y)<d)return true;}return false;};
  const W=(h.water||[]).filter(w=>w.bb[2]>b[0]&&w.bb[0]<b[2]&&w.bb[3]>b[1]&&w.bb[1]<b[3]);
  // aerating fountains in the biggest ponds
  if(F.fo){const big=W.filter(w=>w.area>900).sort((a,c)=>c.area-a.area).slice(0,F.fo);
    for(const w of big){let bx=null,bd=0;const bb=w.bb;for(let i=1;i<14;i++)for(let j=1;j<14;j++){const x=bb[0]+(bb[2]-bb[0])*i/14,y=bb[1]+(bb[3]-bb[1])*j/14;if(!inPoly(w,x,y))continue;const d=-polyDist(w,x,y,60);if(d>bd){bd=d;bx=[x,y];}}
      if(!bx||bd<5)continue;DBG.fo++;if(!DBG.fpos)DBG.fpos=[bx[0],bx[1]];const x=bx[0],z=bx[1],y0=hAtH(h,x,z)+.02,Hf=2.6+Math.min(2.4,Math.sqrt(w.area)/60),wc=[.93,.96,.97],fc=[.84,.9,.92];
      for(let k=0;k<3;k++){const a=k/3*Math.PI,ca=Math.cos(a),sa=Math.sin(a),nn=[-sa,0,ca];quadO(out,[x-ca*.12,y0,z-sa*.12],[x+ca*.12,y0,z+sa*.12],[x+ca*.5,y0+Hf,z+sa*.5],[x-ca*.5,y0+Hf,z-sa*.5],wc,nn);quadO(out,[x-ca*.12,y0,z-sa*.12],[x+ca*.12,y0,z+sa*.12],[x+ca*.5,y0+Hf,z+sa*.5],[x-ca*.5,y0+Hf,z-sa*.5],wc,mul(nn,-1));}
      const N=14,rr=1.9+Hf*.35;for(let k=0;k<N;k++){const a=k/N*TAU,ca=Math.cos(a),sa=Math.sin(a),T=[x+ca*.4,y0+Hf*.92,z+sa*.4],M=[x+ca*rr*.6,y0+Hf*.75,z+sa*rr*.6],B=[x+ca*rr,y0+.05,z+sa*rr],px=-sa*.16,pz=ca*.16,nn=nrm([ca,.6,sa]);
        quadO(out,[T[0]-px,T[1],T[2]-pz],[T[0]+px,T[1],T[2]+pz],[M[0]+px,M[1],M[2]+pz],[M[0]-px,M[1],M[2]-pz],wc,nn);quadO(out,[M[0]-px,M[1],M[2]-pz],[M[0]+px,M[1],M[2]+pz],[B[0]+px*1.6,B[1],B[2]+pz*1.6],[B[0]-px*1.6,B[1],B[2]-pz*1.6],wc,nn);}
      for(let k=0;k<16;k++){const a1=k/16*TAU,a2=(k+1)/16*TAU,r1=rr*.55,r2=rr*1.25;quadO(out,[x+Math.cos(a1)*r1,y0,z+Math.sin(a1)*r1],[x+Math.cos(a1)*r2,y0,z+Math.sin(a1)*r2],[x+Math.cos(a2)*r2,y0,z+Math.sin(a2)*r2],[x+Math.cos(a2)*r1,y0,z+Math.sin(a2)*r1],fc,[0,1,0]);}}}
  // pond edges: boulders, a dry-laid stone wall, or a timber bulkhead along the banks near play
  if(F.pe){let n=0;const stn=F.pe==='timber'?[.36,.27,.19]:F.pe==='wall'?[.62,.59,.53]:[.68,.65,.6];
    for(const w of W){const p=w.pts;for(let i=0;i<p.length&&n<2400;i++){const a=p[i],c=p[(i+1)%p.length],l=hyp(c[0]-a[0],c[1]-a[1]);if(l<.3)continue;const st=F.pe==='boulder'?1.4:2,m=Math.max(1,Math.round(l/st));
        for(let k=0;k<m;k++){const t=(k+.5)/m,x=a[0]+(c[0]-a[0])*t,z=a[1]+(c[1]-a[1])*t;if(x<b[0]||x>b[2]||z<b[1]||z>b[3]||!near(x,z,240))continue;if(F.pe!=='boulder'&&!(h.greens||[]).concat(h.tees||[]).some(P=>polyDist(P,x,z,30)<22))continue;const y=hAtH(h,x,z),ang=Math.atan2(c[1]-a[1],c[0]-a[0]);n++;if(!DBG.epos&&(h.greens||[]).some(P=>polyDist(P,x,z,30)<15))DBG.epos=[x,z];
          if(F.pe==='ledge'){/* stacked limestone ledges: two flattened, lumpy slabs (plain boxes read as cardboard) */const ra0=Math.atan2(c[1]-a[1],c[0]-a[0]);for(let q=0;q<2;q++){const s=(.75+R()*.55)*(1-q*.22),v=.8+R()*.28,col=mul([.66,.6,.5],v*(1-q*.05)),sx=s*1.25,sy=s*.28,sz=s*.7,ra=ra0+(R()-.5)*.35,ca=Math.cos(ra),sa=Math.sin(ra),sd=R()*100,ox=x+(R()-.5)*.4,oz=z+(R()-.5)*.4,oy=y-.12+q*.36;
            const P=q2=>{const k=1+.12*Math.sin(q2[0]*5.1+sd)*Math.sin(q2[2]*4.3+sd*.7),lx=q2[0]*sx*k,ly=q2[1]*sy,lz=q2[2]*sz*k;return[ox+lx*ca-lz*sa,oy+ly,oz+lx*sa+lz*ca];};for(const[a2,b2,c2]of ICO0)pushTri(out,P(a2),P(b2),P(c2),col);}}
          else if(F.pe==='boulder'){const s=.5+R()*.75,v=.82+R()*.3,col=mul(stn,v*(R()<.3?.85:1)),sx=s*(.9+R()*.5),sy=s*(.55+R()*.3),sz=s*(.8+R()*.4),ra=R()*TAU,ca=Math.cos(ra),sa=Math.sin(ra),sd=R()*100;
            const P=q=>{const k=1+.18*Math.sin(q[0]*5.1+sd)*Math.sin(q[2]*4.3+sd*.7)+.1*Math.sin(q[1]*6.7+sd*1.3),lx=q[0]*sx*k,ly=q[1]*sy*k,lz=q[2]*sz*k;return[x+lx*ca-lz*sa,y+ly+sy*.15,z+lx*sa+lz*ca];};
            for(const[a,b2,c2]of ICO0){if(a[1]+b2[1]+c2[1]<-1.2)continue;pushTri(out,P(a),P(b2),P(c2),col);}}
          else{const hw=l/m/2+.05,ht=F.pe==='timber'?.55:.75,v=F.pe==='timber'?.9+R()*.15:.85+R()*.25;boxO(out,x,y+ht/2-.2,z,hw,ht/2,F.pe==='timber'?.12:.3,ang,mul(stn,v));
            if(F.pe==='wall'&&k%2===0)boxO(out,x,y+ht-.12,z,hw*.9,.08,.36,ang,mul(stn,1.12));}}}}}
  // the city on the horizon
  if(F.sky===true&&COURSE&&COURSE.origin){const[la0,lo0]=COURSE.origin,K=Math.cos(la0*Math.PI/180)*111320*1.0936,Lq=110574*1.0936;
    for(const S of SKYLINES){let dx=(S.lon-lo0)*K-h.T0[0],dz=-(S.lat-la0)*Lq-h.T0[1];const D=hyp(dx,dz);if(D<4000||D>48000)continue;
      const Dc=Math.min(D,26000),f=Dc/D,ux=dx/D,uz=dz/D,px=-uz,pz=ux,cx=ux*Dc,cz=uz*Dc,base=hAtH(h,0,0)-30*f,Rs=rng(S.seed),cols=[[.55,.6,.66],[.45,.5,.56],[.66,.64,.6],[.5,.55,.58]];
      for(let k=0;k<S.n;k++){const o=(Rs()-.5)*S.spread*1.0936*f*(k<4?.5:1),dd=(Rs()-.5)*S.spread*.6*f,hgt=(k===0?S.hmax:S.hmax*(.25+Rs()*.6))*1.0936*f,wd=(22+Rs()*30)*1.0936*f;
        DBG.sky++;const x=cx+px*o+ux*dd,z=cz+pz*o+uz*dd;boxO(out,x,base+(hgt+30*f)/2,z,wd/2,(hgt+30*f)/2,wd/2*(.7+Rs()*.6),Math.atan2(uz,ux)+Rs()*.4,cols[k%4]);}}}}
function buildStructures(h,out){const ST=STYLE[CUR.scen]||STYLE.prairie,R=rng(4242);
  // buildings from their footprints; far from the hole's line they get the plain version (box walls + roof)
  const L0=h.line||[[0,0]],lodD=(typeof R3!=='undefined'&&(R3.q!=='high'||R3.perf>0))?200:350;
  const dLine=q=>{let m=hyp(q.x-L0[0][0],q.y-L0[0][1]);for(let i=0;i<L0.length-1;i++){const a=L0[i],c=L0[i+1],dx=c[0]-a[0],dy=c[1]-a[1],l2=dx*dx+dy*dy||1,t=clamp(((q.x-a[0])*dx+(q.y-a[1])*dy)/l2,0,1);m=Math.min(m,hyp(a[0]+dx*t-q.x,a[1]+dy*t-q.y));}
    return m-hyp(q.bb[2]-q.bb[0],q.bb[3]-q.bb[1])/2;};
  try{courseFeelPre(h);}catch(e){}
  for(const q of h.buildings||[])if(!q.lmHide){const D=b10On()?b10ClubFor(h,q):null;if(D)b10ClubPush(h,out,D);else bldDraw(h,q,out,ST,dLine(q)>lodD);}
  // cart-path bridges wherever a mapped path crosses water
  const wet=(x,y)=>h.water.some(w=>inPoly(w,x,y));
  for(const pl of h.paths||[]){const pts=[];for(let i=0;i<pl.length-1;i++){const a=pl[i],b=pl[i+1],L=hyp(b[0]-a[0],b[1]-a[1]),n=Math.max(1,Math.ceil(L));for(let k=0;k<n;k++)pts.push([a[0]+(b[0]-a[0])*k/n,a[1]+(b[1]-a[1])*k/n]);}
    if(pl.length)pts.push(pl[pl.length-1]);
    let run=null;const spans=[];for(let i=0;i<pts.length;i++){const w=wet(pts[i][0],pts[i][1]);if(w&&!run)run=[i,i];else if(w)run[1]=i;else if(run){spans.push(run);run=null;}}if(run)spans.push(run);
    for(const[i0,i1]of spans){const a=Math.max(0,i0-4),b=Math.min(pts.length-1,i1+4);if(b-a<3)continue;const FB=(CFEEL[CUR.id]||{}).br,BC=FB==='stone'?['#a8a294','#8c8679']:FB==='white'?['#8a7d6a','#f1efe8']:FB==='grey'?['#8e8a80','#77736b']:FB==='truss'?['#7a6a58','#6e4430']:['#7a5a3c','#5c4330'];const bp=pts.slice(a,b+1);deck(out,bp,2.7,hexc(BC[0]),hexc(BC[1]),false);(h._bridges||(h._bridges=[])).push(bp);}}
  try{courseFeel(h,out);}catch(e){}
  try{courseFeel2(h,out);}catch(e){console.warn('feel2',e);}
  try{const D=b10On()&&window.B10CLUBS&&B10CLUBS[CUR.id];if(D&&!D.none&&D.model)b10ClubPush(h,out,D);else clubModel(h,out);}catch(e){console.warn('clubModel',e);}   // (Blender clubhouse for a survey-built model such as Royal's)
  // road bridges from the map (overpasses)
  if(CUR.surr)for(const r of CUR.surr.bridges||[]){const pts=r.slice(2).map(q=>[q[0]-h.T0[0],q[1]-h.T0[1]]);const b=h.bounds;if(!pts.some(q=>q[0]>b[0]-900&&q[0]<b[2]+900&&q[1]>b[1]-900&&q[1]<b[3]+900))continue;
    const L=pts.length>1?hyp(pts[1][0]-pts[0][0],pts[1][1]-pts[0][1]):0;if(L<8)continue;const ext=[[pts[0][0]-(pts[1][0]-pts[0][0])/L*6,pts[0][1]-(pts[1][1]-pts[0][1])/L*6]];
    const q2=pts[pts.length-1],q1=pts[pts.length-2];ext.push(...pts,[q2[0]+(q2[0]-q1[0])/L*6,q2[1]+(q2[1]-q1[1])/L*6]);
    const dense=[];for(let i=0;i<ext.length-1;i++){const a=ext[i],c=ext[i+1],l=hyp(c[0]-a[0],c[1]-a[1]),n=Math.max(1,Math.ceil(l/2));for(let k=0;k<n;k++)dense.push([a[0]+(c[0]-a[0])*k/n,a[1]+(c[1]-a[1])*k/n]);}dense.push(ext[ext.length-1]);
    deck(out,dense,r[1]+1.5,hexc('#8f8d88'),hexc('#b9b6ae'),true);}
  // parked cars in the lots, nose-in across each row
  if(CUR.surr){bldxPark(CUR.surr);const CAR=['#e9e9e6','#1f2a36','#8a8f96','#6b1e22','#2f4f7a','#c8c1b0','#3b3b3b','#9aa8b3'];let cars=0;const b=h.bounds;
    for(const P0 of CUR.surr.polys.park||[]){const P=P0.map(q=>[q[0]-h.T0[0],q[1]-h.T0[1]]);const Q=mkPoly(P,'lot');if(Q.bb[2]<b[0]-500||Q.bb[0]>b[2]+500||Q.bb[3]<b[1]-500||Q.bb[1]>b[3]+500)continue;if(Q.area>40000)continue;
      lotStalls(P,(x,y,ang)=>{if(R()>.55||cars>220)return;const col=hexc(CAR[Math.floor(R()*CAR.length)]),gy=hAtH(h,x,y);cars++;
        boxO(out,x,gy+.55,y,.85,.4,2.2,ang,col);boxO(out,x,gy+1.12,y+0,.75,.3,1.15,ang,mul(col,.55));});}}
  // The Wigwam: the canvas tepee shade beside the 1st tee
  if(CUR.id==='wigwam'&&G.hi===0&&h.line&&h.line.length>1){const L1=h.line[1],d=hyp(L1[0],L1[1])||1,ux=L1[0]/d,uy=L1[1]/d,cx=-uy*22-ux*6,cy=ux*22-uy*6,g0=hAtH(h,cx,cy),r=3.6,ht=7.2,cv=hexc('#e8dcc2'),st=hexc('#a8452f'),N=14;
    for(let k=0;k<N;k++){const a1=k/N*TAU,a2=(k+1)/N*TAU;if(k===0)continue;const A=[cx+Math.cos(a1)*r,g0,cy+Math.sin(a1)*r],B=[cx+Math.cos(a2)*r,g0,cy+Math.sin(a2)*r],T=[cx,g0+ht,cy];let nn=nrm(cross(sub(B,A),sub(T,A)));if(nn[1]<0)nn=mul(nn,-1);
      const band=(f0,f1,col)=>{const p=(P,f)=>[P[0]+(T[0]-P[0])*f,P[1]+(T[1]-P[1])*f,P[2]+(T[2]-P[2])*f];quadO(out,p(A,f0),p(B,f0),p(B,f1),p(A,f1),col,nn);quadO(out,p(A,f0),p(B,f0),p(B,f1),p(A,f1),mul(col,.6),mul(nn,-1));};
      band(0,.12,cv);band(.12,.18,st);band(.18,.82,cv);}
    for(let k=0;k<6;k++){const a=k/6*TAU+.3,x=cx+Math.cos(a)*.5,z=cy+Math.sin(a)*.5;quadO(out,[x,g0+ht-.6,z],[x+.06,g0+ht-.6,z],[x+Math.cos(a)*1.2+.06,g0+ht+1.4,z+Math.sin(a)*1.2],[x+Math.cos(a)*1.2,g0+ht+1.4,z+Math.sin(a)*1.2],hexc('#6b4a33'),[Math.cos(a),0,Math.sin(a)]);}
    boxO(out,cx+Math.cos(.2)*(r+2.2),g0+.25,cy+Math.sin(.2)*(r+2.2),.7,.25,.7,0,hexc('#8a7d6c'));}
  // flags on the other greens, the range targets, and this hole's tee markers
  const flag=(x,y,col)=>{const g0=hAtH(h,x,y);boxO(out,x,g0+1.25,y,.04,1.25,.04,0,[.95,.95,.95]);pushTri(out,[x,g0+2.45,y],[x+.8,g0+2.2,y],[x,g0+1.95,y],col,[0,0,1],[0,0,1],[0,0,1]);pushTri(out,[x,g0+2.45,y],[x,g0+1.95,y],[x+.8,g0+2.2,y],mul(col,.8),[0,0,-1],[0,0,-1],[0,0,-1]);};
  COURSE.holes.forEach((H,k)=>{if(k===G.hi)return;const x=H.pin[0]-h.T0[0],y=H.pin[1]-h.T0[1],b=h.bounds;if(x<b[0]-800||x>b[2]+800||y<b[1]-800||y>b[3]+800)return;flag(x,y,hexc(typeof r3FlagStyle==='function'?r3FlagStyle(CUR.id).bg:'#ff6a48'));});
  for(const t of h.range?h.targets||[]:[])if(!t.pin)flag(t.x,t.y,hexc(t.col));
  for(const P0 of h.range?[]:COURSE.polys.range||[]){const P=P0.map(q=>[q[0]-h.T0[0],q[1]-h.T0[1]]),Q=mkPoly(P,'range');let L=0,a0=null,a1=null;
    for(let i=0;i<P.length;i++)for(let j=i+1;j<P.length;j++){const l=hyp(P[j][0]-P[i][0],P[j][1]-P[i][1]);if(l>L){L=l;a0=P[i];a1=P[j];}}
    const cols=['#ffd23c','#ff6a48','#4db6ff','#ffffff','#6fdc6f'];[.22,.38,.54,.7,.86].forEach((t,i)=>{const x=a0[0]+(a1[0]-a0[0])*t,y=a0[1]+(a1[1]-a0[1])*t;if(inPoly(Q,x,y))flag(x,y,hexc(cols[i]));});}
  // tee markers for every set (Oct 2026): a pair of painted balls on each set's tee, the course's own colour at the back, white, gold
  const ball=(x,y,z,r,col)=>{const N=10,M=5,P=(i,j)=>{const th=i/N*2*Math.PI,ph=-.35+j/M*(Math.PI/2+.35);return[Math.cos(ph)*Math.cos(th),Math.sin(ph),Math.cos(ph)*Math.sin(th)];},v=n=>[x+n[0]*r,y+n[1]*r,z+n[2]*r];
    for(let i=0;i<N;i++)for(let j=0;j<M;j++){const a=P(i,j),b=P(i+1,j),c=P(i+1,j+1),d=P(i,j+1);pushTri(out,v(a),v(c),v(b),col,a,c,b);pushTri(out,v(a),v(d),v(c),col,a,d,c);pushTri(out,v(a),v(b),v(c),col,a,b,c);pushTri(out,v(a),v(c),v(d),col,a,c,d);}};
  for(const S of h.teeSets||[]){const ux=Math.sin(S.a),uy=-Math.cos(S.a),px=Math.cos(S.a),py=Math.sin(S.a),tc=hexc(TEE_MK(S.t)),fx=S.x+ux*1.4,fy=S.y+uy*1.4;
    // markers 3.6 yd either side, brought in (both alike) if one would sit off the levelled tee, e.g. down a pond bank (v84)
    let mo=3.6;const lv=hAtH(h,fx,fy);while(mo>1.8&&[-1,1].some(sg=>Math.abs(hAtH(h,fx+px*mo*sg,fy+py*mo*sg)-lv)>.12))mo-=.3;
    for(const sgn of[-1,1]){const x=fx+px*mo*sgn,y=fy+py*mo*sgn,g0=hAtH(h,x,y);ball(x,g0+.1,y,.17,tc);}}}   // about a foot across: oversized so they read from the tee camera
// a deck along a path: planks or a concrete slab, rails, and posts down to the ground
function deck(out,pts,wid,col,railCol,concrete){const n=pts.length;if(n<2)return;const h=G.hole;
  const e0=hAtH(h,pts[0][0],pts[0][1]),e1=hAtH(h,pts[n-1][0],pts[n-1][1]);
  // never below the water it crosses (long boardwalks between low banks sank under the lake)
  let wl=-1e9;if(!concrete)for(let i=0;i<n;i+=3)for(const w of h.water||[])if(w.lvl!=null&&inPoly(w,pts[i][0],pts[i][1]))wl=Math.max(wl,wLvl(w,pts[i][0],pts[i][1]));
  const Y=i=>{const t=i/(n-1);return Math.max((e0*(1-t)+e1*t)+.35+(concrete?.4:.6)*Math.sin(Math.PI*t),wl+.5);};
  for(let i=0;i<n-1;i++){const a=pts[i],b=pts[i+1],dx=b[0]-a[0],dz=b[1]-a[1],L=hyp(dx,dz)||1,px=-dz/L*wid/2,pz=dx/L*wid/2,ya=Y(i),yb=Y(i+1);
    const k=concrete?1:(i%2?1:.88);
    triO(out,[a[0]-px,ya,a[1]-pz],[b[0]-px,yb,b[1]-pz],[b[0]+px,yb,b[1]+pz],mul(col,k),[0,1,0]);triO(out,[a[0]-px,ya,a[1]-pz],[b[0]+px,yb,b[1]+pz],[a[0]+px,ya,a[1]+pz],mul(col,k),[0,1,0]);
    // fascia and rails on both sides
    for(const sg of[-1,1]){const ax=a[0]+px*sg,az=a[1]+pz*sg,bx=b[0]+px*sg,bz=b[1]+pz*sg,nn=nrm([px*sg,0,pz*sg]);
      triO(out,[ax,ya-(concrete?1.2:.35),az],[bx,yb-(concrete?1.2:.35),bz],[bx,yb,bz],mul(railCol,.8),nn);triO(out,[ax,ya-(concrete?1.2:.35),az],[bx,yb,bz],[ax,ya,az],mul(railCol,.8),nn);
      const rh=concrete?.9:1.05;triO(out,[ax,ya+rh-.12,az],[bx,yb+rh-.12,bz],[bx,yb+rh,bz],railCol,[0,1,0]);triO(out,[ax,ya+rh-.12,az],[bx,yb+rh,bz],[ax,ya+rh,az],railCol,[0,1,0]);
      if(concrete){triO(out,[ax,ya,az],[bx,yb,bz],[bx,yb+rh,bz],mul(railCol,.9),nn);triO(out,[ax,ya,az],[bx,yb+rh,bz],[ax,ya+rh,az],mul(railCol,.9),nn);}
      else if(i%2===0)boxO(out,ax,ya+rh/2,az,.08,rh/2,.08,0,railCol);}
    if(concrete&&i%9===4){const g=hAtH(h,a[0],a[1]),top=ya-1.2;if(top-g>1)boxO(out,a[0],(top+g)/2,a[1],.7,(top-g)/2,wid*.35,Math.atan2(dz,dx),hexc('#a5a29b'));}
    else if(!concrete&&i%3===1){for(const sg of[-1,1]){const x=a[0]+px*sg*.8,z=a[1]+pz*sg*.8,g=hAtH(h,x,z)-1;if(ya-g>.3)boxO(out,x,(ya+g)/2,z,.12,(ya-g)/2,.12,0,mul(railCol,.7));}}}}
