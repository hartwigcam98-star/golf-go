/* ---------- feel (Oct 2026): small 3D bits - water drops, leaves knocked out of a tree, birds, the tee peg; pitch marks on the green ---------- */
const LEAF_COL=[hexc('#4f7a2e'),hexc('#6a8f34'),hexc('#3d6427'),hexc('#86963a')],TEE_COL=hexc('#f4f1e8');
function pegFor(c){return c.putter?0:(c.id==='1W'||c.id==='MD')?1.5:c.kind==='wood'||c.kind==='hybrid'?.65:.35;}   // tee height in ball radii
function partAdd(p){(G.parts=G.parts||[]).push(p);if(G.parts.length>180)G.parts.shift();}
function splashDrops(x,y,soft){const g=hAt(x,y),n=soft?6:24;for(let i=0;i<n;i++){const a=Math.random()*TAU,r=Math.random();
  partAdd({k:'drop',x,y,Y:g+.05,vx:Math.cos(a)*(.5+r*1.7),vz:Math.sin(a)*(.5+r*1.7),vy:(soft?1.1:2.8)+Math.random()*(soft?1:4.8),s:.025+Math.random()*.035,life:2.5});}}
function leafBurst(x,y,Y,tx,ty,n){for(let i=0;i<n;i++){const a=Math.random()*TAU;
  partAdd({k:'leaf',x:x+(Math.random()-.5)*.8,y:y+(Math.random()-.5)*.8,Y:Y+(Math.random()-.5)*.6,vx:tx*1.6+Math.cos(a)*1.3,vz:ty*1.6+Math.sin(a)*1.3,vy:.4+Math.random()*1.3,ph:Math.random()*TAU,sp:2+Math.random()*3,s:.055+Math.random()*.03,col:LEAF_COL[i%4],life:9+Math.random()*3});}}
function birdsFrom(t,ax,ay,n,dl){if(t.cactus)return;const top=(t.gh||hAt(t.x,t.y))+2+1.35*t.r;for(let i=0;i<n;i++){const a=Math.atan2(t.y-ay,t.x-ax)+(Math.random()-.5)*1.8,v=6+Math.random()*4;
    partAdd({k:'bird',x:t.x+(Math.random()-.5)*t.r,y:t.y+(Math.random()-.5)*t.r,Y:top-.8-Math.random()*1.8,vx:Math.cos(a)*v,vz:Math.sin(a)*v,vy:2.2+Math.random()*2,ph:Math.random()*TAU,fl:15+Math.random()*7,life:8,delay:dl+Math.random()*.35});}
  const c=proj(t.x,top,t.y),k=c?clamp(c[3]/12,.25,1):.3;setTimeout(()=>sfx.flutter(k),dl*1000);}
// a big drive: now and then a few birds lift out of a tree near where it comes down
function birdsNear(p,T){const h=G.hole;if(!h||!h.trees)return;const C=h.trees.filter(t=>!t.cactus&&t.r>1.5&&hyp(t.x-p[0],t.y-p[1])>12&&hyp(t.x-p[0],t.y-p[1])<60);if(!C.length)return;
  const t=C[(Math.random()*C.length)|0];birdsFrom(t,p[0],p[1],3+((Math.random()*4)|0),T*.75);}
function spawnTee(q){const[dx,dy]=dirOf(q.a),sd=(Math.random()-.5)*.8,v=(q.drv?2.5:1.5)+q.p*(q.drv?3.5:2),g=hAt(q.x,q.y),L=.028+q.k*.012;
  partAdd({k:'tee',x:q.x,y:q.y,Y:g+L*.5,vx:dx*v-dy*sd*v,vz:dy*v+dx*sd*v,vy:(q.drv?2.2:1.2)+q.p*2,th:0,om:(12+Math.random()*10)*(Math.random()<.5?-1:1),dx,dy,L,r:.0035,life:40});}
