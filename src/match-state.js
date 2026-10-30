/* ---- match state ---- */
const MATCH={on:false,r:null,hi:0,res:[],sy:[],so:[],honor:0,extra:0,P:null,turn:0,earn:null,over:false};
const gauss=()=>{let u=0,v=0;while(!u)u=Math.random();while(!v)v=Math.random();return Math.sqrt(-2*Math.log(u))*Math.cos(TAU*v);};
function matchUp(){return MATCH.res.reduce((a,b)=>a+(b||0),0);}
function holesPlayed(){return MATCH.res.filter(x=>x!==undefined&&x!==null).length;}
function statusLong(up,thru){const r=MATCH.r?rn(MATCH.r):'Rival';if(!up)return'All square'+(thru?' thru '+thru:'');return(up>0?'You':r)+' '+Math.abs(up)+' UP'+(thru?' thru '+thru:'');}
function statusShort(up){const r=MATCH.r?rn(MATCH.r):'Rival';return up===0?'AS':up>0?'You '+up+' UP':r+' '+(-up)+' UP';}
function endMatchMode(){if(R3.on&&MATCH.on)r3RoundWx();$('game').classList.remove('inmatch');MATCH.on=false;G.aiTurn=false;G.aiChar=false;G.ai=null;G.cm=null;G.look=null;$('matchTag').hidden=true;
  if(CV===2&&typeof r3GolferSet==='function'&&R3.on)r3GolferSet(CHAR_ID);}   // back to your Play Now golfer
/* a match stays on the course it started on (saves from before the 8-course ladder kept the old pairings) */
function matchCid(m,r){if(m&&m.cid&&COURSES[m.cid])return m.cid;if(m&&((m.res&&m.res.length)||m.cur))return ({gus:'troy',kelly:'troy',hank:'stoneridge',priya:'stoneridge',beau:'caledonia',marisol:'caledonia',theo:'trueblue',rex:'trueblue'})[r.id]||r.course;return r.course;}
function freshMatch(r){return{rid:r.id,hi:0,res:[],sy:[],so:[],honor:0,extra:0,ps:3,earn:{holes:0,birdie:0,eagle:0,hio:0,perfect:0,chip:0,putt:0}};}
function startMatch(rid,resume){careerUse(String(rid).startsWith('c2_')?2:1);const r=RV(rid);if(!r)return;
  if(courseGate(matchCid(resume&&CAR.match&&CAR.match.rid===rid?CAR.match:freshMatch(r),r),()=>startMatch(rid,resume)))return;
  if(CV===2&&typeof r3CharLoad==='function'){r3CharLoad(r.cid);r3CharLoad(CAR.char);}
  let m=resume&&CAR.match&&CAR.match.rid===rid?CAR.match:freshMatch(r);CAR.match=m;saveCareer();
  m.cid=matchCid(m,r);saveCareer();
  if(R3.on){if(!(m.wx>=0)){m.wx=r3RandWx();saveCareer();}r3ApplyWx(m.wx,!resume);}
  setCourse(m.cid,false);G.mode='career';MATCH.on=true;MATCH.over=false;MATCH.r=r;MATCH.res=m.res;MATCH.sy=m.sy;MATCH.so=m.so;MATCH.honor=m.honor;MATCH.extra=m.extra||0;MATCH.earn=m.earn;if(!m.ws)m.ws=1+Math.floor(Math.random()*1e9);MATCH.ws=m.ws;
  G.psLeft=Number.isInteger(m.ps)?m.ps:3;G.scores=[];
  $('careerM').hidden=true;$('menuM').hidden=true;G.paused=false;
  matchStartHole(m.hi);
  const cu=resume&&m.cur&&m.cur.hi===m.hi&&m.cur.P&&m.cur.P.length===2?m.cur:null;
  if(cu&&!(cu.P[0].done&&cu.P[1].done)){MATCH.P=cu.P.map(p=>({ball:{...p.ball},prev:{...p.prev},strokes:p.strokes|0,done:!!p.done,conceded:!!p.conceded}));if(cu.wind)G.wind={...cu.wind};
    $('introM').hidden=true;MATCH.turn=-1;G.state='wait';const pd=cu.pend;mNextTurn();if(pd&&MATCH.turn===pd.k)pendResume(pd);
    const up=matchUp();setTimeout(()=>{if(MATCH.on)toast('WELCOME BACK',(m.hi>=18?'Playoff hole':'Hole '+(m.hi+1))+' \u00b7 '+statusLong(up),'#8ee6a8');},1700);}}
