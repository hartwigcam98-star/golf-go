/* ---------- save file (this device) ---------- */
let SAVE_KEY=CUR.saveKey;
function saveGame(o={}){if(G.hole&&G.hole.range)return;if(G.mode==='daily'){dailySave(o);return;}if(G.mode!=='round')return;
  const d={v:1,pin:G.pinSeed||0,shots:G.rShots||[],ps:G.psLeft,hi:o.hi??G.hi,scores:G.scores,strokes:o.strokes??G.strokes,ball:o.ball??G.ball,prev:o.prev??G.prev,wind:G.wind,mid:!!o.mid,pend:o.pend||null,tee:TEE,ts:Date.now()};
  try{localStorage.setItem(SAVE_KEY,JSON.stringify(d));}catch(e){}}
function loadSave(key=SAVE_KEY,n=TB.length){try{const d=JSON.parse(localStorage.getItem(key)||'null');if(d&&d.v===1&&Number.isInteger(d.hi)&&d.hi>=0&&d.hi<n)return d;}catch(e){}return null;}
// your Quick play course (the Daily, matches and saved shots visit other courses without changing it) and its saved round
function homeCourse(){let c=null;try{c=localStorage.getItem('golf-course');}catch(e){}return c&&COURSES[c]?c:CUR.id;}
const homeSave=()=>{const C=COURSES[homeCourse()];return loadSave(C.saveKey,C.tb.length);};
function clearSave(){try{localStorage.removeItem(SAVE_KEY);}catch(e){}}
/* wind for the round (v2026-10-09): one prevailing wind per round (direction and strength), the same for every hole, with only a
   little hole-to-hole variation (about +-10 degrees, +-2 mph) and the small per-stroke drift. Holes are mapped north-up, so the
   arrow still turns from hole to hole as the holes point different ways. Daily rounds before 2026-10-09 keep the old per-hole wind. */
const WIND_ROUND_FROM=Math.round(Date.UTC(2026,9,9)/864e5);
function roundWindSeed(){
  if(G.mode==='daily'||(G.mode==='spectate'&&G.dailyDay))return G.dailySeed;
  if(G.mode==='spectate')return G.dailySeed||1;
  if(G.mode==='round'){if(!G.pinSeed)G.pinSeed=1+Math.floor(Math.random()*1e9);return G.pinSeed;}
  if(MATCH.on){if(!MATCH.ws)MATCH.ws=1+Math.floor(Math.random()*1e9);return MATCH.ws;}
  if(!G.windSeed)G.windSeed=1+Math.floor(Math.random()*1e9);return G.windSeed;}
function holeWind(i){
  const daily=G.mode==='daily'||(G.mode==='spectate'&&G.dailyDay&&!(SPEC&&SPEC.pinSeed));
  if(daily&&G.dailyDay&&dailyNum(G.dailyDay)<WIND_ROUND_FROM){const wr=rng(1000+i*17+G.dailySeed);return{a:wr()*TAU,mph:Math.round(wr()*12)};}
  const sd=roundWindSeed(),rb=rng(sd*31+977),a0=rb()*TAU,m0=1+rb()*11,wr=rng(sd*31+1000+i*17);
  return{a:a0+(wr()-.5)*.35,mph:clamp(Math.round(m0+(wr()-.5)*4),0,16)};}
function startHole(i){if(b10On()&&!b10ClubReady(CUR.id,()=>startHole(i)))return;   /* Blender trial: this course's clubhouse file first */
  try{pstatFlush();}catch(e){}try{perfRetry();}catch(e){}try{if(PERF.pend!=null){const l=PERF.pend;PERF.pend=null;R3.dyn=.8;r3SetPerf(l);PERF.upQ=null;PERF.tryD=null;}}catch(e){}
  try{perfDynHole();}catch(e){}const h0=performance.now();
  G.hi=i;G.hole=hole(i);
  if(G.hole.hg&&G.hole.pinVer!==pinVer()){G.hole.hg=null;G.terrains[i]=null;}   // pins from the other hole-location rules: rebuild
  if(!G.hole.hg)buildHeights(G.hole);
  if(!G.terrains[i])G.terrains[i]=buildTerrain(G.hole);
  r3SetHole(G.hole,G.terrains[i]);buildTreeMesh(G.hole);try{r3Reeds(G.hole);}catch(e){}buildGrassPatch(G.hole,0,0);
  G.terrains.forEach((t,j)=>{if(j!==i&&j!==i+1)G.terrains[j]=null;});
  G.ball={x:0,y:0};G.prev={...G.ball};G.strokes=0;G.lie='tee';G.fromLie='tee';
  G.canReplay=false;G.lastShot=null;G.replay=null;G.hop=null;
  G.flight=null;G.roll=null;G.trail=[];G.fx=[];G.parts=[];G.settle=null;G.teeQ=null;G.birdQ=null;if(G.hole)G.hole.pmarks=[];G.inCup=false;G.spin=0;G.overview=false;G.waitFn=null;G.golferAt=null;G.followT=0;
  setPinFor(G.hole,i);G.aim=G.hole.axis;G.shotRot=G.aim;
  G.wind=holeWind(i);
  G.state='intro';
  const t=camTarget();cam.E=[...t.E];cam.L=[...t.L];
  const rg=!!G.hole.range;G.rangeN=0;G.rangeBalls=[];G.rangeLog=[];G.tmLast=null;$('tmPanel').hidden=true;G.tmHist=[];G.rangeFollow=true;try{G.rangeFollow=localStorage.getItem('golf-rangecam2')!=='golfer';}catch(_){}$('iNum').textContent=rg?'R':i+1;$('iPar').textContent=rg?'Driving range':'Par '+G.hole.par;$('iLen').textContent=rg?Math.round(holeData(i).len)+' yds long':G.hole.len+' yds'+(G.hole.pinTag&&G.hole.pinTag[G.hole.pinIx]?' \u00b7 '+G.hole.pinTag[G.hole.pinIx]+' pin':'');
  $('iWind').textContent=G.wind.mph?'Wind '+G.wind.mph+' mph':'Calm';
  $('iTip').textContent=rg?'Warm up as long as you like: every ball comes back to the mat. Tap First tee when you\u2019re ready.':G.hole.tip;$('teeBtn').textContent=rg?'Start hitting':'Tee off';$('matchTag').hidden=!MATCH.on;
  $('howto').hidden=!(i===0&&G.mode==='round');$('iFine').hidden=i!==0;$('rangeGo').hidden=!rg;$('iRange').hidden=!(i===0&&(G.mode==='round'||G.mode==='daily')&&!MATCH.on&&!!rangeOf(CUR));
  if(i===0){const cn=(COURSES[CUR.id]&&COURSES[CUR.id].name||'the club').split(' \u00b7 ')[0];$('iFine').textContent='Unofficial re-creation built from the mapped course layout (\u00a9 OpenStreetMap contributors), aerial photos, USGS 3DEP elevation and published hole descriptions. Not affiliated with '+cn+'.';}
  $('iEyebrow').textContent=G.mode==='practice'?CUR.name+' \u00b7 practice hole':G.mode==='daily'?'Daily round \u00b7 '+dailyNice(G.dailyDay)+' \u00b7 '+CUR.name:courseLine();
  $('cardM').hidden=true;$('reliefM').hidden=true;$('introM').hidden=false;
  setTimeout(()=>$('teeBtn').focus({preventScroll:true}),50);
  try{if(R3.on)r3LvlWarm();}catch(e){}
  LDT.hole={h:i+1,sh:Math.round(performance.now()-h0)};if(LDT.sc){LDT.hole.sc=LDT.sc;LDT.sc=null;}LDT.p={k:'hole',t0:h0,n:0};
}
/* Oct 2026: anything still left of the background shader warm-up is finished here, as the intro closes, so the first hole isn't
   played with first-time shader compiles (100-170 ms hitches on phones) landing in the middle of it */
function r3WarmFinish(){try{while(R3.lvlQ&&R3.lvlQ.length)r3WarmJob({lvl:R3.lvlQ.shift()});}catch(e){}R3.lvlQ=null;if(!R3.warmQ)return;try{while(R3.warmQ.length)r3WarmJob(R3.warmQ.shift());}finally{r3WarmEnd();}}
function teeOff(){A();$('introM').hidden=true;const w0=performance.now();try{r3WarmFinish();}catch(e){}if(LDT.hole&&LDT.hole.tee==null)LDT.hole.tee=Math.round(performance.now()-w0);PERF.quiet=performance.now()+2500;if(MATCH.on){mNextTurn();return;}prepareShot();}
function shotLie(){let L=lieAt(G.ball.x,G.ball.y);if(L!=='water'&&L!=='ob'&&G.hole&&hyp(G.ball.x-((G.hole.line&&G.hole.line[0])||[0,0])[0],G.ball.y-((G.hole.line&&G.hole.line[0])||[0,0])[1])<5)L='tee';return L;}   // the teeing area (some mapped tee boxes are too small)
function prepareShot(){
  if(G.hole&&R3.on&&(!RL.grassAt||hyp(G.ball.x-RL.grassAt[0],G.ball.y-RL.grassAt[1])>6))buildGrassPatch(G.hole,G.ball.x,G.ball.y);
  G.flight=null;G.roll=null;G.inCup=false;G.followT=0;G.golferAt=null;
  if(G.strokes>=10){pickUp();return;}
  G.lie=shotLie();
  const t=aimTarget();G.aim=angTo(G.ball.x,G.ball.y,t[0],t[1]);
  G.clubIdx=autoClub(hyp(t[0]-G.ball.x,t[1]-G.ball.y)+clamp(hAt(t[0],t[1])-hAt(G.ball.x,G.ball.y),-25,25)*.9);
  G.puttMax=calcPuttMax();
  G.spin=0;G.imp={x:0,y:0};G.traj=0;G.pshot=false;
  G.flagOut=G.lie==='green'&&pinDist()<=5;   // inside 15 ft the flag comes out
  { G.stype='full';G.swMax=0;G.shortP=null;
    if(G.clubIdx===PUTTER&&G.lie!=='green'&&!puttLineClean())G.clubIdx=CI('PW');
    if(G.clubIdx!==PUTTER)chooseShort();
    G.puttMax=calcPuttMax(); }
  { const sl=stanceLabel();if(sl&&G.strokes>0)setTimeout(()=>{if(G.state==='aim')toast(sl.toUpperCase(),/Above/.test(sl)?'Ball will want to draw left':/Below/.test(sl)?'Ball will want to fade right':/Uphill/.test(sl)?'Higher and shorter':'Lower, and it runs','#bfe3ff');},900); }
  /* the wind shifts once per stroke: k (saved with the wind) marks the stroke it last shifted for, so reopening the game mid-hole doesn't shift it again */
  { const wk=(MATCH.on?(MATCH.turn+1)*1e4:0)+G.hi*100+G.strokes;
    if(G.strokes>0&&G.wind.k!==wk){const wr2=G.mode==='daily'?rng(G.dailySeed+G.hi*131+G.strokes*7919):Math.random;G.wind.mph=clamp(Math.round(G.wind.mph+(wr2()-.5)*3),0,16);G.wind.a+=(wr2()-.5)*.5;}
    G.wind.k=wk; }
  G.meter.pos=IMPACT;G.meter.power=0;
  G.state='aim';
  saveGame({mid:G.strokes>0});
}
function tap(at){
  A();
  if(G.pendRes)return;
  if(G.aiTurn){skipAI();return;}
  if(G.overview){G.overview=false;return;}
  if(R3.on&&r3RoutineSkip())return;   // Swing during the walk-up only skips it (Cam, Oct 22); the next tap starts the swing
  if(G.fc&&G.state==='aim'){lookEnd();return;}
  const m=G.meter;
  /* the meter reached the bottom a moment ago (see update): a tap made before that moment still counts, by its own time */
  if(G.state==='acc'&&m.endT!=null){const endT=m.endT;m.endT=null;
    if(at>0&&Math.abs(at-performance.now())<1000&&at<=endT){m.pos=clamp((endT-at)/1000*meterSpeed(),0,IMPACT);G.tapMark=m.pos;executeShot(m.power,clamp(m.pos-IMPACT,-.12,.4));}
    else executeShot(m.power,null);
    return;}
  if(G.state==='power'||G.state==='acc')meterAt(at);
  if(G.state==='aim'){G.state='power';m.pos=IMPACT;m.power=0;m.dir=1;m.endT=null;G.tapMark=null;sfx.tick();}
  else if(G.state==='power'){m.power=m2p((m.pos-IMPACT)/(1-IMPACT));G.state='acc';sfx.tick();}
  else if(G.state==='acc'){const e=m.pos-IMPACT;G.tapMark=clamp(m.pos,0,1);executeShot(m.power,clamp(e,-.12,.4));}
}
/* no mulligans from closing the app: the swing is saved the moment it's struck (power, timing, aim, club and a dice seed),
   and on reopening that same swing is played out before anything else */
