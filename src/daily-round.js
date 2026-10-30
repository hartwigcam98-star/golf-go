/* ---------- daily round: one course a day for everyone, same pins, wind and weather; one official attempt; online leaderboard ---------- */
const DAILY={url:'https://rgzpfjstfgygqdfmiqdh.supabase.co',key:'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJnenBmanN0Zmd5Z3FkZm1pcWRoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTA4NjE1OTMsImV4cCI6MjEwNjQzNzU5M30._G3yxO9ssvNKkMymv7WWZOd2wiG-OB8dvRfm_ZLu3ig',tz:'America/Chicago',save:'golf-daily-v1',order:['troy','stoneridge','caledonia','trueblue','rossbridge','legislator','judge','senator']};
function dailyDay(){try{return new Intl.DateTimeFormat('en-CA',{timeZone:DAILY.tz,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date());}catch(e){const d=new Date(Date.now()-6*36e5);return d.toISOString().slice(0,10);}}
function dailyNum(day){const[y,m,d]=day.split('-').map(Number);return Math.round(Date.UTC(y,m-1,d)/864e5);}
function dailyNice(day){if(!day)return'';const[y,m,d]=day.split('-').map(Number);return new Date(Date.UTC(y,m-1,d,12)).toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'});}
// from Oct 3 2026 the rotation includes the Sand Valley and Iron Range courses; earlier days keep the original eight
const DAILY_ORDER2=['sandvalley','troy','quarry','mammoth','stoneridge','lido','wilderness','caledonia','sedge','trueblue','legend','rossbridge','legislator','judge','senator'],DAILY_N2=Math.round(Date.UTC(2026,9,3)/864e5);
// from 2026-10-04 the two Cambrian Ridge 18s join the rotation (17 courses; Oct 3 keeps its course)
const DAILY_ORDER3=['troy','crsc','quarry','mammoth','stoneridge','lido','wilderness','caledonia','sedge','trueblue','crls','heritage','legend','rossbridge','legislator','pawplant','judge','senator','sandvalley'],DAILY_N3=Math.round(Date.UTC(2026,9,4)/864e5);
// from 2026-10-05: 22 courses, with the Brainerd Lakes three (Deacon's Lodge, The Classic at Madden's, The Lehman 18) spread through it
// From 2026-10-05 the daily course never resets: each day it's the course that has gone longest without being the daily
// (never-played courses first, ties in DAILY_POOL order). Days before that keep their old lists.
// To add a course: append [id, first day it may be picked (a future date)] so today's and past days' courses never change.
const DAILY_N4=Math.round(Date.UTC(2026,9,5)/864e5),DAILY_POOL=[['rushcreek',20755],['kingsnorth',20754],['lawsonia',20754],['sentryworld',20754],['dacotah',20753],['baker',20753],['jacks',20753],['jewel',20746],['ridges',20746],['edinburgh',20746],['willingers',20746],['northfork',20746],['desertcanyon',20742],['farmlinks',20740],['royal',20738],['prestwick',20737],['mystic',20737],['legends',20737],['chaska',20737],['slmh',20736],['slbm',20736],['interlachen',20735],['windsong',20735],['hazeltine',20735],['gnlinks',20734],['gnlake',20734],['lookout',20734],['wigwam',20734],['dove',20734],['ridge',20734],['valley',20734],['orangeburg',20734],['santee',20734],['wyboo',20734],['crsc',0],['deacon',0],['quarry',0],['mammoth',0],['pines',0],['stoneridge',0],['lido',0],['maddens',0],['wilderness',0],['caledonia',0],['sedge',0],['preserve',0],['trueblue',0],['crls',0],['heritage',0],['lehman',0],['legend',0],['rossbridge',0],['legislator',0],['pawplant',0],['judge',0],['senator',0],['sandvalley',0],['troy',0]];
// one-off swaps of a day's course (Oct 4 2026 was Troy again, two days after Troy; it became Cambrian Ridge Sherling)
// courses taken out of the daily rotation from a given day (past days keep them, so they never change)
const DAILY_OFF={hazeltine:Math.round(Date.UTC(2026,9,14)/864e5),windsong:Math.round(Date.UTC(2026,9,14)/864e5)};
const DAILY_FIX={[Math.round(Date.UTC(2026,9,4)/864e5)]:'crsc',[Math.round(Date.UTC(2026,9,14)/864e5)]:'dove',[Math.round(Date.UTC(2026,9,15)/864e5)]:'farmlinks'};   // Oct 14 2026: the user swapped Hazeltine for a course nobody had played
function dailyCourseOld(n){if(DAILY_FIX[n])return DAILY_FIX[n];if(n>=DAILY_N3)return DAILY_ORDER3[(n-DAILY_N3)%DAILY_ORDER3.length];if(n>=DAILY_N2)return DAILY_ORDER2[(n-DAILY_N2)%DAILY_ORDER2.length];return DAILY.order[((n%DAILY.order.length)+DAILY.order.length)%DAILY.order.length];}
const DAILY_LRU={last:null,list:[]};
/* v99 shuffled daily rotation (from 2026-10-08): each day draws at random (seeded by the date, so everyone gets the same
   course) from the courses not yet played in the current cycle, skipping anything from the last 6 days; once every course
   has had its day a new cycle starts. A course added later joins the current cycle from its first day; past days never change. */
const DAILY_N5=Math.round(Date.UTC(2026,9,8)/864e5),DAILY_SH={list:[],used:null,recent:null};
function dailyRng(n){let s=(Math.imul(n,2654435761)^0x5bd1e995)>>>0;return()=>{s^=s<<13;s>>>=0;s^=s>>>17;s^=s<<5;s>>>=0;return s/4294967296;};}
/* v123 (from 2026-10-16): every course gets a daily before any course repeats. The "used" set starts with every course that has
   already been a daily since DAILY_START, so the shuffle only draws from courses nobody has had yet; once all are used it starts a new cycle.
   Days before DAILY_N6 are unchanged. */
const DAILY_N6=Math.round(Date.UTC(2026,9,16)/864e5),DAILY_FR={list:[],used:null,recent:null};
function dailyCourseFresh(n){const M=DAILY_FR;
  if(!M.used){M.used=new Set();M.recent=[];for(let k=dailyNum(DAILY_START);k<DAILY_N6;k++){const c=dailyCourse(new Date(k*864e5).toISOString().slice(0,10));M.used.add(c);M.recent.push(c);}}
  while(DAILY_N6+M.list.length<=n){const k=DAILY_N6+M.list.length,pool=DAILY_POOL.filter(([id,from])=>from<=k&&COURSES[id]&&!(DAILY_OFF[id]&&k>=DAILY_OFF[id])).map(([id])=>id);
    let rem=pool.filter(id=>!M.used.has(id));if(!rem.length){M.used=new Set();rem=pool;}
    const last=M.recent.slice(-6);let cand=rem.filter(id=>!last.includes(id));if(!cand.length)cand=rem;
    const r=dailyRng(k*7+3);r();const pick=DAILY_FIX[k]&&COURSES[DAILY_FIX[k]]?DAILY_FIX[k]:cand[Math.floor(r()*cand.length)];M.used.add(pick);M.recent.push(pick);M.list.push(pick);}
  return M.list[n-DAILY_N6];}
function dailyCourseShuf(n){const M=DAILY_SH;
  if(!M.used){M.used=new Set();M.recent=[];for(let k=DAILY_N5-6;k<DAILY_N5;k++)M.recent.push(dailyCourse(new Date(k*864e5).toISOString().slice(0,10)));}
  while(DAILY_N5+M.list.length<=n){const k=DAILY_N5+M.list.length,pool=DAILY_POOL.filter(([id,from])=>from<=k&&COURSES[id]&&!(DAILY_OFF[id]&&k>=DAILY_OFF[id])).map(([id])=>id);
    let rem=pool.filter(id=>!M.used.has(id));if(!rem.length){M.used=new Set();rem=pool;}
    const last=M.recent.slice(-6);let cand=rem.filter(id=>!last.includes(id));if(!cand.length)cand=rem;
    const r=dailyRng(k);r();const pick=DAILY_FIX[k]&&COURSES[DAILY_FIX[k]]?DAILY_FIX[k]:cand[Math.floor(r()*cand.length)];M.used.add(pick);M.recent.push(pick);M.list.push(pick);}
  return M.list[n-DAILY_N5];}
function dailyCourse(day){const n=dailyNum(day);if(n<DAILY_N4)return dailyCourseOld(n);if(n>=DAILY_N6)return dailyCourseFresh(n);if(n>=DAILY_N5)return dailyCourseShuf(n);const M=DAILY_LRU;
  if(!M.last){M.last={};for(let k=DAILY_N4-90;k<DAILY_N4;k++)M.last[dailyCourseOld(k)]=k;}
  while(DAILY_N4+M.list.length<=n){const k=DAILY_N4+M.list.length;let best=null,bl=0;
    for(const[id,from]of DAILY_POOL){if(from>k||!COURSES[id])continue;const l=M.last[id]??-1e9;if(best===null||l<bl){best=id;bl=l;}}
    M.last[best]=k;M.list.push(best);}
  return M.list[n-DAILY_N4];}
/* v111: the daily save also carries every shot's replay, so it grows through the round; it's read and rewritten at every strike.
   Keep the last parsed copy and reuse it while the stored text is unchanged, so a strike late in the round doesn't re-parse it all. */
function dailyLoad(){try{const t=localStorage.getItem(DAILY.save)||'null';if(t===DAILY._s&&DAILY._c!==undefined)return DAILY._c;const d=JSON.parse(t),r=d&&d.v===1?d:null;DAILY._s=t;DAILY._c=r;return r;}catch(e){return null;}}
function dailyStore(d){try{const t=JSON.stringify(d);localStorage.setItem(DAILY.save,t);DAILY._s=t;DAILY._c=d;}catch(e){}}
function dailyToday(){const day=dailyDay(),d=dailyLoad();return d&&d.day===day?d:null;}
function dailyPid(){let id=null;try{id=localStorage.getItem('golf-pid');}catch(e){}if(!id){id='p'+Math.random().toString(36).slice(2,10)+Date.now().toString(36);try{localStorage.setItem('golf-pid',id);}catch(e){}}return id;}
function dailyName(){try{return localStorage.getItem('golf-name')||'';}catch(e){return'';}}
/* sign-in for the daily (Oct 2026): a 6-digit code emailed by Supabase (not a link: a link opens in Safari, and Safari and the
   home-screen app keep separate storage), so one player is one account in either, or on another phone. The server allows one
   daily score per account per day; before teeing off the game asks whether this account has already played today. */
const AUTH_KEY='golf-auth';
/* required sign-in is switched on for everyone with AUTH_REQUIRED once the code emails work; until then ?signin=1 turns it on for
   this phone/browser (and ?signin=0 off again), for testing on the live site */
const AUTH_REQUIRED=false;
/* Oct 2026, pause menu 'Swing': 'With meter' (the default) is the backswing that follows the cursor; 'After taps' holds the golfer
   at address while the meter runs and plays the whole swing after the last tap. Then nothing in the 3D view moves during the meter,
   so it isn't redrawn and the meter has the phone to itself. (?swingtest=0/1 still sets it.) */
// putts always follow the meter (the green's slope grid keeps moving while you set the stroke), whatever the setting
const swAfter=()=>SWT&&!curClub().putter;
var TRZ=(()=>{try{const v=+localStorage.getItem('golf-trz');return v===1.3||v===1.5?v:1;}catch(e){return 1;}})();   // Flight zoom (pause menu): how close the camera frames the ball in flight
var GRDK=(()=>{try{return localStorage.getItem('golf-grid')==='1';}catch(e){return false;}})();   // Darker grid lines on the green (pause menu), off by default
/* Oct 2026 Blender trial (?b10=1): Troy Burne hole 10 with scenery made in Blender (files in b10/): the clubhouse modelled from the
   survey and photos, and the hole's light baked in Cycles (soft tree and building shadows plus sky occlusion on the ground). The ball
   physics are untouched. Without the link nothing here runs. */
/* Oct 24 2026: shipped to everyone. ?b10=0 turns it off (for comparisons); ?b10=1 is the walk-through link (practice, hole by hole,
   &c=<course>&h=<hole>). */
const B10=(()=>{try{return !/[?&]b10=0/.test(location.search);}catch(e){return true;}})(),B10T=(()=>{try{return /[?&]b10=1/.test(location.search);}catch(e){return false;}})();
function b10On(){return B10&&typeof CUR!=='undefined'&&!!CUR;}
function b10K(){const c=b10On()&&typeof B10BAKE!=='undefined'&&B10BAKE.courses?B10BAKE.courses[CUR.id]:null;return c&&c.holes?c.holes[G.hi]||null:null;}   // this hole's baked light (b: bounds, png)
function b10Hole(){return !!b10K();}
function b10Load(done){const L=['b10/bake.js?v=35','b10/trees.js?v=3'];window.B10LEAF='b10/leaves.webp?v=1';let n=L.length;for(const s of L){const e=document.createElement('script');e.src=s;e.onload=e.onerror=()=>{if(--n===0)done();};document.head.appendChild(e);}}
function b10Trees(P){const dec=(s,T)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer);};
  const arr=(r,st)=>{const Pp=dec(r.P,Int16Array),N=dec(r.N,Int8Array),C=dec(r.C,Uint8Array),U=r.U?dec(r.U,Int16Array):null,o=new Array(r.n*st);
    for(let i=0;i<r.n;i++){const k=i*st;o[k]=Pp[i*3]/1000;o[k+1]=Pp[i*3+1]/1000;o[k+2]=Pp[i*3+2]/1000;o[k+3]=N[i*3]/127;o[k+4]=N[i*3+1]/127;o[k+5]=N[i*3+2]/127;
      o[k+6]=C[i*3]/255;o[k+7]=C[i*3+1]/255;o[k+8]=C[i*3+2]/255;if(U){o[k+9]=U[i*2]/r.us;o[k+10]=U[i*2+1]/r.us;}}return o;};
  const by={};for(const key in B10TREES){const[sp,v]=key.split('|'),e=B10TREES[key];(by[sp]=by[sp]||[])[+v]={bark:arr(e.bark,11),mass:arr(e.mass,9),leaf:arr(e.leaf,11),trunkN:e.trunkN,snag:e.snag};}
  // living versions three times over and each dead snag once, so snags stay rare (a tree's version is picked from its shade value)
  for(const sp in by){const L=by[sp].filter(Boolean),live=L.filter(g=>!g.snag),dead=L.filter(g=>g.snag);P[sp]=dead.length?[...live,...live,...live,...dead]:live;}}
