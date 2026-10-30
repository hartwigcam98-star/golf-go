/* ---------- sound ---------- */
const S={ctx:null,on:true,nb:null};
function A(){if(!S.on)return null;if(!S.ctx){try{S.ctx=new(window.AudioContext||window.webkitAudioContext)();}catch(e){return null;}
    // everything goes through a master bus: a little extra gain and a limiter so phone speakers get a solid level
    try{const c=S.ctx.createDynamicsCompressor();c.threshold.value=-14;c.knee.value=8;c.ratio.value=6;c.attack.value=.002;c.release.value=.12;S.out=S.ctx.createGain();S.out.gain.value=2.2;S.out.connect(c).connect(S.ctx.destination);}catch(e){S.out=null;}}
  if(S.ctx.state!=='running')S.ctx.resume().catch(()=>{});return S.ctx;}
const OUT=()=>{if(typeof HTR==='object')HTR.m+='snd ';return S.out||S.ctx.destination;};
// iPhone/iPad: audio only starts inside a touchend/click, and the ring/silent switch mutes web audio unless the page asks for "playback"
/* v110: "Keep playing" lets music or a podcast from another app carry on under the game's sounds (iPhone audio session
   'ambient'; game sounds then follow the silent switch). "Pause it" is the old behaviour ('playback'). */
function audioMix(){try{return localStorage.getItem('golf-mix')==='1';}catch(e){return false;}}
function audioSessionSet(){try{if(navigator.audioSession)navigator.audioSession.type=audioMix()?'ambient':'playback';}catch(e){}}
function mixSegDraw(){document.querySelectorAll('#pMix button').forEach(b=>b.classList.toggle('on',(b.dataset.mix==='1')===audioMix()));}
function unlockAudio(){if(!S.on)return;audioSessionSet();
  const a=A();if(!a)return;
  if(!S.unlocked){try{const b=a.createBuffer(1,1,22050),src=a.createBufferSource();src.buffer=b;src.connect(a.destination);src.start(0);}catch(e){}
    try{if(!S.tag){S.tag=new Audio('data:audio/wav;base64,UklGRrQBAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YZABAACAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICA');S.tag.setAttribute('playsinline','');S.tag.loop=true;S.tag.volume=.01;}const pr=S.tag.play();if(pr&&pr.catch)pr.catch(()=>{});}catch(e){}}
  realStrike('wood');if(a.state==='running')S.unlocked=true;}
['touchend','click','pointerup','keydown'].forEach(ev=>window.addEventListener(ev,unlockAudio,{capture:true,passive:true}));
if(navigator.audioSession){const r=document.getElementById('pMixRow');if(r)r.hidden=false;mixSegDraw();
  document.querySelectorAll('#pMix button').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();try{localStorage.setItem('golf-mix',b.dataset.mix);}catch(_){}mixSegDraw();audioSessionSet();
    if(S.ctx){S.ctx.suspend().then(()=>S.ctx.resume()).catch(()=>{});}}));}
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&S.ctx&&S.on)S.ctx.resume().catch(()=>{});});
function tone(f,d,type='sine',vol=.15,to){const a=A();if(!a)return;const t=a.currentTime,o=a.createOscillator(),g=a.createGain();o.type=type;o.frequency.setValueAtTime(f,t);if(to)o.frequency.exponentialRampToValueAtTime(to,t+d);g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);o.connect(g).connect(OUT());o.start(t);o.stop(t+d+.02);}
function noise(d,vol,type,f0,f1){const a=A();if(!a)return;if(!S.nb){S.nb=a.createBuffer(1,a.sampleRate,a.sampleRate);const c=S.nb.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=Math.random()*2-1;}const t=a.currentTime,s=a.createBufferSource();s.buffer=S.nb;const fl=a.createBiquadFilter();fl.type=type;fl.frequency.setValueAtTime(f0,t);if(f1)fl.frequency.exponentialRampToValueAtTime(f1,t+d);const g=a.createGain();g.gain.setValueAtTime(vol,t);g.gain.exponentialRampToValueAtTime(.001,t+d);s.connect(fl).connect(g).connect(OUT());s.start(t);s.stop(t+d);}
/* ---------- club impact samples (modal synthesis, rendered once and cached) ----------
   Driver: titanium face "ping" - a sharp crack plus a bright ring that dies in ~0.1s.
   Irons/wedges: a compressed "click", short and solid. Putter: a soft "tock". Poor contact loses the ring and gains a dull thud. */
