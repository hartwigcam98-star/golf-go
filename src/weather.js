/* ---- weather: each round draws one of four days, from bright sun to a grey overcast ---- */
const R3_WX=[{n:'Sunny',sun:1,ex:1,env:1,cov:.3,g:0},                       // the original look
  {n:'Partly cloudy',sun:.68,ex:.94,env:1.05,cov:.56,g:.25},
  {n:'Cloudy',sun:.42,ex:.8,env:.95,cov:.86,g:.62},
  {n:'Overcast',sun:.2,ex:.68,env:.88,cov:1,g:.92}];
function r3RandWx(){return Math.floor(Math.random()*R3_WX.length);}
function r3ApplyWx(i,announce){const w=R3_WX[i]||R3_WX[0];R3.wx=i;R3.sunK=w.sun;R3.expoK=w.ex;R3.envK=w.env;CLOUDS_COV=w.cov;R3.U.wxG.value=w.g;r3EnvBuild();
  if(announce)setTimeout(()=>{try{toast(w.n.toUpperCase(),"Today's conditions",'#bfe3ff');}catch(e){}},1400);}
/* Oct 24 2026: holes that went dark until the app was relaunched (Pappa, Wigwam daily; iOS had reloaded the game in the background).
   The sky light (the image-based light from r3EnvBuild), the kept tree shadows and the far-tree pictures are drawn once and kept;
   drawn while the app is hidden, or lost with the GPU context, they come back black and every lit surface goes dark. Redraw them
   whenever the app comes back to the front and after a restored context. */
function r3Refresh(){if(!R3.on||!R3.renderer||document.hidden)return;try{r3EnvBuild();}catch(e){}
  try{if(R3.shc)R3.shc.valid=false;R3.renderer.shadowMap.needsUpdate=true;}catch(e){}try{if(R3T.impBaked){R3T.impBaked=0;r3tImpBake();}}catch(e){}try{R3.post.dirty=true;}catch(e){}}
document.addEventListener('visibilitychange',()=>{if(!document.hidden)setTimeout(r3Refresh,250);});addEventListener('pageshow',e=>{if(e.persisted)setTimeout(r3Refresh,250);});
function r3NewWx(){const i=r3RandWx();try{localStorage.setItem('golf-wx',String(i));}catch(e){}r3ApplyWx(i,true);}
function r3RoundWx(){let i=null;try{const v=localStorage.getItem('golf-wx');if(v!==null)i=+v;}catch(e){}if(!(i>=0&&i<R3_WX.length)){i=r3RandWx();try{localStorage.setItem('golf-wx',String(i));}catch(e){}}r3ApplyWx(i,false);}

/* v95: a pixel budget per quality level (High about 3.2 million pixels, a phone uses about 1.3), so a big desktop or Retina laptop
   window starts at a sensible resolution instead of drawing four times a phone's pixels and waiting for the step-down */
function r3Resize(){if(!R3.renderer)return;if(typeof HTR==='object')HTR.m+='rsz'+Math.round((R3.dyn||1)*100)+' ';const q=r3Q(),budget=3.2e6*(q.dpr/2)*(q.dpr/2),pr=Math.max(.5,Math.max(q.floor||.85,Math.min(q.dpr,window.devicePixelRatio||1,Math.sqrt(budget/Math.max(1,W*H))))*(R3.dyn||1));R3.renderer.setPixelRatio(pr);R3.renderer.setSize(W,H,false);R3.post.dirty=true;}
function r3SetQuality(name,auto){R3.q=name;if(!auto&&R3.renderer){R3.perf=0;R3.dyn=1;PERF.cap=0;PERF.steps=0;PERF.upQ=null;PERF.tryD=null;PERF.backQ=null;PERF.mid=0;PERF.midNeed=4;PERF.stuck=0;PERF.slow=0;PERF.w=[];try{localStorage.removeItem('golf-perf2');localStorage.setItem('golf-gfx-set','user');}catch(e){}}   /* choosing a setting by hand starts the automatic step-down afresh (v87) */
  try{localStorage.setItem('golf-gfx',name==='high'?'high':'fast');}catch(e){}
  document.querySelectorAll('#gfxSeg button').forEach(b=>b.classList.toggle('on',(b.dataset.g==='high')===(name==='high')));r3Resize();}
function r3SetPerf(level){if(typeof HTR==='object')HTR.m+='lvl'+level+' ';R3.perf=level;r3Resize();r3LiteShadows();if(R3T.groups)r3TreeLOD(true);}
/* v121: the lightest levels leave the distant (light) trees out of the shadow pass */
function r3LiteShadows(){const q=r3Q(),on=q.liteSh!==false&&!b10Hole();for(const g of (R3T.groups||[]))for(const im of g.lite)im.castShadow=on;}

