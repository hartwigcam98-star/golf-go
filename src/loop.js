/* ---------- loop ---------- */
const keys={};let holdL=0,holdR=0;
// fast-forward: while the ball is moving (or a replay runs) the whole simulation can run 2x or 4x
function ffActive(){return G.state==='replay'||((G.state==='flight'||G.state==='bounce'||G.state==='roll')&&G.followT>=(G.launchAt||0));}
function cycleFF(){if(!ffActive())return;G.ff=G.ff===1?2:G.ff===2?4:1;if(G.hole&&G.hole.range)G.rangeFF=G.ff;sfx.tick();}   // the range keeps its speed for the next balls (4x to start)
function update(dt){
  T+=dt;
  if(G.aiTurn){aiStep(dt);if(G.aiSkip&&ffActive()&&G.ff<8)G.ff=8;}
  if(G.fc&&(G.state!=='aim'||G.aiTurn||G.overview))G.fc=null;
  if(G.fc&&G.fc.fly){const F=G.fc.fly;F.t+=F.dir*dt/F.dur;if(F.dir>0&&F.t>=1){G.fc.from0=F.from;G.fc.fly=null;}else if(F.dir<0&&F.t<=0){G.fc=null;}}
  if(G.fc){const f=G.fc;if(f.follow&&f.lvl!=null)f.distT=scoutLevels()[f.lvl];   // club changes re-frame the view
    if(f.distT)f.dist+=(f.distT-f.dist)*(1-Math.exp(-dt*6));}
  if(G.fc&&G.fc.follow&&G.landPt){const f=G.fc,k=f.fly?1:1-Math.exp(-dt*7);let dy=G.aim+(f.yawOff||0)-f.yaw;while(dy>Math.PI)dy-=TAU;while(dy<-Math.PI)dy+=TAU;
    f.tx+=(G.landPt[0]-f.tx)*k;f.tz+=(G.landPt[1]-f.tz)*k;f.yaw+=dy*k;}
  if(G.state==='aim'&&!G.overview&&!G.aiTurn){
    const L=keys.ArrowLeft||btnHold.L,R=keys.ArrowRight||btnHold.R;
    if(L||R){const D=Math.max(previewDist(),3);const hold=L?(holdL+=dt):(holdR+=dt);const rate=Math.max(.6,D*.04)/D*(1+hold*2.5);G.aim+=(R?1:-1)*rate*dt;}
    if(!L)holdL=0;if(!R)holdR=0;
  }
  const m=G.meter,putt=curClub().putter;
  const mdt=dt;
  if(G.state==='power'){const p0=m.pos;m.pos+=(m.dir||1)*mdt*meterSpeed();
    if(m.pos>=1){m.pos=1;m.dir=-1;}
    else if(m.dir<0&&m.pos<=IMPACT){m.pos=IMPACT;m.dir=1;G.state='aim';toast('NO POWER SET','Tap once more during the backswing','#fff6dc');sfx.miss();}}
  else if(G.state==='acc'){const p0=m.pos;m.pos-=mdt*meterSpeed();if(m.pos<=0){m.pos=0;
    /* Oct 2026: the player's last chance was the frame the meter hit the bottom. A tap a few ms before that moment can reach the
       page just after the frame (touches arrive a little behind the screen, more so in a slow frame) and was dropped as a mishit.
       Now the meter waits at the bottom ~60 ms before calling it a mishit, and a tap whose own time is before the bottom counts. */
    if(G.aiTurn||!(MCLK.t>0))executeShot(m.power,null);
    else if(m.endT==null)m.endT=MCLK.t+1000*p0/meterSpeed();
    else if(performance.now()-m.endT>60){m.endT=null;executeShot(m.power,null);}}}
  if(G.followT>0)G.followT+=dt;
  const launched=!(G.followT>0&&G.followT<(G.launchAt||0));
  if(G.divotQ&&launched){spawnDivot(G.divotQ);G.divotQ=null;}stepDivots(dt);
  if(G.teeQ&&launched){spawnTee(G.teeQ);G.teeQ=null;}
  if(G.birdQ&&launched){const q=G.birdQ;G.birdQ=null;if(Math.random()<.4)birdsNear(q.p,q.T);}
  stepParts(dt);if(G.settle){G.settle.t+=dt;if(G.settle.t>.7)G.settle=null;}
  if(launched&&G.state==='flight'&&G.flight)stepFlight(dt);
  if(launched&&G.recOn&&(G.state==='flight'||G.state==='bounce'||G.state==='roll')){G.recT+=dt;const air=G.state!=='roll';G.rec.push({t:G.recT,x:G.ball.x,y:G.ball.y,Y:air?G.bY:hAt(G.ball.x,G.ball.y)});}
  if(G.state==='replay')stepReplay(dt);
  if(launched&&G.state==='bounce'&&G.hop)stepHop(dt);
  if(launched&&G.state==='roll'&&G.roll)stepRoll(dt);
  if(G.waitFn){G.waitT-=dt;if(G.waitT<=0){const f=G.waitFn;G.waitFn=null;f();}}
  for(const f of G.fx)f.t+=dt/(f.type==='splash'?1.9:.6);G.fx=G.fx.filter(f=>f.t<1);
  stepCam(dt);if(!G.hudSkip)updHud();
}
let last=performance.now();
/* the swing meter runs on the real clock (Oct 2026): t is the frame time the cursor was last placed at. A press is judged where the
   cursor was at the moment of the press (the event's own timestamp, same clock as the frame), not at the last frame drawn, so a
   late frame or the 30 fps lock can't move a well-timed press out of the sweet spot. (It used to run on an 8-frame average, which
   after a late frame ran the cursor up to a third fast for a few frames while it caught up.) */
