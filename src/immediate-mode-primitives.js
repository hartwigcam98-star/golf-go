/* ---- immediate-mode primitives (golfer, flag, ball) collected into instanced meshes each frame ---- */
function r3Pool(kind,variant){const key=kind+variant;let p=R3.pools[key];if(p)return p;
  if(variant==='water'&&!R3.mat.spray)R3.mat.spray=new THREE.MeshBasicMaterial({color:0xffffff,transparent:true,opacity:.42,depthWrite:false});
  const mat=variant==='water'?R3.mat.spray:variant==='blob'?R3.mat.blob:variant==='gloss'?R3.mat.gloss:variant==='satin'?R3.mat.satin:R3.mat.matte;
  const m=new THREE.InstancedMesh(R3.geo[kind],mat,variant==='blob'?16:variant==='water'?1600:600);m.instanceMatrix.setUsage(THREE.DynamicDrawUsage);m.count=0;m.frustumCulled=false;
  m.castShadow=variant!=='blob'&&variant!=='water';m.receiveShadow=variant!=='blob'&&variant!=='water';if(variant==='water')m.renderOrder=6;if(variant==='blob')m.renderOrder=4;
  m.setColorAt(0,new THREE.Color(1,1,1));R3.scene.add(m);p=R3.pools[key]={m,n:0};return p;}
const R3_M4=[];let R3_COL=null;
function r3Push(kind,Mx,tint,alpha){if(!R3.on)return;const variant=M3.water?'water':alpha<1?'blob':(M3.spec||0)>=.5?'gloss':(M3.spec||0)>0?'satin':'matte';
  const p=r3Pool(kind,variant);if(p.n>=p.m.instanceMatrix.count)return;
  const m4=R3_M4[0]||(R3_M4[0]=new THREE.Matrix4());m4.fromArray(Mx);p.m.setMatrixAt(p.n,m4);
  if(variant!=='blob'){R3_COL=R3_COL||new THREE.Color();R3_COL.setRGB(r3sq(tint[0]),r3sq(tint[1]),r3sq(tint[2]));p.m.setColorAt(p.n,R3_COL);}p.n++;}
function r3PoolsBegin(){for(const k in R3.pools)R3.pools[k].n=0;}
function r3PoolsEnd(){for(const k in R3.pools){const p=R3.pools[k];p.m.count=p.n;p.m.instanceMatrix.needsUpdate=true;if(p.m.instanceColor)p.m.instanceColor.needsUpdate=true;}}
/* ---- Pawleys Plantation 13: the sprinklers come on while you play your second shot ----
   Impact-style heads round the green and two just ahead of the ball; each sweeps its arc and throws droplets on ballistic paths
   (drawn as small stretched spheres from the instanced pool), with the tick-tick-tick of the arm. Purely cosmetic. */
const R3SPK={on:false,t0:0,heads:null,key:null,tick:0,done:false,shot:false};
// the shot after the tee shot (also when a tee ball in the marsh means re-hitting): on while he lines it up, through its flight,
// off once that ball stops
function r3SprinkWanted(){if(!(CUR&&CUR.id==='pawplant'&&G.hi===12&&G.hole))return false;
  if(G.strokes===0){R3SPK.done=false;R3SPK.shot=false;return false;}if(R3SPK.done||G.replay||G.overview||G.aiTurn)return false;
  const aim=G.state==='aim'||G.state==='power'||G.state==='acc',mov=G.state==='flight'||G.state==='bounce'||G.state==='roll';
  if(aim)return true;if(mov&&R3SPK.on){R3SPK.shot=true;return true;}if(R3SPK.shot&&!mov){R3SPK.done=true;R3SPK.shot=false;}return false;}