function pendSave(power,e,seed){const P={s:G.strokes,bx:G.ball.x,by:G.ball.y,p:power,e,sd:seed,aim:G.aim,c:G.clubIdx,st:G.stype,sp:G.spin,imp:{...G.imp},tr:G.traj,ps:!!G.pshot,mp:G.meter.power,fo:!!G.flagOut,w:{...G.wind}};
  if(MATCH.on){const m=CAR.match;if(m&&m.cur){m.cur.pend={...P,k:MATCH.turn};m.ts=Date.now();saveCareer();}return;}
  if(G.mode==='round'||G.mode==='daily')saveGame({mid:true,pend:P});}
function pendResume(P){if(!P||G.state!=='aim'||G.strokes!==P.s||hyp(G.ball.x-P.bx,G.ball.y-P.by)>.1)return false;
  const set=()=>{G.aim=P.aim;G.clubIdx=P.c;G.stype=P.st||'full';G.spin=P.sp||0;G.imp={...(P.imp||{x:0,y:0})};G.traj=P.tr||0;G.pshot=!!P.ps;G.meter.power=P.mp||0;G.flagOut=!!P.fo;if(P.w)G.wind={...P.w};G.shortP=null;setShortMax();};
  set();pendSave(P.p,P.e,P.sd);
  if(G.aiTurn){G.ai={aim:P.aim,power:P.p,e:P.e,sd:P.sd,t:0,think:.6};return true;}
  G.pendRes=true;toast('FINISHING YOUR SHOT','Closing the game mid-shot doesn\u2019t give you a mulligan','#fff6dc');
  setTimeout(()=>{G.pendRes=false;if(G.state!=='aim'||G.strokes!==P.s)return;set();G.state='acc';executeShot(P.p,P.e,P.sd);},1200);return true;}
function executeShot(power,e,seed){
  if(!Number.isInteger(seed))seed=(Math.random()*2147483647)|0;
  if(G.mode!=='spectate'&&!G.replay)try{pendSave(power,e,seed);}catch(_){}
  const R0=Math.random;Math.random=rng(seed);try{strikeShot(power,e);}finally{Math.random=R0;}}
function strikeShot(power,e){
  const club=curClub(),lie=G.lie;
  const pegK=G.strokes===0&&lie==='tee'?pegFor(club):0;G.settle=null;
  G.rec=[];G.recT=0;G.recOn=true;G.canReplay=false;G.recHoled=false;
  G.shotInfo=null;$('shotStats').hidden=true;$('tmPanel').hidden=true;
  G.ff=G.hole&&G.hole.range?(G.rangeFF||4):1;G.strokes++;G.prev={...G.ball};G.fromLie=lie;G.trail=[];G.shotRot=G.aim;G.state='flight';G.followT=.001;G.bY=hAt(G.ball.x,G.ball.y)+.03;G.launchAt=club.putter?PUTT_IMPACT:IMPACT_T;G.swingBack=Math.max(.15,G.meter.power);if(SWT&&!club.putter)G.launchAt+=.25+.35*G.swingBack;G.swingType=club.putter?'putt':G.stype;G.swingClub=G.clubIdx;
  G.golferAt={x:G.ball.x,y:G.ball.y,aim:G.aim};G.twirl=false;
  const miss=e===null;let perfect=false,q=.05;G.missBy=0;
  // the player's timing is judged more strictly than the rivals' (their difficulty is tuned through their own timing spread)
  const HARSH=!G.aiTurn;
  if(miss){e=(Math.random()<.5?-1:1)*(HARSH?.09+Math.random()*.1:.07+Math.random()*.08);power*=HARSH?.3+Math.random()*.15:.45;G.missBy=HARSH?.06:0;toast('MISHIT!','Timing missed the impact line','#ff6a48');}
  else{const w=perfectWin(),ae=Math.abs(e);q=ae<=w*.5?1:ae<=w?.86-.1*(ae-w*.5)/(w*.5):clamp(.62-(ae-w)/.06*.55,.06,.62);
    if(ae<=w){perfect=ae<=w*.5?2:1;e=HARSH&&perfect===1?Math.sign(e)*(ae-w*.5)*.45:0;}   // a "nice" strike still drifts a touch; only dead centre flies dead straight
    else{G.missBy=ae-w;e=HARSH?Math.sign(e)*(.018+(ae-w)*2.6)+(Math.random()-.5)*(ae-w)*1.4:Math.sign(e)*(.012+(ae-w)*1.6);}} // no jump in error just outside the window
  G.lastPerf=perfect;G.lastMiss=miss||(G.missBy||0)>.03;
  if(club.putter){
    const D=Math.max(lie==='green'?.3:.05,G.puttMax*power*(HARSH?1-Math.min(.3,G.missBy*2.4*(cmod().puttD??1)):1));const mu=MU[lie]||MU.fairway;
    const a=G.aim-e*(HARSH?1.45:1.1)*cmod().putt;const[dx,dy]=dirOf(a);const v=Math.sqrt(2*mu*D);
    G.roll={vx:dx*v,vy:dy*v,t:0,lip:false};G.state='roll';G.flame=null;setTimeout(()=>sfx.puttQ(q),G.launchAt*1000);
    if(perfect===2)toast('PURE STROKE','','#ffe27a');
    return;
  }
  const ST=SHOTS[G.stype];if(MATCH.on&&!G.aiTurn&&perfect===2)MATCH.earn.perfect++;
  /* a perfect strike: any wood (tee, fairway, rough) gets extra carry; irons, hybrids and wedges keep the distance
     stays exactly what the player dialled in and the ball comes off with more spin, so it bites: less roll-out (more with a
     carry-boost trait: +3% -> 15% less roll, +6% -> 30%) */
  const perfTee=perfect===2&&!isShort()&&club.kind==='wood',perfBite=perfect===2&&!isShort()&&!perfTee?1-clamp(((cmod().perf??1.03)-1)*5*(cmod().bite??1),0,.6):1;
  const lm=lieMul(club,lie)*(1+(Math.random()*2-1)*lieVar(club,lie)),em=lieErr(club,lie)*ST.e*(club.id==='1W'&&lie!=='tee'&&!onTeeBox()?1.3:1);
  const M=shotMods();
  /* Oct 24 2026 (Pappa): a power shot's extra 15% is earned by the strike: all of it from dead centre, half from a "nice" strike,
     none outside the window (back to normal distance, then the usual mishit loss) */
  if(G.pshot&&!club.putter&&perfect!==2)M.carry*=(1+.15*(perfect===1?.5:0))/1.15;
  // short-game mishits: early (fat) chunks it short and dead; late (thin) blades it low and long and it runs
  /* Oct 17 2026: no cliff at the window's edge. The chunk/blade grows in over the first SG_RAMP of the miss (about 12 ms on the
     short-game cursor): a tap just outside the window is only a touch fat or thin, and from SG_RAMP on it is the full mishit as before
     (it used to be at least 10% short or 14% long, plus the blade's roll and lost spin, the moment the tap left the window) */
  let mis=null;if(isShort()&&!miss&&G.missBy>0){const amp=({chip:BLADE.chipAmp,flop:1.5,pitch:.6,spin:1.1,pick:1.5,splash:1,blast:.8}[G.stype]??1)*(cmod().mis??1);
    const t=clamp(G.missBy/SG_RAMP,0,1),bs=clamp((.07+G.missBy*6)*amp,.07,.5)*t,br=G.stype==='chip'?BLADE.chipR:1.4;
    mis=e>0?{k:'chunk',t,c:1-clamp((.05+G.missBy*7)*amp,.05,.45)*t,a:1-.25*t,r:1-.5*t,sp:1}:{k:'blade',t,c:1+bs,a:1-.7*t,r:1+(br-1)*t,rel:(BLADE.rel[G.stype]??0)*bs/.9,sp:1-t};}
  const sgl=isShort()&&!miss?SG_LIE[lie]:null,sgk=cmod().sgLie??1;let sgv=1,sgChunk=false;
  if(sgl){sgv=1+(Math.random()*2-1)*sgl.v*sgk*(G.stype==='flop'?.7:1)*(cmod().sgVar??1);
    if(sgl.chunk&&!mis&&Math.random()<sgl.chunk*sgk){sgChunk=true;sgv*=.62+Math.random()*.16;if(!G.aiTurn)setTimeout(()=>toast('GRABBED!','The fescue caught the club','#ffb46a'),300);}}
  const flyer=!isShort()&&G.stype!=='punch'&&FLYER[lie]?FLYER[lie][clubGroup(club)]:1;
  // full shots from a fairway bunker: tapped early catches the sand first and comes up well short
  const fat=!isShort()&&lie==='sand'&&!BUNKER_T[G.stype]&&!miss&&G.missBy>0&&e>0?clamp(SAND_FAT[0]+G.missBy*SAND_FAT[1],0,SAND_FAT[2]):0;
  if(fat&&!G.aiTurn)setTimeout(()=>toast('HEAVY!','Caught the sand first','#ffb46a'),300);
  const AD=apprDisp(club,perfect);
  const carry=AD.c*sgv*(mis?mis.c:1)*Math.max(isShort()&&G.swMax?.5:2,(isShort()&&G.swMax?G.swMax:clubCarry(club)*lm*ST.c)*power*M.carry*(perfTee?(cmod().perf??1.03):1)*(1-(HARSH?Math.min(.32,G.missBy*3.6*(cmod().misFull??1)):Math.min(.16,G.missBy*1.6)))*(1-fat));
  const[dx,dy]=dirOf(G.aim),px=-dy,py=dx;
  const lat=-e*1.8*em*carry*cmod().err(club)*lefty()+M.curve*cmod().curve*carry+AD.l*carry;   // a left-hander's hook goes right, his slice left (Oct 13 2026)
  const w=dirOf(G.wind.a),wk=G.wind.mph*.85*(carry/200)*club.loft*ST.w*M.wind*cmod().wind;
  const thin=HARSH?Math.min(1,G.missBy/.06):0;const apex=shotApex(club,carry)*M.apex*(1-.3*thin)*(mis?mis.a:1);
  const usedPower=G.pshot;if(G.pshot)G.pshot=false;   // power shots are unlimited (Oct 11 2026)
  if(G.hole&&G.hole.range)G.tmShot={club,apex,miss:G.missBy||0,iy:(G.imp&&G.imp.y)||0,st:G.stype,aim:G.aim,pw:power};
  G.flight={sx:G.ball.x,sy:G.ball.y,y0:hAt(G.ball.x,G.ball.y)+.03,dx,dy,px,py,carry,lat,wx:w[0]*wk,wy:w[1]*wk,apex,T:flightTime(carry,apex),u:0,club,stype:G.stype,rollMul:M.roll*(1+.7*thin)*(mis?mis.r:1)*(flyer>1?1-(1-perfBite)*.5:perfBite)*flyer*(sgl?1+((G.stype==='chip'?sgl.chip:sgl.r)-1)*sgk:1)*(sgChunk?.5:1)*(cmod().roll?cmod().roll(club,G.stype):1),rel:mis&&mis.rel||0,back:(mis?mis.sp:1)*M.back*cmod().spin*(1-.8*thin)*(sgl?sgl.back:1),
    fly:flyer>1&&lie!=='cut',full:isShort()?0:clubCarry(club)*lm*ST.c*M.carry};
  // a pure approach that comes down close: he twirls the club as it drops from the finish (r3golfer.js)
  {const q=flightPos(G.flight,1),p=G.hole.pin;G.twirl=perfect===2&&!isShort()&&!(perfTee&&onTeeBox()&&G.hole.par>=4)&&hyp(q[0]-p[0],q[1]-p[1])<=R3B_TWIRL_YD;}
  // perfect contact lights the ball up: red flames at full power, blue otherwise
  G.flame=perfect===2&&usedPower?'red':null;   // Oct 28 2026 (Cam): flames only on a power shot struck dead centre (was any perfect strike: red at full power, blue otherwise)
  queueDivot(club,lie,carry/Math.max(1,clubCarry(club)*lm),miss||(mis&&mis.k==='chunk'&&mis.t>=.5),!!(mis&&mis.k==='blade'&&mis.t>=.5));
  G.teeQ=pegK?{x:G.ball.x,y:G.ball.y,a:G.aim,k:pegK,p:power,drv:club.kind==='wood'}:null;
  G.birdQ=club.kind==='wood'&&carry>170?{p:flightPos(G.flight,1),T:G.flight.T}:null;
  const lieNow=lie,kind=club.kind,fl=G.flame;
  setTimeout(()=>sfx.swoosh(.5+.5*power),Math.max(0,G.launchAt*1000-150));
  setTimeout(()=>{sfx.strike(power,q,kind,lieNow);if(fl)sfx.flame(fl==='red');if(perfect)setTimeout(sfx.nice,120);},G.launchAt*1000);
  if(perfect===2)toast(G.flame==='red'?'PERFECT! \ud83d\udd25':'PERFECT!',(G.flame==='red'?'Full-power fireball':'Dead centre')+(isShort()?'':perfTee?' \u00b7 +'+Math.round(((cmod().perf??1.03)-1)*100)+'% carry':' \u00b7 bites on landing'),G.flame==='red'?'#ff8a3c':'#7cc8ff');else if(perfect)toast('NICE SHOT!','','#ffc93c');
  else if(mis&&mis.t>=.5)toast(mis.k==='chunk'?'CHUNKED!':'BLADED!',mis.k==='chunk'?'Tapped early \u00b7 caught it fat':'Tapped late \u00b7 caught it thin','#ff9b6a');
  else if(mis)toast(mis.k==='chunk'?'A TOUCH FAT':'A TOUCH THIN',mis.k==='chunk'?'A touch early':'A touch late','#ffd2a8');
  else if(!miss&&Math.abs(e)>.035)toast(e>0?'HOOK!':'SLICE!',e>0?'Tapped early':'Tapped late','#ff9b6a');
  else if(!miss&&e!==0)toast(e>0?'PULLED':'PUSHED',e>0?'A touch early':'A touch late','#ffd2a8');
}
/* realistic flight: drag slows the ball, so it covers ground quickly early and hangs late;
   the arc peaks past halfway (about 57% of carry) and comes down steeper than it went up */