// Blender trial clubhouses: the game's own clubhouse (from CLUBLID + CLUBLOOK: porches, stairs, arches, plantings) run through
// Blender: window frames and muntins added, sky light baked into the colours. One file per course, loaded when the course is played.
function b10ClubReady(id,again){const L=typeof B10BAKE!=='undefined'&&B10BAKE.clubs;if(!L||!L[id]||(window.B10CLUBS&&B10CLUBS[id]))return true;
  if(!b10ClubReady.busy){b10ClubReady.busy=1;const e=document.createElement('script');e.src='b10/club/'+id+'.js?v='+L[id];e.onload=e.onerror=()=>{b10ClubReady.busy=0;
    window.B10CLUBS=window.B10CLUBS||{};if(!B10CLUBS[id])B10CLUBS[id]={none:1};again&&again();};document.head.appendChild(e);}return false;}
function b10ClubFor(h,q){const D=window.B10CLUBS&&B10CLUBS[CUR.id];if(!D||D.none||D.model||!q.club)return null;return Math.hypot(q.x+h.T0[0]-D.cx,q.y+h.T0[1]-D.cy)<3?D:null;}
function b10ClubPush(h,out,D){if(!D.P){const dec=(s,T)=>{const b=atob(s),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return new T(u.buffer);};
    D.P=dec(D.pos,Int16Array);D.C=dec(D.col,Uint8Array);D.I=dec(D.idx,D.n<65536?Uint16Array:Uint32Array);}
  const ox=D.off[0]-h.T0[0],oz=D.off[2]-h.T0[1],oy=hAtH(h,ox,oz),s=1/D.s,P=D.P,C=D.C,I=D.I;   // heights are relative to the ground at the clubhouse's centre, which each hole measures from its own base
  const V=k=>[ox+P[k*3]*s,oy+P[k*3+1]*s,oz+P[k*3+2]*s];
  for(let t=0;t<I.length;t+=3){const A=V(I[t]),B=V(I[t+1]),Cc=V(I[t+2]),n=nrm(cross(sub(B,A),sub(Cc,A)));
    for(const[p,k]of[[A,I[t]],[B,I[t+1]],[Cc,I[t+2]]])out.push(p[0],p[1],p[2],n[0],n[1],n[2],C[k*3]/255,C[k*3+1]/255,C[k*3+2]/255);}}