function r3SprinkHeads(h){const p=h.pin,P=h.green,out=[];
  for(let k=0;k<4;k++){const a=k/4*TAU+.4;let r=2;while(r<40&&P&&inPoly(P,p[0]+Math.cos(a)*r,p[1]+Math.sin(a)*r))r+=.5;r+=3.5;out.push({x:p[0]+Math.cos(a)*r,y:p[1]+Math.sin(a)*r,face:a,arc:Math.PI*.9});}
  const[dx,dy]=dirOf(angTo(G.ball.x,G.ball.y,p[0],p[1])),px=-dy,py=dx;
  const ga=G.lie==='green'?3:6,gl=G.lie==='green'?5:7;for(const sd of[-1,1]){const x=G.ball.x+dx*ga+px*sd*gl,y=G.ball.y+dy*ga+py*sd*gl;out.push({x,y,face:Math.atan2(-py*sd,-px*sd),arc:Math.PI*1.1});}   // sweeping in toward the line of play
  out.forEach((q,i)=>{q.gh=hAt(q.x,q.y);q.ph=i*1.7;});return out;}
function r3Sprinklers(){const want=r3SprinkWanted();
  if(!want){R3SPK.on=false;return;}
  else if(!R3SPK.on){R3SPK.on=true;R3SPK.t0=T;R3SPK.heads=r3SprinkHeads(G.hole);setTimeout(()=>{try{if(R3SPK.on)toast('SPRINKLERS!','Somebody forgot the timer','#9fd8ff');}catch(e){}},1600);}
  const t=T-R3SPK.t0,ramp=Math.min(1,t/1.2),V0=12,EL=.6,Gy=10.7,LIFE=1.55,RATE=85,ce=Math.cos(EL),se=Math.sin(EL),col=[.9,.95,1];
  for(const q of R3SPK.heads){M3.spec=0;M3.water=0;sphAt([q.x,q.gh+.05,q.y],.05,.05,.05,[.15,.17,.16]);M3.water=1;   // the head
    const n=Math.floor(LIFE*RATE);for(let i=0;i<n;i++){const ts=Math.floor(t*RATE)/RATE-i/RATE,age=t-ts;if(ts<0||age>LIFE)continue;
      const k2=Math.floor(ts*RATE),h1=((Math.sin(k2*12.9898+q.ph*78.233)*43758.55)%1+1)%1,h2=((Math.sin(k2*39.346+q.ph*11.135)*24634.63)%1+1)%1,jit=h1-.5,sw=q.face+Math.sin((ts*.9+q.ph))*q.arc*.5+(h2-.5)*.22,v=V0*(.72+.4*h1)*ramp,vx=Math.cos(sw)*v*ce,vz=Math.sin(sw)*v*ce,vy=v*se*(1+.35*(h2-.5));
      const y=q.gh+.15+vy*age-.5*Gy*age*age;if(y<hAt(q.x+vx*age,q.y+vz*age))continue;const x=q.x+vx*age,z=q.y+vz*age,vyy=vy-Gy*age,sp=Math.hypot(vx,vyy,vz)||1;
      const d=[vx/sp,vyy/sp,vz/sp],side=nrm(cross(d,[0,1,0])),up=nrm(cross(side,d));const sz=(.05+.09*Math.min(1,age))*(.75+.5*h2);sphAt([x,y,z],sz,sz,sz*2.4,col,side,up,d);/* the jet breaks up into a widening mist */}}
  M3.spec=0;M3.water=0;
  if(want&&T-R3SPK.tick>.13){R3SPK.tick=T;try{if(!G.muted)noise(.05,.06,'highpass',2800);}catch(e){}}}