function matchStartHole(i){MATCH.hi=i;startHole(i%TB.length);
  MATCH.P=[{ball:{x:0,y:0},prev:{x:0,y:0},strokes:0,done:false},{ball:{x:0,y:0},prev:{x:0,y:0},strokes:0,done:false}];MATCH.turn=0;G.aiTurn=false;G.look=myLook();G.cm=careerMods();
  const r=MATCH.r,up=matchUp(),n=holesPlayed();
  $('iEyebrow').textContent='Match vs '+r.name+' · '+(n?statusLong(up,n):'18-hole match play');
  if(i>=18){$('iNum').textContent=(i+1)+' (playoff)';$('iTip').textContent='All square after 18 — sudden death. Win this hole and the match is yours. '+G.hole.tip;}
  $('howto').hidden=true;$('iFine').hidden=true;
  $('teeBtn').textContent=MATCH.honor===1?'Watch '+rn(r)+' tee off':'Tee off';
  $('matchTag').hidden=false;$('game').classList.add('inmatch');}
// copy a player's ball in and out of the single-ball engine
function mLoad(k){const p=MATCH.P[k];MATCH.turn=k;G.ball={...p.ball};G.prev={...p.prev};G.strokes=p.strokes;G.inCup=false;G.aiTurn=k===1;G.aiSkip=false;
  G.look=k===1?MATCH.r.look:myLook();G.cm=k===1?rivalMods(MATCH.r):careerMods();
  G.aiChar=CV===2&&k===1;if(CV===2&&typeof r3GolferSet==='function'&&R3.on)r3GolferSet(k===1?MATCH.r.cid:CAR.char);}   // V2: each player is their own golfer
function mStore(){const p=MATCH.P[MATCH.turn];p.ball={...G.ball};p.prev={...G.prev};p.strokes=G.strokes;}
function afterShot(){if(!MATCH.on){prepareShot();return;}
  mStore();const p=MATCH.P[MATCH.turn],pin=G.hole.pin;
  // gimmes (4 ft) are normally taken in stopBall; this catches a ball dropped or left there any other way
  if(!p.done&&lieAt(p.ball.x,p.ball.y)==='green'&&hyp(p.ball.x-pin[0],p.ball.y-pin[1])<=GIMME_YD&&p.strokes<10){p.strokes++;p.done=true;p.ball={x:pin[0],y:pin[1]};
    toast('GIMME',(MATCH.turn===1?rn(MATCH.r):'You')+' · '+scoreName(p.strokes,G.hole.par).replace('!','').toLowerCase(),'#8ee6a8');later(1.3,mNextTurn);return;}
  mNextTurn();}
function mHoled(){mStore();const p=MATCH.P[MATCH.turn];p.done=true;p.ball={...G.hole.pin};later(.2,mNextTurn);}
function mPickUp(){mStore();const p=MATCH.P[MATCH.turn];p.done=true;p.strokes=10;later(1.2,mNextTurn);}
function mNextTurn(){const P=MATCH.P,r=MATCH.r;
  // a player who can no longer halve the hole concedes it
  for(const k of[0,1]){const a=P[k],b=P[1-k];if(a.done&&!b.done&&b.strokes+1>a.strokes){b.done=true;b.conceded=true;b.strokes=Math.max(b.strokes+1,a.strokes+1);
    toast(k===0?rn(r).toUpperCase()+' CONCEDES':'HOLE CONCEDED',k===0?'You win the hole':rn(r)+' wins the hole',k===0?'#ffc93c':'#fff6dc');later(1.6,endHoleMatch);return;}}
  if(P[0].done&&P[1].done){later(.4,endHoleMatch);return;}
  let k;
  if(P[0].strokes===0&&P[1].strokes===0)k=MATCH.honor;
  else if(P[0].done)k=1;else if(P[1].done)k=0;
  else if(P[0].strokes===0)k=0;else if(P[1].strokes===0)k=1;
  else{const pin=G.hole.pin,d0=hyp(P[0].ball.x-pin[0],P[0].ball.y-pin[1]),d1=hyp(P[1].ball.x-pin[0],P[1].ball.y-pin[1]);k=d1>d0?1:0;}
  saveMatchTurn();
  const switched=k!==MATCH.turn||(P[0].strokes+P[1].strokes===0);
  mLoad(k);prepareShot();
  if(G.state!=='aim')return;
  if(switched){const t=camTarget();cam.E=[...t.E];cam.L=[...t.L];
    const d=pinDist(),dt=G.lie==='green'?Math.round(d*3)+' ft':Math.round(d)+' yds';
    if(k===1)toast(rn(r).toUpperCase(),'Stroke '+(G.strokes+1)+' · '+dt,'#bfe3ff');else if(P[1].strokes>0||P[0].strokes>0)toast('YOUR SHOT','Stroke '+(G.strokes+1)+' · '+dt,'#ffc93c');}
  if(k===1)aiPlan();}