const DRAG=1.1,DRAG_N=1-Math.exp(-DRAG);
function flightS(u){return u<=1?(1-Math.exp(-DRAG*u))/DRAG_N:1+(u-1)*DRAG*Math.exp(-DRAG)/DRAG_N;} // share of carry covered at time fraction u
function arcH(s){return 2.802*s*(1-s)*(1+.8*s);}                                                     // height as a share of apex
function flightPos(f,u){const s=flightS(u);return[f.sx+f.dx*f.carry*s+f.px*f.lat*s*s+f.wx*s*s,f.sy+f.dy*f.carry*s+f.py*f.lat*s*s+f.wy*s*s,f.y0+f.apex*arcH(s)];}
function flightPosTo(f,u,o){const s=flightS(u);o[0]=f.sx+f.dx*f.carry*s+f.px*f.lat*s*s+f.wx*s*s;o[1]=f.sy+f.dy*f.carry*s+f.py*f.lat*s*s+f.wy*s*s;o[2]=f.y0+f.apex*arcH(s);return o;}   // same, into a reused array (per-frame callers)
function flightTime(carry,apex){return Math.max(.6,.6*Math.sqrt(Math.max(apex,.1))+carry/85);} // driver ~6 s of hang time, 7-iron ~5.4, lob wedge ~4.7
// the ball strikes the flagstick in flight: a clang, and it drops at the foot of the pin - now and then straight into the cup
function pinHit(f,u,hp){const p=G.hole.pin,[tx,ty]=travelDir(f,u);f.pinHit=true;sfx.pin(1);
  G.shotInfo={carry:hyp(p[0]-f.sx,p[1]-f.sy),peak:f.apex,sx:f.sx,sy:f.sy};G.flight=null;
  if(hp<.35&&Math.random()<.4){G.cupHard=true;holed('Off the pin');return;}
  const a=(Math.random()-.5)*2.4,c=Math.cos(a),s=Math.sin(a),v=.5+Math.random()*1.3,bx=-tx,by=-ty;
  G.ball.x=p[0]-tx*.1;G.ball.y=p[1]-ty*.1;G.bY=hAt(G.ball.x,G.ball.y);G.roll={vx:(bx*c-by*s)*v,vy:(bx*s+by*c)*v,t:0,lip:true};G.state='roll';
  toast('OFF THE PIN!','','#fff6dc');}
function stepFlight(dt){
  const f=G.flight;
  if(f.drop){const D=f.drop;D.vy-=30*dt;G.ball.x+=D.vx*dt;G.ball.y+=D.vz*dt;G.bY+=D.vy*dt;   // falling out of the branches
    G.trail.push({x:G.ball.x,y:G.ball.y,Y:G.bY});if(G.trail.length>70)G.trail.shift();const g0=hAt(G.ball.x,G.ball.y);
    if(G.bY<=g0+.03){G.bY=g0;G.flight=null;G.roll={vx:D.vx*.6,vy:D.vz*.6,t:0,lip:false};G.state='roll';}return;}
  f.u+=dt/f.T;const u=f.u;
  const[x,y,Y]=flightPos(f,u);G.ball.x=x;G.ball.y=y;G.bY=Y;
  const gnd=hAt(x,y);
  G.trail.push({x,y,Y});if(G.trail.length>70)G.trail.shift();
  // the flagstick (in for every shot from off the green): the closest pass of this step to the stick, at the height it passed
  if(!f.pinHit&&u>.3){const p=G.hole.pin,lx=f.qx??x,ly=f.qy??y,lY=f.qY??Y;f.qx=x;f.qy=y;f.qY=Y;const sx=x-lx,sy=y-ly,L2=sx*sx+sy*sy,k=L2>1e-9?clamp(((p[0]-lx)*sx+(p[1]-ly)*sy)/L2,0,1):1;
    const cx=lx+sx*k,cy=ly+sy*k,Yk=lY+(Y-lY)*k,gp=hAt(p[0],p[1]);if(hyp(cx-p[0],cy-p[1])<.075&&Yk-gp>.02&&Yk-gp<2.5){pinHit(f,u,Yk-gp);return;}}
  /* trees like real ones: the crown is mostly leaves, so the ball usually flies through it; each yard it travels inside
     a crown has a small chance of catching a branch, which knocks it down near that spot. Only the trunk sends it back. */
  if(!f.knocked){const lx=f.lx??x,ly=f.ly??y,ds=hyp(x-lx,y-ly);f.lx=x;f.ly=y;
    for(const t of G.hole.trees){const d=hyp(x-t.x,y-t.y);if(d>Math.max(t.r,t.cr||0))continue;const ht=Y-t.gh,top=2+1.35*t.r,tr=clamp(.05*t.r+.12,.15,.5);
      const cw=treeCrown(t,ht),inLeaf=k=>cw===null?(ht>(k>.82?2:3)&&ht<top&&d<t.r*k):(ht>1.5&&d<cw*(k>.82?1:.92));   // the crown as drawn (0.85/0.8 x the photo radius before)
      if(t.cactus){if(ht<9.5*(t.vs||1)&&d<.62&&ds>0){const nx=(x-t.x)/(d||1),ny=(y-t.y)/(d||1),[tx,ty]=travelDir(f,u),dot=tx*nx+ty*ny,rx=tx-2*dot*nx,ry=ty-2*dot*ny,v=clamp(f.carry/f.T*.25,1.5,7);
          G.flight=null;sfx.tree();toast('OUCH!','Off a saguaro','#ff9b6a');G.bY=gnd;G.roll={vx:rx*v,vy:ry*v,t:0,lip:false};G.state='roll';return;}continue;}
      if(ht<top*.8&&d<tr+.05&&ds>0){   // the trunk: bounce off it and back the way the ball came
        const nx=(x-t.x)/(d||1),ny=(y-t.y)/(d||1),[tx,ty]=travelDir(f,u),dot=tx*nx+ty*ny,rx=tx-2*dot*nx,ry=ty-2*dot*ny,v=clamp(f.carry/f.T*.3,2,9);
        G.flight=null;sfx.tree();toast('THWACK!','Off the trunk','#ff9b6a');G.bY=gnd;G.roll={vx:rx*v,vy:ry*v,t:0,lip:false};G.state='roll';return;}
      if(u>.04&&inLeaf(.85)&&!(f.rus||(f.rus=new Set())).has(t)){f.rus.add(t);const[tx,ty]=travelDir(f,u);   // through the leaves: a rustle, a few leaves, sometimes birds
        sfx.rustle(clamp(f.carry/200,.45,1));leafBurst(x,y,Y,tx,ty,8+((Math.random()*6)|0));if(Math.random()<.4)birdsFrom(t,x,y,2+((Math.random()*3)|0),0);}
      if(u>.04&&inLeaf(.8)){const p=(t.con?.02:.009)*ds;
        if(Math.random()<p){   // caught a branch: the ball loses its pace and drops a few yards on
          const[tx,ty]=travelDir(f,u),a=(Math.random()-.5)*1.4,c=Math.cos(a),sn=Math.sin(a);sfx.tree();toast('TIMBER!','Knocked down by a branch','#ff9b6a');
          const v=1.2+Math.random()*2.5;f.knocked=true;f.drop={vx:(tx*c-ty*sn)*v,vz:(tx*sn+ty*c)*v,vy:.5};return;}}}}
  if((u>.5&&Y<=gnd+.03)||u>2.4)land(u);
}
function travelDir(f,u){const s=flightS(u),tx=f.dx*f.carry+2*s*(f.px*f.lat+f.wx),ty=f.dy*f.carry+2*s*(f.py*f.lat+f.wy);const l=hyp(tx,ty)||1;return[tx/l,ty/l];}
/* v100 full-shot roll-out: club roll x the surface (greens hold irons far better than woods), soft swings judged nearer the
   full swing, a helping wind lands it flatter and hotter (into the wind steeper and softer), and a ball dropping well
   below where it was hit comes in steeper and stops sooner (an uphill approach lands flatter and runs) */