const IMPACT_MODES={
  wood:{crack:1,ring:[[2980,.9,.085],[4150,.6,.06],[5650,.38,.045],[1720,.35,.035],[7300,.2,.025]],body:[[420,.25,.03]],len:.34},
  hybrid:{crack:.9,ring:[[3300,.6,.045],[4700,.4,.03],[2100,.3,.025],[6400,.15,.018]],body:[[380,.28,.03]],len:.24},
  iron:{crack:.95,ring:[[3900,.45,.016],[2350,.45,.02],[5400,.3,.011],[1500,.25,.018]],body:[[230,.35,.028]],len:.16},
  wedge:{crack:.9,ring:[[4300,.4,.013],[2700,.45,.017],[6000,.25,.009],[1750,.25,.016]],body:[[260,.32,.025]],len:.14},
  putter:{crack:.35,ring:[[1180,.8,.022],[2650,.3,.009],[3900,.12,.006]],body:[[480,.3,.016]],len:.12},
};
function impactBuffer(kind,qb){const a=S.ctx,key=kind+qb;S.ib=S.ib||{};if(S.ib[key])return S.ib[key];
  const M=IMPACT_MODES[kind]||IMPACT_MODES.iron,q=qb/3,sr=a.sampleRate,n=Math.ceil(M.len*sr),buf=a.createBuffer(1,n,sr),d=buf.getChannelData(0);
  const R=rng(7+qb*13+kind.length*101);
  // pure: full ring and a crisp crack; poor: ring damped and detuned, crack softened, big low thud and a rattly buzz
  const ringAmp=.25+.75*q*q,ringDecay=.35+.65*q,crackLen=(.0012+.0035*(1-q))*sr,thud=.25+1.1*(1-q),buzz=Math.max(0,.6-q)*.5;
  const modes=M.ring.map(([f,g,t])=>({w:TAU*f*(1+(1-q)*(R()-.5)*.06),g:g*ringAmp,k:1/(t*ringDecay),ph:R()*TAU}));
  const body=M.body.map(([f,g,t])=>({w:TAU*f*(.9+.1*q),g:g*thud,k:1/(t*(1+.8*(1-q))),ph:0}));
  // the crack is band-limited: bright (to ~6 kHz) when pure, dull (~1.5 kHz) when not
  let l1=0,l2=0;const fc=(kind==='putter'?2200:5800)*q+(kind==='putter'?900:1400)*(1-q),lpk=1-Math.exp(-TAU*fc/sr);
  for(let i=0;i<n;i++){const t=i/sr;let x=0;
    for(const m of modes)x+=m.g*Math.sin(m.w*t+m.ph)*Math.exp(-m.k*t);
    for(const m of body)x+=m.g*Math.sin(m.w*t)*Math.exp(-m.k*t);
    if(buzz>0)x+=buzz*Math.sin(TAU*118*t)*Math.sign(Math.sin(TAU*236*t))*.3*Math.exp(-t/.07);
    if(i<crackLen*8){const nz=(R()*2-1)*Math.exp(-i/crackLen);l1+=lpk*(nz-l1);l2+=lpk*(l1-l2);x+=M.crack*2.2*l2;}
    const atk=Math.min(1,i/(sr*.0004));d[i]=x*atk*.5;}
  let pk=0;for(let i=0;i<n;i++)pk=Math.max(pk,Math.abs(d[i]));if(pk>0)for(let i=0;i<n;i++)d[i]*=.9/pk;
  return S.ib[key]=buf;}
function playBuf(buf,vol,rate=1){const a=A();if(!a)return;const s=a.createBufferSource(),g=a.createGain();s.buffer=buf;s.playbackRate.value=rate;g.gain.value=vol;s.connect(g).connect(OUT());s.start();}
/* a real recorded iron strike off turf (from the player's own swing video); every club is voiced from it,
   and worse contact is played darker, lower and softer */
/*@data REAL_STRIKE*/
// driver / woods: Mixkit "Golf shot breaking the air" (Mixkit License, free use in projects)
/*@data REAL_DRIVER*/
function decodeClip(uri,key){const a=S.ctx;S.clips=S.clips||{};if(S.clips[key]||S.clips[key+'_l'])return S.clips[key]||null;S.clips[key+'_l']=true;
  try{const bin=atob(uri.split(',')[1]),u=new Uint8Array(bin.length);for(let i=0;i<bin.length;i++)u[i]=bin.charCodeAt(i);
    const done=b=>{S.clips[key]=b;},p=a.decodeAudioData(u.buffer,done,()=>{});if(p&&p.then)p.then(done).catch(()=>{});}catch(e){}return null;}
