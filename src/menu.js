/* ---------- menu ---------- */
function holeLen(i){const L=holeLine(i);let d=0;for(let k=1;k<L.length;k++)d+=hyp(L[k][0]-L[k-1][0],L[k][1]-L[k-1][1]);return Math.round(d);}
function openMenu(fromGame){if(G.rangeHome&&rangeHomeBack()){G.paused=false;startHole(0);}G.paused=true;$('menuM').hidden=false;try{menuHero();if(MSTATE)showState(MSTATE);else showMap();menuPlay();}catch(e){console.error(e);}$('dailyM').hidden=true;$('charM').hidden=true;try{dailyMenuLine();}catch(e){}$('mHoles').hidden=true;$('mMain').hidden=false;$('mNewWarn').hidden=true;newArmed=false;
  const sv=homeSave(),hTB=COURSES[homeCourse()].tb;$('mContinue').hidden=!sv;$('mContinueSub').hidden=!sv;
  {const n=hlList().length;$('mHl').hidden=!n;$('mHlN').textContent=n?'('+n+')':'';}
  if(sv){let d=0,n=0;(sv.scores||[]).forEach((x,i)=>{if(x&&hTB[i]){d+=x-hTB[i].par;n++;}});
    $('mContinueSub').textContent='Hole '+(sv.hi+1)+(sv.mid?' \u00b7 stroke '+(sv.strokes+1):'')+' \u00b7 '+(n?fmtDiff(d)+' through '+n:'no holes finished yet')+' \u00b7 saved '+new Date(sv.ts).toLocaleDateString(undefined,{month:'short',day:'numeric'});}
  $('mNew').className=sv?'ghost disp':'primary disp';
  $('mClose').hidden=!(fromGame&&G.hole)||G.mode==='spectate';
  const pv=pendingMatchV(),cmx=pv?carOf(pv).match:null,showM=!!cmx&&!MATCH.on&&!!RV(cmx.rid);$('mMatchCont').hidden=!showM;$('mMatchSub').hidden=!showM;
  if(showM){const r=RV(cmx.rid),up=(cmx.res||[]).reduce((a,b)=>a+(b||0),0),cu=cmx.cur&&cmx.cur.hi===cmx.hi?cmx.cur:null;
    $('mMatchCont').innerHTML='Continue match <span>vs '+rn(r)+'</span>';
    $('mMatchSub').textContent=COURSES[matchCid(cmx,r)].name+' \u00b7 hole '+(cmx.hi+1)+(cu?' \u00b7 stroke '+(cu.P[0].strokes+1):'')+' \u00b7 '+(up===0?'all square':(up>0?'you ':rn(r)+' ')+Math.abs(up)+' up')+(cmx.ts?' \u00b7 saved '+new Date(cmx.ts).toLocaleDateString(undefined,{month:'short',day:'numeric'}):'');}
  setTimeout(()=>(showM?$('mMatchCont'):$('mContinue').hidden?$('mNew'):$('mContinue')).focus({preventScroll:true}),50);}
function closeMenu(){$('menuM').hidden=true;G.paused=false;}