function fullRoll(f,L,tx,ty){const c=f.club,ST=SHOTS[f.stype||'full'];
  const Ce=f.full?f.carry+Math.max(0,f.full-f.carry)*(PART_K[c.kind]??0):f.carry;
  const surf=L==='green'?(GREEN_HOLD[tidOf(c)]??.5):(SURF[L]||1);
  const w=dirOf(G.wind.a),along=G.wind.mph*(w[0]*tx+w[1]*ty),wind=clamp(1+.014*along,.75,1.35);
  const drop=(f.y0??0)-hAt(G.ball.x,G.ball.y),fall=clamp(1-.012*drop,.8,1.2);
  return Ce*c.roll*ST.r*surf*(f.rollMul??1)*wind*fall;}
function land(u){
  const f=G.flight;G.flight=null;G.shotInfo={carry:hyp(G.ball.x-f.sx,G.ball.y-f.sy),peak:f.apex,sx:f.sx,sy:f.sy};
  const L=lieAt(G.ball.x,G.ball.y);
  if(L==='water'||L==='ob'){penalty(L);return;}
  const p=G.hole.pin;if(hyp(G.ball.x-p[0],G.ball.y-p[1])<.35){holed('Slam dunk');return;}
  const[tx,ty]=travelDir(f,u);
  if(L==='green'&&f.apex>2.5){const h=G.hole;(h.pmarks=h.pmarks||[]).push({x:G.ball.x+tx*.03,y:G.ball.y+ty*.03,dx:tx,dy:ty});if(h.pmarks.length>12)h.pmarks.shift();}   // a pitch mark where it came down
  const ST=SHOTS[f.stype||'full'];
  let R=SHORT_T[f.stype]?f.carry*shortRoll(f.club,f.stype,L)*(f.rollMul??1):f.stype==='punch'?f.carry*.22*(SURF[L]||1)*(f.rollMul??1):fullRoll(f,L,tx,ty);
  if(f.rel)R+=f.carry*f.rel*(SURF[L]||1);   // a thinned spinner / flop / pitch has no spin on it: it lands running
  // wedges into the green check up; with backspin selected they zip back
  const spinBack=L==='green'&&((f.back>0)||(f.club.loft>=1.15&&f.stype==='full'&&f.carry>45&&!f.fly));
  if(spinBack)R=f.back>0?-Math.min(3.5,f.carry*.03)*f.back:Math.min(R,f.carry*(f.club.loft>=1.25?.012:f.club.loft>=1.19?.018:.024));   // full wedges still check, a PW releases a couple of yards
  const mu=SHORT_T[f.stype]?MU.green:(MU[L]||MU.fairway);
  // bounce and roll use the original landing model (independent of the longer hang time)
  const Tb=Math.max(.8+f.carry/140,.55+Math.sqrt(f.apex)*.28);
  const g=clamp(8*f.apex/(Tb*Tb),16,42),vyIn=clamp(4*f.apex/Tb*(1+Math.max(0,u-1)),1,60);
  const e=HOP_E[L]??.3;
  // plan the hops so hops plus roll add up to the intended roll-out
  let vh=R>0?Math.min(Math.sqrt(2*mu*R)*.95,24):1.3;
  const hopDist=v0=>{let d=0,vy=vyIn*e,vv=v0;for(let k=0;k<4&&vy>=1.6;k++){d+=vv*2*vy/g;vy*=e;vv*=.72;}return d;};
  let Dh=hopDist(vh);if(R>0&&Dh>R*.6){vh*=R*.6/Dh;Dh=R*.6;}
  const rollV=R>0?Math.sqrt(2*mu*Math.max(0,R-Dh)):Math.sign(R)*Math.sqrt(2*mu*Math.abs(R));
  const[gx,gy]=gradAt(G.ball.x,G.ball.y);
  G.hop={vx:tx*vh-gx*vyIn*e*1.6,vz:ty*vh-gy*vyIn*e*1.6,vy:vyIn*e,g,rollV,tx,ty,n:0,spinBack};
  G.bY=hAt(G.ball.x,G.ball.y)+.01;
  if(vyIn*e<1.6||L==='sand'){startRoll(L);}
  else{G.state='bounce';}
  sfx.land();G.fx.push({x:G.ball.x,y:G.ball.y,t:0,type:L==='sand'?'sand':'land'});
  if(spinBack&&R<0)setTimeout(()=>{if(G.state==='roll'||G.state==='bounce')toast('SPIN BACK!','','#8ee6a8');},500);
}
const HOP_E={green:.28,fairway:.36,tee:.36,cut:.28,rough:.17,sand:.02,fescue:.12};
function startRoll(L){const b=G.hop;let dx,dz;
  if(b.rollV<0){dx=-b.tx;dz=-b.ty;}else{const l=hyp(b.vx,b.vz);if(l>.3){dx=b.vx/l;dz=b.vz/l;}else{dx=b.tx;dz=b.ty;}}
  const v=Math.abs(b.rollV);G.roll={vx:dx*v,vy:dz*v,t:0,lip:false};G.hop=null;G.state='roll';G.bY=hAt(G.ball.x,G.ball.y);}
function stepHop(dt){
  const b=G.hop,n=Math.max(1,Math.ceil(dt*120)),h=dt/n,p=G.hole.pin;
  for(let i=0;i<n;i++){
    b.vy-=b.g*h;G.bY+=b.vy*h;G.ball.x+=b.vx*h;G.ball.y+=b.vz*h;
    if(!b.pinHit&&hyp(G.ball.x-p[0],G.ball.y-p[1])<.075){const hp=G.bY-hAt(p[0],p[1]);if(hp<2.5){b.pinHit=true;sfx.pin(.8);
      if(hp<.3&&Math.random()<.35){G.cupHard=true;holed('Off the pin');return;}b.vx*=-.25;b.vz*=-.25;toast('OFF THE PIN!','','#fff6dc');}}
    const gnd=hAt(G.ball.x,G.ball.y);
    if(G.bY<=gnd&&b.vy<0){
      G.bY=gnd;const L=lieAt(G.ball.x,G.ball.y);
      if(L==='water'||L==='ob'){penalty(L);return;}
      const vyIn=-b.vy;
      if(hyp(G.ball.x-p[0],G.ball.y-p[1])<CUP*1.6&&vyIn<7){holed('Dunked it');return;}
      const e=HOP_E[L]??.3;b.n++;
      G.fx.push({x:G.ball.x,y:G.ball.y,t:.3,type:L==='sand'?'sand':'land'});tone(140,.06,'sine',Math.min(.2,vyIn*.012));
      if(vyIn*e<1.6||b.n>=4||L==='sand'){startRoll(L);return;}
      // each hop loses pace; slopes kick the ball away from the high side
      const[gx,gy]=gradAt(G.ball.x,G.ball.y);
      b.vy=vyIn*e;b.vx=b.vx*.72-gx*vyIn*e*1.6;b.vz=b.vz*.72-gy*vyIn*e*1.6;
    }
  }
  G.trail.push({x:G.ball.x,y:G.ball.y,Y:G.bY});if(G.trail.length>70)G.trail.shift();
}
function stepRoll(dt){
  const r=G.roll;r.t+=dt;const n=Math.max(1,Math.ceil(dt*240)),h=dt/n,p=G.hole.pin;
  for(let i=0;i<n;i++){
    if(r.rim){const R=r.rim,b=G.ball;R.a+=R.w*h;R.left-=Math.abs(R.w)*h;b.x=p[0]+Math.cos(R.a)*CUP*.9;b.y=p[1]+Math.sin(R.a)*CUP*.9;   // riding the rim
      if(R.left<=0){r.rim=null;if(R.drop){G.cupHard=true;holed('Rattled in');return;}
        const ox=Math.cos(R.a),oy=Math.sin(R.a),sg=Math.sign(R.w),tx=-oy*sg,ty=ox*sg,ex=tx+ox*.8,ey=ty+oy*.8,l=hyp(ex,ey);
        r.vx=ex/l*R.sp;r.vy=ey/l*R.sp;b.x=p[0]+ox*CUP*1.05;b.y=p[1]+oy*CUP*1.05;sfx.lip();toast('LIP OUT!','','#ff9b6a');}
      continue;}
    const b=G.ball,L=lieAt(b.x,b.y);
    if(L==='water'||L==='ob'){penalty(L,true);return;}
    let sp=hyp(r.vx,r.vy);const d=hyp(b.x-p[0],b.y-p[1]);
    if(d<CUP){
      // a ball entering off-centre needs to be slower to drop; with the flagstick in, the stick soaks up pace
      if(r.cb===undefined)r.cb=sp>1e-6?Math.abs(r.vx*(p[1]-b.y)-r.vy*(p[0]-b.x))/sp:0;const vmax=capV(r.cb);
      if(!flagPulled()&&!r.tk&&sp>.6){r.tk=1;sfx.pin(.35);}
      if(sp<vmax){G.cupHard=sp>vmax*.6;holed();return;}
      if(!r.lip&&r.cb>CUP*.4&&sp<vmax*2.2){r.lip=true;   // caught the edge: it rides the rim a little way, then spins out (or, now and then, drops)
        const rx=b.x-p[0],ry=b.y-p[1],sg=Math.sign(rx*r.vy-ry*r.vx)||1;r.rim={a:Math.atan2(ry,rx),w:sg*clamp(sp*.6,.7,1.6)/(CUP*.9),left:.9+Math.random()*1.9,sp:sp*.45,drop:sp<vmax*1.2&&Math.random()<.3};sfx.rim();continue;}
      if(!r.lip){r.lip=true;const a=(Math.random()<.5?-1:1)*(.35+Math.random()*.4),c=Math.cos(a),s=Math.sin(a);const vx=r.vx,vy=r.vy;r.vx=(vx*c-vy*s)*.62;r.vy=(vx*s+vy*c)*.62;sfx.lip();toast('LIP OUT!','','#ff9b6a');}
    }else if(d>CUP*1.6){r.lip=false;r.cb=undefined;r.tk=0;}
    sp=hyp(r.vx,r.vy);const mu=muRoll(L,sp);
    const[gx,gy]=gradAt(b.x,b.y);const sx=-GACC*gx,sy=-GACC*gy,smag=hyp(sx,sy);
    let ax=sx,ay=sy;if(sp>1e-6){ax+=-mu*r.vx/sp;ay+=-mu*r.vy/sp;}
    r.vx+=ax*h;r.vy+=ay*h;
    if(hyp(r.vx,r.vy)<Math.max(.1,mu*h*1.5)&&smag<muStill(L)*.95){stopBall();return;}
    b.x+=r.vx*h;b.y+=r.vy*h;
  }
  if(r.t>30)stopBall();
}
function endRec(holedIt){if(!G.recOn)return;G.recOn=false;G.rec.push({t:G.recT+.02,x:G.ball.x,y:G.ball.y,Y:hAt(G.ball.x,G.ball.y)});G.recHoled=!!holedIt;
  G.lastShot={rec:G.rec,golferAt:G.golferAt,launchAt:G.launchAt,holed:!!holedIt,putt:G.swingType==='putt',flame:G.flame,club:G.swingClub,type:G.swingType,back:G.swingBack,strokes:G.strokes};G.canReplay=G.rec.length>6;
  if(G.mode==='daily')try{dailyRecShot();}catch(e){}
  else if(G.mode==='round')try{roundRecShot();}catch(e){}}