function realStrike(kind){const iron=decodeClip(REAL_STRIKE,'iron'),drv=decodeClip(REAL_DRIVER,'driver');return(kind==='wood'||kind==='hybrid')?(drv||iron):iron;}
const VOICE={ // playback rate, brightness, level, how much titanium ring to add
  wood:{rate:1,bright:1,vol:1,ring:0,real:1},hybrid:{rate:1.06,bright:.8,vol:.9,ring:0,real:1},iron:{rate:1,bright:1,vol:.9,ring:0},
  wedge:{rate:1.07,bright:1,vol:.8,ring:0},putter:{rate:1.45,bright:.28,vol:.32,ring:0,cut:.07}};
function playImpact(kind,q,v){const a=A();if(!a)return;const rs=realStrike(kind),V=VOICE[kind]||VOICE.iron;q=clamp(q,0,1);
  if(!rs){const qb=Math.round(q*3);playBuf(impactBuffer(kind,qb),(kind==='putter'?.5:.8)*v);return;} // sample still decoding
  const t=a.currentTime,src=a.createBufferSource(),lp=a.createBiquadFilter(),g=a.createGain();
  src.buffer=rs;src.playbackRate.value=V.rate*(.9+.1*q)*(1+(Math.random()-.5)*.03);if(V.real&&rs!==S.clips.driver)src.playbackRate.value*=.9;
  lp.type='lowpass';lp.frequency.value=(900+Math.pow(q,2)*15000)*V.bright+300;lp.Q.value=q>.9?.9:.5;
  const lvl=V.vol*v*(.55+.45*q);g.gain.setValueAtTime(lvl,t);
  if(V.cut)g.gain.setTargetAtTime(0,t+V.cut,.02);
  src.connect(lp).connect(g).connect(OUT());src.start(t);
  if(V.ring&&q>.7){const qb=3;const ring=a.createBufferSource(),rg=a.createGain(),hp=a.createBiquadFilter();hp.type='highpass';hp.frequency.value=2200;
    ring.buffer=impactBuffer('wood',qb);rg.gain.value=V.ring*v*(q-.6)/.4;ring.connect(hp).connect(rg).connect(OUT());ring.start(t+.001);}
  if(q<.45){const th=a.createBufferSource(),tg=a.createGain();th.buffer=impactBuffer('iron',0);tg.gain.value=.3*v*(1-q);th.playbackRate.value=.8;th.connect(tg).connect(OUT());th.start(t);}}
function shapedNoise(len,env,lpf){const a=S.ctx,sr=a.sampleRate,n=Math.ceil(len*sr),b=a.createBuffer(1,n,sr),d=b.getChannelData(0);let l=0;
  for(let i=0;i<n;i++){l+=lpf*((Math.random()*2-1)-l);d[i]=l*env(i/n);}let pk=0;for(const x of d)pk=Math.max(pk,Math.abs(x));for(let i=0;i<n;i++)d[i]*=.9/(pk||1);return b;}
function playTurf(amt,v){const a=A();if(!a)return;S.turf=S.turf||shapedNoise(.11,t=>Math.pow(1-t,3)*Math.min(1,t*40),.35);playBuf(S.turf,.35*amt*v);}
function playSand(v){const a=A();if(!a)return;S.sand=S.sand||shapedNoise(.45,t=>Math.pow(1-t,2)*Math.min(1,t*25),.6);playBuf(S.sand,.5*v);}
function playSwoosh(v){const a=A();if(!a)return;S.sw=S.sw||shapedNoise(.2,t=>Math.pow(Math.sin(Math.PI*Math.pow(t,1.6)),2),.18);playBuf(S.sw,.22*v);}
/* cup sound (Oct 2026, v4 "cup mic"): what a microphone inside the cup hears, as on golf broadcasts - modal synthesis.
   A loud, close, dry clack of ball on hard plastic with a deep boom from the cavity, two quick bounces, then the ball
   rattling round the bottom of the cup, faster and faster as it settles (like a spun coin). Hard: rim clicks first. */