var MCLK={t:0,w:0};
/* Oct 2026: the power fill used to be resized (its width) every frame, which makes Safari lay the page out again mid-swing.
   It's now a full-length frame with the rounded end, slid so the end sits at the fill's edge, holding the gradient slid back and
   stretched to the same length: it looks the same as the width-sized bar and only moves with transforms. Under 11 px (the
   rounded end's size) the plain bar is used, as its corners shrink there. */
function meterFill(to){const mw=MCLK.w;if(!mw)return;const full=(1-IMPACT)*mw,w=Math.max(0,(to-IMPACT)*mw),F=MCLK.f||(MCLK.f={});
  const small=w<11;if(F.small!==small){F.small=small;$('mRun').hidden=small;$('mFill').style.visibility=small?'':'hidden';}
  if(small){const v=w.toFixed(2)+'px';if(F.v!==v){F.v=v;$('mFill').style.width=v;}return;}
  if(F.full!==full){F.full=full;$('mRun').style.width=full.toFixed(2)+'px';}
  const a='translate3d('+(w-full).toFixed(2)+'px,0,0)',b='translate3d('+(full-w).toFixed(2)+'px,0,0) scaleX('+(w/full).toFixed(5)+')';
  if(F.a!==a){F.a=a;$('mRun').style.transform=a;}if(F.b!==b){F.b=b;$('mRunIn').style.transform=b;}}
function meterSpeed(){const putt=curClub().putter;return G.state==='power'?(putt?.7:isShort()?.85:1.0):(putt?.6:isShort()?.8:.95*(G.pshot?1.2:1));}
function meterAt(at){const m=G.meter;if(!(at>0)||!(MCLK.t>0))return;const d=clamp((at-MCLK.t)/1000,-.034,.05);if(!d)return;   // at most two frames either side: anything else is a bad timestamp
  if(G.state==='power')m.pos=clamp(m.pos+(m.dir||1)*d*meterSpeed(),IMPACT,1);else if(G.state==='acc')m.pos=clamp(m.pos-d*meterSpeed(),0,1);}
/* smoothness stats: frame times per hole (all play, and while the swing meter runs), sent quietly to the perf_stats table
   when the hole changes or the app goes to the background. Nothing is shown in the game. */
var PSTAT={all:[],met:[],js:[],dc:[],hole:null};
function ldFrame(){const p=LDT.p;if(!p||++p.n<2)return;LDT.p=null;if(document.hidden)return;const t=performance.now();
  if(p.k==='boot'&&LDT.boot){LDT.boot.ff=Math.round(t);if(LDT.hole&&LDT.hole.ff==null)LDT.hole.ff=Math.round(t-p.t0);}else if(p.k==='hole'&&LDT.hole)LDT.hole.ff=Math.round(t-p.t0);}