/* daily replays: each shot is kept as its swing (club, type, backswing, aim, where the golfer stood) and the ball's path,
   resampled to 10 per second and stored as whole-number deltas (time in 1/100 s, positions in 1/10 yd) */
function shotPack(){const R=G.rec;if(!R||R.length<2)return null;
  const p=[];let lt=-1,o=[0,0,0,0];
  for(let i=0;i<R.length;i++){const r=R[i];if(i>0&&i<R.length-1&&r.t-lt<.1)continue;lt=r.t;const q=[Math.round(r.t*100),Math.round(r.x*10),Math.round(r.y*10),Math.round(r.Y*10)];p.push(q[0]-o[0],q[1]-o[1],q[2]-o[2],q[3]-o[3]);o=q;}
  const ga=G.golferAt||{x:R[0].x,y:R[0].y,aim:G.shotRot};
  return {h:G.hi,c:G.swingClub,k:G.swingType,b:+(G.swingBack||1).toFixed(2),l:+(G.launchAt||0).toFixed(3),a:+ga.aim.toFixed(4),gx:+ga.x.toFixed(1),gy:+ga.y.toFixed(1),o:G.recHoled?1:0,f:G.flame==='red'?2:G.flame?1:0,p};}
function dailyRecShot(){const d=dailyLoad();if(!d||d.day!==G.dailyDay||d.done)return;const s=shotPack();if(!s)return;(d.shots=d.shots||[]).push(s);dailyStore(d);}
// Quick play keeps its shots too (saved with the round), so a round posted to the course records can be watched (v86)
function roundRecShot(){const s=shotPack();if(!s)return;(G.rShots=G.rShots||[]).push(s);}
function dailyDecShot(s){const rec=[];let o=[0,0,0,0];const p=s.p||[];for(let i=0;i+3<p.length;i+=4){o=[o[0]+p[i],o[1]+p[i+1],o[2]+p[i+2],o[3]+p[i+3]];
    const x=o[1]/10,y=o[2]/10,g=hAt(x,y);let Y=o[3]/10;if(Math.abs(Y-g)<.11)Y=g;rec.push({t:o[0]/100,x,y,Y,gr:Y===g});}return recDensify(rec);}
/* Saved shots keep 10 points a second, and straight lines between them made replays choppy: corners in the flight,
   bounces that never touched the ground, wobbly rolls. Rebuild the path at 60 a second (v82):
   - in the air: arcs, with gravity measured from the shot's own points (it differs shot to shot)
   - a bounce between two points: down to the ground and back up
   - on the ground: a smooth curve through the points (breaking putts curve) that follows the terrain */
function recDensify(R){const n=R.length;if(n<3)return R;
  const gs=[];for(let i=1;i<n-1;i++){const a=R[i-1],b=R[i],c=R[i+1];if(a.gr||b.gr||c.gr)continue;const h1=b.t-a.t,h2=c.t-b.t;if(h1<=0||h2<=0)continue;
    const acc=2*((c.Y-b.Y)/h2-(b.Y-a.Y)/h1)/(h1+h2);if(acc<-1)gs.push(-acc);}
  gs.sort((p,q)=>p-q);const gv=gs.length?gs[gs.length>>1]:20;
  const vEnd=i=>{if(i<1)return null;const a=R[i-1],b=R[i],h=b.t-a.t;if(h<=0||a.gr)return null;return(b.Y-a.Y)/h-.5*gv*h;};   // vertical speed arriving at point i
  const cr=(p0,p1,p2,p3,k)=>{const k2=k*k,k3=k2*k;return .5*((2*p1)+(-p0+p2)*k+(2*p0-5*p1+4*p2-p3)*k2+(-p0+3*p1-3*p2+p3)*k3);};
  // rolling stretches: positions are rounded to 1/10 yd, which made a slow roll surge and stall every tenth of a second.
  // Fit a quadratic through the 7 nearest points of the same roll for a smoothed position and speed (the final point stays exact).
  const sm=new Array(n);
  for(let i=0;i<n;i++){if(!R[i].gr)continue;let lo=i,hi=i;while(lo>0&&R[lo-1].gr&&i-lo<3)lo--;while(hi<n-1&&R[hi+1].gr&&hi-i<3)hi++;
    if(hi-lo<2){sm[i]=null;continue;}const fit=key=>{let S=[0,0,0,0,0],T=[0,0,0];for(let j=lo;j<=hi;j++){const d=R[j].t-R[i].t,v=R[j][key];let p=1;for(let e=0;e<5;e++){S[e]+=p;if(e<3)T[e]+=v*p;p*=d;}}
      const M=[[S[0],S[1],S[2]],[S[1],S[2],S[3]],[S[2],S[3],S[4]]],det=m=>m[0][0]*(m[1][1]*m[2][2]-m[1][2]*m[2][1])-m[0][1]*(m[1][0]*m[2][2]-m[1][2]*m[2][0])+m[0][2]*(m[1][0]*m[2][1]-m[1][1]*m[2][0]);
      const D0=det(M);if(Math.abs(D0)<1e-12)return null;const col=(c)=>M.map((r,k)=>r.map((v,q)=>q===c?T[k]:v));return[det(col(0))/D0,det(col(1))/D0];};
    const fx=fit('x'),fy=fit('y');sm[i]=fx&&fy?{x:fx[0],y:fy[0],vx:fx[1],vy:fy[1]}:null;}
  for(let i=0;i<n;i++)if(sm[i]&&(i===n-1||i===0||!R[i-1].gr)){sm[i].x=R[i].x;sm[i].y=R[i].y;}   // where a roll starts (landing) and where the ball stops stay exact
  const out=[R[0]];
  for(let i=0;i<n-1;i++){const a=R[i],b=R[i+1],h=b.t-a.t;if(h<=0)continue;const m=Math.max(1,Math.round(h*60));
    const roll=a.gr&&b.gr,P=R[Math.max(0,i-1)],Q=R[Math.min(n-1,i+2)];
    // a bounce inside this gap: the ball was coming down at a, but a single arc to b would need it going up
    let tc=null,gc=0;const va=vEnd(i);
    if(!roll&&!a.gr&&va!==null&&va<0){const vs=(b.Y-a.Y)/h+.5*gv*h;
      if(vs-va>Math.max(1.5,.25*-va)){const ga=hAt(a.x,a.y),gb=hAt(b.x,b.y),A=-.5*gv,B=va-(gb-ga)/h,C=a.Y-ga,D=B*B-4*A*C;
        if(D>=0){const r1=(-B-Math.sqrt(D))/(2*A),r2=(-B+Math.sqrt(D))/(2*A),s1=[r1,r2].filter(v=>v>0&&v<h).sort((p,q)=>p-q)[0];if(s1!==undefined){tc=s1;gc=ga+(gb-ga)*s1/h;}}}}
    for(let j=1;j<=m;j++){const k=j/m,t=a.t+h*k;let x,y,Y;
      const sa=roll&&sm[i],sb=roll&&sm[i+1];
      if(sa&&sb){const k2=k*k,k3=k2*k,h00=2*k3-3*k2+1,h10=k3-2*k2+k,h01=-2*k3+3*k2,h11=k3-k2;   // cubic Hermite through the smoothed points and speeds
        x=h00*sa.x+h10*h*sa.vx+h01*sb.x+h11*h*sb.vx;y=h00*sa.y+h10*h*sa.vy+h01*sb.y+h11*h*sb.vy;}
      else if(roll||(tc===null&&!P.gr&&!a.gr&&!b.gr&&!Q.gr&&P!==a&&Q!==b)){x=cr(P.x,a.x,b.x,Q.x,k);y=cr(P.y,a.y,b.y,Q.y,k);}else{x=a.x+(b.x-a.x)*k;y=a.y+(b.y-a.y)*k;}   // smooth in flight too (drag slows the ball), straight across a bounce
      if(j===m&&!(sa&&sb)){x=b.x;y=b.y;}
      const g=hAt(x,y);
      if(roll)Y=g;
      else if(tc!==null){const sx=h*k;if(sx<=tc)Y=a.Y+va*sx-.5*gv*sx*sx;else{const r=sx-tc,H=h-tc,vu=(b.Y-gc)/H+.5*gv*H;Y=gc+vu*r-.5*gv*r*r;}}
      else Y=a.Y+(b.Y-a.Y)*k+.5*gv*(h*k)*(h-h*k);
      if(j===m)Y=b.Y;if(Y<g)Y=g;
      out.push({t,x,y,Y});}}
  return out;}
/* launch monitor numbers on the range (Oct 2026): ball speed, club speed and smash, launch, spin, carry, total, offline and apex. The game's flight
   gives carry, apex and where the ball finished; the rest follow tour averages for the club (nearest by its stock carry), moved by the strike:
   a mishit costs smash, a low strike (backspin) adds spin and launch, punch and chip shots spin less. */
const TM_REF=[[250,.655,1.48,11,2700],[230,.68,1.47,9.5,3600],[215,.69,1.46,10,4300],[200,.70,1.45,11,4500],[182,.73,1.40,12,5400],[171,.74,1.38,14,6200],[160,.75,1.36,16,7000],
  [148,.77,1.34,18,7900],[136,.79,1.31,20.5,8600],[124,.81,1.25,24,9300],[108,.85,1.22,27,9800],[92,.90,1.20,30,10200],[75,.98,1.17,33,10500]];
function tmRef(c){const k=c.carry||150;let i=0;while(i<TM_REF.length-1&&TM_REF[i+1][0]>=k)i++;const a=TM_REF[i],b=TM_REF[Math.min(i+1,TM_REF.length-1)],t=a===b||a[0]===b[0]?0:clamp((a[0]-k)/(a[0]-b[0]),0,1);return a.map((v,j)=>v+(b[j]-v)*t);}
function tmShow(I,tot){const S=G.tmShot;G.tmShot=null;const el=$('tmPanel');G.tmLast={carry:I.carry};if(!S||!S.club||S.club.putter){el.hidden=true;return;}
  const R=tmRef(S.club),carry=I.carry,stK={punch:.75,chip:.8,pitch:.95,flop:1.15}[S.st]||1,cc=S.club.carry||carry,cs=R[1]*cc/R[2]*Math.pow(clamp(S.pw??1,.15,1.1),.6),smash=R[2]*(1-Math.min(.4,Math.max(0,S.miss)*3)),bs=cs*smash;   // club speed from how hard you swung; a mishit shows in the smash
  const expA=(S.club.apex||1)*Math.sqrt(clamp(Math.pow(clamp(S.pw??1,.15,1.1),1.4),.2,1)),launch=R[3]*Math.pow(clamp(S.apex/expA,.3,2),.7)*(1-.12*S.iy),spin=R[4]*stK*(1-.35*S.iy)*(1-Math.min(.3,S.miss*3));
  const head=angTo(I.sx,I.sy,G.ball.x,G.ball.y);let dA=head-S.aim;while(dA>Math.PI)dA-=TAU;while(dA<-Math.PI)dA+=TAU;const off=tot*Math.sin(dA);
  const c=(v,u,l)=>'<div><b>'+v+(u?'<i>'+u+'</i>':'')+'</b><span>'+l+'</span></div>';
  const sd=Math.abs(off)<.5?'0':Math.abs(off).toFixed(1)+(off>0?'R':'L');(G.tmHist=G.tmHist||[]).push({club:S.club.id||S.club.name,bs:Math.round(bs),cs:Math.round(cs),carry:Math.round(carry),tot:Math.round(tot),side:sd,spin:Math.round(spin/50)*50,launch:launch.toFixed(1)});if(G.tmHist.length>50)G.tmHist.shift();
  el.innerHTML=c(Math.round(bs),'mph','Ball speed')+c(Math.round(cs),'mph','Club speed')+c(smash.toFixed(2),'','Smash')+c(launch.toFixed(1),'\u00b0','Launch')+c(Math.round(spin/50)*50,'rpm','Spin')+c(Math.round(I.peak*3),'ft','Apex')
    +c(Math.round(carry),'yd','Carry')+c(Math.round(tot),'yd','Total')+c(Math.abs(off)<.5?'0':Math.abs(off).toFixed(1),Math.abs(off)<.5?'yd':'yd '+(off>0?'R':'L'),'Side');
  if(!$('tmM').hidden)tmOpen();}