function cupBuf(hard,vr){const a=S.ctx,key='cup4'+hard+vr;S.ib=S.ib||{};if(S.ib[key])return S.ib[key];
  const sr=a.sampleRate,n=Math.ceil(.95*sr),buf=a.createBuffer(1,n,sr),d=buf.getChannelData(0),R=rng(91+hard*17+vr*5);
  const MODES=[[430,.75,.055],[1020,1,.035],[1720,.75,.024],[2850,.5,.015],[4300,.3,.009],[6100,.15,.005]];
  const j=v=>v*(1+(R()-.5)*.06);
  const hits=[];const t0=hard?j(.085):0;
  if(hard)[0,j(.026),j(.049),j(.068)].forEach((t,k)=>hits.push([t,.42-.04*k,1.6,0,0]));     // clicks off the rim
  hits.push([t0,1,1.15,1,1],[t0+j(.058),.42,1,1,.5],[t0+j(.094),.17,.9,1,.2]);            // the drop and two bounces on the bottom
  // the roll: round and round the bottom, each lap a small click, laps getting quicker as it settles
  {let t=t0+j(.13),f=7+R()*3;const T=t0+.62+R()*.12;while(t<T){const u=(t-t0-.13)/(T-t0-.13);hits.push([t,.28*Math.pow(1-u,1.2)*(.7+R()*.6),.9+R()*.3,0,0]);f+=4+u*9;t+=1/f;}}
  for(const[h0,amp,br,low,boom]of hits){const i0=Math.floor(h0*sr),M=MODES.map(([f,g,tau],k)=>({w:TAU*j(f),g:g*amp*Math.pow(br,k-1.2),k:1/(tau*(low?1:.7)),ph:R()*TAU}));
    let l=0;const cl=.00045*sr,lp=1-Math.exp(-TAU*(5200*br)/sr);
    /* each ring is stepped sample to sample (a turn and a shrink per sample) instead of a sin and an exp per sample: the same
       sound, about ten times quicker to build (Oct 2026: building it was still a 100+ ms hitch when a ball dropped) */
    const nm=M.length,re=new Float64Array(nm),im=new Float64Array(nm),cr=new Float64Array(nm),ci=new Float64Array(nm);
    for(let q=0;q<nm;q++){const m=M[q],e=Math.exp(-m.k/sr);re[q]=m.g*Math.cos(m.ph);im[q]=m.g*Math.sin(m.ph);cr[q]=e*Math.cos(m.w/sr);ci[q]=e*Math.sin(m.w/sr);}
    for(let i=i0;i<n;i++){const t=(i-i0)/sr;if(t>.16)break;let x=0;for(let q=0;q<nm;q++){const r0=re[q],i1=im[q];x+=i1;re[q]=r0*cr[q]-i1*ci[q];im[q]=r0*ci[q]+i1*cr[q];}
      if(low)x+=amp*(1.2*boom+.3)*Math.sin(TAU*(120+40*Math.exp(-t/.01))*t)*Math.exp(-t/.045);   // cavity boom (the mic is right inside it)
      if(i-i0<cl*6){l+=lp*((R()*2-1)*Math.exp(-(i-i0)/cl)-l);x+=amp*2.8*l;}
      d[i]+=x*Math.min(1,(i-i0)/(sr*.00025));}}
  // a faint rolling rumble under the laps
  {let l=0;const i1=Math.floor((t0+.12)*sr),i2=Math.floor((t0+.7)*sr),k=1-Math.exp(-TAU*900/sr);for(let i=i1;i<Math.min(n,i2);i++){const u=(i-i1)/(i2-i1);l+=k*((R()*2-1)-l);d[i]+=l*.18*Math.pow(1-u,1.5)*Math.min(1,u*20);}}
  {const D=Math.round(sr/440);for(let i=D;i<n;i++)d[i]+=.22*d[i-D];}   // a touch of the cup's tube
  let pk=0;for(let i=0;i<n;i++)pk=Math.max(pk,Math.abs(d[i]));for(let i=0;i<n;i++)d[i]=Math.tanh(1.8*d[i]/(pk||1));   // broadcast punch: a little saturation
  pk=0;for(let i=0;i<n;i++)pk=Math.max(pk,Math.abs(d[i]));if(pk>0)for(let i=0;i<n;i++)d[i]*=.92/pk;
  return S.ib[key]=buf;}
