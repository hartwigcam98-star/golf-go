/* ---- career screens ---- */
let careerTab='rivals',careerSel=null,gfSel=null,careerHome='rivals';
// VS mode and Tournaments open the same screen on their own tab (golfers and gear are shared)
function openCareer(tab){if(tab)careerTab=careerHome=tab;G.paused=true;$('menuM').hidden=true;$('careerM').hidden=false;careerSel=null;tourSel=null;renderCareer();}
function closeCareer(){$('careerM').hidden=true;openMenu(!!G.hole);}
function pendingMatchV(){const v=[2].filter(v=>{const m=carOf(v).match;return m&&RV(m.rid);}).sort((a,b)=>(carOf(b).match.ts||0)-(carOf(a).match.ts||0));return v[0]||0;}
const faceOf=r=>r.cid?'<img class="face" alt="" src="'+CHAR_PIC[r.cid]+'">':face(r.look);
const gearName=(g,t)=>CV===2?GEAR2_TIERS[g.k][t]:g.tiers[t];
function stats10(cid){const s=CH2_ST[cid];let h='<div class="st10">';for(const[k,n]of CHAR_STATS)h+='<span>'+n+'</span>'+bar(s[k]/10)+'<em>'+s[k]+'</em>';return h+'</div>';}
function nextRivalIdx(){return RIVALS.findIndex(r=>!CAR.beaten.includes(r.id));}
function rivalOpen(i){const n=nextRivalIdx();return n<0||i<=n;}
function pips(n,max){let h='';for(let i=0;i<max;i++)h+='<i class="'+(i<n?'on':'')+'"></i>';return'<span class="pips">'+h+'</span>';}
function bar(v){return'<span class="sbar"><i style="width:'+Math.round(clamp(v,0,1)*100)+'%"></i></span>';}
function renderCareer(){const c=$('careerBody');$('careerPts').textContent=CAR.pts.toLocaleString()+' pts';
  if(!['rivals','tour','golfers','gear'].includes(careerTab))careerTab='rivals';if(careerTab==='rivals'||careerTab==='tour')careerHome=careerTab;
  $('careerH').textContent=careerHome==='tour'?'Tournaments':'VS mode';
  document.querySelectorAll('#careerTabs button').forEach(b=>b.classList.toggle('on',b.dataset.tab===careerTab));
  let h='';
  if(careerSel){const i=RIVALS.findIndex(r=>r.id===careerSel),r=RIVALS[i],rec=CAR.record[r.id],C=COURSES[CAR.match&&CAR.match.rid===r.id?matchCid(CAR.match,r):r.course],again=CAR.beaten.includes(r.id);
    const sk=r.sk,mid=CAR.match&&CAR.match.rid===r.id?CAR.match:null;
    h+='<div class="rvhead">'+faceOf(r)+'<div><b class="disp">'+r.name+'</b><span>“'+r.nick+'” · '+C.name+'</span></div></div>';
    h+='<p class="rvblurb">'+r.blurb+'</p>';
    if(r.cid){const ch=ch2Char(r.cid);h+=stats10(r.cid)+'<div class="chtrait"><b>'+ch.trait.name+'</b>'+ch.trait.d+'</div><div class="msub">'+(CAR.unlocked.includes(r.cid)?'Unlocked: you can play as '+ch.name+'.':'Win to unlock '+ch.name+' as your golfer.')+'</div>';}
    else h+='<div class="rvstats"><span>Power</span>'+bar((sk.pow-.8)/.3)+'<span>Accuracy</span>'+bar((.07-sk.acc)/.055)+'<span>Putting</span>'+bar(sk.putt)+'<span>Nerve</span>'+bar(1-sk.miss*12)+'</div>';
    h+='<div class="msub">18-hole match play at '+C.name+' · win '+(again?Math.round(r.reward*.5)+' pts (rematch)':r.reward+' pts')+(rec?' · your record '+rec.w+'–'+rec.l:'')+'</div>';
    if(mid){const up=mid.res.reduce((a,b)=>a+(b||0),0);h+='<button class="primary disp" data-act="resume">Continue match</button><div class="msub">Hole '+(mid.hi+1)+' · '+(up===0?'All square':(up>0?'You ':rn(r)+' ')+Math.abs(up)+' UP')+'</div><button class="ghost disp" data-act="restart">Start over</button>';}
    else h+='<button class="primary disp" data-act="start">Start match</button>';
    if(CAR.match&&!mid)h+='<div class="msub warn">Starting this match abandons your match against '+RV(CAR.match.rid).name+'.</div>';
    h+='<button class="textbtn" data-act="back">All rivals</button>';}
  else if(careerTab==='tour')h+=tourHtml();
  else if(careerTab==='rivals'){const n=nextRivalIdx();
    h+='<div class="msub">'+(n<0?'You’ve beaten every rival. Rematch anyone for points.':CV===2?'You play as '+ch2Char(CAR.char).name+'. 18-hole match play: beat each golfer to unlock them and the next match. '+(CAR.beaten.length)+' of '+RIVALS.length+' beaten.':'Beat each rival to unlock the next. '+(CAR.beaten.length)+' of '+RIVALS.length+' beaten.')+'</div><div class="rvlist">';
    RIVALS.forEach((r,i)=>{const open=rivalOpen(i),beat=CAR.beaten.includes(r.id),mid=CAR.match&&CAR.match.rid===r.id;
      h+='<button class="rv'+(open?'':' locked')+(i===n?' next':'')+'" data-rv="'+r.id+'"'+(open?'':' disabled')+'>'+faceOf(r)+'<span class="rvn"><b>'+(open?r.name:'???')+'</b><span>'+(open?'“'+r.nick+'” · ':'')+COURSES[mid?matchCid(CAR.match,r):r.course].name+'</span></span><span class="rvs">'+(mid?'In progress':beat?'Beaten ✓':open?r.reward+' pts':'🔒')+'</span></button>';});
    h+='</div>';}
  else if(careerTab==='golfers'){const sel=gfSel&&CAR.unlocked.includes(gfSel)?gfSel:CAR.char,me=ch2Char(sel);
    h+='<div class="msub">Pick who you play as. Beat a golfer to unlock them. '+CAR.unlocked.length+' of '+CH2_ORDER.length+' unlocked.</div><div class="gfl">';
    for(const cid of CH2_ORDER){const ch=ch2Char(cid),own=CAR.unlocked.includes(cid),rv=RIVALS2.find(x=>x.cid===cid);
      h+='<button data-gf="'+cid+'"'+(own?'':' disabled')+(cid===sel?' class="on"':'')+'><img alt="" src="'+CHAR_PIC[cid]+'"><b>'+(own?ch.name:'???')+'</b><span>'+(cid===CAR.char?'Playing':own?'Unlocked':'Beat at '+COURSES[rv.course].name)+'</span></button>';}
    h+='</div><div class="rvhead" id="gfDet"><img class="face" alt="" src="'+CHAR_PIC[me.id]+'"><div><b class="disp">'+me.name+'</b><span>'+me.nick+'</span></div></div>'+stats10(me.id)+'<div class="chtrait"><b>'+me.trait.name+'</b>'+me.trait.d+'</div>'+
      (me.id===CAR.char?'<div class="msub">You are playing as '+me.name+'.</div>':'<button class="primary disp" data-gfgo="'+me.id+'">Play as '+me.name+'</button>');}
  else if(careerTab==='skills'){h+='<div class="msub">Spend points on your golfer. Each skill has five levels.</div>';
    for(const s of SKILLS){const L=CAR.st[s.k],cost=SKILL_COST[L];h+='<div class="shoprow"><div><b>'+s.name+'</b> '+pips(L,5)+'<span>'+s.d+'</span></div>'+(L>=5?'<em>Max</em>':'<button data-buy="st:'+s.k+'"'+(CAR.pts<cost?' disabled':'')+'>'+cost+'</button>')+'</div>';}}
  else if(careerTab==='gear'){h+='<div class="msub">Better equipment, one slot at a time.</div>';
    for(const g of GEAR){const t=CAR.gear[g.k],cost=GEAR_COST[t];h+='<div class="shoprow"><div><b>'+g.name+'</b> '+pips(t,3)+'<span>'+gearName(g,t)+' · '+g.d+'</span></div>'+(t>=3?'<em>Max</em>':'<button data-buy="gear:'+g.k+'"'+(CAR.pts<cost?' disabled':'')+'>'+gearName(g,t+1)+' · '+cost+'</button>')+'</div>';}}
  else if(careerTab==='look'){h+='<div class="msub">Your beanie and hoodie on the course.</div><div class="looks">';
    for(const o of OUTFITS){const own=CAR.owned.includes(o.id),on=CAR.look===o.id;h+='<button class="lk'+(on?' on':'')+'" data-look="'+o.id+'"'+(!own&&CAR.pts<o.cost?' disabled':'')+'>'+face({...LOOK_ME,top:o.top,hat:o.hat})+'<b>'+o.name+'</b><span>'+(on?'Wearing':own?'Owned':o.cost+' pts')+'</span></button>';}
    h+='</div>';}
  c.innerHTML=h;if(careerTab==='tour')tourBind(c);
  c.querySelectorAll('[data-rv]').forEach(b=>b.addEventListener('click',()=>{careerSel=b.dataset.rv;sfx.tick();renderCareer();}));
  c.querySelectorAll('[data-gf]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.gf;if(!CAR.unlocked.includes(id))return;gfSel=id;sfx.tick();renderCareer();try{$('gfDet').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}}));
  c.querySelectorAll('[data-gfgo]').forEach(b=>b.addEventListener('click',()=>{const id=b.dataset.gfgo;if(!CAR.unlocked.includes(id))return;CAR.char=id;saveCareer();if(MATCH.on&&!G.aiTurn){G.cm=careerMods();if(R3.on)r3GolferSet(id);}sfx.nice();renderCareer();}));
  c.querySelectorAll('[data-act]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.act;A();
    if(a==='back'){careerSel=null;renderCareer();}
    else if(a==='start'||a==='restart'){if(a==='restart')CAR.match=null;startMatch(careerSel,false);}
    else if(a==='resume')startMatch(careerSel,true);}));
  c.querySelectorAll('[data-buy]').forEach(b=>b.addEventListener('click',()=>{const[kind,k]=b.dataset.buy.split(':');
    if(kind==='st'){const L=CAR.st[k],cost=SKILL_COST[L];if(L<5&&CAR.pts>=cost){CAR.pts-=cost;CAR.st[k]++;}}
    else{const t=CAR.gear[k],cost=GEAR_COST[t];if(t<3&&CAR.pts>=cost){CAR.pts-=cost;CAR.gear[k]++;}}
    saveCareer();if(MATCH.on&&!G.aiTurn)G.cm=careerMods();sfx.nice();renderCareer();}));
  c.querySelectorAll('[data-look]').forEach(b=>b.addEventListener('click',()=>{const o=OUTFITS.find(x=>x.id===b.dataset.look);
    if(!CAR.owned.includes(o.id)){if(CAR.pts<o.cost)return;CAR.pts-=o.cost;CAR.owned.push(o.id);}CAR.look=o.id;saveCareer();if(MATCH.on&&!G.aiTurn)G.look=myLook();sfx.tick();renderCareer();}));}