function stepParts(dt){const P=G.parts;if(!P||!P.length)return;
  const w=G.wind?dirOf(G.wind.a):[0,0],wm=G.wind?(G.wind.mph||0)*.035:0;
  for(const p of P){p.life-=dt;if(p.delay>0){p.delay-=dt;continue;}
    if(p.k==='drop'){p.vy-=18*dt;p.x+=p.vx*dt;p.y+=p.vz*dt;p.Y+=p.vy*dt;if(p.vy<0&&p.Y<hAt(p.x,p.y))p.life=0;}
    else if(p.k==='leaf'){if(p.rest)continue;p.ph+=p.sp*dt;const dmp=Math.exp(-1.6*dt);p.vx*=dmp;p.vz*=dmp;p.vy+=(-.9-p.vy)*2.4*dt;
      p.x+=(p.vx+Math.cos(p.ph)*.6+w[0]*wm)*dt;p.y+=(p.vz+Math.sin(p.ph*.7)*.6+w[1]*wm)*dt;p.Y+=p.vy*dt;const g=hAt(p.x,p.y);if(p.Y<=g+.01){p.Y=g+.01;p.rest=true;}}
    else if(p.k==='bird'){p.ph+=p.fl*dt;p.vy+=(.5-p.vy)*.7*dt;p.x+=p.vx*dt;p.y+=p.vz*dt;p.Y+=p.vy*dt;}
    else if(p.k==='tee'){if(p.rest)continue;p.vy-=14*dt;p.x+=p.vx*dt;p.y+=p.vz*dt;p.Y+=p.vy*dt;p.th+=p.om*dt;const g=hAt(p.x,p.y);
      if(p.Y<=g+.004&&p.vy<0){p.Y=g+.004;if(Math.abs(p.vy)<1.6){p.rest=true;p.th=Math.PI/2;}else{p.vy*=-.3;p.vx*=.45;p.vz*=.45;p.om*=.5;}}}}
  G.parts=P.filter(p=>p.life>0);}
function drawParts(){if(G.overview)return;const P=G.parts;
  if(P)for(const p of P){if(p.delay>0)continue;const c=proj(p.x,p.Y,p.y);if(!c||c[2]>400)continue;const px=c[3],fa=clamp(p.life,0,1);
    if(p.k==='drop'){const s=Math.max(p.s,1.6/px);sphAt([p.x,p.Y,p.y],s,s*1.3,s,[.84,.91,.97],undefined,undefined,undefined,.8*fa);}
    else if(p.k==='leaf'){const s=Math.max(p.s,2.2/px),a=p.ph,X=[Math.cos(a)*s,Math.sin(a*1.3)*s*.45,Math.sin(a)*s],Z=[-Math.sin(a)*s*.6,0,Math.cos(a)*s*.6];boxAt([p.x,p.Y,p.y],X,[0,s*.06,0],Z,p.col);}
    else if(p.k==='bird'){const s=Math.max(.18,10/px),hd=Math.atan2(p.vz,p.vx),f=[Math.cos(hd),0,Math.sin(hd)],sd=[-f[2],0,f[0]],fl=Math.sin(p.ph)*.95,B=[p.x,p.Y,p.y];
      sphAt(B,s*.3,s*.1,s*.1,[.13,.12,.11],f,[0,1,0],sd);
      for(const sg of[-1,1]){const wv=[sd[0]*sg*Math.cos(fl),Math.sin(fl),sd[2]*sg*Math.cos(fl)],nv=nrm(cross(wv,f));boxAt(add(B,mul(wv,s*.3)),mul(wv,s*.3),mul(nv,s*.012),mul(f,s*.11),[.16,.15,.14]);}}
    else if(p.k==='tee'){const sc=Math.max(1,6/(p.L*px)),L=p.L*sc,ax=[p.dx*Math.sin(p.th),Math.cos(p.th),p.dy*Math.sin(p.th)],A=[p.x,p.Y,p.y];
      cylAB(sub(A,mul(ax,L*.5)),add(A,mul(ax,L*.5)),p.r*sc,TEE_COL);cylAB(add(A,mul(ax,L*.42)),add(A,mul(ax,L*.52)),p.r*sc*2.6,TEE_MK);}}
  const pm=G.hole&&G.hole.pmarks;if(pm)for(const m of pm){const g=hAt(m.x,m.y);sphAt([m.x,g+.0015,m.y],.034,.006,.024,[.19,.31,.13],[m.dx,0,m.dy],[0,1,0],[-m.dy,0,m.dx]);}}

/* ---------- golfer: a jointed 3D figure driven by a swing-plane model ----------
   Local frame: x toward the hole, y up, z toward the ball (he stands side-on, facing the ball).
   The hands travel a circle in a tilted swing plane around the sternum; the club adds wrist hinge (beta)
   that is set on the way back, held through the downswing (lag) and released at impact. */