function saveMatchTurn(){const m=CAR.match;if(!m||!MATCH.on||!MATCH.P)return;
  m.cur={hi:MATCH.hi,P:MATCH.P.map(p=>({ball:{...p.ball},prev:{...p.prev},strokes:p.strokes,done:!!p.done,conceded:!!p.conceded})),wind:{...G.wind}};
  m.hi=MATCH.hi;m.ps=G.psLeft;m.earn=MATCH.earn;m.honor=MATCH.honor;m.ts=Date.now();saveCareer();}
function endHoleMatch(){const P=MATCH.P,r=MATCH.r,i=MATCH.hi,sy=P[0].strokes,so=P[1].strokes,res=sy<so?1:sy>so?-1:0;
  MATCH.res[i]=res;MATCH.sy[i]=sy;MATCH.so[i]=so;if(res)MATCH.honor=res>0?0:1;
  const E=MATCH.earn;if(res>0)E.holes++;
  if(!P[0].conceded){const d=sy-G.hole.par;if(sy===1)E.hio++;else if(d<=-2)E.eagle++;else if(d===-1)E.birdie++;}
  G.aiTurn=false;G.look=myLook();G.cm=careerMods();G.state='card';
  const up=matchUp(),played=Math.min(18,i+1),left=18-played;
  let over=false;if(i<18){if(Math.abs(up)>left)over=true;}else if(res)over=true;
  MATCH.over=over;
  const m=CAR.match;if(m){m.cur=null;m.ts=Date.now();m.hi=i+1;m.res=MATCH.res;m.sy=MATCH.sy;m.so=MATCH.so;m.honor=MATCH.honor;m.ps=G.psLeft;m.earn=E;}
  if(over)finishMatch(up,left,i);else saveCareer();
  showMatchCard(res,over);}
function matchPoints(won){const r=MATCH.r,E=MATCH.earn,again=CAR.beaten.includes(r.id);
  const base=won?Math.round(r.reward*(again?.5:1)):Math.round(r.reward*.2);
  const items=[[won?(again?'Rematch win':'Match win'):'Match played',base],['Holes won ×'+E.holes,E.holes*10],['Birdies ×'+E.birdie,E.birdie*20],['Eagles ×'+E.eagle,E.eagle*60],['Hole in one ×'+E.hio,E.hio*250],['Perfect strikes ×'+E.perfect,E.perfect*5],['Chip-ins ×'+E.chip,E.chip*25],['Long putts ×'+E.putt,E.putt*15]].filter(x=>x[1]>0);
  return{items,total:items.reduce((a,b)=>a+b[1],0)};}
function finishMatch(up,left,i){const r=MATCH.r,won=up>0;const pts=matchPoints(won);MATCH.pts=pts;
  CAR.pts+=pts.total;if(won&&!CAR.beaten.includes(r.id))CAR.beaten.push(r.id);
  MATCH.unlock=null;if(CV===2&&won&&r.cid&&!CAR.unlocked.includes(r.cid)){CAR.unlocked.push(r.cid);MATCH.unlock=r.cid;}
  const rec=CAR.record[r.id]||{w:0,l:0};if(won)rec.w++;else rec.l++;CAR.record[r.id]=rec;
  MATCH.result=i>=18?(won?'You win on the '+ord(i+1):rn(r)+' wins on the '+ord(i+1)):(left===0?(won?'You win ':rn(r)+' wins ')+Math.abs(up)+' UP':(won?'You win ':rn(r)+' wins ')+Math.abs(up)+' & '+left);
  CAR.match=null;saveCareer();}
