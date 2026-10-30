/* ---- career screens ---- */
let careerTab='rivals',careerSel=null,gfSel=null;
function openCareer(){G.paused=true;$('menuM').hidden=true;$('careerM').hidden=false;careerSel=null;renderCareer();}
function closeCareer(){$('careerM').hidden=true;openMenu(!!G.hole);}
function pendingMatchV(){const v=[1,2].filter(v=>{const m=carOf(v).match;return m&&RV(m.rid);}).sort((a,b)=>(carOf(b).match.ts||0)-(carOf(a).match.ts||0));return v[0]||0;}
const faceOf=r=>r.cid?'<img class="face" alt="" src="'+CHAR_PIC[r.cid]+'">':face(r.look);
const gearName=(g,t)=>CV===2?GEAR2_TIERS[g.k][t]:g.tiers[t];
function stats10(cid){const s=CH2_ST[cid];let h='<div class="st10">';for(const[k,n]of CHAR_STATS)h+='<span>'+n+'</span>'+bar(s[k]/10)+'<em>'+s[k]+'</em>';return h+'</div>';}
function nextRivalIdx(){return RIVALS.findIndex(r=>!CAR.beaten.includes(r.id));}
function rivalOpen(i){const n=nextRivalIdx();return n<0||i<=n;}
function pips(n,max){let h='';for(let i=0;i<max;i++)h+='<i class="'+(i<n?'on':'')+'"></i>';return'<span class="pips">'+h+'</span>';}
function bar(v){return'<span class="sbar"><i style="width:'+Math.round(clamp(v,0,1)*100)+'%"></i></span>';}
function renderCareer(){const c=$('careerBody');$('careerPts').textContent=CAR.pts.toLocaleString()+' pts';
  if(CV===2&&(careerTab==='skills'||careerTab==='look'))careerTab='rivals';if(CV===1&&careerTab==='golfers')careerTab='rivals';
  $('careerH').textContent=CV===2?'Challenge V2':'Challenge';document.querySelectorAll('#careerTabs button').forEach(b=>{const t=b.dataset.tab;b.hidden=CV===2?(t==='skills'||t==='look'):t==='golfers';});
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
  else if(careerTab==='rivals'){const n=nextRivalIdx();
    h+='<div class="msub">'+(n<0?'You’ve beaten every rival. Rematch anyone for points.':CV===2?'You play as '+ch2Char(CAR.char).name+'. Beat each golfer to unlock them and the next match. '+(CAR.beaten.length)+' of '+RIVALS.length+' beaten.':'Beat each rival to unlock the next. '+(CAR.beaten.length)+' of '+RIVALS.length+' beaten.')+'</div><div class="rvlist">';
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
  c.innerHTML=h;
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

