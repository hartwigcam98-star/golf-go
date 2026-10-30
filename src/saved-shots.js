/* ---------- saved shots: the replay data kept on this phone, and replays recorded to video ---------- */
const HL_KEY='golf-highlights',HL_MAX=40;
const hlList=()=>{try{const a=JSON.parse(localStorage.getItem(HL_KEY)||'[]');return Array.isArray(a)?a:[];}catch(e){return[];}};
function hlEnc(L){const R=L.rec,p=[];let lt=-1,o=[0,0,0,0];
  for(let i=0;i<R.length;i++){const r=R[i];if(i>0&&i<R.length-1&&r.t-lt<.05)continue;lt=r.t;const q=[Math.round(r.t*100),Math.round(r.x*10),Math.round(r.y*10),Math.round(r.Y*10)];p.push(q[0]-o[0],q[1]-o[1],q[2]-o[2],q[3]-o[3]);o=q;}
  const ga=L.golferAt||{x:R[0].x,y:R[0].y,aim:G.shotRot};
  return{c:L.club??G.swingClub,k:L.putt?'putt':(L.type||G.swingType),b:+(L.back??G.swingBack??1).toFixed(2),l:+(L.launchAt||0).toFixed(3),a:+ga.aim.toFixed(4),gx:+ga.x.toFixed(1),gy:+ga.y.toFixed(1),o:L.holed?1:0,f:L.flame==='red'?2:L.flame?1:0,p};}
function hlSave(){const L=G.lastShot;if(!L||!L.rec||L.saved||G.mode==='highlight')return;
  const R=L.rec,a=R[0],e=R[R.length-1],d=hyp(e.x-a.x,e.y-a.y),c=CLUBS[L.club??G.swingClub]||curClub(),par=G.hole.par;
  const res=L.holed?(L.strokes===1?'Hole in one':scoreName(L.strokes||G.strokes,par).replace('!','').toLowerCase().replace(/^./,m=>m.toUpperCase())):'';
  const sub=(L.putt?Math.round(d*3)+' ft putt':c.name+' \u00b7 '+Math.round(d)+' yds')+(res?' \u00b7 '+res:L.holed?' \u00b7 in the hole':'');
  const it={id:Date.now(),ts:Date.now(),cid:CUR.id,hi:G.hi,pin:G.hole.pinIx??1,ch:(typeof R3B!=='undefined'&&R3B.cid)||CHAR_ID,title:CUR.name+' \u00b7 hole '+(G.hi+1),sub,s:hlEnc(L)};
  const a2=hlList();a2.unshift(it);while(a2.length>HL_MAX)a2.pop();
  try{localStorage.setItem(HL_KEY,JSON.stringify(a2));L.saved=true;toast('SHOT SAVED','Find it under Saved shots in the menu','#8ee6a8');sfx.nice();}
  catch(err){toast('COULD NOT SAVE','This phone is out of space for saved shots','#ff9b6a');}}
function hlDelete(id){const a=hlList().filter(x=>x.id!==id);try{localStorage.setItem(HL_KEY,JSON.stringify(a));}catch(e){}renderHl();}
function openHl(){$('menuM').hidden=true;$('hlM').hidden=false;renderHl();}
function renderHl(){const a=hlList(),el=$('hlList');
  if(!a.length){el.innerHTML='<p class="msub">No saved shots yet. During a replay, tap \u2606 Save to keep it here.</p>';return;}
  el.innerHTML=a.map(x=>'<div class="hlrow"><div><b>'+x.title+'</b><span>'+x.sub+' \u00b7 '+new Date(x.ts).toLocaleDateString(undefined,{month:'short',day:'numeric'})+'</span></div>'+
    '<button class="go" data-hlw="'+x.id+'" aria-label="Watch">\u25B6</button>'+(recOK()?'<button data-hlv="'+x.id+'" aria-label="Save as video">\u2B07</button>':'')+'<button data-hld="'+x.id+'" aria-label="Delete">\u2715</button></div>').join('');
  el.querySelectorAll('[data-hlw]').forEach(b=>b.addEventListener('click',()=>{A();hlPlay(+b.dataset.hlw,false);}));
  el.querySelectorAll('[data-hlv]').forEach(b=>b.addEventListener('click',()=>{A();hlPlay(+b.dataset.hlv,true);}));
  el.querySelectorAll('[data-hld]').forEach(b=>{let armed=false;b.addEventListener('click',()=>{A();if(!armed){armed=true;b.textContent='Delete?';setTimeout(()=>{armed=false;b.textContent='\u2715';},2500);return;}hlDelete(+b.dataset.hld);});});}