// a small portrait: hat, face and shirt in the rival's colours
function face(L){return'<svg class="face" viewBox="0 0 40 40" aria-hidden="true"><circle cx="20" cy="20" r="19" fill="#e3dccb"/><path d="M6 40c1-9 7-13 14-13s13 4 14 13z" fill="'+L.top+'"/><circle cx="20" cy="18" r="8" fill="'+L.skin+'"/>'+
  (L.beard?'<path d="M12.5 18c0 6 3.5 9 7.5 9s7.5-3 7.5-9c-1.5 3-4 4-7.5 4s-6-1-7.5-4z" fill="'+L.beard+'"/>':'')+
  (L.hatType==='flat'?'<path d="M10.5 15.5c0-5 4.3-7 9.5-7s9.5 2 9.5 7z" fill="'+L.hat+'"/><path d="M19 15h10.5c0 1.4-1.2 2-2.6 2H19z" fill="'+L.hat+'" opacity=".85"/>':L.hatType==='visor'?'<path d="M11.8 17c0-6 3.7-9 8.2-9s8.2 3 8.2 9c-1-2.5-3-3.5-8.2-3.5s-7.2 1-8.2 3.5z" fill="'+(L.hair||'#3a2a20')+'"/><rect x="11.6" y="12.6" width="16.8" height="2.6" rx="1.2" fill="'+L.hat+'"/><path d="M20 13.4h11.5c0 1.8-1.6 2.4-3.2 2.4H20z" fill="'+L.hat+'"/>':L.hatType==='cap'?'<path d="M11.5 16c0-6 3.8-8.5 8.5-8.5s8.5 2.5 8.5 8.5z" fill="'+L.hat+'"/><path d="M20 15.5h11c0 1.6-1.5 2.2-3 2.2h-8z" fill="'+L.hat+'"/>':'<path d="M11.5 17c0-7 3.8-10 8.5-10s8.5 3 8.5 10z" fill="'+L.hat+'"/><rect x="11.3" y="14" width="17.4" height="3.4" rx="1.4" fill="'+L.hat+'" opacity=".8"/>')+'</svg>';}

