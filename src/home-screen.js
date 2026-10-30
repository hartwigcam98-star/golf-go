/* ---- home screen: a map of the states we have courses in; tap one for its courses (with a picture of each) ---- */
const ST_NAME={AL:'Alabama',AR:'Arkansas',AZ:'Arizona',CA:'California',CO:'Colorado',CT:'Connecticut',DC:'Washington, DC',DE:'Delaware',FL:'Florida',GA:'Georgia',IA:'Iowa',ID:'Idaho',IL:'Illinois',IN:'Indiana',KS:'Kansas',KY:'Kentucky',LA:'Louisiana',MA:'Massachusetts',MD:'Maryland',ME:'Maine',MI:'Michigan',MN:'Minnesota',MO:'Missouri',MS:'Mississippi',MT:'Montana',NC:'North Carolina',ND:'North Dakota',NE:'Nebraska',NH:'New Hampshire',NJ:'New Jersey',NM:'New Mexico',NV:'Nevada',NY:'New York',OH:'Ohio',OK:'Oklahoma',OR:'Oregon',PA:'Pennsylvania',RI:'Rhode Island',SC:'South Carolina',SD:'South Dakota',TN:'Tennessee',TX:'Texas',UT:'Utah',VA:'Virginia',VT:'Vermont',WA:'Washington',WI:'Wisconsin',WV:'West Virginia',WY:'Wyoming'};
// bounding box of a state's outline on the map (for badges of states added later, and for widening the view)
const stBox=k=>{const n=(US_MAP.st[k]||'').match(/-?[\d.]+/g)||[];let x0=1e9,y0=1e9,x1=-1e9,y1=-1e9;for(let i=0;i+1<n.length;i+=2){const x=+n[i],y=+n[i+1];x0=Math.min(x0,x);x1=Math.max(x1,x);y0=Math.min(y0,y);y1=Math.max(y1,y);}return[x0,y0,x1,y1];};
const stateOf=id=>(COURSES[id].town||'').slice(-2);
const courseImg=id=>typeof COURSE_IMG!=='undefined'?COURSE_IMG[(COURSES[id]&&COURSES[id].data)&&!COURSE_IMG[id]?COURSES[id].data:id]||null:null;
let MSTATE=null;
function buildMap(){const M=US_MAP,has={};for(const id in COURSES){const s=stateOf(id);(has[s]=has[s]||[]).push(id);}
  let vx0=115,vy0=20,vx1=980,vy1=540;for(const k in has){const b=stBox(k);vx0=Math.min(vx0,b[0]-12);vy0=Math.min(vy0,b[1]-12);vx1=Math.max(vx1,b[2]+12);vy1=Math.max(vy1,b[3]+12);}
  const vb=vx0+' '+vy0+' '+(vx1-vx0)+' '+(vy1-vy0);let h='<svg viewBox="'+vb+'" role="img" aria-label="Map of the states with courses">';
  for(const k in M.st)h+='<path d="'+M.st[k]+'"'+(has[k]?' class="has" data-st="'+k+'" role="button" aria-label="'+(ST_NAME[k]||k)+', '+has[k].length+' courses"':'')+'/>';
  const seen={};for(const id in M.dots){if(!COURSES[id])continue;const[x,y]=M.dots[id],key=x+','+y;if(seen[key])continue;seen[key]=1;h+='<circle class="dot" cx="'+x+'" cy="'+y+'" r="9"/>';}
  const BADGE={WI:[650,175],MN:[545,135],SC:[855,425],AL:[700,470],AZ:[198,470]};
  for(const k in has){let b=BADGE[k];if(!b){const q=stBox(k);b=[(q[0]+q[2])/2,(q[1]+q[3])/2];}const t=k+' · '+has[k].length,w=t.length*14+22;h+='<g class="badge" data-st="'+k+'"><rect x="'+(b[0]-w/2)+'" y="'+(b[1]-20)+'" width="'+w+'" height="40" rx="20"/><text x="'+b[0]+'" y="'+b[1]+'">'+t+'</text></g>';}
  $('usMap').innerHTML=h+'</svg>';
  $('usMap').querySelectorAll('[data-st]').forEach(e=>e.addEventListener('click',()=>{A();sfx.tick();showState(e.dataset.st);}));}