/* Oct 2026: the six ball-in-the-cup sounds (and the club strikes) are built ahead (one at a time while a menu is up) instead of the first time each plays; building one took a few hundred ms right as the ball dropped */
function sfxWarm(){setTimeout(sfxWarm,500);if(!S.ctx)return;
  if(!(document.hidden||typeof G!=='object'||!G.hole||(typeof COVERS!=='undefined'&&COVERS.some(m=>!m.hidden))))return;   // menus only
  if(!(S.clips&&(S.clips.iron||S.clips.iron_l))){try{realStrike('wood');}catch(e){}return;}   // start decoding the recorded strikes
  for(const h of[0,1])for(const v of[0,1,2])if(!(S.ib&&S.ib['cup4'+h+v])){try{cupBuf(h,v);}catch(e){}return;}
  for(const k in IMPACT_MODES)for(let q=0;q<4;q++)if(!(S.ib&&S.ib[k+q])){try{impactBuffer(k,q);}catch(e){}return;}}   // the club strikes too (20, small)
setTimeout(sfxWarm,3000);
const sfx={
  tick:()=>tone(880,.05,'square',.04),
  hit:p=>{tone(170,.12,'sine',.35,60);noise(.4,.08+.2*p,'bandpass',500,3200);},
  // club strike: q = contact quality 0 (thin/fat) .. 1 (dead centre); built from recorded-style impact samples, no pitch sweeps
  strike:(p,q,kind,lie)=>{const v=.6+.4*p;playImpact(kind,q,v);
    if(lie==='rough'||lie==='fescue')setTimeout(()=>playTurf(.5,v),8);
    if(lie==='sand')playSand(v);},
  puttQ:q=>playImpact('putter',q,.8),
  flame:red=>{setTimeout(()=>noise(1,.07,'bandpass',red?700:1000),60);},
  nice:()=>{tone(784,.12,'sine',.07);setTimeout(()=>tone(1175,.2,'sine',.07),90);},
  swoosh:v=>{playSwoosh(v);},
  putt:()=>tone(430,.08,'triangle',.2,220),
  land:()=>noise(.12,.12,'lowpass',500),
  // the ball dropping into the cup: a hollow plastic clunk and two or three small bounces on the bottom (hard: rim clicks first)
  cup:hard=>{const a=A();if(!a)return;const b=cupBuf(hard?1:0,(Math.random()*3)|0);playBuf(b,hard?.8:.75,.96+Math.random()*.08);},
  splash:()=>noise(.7,.3,'lowpass',2000,200),
  lip:()=>{tone(1900,.07,'sine',.07);tone(2860,.05,'sine',.04);},
  tree:()=>{tone(190,.07,'triangle',.12);noise(.3,.12,'highpass',1800);},
  // feel (Oct 2026): leaves, the flagstick, the cup rim, water, meter ticks, wings
  rustle:v=>{const a=A();if(!a)return;S.rus=S.rus||shapedNoise(.55,t=>Math.pow(Math.sin(Math.PI*Math.pow(t,.45)),2)*(.55+.45*Math.abs(Math.sin(t*37))),.85);
    const s=a.createBufferSource(),hp=a.createBiquadFilter(),g=a.createGain();hp.type='highpass';hp.frequency.value=2000;s.buffer=S.rus;s.playbackRate.value=.85+Math.random()*.3;g.gain.value=.3*(v??1);s.connect(hp).connect(g).connect(OUT());s.start();},
  pin:(v=1)=>{tone(2350,.2,'sine',.11*v);tone(3720,.13,'sine',.06*v);tone(5180,.07,'sine',.035*v);noise(.035,.09*v,'highpass',3000);},
  rim:()=>{for(let i=0;i<5;i++)setTimeout(()=>tone(1400+Math.random()*900,.03,'triangle',.05),i*(46-i*6));},

  plop:soft=>{tone(soft?440:300,soft?.1:.15,'sine',soft?.09:.18,soft?210:105);if(!soft)for(let i=0;i<7;i++)setTimeout(()=>tone(1800+Math.random()*2600,.025,'sine',.025),200+Math.random()*800);},
  mtick:k=>tone(480+k*420,.022,'square',.016),
  flutter:(v=1)=>{for(let i=0;i<8;i++)setTimeout(()=>noise(.045,.05*v,'bandpass',700+Math.random()*500),i*48+Math.random()*20);setTimeout(()=>tone(3300,.07,'sine',.02*v,2600),90);},
  miss:()=>{tone(165,.16,'triangle',.1);setTimeout(()=>tone(123,.22,'triangle',.08),110);},
  fanfare:()=>[523,659,784,1047].forEach((f,i)=>setTimeout(()=>tone(f,.25,'triangle',.12),i*110)),
};
/* Oct 2026: vibration removed. On iPhone it came from clicking a hidden switch, which could stall the page for a moment; it was hard to feel. */
/* ---------- ambience (Oct 2026): a soft bed under the game. Wind that follows the hole's wind (with gusts), birds by region
   (Minnesota/Wisconsin: chickadees and robins, a loon now and then on holes with water; the South: mockingbirds and cicadas;
   the desert: quail and wrens, sparse), and once in a while a mower far off. Fades out on menus and pause, off with the sound. ---------- */
