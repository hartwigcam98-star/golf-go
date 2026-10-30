/* ---------- a golfer's daily card, and watching their round ---------- */
const DCARD={};
function dcTable(C,sc,from,label,withTot,nm,live){const tb=C.tb,tp=tb.reduce((a,h)=>a+h.par,0);let tot=0,ptot=0;const idx=[...Array(9)].map((_,k)=>from+k);
  const head='<thead><tr><th>Hole</th>'+idx.map(i=>'<th'+(live&&live.has(i)?' class="tap" data-h="'+i+'" role="button"':'')+'>'+(i+1)+'</th>').join('')+'<th class="tot">'+label+'</th>'+(withTot?'<th class="tot">Tot</th>':'')+'</tr></thead>';
  const par='<tr><td>Par</td>'+idx.map(i=>{ptot+=tb[i].par;return'<td>'+tb[i].par+'</td>';}).join('')+'<td class="tot">'+ptot+'</td>'+(withTot?'<td class="tot">'+tp+'</td>':'')+'</tr>';
  const row='<tr><td>'+escH(nm)+'</td>'+idx.map(i=>{const v=sc[i];if(v)tot+=v;return'<td>'+(v?'<span class="sc '+scClass(v,tb[i].par)+'">'+v+'</span>':'')+'</td>';}).join('')+'<td class="tot">'+(tot||'')+'</td>'+(withTot?'<td class="tot">'+(sc.reduce((a,b)=>a+(b||0),0)||'')+'</td>':'')+'</tr>';
  return head+'<tbody>'+par+row+'</tbody>';}
