/* ---------- pause screen and feedback (v102) ---------- */
const PAUSE={shot:null,kind:'bug'};
function pauseShot(){try{render();const gl=$('gl'),c=$('c'),k=Math.min(1,640/Math.max(gl.width,gl.height)),w=Math.round(gl.width*k),h=Math.round(gl.height*k);
  const t=document.createElement('canvas');t.width=w;t.height=h;const g=t.getContext('2d');g.fillStyle='#0f2233';g.fillRect(0,0,w,h);g.drawImage(gl,0,0,w,h);g.drawImage(c,0,0,w,h);return t.toDataURL('image/jpeg',.72);}catch(e){return null;}}
function pauseCtx(){const h=G.hole;let tp=0,n=0;(G.scores||[]).forEach((x,i)=>{if(x){tp+=x-TB[i].par;n++;}});
  return{course:CUR&&CUR.id,hole:(G.hi??-1)+1,mode:G.mode,stroke:(G.strokes||0)+1,lie:G.lie,state:G.state,toPar:n?tp:null,thru:n,ver:window.GOLF_VER||'',gfx:R3&&R3.q,
    screen:innerWidth+'x'+innerHeight+'@'+(devicePixelRatio||1),ua:navigator.userAgent.slice(0,180),app:matchMedia('(display-mode: standalone)').matches||!!navigator.standalone};}
function inRound(){return!!G.hole&&G.state!=='intro'&&G.mode!=='spectate'&&G.mode!=='highlight'&&$('menuM').hidden;}
function pauseSync(){document.querySelectorAll('#pTrz button').forEach(b=>b.classList.toggle('on',+b.dataset.z===TRZ));document.querySelectorAll('#pGrid button').forEach(b=>b.classList.toggle('on',(b.dataset.g==='1')===GRDK));document.querySelectorAll('#pSwing button').forEach(b=>b.classList.toggle('on',(b.dataset.s==='1')===SWT));document.querySelectorAll('#pFps button').forEach(b=>b.classList.toggle('on',(b.dataset.f==='1')===!!FPSM.on));document.querySelectorAll('#pSound button').forEach(b=>b.classList.toggle('on',(b.dataset.v==='1')===!!S.on));

  document.querySelectorAll('#pGfx button').forEach(b=>b.classList.toggle('on',(b.dataset.g==='high')===(R3.q==='high')));}
function openPause(){PAUSE.shot=pauseShot();G.paused=true;const c=pauseCtx();
  $('pSub').textContent=(CUR?CUR.name:'')+' \u00b7 hole '+c.hole+(c.thru?' \u00b7 '+fmtDiff(c.toPar)+' thru '+c.thru:'');
  $('pQuitSub').textContent=G.mode==='daily'?'Today\u2019s round is saved. Pick it up from the Daily round button.':G.mode==='career'?'Your match is saved. Continue it from the menu.':G.mode==='practice'?'Practice holes aren\u2019t saved.':'Your round is saved. Continue it any time from the menu.';
  pauseMode(false);$('pMain').hidden=false;$('pFbView').hidden=true;$('pCardView').hidden=true;pauseSync();$('pauseM').hidden=false;}
