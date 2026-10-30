/* ---------- hud ---------- */
function impShort(){const x=G.imp.x,y=G.imp.y,h=G.traj>0?'High':G.traj<0?'Low':'';if(Math.hypot(x,y)<.15)return h||'Centre';const a=h?[h]:[];if(y>.2)a.push('Top');else if(y<-.2)a.push('Back');if(x<-.2)a.push('Draw');else if(x>.2)a.push('Fade');return a.join(' ')||'Centre';}
function impName(){const x=G.imp.x,y=G.imp.y,h=G.traj>0?'High':G.traj<0?'Low':'';if(Math.hypot(x,y)<.15)return h?h+' \u00b7 centre':'Centre';const a=h?[h]:[];if(y>.2)a.push('Topspin');else if(y<-.2)a.push('Backspin');if(x<-.2)a.push('Draw');else if(x>.2)a.push('Fade');return a.join(' \u00b7 ')||'Centre';}
/* HUD style: '' classic, 'a' arcade, 'b' broadcast (TV), 'c' minimal glass */
let HUD_STYLE=(()=>{try{return localStorage.getItem('golf-hud')||'';}catch(e){return'';}})();
function hudApply(){const g=$('game');g.classList.remove('hud-a','hud-b','hud-c');if(HUD_STYLE)g.classList.add('hud-'+HUD_STYLE);
  document.querySelectorAll('#pHud button').forEach(b=>b.classList.toggle('on',b.dataset.u===HUD_STYLE));for(const k in cache)if(/^bc/.test(k))delete cache[k];if(typeof MCLK==='object'&&MCLK)MCLK.w=0;try{resize();}catch(e){}}   // the meter's width is re-measured (Minimal's upright meter is shorter)