const AMB_SOUTH=new Set(['caledonia','trueblue','heritage','pawplant','orangeburg','santee','wyboo','rossbridge','legislator','judge','senator','crsc','crls','valley','ridge','gnlinks','gnlake']);
const AMB={bus:null,t:{},lv:0,reg:null};
function ambReg(){return CUR.scen==='desert'?'desert':AMB_SOUTH.has(CUR.id)?'south':'north';}
function ambNoise(a){if(!S.nb){S.nb=a.createBuffer(1,a.sampleRate,a.sampleRate);const c=S.nb.getChannelData(0);for(let i=0;i<c.length;i++)c[i]=Math.random()*2-1;}return S.nb;}
function ambInit(a){if(AMB.bus)return true;try{AMB.bus=a.createGain();AMB.bus.gain.value=0;AMB.bus.connect(OUT());
    const s=a.createBufferSource();s.buffer=ambNoise(a);s.loop=true;const lp=a.createBiquadFilter();lp.type='lowpass';lp.frequency.value=300;lp.Q.value=.4;const g=a.createGain();g.gain.value=0;
    const lfo=a.createOscillator(),lg=a.createGain();lfo.frequency.value=.09;lg.gain.value=0;lfo.connect(lg).connect(g.gain);lfo.start();
    const lfo2=a.createOscillator(),lg2=a.createGain();lfo2.frequency.value=.23;lg2.gain.value=0;lfo2.connect(lg2).connect(g.gain);lfo2.start();
    s.connect(lp).connect(g).connect(AMB.bus);s.start();Object.assign(AMB,{wg:g,wl:lg,wl2:lg2,wf:lp});return true;}catch(e){AMB.bus=null;return false;}}
function aT(f,d,vol,o={}){const a=S.ctx;if(!a||!AMB.bus)return;const t=a.currentTime+(o.at||0),os=a.createOscillator(),g=a.createGain();os.type=o.type||'sine';os.frequency.setValueAtTime(f,t);
  if(o.to)os.frequency.exponentialRampToValueAtTime(o.to,t+d*(o.tk||1));
  if(o.vib){const l=a.createOscillator(),lg=a.createGain();l.frequency.value=o.vib[0];lg.gain.value=o.vib[1];l.connect(lg).connect(os.frequency);l.start(t);l.stop(t+d+.05);}
  const at=Math.min(o.atk||.012,d*.4),rl=Math.min(o.rel||.03,d*.5);g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(vol,t+at);g.gain.setValueAtTime(vol,t+d-rl);g.gain.linearRampToValueAtTime(0,t+d);
  let n=os.connect(g);if(a.createStereoPanner){const p=a.createStereoPanner();p.pan.value=o.pan||0;n=n.connect(p);}n.connect(AMB.bus);os.start(t);os.stop(t+d+.05);}