/* ---------- tournaments: PS1/PS2-style stroke play against a field, with ranks ----------
   Nov 2026. One 18-hole round from the back tees against 29 AI golfers on a live leaderboard. Win 2 events in a rank to open
   the next rank (Rookie -> Legend). The field is simulated hole by hole from a seed (each golfer has a round level and a form for
   the day), so a saved tournament always shows the same scores. A tie for the lead goes to sudden death on the 18th.
   You play as your VS golfer (CAR.char) with your shop gear; points go to the same pot as VS. */
const TOUR_RANKS=[{name:'Rookie',sfx:'Amateur',top:1,purse:300},{name:'Amateur',sfx:'Invitational',top:-2,purse:500},{name:'Semi-Pro',sfx:'Classic',top:-4,purse:750},
  {name:'Pro',sfx:'Open',top:-6,purse:1000},{name:'Tour Pro',sfx:'Championship',top:-8,purse:1400},{name:'Legend',sfx:'Masters',top:-10,purse:1900}];
const TOUR_WINS=2;   // wins in a rank that open the next one
const TOUR_EV=[['troy','stoneridge','quarry'],['legend','wilderness','sandvalley'],['mammoth','sedge','lido'],['heritage','pawplant','caledonia'],
  ['trueblue','crsc','crls'],['senator','legislator','judge','rossbridge']].flatMap((cs,r)=>cs.filter(c=>COURSES[c]).map(cid=>({id:'t_'+cid,r,cid,purse:cid==='rossbridge'?2500:TOUR_RANKS[r].purse})));