function tmOpen(){const H=G.tmHist||[];if(!H.length){toast('NO SHOTS YET','Hit a ball first','#fff6dc');return;}
  $('tmGrid').innerHTML=$('tmPanel').innerHTML;
  $('tmRows').innerHTML='<tr><th>#</th><th>Club</th><th>Ball</th><th>Carry</th><th>Total</th><th>Side</th><th>Spin</th></tr>'+H.slice(-12).reverse().map((q,i)=>'<tr><td>'+(H.length-i)+'</td><td>'+q.club+'</td><td>'+q.bs+'</td><td>'+q.carry+'</td><td>'+q.tot+'</td><td>'+q.side+'</td><td>'+q.spin+'</td></tr>').join('');
  $('tmM').hidden=false;}
function showShotStats(){const I=G.shotInfo;G.shotInfo=null;if(!I)return;const tot=hyp(G.ball.x-I.sx,G.ball.y-I.sy),el=$('shotStats');
  if(G.hole&&G.hole.range)tmShow(I,tot);
  el.innerHTML='Carry <b>'+Math.round(I.carry)+'</b> \u00b7 Total <b>'+Math.round(tot)+'</b> \u00b7 Peak <b>'+Math.round(I.peak*3)+' ft</b>';el.hidden=false;clearTimeout(el._t);el._t=setTimeout(()=>{el.hidden=true;},3600);}
function rangeNext(){G.rangeN=(G.rangeN||0)+1;if(G.golferAt)G.rngAim=G.golferAt.aim;rangeLog();
  if(G.hole.targets&&G.hole.targets.some(t=>hyp(G.ball.x-t.x,G.ball.y-t.y)<t.r)){(G.rangeBalls=G.rangeBalls||[]).push({x:G.ball.x,y:G.ball.y});if(G.rangeBalls.length>80)G.rangeBalls.shift();}
  later(1.6,()=>{if(!G.hole||!G.hole.range||G.state!=='wait')return;
  const k={aim:G.rngAim,c:G.clubIdx,st:G.stype,sp:G.spin,tr:G.traj};G.ball={x:0,y:0};G.prev={...G.ball};G.strokes=0;G.fromLie='tee';G.trail=[];G.settle=null;prepareShot();
  if(k.aim!=null){G.aim=k.aim;G.clubIdx=k.c;G.stype=k.st||'full';G.spin=k.sp||0;G.traj=k.tr||0;G.shortP=null;setShortMax();G.puttMax=calcPuttMax();}   // the same club, shot and aim for the next ball
  });}
function rangeLog(){const h=G.hole;if(!h.targets||!h.targets.length||(G.ball.x===0&&G.ball.y===0))return;
  const t=h.targets.reduce((a,b)=>hyp(G.ball.x-b.x,G.ball.y-b.y)<hyp(G.ball.x-a.x,G.ball.y-a.y)?b:a),a=angTo(0,0,t.x,t.y),rx=G.ball.x-t.x,ry=G.ball.y-t.y;
  (G.rangeLog=G.rangeLog||[]).push({d:t.d,lo:rx*Math.sin(a)-ry*Math.cos(a),ri:rx*Math.cos(a)+ry*Math.sin(a),c:curClub().name||curClub().id,carry:G.tmLast?G.tmLast.carry:null,n:G.rangeN});}
let CHART_D=null;
function rangeChart(d){const L=G.rangeLog||[],ds=[...new Set(L.map(q=>q.d))].sort((a,b)=>a-b);const h=G.hole;if(!ds.length){toast('NO SHOTS YET','Hit a few balls first','#fff6dc');return;}
  if(d==null||!ds.includes(d))d=CHART_D!=null&&ds.includes(CHART_D)?CHART_D:L[L.length-1].d;CHART_D=d;const t=h.targets.find(q=>q.d===d)||{r:8},Q=L.filter(q=>q.d===d),last=L[L.length-1];
  $('chartTabs').innerHTML=ds.map(x=>{const tg=h.targets.find(q=>q.d===x);return '<button data-d="'+x+'"'+(x===d?' class="on"':'')+'><i style="background:'+(tg?tg.col:'#fff')+'"></i>'+x+'y</button>';}).join('');
  $('chartTabs').querySelectorAll('button').forEach(b=>b.onclick=()=>{A();rangeChart(+b.dataset.d);});
  const ext=Math.max(t.r*1.6,25,...Q.map(q=>Math.max(Math.abs(q.lo),Math.abs(q.ri))*1.15)),S=150/ext,sv=(x,y)=>[160+x*S,160-y*S];
  let g='<svg viewBox="0 0 320 320" role="img" aria-label="Where your shots at the '+d+' yard target finished"><rect width="320" height="320" rx="16" fill="#2f6b3a"/>';
  for(const rr of [10,20,30,50])if(rr<ext)g+='<circle cx="160" cy="160" r="'+(rr*S)+'" fill="none" stroke="rgba(255,255,255,.22)" stroke-dasharray="4 4"/><text x="'+(163+rr*S*.71)+'" y="'+(157-rr*S*.71)+'" fill="rgba(255,255,255,.55)" font-size="10">'+rr+'y</text>';
  g+='<ellipse cx="160" cy="160" rx="'+(t.r*S)+'" ry="'+(t.r*.8*S)+'" fill="#5fae4f" stroke="#8fd27a"/><line x1="160" y1="160" x2="160" y2="'+(160-14)+'" stroke="#fff" stroke-width="2"/><path d="M160 146 l9 3 -9 3z" fill="'+(t.col||'#ffd23c')+'"/>';
  g+='<text x="160" y="312" fill="rgba(255,255,255,.6)" font-size="11" text-anchor="middle">short</text><text x="160" y="16" fill="rgba(255,255,255,.6)" font-size="11" text-anchor="middle">long</text><text x="8" y="164" fill="rgba(255,255,255,.6)" font-size="11">left</text><text x="312" y="164" fill="rgba(255,255,255,.6)" font-size="11" text-anchor="end">right</text>';
  for(const q of Q){const[x,y]=sv(q.ri,q.lo),me=q===last;g+='<circle cx="'+x+'" cy="'+y+'" r="'+(me?6:4.5)+'" fill="'+(me?'#ffd23c':'#fff')+'" stroke="#12283b" stroke-width="1.5"/>';}
  g+='</svg>';$('chartPlot').innerHTML=g;
  const dist=Q.map(q=>hyp(q.lo,q.ri)),av=dist.reduce((a,b)=>a+b,0)/dist.length,best=Math.min(...dist),on=Q.filter(q=>hyp(q.ri,q.lo*1.25)<t.r).length,cs=Q.filter(q=>q.carry!=null),ac=cs.length?cs.reduce((a,b)=>a+b.carry,0)/cs.length:null;
  const st=(v,l)=>'<div><b>'+v+'</b><span>'+l+'</span></div>';
  $('chartStats').innerHTML=st(Q.length,'Shots')+st(av<10?Math.round(av*3)+' ft':av.toFixed(1)+' yd','Avg to pin')+st(best<10?Math.round(best*3)+' ft':best.toFixed(1)+' yd','Closest')+st(on+'/'+Q.length,'On green')+st(ac==null?'\u2013':Math.round(ac)+' yd','Avg carry');
  $('chartM').hidden=false;}
function rangeGoTo(){A();if(!rangeOf(CUR))return;const to=RANGE_AT[CUR.id];if(to){if(courseGate(to,rangeGoTo))return;G.rangeHome={id:CUR.id,tee:TEE};setCourse(to,false,0);}startHole(TB.length);}   // the round or Daily keeps its mode, scores and pins; nothing on the range is saved
function rangeHomeBack(){const h=G.rangeHome;if(!h)return false;G.rangeHome=null;setCourse(h.id,false,h.tee);return true;}
function rangeLeave(){A();if(!G.hole||!G.hole.range)return;rangeHomeBack();startHole(0);}
function stopBall(){
  {const r0=G.roll;if(r0){const v=hyp(r0.vx,r0.vy);G.settle={t:0,dx:v>1e-6?r0.vx/v:0,dy:v>1e-6?r0.vy/v:0};}}   // a last little rock before it sits still
  showShotStats();
  endRec(false);G.roll=null;G.hop=null;G.state='wait';G.trail=[];
  if(G.hole.range){rangeNext();return;}
  const p=G.hole.pin;if(hyp(G.ball.x-p[0],G.ball.y-p[1])<CUP){holed();return;}
  // gimme: a ball at rest on the green within 4 ft of the cup is conceded, one more stroke (everyone, rivals too)
  if(lieAt(G.ball.x,G.ball.y)==='green'&&hyp(G.ball.x-p[0],G.ball.y-p[1])<=GIMME_YD){G.strokes++;later(.7,()=>{if(G.state==='wait')holed('Gimme');});return;}
  if(!MATCH.on&&G.mode!=='practice')saveGame({mid:true});
  const L=lieAt(G.ball.x,G.ball.y);
  if(L==='green'&&G.fromLie!=='green'){const reg=G.strokes<=G.hole.par-2;toast(reg?'NICE ON!':'ON THE GREEN',Math.round(pinDist()*3)+' ft to the cup','#8ee6a8');}
  else if(L==='sand'&&G.fromLie!=='sand')toast('BUNKER','','#f0e0ab');
  else if(L==='fescue'&&G.fromLie!=='fescue')toast(CUR.scen==='desert'?'IN THE DESERT':'IN THE FESCUE','Tough lie','#e3cf7e');
    later(R3.on?r3PostCutTime(1.1):1.1,afterShot);shortPrep();
}
// the 3D golfer's reaction to a shot (nod, shake, slump, samba): returns how long it holds the screen, 0 when it doesn't play
// water / OB: a full-swing shot can get the bad-shot clip (it starts from his finish)
const penReact=()=>{const r=Math.random();return G.swingType!=='putt'&&r<.4?'badshot':r<.7?'rejected':'slump';};
const react=(k,delay)=>typeof r3React==='function'?r3React(k,delay):0;
function penalty(kind,soft){
  if(G.hole&&G.hole.range){endRec(false);G.flight=null;G.roll=null;G.hop=null;G.state='wait';G.trail=[];if(kind==='water'){sfx.splash();toast('SPLASH!','','#6cc8ff');}else{sfx.miss();toast('OFF THE RANGE','','#ff6a48');}rangeNext();return;}
  endRec(false);G.flight=null;G.roll=null;G.hop=null;G.state='wait';G.trail=[];G.strokes++;
  if(kind==='water'){G.fx.push({x:G.ball.x,y:G.ball.y,t:0,type:'splash'});if(soft)sfx.plop(true);else{sfx.splash();sfx.plop(false);}splashDrops(G.ball.x,G.ball.y,soft);toast('SPLASH!','Penalty area \u00b7 +1 stroke','#6cc8ff');
    const opts=reliefOpts(waterCross());later(Math.max(1.5,react(penReact(),1.1)),()=>reliefAsk(opts));return;}
  sfx.miss();toast('OUT OF BOUNDS','+1 stroke \u00b7 replay from last spot','#ff6a48');   // stroke and distance (Rule 18.2)
  later(Math.max(1.6,react(penReact(),.8)),()=>{G.ball={...G.prev};afterShot();});
}
/* water is a red penalty area (Rule 17): one stroke, then the golfer picks the relief.
   The reference point is where the ball last crossed into the water (its path traced back from where it went in). */