/* Oct 2026: the same settings and feedback, opened from the home screen (no round buttons; Done goes back to the menu) */
function pauseMode(home){PAUSE.home=home;PAUSE.fbOnly=false;$('pTitle').textContent=home?'Settings':'Paused';for(const id of['pSub','pResume','pCard','pQuit','pQuitSub'])$(id).hidden=home;$('pHome').hidden=!home;}
function openSettings(fb){PAUSE.shot=null;pauseMode(true);$('pMain').hidden=false;$('pFbView').hidden=true;$('pCardView').hidden=true;pauseSync();$('pauseM').hidden=false;if(fb){openFeedback();PAUSE.fbOnly=true;}}
function closeSettings(){$('pauseM').hidden=true;pauseMode(false);}
/* the pause-menu scorecard: yardage and par for every hole, with the round's scores so far (a match shows both players) */
function pauseCardTable(from,label,withTot){const idx=[...Array(9)].map((_,k)=>from+k),cur=G.hi,cl=i=>i===cur?' class="cur"':'';
  const yd=idx.map(i=>holeLen(i)),ydAll=TB.map((_,i)=>holeLen(i)).reduce((a,b)=>a+b,0),sum=a=>a.reduce((x,y)=>x+(y||0),0);
  const cell=(i,v)=>'<td'+cl(i)+'>'+(v?'<span class="sc '+scClass(v,TB[i].par)+'">'+v+'</span>':'')+'</td>';
  const row=(nm,sc)=>'<tr><td>'+escH(nm)+'</td>'+idx.map(i=>cell(i,sc[i])).join('')+'<td class="tot">'+(sum(idx.map(i=>sc[i]))||'')+'</td>'+(withTot?'<td class="tot">'+(sum(sc)||'')+'</td>':'')+'</tr>';
  const rows=MATCH.on&&MATCH.sy?[row('You',MATCH.sy),row((MATCH.r?rn(MATCH.r):'Rival').split(' ')[0].slice(0,9),MATCH.so||[])]:[row(G.mode==='daily'?((dailyName()||'You').split(' ')[0].slice(0,9)):'You',G.scores)];
  return '<thead><tr><th>Hole</th>'+idx.map(i=>'<th'+cl(i)+'>'+(i+1)+'</th>').join('')+'<th class="tot">'+label+'</th>'+(withTot?'<th class="tot">Tot</th>':'')+'</tr></thead><tbody>'
    +'<tr><td>Yds</td>'+idx.map((i,k)=>'<td class="yd'+(i===cur?' cur':'')+'">'+yd[k]+'</td>').join('')+'<td class="tot yd">'+yd.reduce((a,b)=>a+b,0)+'</td>'+(withTot?'<td class="tot yd">'+ydAll+'</td>':'')+'</tr>'
    +'<tr><td>Par</td>'+idx.map(i=>'<td'+cl(i)+'>'+TB[i].par+'</td>').join('')+'<td class="tot">'+sum(idx.map(i=>TB[i].par))+'</td>'+(withTot?'<td class="tot">'+TOTAL_PAR+'</td>':'')+'</tr>'
    +rows.join('')+'</tbody>';}
function openPauseCard(){const c=pauseCtx();$('pCardSub').textContent=(CUR?CUR.name+' \u00b7 ':'')+(CUR&&teeName()?teeName()+' \u00b7 ':'')+'hole '+c.hole+(c.thru?' \u00b7 '+fmtDiff(c.toPar)+' thru '+c.thru:'');
  $('pc1').innerHTML=pauseCardTable(0,'Out',false);$('pc2').innerHTML=pauseCardTable(9,'In',true);$('pMain').hidden=true;$('pCardView').hidden=false;}
function closePause(){$('pauseM').hidden=true;G.paused=false;}
function openFeedback(){$('pMain').hidden=true;$('pFbView').hidden=false;$('fbStatus').textContent='';$('fbStatus').className='';$('fbSend').disabled=false;
  const ok=!!PAUSE.shot;$('fbShotRow').hidden=!ok;if(ok)$('fbShotImg').src=PAUSE.shot;$('fbShotOn').checked=ok;}
async function sendFeedback(){const msg=$('fbText').value.trim(),st=$('fbStatus');if(!msg){st.textContent='Write a quick note first.';st.className='err';$('fbText').focus();return;}
  if(!DAILY.url){st.textContent='Feedback isn\u2019t switched on yet.';st.className='err';return;}
  $('fbSend').disabled=true;st.textContent='Sending\u2026';st.className='';
  const body={player_id:dailyPid(),name:dailyName()||'',kind:PAUSE.kind,message:msg.slice(0,2000),ctx:pauseCtx(),shot:$('fbShotOn').checked&&PAUSE.shot?PAUSE.shot:null};
  const post=b=>fetch(DAILY.url+'/rest/v1/feedback',{method:'POST',headers:dailyHdr({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(b)});
  try{let r=await post(body);if(!r.ok&&r.status!==404&&body.shot){body.shot=null;r=await post(body);}
    if(r.ok){st.textContent='Thanks! Your feedback was sent.';st.className='ok';$('fbText').value='';setTimeout(()=>{if(!$('pauseM').hidden){if(PAUSE.fbOnly){closeSettings();return;}$('pFbView').hidden=true;$('pMain').hidden=false;}},1400);return;}
    st.textContent=r.status===404?'Feedback isn\u2019t switched on yet.':'Couldn\u2019t send it (error '+r.status+'). Try again in a bit.';st.className='err';}
  catch(e){st.textContent='Couldn\u2019t send it. Check your connection and try again.';st.className='err';}
  $('fbSend').disabled=false;}
$('pResume').addEventListener('click',()=>{A();closePause();});
$('pQuit').addEventListener('click',()=>{A();$('pauseM').hidden=true;openMenu(true);});