const tourEv=id=>TOUR_EV.find(e=>e.id===id);
const tourName=e=>COURSES[e.cid].name+' '+TOUR_RANKS[e.r].sfx;
let tourSel=null;
// the field: the VS golfers (not you) and the old Challenge rivals, 29 of them, levels spread from the rank's top level
function tourField(T){const e=tourEv(T.tid),R=rng(T.seed),pool=[...CH2_ORDER.filter(id=>id!==(T.me||CAR.char)).map(id=>({n:ch2Char(id).name,cid:id})),...RIVALS1.map(r=>({n:r.name}))];
  for(let i=pool.length-1;i>0;i--){const j=Math.floor(R()*(i+1));[pool[i],pool[j]]=[pool[j],pool[i]];}
  const top=TOUR_RANKS[e.r].top+(e.cid==='rossbridge'?-1:0);
  return pool.slice(0,29).map((p,i)=>({...p,L:top+i*.45+(R()-.5)*.6,f:gauss2(R)*2.2}));}
function gauss2(R){let u=0,v=0;while(!u)u=R();while(!v)v=R();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);}
// one AI golfer's score on hole i (par adjustment: par 5s play easier, par 3s a touch harder, levelled over the course)
function tourAI(T,g,k,i,po){const tb=COURSES[tourEv(T.tid).cid].tb,adj=p=>p===5?-.22:p===3?.08:.04,mean=tb.reduce((a,h)=>a+adj(h.par),0)/tb.length,par=tb[i].par;
  const R=rng((T.seed|0)*131+k*977+(po?5000+po*61:i*31)+7),mu=(g.L+g.f)/18+adj(par)-mean,x=mu+gauss2(R)*.7;
  return clamp(par+Math.round(x),par===3?2:par-2,par+3);}