const CLUB_LEN=[1.25,1.2,1.16,1.1,1.06,1.045,1.03,1.015,1,.985,.975,.97,.965,.95];
/* v104 gear you can see: club heads by club and by bag model, shaft length by the actual club, and the ball's finish.
   Rivals always show stock gear. (chead = head centre, cd = shaft direction toward the head, fd = face/target, toe = toe) */
const CLEN_ID={'1W':1.25,'MD':1.22,'3W':1.2,'4W':1.18,'5W':1.16,'7W':1.13,'3H':1.12,'DI':1.1,'4H':1.1,'4I':1.075,'5H':1.08,'5I':1.06,'6I':1.045,'7I':1.03,'8I':1.015,'9I':1,'PW':.985,'GW':.975,'52':.973,'54':.971,'SW':.97,'58':.966,'LW':.965,'64':.96,'PT':.95};
const clubLen=i=>{const c=CLUBS[i];return(c&&CLEN_ID[c.id])||CLUB_LEN[i];};
const gearMine=()=>!G.aiTurn;
const gearOf=k=>gearMine()?(BAG[k]||'std'):'std';
const HX=h=>hexc(h);
function drawClubHead(chead,cd,fd,toe,c,grip){const at=(a,b,cc)=>add(chead,add(mul(toe,a),add(mul(cd,b),mul(fd,cc))));
  const LG=typeof R3B!=='undefined'&&R3B.lg&&!(G.aiTurn&&!G.aiChar)?R3B.lg:null;   // a legend's own clubs when he has no bought gear
  if(c.putter){let m=gearOf('ptr');if(m==='std'&&LG&&LG.ptr)m=LG.ptr;const pc=LG&&LG.ptrc||'#b9c3c9';
    if(m==='anser'){boxAt(chead,mul(toe,.092),mul(cd,.022),mul(fd,.015),HX(pc));   // heel-toe weighted blade with a plumber's neck
      for(const sd of[-1,1])boxAt(at(sd*.08,-.002,-.019),mul(toe,.013),mul(cd,.02),mul(fd,.011),HX(pc));
      boxAt(at(0,.004,-.02),mul(toe,.066),mul(cd,.014),mul(fd,.006),HX('#3a3f45'));boxAt(at(0,-.03,.006),mul(toe,.007),mul(cd,.012),mul(fd,.005),HX(pc));
      boxAt(at(0,-.023,-.006),mul(toe,.003),mul(cd,.001),mul(fd,.012),[1,1,1]);}
    else if(m==='spider'){const sc=LG&&LG.ptrs||'#e8e8e8';   // big winged mallet: a wide body, two wings swept back, a coloured sightline
      sphAt(at(0,0,-.03),.07,.02,.05,HX(pc),toe,cd,fd);boxAt(at(0,0,.002),mul(toe,.08),mul(cd,.02),mul(fd,.016),HX(pc));
      for(const sd of[-1,1])sphAt(at(sd*.05,.002,-.07),.03,.018,.04,HX(pc),toe,cd,fd);
      boxAt(at(0,-.021,-.035),mul(toe,.005),mul(cd,.002),mul(fd,.05),HX(sc));}
    else if(m==='blade'){boxAt(chead,mul(toe,.1),mul(cd,.024),mul(fd,.016),HX(pc));boxAt(at(0,-.024,0),mul(toe,.004),mul(cd,.001),mul(fd,.012),[1,1,1]);}
    else if(m==='mallet'||m==='lock'){sphAt(at(0,0,-.026),.062,.022,.056,HX('#2a2e33'),toe,cd,fd);boxAt(at(0,0,.008),mul(toe,.08),mul(cd,.02),mul(fd,.01),HX('#3a3f45'));
      boxAt(at(0,-.023,-.02),mul(toe,.004),mul(cd,.002),mul(fd,.045),[1,1,1]);
      if(m==='lock'&&grip)cylAB(grip,add(grip,mul(cd,-.32)),.016,HX('#1d1f22'));}
    else boxAt(chead,mul(toe,.1),mul(cd,.028),mul(fd,.04),HX('#23292e'));
    return;}
  if(c.kind==='wood'){const m=gearOf('drv'),drv=c.id==='1W'||c.id==='MD';
    let rx=drv?.068:.056,ry=drv?.04:.031,rz=drv?.06:.047;
    if(c.id==='MD'){rx*=.92;rz*=.92;}if(c.id==='7W'){rx*=.94;ry*=.95;rz*=.94;}
    let col='#23292e',acc=null;
    if(m==='std'&&LG&&LG.drv==='persimmon'){rx*=.86;ry*=.94;rz*=.86;sphAt(at(0,-.02,0),rx,ry,rz,HX('#6b3a1e'),toe,cd,fd);   // persimmon: small, varnished, a ringed insert in the face
      boxAt(at(0,-.02,rz*.9),mul(toe,rx*.72),mul(cd,ry*.58),mul(fd,.004),HX('#2a1a12'));boxAt(at(0,-.02,rz*.93),mul(toe,rx*.3),mul(cd,ry*.36),mul(fd,.003),HX('#c9302c'));
      sphAt(at(0,-.02+ry*.55,-rz*.1),rx*.7,ry*.3,rz*.6,HX('#3a2214'),toe,cd,fd);return;}
    if(m==='bomb'){rx*=1.08;ry*=1.12;rz*=1.15;col='#141618';acc='#e0482f';}
    else if(m==='max'){rx*=1.12;ry*=.86;rz*=1.16;col='#22344a';acc='#7fc4ff';}
    else if(m==='shape'){rx*=.9;ry*=1.06;rz*=.86;col='#4a3a2c';acc='#d8b46a';}
    sphAt(at(0,-.02,0),rx,ry,rz,HX(col),toe,cd,fd);
    boxAt(at(0,-.02,rz*.9),mul(toe,rx*.78),mul(cd,ry*.62),mul(fd,.004),HX('#5b636b'));   // the face
    boxAt(at(0,-.02-ry*.93,rz*.05),mul(toe,.005),mul(cd,.003),mul(fd,rz*.75),acc?HX(acc):[.85,.85,.85]);   // crown stripe (model colour)
    if(acc)sphAt(at(0,-.02+ry*.6,-rz*.12),rx*.55,ry*.28,rz*.5,HX(acc),toe,cd,fd);   // sole plate in the model's colour
    return;}
  if(c.kind==='hybrid'){sphAt(at(0,-.016,-.004),.05,.026,.034,HX('#2c3135'),toe,cd,fd);sphAt(at(0,.004,-.004),.04,.008,.026,HX('#9aa5ad'),toe,cd,fd);return;}
  if(c.kind==='wedge'&&c.id!=='PW'){const m=gearOf('wdg');const col=m==='high'?'#202326':m==='low'?'#8d969c':m==='milled'?'#9a6a48':'#c3cbd0';
    boxAt(chead,mul(toe,.08),mul(cd,.058),mul(fd,.019),HX(col));
    if(m==='high')boxAt(at(0,.052,-.016),mul(toe,.07),mul(cd,.008),mul(fd,.012),HX('#3a3e42'));   // the wide sole
    return;}
  // irons (and the PW, which comes with the set)
  const m=gearOf('irn'),di=c.id==='DI';
  if(di){boxAt(chead,mul(toe,.082),mul(cd,.046),mul(fd,.03),HX('#4a5157'));return;}
  if(m==='cav'){boxAt(chead,mul(toe,.086),mul(cd,.052),mul(fd,.026),HX('#b8c0c6'));boxAt(at(0,.012,-.024),mul(toe,.06),mul(cd,.024),mul(fd,.006),HX('#3f6f9a'));}
  else if(m==='forged'){boxAt(chead,mul(toe,.08),mul(cd,.05),mul(fd,.021),HX('#959ea4'));}
  else if(m==='blade'){boxAt(chead,mul(toe,.078),mul(cd,.046),mul(fd,.013),HX('#e6edf1'));}
  else boxAt(chead,mul(toe,.08),mul(cd,.05),mul(fd,.02),HX('#aeb8bf'));}