let SWT=(()=>{try{const m=location.search.match(/[?&]swingtest=([01])/);if(m)localStorage.setItem('golf-swt',m[1]);return localStorage.getItem('golf-swt')==='1';}catch(e){return false;}})();
const authOn=(()=>{try{const m=location.search.match(/[?&]signin=([01])/);if(m)localStorage.setItem('golf-signin',m[1]);return AUTH_REQUIRED||localStorage.getItem('golf-signin')==='1';}catch(e){return AUTH_REQUIRED;}})();
function authLoad(){try{const a=JSON.parse(localStorage.getItem(AUTH_KEY)||'null');return a&&a.refresh_token&&a.user&&a.user.id?a:null;}catch(e){return null;}}
function authStore(a){try{if(a)localStorage.setItem(AUTH_KEY,JSON.stringify(a));else localStorage.removeItem(AUTH_KEY);}catch(e){}}
function authKeep(s){if(!s||!s.access_token||!s.user)return null;const a={access_token:s.access_token,refresh_token:s.refresh_token,expires_at:s.expires_at||Math.floor(Date.now()/1000)+(s.expires_in||3600),user:{id:s.user.id,email:s.user.email||''}};authStore(a);return a;}
const authUser=()=>{const a=authLoad();return a?a.user:null;};
async function authPost(path,body,tok){const r=await fetch(DAILY.url+'/auth/v1/'+path,{method:'POST',headers:{apikey:DAILY.key,'Content-Type':'application/json',...(tok?{Authorization:'Bearer '+tok}:{})},body:JSON.stringify(body)});
  let j=null;try{j=await r.json();}catch(e){}return{ok:r.ok,status:r.status,j};}
// a current access token, refreshed a minute before it runs out; null when signed out (or the account's session has ended)
async function authToken(){const a=authLoad();if(!a)return null;if(a.expires_at-60>Date.now()/1000)return a.access_token;
  try{const r=await authPost('token?grant_type=refresh_token',{refresh_token:a.refresh_token});if(r.ok&&r.j&&r.j.access_token){const k=authKeep(r.j);return k&&k.access_token;}
    if(r.status>=400&&r.status<500)authStore(null);}catch(e){}return null;}
function authSignOut(){const a=authLoad();authStore(null);if(a)authPost('logout',{},a.access_token).catch(()=>{});}
// has this account already got an official round for the day? (the score row, or null; undefined if the server can't be reached)
async function dailyMine(day){const u=authUser();if(!u||!DAILY.url)return null;
  try{const r=await fetch(DAILY.url+'/rest/v1/daily_scores?select=course,strokes,to_par,holes&day=eq.'+day+'&user_id=eq.'+u.id+'&limit=1',{headers:dailyHdr()});if(!r.ok)return undefined;const j=await r.json();return j[0]||null;}catch(e){return undefined;}}
function dailySave(o={}){const d=dailyLoad()||{};if(d.day!==G.dailyDay)return;
  Object.assign(d,{ps:G.psLeft,hi:o.hi??G.hi,scores:G.scores,strokes:o.strokes??G.strokes,ball:o.ball??G.ball,prev:o.prev??G.prev,wind:G.wind,mid:!!o.mid,pend:o.pend||null,ts:Date.now()});dailyStore(d);}
function dailyWeather(day){if(typeof R3==='undefined'||!R3.on||typeof r3ApplyWx!=='function')return;r3ApplyWx(Math.floor(rng(dailyNum(day)*31+7)()*4)%4,true);}
function dailyLeave(){if(G.mode!=='daily'&&G.mode!=='spectate'&&G.mode!=='career'&&G.mode!=='highlight')return;G.mode='round';const c=homeCourse();if(c!==CUR.id)setCourse(c,false);
  if(typeof R3!=='undefined'&&R3.on&&typeof r3RoundWx==='function')r3RoundWx();}