const HL={on:false};
function hlPlay(id,video){const e=hlList().find(x=>x.id===id);if(!e||!COURSES[e.cid])return;if(courseGate(e.cid,()=>hlPlay(id,video)))return;
  if(MATCH.on){toast('IN A MATCH','Finish or leave your match to watch saved shots','#fff6dc');return;}
  if(SPEC.on)specEnd(false);
  Object.assign(HL,{on:true,e,video});G.mode='highlight';G.hlPin=e.pin;
  $('hlM').hidden=true;$('menuM').hidden=true;G.paused=false;$('game').classList.add('spec');resize();
  setCourse(e.cid,false);G.scores=[];startHole(e.hi);$('introM').hidden=true;
  if(e.ch&&typeof r3GolferSet==='function'&&R3.on)try{r3GolferSet(e.ch);}catch(err){}
  const s=e.s,rec=dailyDecShot(s);while(rec.length<6){const q=rec[rec.length-1];rec.push({...q,t:q.t+.05});}
  G.ball={x:rec[0].x,y:rec[0].y};G.prev={...G.ball};G.strokes=1;G.fromLie=lieAt(s.gx,s.gy);G.lie=G.fromLie;G.shotRot=s.a;G.aim=s.a;
  G.swingClub=s.c;G.swingType=s.k;G.swingBack=s.b;G.inCup=false;
  G.lastShot={rec,golferAt:{x:s.gx,y:s.gy,aim:s.a},launchAt:s.l||(s.k==='putt'?PUTT_IMPACT:IMPACT_T),holed:!!s.o,putt:s.k==='putt',flame:s.f===2?'red':s.f===1?'blue':null,saved:true};
  later(1,()=>{if(!HL.on)return;if(video)recStart(e.title,e.sub);startReplay(()=>{if(REC.on)recStop();hlEnd();});});}
function hlEnd(){if(!HL.on)return;HL.on=false;G.waitFn=null;$('game').classList.remove('spec');resize();
  if(typeof r3GolferSet==='function'&&R3.on)try{r3GolferSet(CHAR_ID);}catch(e){}
  G.state='intro';G.paused=true;G.hlPin=null;if(!REC.blob||$('vidM').hidden)openHl();}
// video: draw each rendered frame (3D scene + overlay) into a small canvas and record it with MediaRecorder
const recMime=()=>{if(typeof MediaRecorder==='undefined')return null;for(const m of['video/mp4;codecs=avc1','video/mp4','video/webm;codecs=vp9','video/webm'])try{if(MediaRecorder.isTypeSupported(m))return m;}catch(e){}return null;};
let REC_OK=null;const recOK=()=>REC_OK??(REC_OK=!!recMime()&&!!HTMLCanvasElement.prototype.captureStream);
function recStart(title,sub){const mime=recMime();if(!mime)return false;const gl=$('gl'),k=Math.min(1,720/Math.min(gl.width,gl.height)),w=Math.round(gl.width*k/2)*2,h=Math.round(gl.height*k/2)*2;
  const cc=document.createElement('canvas');cc.width=w;cc.height=h;const ctx=cc.getContext('2d');ctx.fillStyle='#000';ctx.fillRect(0,0,w,h);
  let mr;try{mr=new MediaRecorder(cc.captureStream(30),{mimeType:mime,videoBitsPerSecond:6e6});}catch(e){return false;}
  const chunks=[];mr.ondataavailable=ev=>{if(ev.data&&ev.data.size)chunks.push(ev.data);};
  mr.onstop=()=>{REC.blob=new Blob(chunks,{type:mime.split(';')[0]});$('vidTitle').textContent='Your video is ready';$('vidSub').textContent=(title||'')+(sub?' \u00b7 '+sub:'');$('vidM').hidden=false;};
  Object.assign(REC,{on:true,mr,cc,ctx,w,h,title:title||'',sub:sub||'',blob:null});mr.start(200);return true;}