const flagPulled=()=>!!G.flagOut&&G.fromLie!==undefined&&(aimingState()||G.state==='roll'||G.state==='holed'||G.state==='wait')&&(G.lie==='green'||G.fromLie==='green');
const isWet=(x,y)=>{const L=lieAt(x,y);return L==='water';};
function waterCross(){const R=(G.lastShot&&G.lastShot.rec)||[],pts=[[G.prev.x,G.prev.y],...R.map(r=>[r.x,r.y]),[G.ball.x,G.ball.y]];
  for(let i=pts.length-1;i>0;i--){const a=pts[i-1],b=pts[i];if(!isWet(a[0],a[1])&&isWet(b[0],b[1])){let lo=a,hi=b;
      for(let k=0;k<16;k++){const m=[(lo[0]+hi[0])/2,(lo[1]+hi[1])/2];if(isWet(m[0],m[1]))hi=m;else lo=m;}return lo;}}
  return[G.prev.x,G.prev.y];}
const RELIEF_LIE={fairway:0,tee:0,cut:.3,green:.4,rough:1,fescue:2.5,sand:3};
// lateral relief: within two club-lengths of that point, no nearer the hole, out of the water
function dropLateral(C){const p=G.hole.pin,dC=hyp(C[0]-p[0],C[1]-p[1]);let best=null;
  for(let r=.4;r<=2.5;r+=.3)for(let k=0;k<24;k++){const a=k/24*TAU,x=C[0]+Math.cos(a)*r,y=C[1]+Math.sin(a)*r,L=lieAt(x,y);
    if(L==='water'||L==='ob'||hyp(x-p[0],y-p[1])<dC-.01)continue;const sc=(RELIEF_LIE[L]??2)+r*.12;if(!best||sc<best.sc)best={sc,x,y,L};}
  return best;}
// back-on-the-line relief: keep that point between the hole and the drop, going back as far as it takes to be clear of the water
function dropBack(C){const p=G.hole.pin;let ux=C[0]-p[0],uy=C[1]-p[1];const l=hyp(ux,uy)||1;ux/=l;uy/=l;
  for(let t=1;t<400;t+=.5){const x=C[0]+ux*t,y=C[1]+uy*t,L=lieAt(x,y);if(L==='ob')return null;if(L==='water')continue;
    const L2=lieAt(x+ux,y+uy);if(L2==='water')continue;if(L2==='ob')return null;return{x:x+ux,y:y+uy,L:L2};}return null;}
/* Oct 28 2026 (Cam): the golfer picks the spot. Lateral: anywhere within two club-lengths (REL_R) of where it crossed, out of the
   water and no nearer the hole (tap the map). Back on the line: as far back along the pin-to-crossing line as you like (slider),
   wherever it's dry and in bounds. The rivals still take the best spot automatically. */
const REL_R=2.5;
function lineSpots(C){const p=G.hole.pin;let ux=C[0]-p[0],uy=C[1]-p[1];const l=hyp(ux,uy)||1;ux/=l;uy/=l;const ts=[];
  for(let t=.5;t<=320;t+=.5){const x=C[0]+ux*t,y=C[1]+uy*t,L=lieAt(x,y);if(L==='ob')break;if(L!=='water'&&lieAt(x+ux*.4,y+uy*.4)!=='water'&&lieAt(x-ux*.4,y-uy*.4)!=='water')ts.push(t);}
  return{u:[ux,uy],ts};}
function reliefOpts(C){const o=[],p=G.hole.pin;
  const lat=dropLateral(C);if(lat)o.push({k:'lat',pick:1,C,name:'Lateral drop',sub:'Pick a spot within two club-lengths of where it crossed, no nearer the hole',x:lat.x,y:lat.y,L:lat.L});
  const bk=dropBack(C);if(bk){const ls=lineSpots(C);o.push({k:'line',pick:1,C,ls,name:'Back on the line',sub:'Go back as far as you like, keeping where it crossed between you and the pin',x:bk.x,y:bk.y,L:bk.L});}
  o.push({k:'replay',name:'Replay from last spot',sub:'Stroke and distance',x:G.prev.x,y:G.prev.y,L:lieAt(G.prev.x,G.prev.y)});
  for(const q of o)q.d=hyp(q.x-p[0],q.y-p[1]);return o;}
// the rivals (and fast-forwarded turns) take the option that leaves the easiest next shot
function reliefBest(o){let b=o[0],bs=1e9;for(const q of o){const s=q.d+(RELIEF_LIE[q.L]??2)*6;if(s<bs){bs=s;b=q;}}return b;}
function reliefApply(q){$('reliefM').hidden=true;G.ball={x:q.x,y:q.y};toast(q.k==='replay'?'REPLAY':'DROP',q.name+' \u00b7 '+Math.round(q.d)+' yds','#8ee6a8');afterShot();}
function reliefAsk(o){if(G.aiTurn||G.aiSkip||o.length===1){reliefApply(reliefBest(o));return;}
  const best=reliefBest(o),el=$('reliefOpts');el.innerHTML='';
  for(const q of o){const b=document.createElement('button');b.className='relopt'+(q===best?' best':'');
    b.innerHTML='<b>'+q.name+'</b><span>'+Math.round(q.d)+' yds to the pin \u00b7 '+(lieNm(q.L)||q.L)+' \u00b7 '+q.sub+'</span>';
    b.onclick=()=>{A();if(q.pick)dropStart(q,o);else reliefApply(q);};el.appendChild(b);}
  $('reliefM').hidden=false;}
/* the drop is placed on the course itself (Cam): the camera looks down on the area from behind it (pin straight ahead), the
   relief area is drawn on the ground (lateral: the two-club-length circle, its half nearer the hole shaded out; back on the line:
   the dashed line back from where it crossed) and the ball is dragged into place; Drop here / Other options at the bottom */
function relValidLat(q,x,y){const p=G.hole.pin,C=q.C,L=lieAt(x,y);return hyp(x-C[0],y-C[1])<=REL_R+1e-6&&L!=='water'&&L!=='ob'&&hyp(x-p[0],y-p[1])>=hyp(C[0]-p[0],C[1]-p[1])-.01;}
function dropSet(x,y){const D=G.drop,p=G.hole.pin;D.x=x;D.y=y;D.L=lieAt(x,y);G.ball={x,y};
  $('dropInfo').textContent=Math.round(hyp(x-p[0],y-p[1]))+' yds to the pin · '+(lieNm(D.L)||D.L);}
function dropFrame(){const D=G.drop;D.cx=D.q.k==='lat'?D.q.C[0]:D.x;D.cy=D.q.k==='lat'?D.q.C[1]:D.y;}
function dropStart(q,opts){$('reliefM').hidden=true;G.drop={q,opts,x:q.x,y:q.y,L:q.L,cx:0,cy:0};dropSet(q.x,q.y);dropFrame();
  $('dropHelp').textContent=q.k==='lat'?'Drag the ball anywhere in the circle (not the shaded half, nearer the hole)':'Drag the ball back along the line, as far as you like';$('dropBar').hidden=false;$('game').classList.add('dropping');}
function dropEnd(){G.drop=null;$('dropBar').hidden=true;$('game').classList.remove('dropping');}
function dropCam(){const D=G.drop,p=G.hole.pin;let ux=p[0]-D.cx,uy=p[1]-D.cy;const l=hyp(ux,uy)||1;ux/=l;uy/=l;const g=hAt(D.cx,D.cy),lat=D.q.k==='lat';
  const back=lat?4.2:16,up=lat?6.8:15;return{E:[D.cx-ux*back,g+up,D.cy-uy*back],L:[D.cx+ux*(lat?.8:5),g,D.cy+uy*(lat?.8:5)]};}
function dropPick(px,py){const D=G.drop,q=D.q;let best=null;const tryP=(x,y)=>{const s=proj(x,hAt(x,y)+.05,y);if(!s)return;const d=hyp(s[0]-px,s[1]-py);if(!best||d<best.d)best={d,x,y};};
  if(q.k==='lat'){for(let a=-REL_R;a<=REL_R;a+=.1)for(let b=-REL_R;b<=REL_R;b+=.1){const x=q.C[0]+a,y=q.C[1]+b;if(relValidLat(q,x,y))tryP(x,y);}}
  else for(const t of q.ls.ts)tryP(q.C[0]+q.ls.u[0]*t,q.C[1]+q.ls.u[1]*t);
  if(best)dropSet(best.x,best.y);}
function dropDraw(){const D=G.drop,q=D.q,C=q.C,p=G.hole.pin;sctx.setTransform(dpr,0,0,dpr,0,0);SCX.drew=true;
  const P=(x,y)=>proj(x,hAt(x,y)+.03,y),path=pts=>{let on=false;sctx.beginPath();for(const s of pts){if(!s){on=false;continue;}if(on)sctx.lineTo(s[0],s[1]);else{sctx.moveTo(s[0],s[1]);on=true;}}};
  let ux=p[0]-C[0],uy=p[1]-C[1];const l=hyp(ux,uy)||1;ux/=l;uy/=l;
  if(q.k==='lat'){const ring=[],half=[];for(let k=0;k<=72;k++){const a=k/72*TAU;ring.push(P(C[0]+Math.cos(a)*REL_R,C[1]+Math.sin(a)*REL_R));}
    // the half nearer the hole (toward the pin), shaded
    for(let k=0;k<=36;k++){const a=Math.atan2(uy,ux)-Math.PI/2+k/36*Math.PI;half.push(P(C[0]+Math.cos(a)*REL_R,C[1]+Math.sin(a)*REL_R));}
    sctx.fillStyle='rgba(255,246,220,.16)';path(ring);sctx.fill();sctx.fillStyle='rgba(15,34,51,.38)';path(half);sctx.closePath();sctx.fill();
    sctx.strokeStyle='#fff6dc';sctx.lineWidth=3;path(ring);sctx.stroke();}
  else{const T=q.ls.ts,tc=hyp(D.x-C[0],D.y-C[1]),pts=[];for(let t=0;t<=Math.min(T[T.length-1],tc+40);t+=1)pts.push(P(C[0]-ux*t,C[1]-uy*t));
    sctx.setLineDash([10,8]);sctx.strokeStyle='#fff6dc';sctx.lineWidth=3;path(pts);sctx.stroke();sctx.setLineDash([]);}
  const c=P(C[0],C[1]);if(c){sctx.strokeStyle='#ff6a48';sctx.lineWidth=4;sctx.beginPath();sctx.moveTo(c[0]-9,c[1]-9);sctx.lineTo(c[0]+9,c[1]+9);sctx.moveTo(c[0]+9,c[1]-9);sctx.lineTo(c[0]-9,c[1]+9);sctx.stroke();}
  const m=P(D.x,D.y);if(m){sctx.strokeStyle='#ffc93c';sctx.lineWidth=3;sctx.beginPath();sctx.arc(m[0],m[1],Math.max(14,m[3]*.35),0,TAU);sctx.stroke();}}
{let dragging=false;const pt=e=>{const r=cv.getBoundingClientRect();return[e.clientX-r.left,e.clientY-r.top];};
  cv.addEventListener('pointerdown',e=>{if(!G.drop)return;e.stopImmediatePropagation();e.preventDefault();dragging=true;const[x,y]=pt(e);dropPick(x,y);},true);
  cv.addEventListener('pointermove',e=>{if(!G.drop||!dragging)return;e.stopImmediatePropagation();const[x,y]=pt(e);dropPick(x,y);},true);
  const up=e=>{if(!G.drop)return;e.stopImmediatePropagation();if(dragging){dragging=false;dropFrame();}};cv.addEventListener('pointerup',up,true);cv.addEventListener('pointercancel',up,true);}