function tourCache(T){if(!T._f)Object.defineProperty(T,'_f',{value:tourField(T),enumerable:false,writable:true});return T._f;}
// the board after n holes: [{n,tp,me,thru}] sorted, with positions (T = tied)
function tourBoard(T,n,scores){const tb=COURSES[tourEv(T.tid).cid].tb,F=tourCache(T),rows=F.map((g,k)=>{let tp=0;for(let i=0;i<n;i++)tp+=tourAI(T,g,k,i)-tb[i].par;return{n:g.n,cid:g.cid,tp,k};});
  let mp=0;for(let i=0;i<n;i++)mp+=(scores[i]||0)-tb[i].par;rows.push({n:'You',tp:mp,me:true});
  rows.sort((a,b)=>a.tp-b.tp||(a.me?-1:b.me?1:0));rows.forEach((r,i)=>{const f=rows.findIndex(x=>x.tp===r.tp);r.pos=f+1;r.tie=rows.filter(x=>x.tp===r.tp).length>1;});return rows;}
const posTxt=r=>(r.tie?'T':'')+r.pos;
function tourBoardHtml(rows,n,who){const me=rows.find(r=>r.me),top=rows.slice(0,5);if(!top.includes(me))top.push(me);
  return'<table class="tlb"><tbody>'+top.map(r=>'<tr'+(r.me?' class="me"':'')+'><td>'+posTxt(r)+'</td><td>'+(r.me?'You ('+ch2Char(who||CAR.tour&&CAR.tour.me||CAR.char).name+')':r.n)+'</td><td>'+fmtDiff(r.tp)+'</td><td>'+(n>=18?'F':n)+'</td></tr>').join('')+'</tbody></table>';}
function tourMenuLine(){const rk=TOUR_RANKS[Math.min(CAR.rank,TOUR_RANKS.length-1)],T=CAR.tour,e=T&&tourEv(T.tid);
  $('mTourN').textContent=(CAR.rank>=TOUR_RANKS.length?'Legend':rk.name)+' rank';
  $('mTourSub').textContent=CAR.rank>=TOUR_RANKS.length?'You’ve won your way to the top · replay any event for points':'Stroke play vs a field of 29 · '+tourWinsIn(CAR.rank)+' of '+TOUR_WINS+' wins to reach '+(TOUR_RANKS[CAR.rank+1]?TOUR_RANKS[CAR.rank+1].name:'the top');
  const show=!!e&&G.mode!=='tourney';$('mTourCont').hidden=!show;$('mTourContSub').hidden=!show;
  if(show){$('mTourCont').innerHTML='Continue tournament <span>'+COURSES[e.cid].name+'</span>';
    const n=(T.scores||[]).filter(x=>x).length,b=tourBoard(T,n,T.scores||[]),me=b.find(r=>r.me);
    $('mTourContSub').textContent=tourName(e)+' · '+(T.po?'playoff':'hole '+((T.hi||0)+1))+(n?' · '+fmtDiff(me.tp)+' ('+posTxt(me)+')':'')+(T.ts?' · saved '+new Date(T.ts).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'');}}