const ambPan=()=>(Math.random()*2-1)*.8;
function ambChickadee(){const p=ambPan(),v=.013*(.6+Math.random()*.6),r=Math.random()<.4?2:1;for(let i=0;i<r;i++){aT(3950,.3,v,{pan:p,to:3880,at:i*1.1});aT(3350,.36,v,{pan:p,to:3290,at:i*1.1+.4});}}
function ambRobin(){const p=ambPan(),v=.011*(.6+Math.random()*.6),n=4+((Math.random()*5)|0);let t=0;for(let i=0;i<n;i++){const f=2000+Math.random()*1300,d=.1+Math.random()*.09;aT(f,d,v,{pan:p,to:f*(Math.random()<.5?1.18:.84),at:t});t+=d+.05+Math.random()*.07;}}
function ambMock(){const p=ambPan(),v=.011*(.6+Math.random()*.6),n=6+((Math.random()*6)|0);let t=0;const base=1700+Math.random()*1500;for(let i=0;i<n;i++){const f=base*(.8+Math.random()*.7),d=.06+Math.random()*.06;aT(f,d,v,{pan:p,to:f*(.7+Math.random()*.7),at:t});t+=d+.025;if(i%3===2)t+=.12;}}
function ambQuail(){const p=ambPan(),v=.012;aT(1850,.09,v,{pan:p,to:2150});aT(2650,.15,v,{pan:p,to:2950,at:.15});aT(2300,.13,v,{pan:p,to:1850,at:.36});}
function ambWren(){const p=ambPan(),v=.004;for(let i=0;i<7;i++)aT(1250+Math.random()*120,.055,v,{pan:p,type:'sawtooth',at:i*.1});}
function ambLoon(){const p=ambPan()*.6,v=.008;aT(560,1.7,v,{pan:p,to:850,tk:.3,vib:[5,5],atk:.35,rel:.5});aT(850,1.5,v*.9,{pan:p,to:620,tk:1,vib:[5,7],atk:.15,rel:.7,at:1.6});}
function ambCicada(){const a=S.ctx;if(!a||!AMB.bus)return;try{const t=a.currentTime,s=a.createBufferSource(),bp=a.createBiquadFilter(),g=a.createGain(),am=a.createGain(),lfo=a.createOscillator(),lg=a.createGain();
  s.buffer=ambNoise(a);s.loop=true;bp.type='bandpass';bp.frequency.value=4300+Math.random()*1200;bp.Q.value=7;lfo.frequency.value=38+Math.random()*20;lg.gain.value=.5;am.gain.value=.5;lfo.connect(lg).connect(am.gain);
  const v=.03,D=7+Math.random()*5;g.gain.setValueAtTime(0,t);g.gain.linearRampToValueAtTime(v,t+2.5);g.gain.setValueAtTime(v,t+D-3);g.gain.linearRampToValueAtTime(0,t+D);
  s.connect(bp).connect(am).connect(g).connect(AMB.bus);s.start(t);lfo.start(t);s.stop(t+D+.1);lfo.stop(t+D+.1);}catch(e){}}
function ambMower(){const p=ambPan(),D=14;aT(96,D,.006,{pan:p,type:'sawtooth',vib:[7,2],atk:4,rel:4});aT(192,D,.003,{pan:p,type:'triangle',vib:[7,3],atk:4,rel:4});}
function ambTick(dt){const a=S.ctx;if(!a)return;
  const want=S.on&&!!G.hole&&!G.paused&&!document.hidden&&!COVERS.some(m=>!m.hidden)&&G.state!=='card'&&!REC.on;
  if(!want&&!AMB.bus)return;if(!ambInit(a))return;
  const tgt=want?1:0;if(tgt!==AMB.lv){AMB.lv=tgt;AMB.bus.gain.setTargetAtTime(tgt,a.currentTime,tgt?1.5:.2);}
  if(!want)return;
  const mph=Math.min(22,(G.wind&&G.wind.mph)||0),wg=.01+mph*.0024,ct=a.currentTime;
  AMB.wg.gain.setTargetAtTime(wg,ct,1);AMB.wl.gain.setTargetAtTime(wg*.4,ct,1);AMB.wl2.gain.setTargetAtTime(wg*.25,ct,1);AMB.wf.frequency.setTargetAtTime(220+mph*24,ct,1);
  const reg=ambReg();if(reg!==AMB.reg){AMB.reg=reg;AMB.t={};}
  const T_=AMB.t,dim=(R3.wx||0)>=2?.55:1,ev=(k,lo,hi,fn)=>{if(T_[k]===undefined)T_[k]=lo*.3+Math.random()*(hi-lo)*.4;T_[k]-=dt;if(T_[k]<=0){T_[k]=lo+Math.random()*(hi-lo);try{fn();}catch(e){}}};
  if(reg==='north'){ev('bird',5/dim,12/dim,()=>Math.random()<.5?ambChickadee():ambRobin());if(G.hole.water&&G.hole.water.length)ev('loon',45,110,ambLoon);}
  else if(reg==='south'){ev('bird',5/dim,13/dim,ambMock);ev('cic',16,38,ambCicada);}
  else ev('bird',9,22,()=>Math.random()<.55?ambQuail():ambWren());
  ev('mow',140,320,ambMower);}

