/* ---------- course requests: saved as feedback (kind 'course', message starts "[Request]"); your own requests are kept on the phone ---------- */
const reqNorm=t=>String(t||'').toLowerCase().replace(/&/g,' and ').replace(/[’']/g,'').replace(/\b(the|golf|club|course|country|cc|gc|links|at)\b/g,' ').replace(/[^a-z0-9]+/g,' ').trim();
function reqMatch(name){const n=reqNorm(name);if(n.length<3)return null;
  for(const id in COURSES){const c=reqNorm(COURSES[id].name);if(c&&(c===n||(c.length>=4&&n.includes(c))||(n.length>=4&&c.includes(n))))return id;}return null;}
function reqList(){try{return JSON.parse(localStorage.getItem('golf-requests')||'[]');}catch(e){return [];}}
function reqShowMine(){const L=reqList(),el=$('reqMine');if(!L.length){el.hidden=true;return;}
  const esc=t=>String(t).replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  el.innerHTML='<b>Your requests</b>'+L.slice(0,8).map(r=>{const id=reqMatch(r.course);return '<div><span>'+esc(r.course)+(r.town?' · '+esc(r.town):'')+'</span>'+(id?'<em class="done">Added ✓</em>':'<em>Requested '+esc(r.date||'')+'</em>')+'</div>';}).join('');el.hidden=false;}
// one request per player at a time: a request still waiting (not in the game yet, under 14 days old) blocks a new one
function reqWaiting(){return reqList().find(r=>!reqMatch(r.course)&&(!r.t||Date.now()-r.t<14*864e5))||null;}
function reqGate(){const w=reqWaiting(),st=$('reqStatus');$('reqSend').disabled=!!w;
  if(w){st.textContent='You have a request waiting ('+w.course+'). You can ask for another once it\u2019s added.';st.className='';}return !!w;}
function reqCheck(){const id=reqMatch($('reqName').value),el=$('reqHave');
  if(!id){el.hidden=true;return;}const C=COURSES[id];
  el.innerHTML='<b>'+C.name+'</b> ('+C.town+') is already in the game.<button class="ghost disp" id="reqPlay">Play it</button>';el.hidden=false;
  $('reqPlay').addEventListener('click',()=>{A();$('reqM').hidden=true;pickCourse(id);});}
function openReq(){$('reqStatus').textContent='';$('reqStatus').className='';$('reqSend').disabled=false;reqCheck();reqShowMine();reqGate();$('reqM').hidden=false;sfx.tick();}
async function sendReq(){const course=$('reqName').value.trim(),town=$('reqTown').value.trim(),note=$('reqNote').value.trim(),st=$('reqStatus');
  if(reqGate())return;
  if(course.length<3){st.textContent='Add the course name.';st.className='err';$('reqName').focus();return;}
  if(town.length<2){st.textContent='Add the town and state so we find the right one.';st.className='err';$('reqTown').focus();return;}
  if(!DAILY.url){st.textContent='Requests aren’t switched on yet.';st.className='err';return;}
  $('reqSend').disabled=true;st.textContent='Sending…';st.className='';
  const msg=('[Request] '+course+' — '+town+(note?'\n'+note:'')).slice(0,2000);
  try{const r=await fetch(DAILY.url+'/rest/v1/feedback',{method:'POST',headers:dailyHdr({'Content-Type':'application/json',Prefer:'return=minimal'}),
      body:JSON.stringify({player_id:dailyPid(),name:dailyName()||'',kind:'course',message:msg,ctx:{request:{course,town,note},have:CUR&&CUR.id,ver:window.GOLF_VER||''}})});
    if(r.ok){const L=reqList();L.unshift({course,town,t:Date.now(),date:new Date().toLocaleDateString(undefined,{month:'short',day:'numeric'})});try{localStorage.setItem('golf-requests',JSON.stringify(L.slice(0,20)));}catch(e){}
      st.textContent='Thanks! Your request is in.';st.className='ok';$('reqName').value='';$('reqTown').value='';$('reqNote').value='';$('reqHave').hidden=true;reqShowMine();$('reqSend').disabled=true;return;}
    st.textContent='Couldn’t send it (error '+r.status+'). Try again in a bit.';st.className='err';}
  catch(e){st.textContent='Couldn’t send it. Check your connection and try again.';st.className='err';}
  $('reqSend').disabled=false;}
$('mReq').addEventListener('click',()=>{A();openReq();});
$('stReq').addEventListener('click',()=>{A();openReq();});
$('reqSend').addEventListener('click',()=>{A();sendReq();});
$('reqClose').addEventListener('click',()=>{A();$('reqM').hidden=true;});
$('reqName').addEventListener('input',reqCheck);
$('pFaq').addEventListener('click',()=>{A();openFaq();});
$('pCard').addEventListener('click',()=>{A();openPauseCard();});
$('pCardBack').addEventListener('click',()=>{A();$('pCardView').hidden=true;$('pMain').hidden=false;});
$('pCardResume').addEventListener('click',()=>{A();$('pResume').click();});
$('faqClose').addEventListener('click',()=>{A();$('faqM').hidden=true;sfx.tick();});
$('faqGo').addEventListener('click',()=>{A();faqAsk();});
$('faqQ').addEventListener('keydown',e=>{e.stopPropagation();if(e.key==='Enter'&&!e.shiftKey){e.preventDefault();faqAsk();}});
$('pFb').addEventListener('click',()=>{A();openFeedback();});
$('fbBack').addEventListener('click',()=>{A();if(PAUSE.fbOnly){closeSettings();return;}$('pFbView').hidden=true;$('pMain').hidden=false;});
$('pHome').addEventListener('click',()=>{A();closeSettings();});
$('mSet').addEventListener('click',()=>{A();openSettings(false);});
$('mFb').addEventListener('click',()=>{A();openSettings(true);});
$('fbSend').addEventListener('click',()=>{A();sendFeedback();});
document.querySelectorAll('#fbKind button').forEach(b=>b.addEventListener('click',()=>{A();PAUSE.kind=b.dataset.k;document.querySelectorAll('#fbKind button').forEach(x=>x.classList.toggle('on',x===b));}));
document.querySelectorAll('#pSound button').forEach(b=>b.addEventListener('click',()=>{if((b.dataset.v==='1')!==!!S.on)$('soundBtn').click();pauseSync();}));
document.querySelectorAll('#pTrz button').forEach(b=>b.addEventListener('click',()=>{TRZ=+b.dataset.z;try{localStorage.setItem('golf-trz',String(TRZ));}catch(_){}pauseSync();}));
document.querySelectorAll('#pGrid button').forEach(b=>b.addEventListener('click',()=>{GRDK=b.dataset.g==='1';try{localStorage.setItem('golf-grid',GRDK?'1':'0');}catch(_){}if(R3.GU&&R3.GU.slDk)R3.GU.slDk.value=GRDK?1:0;pauseSync();}));
document.querySelectorAll('#pSwing button').forEach(b=>b.addEventListener('click',()=>{SWT=b.dataset.s==='1';try{localStorage.setItem('golf-swt',SWT?'1':'0');}catch(_){}pauseSync();}));
document.querySelectorAll('#pFps button').forEach(b=>b.addEventListener('click',()=>{FPSM.on=b.dataset.f==='1';try{localStorage.setItem('golf-fps',FPSM.on?'1':'0');}catch(_){}FPSM.n=0;FPSM.t0=0;fpsTick(performance.now(),0);pauseSync();}));
document.querySelectorAll('#pGfx button').forEach(b=>b.addEventListener('click',()=>{try{r3SetQuality(b.dataset.g==='high'?'high':'fast');}catch(e){}pauseSync();}));
$('pauseM').addEventListener('click',e=>{if(e.target===$('pauseM')){if(PAUSE.home)closeSettings();else closePause();}});

let newArmed=false;
function newRound(){endMatchMode();if(R3.on)r3NewWx();dailyLeave();G.mode='round';G.pinSeed=0;G.rShots=[];G.scores=[];G.psLeft=3;clearSave();closeMenu();startHole(0);}
function continueRound(){endMatchMode();dailyLeave();const sv=loadSave();if(!sv){newRound();return;}teeUse(sv.tee);G.pinSeed=sv.pin||0;G.rShots=Array.isArray(sv.shots)?sv.shots:[];G.psLeft=Number.isInteger(sv.ps)?sv.ps:3;
  G.mode='round';G.scores=Array.isArray(sv.scores)?sv.scores:[];closeMenu();startHole(sv.hi);
  if(((sv.mid&&sv.strokes>0)||sv.pend)&&sv.ball){$('introM').hidden=true;G.strokes=sv.strokes;G.ball={x:sv.ball.x,y:sv.ball.y};G.prev=sv.prev?{x:sv.prev.x,y:sv.prev.y}:{...G.ball};if(sv.wind)G.wind=sv.wind;
    prepareShot();const t=camTarget();cam.E=[...t.E];cam.L=[...t.L];if(!pendResume(sv.pend))toast('WELCOME BACK','Hole '+(sv.hi+1)+' \u00b7 stroke '+(sv.strokes+1),'#8ee6a8');}}
function playHole(i){endMatchMode();if(R3.on)r3NewWx();dailyLeave();G.mode='practice';G.scores=[];G.psLeft=3;closeMenu();startHole(i);}
function buildHoleGrid(){const g=$('holeGrid');let h='';for(let i=0;i<TB.length;i++){if(i===0||i===9)h+='<div class="nine">'+(i?'Back nine':'Front nine')+'</div>';
  h+='<button data-h="'+i+'" aria-label="Hole '+(i+1)+', par '+TB[i].par+'"><b>'+(i+1)+'</b><span>Par '+TB[i].par+'</span><span>'+holeLen(i)+'y</span></button>';}g.innerHTML=h;
  g.querySelectorAll('button[data-h]').forEach(b=>b.addEventListener('click',()=>{A();playHole(+b.dataset.h);}));}