function tourWinsIn(r){return TOUR_EV.filter(e=>e.r===r&&(CAR.trec[e.id]||{}).w>0).length;}
function tourHtml(){let h='';const T=CAR.tour,cur=T&&tourEv(T.tid),me=ch2Char(CAR.char);
  if(tourSel){const e=tourEv(tourSel),C=COURSES[e.cid],rec=CAR.trec[e.id],rk=TOUR_RANKS[e.r],mid=cur&&cur.id===e.id;
    h+='<div class="rvhead"><span class="face tico">🏆</span><div><b class="disp">'+tourName(e)+'</b><span>'+rk.name+' event · '+C.name+' · par '+C.tb.reduce((a,x)=>a+x.par,0)+'</span></div></div>';
    h+='<div class="msub">18 holes of stroke play from the back tees against a field of 29. Winning scores here are usually around '+fmtDiff(rk.top-2+(e.cid==='rossbridge'?-1:0))+'. A tie for the lead goes to sudden death.</div>';
    h+='<div class="msub">Win '+e.purse+' pts · 2nd '+Math.round(e.purse*.6)+' · top 10 pays'+(rec?' · your best: '+(rec.b===1?'won'+(rec.w>1?' ×'+rec.w:''):ord(rec.b)):'')+'</div>';
    h+='<div class="msub">You play as '+me.name+' with your shop gear. Change golfer on the Golfers tab.</div>';
    if(mid){h+='<button class="primary disp" data-tact="resume">Continue round</button><button class="ghost disp" data-tact="restart">Start over</button>';}
    else h+='<button class="primary disp" data-tact="start">Tee it up</button>'+(cur?'<div class="msub warn">Starting this event abandons your round at '+tourName(cur)+'.</div>':'');
    h+='<button class="textbtn" data-tact="back">All events</button>';return h;}
  const rkN=Math.min(CAR.rank,TOUR_RANKS.length-1);
  h+='<div class="msub">'+(CAR.rank>=TOUR_RANKS.length?'Legend: every rank cleared. Replay any event for points.':'Your rank: <b>'+TOUR_RANKS[rkN].name+'</b>. Win '+TOUR_WINS+' events to move up ('+tourWinsIn(CAR.rank)+' of '+TOUR_WINS+'). You play as '+me.name+'.')+'</div>';
  if(cur){const n=(T.scores||[]).filter(x=>x).length,b=tourBoard(T,n,T.scores||[]),m=b.find(r=>r.me);h+='<button class="primary disp" data-tact="cont">Continue '+COURSES[cur.cid].name+'</button><div class="msub">'+(T.po?'Playoff':'Hole '+((T.hi||0)+1))+(n?' · '+fmtDiff(m.tp)+' · '+posTxt(m):'')+'</div>';}
  h+='<div class="rvlist">';
  TOUR_RANKS.forEach((rk,r)=>{const open=r<=CAR.rank;h+='<div class="trank'+(open?'':' locked')+'">'+rk.name+(open?'':' 🔒')+(r<CAR.rank?' ✓':'')+'</div>';
    TOUR_EV.filter(e=>e.r===r).forEach(e=>{const rec=CAR.trec[e.id],mid=cur&&cur.id===e.id;
      h+='<button class="rv'+(open?'':' locked')+'" data-tev="'+e.id+'"'+(open?'':' disabled')+'><span class="face tico">'+(rec&&rec.w?'🏆':'⛳')+'</span><span class="rvn"><b>'+(open?tourName(e):COURSES[e.cid].name)+'</b><span>'+COURSES[e.cid].name+' · '+e.purse+' pts to the winner</span></span><span class="rvs">'+(mid?'In progress':rec?(rec.w?'Won ✓':'Best '+ord(rec.b)):open?'':'🔒')+'</span></button>';});});
  return h+'</div>';}
function tourBind(c){c.querySelectorAll('[data-tev]').forEach(b=>b.addEventListener('click',()=>{tourSel=b.dataset.tev;sfx.tick();renderCareer();}));
  c.querySelectorAll('[data-tact]').forEach(b=>b.addEventListener('click',()=>{const a=b.dataset.tact;A();
    if(a==='back'){tourSel=null;renderCareer();}else if(a==='start'||a==='restart')tourStart(tourSel,false);else if(a==='resume')tourStart(tourSel,true);else if(a==='cont')tourStart(CAR.tour.tid,true);}));}
function tourStart(tid,resume){const e=tourEv(tid);if(!e)return;if(courseGate(e.cid,()=>tourStart(tid,resume)))return;
  let T=resume&&CAR.tour&&CAR.tour.tid===tid?CAR.tour:null;
  G.tourDone=false;if(!T){T={tid,me:CAR.char,seed:1+Math.floor(Math.random()*1e9),hi:0,scores:[],strokes:0,mid:false,ps:3,earn:{birdie:0,eagle:0,hio:0,perfect:0,chip:0,putt:0},po:0,ts:Date.now()};CAR.tour=T;saveCareer();}
  endMatchMode();dailyLeave();
  if(typeof r3CharLoad==='function')r3CharLoad(T.me||CAR.char);
  G.mode='tourney';setCourse(e.cid,false,0);if(R3.on){if(!(T.wx>=0)){T.wx=r3RandWx();saveCareer();}r3ApplyWx(T.wx,!resume);}
  const me=T.me||CAR.char,keep=CAR.char;CAR.char=me;G.cm=careerMods();CAR.char=keep;G.look=null;G.aiTurn=false;if(R3.on&&typeof r3GolferSet==='function')r3GolferSet(me);
  G.psLeft=Number.isInteger(T.ps)?T.ps:3;G.scores=T.po?(T.fin||[]).slice():(T.scores||[]).slice();
  $('careerM').hidden=true;closeMenu();startHole(T.po?TB.length-1:(T.hi||0));
  if(((T.mid&&T.strokes>0)||T.pend)&&T.ball)midResume(T.po?TB.length-1:(T.hi||0),()=>{$('introM').hidden=true;G.strokes=T.strokes;G.ball={x:T.ball.x,y:T.ball.y};G.prev=T.prev?{x:T.prev.x,y:T.prev.y}:{...G.ball};if(T.wind)G.wind=T.wind;
    prepareShot();const t=camTarget();cam.E=[...t.E];cam.L=[...t.L];if(!pendResume(T.pend))toast('WELCOME BACK',tourName(e)+' · '+(T.po?'playoff':'hole '+(T.hi+1)),'#8ee6a8');});}