function showState(st){MSTATE=st;const ids=Object.keys(COURSES).filter(id=>stateOf(id)===st);
  $('stName').textContent=ST_NAME[st]||st;$('stCount').textContent=ids.length+' course'+(ids.length>1?'s':'');
  $('coursePick').innerHTML=ids.map(id=>{const C=COURSES[id],on=id===CUR.id,img=courseImg(id);return '<button data-c="'+id+'"'+(on?' class="on"':'')+' aria-pressed="'+on+'">'+(img?'<img alt="" src="'+img+'">':'')+'<b>'+C.name.replace(/\//g,'/<wbr>')+'</b><span>'+C.town.replace(/, ..$/,'')+'</span></button>';}).join('');
  $('coursePick').querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>pickCourse(b.dataset.c)));
  $('mapView').hidden=true;$('stateView').hidden=false;}
function showMap(){MSTATE=null;$('stateView').hidden=true;$('mapView').hidden=false;const st=stateOf(CUR.id);$('usMap').querySelectorAll('path.has').forEach(p=>p.classList.toggle('cur',p.dataset.st===st));}
// the menu headline is your Quick play course (Continue and New round play there), even straight after a Daily, match or saved shot elsewhere
function menuHero(){const C=COURSES[homeCourse()],img=courseImg(C.id),el=$('mHeroImg');if(img)el.src=img;else el.removeAttribute('src');
  const sv=C===CUR?null:loadSave(C.saveKey,C.tb.length);$('mEyebrow').textContent=C.name+' \u00b7 '+(C===CUR?teeName():teeNameOf(C,sv&&sv.tee||0))+' \u00b7 Par '+C.tb.reduce((a,h)=>a+h.par,0);$('mTitle').textContent=C.name;}
function setTab(t){const c=t!=='play';$('tabC').hidden=!c;$('tabP').hidden=c;$('tabBtnC').classList.toggle('on',c);$('tabBtnP').classList.toggle('on',!c);$('tabBtnC').setAttribute('aria-selected',String(c));$('tabBtnP').setAttribute('aria-selected',String(!c));
  try{localStorage.setItem('golf-tab',c?'courses':'play');}catch(e){}}
$('tabBtnC').addEventListener('click',()=>{A();sfx.tick();setTab('courses');});$('tabBtnP').addEventListener('click',()=>{A();sfx.tick();setTab('play');});
$('stBack').addEventListener('click',()=>{A();sfx.tick();showMap();});
buildMap();try{setTab(localStorage.getItem('golf-tab')==='play'?'play':'courses');}catch(e){setTab('courses');}
$('mNew').addEventListener('click',()=>{A();if(homeSave()&&!newArmed){newArmed=true;$('mNewWarn').hidden=false;return;}newRound();});
$('mPractice').addEventListener('click',()=>{$('mMain').hidden=true;$('mHoles').hidden=false;});
$('mGolfer').addEventListener('click',()=>{A();sfx.tick();openChars();});$('chGo').addEventListener('click',()=>{A();pickChar();});$('chBack').addEventListener('click',()=>{A();sfx.tick();$('charM').hidden=true;$('menuM').hidden=false;});golferRow();
$('mHolesBack').addEventListener('click',()=>{$('mHoles').hidden=true;$('mMain').hidden=false;});
$('mClose').addEventListener('click',closeMenu);
$('mMatchCont').addEventListener('click',()=>{A();const v=pendingMatchV();if(v)startMatch(carOf(v).match.rid,true);});
/* a match belongs to the Challenge it was started in: the other one stays shut until the match is finished (switching mid-match
   would send its points and its save to the wrong Challenge) */
const careerBusy=(v,sub)=>{if(!MATCH.on||CV===v)return false;$(sub).textContent='Finish your match in '+(CV===2?'Challenge V2':'Challenge')+' first';sfx.tick();return true;};
$('mCareer2').addEventListener('click',()=>{A();if(careerBusy(2,'mCareer2Sub'))return;careerUse(2);openCareer();sfx.tick();});
$('mCareer').addEventListener('click',()=>{A();if(careerBusy(1,'mCareerSub'))return;careerUse(1);openCareer();sfx.tick();});
/* owner-only (by player id, not name): press and hold the Daily round button for 2.5 s to clear today's saved daily round
   on this phone. Nothing on screen hints at it; for anyone else the button behaves as normal. */
{const OWN=['p5sa6c8gmmuvyzitv','p266y26e7muq7fyur'],btn=$('mDaily');let tm=null;const stop=()=>{if(tm){clearTimeout(tm);tm=null;}};
  btn.addEventListener('pointerdown',()=>{stop();let pid='';try{pid=localStorage.getItem('golf-pid')||'';}catch(e){}if(!OWN.includes(pid))return;
    tm=setTimeout(()=>{tm=null;btn.dataset.rst='1';try{localStorage.removeItem(DAILY.save);}catch(e){}sfx.tick();
      try{dailyMenuLine();}catch(e){}const sb=$('mDailySub');if(sb)sb.textContent='Today’s daily round has been reset.';},2500);});
  ['pointerup','pointerleave','pointercancel'].forEach(ev=>btn.addEventListener(ev,stop));}
/* one-off resets of a player's daily round (Cam's call): [player id, day]. Clears that day's saved round on that player's
   phone once (a round already posted to the leaderboard is left alone). */
{const RS=[['pxrsrgti7mv8vl59k','2026-10-27']];   // OgTwig, Oct 27
  try{const pid=localStorage.getItem('golf-pid')||'';for(const [p,day] of RS)if(p===pid&&!localStorage.getItem('golf-rst-'+day)){
    const d=JSON.parse(localStorage.getItem(DAILY.save)||'null');if(d&&d.day===day&&!d.posted)localStorage.removeItem(DAILY.save);
    localStorage.setItem('golf-rst-'+day,'1');try{dailyMenuLine();}catch(e){}}}catch(e){}}
$('mDaily').addEventListener('click',e=>{if($('mDaily').dataset.rst){delete $('mDaily').dataset.rst;return;}A();sfx.tick();DAILY.calSel=dailyDay();openDailyBoard(false,dailyDay(),'cal');});   // anyone can look at the leaderboards; the name is asked for at Play
$('dNameGo').addEventListener('click',dailyNameGo);
$('dAuthGo').addEventListener('click',dailyAuthGo);for(const id of['dAuthEmail','dAuthCode'])$(id).addEventListener('keydown',e=>{if(e.key==='Enter')dailyAuthGo();});
$('dAuthBack').addEventListener('click',()=>{A();if(DAILY.authStep==='code'){DAILY.authStep='email';$('dAuthCode').hidden=true;$('dAuthEmail').disabled=false;$('dAuthGo').textContent='Email me a code';$('dAuthErr').hidden=true;return;}$('dAuth').hidden=true;openDailyBoard(false);});
$('dSignOut').addEventListener('click',()=>{A();authSignOut();dailyPlay.checked=null;openDailyBoard(false);});$('dNameIn').addEventListener('keydown',e=>{if(e.key==='Enter')dailyNameGo();});
$('dPlay').addEventListener('click',()=>{A();dailyPlay();});
$('dList').addEventListener('click',e=>{const li=e.target.closest('li[data-i]');if(li){A();openDailyCard(+li.dataset.i);}});
$('dList').addEventListener('keydown',e=>{if(e.key!=='Enter')return;const li=e.target.closest('li[data-i]');if(li){A();openDailyCard(+li.dataset.i);}});
for(const id of['dc1','dc2'])$(id).addEventListener('click',e=>{const th=e.target.closest('th[data-h]');if(th){DCARD.src=null;specStart(+th.dataset.h);}});
for(const id of['rc1','rc2'])$(id).addEventListener('click',e=>{const th=e.target.closest('th[data-h]');if(th){A();recWatch(+th.dataset.h);}});
$('rcWatch').addEventListener('click',()=>{A();recWatch(0);});
$('dcWatch').addEventListener('click',()=>{DCARD.src=null;specStart(0);});
$('dcList').addEventListener('click',()=>{A();closeDailyCard();});
$('specNext').addEventListener('click',e=>{e.stopPropagation();specNext();});
$('specFF').addEventListener('click',e=>{e.stopPropagation();A();specFFCycle();});specFFShow();
$('specExit').addEventListener('click',e=>{e.stopPropagation();A();specEnd();});
$('dPrev').addEventListener('click',()=>{A();openDailyBoard(false,dayShift(DAILY.view.day,-1),'day');});
$('dNext').addEventListener('click',()=>{A();openDailyBoard(false,dayShift(DAILY.view.day,1),'day');});
$('dTabDay').addEventListener('click',()=>{A();openDailyBoard(false,(DAILY.view&&DAILY.view.tab==='cal'&&CAL.sel<=dailyDay()?CAL.sel:DAILY.view&&DAILY.view.day),'day');});
$('dTabCal').addEventListener('click',()=>{A();DAILY.calSel=DAILY.view&&DAILY.view.day;openDailyBoard(false,DAILY.view&&DAILY.view.day,'cal');});
$('cPrev').addEventListener('click',()=>{A();const[y,m]=CAL.month.split('-').map(Number);CAL.month=new Date(Date.UTC(y,m-2,1)).toISOString().slice(0,7);calDraw();});
$('cNext').addEventListener('click',()=>{A();const[y,m]=CAL.month.split('-').map(Number);CAL.month=new Date(Date.UTC(y,m,1)).toISOString().slice(0,7);calDraw();});
$('cGrid').addEventListener('click',e=>{const b=e.target.closest('button[data-d]');if(!b||b.disabled)return;A();CAL.sel=b.dataset.d;DAILY.calSel=CAL.sel;calDetail();});
$('cDayBoard').addEventListener('click',()=>{A();openDailyBoard(false,CAL.sel,'day');});
$('dTabAll').addEventListener('click',()=>{A();openDailyBoard(false,DAILY.view&&DAILY.view.day,'all');});$('dShare').addEventListener('click',()=>{A();dailyShare();});
$('dBack').addEventListener('click',()=>{A();$('dailyM').hidden=true;openMenu(!!G.hole);});
$('mRec').addEventListener('click',()=>{A();openRecords(CUR.id);});
$('rBack').addEventListener('click',()=>{A();if(!$('rCardV').hidden){openRecords(RECS.cid);return;}RECS.tok++;$('recM').hidden=true;openMenu(!!G.hole);});
$('rcList').addEventListener('click',()=>{A();openRecords(RECS.cid);});
$('rPrev').addEventListener('click',()=>recStep(-1));$('rNext').addEventListener('click',()=>recStep(1));
$('rList').addEventListener('click',e=>{const li=e.target.closest('li[data-i]');if(li){A();recCard(+li.dataset.i);}});
$('rList').addEventListener('keydown',e=>{const li=e.target.closest('li[data-i]');if(li&&(e.key==='Enter'||e.key===' ')){e.preventDefault();recCard(+li.dataset.i);}});
$('cardPost').addEventListener('click',e=>{e.stopPropagation();A();recPost();});
$('cardName').addEventListener('keydown',e=>{if(e.key==='Enter')recPost();});
$('careerBack').addEventListener('click',()=>{A();closeCareer();});
document.querySelectorAll('#careerTabs button').forEach(b=>b.addEventListener('click',()=>{careerTab=b.dataset.tab;careerSel=null;sfx.tick();renderCareer();}));
$('nextBtn').addEventListener('click',nextFromCard);
$('ffBtn').addEventListener('pointerdown',e=>{e.preventDefault();e.stopPropagation();A();cycleFF();});
$('rpSave').addEventListener('pointerdown',e=>e.stopPropagation());$('rpVideo').addEventListener('pointerdown',e=>e.stopPropagation());
$('rpSave').addEventListener('click',e=>{e.stopPropagation();A();hlSave();});$('rpVideo').addEventListener('click',e=>{e.stopPropagation();A();recThisReplay();});
$('mHl').addEventListener('click',()=>{A();sfx.tick();openHl();});$('hlBack').addEventListener('click',()=>{A();$('hlM').hidden=true;openMenu(!!G.hole&&G.mode!=='highlight');});
$('vidSave').addEventListener('click',()=>{A();recSave();});$('vidClose').addEventListener('click',()=>{A();$('vidM').hidden=true;REC.blob=null;if(G.mode==='highlight'&&!HL.on)openHl();});
$('replayBtn').addEventListener('click',()=>{A();if(G.state==='aim'&&G.canReplay)startReplay(()=>{G.state='aim';});});
$('cardReplay').addEventListener('click',()=>{A();startReplay(()=>{G.state='card';$('cardM').hidden=false;});});
$('soundBtn').addEventListener('click',()=>{S.on=!S.on;$('soundWaves').style.opacity=S.on?1:.15;if(S.on){unlockAudio();setTimeout(()=>sfx.strike(1,1,'wood','tee'),60);}else if(S.tag)S.tag.pause();});
const modalOpen=()=>!!document.querySelector('.modal:not([hidden])');
window.addEventListener('keydown',e=>{
  if(!$('faqM').hidden){if(e.key==='Escape'){e.preventDefault();$('faqM').hidden=true;}return;}
  if(!$('reqM').hidden){if(e.key==='Escape'){e.preventDefault();$('reqM').hidden=true;}return;}
  if(!$('pauseM').hidden){if(e.key==='Escape'){e.preventDefault();if(!$('pFbView').hidden&&!PAUSE.fbOnly){$('pFbView').hidden=true;$('pMain').hidden=false;}else if(PAUSE.home)closeSettings();else closePause();}return;}
  if(e.key==='Escape'&&!G.replay&&inRound()&&!modalOpen()){e.preventDefault();openPause();return;}
  if(G.replay&&(e.code==='Space'||e.key==='Escape')){e.preventDefault();endReplay();return;}
  if(!$('bagM').hidden&&e.key==='Escape'){$('bagM').hidden=true;return;}
  if(modalOpen())return;   // any window up (menu, saved shots, daily board, records, golfers, relief…): no swings behind it
  if(e.key==='b'||e.key==='B'){openBag();return;}
  if(e.code==='Space'){e.preventDefault();if(!e.repeat)tap(e.timeStamp);}
  else if(e.key==='ArrowLeft'||e.key==='ArrowRight'){keys[e.key]=true;e.preventDefault();}
  else if(e.key==='ArrowUp'){changeClub(-1);e.preventDefault();}
  else if(e.key==='ArrowDown'){changeClub(1);e.preventDefault();}
  else if(e.key==='f'||e.key==='F'){cycleFF();}
  else if(e.key==='m'||e.key==='M'){if(G.state==='aim')G.overview=!G.overview;}
});
window.addEventListener('keyup',e=>{keys[e.key]=false;});