function dcDraw(live){const C=COURSES[DCARD.cid],nm=(DCARD.r.name||'').split(' ')[0].slice(0,9);$('dc1').innerHTML=dcTable(C,DCARD.sc,0,'Out',false,nm,live);$('dc2').innerHTML=dcTable(C,DCARD.sc,9,'In',true,nm,live);}
async function openDailyCard(i){const r=DAILY.rows&&DAILY.rows[i];if(!r)return;const day=DAILY.view.day,C=COURSES[r.course]||COURSES[dailyCourse(day)];
  DCARD.r=r;DCARD.day=day;DCARD.cid=C.id;DCARD.shots=null;const tok=DCARD.tok=(DCARD.tok||0)+1;
  $('dBoard').hidden=true;$('dCardV').hidden=false;$('dTitle').textContent=r.name;
  $('dEyebrow').textContent=C.name+' · '+(day===dailyDay()?'today':new Date(day+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'}));
  $('dcSub').textContent=r.strokes+' strokes · '+fmtDiff(r.to_par);DCARD.sc=Array.isArray(r.holes)?r.holes.map(v=>+v||0):[];dcDraw(null);
  $('dcWatch').hidden=true;$('dcHint').textContent='Loading replays…';
  let res=null,err=false;try{const q=await fetch(DAILY.url+'/rest/v1/daily_scores?select=shots&day=eq.'+day+'&player_id=eq.'+encodeURIComponent(r.player_id)+'&limit=1',{headers:dailyHdr()});if(q.ok)res=await q.json();else err=true;}catch(e){err=true;}
  if(tok!==DCARD.tok)return;const S=res&&res[0]&&res[0].shots;
  if(S&&Array.isArray(S.s)&&S.s.length){DCARD.shots=S;dcDraw(new Set(S.s.map(x=>x.h)));$('dcHint').textContent='Tap a hole number to watch it';$('dcWatch').hidden=false;}
  else $('dcHint').textContent=err?'Replays aren’t switched on for the leaderboard yet.':'No replays for this round. It was played before replays were saved.';}
function closeDailyCard(){DCARD.tok=(DCARD.tok||0)+1;openDailyBoard(false,DAILY.view.day,'day');}
// spectating: load the course and hole, then play each recorded shot through the replay camera
const SPEC={on:false,ff:1};
// spectating speed (1x, 2x, 4x) runs the whole round faster: swings, the ball, the pauses between shots and holes; remembered on this phone
try{const v=+localStorage.getItem('golf-specff');if(v===2||v===4)SPEC.ff=v;}catch(e){}
function specFFShow(){const b=$('specFF');if(!b)return;b.textContent='\u23e9 '+SPEC.ff+'\u00d7';b.classList.toggle('on',SPEC.ff>1);b.setAttribute('aria-label','Playback speed '+SPEC.ff+' times');}
function specFFCycle(){SPEC.ff=SPEC.ff===1?2:SPEC.ff===2?4:1;try{localStorage.setItem('golf-specff',String(SPEC.ff));}catch(e){}specFFShow();}
var REC={on:false,blob:null};   // replay video recorder (see recStart)
function specStart(hi){if(DCARD&&courseGate(DCARD.cid,()=>specStart(hi)))return;const S=DCARD.shots;if(!S)return;const holes=[...new Set(S.s.map(x=>x.h))].sort((a,b)=>a-b);if(!holes.length)return;A();
  const rec=DCARD.src==='rec',fromRec=rec||DCARD.src==='recd';
  endMatchMode();Object.assign(SPEC,{on:true,S,holes,name:DCARD.r.name,sc:DCARD.sc,pinSeed:rec?(S.pin||0):0,back:{day:DCARD.day,pid:DCARD.r.player_id,rec:fromRec?DCARD.cid:null}});
  G.mode='spectate';G.dailyDay=DCARD.day;G.dailySeed=rec?((S.pin||1)%1000003):dailyNum(DCARD.day)*7919;
  $('dailyM').hidden=true;$('recM').hidden=true;$('menuM').hidden=true;G.paused=false;$('game').classList.add('spec');$('specBar').hidden=false;resize();
  setCourse(DCARD.cid,false);if(rec&&S.wx!=null&&typeof R3!=='undefined'&&R3.on&&typeof r3ApplyWx==='function')r3ApplyWx(S.wx,true);else dailyWeather(DCARD.day);
  if(S.ch&&S.ch!==CHAR_ID&&typeof r3GolferSet==='function')try{r3GolferSet(S.ch);}catch(e){}
  const h0=holes.includes(hi)?hi:(holes.find(h=>h>=hi)??holes[0]);specHole(h0);}
function specHole(hi){if(!SPEC.on)return;SPEC.hi=hi;SPEC.list=SPEC.S.s.filter(x=>x.h===hi);SPEC.k=0;
  G.scores=SPEC.sc.slice(0,hi);startHole(hi);$('introM').hidden=true;later(1.2,specShot);}
function specShot(){if(!SPEC.on)return;const s=SPEC.list[SPEC.k];
  if(!s){const v=SPEC.sc[SPEC.hi],par=TB[SPEC.hi].par,n=v?scoreName(v,par).replace('!',''):'';
    toast('HOLE '+(SPEC.hi+1),SPEC.name+(v?' · '+v+' · '+n.charAt(0)+n.slice(1).toLowerCase():''),'#8ee6a8');
    const nx=SPEC.holes.find(h=>h>SPEC.hi);later(2.6,()=>nx!=null?specHole(nx):specEnd());return;}
  const rec=dailyDecShot(s);if(rec.length<2){SPEC.k++;specShot();return;}
  while(rec.length<6){const e=rec[rec.length-1];rec.push({...e,t:e.t+.05});}
  G.ball={x:rec[0].x,y:rec[0].y};G.prev={...G.ball};G.strokes=SPEC.k+1;G.fromLie=lieAt(s.gx,s.gy);G.lie=G.fromLie;G.shotRot=s.a;G.aim=s.a;
  G.swingClub=s.c;G.swingType=s.k;G.swingBack=s.b;G.inCup=false;
  G.lastShot={rec,golferAt:{x:s.gx,y:s.gy,aim:s.a},launchAt:s.l||(s.k==='putt'?PUTT_IMPACT:IMPACT_T),holed:!!s.o,putt:s.k==='putt',flame:s.f===2?'red':s.f===1?'blue':null};
  startReplay(()=>{if(!SPEC.on)return;const e=rec[rec.length-1];G.ball={x:e.x,y:e.y};G.inCup=!!s.o;SPEC.k++;later(.45,specShot);});}
function specNext(){if(!SPEC.on)return;A();G.waitFn=null;if(G.replay){G.replay.done=null;endReplay();}const nx=SPEC.holes.find(h=>h>SPEC.hi);if(nx!=null)specHole(nx);else specEnd();}
function specEnd(back=true){if(!SPEC.on)return;SPEC.on=false;G.waitFn=null;if(G.replay){G.replay.done=null;endReplay();}
  $('game').classList.remove('spec');$('specBar').hidden=true;resize();
  if(SPEC.S&&SPEC.S.ch&&SPEC.S.ch!==CHAR_ID&&typeof r3GolferSet==='function')try{r3GolferSet(CHAR_ID);}catch(e){}
  G.state='intro';G.paused=true;
  DCARD.src=null;
  if(back&&SPEC.back.rec){const b=SPEC.back;openRecords(b.rec).then(()=>{const i=(RECS.rows||[]).findIndex(r=>r.player_id===b.pid);if(i>=0)recCard(i);});return;}
  if(back){const b=SPEC.back;openDailyBoard(false,b.day,'day').then(()=>{const i=(DAILY.rows||[]).findIndex(r=>r.player_id===b.pid);if(i>=0)openDailyCard(i);});}}
// every round ever posted, folded into one table: wins, rounds played, average to par and best round
async function dailyAllTime(){const list=$('dList');let rows=null;
  if(DAILY.url)try{const r=await fetch(DAILY.url+'/rest/v1/daily_scores?select=day,course,name,strokes,to_par,player_id&order=day.asc&limit=5000',{headers:dailyHdr()});if(r.ok)rows=await r.json();}catch(e){}
  if(DAILY.view.tab!=='all')return;
  if(!rows){list.innerHTML='<li class="empty">Couldn’t load the standings. Check your connection.</li>';return;}
  const best={},P={};for(const r of rows){best[r.day]=Math.min(best[r.day]??1e9,r.strokes);}
  {const k1={},keep=[];for(const r of [...rows].sort((a,b)=>a.strokes-b.strokes)){const k=r.day+'|'+pKey(r);if(k1[k])continue;k1[k]=1;keep.push(r);}rows=keep.sort((a,b)=>a.day<b.day?-1:a.day>b.day?1:0);}
  for(const r of rows){const k=pKey(r),p=P[k]||(P[k]={name:r.name,n:0,tp:0,w:0,best:null,pids:new Set()});p.pids.add(r.player_id);p.name=r.name;p.n++;p.tp+=r.to_par;if(r.strokes===best[r.day])p.w++;
    if(!p.best||r.to_par<p.best.to_par)p.best=r;}
  const pid=dailyPid(),L=Object.entries(P).map(([id,p])=>({id,...p,avg:p.tp/p.n})).sort((a,b)=>b.w-a.w||a.avg-b.avg||b.n-a.n);
  const days=Object.keys(best).length;
  list.innerHTML=L.length?'<li class="hd"><span class="rk"></span><span class="nm">Golfer</span><span class="w">Wins</span><span class="wide">Rds</span><span class="wide">Avg</span></li>'+L.map((p,i)=>{const a=Math.round(p.avg*10)/10;
    return'<li'+(p.pids.has(pid)||pMine({name:p.name,player_id:''},pid)?' class="me"':'')+'><span class="rk">'+(i+1)+'</span><span class="nm">'+escH(p.name)+'<small style="font-weight:600;color:#51606b">Best '+fmtDiff(p.best.to_par)+' \u00b7 '+escH((COURSES[p.best.course]||{name:p.best.course}).name)+'</small></span><span class="w">'+p.w+'</span><span class="wide">'+p.n+'</span><span class="wide">'+(a===0?'E':a>0?'+'+a.toFixed(1):'−'+(-a).toFixed(1))+'</span></li>';}).join(''):'<li class="empty">No daily rounds posted yet.</li>';
  $('dStatus').textContent=days?days+(days===1?' day played':' days played')+' since '+dailyNice(DAILY_START):'';}
const ordinal=n=>n+(n%100>=11&&n%100<=13?'th':['th','st','nd','rd'][n%10]||'th');
function dailyShare(){const me=dailyToday();if(!me||!me.done)return;
  const C=COURSES[me.cid],pars=C.tb.map(h=>h.par);const em=(me.scores||[]).map((s,i)=>{const d=s-pars[i];return d<=-2?'\ud83d\udfe8':d===-1?'\ud83d\udfe9':d===0?'\u2b1c':d===1?'\ud83d\udfe7':'\ud83d\udfe5';});
  const txt='Golf Go daily \u00b7 '+dailyNice(me.day)+'\n'+C.name+': '+me.total+' ('+fmtDiff(me.toPar)+')\n'+em.slice(0,9).join('')+'\n'+em.slice(9).join('')+'\n'+location.href.split('#')[0].split('?')[0];
  if(navigator.share)navigator.share({text:txt}).catch(()=>{});else{navigator.clipboard&&navigator.clipboard.writeText(txt).then(()=>toast('COPIED','Paste it to your friends','#8ee6a8'),()=>{});}}
function menuPlay(){const cid=dailyCourse(dailyDay()),img=courseImg(cid),el=$('mDailyImg');if(img)el.src=img;else el.removeAttribute('src');$('mDailyName').textContent=COURSES[cid].name;
  {const C1=carOf(1),nb=C1.beaten.length,nx=RIVALS1.find(r=>!C1.beaten.includes(r.id));$('mCareerN').textContent='vs '+RIVALS1.length+' rivals';
   $('mCareerSub').textContent=nb>=RIVALS1.length?'Every rival beaten \u00b7 rematch anyone for points':nb?nb+' of '+RIVALS1.length+' beaten \u00b7 next: '+nx.name:'Beat each rival to unlock the next';}
  {const C2=carOf(2),nb=C2.beaten.length,nx=RIVALS2.find(r=>!C2.beaten.includes(r.id));$('mCareer2N').textContent=C2.unlocked.length+' of '+CH2_ORDER.length+' golfers';
   $('mCareer2Sub').textContent=nb>=RIVALS2.length?'Every golfer unlocked \u00b7 rematch anyone for points':'Start as Gary and win golfers \u00b7 next: '+nx.name+' at '+COURSES[nx.course].name;}}
function dailyMenuLine(){const day=dailyDay(),cid=dailyCourse(day),me=dailyToday();$('mDailyCourse').textContent=COURSES[cid].name;
  $('mDailySub').textContent=dailyNice(day)+' \u00b7 '+(me&&me.done?'You shot '+me.total+' ('+fmtDiff(me.toPar)+') \u00b7 tap for the leaderboard':me&&(me.hi>0||me.mid)?'In progress \u00b7 hole '+((me.hi||0)+1):'Same course for everyone today');
  if(me&&me.done&&!me.posted)dailyPost();dailyOwed();}