function tourSave(o={}){const T=CAR.tour;if(!T||G.mode!=='tourney')return;
  Object.assign(T,{ps:G.psLeft,hi:o.hi??G.hi,strokes:o.strokes??G.strokes,ball:o.ball??G.ball,prev:o.prev??G.prev,wind:G.wind,mid:!!o.mid,pend:o.pend||null,ts:Date.now()});
  if(!T.po)T.scores=G.scores.slice();saveCareer();}
function tourLeave(){if(G.mode!=='tourney')return;G.cm=null;G.look=null;if(R3.on&&typeof r3GolferSet==='function')r3GolferSet(CHAR_ID);}
function tourEyebrow(){const T=CAR.tour,e=T&&tourEv(T.tid);return e?tourName(e)+(T.po?' · sudden-death playoff '+T.po:''):courseLine();}
function tourEarn(){return G.mode==='tourney'&&CAR.tour?CAR.tour.earn:null;}
// HUD: your score and place
let TOURH={k:'',v:''};
function tourHud(){const T=CAR.tour;if(!T)return fmtDiff(roundDiff());const n=G.scores.filter(x=>x).length,k=T.tid+':'+T.seed+':'+G.scores.join(',')+':'+T.po;
  if(TOURH.k!==k){const b=tourBoard(T,T.po?18:n,T.po?T.fin:G.scores),me=b.find(r=>r.me);TOURH={k,v:fmtDiff(me.tp)+(n?' · '+posTxt(me):'')};}return TOURH.v;}
function tourPoints(pos,e,T){const E=T.earn,m=pos===1?1:pos===2?.6:pos===3?.45:pos<=5?.3:pos<=10?.18:.08,again=(CAR.trec[e.id]||{}).w>0&&pos===1;
  const items=[[pos===1?(again?'Repeat win':'Tournament win'):ord(pos)+' place',Math.round(e.purse*m*(again?.5:1))],['Birdies ×'+E.birdie,E.birdie*20],['Eagles ×'+E.eagle,E.eagle*60],['Hole in one ×'+E.hio,E.hio*250],['Perfect strikes ×'+E.perfect,E.perfect*5],['Chip-ins ×'+E.chip,E.chip*25],['Long putts ×'+E.putt,E.putt*15]].filter(x=>x[1]>0);
  return{items,total:items.reduce((a,b)=>a+b[1],0)};}