function pstatAdd(raw){if(!PSTAT||document.hidden||G.paused||!G.hole||(typeof REC!=='undefined'&&REC.on)||(typeof SPEC!=='undefined'&&SPEC.on))return;
  const st=G.state;if(st==='intro'||st==='card')return;const ms=raw*1000;if(!(ms>0&&ms<1000))return;
  if(PSTAT.all.length<30000)PSTAT.all.push(ms);if((st==='power'||st==='acc')&&!G.aiTurn&&PSTAT.met.length<10000)PSTAT.met.push(ms);
  if(!PSTAT.hole){PSTAT.hole={course:CUR.id,hole:G.hi+1,mode:G.mode};PSTAT.t0=performance.now();}}
function ldTake(){const o={};if(LDT.boot&&LDT.boot.ff!=null){o.b=LDT.boot;LDT.boot=null;}if(LDT.hole&&LDT.hole.ff!=null&&!LDT.p){o.h=LDT.hole;LDT.hole=null;}return o.b||o.h?o:undefined;}
function pstatSum(a){if(!a.length)return null;const s=a.slice().sort((x,y)=>x-y),n=s.length,sum=s.reduce((x,y)=>x+y,0);
  return{n,avg:1000/(sum/n),med:1000/s[n>>1],p95:s[Math.min(n-1,Math.floor(n*.95))],max:s[n-1],st:100*s.filter(v=>v>40).length/n};}