function recFrame(){const R=REC,gl=$('gl'),c=$('c');try{R.ctx.drawImage(gl,0,0,R.w,R.h);R.ctx.drawImage(c,0,0,R.w,R.h);}catch(e){}
  const s=R.h/900;R.ctx.font='700 '+Math.round(26*s)+'px "Lilita One",system-ui,sans-serif';R.ctx.textAlign='left';R.ctx.textBaseline='bottom';R.ctx.fillStyle='rgba(0,0,0,.45)';
  R.ctx.fillText(R.title,22*s+2,R.h-46*s+2);R.ctx.fillStyle='#fff6dc';R.ctx.fillText(R.title,22*s,R.h-46*s);R.ctx.font='600 '+Math.round(20*s)+'px "Barlow Semi Condensed",system-ui,sans-serif';R.ctx.fillText(R.sub,22*s,R.h-20*s);}
function recStop(){if(!REC.on)return;REC.on=false;try{REC.mr.stop();}catch(e){}}
async function recSave(){const b=REC.blob;if(!b)return;const ext=b.type.includes('mp4')?'mp4':'webm',f=new File([b],'golf-go-shot.'+ext,{type:b.type});
  if(navigator.canShare&&navigator.canShare({files:[f]})){try{await navigator.share({files:[f],title:'Golf Go shot'});return;}catch(e){if(e&&e.name==='AbortError')return;}}
  const a=document.createElement('a');a.href=URL.createObjectURL(b);a.download=f.name;document.body.appendChild(a);a.click();setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},5000);}
// record the replay that is on screen now: start it again from the top with the recorder running
function recThisReplay(){if(!G.replay||REC.on)return;const done=G.replay.done,L=G.lastShot,R=L.rec,a=R[0],e=R[R.length-1],d=hyp(e.x-a.x,e.y-a.y);
  G.replay.done=null;endReplay();const title=HL.on?HL.e.title:CUR.name+' \u00b7 hole '+(G.hi+1),sub=HL.on?HL.e.sub:(L.putt?Math.round(d*3)+' ft putt':Math.round(d)+' yds');
  if(!recStart(title,sub)){toast('NO VIDEO','This browser can\u2019t record video','#ff9b6a');done&&done();return;}
  startReplay(()=>{recStop();done&&done();});}
function endReplay(){const r=G.replay;if(!r)return;G.replay=null;G.state=r.prev;G.followT=r.prevFollow;G.golferAt=r.prevGolfer;G.trail=[];if(r.done)r.done();}
function stepReplay(dt){const r=G.replay,L=G.lastShot;const slow=L.holed&&r.t>r.dur-1.1?.5:1;r.t+=dt*slow;
  G.golferAt=L.golferAt;G.followT=Math.max(.001,L.launchAt+r.t);if(r.t>r.dur+.9)endReplay();}