// start or resume today's official round
function dailyPlay(){if(courseGate(dailyCourse(dailyDay()),dailyPlay))return;const day=dailyDay(),cid=dailyCourse(day);let d=dailyToday();
  if(d&&d.done){openDailyBoard(false);return;}
  if(!dailyName()){openDailyName();return;}
  const fresh=!d||(!d.hi&&!d.strokes&&!(d.scores||[]).some(x=>x));   // a round already under way (from before sign-in) carries on
  if(fresh&&authOn&&!authUser()){openDailyAuth(dailyPlay);return;}
  if(fresh&&dailyPlay.checked!==day){$('dPlay').disabled=true;$('dNameGo').disabled=true;
    dailyMine(day).then(row=>{$('dPlay').disabled=false;$('dNameGo').disabled=false;
      if(row){dailyStore({v:1,day,cid:row.course||cid,hi:17,scores:Array.isArray(row.holes)?row.holes:[],strokes:0,mid:false,ps:0,done:true,posted:true,total:row.strokes,toPar:row.to_par,elsewhere:true,ts:Date.now()});
        toast('ALREADY PLAYED','You posted today’s round on another phone or browser','#fff6dc');openDailyBoard(false);return;}
      dailyPlay.checked=day;dailyPlay();});return;}
  endMatchMode();$('dailyM').hidden=true;
  if(d&&!d.done&&d.cid!==cid)d=null;   // today's course was changed after this round started: start over on the new one
  if(!d){d={v:1,day,cid,hi:0,scores:[],strokes:0,mid:false,ps:3,done:false,posted:false,ts:Date.now()};dailyStore(d);}
  G.mode='daily';G.dailyDay=day;G.dailySeed=dailyNum(day)*7919;setCourse(d.cid,false);dailyWeather(day);
  G.psLeft=Number.isInteger(d.ps)?d.ps:3;G.scores=Array.isArray(d.scores)?d.scores:[];closeMenu();startHole(d.hi||0);
  if(((d.mid&&d.strokes>0)||d.pend)&&d.ball){$('introM').hidden=true;G.strokes=d.strokes;G.ball={x:d.ball.x,y:d.ball.y};G.prev=d.prev?{x:d.prev.x,y:d.prev.y}:{...G.ball};if(d.wind)G.wind=d.wind;
    prepareShot();const t=camTarget();cam.E=[...t.E];cam.L=[...t.L];if(!pendResume(d.pend))toast('WELCOME BACK','Daily round \u00b7 hole '+(d.hi+1),'#8ee6a8');}}
function dailyFinish(){const d=dailyLoad();if(!d||d.day!==G.dailyDay)return;d.scores=G.scores.slice();d.done=true;d.mid=false;d.total=G.scores.reduce((a,b)=>a+(b||0),0);d.toPar=roundDiff();dailyStore(d);dailyPost();}
async function dailySend(d){const tok=await authToken(),u=authUser();
  const body={day:d.day,course:d.cid,player_id:dailyPid(),name:dailyName()||'Golfer',strokes:d.total,to_par:d.toPar,holes:d.scores};
  if(u&&tok)body.user_id=u.id;
  if(d.shots&&d.shots.length)body.shots={v:1,ch:CHAR_ID,s:d.shots};
  const hd=dailyHdr({'Content-Type':'application/json',Prefer:'return=minimal'});if(tok)hd.Authorization='Bearer '+tok;
  const send=()=>fetch(DAILY.url+'/rest/v1/daily_scores',{method:'POST',headers:hd,body:JSON.stringify(body)});
  let r=await send();if(!r.ok&&r.status!==409&&body.shots){delete body.shots;r=await send();}return r;}
async function dailyPost(){const d=dailyLoad();if(!d||!d.done||d.posted||!DAILY.url)return false;
  const note=t=>{const n=$('cNote');if(n&&!$('cardM').hidden&&G.mode==='daily')n.textContent=t;};
  try{const r=await dailySend(d);
    if(r.ok||r.status===409){const c=dailyLoad();if(c&&c.day===d.day){c.posted=true;dailyStore(c);}
      note(r.ok?'Posted to today’s leaderboard.':'You already have an official round today (from another phone or browser), so this one wasn’t posted.');return true;}
    if((r.status===401||r.status===403)&&!authUser()){note('Sign in to post this round: open the daily leaderboard.');return false;}}catch(e){}
  const n=$('cNote');if(n&&!$('cardM').hidden&&G.mode==='daily')n.textContent='Couldn’t reach the leaderboard. It will post next time you open the game.';return false;}
/* a finished daily round that couldn't be posted (no signal) is set aside when the date changes, so the next day's round
   doesn't overwrite it, and is posted the next time the game opens online. Dropped if the leaderboard turns it down. */
async function dailyOwed(){const K=DAILY.save+'-owed';let o=null;
  try{const d=dailyLoad();if(DAILY.url&&d&&d.done&&!d.posted&&d.day!==dailyDay()){localStorage.setItem(K,JSON.stringify(d));d.posted=true;dailyStore(d);}
    o=JSON.parse(localStorage.getItem(K)||'null');}catch(e){}
  if(!o||!DAILY.url||dailyOwed.busy)return;dailyOwed.busy=true;
  try{const r=await dailySend(o);if(r.ok||(r.status>=400&&r.status<500))localStorage.removeItem(K);}catch(e){}
  dailyOwed.busy=false;}
/* one-off resets of a player's daily round (day, player id or name); each clears that day's saved round once on that phone */
const DAILY_RESET=[['2026-10-09','p5sa6c8gmmuvyzitv','cam'],['2026-10-09','p5sa6c8gmmuvyzitv','cam','b'],['2026-10-09','p5sa6c8gmmuvyzitv','cam','c'],['2026-10-09','p5sa6c8gmmuvyzitv','cam','d'],['2026-10-09','p5sa6c8gmmuvyzitv','cam','e'],['2026-10-10','pmzu252dumv05u3u4','pappa','p'],['2026-10-11','pmzu252dumv05u3u4','pappa','p'],['2026-10-14','pncjngq2rmuqets13','ogtwig','r']];
(function(){try{const d=dailyLoad();if(!d)return;const pid=localStorage.getItem('golf-pid')||'',nm=String(localStorage.getItem('golf-name')||'').trim().toLowerCase();
  for(const[day,id,name,tag]of DAILY_RESET){const f='golf-daily-reset-'+day+(tag||'');if(d.day===day&&(pid===id||nm===name)&&!localStorage.getItem(f)){localStorage.removeItem(DAILY.save);localStorage.setItem(f,'1');return;}}}catch(e){}})();