function pstatFlush(keep){if(typeof PSTAT==='undefined'||!PSTAT||!PSTAT.all.length){if(PSTAT)PSTAT.hole=null;return;}
  const A=pstatSum(PSTAT.all),M=pstatSum(PSTAT.met),h=PSTAT.hole,js=PSTAT.js.sort((x,y)=>x-y),dc=PSTAT.dc.sort((x,y)=>x-y);const hxl=PSTAT.hx||[],hxn=[HTR.n50,HTR.n100];HTR.n50=HTR.n100=0;PSTAT.t0=0;PSTAT.all=[];PSTAT.met=[];PSTAT.js=[];PSTAT.dc=[];PSTAT.hx=[];PSTAT.hole=null;
  if(!A||A.n<60||!h||!DAILY.url)return;const r1=v=>v==null?null:Math.round(v*10)/10;
  const body={player_id:dailyPid(),name:(dailyName()||'').slice(0,16),ver:String(window.GOLF_VER||'').slice(0,40),course:String(h.course).slice(0,24),hole:h.hole,mode:String(h.mode).slice(0,16),
    gfx:String((typeof R3!=='undefined'&&R3.q)||'').slice(0,8),perf:(typeof R3!=='undefined'&&R3.perf)||0,
    device:{ua:navigator.userAgent.slice(0,200),scr:screen.width+'x'+screen.height,dpr:window.devicePixelRatio||1,vw:innerWidth+'x'+innerHeight,app:!!(navigator.standalone||(window.matchMedia&&matchMedia('(display-mode: standalone)').matches))},
    frames:A.n,fps_avg:r1(A.avg),fps_med:r1(A.med),ms_p95:r1(A.p95),ms_max:r1(A.max),stutter_pct:r1(A.st),
    meter_frames:M?M.n:0,meter_fps_avg:M&&r1(M.avg),meter_fps_med:M&&r1(M.med),meter_ms_p95:M&&r1(M.p95),meter_ms_max:M&&r1(M.max),meter_stutter_pct:M&&r1(M.st),extra:{cap30:!!PERF.cap,ho:PERF.heavyOff||0,dyn:+(R3.dyn||1).toFixed(2),lvl:R3.perf||0,dq:PERF.dT&&PERF.dT.some(v=>v)?[...PERF.dT,PERF.midNeed||4]:undefined,shc:R3.shc?R3.shc.n:null,trees:R3T.kept||null,js_med:js.length?r1(js[js.length>>1]):null,js_p95:js.length?r1(js[Math.floor(js.length*.95)]):null,dc_med:dc.length?dc[dc.length>>1]:null,hx:hxl.length?hxl.sort((a,b)=>b.ms-a.ms):undefined,hxn,ld:ldTake()}};if(R3.shc)R3.shc.n={dyn:0,cap:0,full:0};PERF.dT=[0,0,0];   /* dq: sharper-picture tries this hole [tried, kept, went back, windows needed] */
  try{fetch(DAILY.url+'/rest/v1/perf_stats',{method:'POST',keepalive:!!keep,headers:dailyHdr({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(body)}).catch(()=>{});}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(document.hidden)pstatFlush(true);});addEventListener('resize',()=>{MCLK.w=0;});   // w: the meter's width, measured once (not every frame)
const PERF={n:0,sum:0,level:0};
/* Oct 2026: the steady 30 used to last until the page was reloaded, and Safari keeps a tab alive for days, so one hot or low-power spell
   left a phone at 30 for every round after it. Now each new hole may try 60 again: after 1 hole, then 2, 4, up to 8 while it keeps
   falling back (a phone that really can't hold 60 is back at 30 within ~3 s); a hole that holds up clears the count. Coming back to
   the game after 2+ minutes away tries again at once. */
/* Earning detail back: the step-downs are remembered on the phone, so one hot or low-power spell used to leave it on the lightest
   picture for good. Smooth play at full resolution (about 18 s of it at first) now buys back one level at the next hole, where the
   change can't stutter a shot. If the richer picture can't hold 60 in its first ~12 s it goes straight back (rather than softening
   the resolution), and the next try needs twice as much smooth play. */
function perfUp(){if(PERF.cap||!(R3.perf>0)||(PERF.up||0)<(PERF.upNeed||12))return;
  /* not into the heavy look (multisampling, ambient occlusion and reflections, soft shadows): switching it on mid-round rebuilt every
     render target and compiled new shaders (130+ ms), and the phone usually couldn't hold it and fell back again */
  {const cur=r3Q(),pv=R3.perf;R3.perf=pv-1;const nx=r3Q();R3.perf=pv;if(nx.msaa!==cur.msaa||nx.ao!==cur.ao||nx.soft!==cur.soft){PERF.up=0;return;}}
  PERF.up=0;PERF.level=R3.perf-1;r3SetPerf(PERF.level);PERF.probe=8;PERF.slow=0;PERF.w=[];
  try{localStorage.setItem('golf-perf2',JSON.stringify({l:PERF.level,t:Date.now()}));}catch(e){}}
function perfRetry(){perfUp();if(!PERF.cap){if(PERF.trial){PERF.trial=0;PERF.capN=0;}return;}
  PERF.capH=(PERF.capH||0)+1;if(PERF.capH<Math.min(8,1<<Math.max(0,(PERF.capN||1)-1)))return;
  PERF.cap=0;PERF.slow=0;PERF.w=[];PERF.trial=1;}
/* at each new hole: a sharper picture asked for by perfCheck (a step of 8%), or going back from one that came out worse */
function perfDynHole(){const dT=PERF.dT||(PERF.dT=[0,0,0]);
  if(PERF.backQ!=null){const b=PERF.backQ;PERF.backQ=null;PERF.upQ=null;if((R3.dyn||1)>b+.001){R3.dyn=b;r3Resize();}return;}
  const u=PERF.upQ;PERF.upQ=null;const d=R3.dyn||1;if(!u||PERF.cap||d>=.999)return;
  R3.dyn=Math.min(1,d+.08);r3Resize();PERF.tryD={from:d,base:u.base,n:0,s:0};PERF.bad=0;PERF.good=0;dT[0]++;}
document.addEventListener('visibilitychange',()=>{if(document.hidden){PERF.hidT=Date.now();return;}
  if(PERF.cap&&PERF.hidT&&Date.now()-PERF.hidT>12e4){PERF.cap=0;PERF.capN=0;PERF.slow=0;PERF.w=[];PERF.trial=1;}});
/* Oct 2026: a step that changes the look's ingredients (multisampling, ambient occlusion, soft shadows) means new GPU programs and
   render targets: 85-270 ms frozen mid-hole. Those steps wait for the next hole (applied as it's built, behind its intro card);
   resolution steps still happen at once. Returns true when the level was applied now. */
function perfSet(level){const a=r3Q(),P0=R3.perf;R3.perf=level;const b=r3Q();R3.perf=P0;
  if((a.msaa!==b.msaa||a.ao!==b.ao||a.soft!==b.soft)&&G.hole&&G.state!=='intro'&&G.state!=='card'){PERF.pend=level;return false;}
  PERF.pend=null;r3SetPerf(level);return true;}
function perfCheck(raw){PERF.level=R3.perf||0;if(R3.warmQ||(PERF.quiet&&performance.now()<PERF.quiet)){PERF.w=[];return;}if(PERF.cap||G.paused||G.state==='intro'||G.state==='card'||G.state==='power'||G.state==='acc'||raw>.25)return;(PERF.w=PERF.w||[]).push(raw);if(PERF.w.length<90)return;
  const w=PERF.w.sort((a,b)=>a-b),med=w[w.length>>1],lng=w.filter(v=>v>.04).length/w.length,slip=w.filter(v=>v>.0205).length/w.length;PERF.w=[];
  /* v121 dynamic resolution: aim for a steady 60. When more than 1 frame in 8 misses a refresh, draw ~10% fewer pixels a side (down to 62%);
     after about 5 s of clean frames sharpen back up a step. Only once the picture is at its softest do the levels below step in. */
  const dyn=R3.dyn||1;
  /* Oct 22: a phone held at the softest resolution (62%) for ~12 s of play while still on the heavy look (High: multisampling,
     ambient occlusion, reflections, soft shadows) gives up the heavy look instead: one level down at the next hole, resolution back to 80%
     and free to sharpen from there. Cam's phone sat at the floor on High in about half its holes. */
  if(dyn<=.63&&PERF.pend==null){PERF.floorN=(PERF.floorN||0)+1;
    if(PERF.floorN>=8&&PERF.level<R3_LMAX-1){const cur=r3Q(),pv=R3.perf;R3.perf=pv+1;const nx=r3Q();R3.perf=pv;
      if(cur.msaa!==nx.msaa||cur.ao!==nx.ao||cur.soft!==nx.soft){PERF.floorN=0;PERF.level=pv+1;PERF.upQ=null;PERF.tryD=null;PERF.heavyOff=(PERF.heavyOff||0)+1;
        if(perfSet(PERF.level))R3.dyn=.8;try{localStorage.setItem('golf-perf2',JSON.stringify({l:PERF.level,t:Date.now()}));}catch(e){}return;}}}
  else if(dyn>.63)PERF.floorN=0;
  if(PERF.probe>0){PERF.probe--;if(slip>.12){PERF.probe=0;PERF.up=0;PERF.upNeed=Math.min(200,(PERF.upNeed||12)*2);PERF.level=Math.min(R3_LMAX-1,PERF.level+1);perfSet(PERF.level);
    try{localStorage.setItem('golf-perf2',JSON.stringify({l:PERF.level,t:Date.now()}));}catch(e){}return;}}
  /* Oct 2026: softening only came back with under 5% late frames, so a phone with a steady 5-12% (late frames that aren't
     from drawing pixels: fewer pixels didn't cure them) was ratcheted down by a few rough spells and then held at the 62% floor
     for good (Cam's phone: 186 of 321 holes). Now 4 such windows in a row (~6 s) at a softened picture ask for a sharper one at
     the next hole (applied behind its card, so no shot stutters). If the next 4 windows come out more than 3 points later than
     before, it goes back at the hole after and waits twice as long to try again; if not, it keeps it (and can try again). */
  if(PERF.tryD){const D=PERF.tryD;D.n++;D.s+=slip;if(D.n>=4){PERF.tryD=null;const dT=PERF.dT||(PERF.dT=[0,0,0]);if(D.s/D.n>D.base+.03){PERF.backQ=D.from;PERF.midNeed=Math.min(96,(PERF.midNeed||4)*2);dT[2]++;}else{PERF.midNeed=4;dT[1]++;}}}
  else if(dyn<.999&&slip>=.05&&slip<=.12&&!PERF.upQ&&PERF.backQ==null){PERF.mid=(PERF.mid||0)+1;PERF.midS=(PERF.midS||0)+slip;
    if(PERF.mid>=(PERF.midNeed||4)){PERF.upQ={base:PERF.midS/PERF.mid};PERF.mid=0;PERF.midS=0;}}
  else{PERF.mid=0;PERF.midS=0;}
  if(slip>.12)PERF.up=0;else if(slip<.03&&dyn>=.999&&PERF.level>0)PERF.up=(PERF.up||0)+1;
  /* v124: two slipping windows in a row before softening (one rough window, e.g. loading a hole, no longer counts), and sharpen back up
     after three windows under 5% late frames; a middling window only takes one off the count instead of starting it over */
  if(slip>.12&&dyn>.62){PERF.bad=(PERF.bad||0)+1;PERF.good=0;if(PERF.bad>=2){PERF.bad=0;R3.dyn=Math.max(.62,dyn-.1);PERF.slow=0;r3Resize();}return;}
  PERF.bad=0;
  if(slip<.05){PERF.good=(PERF.good||0)+1;if(PERF.good>=3&&dyn<1){R3.dyn=Math.min(1,dyn+.06);PERF.good=0;r3Resize();}if(dyn<.999||PERF.level===0)return;}else PERF.good=Math.max(0,(PERF.good||0)-1);
  if(PERF.stuck||PERF.pend!=null)return;
  /* v87: step down a level when the median frame is slower than ~45 fps or more than 1 in 8 frames stutters (>40 ms), two windows running; the level is remembered on this phone */
  /* far too slow (under ~28 fps, not a 30 fps cap): act on one window and drop two levels */
  /* last resort, already at the lightest picture and softest resolution and still uneven: a steady 30 (tried again later, see perfRetry) */
  if(PERF.level>=R3_LMAX-1){if(R3.dyn<=.63&&(med>1/45||lng>.12)){PERF.slow=(PERF.slow||0)+1;if(PERF.slow>=2){PERF.slow=0;PERF.cap=1;PERF.capN=(PERF.capN||0)+1;PERF.capH=0;}}else PERF.slow=0;return;}
  if(R3.dyn>.63)return;
  const vslow=med>1/28&&!PERF.steps2;if(vslow)PERF.slow=1;
  if(med>1/45||lng>.12){PERF.slow=(PERF.slow||0)+1;if(PERF.slow>=2){PERF.slow=0;
    /* two steps that didn't help (a hot phone slows down whatever it draws): stay on the lighter picture and stop stepping (it used to jump back to full detail) */
    if(PERF.steps>=2&&PERF.med0>1/45&&med>.9*PERF.med0){PERF.stuck=1;}
    else{if(!PERF.steps){PERF.med0=med;PERF.l0=PERF.level;}PERF.steps=(PERF.steps||0)+1;PERF.level=Math.min(R3_LMAX-1,PERF.level+(vslow?2:1));if(vslow&&PERF.level>=4)PERF.steps2=1;
      if(perfSet(PERF.level))R3.dyn=.8;try{localStorage.setItem('golf-perf2',JSON.stringify({l:PERF.level,t:Date.now()}));}catch(e){}}}}else PERF.slow=0;}
function replayPoint(t){const r=G.lastShot.rec;if(t<=0)return r[0];for(let i=1;i<r.length;i++){if(r[i].t>=t){const a=r[i-1],b=r[i],k=(t-a.t)/((b.t-a.t)||1);return{t,x:a.x+(b.x-a.x)*k,y:a.y+(b.y-a.y)*k,Y:a.Y+(b.Y-a.Y)*k};}}return r[r.length-1];}
function startReplay(done){const L=G.lastShot;if(!L||!L.rec||L.rec.length<6)return done&&done();G.ff=1;
  $('cardM').hidden=true;G.replay={t:-.55,dur:L.rec[L.rec.length-1].t,done,prev:G.state,prevFollow:G.followT,prevGolfer:G.golferAt};G.state='replay';G.overview=false;G.golferAt=L.golferAt;const c=replayCam();cam.E=[...c.E];cam.L=[...c.L];}