// replays use the same camera as a live shot (trailing the ball); the TV button switches to the broadcast-style view
function replayCam(){return FLY_TV?replayCamTV():replayCamTrail();}
function replayCamTrail(){const L=G.lastShot,r=G.replay,rp=replayPoint(Math.max(0,r.t)),s0=L.rec[0],ga=L.golferAt||{x:s0.x,y:s0.y,aim:G.shotRot};
  const[dx,dz]=dirOf(ga.aim),g0=hAt(ga.x,ga.y),gb=hAt(rp.x,rp.y);
  if(L.putt){if(r.t<.3)return{E:[ga.x-dx*2.6,g0+1.4,ga.y-dz*2.6],L:[ga.x+dx*4,g0,ga.y+dz*4]};return{E:[rp.x-dx*6,gb+2.8,rp.y-dz*6],L:[rp.x,gb,rp.y]};}
  if(r.t<.4){const ca=camAddress(ga.x,ga.y,ga.aim);if(ca)return ca;return{E:[ga.x-dx*13,g0+5.4,ga.y-dz*13],L:[ga.x+dx*40,g0,ga.y+dz*40]};}
  if(rp.Y>gb+.25)return{E:[rp.x-dx*31,rp.Y*.55+gb*.45+9,rp.y-dz*31],L:[rp.x+dx*8,rp.Y*.85+gb*.15,rp.y+dz*8]};
  return{E:[rp.x-dx*20,gb+7,rp.y-dz*20],L:[rp.x,gb,rp.y]};}
function replayCamTV(){const L=G.lastShot,r=G.replay,rp=replayPoint(Math.max(0,r.t)),s0=L.rec[0],s1=L.rec[L.rec.length-1],ga=L.golferAt||{x:s0.x,y:s0.y,aim:G.shotRot};
  const[dx,dz]=dirOf(ga.aim),g0=hAt(ga.x,ga.y);
  if(L.putt)return{E:[rp.x-dx*3.6,hAt(rp.x,rp.y)+1.5,rp.y-dz*3.6],L:[rp.x,rp.Y,rp.y]};
  if(r.t<Math.min(1.2,r.dur*.35))return{E:[ga.x-dx*7,g0+2.4,ga.y-dz*7],L:[rp.x,rp.Y,rp.y]};
  // landing camera: off to the side of where the ball comes to rest, watching it arrive
  const sx=-dz,sz=dx,ex=s1.x+sx*16-dx*7,ez=s1.y+sz*16-dz*7;return{E:[ex,hAt(ex,ez)+5,ez],L:[rp.x,rp.Y,rp.y]};}
/* menu screens with a solid backdrop hide the course completely: nothing is drawn behind them (saves battery and heat) */
const COVERS=['menuM','dailyM','recM','careerM','hlM','charM'].map(id=>$(id));
/* v122: optional live frame-rate chip (pause menu > Show FPS): frames per second over the last half second, coloured,
   plus the drawing resolution when the game has lowered it and the graphics level when it has stepped down */
const FPSM={on:(()=>{try{return localStorage.getItem('golf-fps')==='1';}catch(e){return false;}})(),n:0,t0:0,slow:0};
function fpsTick(now,raw){const el=$('fpsChip');if(!el)return;const show=FPSM.on&&!!G.hole&&!G.paused;if(el.hidden===show)el.hidden=!show;if(!show)return;
  if(!FPSM.t0){FPSM.t0=now;FPSM.n=0;FPSM.slow=0;return;}FPSM.n++;if(raw>.0205)FPSM.slow++;const span=now-FPSM.t0;if(span<500)return;
  const f=Math.round(FPSM.n*1000/span),d=R3.dyn||1,l=R3.perf||0;$('fpsN').textContent=f;
  $('fpsQ').textContent=(d<.995?Math.round(d*100)+'%':'')+(l?(d<.995?' ':'')+'L'+l:'')+(PERF.cap?' 30 lock':'');
  el.className=f>=55?'ok':f>=40?'mid':'bad';FPSM.t0=now;FPSM.n=0;FPSM.slow=0;}
/* Oct 2026 hitch recorder (sent with the smoothness stats, nothing shown): when a frame comes more than 50 ms after the last
   one, keep what the frame before it did (the work that delayed it): the game state, its JS time, which game steps took over
   4 ms, and whether a new GPU program was compiled. The six longest per hole go into perf_stats (extra.hx). */