/* one-off take-backs of the last shot in a player's daily round (day, player id or name, hole index, tag): on that phone, once, if the
   saved round is mid-hole on that hole, the ball goes back to where the last shot was hit from, the stroke comes off and its replay
   is dropped. Oct 23: Cam, Wigwam hole 10 (a meter tap that didn't register). */
const DAILY_UNDO=[['2026-10-23','p5sa6c8gmmuvyzitv','cam',9,'u1']];
(function(){try{const d=dailyLoad();if(!d)return;const pid=localStorage.getItem('golf-pid')||'',nm=String(localStorage.getItem('golf-name')||'').trim().toLowerCase();
  for(const[day,id,name,hi,tag]of DAILY_UNDO){const f='golf-daily-undo-'+day+tag;if(d.day!==day||!(pid===id||nm===name)||localStorage.getItem(f))continue;
    localStorage.setItem(f,'1');if(d.done||d.hi!==hi||!d.mid||!(d.strokes>0)||!d.prev)continue;
    d.ball={x:d.prev.x,y:d.prev.y};d.strokes-=1;d.pend=null;if(d.strokes===0)d.mid=false;if(Array.isArray(d.shots)&&d.shots.length)d.shots.pop();d.ts=Date.now();dailyStore(d);d._undone=1;}}catch(e){}})();
function dailyHdr(h={}){const k=DAILY.key;h.apikey=k;if(!/^sb_/.test(k))h.Authorization='Bearer '+k;return h;}
const PLAYER_MERGE=['cam','pappa','ogtwig'];   // same golfer on more than one player id (re-saved to the home screen)
const pKey=r=>{const n=String(r.name||'').trim().toLowerCase();return PLAYER_MERGE.includes(n)?'n:'+n:r.player_id;};
const pMine=(r,pid)=>r.player_id===pid||(PLAYER_MERGE.includes(String(dailyName()||'').trim().toLowerCase())&&pKey(r)==='n:'+String(dailyName()).trim().toLowerCase());
const pBest=rows=>{const seen=new Set();return rows.filter(r=>{const k=pKey(r);if(seen.has(k))return false;seen.add(k);return true;});};   // rows come best first
async function dailyFetch(day){if(!DAILY.url)return null;try{const r=await fetch(DAILY.url+'/rest/v1/daily_scores?select=name,strokes,to_par,player_id,holes,course&day=eq.'+day+'&order=strokes.asc,created_at.asc&limit=300',{headers:dailyHdr()});if(!r.ok)return null;return pBest(await r.json());}catch(e){return null;}}
function openDailyName(){G.paused=true;$('dCardV').hidden=true;$('menuM').hidden=true;$('introM').hidden=true;$('dailyM').hidden=false;$('dAuth').hidden=true;$('dName').hidden=false;$('dBoard').hidden=true;
  const day=dailyDay();$('dEyebrow').textContent='Daily round \u00b7 '+dailyNice(day);$('dTitle').textContent=COURSES[dailyCourse(day)].name;
  $('dNameIn').value=dailyName();setTimeout(()=>$('dNameIn').focus(),60);}
function openDailyAuth(next){G.paused=true;$('dCardV').hidden=true;$('menuM').hidden=true;$('introM').hidden=true;$('cardM').hidden=true;$('dailyM').hidden=false;$('dName').hidden=true;$('dBoard').hidden=true;$('dAuth').hidden=false;
  const day=dailyDay();$('dEyebrow').textContent='Daily round \u00b7 '+dailyNice(day);$('dTitle').textContent='Sign in';
  DAILY.authNext=next||null;DAILY.authStep='email';$('dAuthCode').hidden=true;$('dAuthCode').value='';$('dAuthErr').hidden=true;$('dAuthEmail').disabled=false;
  $('dAuthGo').textContent='Email me a code';$('dAuthGo').disabled=false;try{$('dAuthEmail').value=$('dAuthEmail').value||localStorage.getItem('golf-auth-email')||'';}catch(e){}
  setTimeout(()=>$('dAuthEmail').focus(),60);}
async function dailyAuthGo(){const err=t=>{$('dAuthErr').textContent=t;$('dAuthErr').hidden=!t;},btn=$('dAuthGo');A();
  const email=$('dAuthEmail').value.trim().toLowerCase();if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)){err('Enter your email address.');$('dAuthEmail').focus();return;}
  btn.disabled=true;err('');
  try{if(DAILY.authStep==='email'){const r=await authSendCode(email);
      if(!r.ok){err(r.status===429?'Too many codes asked for just now. Wait a minute and try again.':'Couldn’t send the code. Check the address and try again.');btn.disabled=false;return;}
      try{localStorage.setItem('golf-auth-email',email);}catch(e){}
      DAILY.authStep='code';$('dAuthEmail').disabled=true;$('dAuthCode').hidden=false;btn.textContent='Sign in';$('dAuthMsg').textContent='We sent a 6-digit code to '+email+'. It can take a minute; check spam too.';setTimeout(()=>$('dAuthCode').focus(),60);btn.disabled=false;return;}
    const code=$('dAuthCode').value.replace(/\D/g,'');if(code.length!==6){err('Enter the 6-digit code from the email.');btn.disabled=false;return;}
    const r=await authVerify(email,code);if(!r.ok||!authUser()){err('That code didn’t work. Check it, or go back and send a new one.');btn.disabled=false;return;}
    $('dAuth').hidden=true;$('dAuthMsg').textContent='Sign in so your round counts. One official round a day per player, whether you play in Safari, the home-screen app or another phone. We’ll email you a 6-digit code.';
    toast('SIGNED IN',email,'#8ee6a8');const nx=DAILY.authNext;DAILY.authNext=null;if(nx)nx();else openDailyBoard(false);}
  catch(e){err('Couldn’t reach the server. Check your connection.');btn.disabled=false;}}