function tourCard(){const T=CAR.tour,e=tourEv(T.tid),note=$('cNote'),i=G.hi,s=G.scores[i],par=TB[i].par;
  for(const el of document.querySelectorAll('#cardM .scwrap,#cardM .legend'))el.hidden=false;$('cardPick').hidden=true;note.hidden=false;
  if(T.po){// a playoff hole: G.scores[17] holds this playoff hole's strokes; the round's own 18 are in T.fin
    const ps=s;G.scores=T.fin.slice();const alive=T.alive.map(k=>({k,s:tourAI(T,tourCache(T)[k],k,i,T.po)})),best=Math.min(...alive.map(a=>a.s));
    let res;if(ps<best)res='win';else if(ps>best)res='lose';else res='tie';
    T.alive=alive.filter(a=>a.s===best).map(a=>a.k);
    $('sc').innerHTML=nineTable(0,'Out',false);$('sc2').innerHTML=nineTable(9,'In',true);
    $('cEyebrow').textContent='Playoff hole '+T.po+' · You '+ps+', '+alive.map(a=>tourCache(T)[a.k].n.split(' ')[0]+' '+a.s).join(', ');
    if(res==='tie'){T.po++;T.hi=i;T.strokes=0;T.mid=false;T.pend=null;T.ball=null;saveCareer();$('cTitle').textContent='Still tied';note.textContent='Back to the '+ord(i+1)+' tee for playoff hole '+T.po+'.';$('nextBtn').textContent='Next playoff hole';}
    else tourFinish(res==='win'?1:2);
    $('cardM').hidden=false;setTimeout(()=>$('nextBtn').focus({preventScroll:true}),50);return;}
  const d=s-par;if(s===1)T.earn.hio++;else if(d<=-2)T.earn.eagle++;else if(d===-1)T.earn.birdie++;
  const last=i===TB.length-1,n=i+1;if(!last)tourSave({hi:i+1,strokes:0,mid:false,ball:{x:0,y:0},prev:{x:0,y:0}});
  $('sc').innerHTML=nineTable(0,'Out',false);$('sc2').innerHTML=nineTable(9,'In',true);
  const b=tourBoard(T,n,G.scores),me=b.find(r=>r.me);
  if(last){const lead=b.filter(r=>r.pos===1);T.fin=G.scores.slice();
    if(me.pos===1&&lead.length>1){T.po=1;T.alive=lead.filter(r=>!r.me).map(r=>r.k);T.hi=i;T.strokes=0;T.mid=false;T.pend=null;T.ball=null;saveCareer();
      $('cEyebrow').textContent='Round complete · '+tourName(e);$('cTitle').textContent='Playoff!';
      note.innerHTML='Tied for the lead at '+fmtDiff(me.tp)+' with '+T.alive.map(k=>tourCache(T)[k].n).join(' and ')+'. Sudden death on the '+ord(i+1)+'.'+tourBoardHtml(b,18);$('nextBtn').textContent='To the playoff';}
    else{$('cEyebrow').textContent='Round complete · '+tourName(e);tourFinish(me.pos,b);}}
  else{$('cEyebrow').textContent='Hole '+n+' · '+s+(s===1?' stroke':' strokes')+' · '+COURSES[e.cid].name;
    const nm=scoreName(s,par).replace('!','');$('cTitle').textContent=nm.charAt(0)+nm.slice(1).toLowerCase();
    note.innerHTML='You’re '+fmtDiff(me.tp)+', '+(me.pos===1?(me.tie?'tied for the lead':'leading'):posTxt(me)+(b[0].me?'':', '+(me.tp-b[0].tp)+' back'))+' through '+n+'.'+tourBoardHtml(b,n);
    $('nextBtn').textContent='Next hole';}
  $('cardM').hidden=false;setTimeout(()=>$('nextBtn').focus({preventScroll:true}),50);}
function tourFinish(pos,b){const T=CAR.tour,e=tourEv(T.tid),pts=tourPoints(pos,e,T),note=$('cNote'),rk0=CAR.rank;
  CAR.pts+=pts.total;const rec=CAR.trec[e.id]||{b:99,w:0,n:0};rec.n++;rec.b=Math.min(rec.b,pos);if(pos===1)rec.w++;CAR.trec[e.id]=rec;
  if(pos===1&&e.r===CAR.rank&&tourWinsIn(e.r)>=TOUR_WINS&&CAR.rank<TOUR_RANKS.length)CAR.rank++;
  const up=CAR.rank>rk0;b=b||tourBoard(T,18,T.fin||G.scores);CAR.tour=null;T.done=pos;saveCareer();
  $('cTitle').textContent=pos===1?'Champion!':'Finished '+ord(pos);
  note.innerHTML=(pos===1?'<b>You win the '+tourName(e)+'.</b> ':'')+(up?(CAR.rank>=TOUR_RANKS.length?'<b>Every rank cleared: you’re a Legend.</b> ':'<b>Promoted to '+TOUR_RANKS[CAR.rank].name+'</b>: new events are open. '):'')+
    '<span class="earn">'+pts.items.map(x=>x[0]+' <b>+'+x[1]+'</b>').join(' · ')+'</span><br><b class="ptot">+'+pts.total+' points</b> · '+CAR.pts+' to spend'+(T.po?'':tourBoardHtml(b,18,T.me));
  $('nextBtn').textContent='Tournaments';if(pos===1)setTimeout(sfx.fanfare,200);G.tourDone=true;}
function tourNext(){const T=CAR.tour;
  if(G.tourDone||!T){G.tourDone=false;$('cardM').hidden=true;tourLeave();dailyLeave();tourSel=null;openCareer('tour');return;}
  if(T.po){G.scores=T.fin.slice();startHole(TB.length-1);return;}
  startHole(G.hi+1);}