const ord=n=>n+(n%10===1&&n!==11?'st':n%10===2&&n!==12?'nd':n%10===3&&n!==13?'rd':'th');
function matchTable(from){const r=MATCH.r,idx=[...Array(9)].map((_,k)=>from+k);let run=0;for(let i=0;i<from;i++)run+=MATCH.res[i]||0;
  const head='<thead><tr><th>Hole</th>'+idx.map(i=>'<th>'+(i+1)+'</th>').join('')+'</tr></thead>';
  const par='<tr><td>Par</td>'+idx.map(i=>'<td>'+TB[i].par+'</td>').join('')+'</tr>';
  const row=(lab,arr,sgn)=>'<tr><td>'+lab+'</td>'+idx.map(i=>{const s=arr[i];if(!s)return'<td></td>';const won=MATCH.res[i]===sgn;return'<td'+(won?' class="won"':'')+'><span class="sc '+scClass(s,TB[i].par)+'">'+(s>=10?'X':s)+'</span></td>';}).join('')+'</tr>';
  const st='<tr class="mrow"><td>Match</td>'+idx.map(i=>{if(MATCH.res[i]===undefined||MATCH.res[i]===null)return'<td></td>';run+=MATCH.res[i];return'<td class="'+(run>0?'up':run<0?'dn':'')+'">'+(run===0?'AS':Math.abs(run))+'</td>';}).join('')+'</tr>';
  return head+'<tbody>'+par+row('You',MATCH.sy,1)+row(rn(r),MATCH.so,-1)+st+'</tbody>';}
function showMatchCard(res,over){const r=MATCH.r,i=MATCH.hi,rf=rn(r);
  for(const e of document.querySelectorAll('#cardM .scwrap'))e.hidden=false;$('cardM').querySelector('.legend').hidden=true;$('cardPick').hidden=true;
  $('sc').innerHTML=matchTable(0);$('sc2').innerHTML=matchTable(9);
  const note=$('cNote');note.hidden=false;
  $('cEyebrow').textContent=(i>=18?'Playoff hole '+(i-17):'Hole '+(i+1))+' · You '+(MATCH.sy[i]>=10?'X':MATCH.sy[i])+', '+rf+' '+(MATCH.so[i]>=10?'X':MATCH.so[i]);
  if(over){const won=matchUp()>0;$('cTitle').textContent=won?'Match won!':'Match lost';
    note.innerHTML='<b>'+MATCH.result+'.</b> '+(MATCH.unlock?'<b>'+ch2Char(MATCH.unlock).name+' unlocked</b>: pick them on the Golfers tab. ':'')+(won?'':(CV===2?'Better equipment helps: try '+rf+' again. ':'Upgrade your game and try '+rf+' again. '))+'<span class="earn">'+MATCH.pts.items.map(x=>x[0]+' <b>+'+x[1]+'</b>').join(' · ')+'</span><br><b class="ptot">+'+MATCH.pts.total+' points</b> · '+CAR.pts+' to spend';
    $('nextBtn').textContent='Challenge';if(won)setTimeout(sfx.fanfare,200);}
  else{$('cTitle').textContent=res>0?'You win the hole':res<0?rf+' wins the hole':'Hole halved';
    const up=matchUp(),left=18-Math.min(18,i+1);note.textContent=i>=17&&up===0?'All square after 18 — sudden-death playoff next.':statusLong(up)+(left?' with '+left+' to play.':'.')+(left===Math.abs(up)&&up?(up>0?' Dormie — halve one more and it’s yours.':' Dormie — you need to win every hole left.'):'');
    $('nextBtn').textContent=i>=17?'Next: playoff hole':'Next hole';}
  $('cardM').hidden=false;setTimeout(()=>$('nextBtn').focus({preventScroll:true}),50);}
function matchNext(){if(MATCH.over){endMatchMode();openCareer();return;}matchStartHole(MATCH.hi+1);}