$('dropGo').addEventListener('click',()=>{A();const D=G.drop;if(!D)return;const q=D.q,p=G.hole.pin,x=D.x,y=D.y,L=D.L;dropEnd();reliefApply({...q,x,y,L,d:hyp(x-p[0],y-p[1])});});
$('dropOther').addEventListener('click',()=>{A();const D=G.drop;if(!D)return;dropEnd();reliefAsk(D.opts);});
const GIMME_YD=4/3;   // 4 ft
/* Oct 28 2026 (Cam: "even when the distance isn't matched exactly it still goes to the cup"): the cup is its real size (2.125 in
   radius; it was 2.45) and only a ball that would have stopped within CAP_YD past the hole drops when it hits the centre (it was
   2.1 yd, 6.3 ft); one catching the edge has to be slower still (20% of that at the very edge, was 35%) */
function capV(cb){return CAPV*(.2+.8*Math.sqrt(Math.max(0,1-(cb/CUP)**2)))*(G.flagOut?1:1.35);}
function holed(kind){if(G.hole&&G.hole.range){const p=G.hole.pin;G.ball={x:p[0],y:p[1]};endRec(false);G.roll=null;G.flight=null;G.hop=null;G.state='wait';G.trail=[];G.inCup=true;try{sfx.cup(false);}catch(e){}toast('IN THE HOLE!','Shame it was the range','#ffc93c');showShotStats();rangeNext();return;}   // the range: no card, the next ball comes
  const gim=kind==='Gimme';
  const p=G.hole.pin;G.ball={x:p[0],y:p[1]};endRec(true);G.roll=null;G.flight=null;G.hop=null;G.inCup=true;G.state='holed';G.trail=[];
  if(!MATCH.on){G.scores[G.hi]=G.strokes;if(G.mode!=='practice'&&G.hi<TB.length-1)saveGame({hi:G.hi+1,strokes:0,mid:false,ball:{x:0,y:0},prev:{x:0,y:0}});}
  const name=scoreName(G.strokes,G.hole.par);
  let sub=kind||'';
  if(!sub&&G.fromLie!=='green'&&G.strokes>1)sub='Chip-in';
  if(!sub&&G.fromLie==='green'){const d=hyp(G.prev.x-p[0],G.prev.y-p[1])*3;if(d>20)sub=Math.round(d)+' ft putt';}
  const good=G.strokes<G.hole.par;
  if(!gim)sfx.cup(!!G.cupHard);G.cupHard=false;if(good&&!G.aiTurn)setTimeout(sfx.fanfare,250);
  toast(name,sub,good?'#ffc93c':G.strokes===G.hole.par?'#8ee6a8':'#fff6dc');
  const highlight=!gim&&(G.strokes===1||G.fromLie!=='green'||(G.fromLie==='green'&&hyp(G.prev.x-p[0],G.prev.y-p[1])*3>25));
  const nx=MATCH.on?mHoled:showCard;
  if(MATCH.on&&!G.aiTurn&&!gim){if(G.fromLie!=='green'&&G.strokes>1)MATCH.earn.chip++;else if(G.fromLie==='green'&&hyp(G.prev.x-p[0],G.prev.y-p[1])*3>25)MATCH.earn.putt++;}
  // celebrations and groans: the bigger the moment, the bigger the dance
  const pick=a=>a[Math.floor(Math.random()*a.length)],dpar=G.strokes-G.hole.par,chipIn=sub==='Chip-in',longPutt=/ft putt/.test(sub);
  const rk=G.strokes===1||dpar<=-3?'freeze':dpar===-2?pick(['robot','samba']):chipIn&&dpar<=-1?'break90':G.fromLie==='green'&&dpar===-1&&!gim?(hyp(G.prev.x-p[0],G.prev.y-p[1])*3>12?'puttwin':'puttwin2'):(chipIn||longPutt)?'uprock':dpar===-1?'runman':dpar>=2?pick(['rejected','angry']):'';
  const rx=G.aiTurn?0:react(rk,.9);
  // let the celebration play out (it runs on the render clock): hold the replay / card until it is done, 3 s at most
  const t0r=performance.now(),afterR=fn=>()=>{const go=()=>typeof r3ReactBusy==='function'&&r3ReactBusy()&&performance.now()-t0r<(rx+3)*1000?later(.1,go):fn();go();};
  if(highlight&&G.canReplay&&!G.aiTurn)later(Math.max(1.6,rx),afterR(()=>startReplay(()=>later(.5,nx))));else later(Math.max(MATCH.on?1.9:2.3,rx),afterR(nx));
}
function pickUp(){if(MATCH.on){G.state='holed';toast('PICKED UP','10-stroke limit','#fff6dc');mPickUp();return;}G.scores[G.hi]=10;G.state='holed';toast('PICKED UP','10-stroke limit','#fff6dc');later(1.6,showCard);}

function scClass(s,par){if(!s)return'';const d=s-par;if(d<=-2)return'eagle';if(d===-1)return'birdie';if(d===1)return'bogey';if(d>=2)return'dbl';return'';}
function nineTable(from,label,withTot){
  let tot=0,ptot=0;
  const idx=[...Array(9)].map((_,k)=>from+k);
  const head='<thead><tr><th>Hole</th>'+idx.map(i=>'<th>'+(i+1)+'</th>').join('')+'<th class="tot">'+label+'</th>'+(withTot?'<th class="tot">Tot</th>':'')+'</tr></thead>';
  const par='<tr><td>Par</td>'+idx.map(i=>{ptot+=TB[i].par;return'<td>'+TB[i].par+'</td>';}).join('')+'<td class="tot">'+ptot+'</td>'+(withTot?'<td class="tot">'+TOTAL_PAR+'</td>':'')+'</tr>';
  const you='<tr><td>You</td>'+idx.map(i=>{const s=G.scores[i];if(s)tot+=s;return'<td>'+(s?'<span class="sc '+scClass(s,TB[i].par)+'">'+s+'</span>':'')+'</td>';}).join('')+'<td class="tot">'+(tot||'')+'</td>'+(withTot?'<td class="tot">'+(G.scores.reduce((a,b)=>a+(b||0),0)||'')+'</td>':'')+'</tr>';
  return head+'<tbody>'+par+you+'</tbody>';
}
function showCard(){
  G.state='card';$('cardPostV').hidden=true;
  const last=G.hi===TB.length-1,prac=G.mode==='practice';
  for(const el of document.querySelectorAll('#cardM .scwrap,#cardM .legend'))el.hidden=prac;
  $('cardPick').hidden=!prac;
  if(prac){const s=G.scores[G.hi];$('cEyebrow').textContent='Practice \u00b7 Hole '+(G.hi+1)+' \u00b7 '+s+(s===1?' stroke':' strokes');
    const n=scoreName(s,TB[G.hi].par).replace('!','');$('cTitle').textContent=n.charAt(0)+n.slice(1).toLowerCase();
    $('cNote').hidden=false;$('cNote').textContent='Par '+TB[G.hi].par+'. Play it again, pick another hole, or head back to the menu.';
    $('nextBtn').textContent='Play again';$('cardM').hidden=false;setTimeout(()=>$('nextBtn').focus({preventScroll:true}),50);return;}
  if(last){if(G.mode==='daily')dailyFinish();else clearSave();}else saveGame({hi:G.hi+1,strokes:0,mid:false,ball:{x:0,y:0},prev:{x:0,y:0}});
  $('sc').innerHTML=nineTable(0,'Out',false);$('sc2').innerHTML=nineTable(9,'In',true);
  const tot=G.scores.reduce((a,b)=>a+(b||0),0);
  const s=G.scores[G.hi],d=roundDiff(),note=$('cNote');
  if(last&&G.mode==='daily'){$('cEyebrow').textContent='Daily round complete \u00b7 '+CUR.name;$('cTitle').textContent=tot+' ('+fmtDiff(d)+')';
    note.hidden=false;note.textContent=DAILY.url?'Posting your score to today’s leaderboard…':'Score saved. The online leaderboard switches on soon.';$('nextBtn').textContent='Leaderboard';}
  else if(last){
    let best=null;try{best=parseInt(localStorage.getItem('troyburne-best-18')||'',10);}catch(e){}
    const isBest=!TEE&&(!best||tot<best);   // personal best: from the back tees only
    if(isBest){try{localStorage.setItem('troyburne-best-18',String(tot));}catch(e){}}
    $('cEyebrow').textContent='Round complete';
    $('cTitle').textContent=tot+' ('+fmtDiff(d)+')';
    note.hidden=false;note.textContent=TEE?'Played from the '+teeName()+'. Course records and personal bests count from the '+teeName(0)+' only.':isBest?(best?'New personal best — beat your old '+best+'.':'First round in the books. Go again and beat it.'):'Personal best on this device: '+best+'.';
    $('nextBtn').textContent='Play again';
    if(recCanPost())recOffer(tot,d);
  }else{
    $('cEyebrow').textContent='Hole '+(G.hi+1)+' · '+s+(s===1?' stroke':' strokes');
    const n=scoreName(s,TB[G.hi].par).replace('!','');
    $('cTitle').textContent=n.charAt(0)+n.slice(1).toLowerCase();
    note.hidden=false;note.textContent='Round so far: '+fmtDiff(d)+' through '+(G.hi+1)+'.'+(G.hi===8?' That’s the front nine — on to the back.':'');
    $('nextBtn').textContent='Next hole';
  }
  $('cardM').hidden=false;setTimeout(()=>$('nextBtn').focus({preventScroll:true}),50);
}
function nextFromCard(){if(MATCH.on){matchNext();return;}if(G.mode==='daily'&&G.hi===TB.length-1){$('cardM').hidden=true;openDailyBoard(true);return;}if(G.mode==='practice'){G.scores=[];G.psLeft=3;startHole(B10T&&b10On()?(G.hi+1)%TB.length:G.hi);return;}/* walk-through link: hole by hole */if(G.hi===TB.length-1){G.scores=[];G.pinSeed=0;G.rShots=[];G.psLeft=3;if(R3.on)r3NewWx();startHole(0);}else startHole(G.hi+1);}   /* Play again is a fresh round: new pins, power shots back, its own replay */