// the ball: Distance is optic yellow, Low spin is orange, Tour urethane is white with a red band
function drawBallGear(C,r,mine){const m=mine?gearOf('ball'):'std';
  sphAt(C,r,r,r,m==='dist'?[1,.93,.28]:m==='low'?[1,.52,.14]:[1,1,1]);
  if(m==='ure')sphAt(C,r*1.06,r*.38,r*1.06,[.9,.1,.08]);}

const PLANE_V=nrm([0,-.82,.57]),PLANE_N=nrm(cross([1,0,0],PLANE_V));
const SWING_BACK={full:1,flop:1,punch:.6,pitch:.68,chip:.34};
const SWING_END={full:1,flop:1,punch:.5,pitch:.72,chip:.42};
const PELVIS0=[0,.92,-.1],SPINE_L=.58,ARM_R=.62,SWING_DUR=.72,IMPACT_T=.27*SWING_DUR,PUTT_IMPACT=.18;
const FIN_DIR=nrm([-.45,-.5,-.74]);
function spineDir(tilt){return[0,Math.cos(tilt),Math.sin(tilt)];}
function sternum(p,tilt){return add(p,mul(spineDir(tilt),SPINE_L-.07));}
function swingState(type,putt){
  // alpha: hands around the plane (+ = away from the hole), beta: wrist hinge, ts/th: shoulder/hip turn
  const s={alpha:0,beta:0,ts:0,th:0,tilt:35*DEG,heel:0,shift:0,look:0,fin:0};
  const m=G.meter,maxB=SWING_BACK[type]||1;
  const backAt=b=>{const e=smooth(0,1,b);return{alpha:166*DEG*e*maxB,beta:110*DEG*smooth(.12,.62,b*maxB)*Math.min(1,maxB*1.4),ts:98*DEG*b*maxB,th:46*DEG*b*maxB,tilt:(35-4*b*maxB)*DEG,heel:0,shift:-.04*b*maxB,look:0,fin:0};};
  if(putt){let a=0;
    if(aimingState()){const b=swAfter()?0:G.state==='power'?(m.pos-IMPACT)/(1-IMPACT):G.state==='acc'?p2m(m.power):0;a=(b>0?4+12*b:0)*DEG;}
    else if(G.followT>0){const bk=Math.max(0,(G.launchAt||PUTT_IMPACT)-PUTT_IMPACT),b0=G.swingBack||.5,amp=(4+12*b0)*DEG;if(G.followT<bk){s.alpha=amp*smooth(0,1,G.followT/bk);s.ts=0;return s;}const t=Math.min(1,(G.followT-bk)/.6);a=amp*(1-smooth(0,.3,t))-amp*1.15*smooth(.28,.85,t);}
    s.alpha=a;s.ts=0;return s;}
  if(aimingState()){const b=swAfter()?0:G.state==='power'?(m.pos-IMPACT)/(1-IMPACT):G.state==='acc'?p2m(m.power):0;return{...s,...backAt(clamp(b,0,1))};}
  if(G.followT>0){
    const top=backAt(G.swingBack||1),end=SWING_END[type]||1,bk=Math.max(0,(G.launchAt||IMPACT_T)-IMPACT_T);if(G.followT<bk)return{...s,...backAt(clamp((G.swingBack||1)*smooth(0,1,G.followT/bk),0,1))};
    const t=Math.min(end,(G.followT-bk)/SWING_DUR);
    if(t<.27){const u=t/.27,e=u*u;const alpha=top.alpha*(1-e);
      return{alpha,beta:top.beta*clamp(alpha/(55*DEG),0,1),ts:top.ts+(-15*DEG-top.ts)*e,th:top.th+(-40*DEG-top.th)*smooth(0,.65,u),tilt:35*DEG,heel:.15*u,shift:top.shift+(.08-top.shift)*u,look:0,fin:0};}
    const u=(t-.27)/.73,e=1-(1-u)*(1-u);
    return{alpha:-165*DEG*e,beta:-100*DEG*smooth(0,.6,u),ts:-15*DEG-110*DEG*e,th:-40*DEG-55*DEG*e,tilt:(35-29*smooth(.2,1,u))*DEG,heel:.15+.85*smooth(0,.7,u),shift:.08+.08*e,look:smooth(.1,.7,u),fin:smooth(.35,1,u)*(end>=1?1:.4)};
  }
  return s;
}
function drawGolfer3D(ga){
  if(R3.on&&r3Golfer(ga))return;
  const club=G.state==='aim'||aimingState()?G.clubIdx:(G.swingClub??G.clubIdx);
  const putt=club===PUTTER,type=aimingState()?G.stype:(G.swingType||'full');
  const S=swingState(type==='putt'?'full':type,putt);
  if(putt){S.tilt=34*DEG;S.th=0;S.heel=0;S.shift=0;S.look=0;S.fin=0;S.ts=0;}
  const L=clubLen(club);
  const C0=sternum(PELVIS0,35*DEG),H0=add(C0,mul(PLANE_V,ARM_R));
  const dy=-H0[1]/L,D0=[0,dy,Math.sqrt(Math.max(0,1-dy*dy))];
  let zBall=H0[2]+D0[2]*L;
  // putting setup: hands hang under the shoulders, shaft leans a touch toward the hole, eyes over the ball
  const P_PUTT=[0,.97,-.05],H_PUTT=[.04,-.5,.12],D_PUTT=nrm([.07,-.95,.3]);
  let headX=0;
  if(putt){const Cp=add(P_PUTT,mul(spineDir(34*DEG),SPINE_L-.07)),hA=add(Cp,H_PUTT),Lp=(hA[1]-.03)/-D_PUTT[1];zBall=hA[2]+D_PUTT[2]*Lp;headX=hA[0]+D_PUTT[0]*Lp;}
  // place him so the clubhead rests behind the ball at address
  const[ax,az]=dirOf(ga.aim);const u=[ax,0,az],up=[0,1,0],f=[-az,0,ax];
  const ox=ga.x-f[0]*zBall-u[0]*headX,oz=ga.y-f[2]*zBall-u[2]*headX,O=[ox,hAt(ox,oz),oz];
  const W=p=>[O[0]+p[0]*u[0]+p[2]*f[0],O[1]+p[1],O[2]+p[0]*u[2]+p[2]*f[2]];
  const Wd=p=>[p[0]*u[0]+p[2]*f[0],p[1],p[0]*u[2]+p[2]*f[2]];
  const Ry=(v,t)=>[v[0]*Math.cos(t)-v[2]*Math.sin(t),v[1],v[0]*Math.sin(t)+v[2]*Math.cos(t)];
  const P=putt?P_PUTT:add(PELVIS0,[S.shift,0,0]);const sp=spineDir(S.tilt);
  const axp=nrm(cross([1,0,0],sp)); // pendulum axis: shoulders rock in the plane of the target line and spine
  const Sc=add(P,mul(sp,SPINE_L)),C=add(P,mul(sp,SPINE_L-.07));
  const shDir=putt?rotAx([1,0,0],axp,-S.alpha):rotAx([1,0,0],sp,-S.ts);
  const leadSh=add(Sc,mul(shDir,.23)),trailSh=add(Sc,mul(shDir,-.23));
  let hand=add(C,rotAx(mul(PLANE_V,ARM_R),PLANE_N,S.alpha));
  // high finish: hands up by the lead ear, club wrapped behind the head
  if(S.fin>0)hand=add(hand,mul([.04,.14,.06],S.fin));
  let cdir=rotAx(D0,PLANE_N,S.alpha+S.beta);
  if(S.fin>0)cdir=nrm(lerp3(cdir,FIN_DIR,S.fin));
  let chead=add(hand,mul(cdir,L));
  if(putt){
    // arms, hands and putter move as one piece; no wrist hinge
    const rock=-S.alpha,hA=add(C,H_PUTT),Lp=(hA[1]-.03)/-D_PUTT[1];
    hand=add(C,rotAx(H_PUTT,axp,rock));cdir=rotAx(D_PUTT,axp,rock);chead=add(hand,mul(cdir,Lp));
  }
  const hipDir=Ry([1,0,0],S.th);
  const leadHip=add(P,mul(hipDir,.12)),trailHip=add(P,mul(hipDir,-.12));
  const st=putt?.16:.25;const leadFoot=[st,.0,0],trailFoot=[-st+S.heel*.12,S.heel*.07,-.02+S.heel*.05];
  const knee=(hp,ft,push)=>add(lerp3(hp,ft,.5),push);
  const kf=putt?.055:1;
  const leadKnee=knee(leadHip,leadFoot,[.02*kf,0,putt?.06:.1-S.look*.05]),trailKnee=knee(trailHip,trailFoot,[(.06+S.heel*.1)*kf,0,putt?.06:.11]);
  const LK=G.look||LOOK_ME;
  const C_HOOD=hexc(LK.top),C_HOOD_D=mul(hexc(LK.top),.87),C_PANTS=hexc(LK.pants),C_SKIN=hexc(LK.skin),C_BEANIE=hexc(LK.hat),C_BEANIE_D=mul(hexc(LK.hat),.84),
    C_BEARD=hexc(LK.beard||'#3a2a20'),C_BOOT=hexc(LK.boot),C_SOLE=hexc('#5a4f45'),C_GLOVE=[1,1,1],C_SHAFT=hexc('#c9d3da'),C_HEAD=hexc('#23292e');
  // soft contact shadow
  sphAt(add(W([0,0,.35]),[0,.02,0]),.6,.01,.38,[0,0,0],Wd([1,0,0]),[0,1,0],Wd([0,0,1]),.16);
  // joggers: roomy legs tapering into the boots
  for(const[hp,kn,ft,c]of[[leadHip,leadKnee,leadFoot,mul(C_PANTS,.88)],[trailHip,trailKnee,trailFoot,C_PANTS]]){
    cylAB(W(hp),W(kn),.095,c);sphAt(W(kn),.09,.09,.09,c);cylAB(W(kn),W(add(ft,[0,.15,0])),.08,c);}
  // work boots
  const boot=(ft,pitch)=>{const fwd=nrm([0,Math.sin(pitch),Math.cos(pitch)]),upv=mul(nrm(cross(fwd,[1,0,0])),-1);
    boxAt(W(add(ft,add([0,.06,.05],mul(upv,.0)))),Wd([.13,0,0]),Wd(mul(upv,.12)),Wd(mul(fwd,.3)),C_BOOT);
    boxAt(W(add(ft,[0,.14,.0])),Wd([.12,0,0]),Wd([0,.12,0]),Wd([0,0,.14]),C_BOOT);
    boxAt(W(add(ft,add([0,.005,.05],mul(upv,-.0)))),Wd([.135,0,0]),Wd(mul(upv,.025)),Wd(mul(fwd,.31)),C_SOLE);};
  boot(leadFoot,0);boot(trailFoot,S.heel*.9);
  // hips
  boxAt(W(P),Wd(mul(hipDir,.38)),Wd([0,.22,0]),Wd(mul(Ry([0,0,1],S.th),.24)),C_PANTS);
  // hoodie: sturdy, rounded torso that follows the shoulder turn, hood lying on the upper back
  const tY=sp,tX=shDir,tZ=nrm(cross(tX,tY));
  sphAt(W(add(P,mul(sp,.3))),.25,.33,.17,C_HOOD,Wd(tX),Wd(tY),Wd(tZ));
  sphAt(W(add(add(P,mul(sp,.22)),mul(tZ,.06))),.23,.2,.15,C_HOOD,Wd(tX),Wd(tY),Wd(tZ));
  boxAt(W(add(P,mul(sp,.07))),Wd(mul(tX,.44)),Wd(mul(tY,.07)),Wd(mul(tZ,.3)),C_HOOD_D);
  sphAt(W(leadSh),.1,.1,.1,C_HOOD);sphAt(W(trailSh),.1,.1,.1,C_HOOD);
  sphAt(W(add(add(Sc,mul(tZ,-.13)),mul(sp,-.03))),.15,.075,.1,C_HOOD_D,Wd(tX),Wd(tY),Wd(tZ));
  // neck and head: beard, red beanie with a folded cuff; eyes on the ball, then up to the target
  const neckB=add(Sc,mul(sp,.03)),headC=add(Sc,add(mul(sp,.2),[0,0,.04-S.look*.05]));
  cylAB(W(neckB),W(headC),.06,C_SKIN);
  const face=nrm(lerp3([0,-.55,1],[1,.1,.15],S.look));
  sphAt(W(headC),.118,.128,.118,C_SKIN);
  const fh=nrm([face[0],0,face[2]]),side=nrm(cross([0,1,0],fh));
  // head frame: F out through the face, Sd across, Up out the top
  const Fd=face,Sd=nrm(cross([0,1,0],Fd)),Up=nrm(cross(Fd,Sd));
  const HP=(f,s2,u2)=>add(headC,add(add(mul(Fd,f),mul(Sd,s2)),mul(Up,u2)));
  // short full beard: one smooth shell along the jaw and chin, lined up with the sideburns
  const C_BEARD2=C_BEARD,C_SK2=mul(C_SKIN,.94);
  if(LK.beard){sphAt(W(HP(.028,0,-.072)),.108,.074,.094,C_BEARD2,Wd(Sd),Wd(Up),Wd(Fd));
  sphAt(W(HP(.06,0,-.108)),.066,.042,.06,C_BEARD2,Wd(Sd),Wd(Up),Wd(Fd));                               // chin
  for(const s2 of[-1,1])sphAt(W(HP(.035,s2*.1,-.03)),.02,.052,.04,C_BEARD2,Wd(Sd),Wd(Up),Wd(Fd));}     // sideburns
  sphAt(W(HP(.111,0,-.05)),.022,.01,.012,hexc('#9c5b4a'),Wd(Sd),Wd(Up),Wd(Fd));                        // lips
  if(LK.beard)for(const s2 of[-1,1])sphAt(W(HP(.108,s2*.022,-.034)),.026,.011,.014,C_BEARD2,Wd(rotAx(Sd,Fd,-s2*.35)),Wd(rotAx(Up,Fd,-s2*.35)),Wd(Fd)); // moustache
  sphAt(W(HP(.119,0,-.006)),.02,.026,.024,C_SK2,Wd(Sd),Wd(Up),Wd(Fd));                      // nose
  for(const s2 of[-1,1]){sphAt(W(HP(.103,s2*.042,.022)),.013,.013,.008,hexc('#1e1712'),Wd(Sd),Wd(Up),Wd(Fd));   // eyes
    sphAt(W(HP(.1,s2*.044,.043)),.024,.007,.01,hexc('#3a2a20'),Wd(Sd),Wd(Up),Wd(Fd));                             // brows
    sphAt(W(HP(-.005,s2*.118,-.005)),.018,.034,.024,C_SK2,Wd(Sd),Wd(Up),Wd(Fd));}                        // ears
  const bfH=nrm([face[0],0,face[2]]),brim=(w,d,y,col)=>boxAt(W(add(headC,add([0,y,0],mul(bfH,.1+d*.5)))),Wd(mul(nrm(cross([0,1,0],bfH)),w)),Wd([0,.014,0]),Wd(mul(bfH,d)),col);
  if(LK.hatType==='flat'){sphAt(W(add(headC,[0,.06,0])),.13,.068,.138,C_BEANIE,Wd(nrm(cross([0,1,0],bfH))),[0,1,0],Wd(bfH));brim(.2,.07,.05,C_BEANIE_D);}
  else if(LK.hatType==='visor'){sphAt(W(add(headC,[0,.04,0])),.123,.1,.123,hexc(LK.hair||'#3a2a20'));cylAB(W(add(headC,[0,.035,0])),W(add(headC,[0,.065,0])),.127,C_BEANIE);brim(.2,.12,.045,C_BEANIE);}
  else if(LK.hatType==='cap'){sphAt(W(add(headC,[0,.05,0])),.124,.09,.124,C_BEANIE);cylAB(W(add(headC,[0,.02,0])),W(add(headC,[0,.05,0])),.126,C_BEANIE_D);
    const bf=nrm([face[0],0,face[2]]);boxAt(W(add(headC,add([0,.035,0],mul(bf,.14)))),Wd(mul(nrm(cross([0,1,0],bf)),.19)),Wd([0,.014,0]),Wd(mul(bf,.12)),C_BEANIE_D);}
  else{sphAt(W(add(headC,[0,.045,0])),.126,.105,.126,C_BEANIE);
  cylAB(W(add(headC,[0,-.005,0])),W(add(headC,[0,.05,0])),.129,C_BEANIE_D);}
  // arms in hoodie sleeves: lead arm nearly straight, trail elbow folds (two-bone IK)
  const arm=(sh,hd,pole)=>{const d=sub(hd,sh),dl=len3(d),seg=.31;let el;
    if(dl>=seg*2-.005)el=lerp3(sh,hd,.5);else{const mid=lerp3(sh,hd,.5),dn=nrm(d);let pv=sub(pole,mul(dn,dot3(pole,dn)));pv=nrm(pv);el=add(mid,mul(pv,Math.sqrt(seg*seg-(dl/2)*(dl/2))));}
    cylAB(W(sh),W(el),.075,C_HOOD);sphAt(W(el),.07,.07,.07,C_HOOD);cylAB(W(el),W(lerp3(el,hd,.82)),.065,C_HOOD_D);cylAB(W(lerp3(el,hd,.8)),W(hd),.042,C_SKIN);};
  if(putt){arm(leadSh,hand,[.35,-.1,-1]);arm(trailSh,hand,[-.35,-.1,-1]);}
  else{arm(leadSh,hand,[0,-.3,-1]);arm(trailSh,hand,[-.2,-1,.2]);}
  sphAt(W(hand),.058,.058,.058,C_GLOVE);
  // club
  cylAB(W(add(hand,mul(cdir,-.06))),W(chead),.012,C_SHAFT);
  const faceDir=nrm(cross(cdir,PLANE_N));
  drawClubHead(W(chead),Wd(cdir),Wd(faceDir),Wd(nrm(cross(cdir,faceDir))),CLUBS[club],W(add(hand,mul(cdir,-.06))));
}

