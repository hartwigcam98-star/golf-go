/* ---------- boot ---------- */
function bootCourse(data){let lc=null;try{lc=localStorage.getItem('golf-course');}catch(e){}if(data&&data.course)lc=data.course;return lc&&COURSES[lc]?lc:'troy';}
function bootWait(id,then){const lm=$('loadM'),sp=lm&&lm.querySelector('span'),nm=COURSES[id].name;
  const go=()=>{if(sp)sp.textContent='Loading '+nm+'\u2026';const rb=$('loadRetry');if(rb)rb.remove();
    courseFetch(id,f=>{if(sp)sp.textContent='Loading '+nm+'\u2026 '+Math.round(f*100)+'%';}).then(then,()=>{if(sp)sp.textContent='Couldn\u2019t load '+nm+'. Check your connection.';
      if(lm&&!$('loadRetry')){const b=document.createElement('button');b.id='loadRetry';b.className='primary disp';b.textContent='Try again';b.onclick=go;lm.appendChild(b);}});};
  go();}
function boot(data){
  if(B10&&!window.__b10){window.__b10=1;if(!B10T){b10Load(()=>boot(data));return;}let h=1,c='troy';try{const m=location.search.match(/[?&]h=(\d+)/);if(m)h=+m[1];const k=location.search.match(/[?&]c=([a-z0-9_]+)/);if(k&&COURSES[k[1]])c=k[1];}catch(e){}b10Load(()=>boot({course:c,hi:Math.max(0,h-1),mode:'practice'}));return;}
  {const id=bootCourse(data||{});if(!courseReady(id)){bootWait(id,()=>boot(data));return;}}
  const b0=performance.now();
  {const lm=$('loadM');if(lm)lm.remove();}
  resize();
  let ok=false;try{ok=r3Init();if(ok){document.querySelectorAll('#gfxSeg button').forEach(b=>b.addEventListener('click',e=>{e.stopPropagation();r3SetQuality(b.dataset.g==='high'?'high':'fast');}));r3SetQuality(R3.q,true);}}catch(e){console.error(e);ok=false;}
  if(!ok){const d=document.createElement('div');d.className='nogl';d.textContent='This game needs WebGL, which this browser has turned off. Try another browser or device.';$('game').appendChild(d);return;}
  data=data||{};setCourse(bootCourse(data),!B10T);buildHoleGrid();
  if(Number.isInteger(data.hi)){G.mode=data.mode==='practice'?'practice':'round';if(Array.isArray(data.scores))G.scores=data.scores;startHole(clamp(data.hi,0,TB.length-1));}
  else{const sv=loadSave();if(sv)teeUse(sv.tee);G.mode='round';G.pinSeed=sv&&sv.pin||0;G.scores=sv&&Array.isArray(sv.scores)?sv.scores:[];startHole(sv?sv.hi:0);$('introM').hidden=true;openMenu(false);G.paused=false;}
  try{const nv=performance.getEntriesByType&&performance.getEntriesByType('navigation')[0];   // bs: scripts read and boot begun; sync: boot's own work; ff (on the 2nd frame): on screen, all from page open
    LDT.boot={bs:Math.round(b0),sync:Math.round(performance.now()-b0),html:nv?Math.round(nv.responseEnd):null,kb:nv?Math.round((nv.transferSize||0)/1024):null,sw:!!(navigator.serviceWorker&&navigator.serviceWorker.controller)};
    LDT.p={k:'boot',t0:b0,n:0};}catch(e){}
  requestAnimationFrame(frame);
  if(CFILES)setTimeout(()=>{try{coursePrefetch([dailyCourse(dailyDay()),homeCourse(),CUR&&CUR.id]);}catch(e){}},8000);
}

try{window.claude?.hot?.snapshot?.(()=>G.mode==='career'?{course:CUR.id}:({hi:G.hi,scores:G.scores,mode:G.mode,course:CUR.id}));}catch(e){}
if(window.claude?.hot?.ready)window.claude.hot.ready(boot);else boot(window.claude?.hot?.data??{});
})();
