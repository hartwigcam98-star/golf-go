/* ---- the rival's shot: plan club, target, power and timing, then "press" the meter like a player ---- */
function simRoll(x,y,a,D){const p=G.hole.pin,mu0=MU[lieAt(x,y)]||MU.fairway,v=Math.sqrt(2*mu0*D),dd=dirOf(a);let vx=dd[0]*v,vy=dd[1]*v;const h=1/120;
  for(let t=0;t<18;t+=h){const L=lieAt(x,y);if(L==='water'||L==='ob')return{d:99};
    const sp=hyp(vx,vy),d=hyp(x-p[0],y-p[1]);if(d<CUP){const cb=sp>1e-6?Math.abs(vx*(p[1]-y)-vy*(p[0]-x))/sp:0;if(sp<capV(cb))return{d:0,holed:true};}
    const mu=muRoll(L,sp),[gx,gy]=gradAt(x,y),sx=-GACC*gx,sy=-GACC*gy,smag=hyp(sx,sy);let ax=sx,ay=sy;if(sp>1e-6){ax-=mu*vx/sp;ay-=mu*vy/sp;}
    vx+=ax*h;vy+=ay*h;if(hyp(vx,vy)<Math.max(.1,mu*h*1.5)&&smag<muStill(L)*.95)break;x+=vx*h;y+=vy*h;}
  return{d:hyp(x-p[0],y-p[1])};}
function aiPuttPlan(sk){const b=G.ball,p=G.hole.pin,base=angTo(b.x,b.y,p[0],p[1]),tp=puttTargetPower();const D0=Math.max(.3,(tp===null?.1:tp)*G.puttMax);
  let best={s:1e9,a:base,D:D0};const tryA=(a,D)=>{const r=simRoll(b.x,b.y,a,D);const s=r.holed?-1+Math.abs(D/D0-1.08)*.2:r.d;if(s<best.s)best={s,a,D};};
  const Ds=[.96,1.04,1.12,1.25].map(k=>D0*k);
  for(let k=-14;k<=14;k++)for(const D of Ds)tryA(base+k*.022,D);
  const a0=best.a;for(let k=-4;k<=4;k++)for(const D of Ds)tryA(a0+k*.0055,D);
  const skill=sk.putt,d=hyp(p[0]-b.x,p[1]-b.y);
  const aim=best.a+gauss()*(.075-.06*skill)*(d<2?.5:1),D=best.D*(1+gauss()*(.17-.12*skill));
  return{aim,power:clamp(D/G.puttMax,.02,1),e:perfectWin()*.7*(Math.random()<.5?-1:1)};}
function aiPlan(){const r=MATCH.r,sk=r.sk,b=G.ball;
  let plan;
  if(curClub().putter)plan=aiPuttPlan(sk);
  else{const t=aimTarget(),toPin=t===G.hole.pin,w=dirOf(G.wind.a);
    const est=()=>{const c=curClub(),ST=SHOTS[G.stype],M=shotMods(),landL=lieAt(t[0],t[1]);
      const rf=SHORT_T[G.stype]?shortRoll(c,G.stype,landL):(c.loft>=1.15&&G.stype==='full'&&landL==='green')?.02:c.roll*ST.r*(landL==='green'?(GREEN_HOLD[tidOf(c)]??.5):(SURF[landL]||1));
      return{c,ST,M,rf,max:clubCarry(c)*lieMul(c,G.lie)*ST.c*M.carry};};
    let tx=t[0],ty=t[1],E=est();
    const want=()=>{const d=hyp(tx-b.x,ty-b.y)+clamp(hAt(t[0],t[1])-hAt(b.x,b.y),-25,25)*.9;return toPin?d/(1+E.rf):Math.min(E.max,d/(1+E.rf));};
    for(let it=0;it<3;it++){const wk=G.wind.mph*.85*(want()/200)*E.c.loft*E.ST.w*E.M.wind;tx=t[0]-w[0]*wk*sk.wind;ty=t[1]-w[1]*wk*sk.wind;
      // not enough club: step up to the first one that reaches (never a wood from sand)
      if(want()>E.max*1.01){for(let i=G.clubIdx-1;i>=(driverOK()?0:1);i--){const c=CLUBS[i];if(G.lie==='sand'&&i<CI('5I'))break;if(lieErr(c,G.lie)>=2.4)break;G.clubIdx=i;G.stype='full';E=est();if(E.max>=want())break;}}
      E=est();}
    let power=clamp(want()/E.max,.12,1);if(isShort()){const P=shortPlan();tx=t[0];ty=t[1];power=clamp(P.carry/((G.swMax||natMax())*shotMods().carry),.05,1);}power=clamp(power*(1+gauss()*sk.perr),.03,1);
    let e=clamp(gauss()*sk.acc,-.12,.4);if(Math.random()<sk.miss)e=null;
    plan={aim:angTo(b.x,b.y,tx,ty),power,e};}
  G.pshot=false;G.imp={x:0,y:0};G.traj=0;
  G.ai={...plan,t:0,think:G.lie==='green'?1.1:1.3+Math.random()*.5};}
function aiStep(dt){const A=G.ai;if(!G.aiTurn||!A)return;const m=G.meter,fast=G.aiSkip;
  if(G.state==='aim'){if(R3.on&&r3RoutineBusy())return;A.t+=dt;G.aim+=(A.aim-G.aim)*Math.min(1,dt*4);
    if(A.t>(fast?0:A.think)){G.aim=A.aim;G.state='power';m.pos=IMPACT;m.power=0;m.dir=1;G.tapMark=null;sfx.tick();}}
  else if(G.state==='power'){const tgt=IMPACT+p2m(A.power)*(1-IMPACT);if(fast||m.pos>=tgt){m.pos=tgt;m.power=A.power;G.state='acc';sfx.tick();}}
  else if(G.state==='acc'){const tgt=IMPACT+(A.e===null?-1:A.e);if(fast||m.pos<=tgt){G.tapMark=clamp(IMPACT+(A.e||0),0,1);G.ai=null;executeShot(m.power,A.e,A.sd);}}}
function skipAI(){if(!G.aiTurn)return;G.aiSkip=true;if(ffActive())G.ff=8;}