function r3Dynamic(){const h=G.hole;if(h&&(R3.wfFor!==h||R3.wfN!==((h._wfs||[]).length+100*((h._signs||[]).length)))){R3.wfFor=h;try{r3Waterfalls(h);}catch(e){console.warn('wf',e);}}if(R3.wfMat)R3.wfMat.uniforms.t.value=performance.now()/1000%600;if(R3.boss){R3.boss.mesh.visible=false;R3.boss.ballAt=null;}const bx=G.ball.x,bz=G.ball.y,gB=hAt(bx,bz);
  const camToBall=hyp(bx-V.E[0],gB-V.E[1],bz-V.E[2]);R3.U.r3fade.value=G.overview||G.state==='intro'||G.state==='card'?0:Math.min(60,camToBall-2);
  if(R3.grass)R3.grass.visible=!G.overview&&G.state!=='intro'&&G.state!=='card';
  // cup, flagstick and flag (scaled up with distance so the pin is always readable)
  M3.spec=0;const px=h.pin[0],pz=h.pin[1],gp=hAt(px,pz);const pc=proj(px,gp,pz),ps=pc?Math.max(1,30/(2.6*pc[3])):1;
  sphAt([px,gp+.005,pz],CUP_R+.004,.012,CUP_R+.004,[.03,.06,.04]);
  if(!flagPulled()){cylAB([px,gp,pz],[px,gp+2.5*ps,pz],.028*ps,[.96,.96,.96]);r3FlagPose(px,gp+2.48*ps,pz,ps);}
  else if(R3.flag)R3.flag.visible=false;
  if(h.range&&G.rangeBalls)for(const q of G.rangeBalls){const g=hAt(q.x,q.y),d=hyp(q.x-V.E[0],g-V.E[1],q.y-V.E[2]),rb=Math.max(.0233,d*.0018);sphAt([q.x,g+rb*.8,q.y],rb,rb,rb,[.95,.95,.93]);}   // range balls collected on the target greens
  if(typeof drawDivots==='function')drawDivots();drawParts();
  const aiming=aimingState()&&!G.overview;const ga=aiming?{x:bx,y:bz,aim:G.aim}:(G.followT>0&&G.golferAt&&(G.followT<4||(typeof R3R!=='undefined'&&R3R.post.on&&(G.state==='wait'||G.state==='holed')))?G.golferAt:null);
  M3.spec=.06;if(ga&&G.state!=='intro'&&G.state!=='card')drawGolfer3D(ga);M3.spec=0;
  if(R3.boss&&R3.boss.acc){const v=!!(R3.boss.mesh&&R3.boss.mesh.visible);for(const a of R3.boss.acc)a.visible=v;}   // a legend's hat follows the body
  r3Sprinklers();
  if(!G.inCup&&R3.boss&&R3.boss.ballAt){const p2=R3.boss.ballAt;M3.spec=.7;sphAt(p2,.03,.03,.03,[1,1,1]);M3.spec=0;}
  else if(!G.inCup){const pre=G.followT>0&&G.followT<(G.launchAt||0),air=(G.state==='flight'||G.state==='bounce')&&!pre;const Y=air?G.bY:gB;const bc=proj(bx,Y,bz);const r=bc?Math.max(.024,2.6/bc[3]):.05;
    // teed up: the first shot from the tee box sits on a peg (driver high, irons low) until the club gets there
    const pk=G.lie==='tee'&&!G.overview&&((G.strokes===0&&(aimingState()||G.state==='intro'))||(pre&&G.strokes===1&&G.fromLie==='tee'))?pegFor(curClub()):0;
    let ox=0,oz=0;if(G.settle&&!air){const t=G.settle.t,o=r*.32*Math.sin(t*24)*Math.exp(-t*6.5);ox=G.settle.dx*o;oz=G.settle.dy*o;}
    if(pk){const pr=r*.16,ph=pk*r;cylAB([bx,gB-.01,bz],[bx,gB+ph,bz],pr,TEE_COL);cylAB([bx,gB+ph-pr*.9,bz],[bx,gB+ph,bz],pr*2.6,TEE_MK);}
    M3.spec=.7;drawBallGear([bx+ox,Y+r+pk*r,bz+oz],r,!G.aiTurn);M3.spec=0;}
  if(MATCH.on&&MATCH.P&&G.state!=='intro'&&G.state!=='card'){const o=MATCH.P[1-MATCH.turn];if(o&&!o.done&&o.strokes>0){const ox=o.ball.x,oz=o.ball.y,og=hAt(ox,oz),oc=proj(ox,og,oz),orr=oc?Math.max(.03,2.6/oc[3]):.05;M3.spec=.7;drawBallGear([ox,og+orr,oz],orr,MATCH.turn===1);M3.spec=0;}}}