var HTR={m:'',prev:null,pc:0,ring:[],pend:[],last:0,endT:0,ping:0,n50:0,n100:0,lat:0};
/* Oct 28 2026: finer detail on each hitch, to pin down the ~100 ms stalls that come with no marker and almost no JS (Cam's phone,
   aiming / waiting / at hole-out). lat: how late our frame callback ran after the frame's own timestamp (the page busy before it);
   wk: the whole frame's work (js is the main step only); idle: from the end of our last frame's work to this frame; free: how soon after our last frame the page was free again (a
   MessageChannel ping; large = something else held the page); pre/post: frame times just before and after; gap: s since the last
   hitch; t: s into the hole; dc/dyn/lvl: draw calls, resolution and graphics level. extra.hxn counts every hitch in the hole. */
/* mut: changes to the screen controls (DOM) since the last frame; an: CSS animations running at the hitch (Standard HUD, Oct 28:
   the stalls come with the page idle and, during the swing meter, with no 3D drawn, so look at what else changes on screen) */
HTR.mut=0;try{new MutationObserver(l=>{HTR.mut+=l.length;}).observe(document.getElementById('game')||document.body,{subtree:true,childList:true,characterData:true,attributes:true});}catch(e){}
const HXCH=typeof MessageChannel!=='undefined'?new MessageChannel():null;if(HXCH)HXCH.port1.onmessage=()=>{if(!HTR.ping)HTR.ping=performance.now();};
function hxWrap(n,f){return function(){const t=performance.now();try{return f.apply(this,arguments);}finally{const d=performance.now()-t;if(d>4)HTR.m+=n+':'+Math.round(d)+' ';}};}
function hxFrame(raw,now){const p=HTR.prev,between=HTR.m;HTR.prev=null;HTR.m='';const ms=Math.round(raw*1000);
  for(let i=HTR.pend.length-1;i>=0;i--){const e=HTR.pend[i];e.post.push(ms);if(e.post.length>=4)HTR.pend.splice(i,1);}
  const ring=HTR.ring.slice();HTR.ring.push(ms);if(HTR.ring.length>6)HTR.ring.shift();
  const free=HTR.ping&&HTR.endT?Math.round(HTR.ping-HTR.endT):null,idle=HTR.endT?Math.round(now-HTR.endT):null;HTR.ping=0;const mut=HTR.mut;HTR.mut=0;
  if(!p||!(raw>.05)||!PSTAT||!PSTAT.hole||document.hidden)return;   // 'between': taps and timers since the last frame
  HTR.n50++;if(raw>=.1)HTR.n100++;const t=performance.now(),gap=HTR.last?Math.round((t-HTR.last)/100)/10:null;HTR.last=t;
  const e={ms,st:p.st,js:Math.round(p.js),wk:Math.round(p.wk),m:(p.m+(between?'| '+between:'')).trim().slice(0,220),lat:Math.round(HTR.lat),idle,free,pre:ring,post:[],gap,
    t:PSTAT.t0?Math.round((t-PSTAT.t0)/100)/10:null,dc:R3.dcN0||0,mut,an:(()=>{try{return document.getAnimations?document.getAnimations().length:-1;}catch(e){return -1;}})(),hud:(document.getElementById('game')||{}).className||'',dyn:+(R3.dyn||1).toFixed(2),lvl:R3.perf||0};
  HTR.pend.push(e);if(HTR.pend.length>8)HTR.pend.shift();
  const L=PSTAT.hx||(PSTAT.hx=[]);L.push(e);if(L.length>6){L.sort((a,b)=>b.ms-a.ms);L.length=6;}}