async function authSendCode(email){return authPost('otp',{email,create_user:true});}
async function authVerify(email,token){const r=await authPost('verify',{type:'email',email,token});if(r.ok&&r.j&&r.j.access_token)authKeep(r.j);return r;}
function dailyNameGo(){const v=$('dNameIn').value.replace(/\s+/g,' ').trim().slice(0,16);if(!v){$('dNameIn').focus();return;}try{localStorage.setItem('golf-name',v);}catch(e){}A();dailyPlay();}
const escH=t=>String(t).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const DAILY_START='2026-10-01';
function dayShift(day,k){const[y,m,d]=day.split('-').map(Number);return new Date(Date.UTC(y,m-1,d)+k*864e5).toISOString().slice(0,10);}
async function openDailyBoard(fromRound,day,tab){G.paused=true;$('dCardV').hidden=true;$('menuM').hidden=true;$('introM').hidden=true;$('cardM').hidden=true;$('dailyM').hidden=false;$('dName').hidden=true;$('dAuth').hidden=true;$('dBoard').hidden=false;
  const today=dailyDay();day=day||today;tab=tab||'day';DAILY.view={day,tab};const me=dailyToday(),isToday=day===today;
  $('dTabDay').classList.toggle('on',tab==='day');$('dTabAll').classList.toggle('on',tab==='all');$('dTabCal').classList.toggle('on',tab==='cal');$('dNav').hidden=tab!=='day';
  const cal=tab==='cal';$('dCal').hidden=!cal;$('dList').hidden=cal;$('dStatus').hidden=cal;
  if(cal){$('dEyebrow').textContent='Daily round';$('dTitle').textContent='Calendar';if(me&&me.done&&!me.posted)dailyPost();calOpen(DAILY.calSel||today);return;}
  $('dPrev').disabled=day<=DAILY_START;$('dNext').disabled=day>=today;$('dDate').textContent=isToday?'Today \u00b7 '+dailyNice(day):new Date(day+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'short',month:'short',day:'numeric',timeZone:'UTC'});
  $('dEyebrow').textContent=tab==='all'?'Daily round \u00b7 all-time':'Daily round \u00b7 '+dailyNice(day);$('dTitle').textContent=tab==='all'?'Standings':COURSES[dailyCourse(day)].name;
  $('dPlay').hidden=!(tab==='day'&&isToday&&!(me&&me.done));$('dPlay').textContent=me&&!me.done?'Continue today’s round':'Play today’s round';$('dShare').hidden=!(tab==='day'&&isToday&&me&&me.done);
  {const u=authUser();$('dWho').hidden=!u;if(u)$('dWhoTxt').textContent='Signed in as '+u.email;}
  const list=$('dList');list.innerHTML='<li class="empty">Loading…</li>';$('dStatus').textContent='';
  if(me&&me.done&&!me.posted)await dailyPost();
  if(tab==='all'){await dailyAllTime();return;}
  const rows=await dailyFetch(day);if(DAILY.view.day!==day||DAILY.view.tab!=='day')return;
  if(!DAILY.url){list.innerHTML='<li class="empty">The online leaderboard switches on soon.</li>';return;}
  if(!rows){list.innerHTML='<li class="empty">Couldn’t load the leaderboard. Check your connection.</li>';return;}
  const pid=dailyPid(),canSee=!isToday||(me&&me.done);DAILY.rows=rows;let rank=0,prev=null,myRank=null;const html=rows.map((r,i)=>{if(r.strokes!==prev){rank=i+1;prev=r.strokes;}const mine=pMine(r,pid);if(mine)myRank=rank;
    const tap=mine||canSee;return'<li class="'+(mine?'me ':'')+(tap?'tap':'')+'"'+(tap?' data-i="'+i+'" role="button" tabindex="0"':'')+'><span class="rk">'+rank+'</span><span class="nm">'+escH(r.name)+'</span><span class="tp">'+fmtDiff(r.to_par)+'</span><span class="st">'+r.strokes+'</span></li>';}).join('');
  list.innerHTML=html||'<li class="empty">'+(isToday?'No scores yet today. Be the first.':'Nobody played this day.')+'</li>';
  $('dStatus').textContent=(rows.length?(canSee?'Tap a golfer for their card \u00b7 ':'Finish today\u2019s round to see the other cards \u00b7 '):'')+(rows.length?rows.length+(rows.length===1?' golfer':' golfers'):'')+(myRank?' \u00b7 you '+(isToday?'are ':'were ')+(rows.filter(r=>r.strokes===rows[myRank-1].strokes).length>1?'tied ':'')+(myRank===1?'1st':ordinal(myRank)):'');
  const el=list.querySelector('.me');if(el)el.scrollIntoView({block:'center'});}
/* ---------- course records (v85): any finished 18-hole Quick play round can be posted to that course's all-time board.
   Every posted round is kept; the board shows each golfer once, with their best round (fewest strokes, earliest first). ---------- */
const RECS={cid:null,rows:null,pend:null,tok:0,ctok:0,card:null};
function recOrder(){return Object.keys(COURSES).sort((a,b)=>stateOf(a).localeCompare(stateOf(b))||COURSES[a].name.localeCompare(COURSES[b].name));}
function recCanPost(){return G.mode==='round'&&!TEE&&TB.length===18&&G.scores.length>=18&&G.scores.slice(0,18).every(v=>v>0);}
function recOffer(tot,d){RECS.pend={cid:CUR.id,strokes:tot,to_par:d,holes:G.scores.slice(0,18),done:false,shots:(G.rShots&&G.rShots.length)?{v:1,ch:CHAR_ID,pin:G.pinSeed||0,wx:(typeof R3!=='undefined'&&R3.wx!=null)?R3.wx:null,s:G.rShots}:null};
  $('cardPostV').hidden=false;const nm=dailyName();$('cardName').hidden=!!nm;if(!nm)$('cardName').value='';
  const b=$('cardPost');b.disabled=false;b.textContent='Post to '+CUR.name+' records';}
async function recPost(){const P=RECS.pend;if(!P)return;if(P.done){openRecords(P.cid);return;}
  let nm=dailyName();if(!nm){nm=$('cardName').value.replace(/\s+/g,' ').trim().slice(0,16);if(!nm){$('cardName').focus();return;}try{localStorage.setItem('golf-name',nm);}catch(e){}}
  const b=$('cardPost'),note=$('cNote');b.disabled=true;b.textContent='Posting…';
  let ok=false,st=0;const body={course:P.cid,player_id:dailyPid(),name:nm,strokes:P.strokes,to_par:P.to_par,holes:P.holes};if(P.shots)body.shots=P.shots;
  const send=()=>fetch(DAILY.url+'/rest/v1/course_scores',{method:'POST',headers:dailyHdr({'Content-Type':'application/json',Prefer:'return=minimal'}),body:JSON.stringify(body)});
  try{let r=await send();if(!r.ok&&r.status!==404&&body.shots){delete body.shots;r=await send();}ok=r.ok;st=r.status;}catch(e){}   // no shots column yet: post the score alone
  b.disabled=false;
  if(ok){P.done=true;$('cardName').hidden=true;b.textContent='See '+COURSES[P.cid].name+' records';note.hidden=false;note.textContent='Posted to the course records as '+nm+'.';sfx.tick&&sfx.tick();}
  else{b.textContent='Post to '+COURSES[P.cid].name+' records';note.hidden=false;note.textContent=st===404?'Course records aren’t switched on yet.':'Couldn’t post your score. Check your connection and try again.';}}