document.querySelectorAll('#pHud button').forEach(b=>b.addEventListener('click',()=>{HUD_STYLE=b.dataset.u;try{localStorage.setItem('golf-hud',HUD_STYLE);}catch(e){}hudApply();}));
hudApply();
function updHud(){
  const h=G.hole;if(!h)return;
  $('replayBtn').hidden=!(G.state==='aim'&&G.canReplay&&!G.overview&&!G.aiTurn&&!G.fc);
  { const gb=$('flagBtn'),on=G.state==='aim'&&!G.aiTurn&&curClub().putter&&G.lie==='green';gb.hidden=!on;if(on){if(!MCLK.w||MCLK.fb==null)MCLK.fb=$('menuBtn').getBoundingClientRect().bottom+8;gb.style.top=MCLK.fb+'px';setT('flagBtn',G.flagOut?'\u26f3 Flag out':'\u26f3 Flag in');} }   // v105: a small chip top right, under the menu, clear of the golfer
  { const rb=$('rpBar'),rv=!!G.replay&&!REC.on&&!SPEC.on;rb.hidden=!rv;if(rv){rb.style.bottom=(botH+4)+'px';const sv=$('rpSave');sv.hidden=G.mode==='highlight';sv.textContent=G.lastShot&&G.lastShot.saved?'\u2605 Saved':'\u2606 Save';sv.classList.toggle('on',!!(G.lastShot&&G.lastShot.saved));$('rpVideo').hidden=!recOK();} }
  { const fb=$('flyCamBtn'),rgc=!!(G.hole&&G.hole.range&&!G.replay),on=rgc?(G.state==='flight'||G.state==='bounce'||G.state==='roll'):G.replay?(!REC.on&&!G.lastShot.putt):(G.state==='flight'||G.state==='bounce'||G.state==='roll')&&G.fromLie!=='green'&&!(typeof SPEC!=='undefined'&&SPEC.on);fb.hidden=!on;if(on){fb.style.bottom=(botH+4)+'px';setT('flyCamBtn',rgc?(G.rangeFollow?'\ud83c\udfcc\ufe0f Golfer view':'\ud83c\udfaf Trail view'):FLY_TV?'\ud83c\udfaf Trail view':'\ud83d\udcfa TV view');} }
  const ffOk=ffActive();$('ffBtn').hidden=!ffOk;if(ffOk){setT('ffBtn',G.ff>1?'\u23e9 '+G.ff+'\u00d7 speed':'\u23e9 Speed up');$('ffBtn').classList.toggle('on',G.ff>1);}
  $('cardReplay').hidden=!G.canReplay;
  {const rb=$('rangeGo'),cb=$('rangeChartBtn'),on=!!h.range&&(G.state==='aim'||G.state==='wait');rb.hidden=!on;cb.hidden=!on||!(G.rangeLog&&G.rangeLog.length);const db=$('rangeDataBtn');db.hidden=!on||!(G.tmHist&&G.tmHist.length);if(on){if(!MCLK.w||MCLK.fb==null)MCLK.fb=$('menuBtn').getBoundingClientRect().bottom+8;rb.style.top=MCLK.fb+'px';cb.style.top=(MCLK.fb+44)+'px';db.style.top=(MCLK.fb+(cb.hidden?44:84))+'px';}}
  if(h.range){setT('hNum','R');setT('hPar','Driving range');setT('hStroke','Ball '+((G.rangeN||0)+1));setT('windV',String(G.wind.mph));}else{setT('hNum',String(G.hi+1));setT('hPar','Par '+h.par+' · '+h.len+' yds');
  const sn=Math.min(10,G.strokes+(G.state==='holed'||G.state==='card'?0:1));
  if(MATCH.on){setT('hStroke',(G.aiTurn?rn(MATCH.r):'You')+' \u00b7 stroke '+sn);const up=matchUp(),n=holesPlayed();setT('matchTag',(G.state==='card'||G.state==='intro'?'vs '+rn(MATCH.r):G.aiTurn?rn(MATCH.r)+'\u2019s shot':'Your shot')+' \u00b7 '+statusShort(up)+(n?' thru '+Math.min(18,n):''));}
  else setT('hStroke','Stroke '+sn+(G.mode==='practice'?' \u00b7 Practice':' \u00b7 Round '+fmtDiff(roundDiff())));}
  setT('windV',String(G.wind.mph));
  if(HUD_STYLE==='b'){setT('bcHole',String(G.hi+1));setT('bcPar',String(h.par));setT('bcYds',String(h.len));setT('bcStk',String(sn));setT('bcWind',G.wind.mph+' mph');
    $('bcArrow').style.transform='rotate('+((G.wind.a-V.yaw)*180/Math.PI)+'deg)';
    const ch=MATCH.on&&G.aiTurn?{name:rn(MATCH.r)}:curChar(),pl=$('bcPlate');setT('bcName',ch.name);
    setT('bcScore',MATCH.on?statusShort(matchUp()):G.mode==='practice'?'PRAC':fmtDiff(roundDiff()));setT('bcThru','thru '+Math.min(18,G.hi));pl.style.bottom=(botH+6)+'px';
    pl.style.visibility=(G.state==='aim'||G.state==='power'||G.state==='acc')&&!G.overview?'visible':'hidden';}
  {const d=Math.round((G.wind.a-V.yaw)*360/Math.PI);if(MCLK.wa!==d){MCLK.wa=d;$('windArrow').style.transform='rotate('+(d/2)+'deg)';}}   // a new string only when it turns (0.5 deg); no CSS transition (Oct 28: it restarted every frame as the camera turned)
  const c=curClub();setT('clubId',clubLabel(c));
  const lr0=c.putter?'':lieRange(c,G.lie);setT('clubInfo',c.putter?'Putter · '+Math.round(G.puttMax*3)+' ft':(lr0?'Lie '+lr0:c.id==='1W'?(onTeeBox()?'Off the tee':'Off the deck'):c.name)+' · '+Math.round(previewDist())+'y');   // rough/fescue: the lie's power range (rolled per shot) in place of the club's name
  const lie=(G.state==='flight'||G.state==='roll'||G.state==='bounce'||G.state==='replay')?G.fromLie:G.lie;
$('lieDot').style.background=LIE_COL[lie]||'#6db14a';
  const d=pinDist(),plw=curClub().putter?Math.round(d):Math.round(d/Math.max(.5,1+windAlong(G.aim)));setT('pinTxt',(G.lie==='green'||d<20)?'Cup '+Math.round(d*3)+' ft':'Pin '+Math.round(d)+(Math.abs(plw-d)>=2?' \u00b7 plays '+plw:' yds')+(Math.abs(pinRise())>=1.5?(pinRise()>0?' \u25b2':' \u25bc')+Math.round(Math.abs(pinRise())*3)+' ft':''));
  const aiming=G.state==='aim'&&!G.aiTurn;
  { const bk=bunkerSide();$('shots').classList.toggle('bunker',bk); }
  for(const t in SHOTS){const b=$('st_'+t);b.disabled=!aiming||c.putter||!shotOK(t,G.clubIdx)&&!SHOTS[t].clubs.length||(t==='spin'&&!(G.lie==='fairway'||G.lie==='tee'||G.lie==='cut'))||(BUNKER_T[t]&&!bunkerSide());b.classList.toggle('on',!c.putter&&G.stype===t);b.setAttribute('aria-pressed',String(!c.putter&&G.stype===t));}
  $('clubPrev').disabled=$('clubNext').disabled=!aiming||G.lie==='green';$('clubName').disabled=!aiming||G.lie==='green';
  $('spinBtn').disabled=!aiming||c.putter;
  if(G.state!=='aim'||c.putter)$('impPop').hidden=true;
  setT('spinTxt',c.putter?'\u2014':impShort());$('spinDot').setAttribute('cx',12+G.imp.x*6);$('spinDot').setAttribute('cy',12-G.imp.y*6);
  { const pb=$('psBtn'),ok=aiming&&!c.putter&&G.stype==='full';pb.disabled=!ok&&!G.pshot;pb.classList.toggle('on',G.pshot);setT('psBtn','\u26a1');
    if(G.pshot&&(c.putter||G.stype!=='full')&&aiming)G.pshot=false;$('meter').classList.toggle('power',G.pshot); }
  { const base=lieNm(lie)||'',sl=(G.state==='aim'||G.state==='power'||G.state==='acc')?stanceLabel().replace(/ feet/g,''):'';setT('lieTxt',sl?base+' \u00b7 '+sl:base); }
  $('aimL').disabled=$('aimR').disabled=$('mapBtn').disabled=!aiming;
  { const lk=!!G.fc&&aiming,lb=$('lookBtn');lb.hidden=!aiming||G.overview;lb.classList.toggle('on',lk);lb.setAttribute('aria-pressed',String(lk));
    lb.style.bottom=(botH+4)+'px';{const cb=$('camBtn');cb.hidden=!aiming||G.overview||lk||c.putter||G.lie==='green';cb.style.bottom=(botH+4)+'px';setT('camNum',String(CAMV+1));}$('lookBar').hidden=!lk;{const rb=$('lookRead'),on=lk&&!!G.fc.read;rb.hidden=!lk||!nearGreen();rb.classList.toggle('on',on);rb.setAttribute('aria-pressed',String(on));}{const ll=$('lookLand'),on=lk&&!!G.fc.follow;ll.classList.toggle('on',on);ll.setAttribute('aria-pressed',String(on));}
    $('slopeKey').hidden=true;   // v105: the slope colour key is gone (it sat over the club); the green's colours still show
    const rt=$('lookRet');rt.hidden=!lk;
    if(lk){const f=G.fc,ty=hAt(f.tx,f.tz),q=proj(f.tx,ty,f.tz);if(q){rt.style.left=q[0]+'px';rt.style.top=q[1]+'px';}else rt.hidden=true;
      const b=G.ball,d=hyp(f.tx-b.x,f.tz-b.y),rise=(ty-hAt(b.x,b.y))*3,pd=hyp(f.tx-G.hole.pin[0],f.tz-G.hole.pin[1]);
      const fol=f.follow&&!c.putter,lie=lieNm(lieAt(f.tx,f.tz))||'';rt.classList.toggle('mk',fol);
      if(fol&&G.landE){rt.style.left=G.landE.x+'px';rt.style.top=G.landE.y+'px';$('lookTxt').style.top=(17+G.landE.ry+12)+'px';}else $('lookTxt').style.top='';
      setT('lookTxt',(lie&&!c.putter?lie+' \u00b7 ':'')+(d<20?Math.round(d*3)+' ft':Math.round(d)+' yds')+(fol?' carry':'')+(Math.abs(rise)>=2?(rise>0?' \u25b2':' \u25bc')+Math.round(Math.abs(rise))+' ft':'')+(pd<25&&pd>=1&&d>25?' \u00b7 '+Math.round(pd*3)+' ft to pin':''));} }
  const sw=$('swing'),st=G.state;
  if(G.aiTurn){sw.disabled=G.aiSkip||!(st==='aim'||st==='power'||st==='acc'||ffActive());setT('swing',G.aiSkip?'SKIPPING\u2026':'SKIP \u25b8\u25b8');sw.classList.remove('power','acc');}
  else{sw.disabled=!(st==='aim'||st==='power'||st==='acc');setT('swing',st==='power'?'POWER':st==='acc'?'IMPACT!':G.fc?'\u21a9 BACK':'SWING');
  sw.classList.toggle('power',st==='power');sw.classList.toggle('acc',st==='acc');}
  setT('hint',G.aiTurn?rn(MATCH.r)+(G.aiSkip?' \u00b7 skipping ahead':' is playing \u00b7 tap Skip to jump ahead'):st==='aim'?(G.fc?(G.fc.follow?'Scouting your shot \u00b7 change club or aim \u00b7 drag to turn \u00b7 pinch to zoom':'Free look \u00b7 tap Landing to follow your shot again'):G.overview?(DESK?'Click or press M to return to your ball':'Tap anywhere to return to your ball'):c.putter?(GL.slOK?'Grid lines: red is steep, green is gentle \u00b7 the glow runs downhill':'Watch the dots on the green — they flow downhill'):(G.stype==='full'||G.stype==='spin'?(DESK?'Space to swing \u00b7 \u2190 \u2192 aim \u00b7 \u2191 \u2193 club \u00b7 B bag \u00b7 M map':'Drag to aim · Tap Swing to start'):SHOTS[G.stype].hint)):st==='power'?(DESK?'Space to set power':'Tap to set power'):st==='acc'?(DESK?'Space on the white line':'Tap on the white line'):' ');
  const m=G.meter,w=perfectWin();
  {const mc=$('mCursor');if(!MCLK.w)MCLK.w=$('meter').clientWidth;const mw=MCLK.w,px=Math.round(m.pos*mw*10);if(MCLK.cx!==px||MCLK.cw!==mw){MCLK.cx=px;MCLK.cw=mw;mc.style.transform='translate3d('+(px/10).toFixed(1)+'px,0,0)';}}
  // meter scale in distance: carry yards for full and short shots, feet of roll for putts on the green (percent for putts off it)
  { const pg=c.putter&&G.lie==='green',pct=c.putter&&!pg,sh=isShort()&&!c.putter,mx=c.putter?G.puttMax*3:(sh?(G.swMax||natMax()):natMax())*shotMods().carry;
    const wf=c.putter?1:Math.max(.5,1+windAlong(G.aim));   // v93: the yardages along the meter are what the ball flies in this wind
    const lb=f=>pct?String(Math.round(f*100)):Math.max(1,Math.round(mx*wf*(sh?m2p(f):f)))+(pg?' ft':'y');setT('ml1',lb(.25));setT('ml2',lb(.5));setT('ml3',lb(.75));setT('ml4',pct?'Max':lb(1)); }
  const fillTo=st==='power'?m.pos:(st==='acc'?IMPACT+p2m(m.power)*(1-IMPACT):IMPACT);
  meterFill(fillTo);
  const lk=$('mLock');lk.hidden=st!=='acc';lk.style.left=((IMPACT+p2m(m.power)*(1-IMPACT))*100)+'%';
  const sweet=$('mSweet');sweet.style.left=((IMPACT-w)*100)+'%';sweet.style.width=(w*200)+'%';
  const tm=$('mTap');tm.hidden=G.tapMark==null||st==='power'||st==='acc';if(!tm.hidden){tm.style.left=(G.tapMark*100)+'%';tm.classList.toggle('good',Math.abs(G.tapMark-IMPACT)<=perfectWin());}
  const fl=$('mFlag'),shortF=!c.putter&&isShort()&&G.swMax>0,showF=(c.putter||shortF)&&(st==='aim'||st==='power'||st==='acc')&&!G.overview&&!G.aiTurn;fl.hidden=!showF;
  if(showF){if(st==='aim'||G.flagP===undefined)G.flagP=shortF?(()=>{const P=shortPlan();return P.carry/(G.swMax*shotMods().carry);})():puttTargetPower();const tp=G.flagP;
    if(tp===null)fl.hidden=true;else{const over=tp>1;fl.classList.toggle('over',over);fl.style.left=((IMPACT+p2m(Math.min(1,tp))*(1-IMPACT))*100)+'%';setT('mFlagTxt',over?'Beyond max':shortF?(()=>{const d=pinDist(),pl=Math.round(d/Math.max(.5,1+windAlong(G.aim)));return Math.round(d)+' y'+(Math.abs(pl-d)>=2?' \u00b7 plays '+pl:'');})():Math.round(pinDist()*3)+' ft');fl.classList.toggle('flip',tp>.8);}}
}