function hxEnd(js){HTR.endT=performance.now();HTR.ping=0;if(HXCH)try{HXCH.port2.postMessage(0);}catch(e){}R3.dcN0=R3.dcN;const rr=R3.renderer;if(rr){const L=rr.info.programs,pc=L.length;if(HTR.pc&&pc>HTR.pc){HTR.m+='prog+'+(pc-HTR.pc)+'['+L.slice(HTR.pc).map(p=>(p.cacheKey||'').slice(0,14).replace(/[,|]/g,'.')).join(';')+'] ';}HTR.pc=pc;}HTR.prev={st:G.state+(G.paused?'/p':''),js,wk:HTR.fs?HTR.endT-HTR.fs:js,m:HTR.m};HTR.m='';}
buildGrassPatch=hxWrap('grass',buildGrassPatch);buildTreeMesh=hxWrap('trees',buildTreeMesh);r3TreeLOD=hxWrap('lod',r3TreeLOD);r3ShcPlan=hxWrap('shc',r3ShcPlan);
r3Reflect=hxWrap('refl',r3Reflect);prepareShot=hxWrap('prep',prepareShot);executeShot=hxWrap('shot',executeShot);startHole=hxWrap('hole',startHole);
pstatFlush=hxWrap('flush',pstatFlush);saveGame=hxWrap('save',saveGame);updHud=hxWrap('hud',updHud);renderScene=hxWrap('ovl',renderScene);{const rs=renderScene;renderScene=function(){rs.apply(this,arguments);if(G.drop)try{dropDraw();}catch(e){}};}r3Post=hxWrap('post',r3Post);
r3Golfer=hxWrap('golfer',r3Golfer);r3Dynamic=hxWrap('dyn',r3Dynamic);stepCam=hxWrap('cam',stepCam);ambTick=hxWrap('amb',ambTick);aiStep=hxWrap('ai',aiStep);
chooseShort=hxWrap('short',chooseShort);calcPuttMax=hxWrap('putt',calcPuttMax);autoClub=hxWrap('club',autoClub);r3WarmJob=hxWrap('warm',r3WarmJob);r3Shadow=hxWrap('sun',r3Shadow);
r3GrassUpdate=hxWrap('grassU',r3GrassUpdate);cpkPack=hxWrap('pack',cpkPack);cupBuf=hxWrap('cupSnd',cupBuf);impactBuffer=hxWrap('hitSnd',impactBuffer);strikeShot=hxWrap('strike',strikeShot);pendSave=hxWrap('psave',pendSave);toast=hxWrap('toast',toast);r3Tracer=hxWrap('tracer',r3Tracer);r3Camera=hxWrap('r3cam',r3Camera);update=hxWrap('upd',update);r3Render=hxWrap('r3',r3Render);
function frame(now){requestAnimationFrame(frame);   /* asked for first, so one error in a frame can't stop the game for good */
  if(LDT.p)try{ldFrame();}catch(e){}
  if(PERF.cap&&now-last<28&&!(REC&&REC.on))return;   /* steady 30: every other refresh (on a 120 Hz screen, every fourth) */
  const raw=(now-last)/1000,dt=Math.min(.05,raw);last=now;pstatAdd(raw);HTR.fs=performance.now();HTR.lat=HTR.fs-now;hxFrame(raw,now);if(FPSM.on)fpsTick(now,raw);if(G.hole&&R3.on&&!REC.on&&!SPEC.on&&!(G.ff>1&&ffActive()))perfCheck(raw);   /* video export, spectating and fast-forward aren't measured */
  try{ambTick(dt);}catch(e){}
  const j0=performance.now(),rr=R3.renderer;if(rr&&!rr.__dc){const ro=rr.render;rr.__dc=1;rr.render=function(a,b){ro.call(this,a,b);R3.dcN=(R3.dcN||0)+this.info.render.calls;};}R3.dcN=0;
  if(SJ.job&&G.state==='wait'&&!G.paused)try{shortTick();}catch(e){SJ.job=null;}   // chip/pitch choice for the next shot, a few candidates a frame
  if(G.hole){if(!G.paused){const n=SPEC.on?(SPEC.ff||1):G.ff>1&&ffActive()?G.ff:1;for(let i=0;i<n;i++){G.hudSkip=i<n-1;update(dt);}MCLK.t=now;   /* fast-forward takes several steps a frame: the readouts are worked out once, on the last */}if(!COVERS.some(m=>!m.hidden))render();}
  hxEnd(performance.now()-j0);
  if(PSTAT.hole&&PSTAT.js.length<30000){PSTAT.js.push(performance.now()-j0);if(rr&&PSTAT.dc.length<2000&&(PSTAT.js.length&15)===0)PSTAT.dc.push(R3.dcN);}}   /* the phone's own work per frame (JS and handing draws to the GPU), and draw calls: which of the two is the limit */