async function recFetch(cid){if(!DAILY.url)return{err:0};
  try{const r=await fetch(DAILY.url+'/rest/v1/course_scores?select=id,name,player_id,strokes,to_par,holes,created_at&course=eq.'+encodeURIComponent(cid)+'&order=strokes.asc,created_at.asc&limit=2000',{headers:dailyHdr()});
    if(!r.ok)return{err:r.status};let all=await r.json();
    // daily rounds played on this course count as course records too (v2026-10-08)
    try{const q=await fetch(DAILY.url+'/rest/v1/daily_scores?select=name,player_id,strokes,to_par,holes,day,created_at&course=eq.'+encodeURIComponent(cid)+'&order=strokes.asc,created_at.asc&limit=2000',{headers:dailyHdr()});
      if(q.ok){const d=await q.json();if(Array.isArray(d)&&d.length){all=all.concat(d.filter(x=>x&&x.strokes>0&&Array.isArray(x.holes)&&x.holes.length>=18));all.sort((a,b)=>a.strokes-b.strokes||String(a.created_at||'').localeCompare(String(b.created_at||'')));}}}catch(e){}
    const seen=new Set(),best=[];for(const x of all){const k=pKey(x);if(seen.has(k))continue;seen.add(k);best.push(x);}return{rows:best,n:all.length};}catch(e){return{err:-1};}}
async function openRecords(cid){G.paused=true;for(const m of['menuM','cardM','introM','dailyM'])$(m).hidden=true;$('recM').hidden=false;$('rBoard').hidden=false;$('rCardV').hidden=true;
  cid=COURSES[cid]?cid:CUR.id;RECS.cid=cid;const C=COURSES[cid],tok=++RECS.tok,par=C.tb.reduce((a,h)=>a+h.par,0);
  $('rEyebrow').textContent='Course records \u00b7 par '+par;$('rTitle').textContent=C.name;$('rWhere').textContent=C.town;
  const list=$('rList');list.innerHTML='<li class="empty">Loading…</li>';$('rStatus').textContent='';
  const res=await recFetch(cid);if(tok!==RECS.tok)return;
  if(!res.rows){list.innerHTML='<li class="empty">'+(res.err===404?'Course records aren’t switched on yet.':'Couldn’t load the records. Check your connection.')+'</li>';return;}
  const rows=res.rows.slice(0,100),pid=dailyPid();RECS.rows=rows;let rank=0,prev=null,myRank=null;const mine=res.rows.findIndex(r=>pMine(r,pid));
  list.innerHTML=rows.map((r,i)=>{if(r.strokes!==prev){rank=i+1;prev=r.strokes;}const me=pMine(r,pid);if(me)myRank=rank;
    return'<li class="tap'+(me?' me':'')+'" data-i="'+i+'" role="button" tabindex="0"><span class="rk">'+rank+'</span><span class="nm">'+escH(r.name)+(r.day?' <small class="dtag">Daily \u00b7 '+new Date(r.day+'T12:00:00Z').toLocaleDateString(undefined,{month:'short',day:'numeric',timeZone:'UTC'})+'</small>':'')+'</span><span class="tp">'+fmtDiff(r.to_par)+'</span><span class="st">'+r.strokes+'</span></li>';}).join('')
    ||'<li class="empty">No rounds yet. Finish a Quick play round here and post it, or play this course when it comes up as the daily round.</li>';
  const n=res.rows.length;$('rStatus').textContent=n?(n+(n===1?' golfer':' golfers')+' \u00b7 best round each'+(myRank?' \u00b7 you’re '+(rows.filter(r=>r.strokes===rows[myRank-1].strokes).length>1?'tied ':'')+ordinal(myRank):mine>=0?' \u00b7 you’re outside the top 100':'')):'';
  const el=list.querySelector('.me');if(el)el.scrollIntoView({block:'center'});}
