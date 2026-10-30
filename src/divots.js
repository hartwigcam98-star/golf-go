/* ---------- divots: irons, pitches and flops from turf take a slab of grass that flies (higher the harder the swing) and leave a scar ---------- */
const DIV_COL={fairway:hexc('#4f8f3a'),cut:hexc('#4a8a36'),rough:hexc('#3f7a2c'),fescue:hexc('#9c8a4c'),tee:hexc('#5a9a40')},DIV_SOIL=hexc('#5b4129'),DIV_SCAR=hexc('#3e2c1c');
function queueDivot(club,lie,swing,fat,thin){
  if(club.putter||!(club.kind==='iron'||club.kind==='wedge')||G.stype==='chip'||!DIV_COL[lie]||thin)return;
  const a=G.aim,[dx,dy]=dirOf(a),b=G.golferAt||G.ball,sw=clamp(swing,.08,1),k=G.stype==='flop'?1.25:G.stype==='punch'?.55:1,big=fat?1.5:1;
  G.divotQ={x:b.x+dx*.12,y:b.y+dy*.12,dx,dy,sw,k,big,lie};}
function spawnDivot(q){const h=G.hole;if(!h)return;h.divots=h.divots||[];h.scars=h.scars||[];h.crumbs=[];
  const vis=1.45,L=.17*vis*q.big*(.75+.35*q.sw),W=.085*vis*q.big,Th=.03*vis;
  const vy=(1.1+6.6*q.sw)*q.k*(q.big>1?1.25:1),vf=(1.2+4.8*q.sw)*(q.k>1?.65:q.k<1?1.2:1),side=(Math.random()-.5)*1.2;
  const g0=hAt(q.x,q.y);
  h.divots.push({x:q.x,y:q.y,Y:g0+.03,vx:q.dx*vf-q.dy*side,vz:q.dy*vf+q.dx*side,vy,th:0,om:(6+10*q.sw)*(Math.random()<.5?-1:1),yaw:Math.atan2(q.dy,q.dx)+(Math.random()-.5)*.4,L,W,Th,col:DIV_COL[q.lie],rest:false,bounce:0});
  if(h.divots.length>24)h.divots.shift();
  h.scars.push({x:q.x+q.dx*L*.4,y:q.y+q.dy*L*.4,dx:q.dx,dy:q.dy,L:L*1.15,W:W*1.05});if(h.scars.length>40)h.scars.shift();
  for(let i=0;i<14;i++){const a=Math.random()*TAU,r=Math.random();h.crumbs.push({x:q.x,y:q.y,Y:g0+.03,vx:q.dx*vf*(.5+r*.7)+Math.cos(a)*1.4*q.sw,vz:q.dy*vf*(.5+r*.7)+Math.sin(a)*1.4*q.sw,vy:vy*(.35+Math.random()*.75),s:.012+Math.random()*.018,col:Math.random()<.55?DIV_SOIL:DIV_COL[q.lie]});}}
function stepDivots(dt){const h=G.hole;if(!h||!h.divots)return;const GR=11;
  for(const d of h.divots){if(d.rest)continue;d.vy-=GR*dt;d.x+=d.vx*dt;d.y+=d.vz*dt;d.Y+=d.vy*dt;d.th+=d.om*dt;const gnd=hAt(d.x,d.y)+d.Th*.5;
    if(d.Y<=gnd&&d.vy<0){d.Y=gnd;d.bounce++;if(d.bounce>2||Math.abs(d.vy)<1.2){d.rest=true;d.th=Math.round(d.th/Math.PI)*Math.PI;}else{d.vy*=-.22;d.vx*=.45;d.vz*=.45;d.om*=.4;}}}
  if(h.crumbs){for(const c of h.crumbs){c.vy-=GR*dt;c.x+=c.vx*dt;c.y+=c.vz*dt;c.Y+=c.vy*dt;}h.crumbs=h.crumbs.filter(c=>c.Y>hAt(c.x,c.y)-.02);}}
function drawDivots(){const h=G.hole;if(!h||G.overview)return;
  for(const s of h.scars||[]){const h1=hAt(s.x-s.dx*s.L*.5,s.y-s.dy*s.L*.5),h2=hAt(s.x+s.dx*s.L*.5,s.y+s.dy*s.L*.5),hc=hAt(s.x,s.y);
    boxAt([s.x,hc+.012,s.y],[s.dx*s.L*.5,(h2-h1)*.5,s.dy*s.L*.5],[0,.008,0],[-s.dy*s.W*.5,0,s.dx*s.W*.5],DIV_SCAR);}
  for(const d of h.divots||[]){const f=[Math.cos(d.yaw),0,Math.sin(d.yaw)],sd=[-f[2],0,f[0]],c=Math.cos(d.th),sn=Math.sin(d.th);
    const u=[f[0]*c,sn,f[2]*c],v=[-f[0]*sn,c,-f[2]*sn];
    boxAt(add([d.x,d.Y,d.y],mul(v,d.Th*.28)),mul(u,d.L*.5),mul(v,d.Th*.22),mul(sd,d.W*.5),d.col);
    boxAt(add([d.x,d.Y,d.y],mul(v,-d.Th*.22)),mul(u,d.L*.47),mul(v,d.Th*.28),mul(sd,d.W*.47),DIV_SOIL);}
  for(const c of h.crumbs||[])sphAt([c.x,c.Y,c.y],c.s,c.s,c.s,c.col);}