function recCard(i){const r=RECS.rows&&RECS.rows[i];if(!r)return;const C=COURSES[RECS.cid],sc=Array.isArray(r.holes)?r.holes.map(v=>+v||0):[],nm=(r.name||'').split(' ')[0].slice(0,9);
  $('rBoard').hidden=true;$('rCardV').hidden=false;$('rTitle').textContent=r.name;
  $('rcSub').textContent=C.name+' \u00b7 '+r.strokes+' strokes \u00b7 '+fmtDiff(r.to_par)+(r.day?' \u00b7 daily round '+new Date(r.day+'T12:00:00Z').toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric',timeZone:'UTC'}):r.created_at?' \u00b7 '+new Date(r.created_at).toLocaleDateString(undefined,{month:'short',day:'numeric',year:'numeric'}):'');
  const draw=live=>{$('rc1').innerHTML=dcTable(C,sc,0,'Out',false,nm,live);$('rc2').innerHTML=dcTable(C,sc,9,'In',true,nm,live);};draw(null);
  RECS.card={r,sc,shots:null};$('rcWatch').hidden=true;$('rcHint').textContent=r.id!=null||r.day?'Loading replay…':'';if(r.id==null&&!r.day)return;const tok=++RECS.ctok;
  (r.day?recDailyShots(r):recShots(r.id)).then(S=>{if(tok!==RECS.ctok||$('rCardV').hidden)return;
    if(S&&Array.isArray(S.s)&&S.s.length){RECS.card.shots=S;draw(new Set(S.s.map(x=>x.h)));$('rcHint').textContent='Tap a hole number to watch it';$('rcWatch').hidden=false;}
    else $('rcHint').textContent='No replay for this round.';});}
async function recDailyShots(r){try{const q=await fetch(DAILY.url+'/rest/v1/daily_scores?select=shots&day=eq.'+r.day+'&player_id=eq.'+encodeURIComponent(r.player_id)+'&limit=1',{headers:dailyHdr()});if(!q.ok)return null;const j=await q.json();return j&&j[0]&&j[0].shots||null;}catch(e){return null;}}
async function recShots(id){try{const r=await fetch(DAILY.url+'/rest/v1/course_scores?select=shots&id=eq.'+encodeURIComponent(id)+'&limit=1',{headers:dailyHdr()});if(!r.ok)return null;const j=await r.json();return j&&j[0]&&j[0].shots||null;}catch(e){return null;}}
// watch a posted round: the same spectating as the daily round, with this round's pins and weather
function recWatch(hi){const c=RECS.card;if(!c||!c.shots)return;Object.assign(DCARD,{shots:c.shots,r:c.r,sc:c.sc,cid:RECS.cid,day:c.r.day||dailyDay(),src:c.r.day?'recd':'rec'});specStart(hi);}
function recStep(k){const L=recOrder(),i=L.indexOf(RECS.cid);A();openRecords(L[(i+k+L.length)%L.length]);}
/* ---------- daily round calendar (v89): every day's course at a glance, the way back to any past leaderboard,
   and a look at what's coming up. Future courses follow the rotation (DAILY_POOL), so they hold unless a course is added. ---------- */
const CAL={month:null,sel:null,tok:0,rows:{},thumbs:{}};
const CAL_AHEAD=60;
function calThumb(cid){if(CAL.thumbs[cid])return CAL.thumbs[cid];let u='';try{if(typeof r3FlagCanvas==='function'){const c=r3FlagCanvas(cid),t=document.createElement('canvas');t.width=64;t.height=40;t.getContext('2d').drawImage(c,0,0,64,40);u=t.toDataURL();}}catch(e){}
  if(!u){const t=document.createElement('canvas');t.width=64;t.height=40;const g=t.getContext('2d');g.fillStyle=typeof r3FlagStyle==='function'?r3FlagStyle(cid).bg:'#ff6a48';g.fillRect(0,0,64,40);u=t.toDataURL();}return CAL.thumbs[cid]=u;}
async function calMonthRows(m){const k=m,c=CAL.rows[k];if(c&&Date.now()-c.t<60000)return c.r;if(!DAILY.url)return null;
  const[y,mo]=m.split('-').map(Number),a=m+'-01',b=new Date(Date.UTC(y,mo,0)).toISOString().slice(0,10);
  try{const r=await fetch(DAILY.url+'/rest/v1/daily_scores?select=day,name,strokes,to_par,player_id&day=gte.'+a+'&day=lte.'+b+'&order=strokes.asc,created_at.asc&limit=5000',{headers:dailyHdr()});if(!r.ok)return null;const rows=await r.json();
    const by={};for(const x of rows)(by[x.day]=by[x.day]||[]).push(x);for(const d in by)by[d]=pBest(by[d]);CAL.rows[k]={t:Date.now(),r:by};return by;}catch(e){return null;}}
function calMystery(w,h){const c=document.createElement('canvas');c.width=w;c.height=h;const g=c.getContext('2d');const gr=g.createLinearGradient(0,0,w,h);gr.addColorStop(0,'#1d3a52');gr.addColorStop(1,'#0f2233');g.fillStyle=gr;g.fillRect(0,0,w,h);
  g.fillStyle='#ffc93c';g.font='bold '+Math.round(h*.62)+'px "Lilita One","Arial Rounded MT Bold",sans-serif';g.textAlign='center';g.textBaseline='middle';g.fillText('?',w/2,h*.54);return c.toDataURL();}
const CAL_MYS={};const calMys=(w,h)=>CAL_MYS[w+'x'+h]||(CAL_MYS[w+'x'+h]=calMystery(w,h));
function calOpen(sel){const today=dailyDay();sel=sel||CAL.sel||today;CAL.sel=sel;CAL.month=sel.slice(0,7);calDraw();}
async function calDraw(){const today=dailyDay(),m=CAL.month,[y,mo]=m.split('-').map(Number),tok=++CAL.tok,pid=dailyPid(),me=dailyToday();
  const last=dayShift(today,CAL_AHEAD),first=DAILY_START;
  $('cMonth').textContent=new Date(Date.UTC(y,mo-1,15)).toLocaleDateString(undefined,{month:'long',year:'numeric',timeZone:'UTC'});
  $('cPrev').disabled=m<=first.slice(0,7);$('cNext').disabled=m>=last.slice(0,7);
  const nd=new Date(Date.UTC(y,mo,0)).getUTCDate(),wd0=new Date(Date.UTC(y,mo-1,1)).getUTCDay();
  const rows=CAL.rows[m]&&CAL.rows[m].r||null;
  const cell=(day,i)=>{const ok=day>=first&&day<=last,fut=day>today,cid=ok&&!fut?dailyCourse(day):null;let sc='';
    if(rows&&rows[day]){const mine=rows[day].find(r=>pMine(r,pid));if(mine)sc=fmtDiff(mine.to_par);}if(day===today&&me&&me.done&&!sc)sc=fmtDiff(me.toPar??0);
    return'<button role="gridcell" data-d="'+day+'"'+(ok?'':' disabled')+' class="'+(day===today?'today ':'')+(day===CAL.sel?'sel ':'')+(fut?'fut':'')+'" aria-label="'+(ok?dailyNice(day)+', '+(fut?'mystery course':escH(COURSES[cid].name)):'')+'"><span class="n">'+i+'</span>'+(ok?'<img alt="" src="'+(fut?calMys(64,40):calThumb(cid))+'">':'')+(sc?'<span class="sc">'+sc+'</span>':'')+'</button>';};
  let h=['S','M','T','W','T','F','S'].map(d=>'<div class="wd">'+d+'</div>').join('');for(let k=0;k<wd0;k++)h+='<div></div>';
  for(let i=1;i<=nd;i++)h+=cell(m+'-'+String(i).padStart(2,'0'),i);$('cGrid').innerHTML=h;calDetail();
  if(!rows){await calMonthRows(m);if(tok===CAL.tok&&CAL.rows[m])calDraw();}}
function calDetail(){const day=CAL.sel,today=dailyDay(),fut=day>today,cid=fut?null:dailyCourse(day),C=fut?{name:'Mystery course',town:'Revealed on the day'}:COURSES[cid],img=fut?calMys(480,270):courseImg(cid),me=dailyToday(),pid=dailyPid();
  const el=$('cDayImg');if(img)el.src=img;else el.removeAttribute('src');
  const n=Math.round((Date.UTC(...day.split('-').map((v,i)=>i===1?v-1:+v))-Date.UTC(...today.split('-').map((v,i)=>i===1?v-1:+v)))/864e5);
  $('cDayWhen').textContent=(n===0?'Today':n===1?'Tomorrow':n===-1?'Yesterday':new Date(day+'T12:00:00Z').toLocaleDateString(undefined,{weekday:'long',timeZone:'UTC'}))+' \u00b7 '+dailyNice(day);
  $('cDayName').textContent=C.name;
  const rows=CAL.rows[day.slice(0,7)]&&CAL.rows[day.slice(0,7)].r,R=rows&&rows[day]||[],mine=R.find(r=>pMine(r,pid));let info=C.town;
  if(n>0)info+=' \u00b7 in '+n+(n===1?' day':' days');
  else if(R.length){const best=R[0].strokes,w=R.filter(r=>r.strokes===best);const meW=w.some(r=>pMine(r,pid));info=(meW?(n===0?(w.length>1?'You’re tied for the lead':'You’re leading'):(w.length>1?'You tied for the win':'You won')):(n===0?'Leading':'Won by')+' '+escH(w[0].name)+(w.length>1?' +'+(w.length-1):''))+' '+fmtDiff(w[0].to_par)+' \u00b7 '+R.length+(R.length===1?' golfer':' golfers')+(mine&&!meW?' \u00b7 you '+fmtDiff(mine.to_par):'');}
  else if(n<0)info+=' \u00b7 '+(rows?'nobody played this day':'');
  $('cDayInfo').innerHTML=info;
  const isToday=n===0;$('cDayBoard').hidden=n>0;$('cDayBoard').textContent=isToday?'Today’s leaderboard':'Leaderboard';
  $('dPlay').hidden=!(isToday&&!(me&&me.done));$('dPlay').textContent=me&&!me.done?'Continue today’s round':'Play today’s round';$('dShare').hidden=!(isToday&&me&&me.done);
  for(const b of $('cGrid').querySelectorAll('button'))b.classList.toggle('sel',b.dataset.d===day);}
