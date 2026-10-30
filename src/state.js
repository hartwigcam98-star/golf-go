/* ---------- state ---------- */
const HOLES=[];
const G={hi:0,hole:null,terrains:[],scores:[],ball:{x:0,y:0},prev:{x:0,y:0},bY:0,lie:'tee',fromLie:'tee',
  strokes:0,clubIdx:0,aim:0,spin:0,imp:{x:0,y:0},traj:0,pshot:false,psLeft:3,stype:'full',mode:'round',paused:false,wind:{a:0,mph:0},state:'intro',meter:{pos:IMPACT,power:0},
  ff:1,flight:null,roll:null,trail:[],fx:[],overview:false,puttMax:10,shotRot:0,inCup:false,waitT:0,waitFn:null,followT:0,golferAt:null};
const cam={E:[0,50,50],L:[0,0,0]};
const V={E:[0,0,0],R:[1,0,0],U:[0,1,0],F:[0,0,-1],f:500,cy:400,yaw:0};
let W=0,H=0,dpr=1,topH=70,botH=230,T=0;

function hole(i){if(!HOLES[i]){HOLES[i]=buildHole(i===TB.length?RANGE_D:TB[i],i);}return HOLES[i];}
for(let i=0;i<TB.length;i++)HOLES[i]=null;
let TOTAL_PAR=TB.reduce((s,h)=>s+h.par,0);
const courseLine=()=>CUR.name+' \u00b7 '+teeName()+' \u00b7 Par '+TOTAL_PAR;
/* hole fixes found by the course health check (qa/health.py) on courses built before the edits pipeline: per course and hole a new
   centre line (tee spot, waypoints, pin; course-yard frame of COURSE.holes) and optional green/tee polygons and tip text. Applied once. */
const HFIX={"crsc":{"11":{"line":[[-663,-344],[-532,-227]]},"17":{"line":[[-131,-608],[-307,-646]]}},"deacon":{"1":{"line":[[138,500],[132,200],[232,143]],"tip":"A 415-yard par 4 that doglegs hard right. One bunker pinches the landing area."},"12":{"line":[[390,69],[625,-25],[620,-104]],"tip":"A 332-yard par 4 that doglegs hard left. One bunker pinches the landing area. Two bunkers guard the green on both sides."},"18":{"line":[[533,307],[300,515],[148,656]],"tip":"A 520-yard par 5 that plays straight away. A bunker guards the green on the left. Water sits left of the hole."}},"gnlake":{"16":{"line":[[-230,1158],[-425,1203],[-491,1130]]}},"judge":{"10":{"line":[[647,578],[590,300],[532,27]],"tip":"A 563-yard par 5 that plays straight away. Four bunkers pinch the landing area. A bunker guards the green on the left."}},"legislator":{"16":{"line":[[284,-788],[206,-627]],"tip":"A 179-yard par 3. One bunker sits short of the green. A bunker guards the green on the right."}},"lehman":{"3":{"line":[[-197,-241],[11,-283]],"tip":"A 212-yard par 3."}},"pawplant":{"13":{"line":[[1400,302],[1480,432]],"green":[[[1469.8,450.3],[1474.3,448.4],[1478.8,446.8],[1482.8,444.2],[1484.4,439.6],[1485.6,434.8],[1486.7,430.0],[1488.0,425.2],[1488.3,420.4],[1484.5,417.8],[1479.6,418.4],[1475.1,420.4],[1472.3,424.2],[1472.1,429.1],[1471.6,433.9],[1470.2,438.7],[1467.7,442.8],[1466.6,446.6]]]},"16":{"line":[[1052,571],[1294,605],[1452,492]],"green":[[[1463.2,472.5],[1458.8,476.3],[1453.5,479.0],[1449.4,483.3],[1444.7,486.9],[1439.9,490.5],[1435.7,494.7],[1436.4,499.8],[1441.7,502.4],[1447.1,504.5],[1452.3,507.3],[1458.1,507.4],[1463.2,504.4],[1467.6,500.5],[1471.4,495.9],[1469.6,490.9],[1465.3,486.8],[1465.1,481.2],[1468.3,476.2],[1469.1,472.1]]]}},"sedge":{"10":{"line":[[-1813,1487],[-1600,1428],[-1444,1334]],"green":[[[-1445.9,1344.8],[-1455,1339.3],[-1458.6,1334],[-1457.3,1328.4],[-1452.7,1323],[-1446,1319],[-1437.7,1318.1],[-1427.3,1319.1],[-1420.5,1320],[-1417.5,1324.8],[-1421.8,1331.4],[-1428.2,1337],[-1432.7,1342.6],[-1437.3,1345.4]]],"tip":"A 403-yard par 4 that bends gently left through a wide sandy valley. Bunkers guard the green on both sides."},"4":{"line":[[-837,1184],[-1000,1135],[-1150,1007]],"tip":"A 367-yard par 4 that bends gently right around a tree island. One bunker pinches the landing area. Two bunkers guard the green on the left."},"11":{"line":[[-1416,1385],[-1364,1703],[-1326.1,1917.6]],"tee":[[[-1412.0,1409.7],[-1414.3,1408.8],[-1416.6,1405.5],[-1418.4,1400.5],[-1419.3,1394.8],[-1419.2,1389.5],[-1418.1,1385.6],[-1416.2,1384.0],[-1413.8,1384.9],[-1411.5,1388.2],[-1409.7,1393.2],[-1408.8,1398.9],[-1408.9,1404.2],[-1410.0,1408.1]]],"tip":"A 540-yard par 5 that plays straight away. Five bunkers pinch the landing area. A bunker guards the green on the left."}},"senator":{"3":{"line":[[-327,-268],[-196,-396],[-67,-578]],"tip":"A 406-yard par 4 that plays straight away. Six bunkers pinch the landing area."},"4":{"line":[[11,-570],[192,-774],[269,-912]],"tip":"A 431-yard par 4 that bends gently left. Five bunkers pinch the landing area. Six bunkers guard the green on both sides."},"7":{"line":[[41,-737],[-72,-545]],"tip":"A 223-yard par 3. One bunker sits short of the green. Two bunkers guard the green on the left."},"15":{"line":[[-157,-680],[-433,-713],[-565,-816]],"tip":"A 445-yard par 4 that bends gently right. Five bunkers pinch the landing area. Three bunkers guard the green on both sides."},"17":{"line":[[-769,-883],[-1008,-795],[-1020,-640],[-1132,-562]],"tip":"A 547-yard par 5 that doglegs hard left. Two bunkers pinch the landing area. Two bunkers guard the green on both sides. Water sits left of the hole."}},"stoneridge":{"9":{"line":[[108,206],[252.2,254.5]]}}};
function hfixApply(C,id){const F=HFIX[id];if(!F||C._hfix)return;C._hfix=1;for(const k in F){const f=F[k],H=C.holes[k-1];if(!H)continue;
  if(f.line){H.line=f.line.map(p=>[...p]);H.pin=[...f.line[f.line.length-1]];}
  for(const t of['green','tee','fairway'])if(f[t])for(const P of f[t])(C.polys[t]=C.polys[t]||[]).push(P);}}
/* Oct 2026: load timings (ms) ride along with the next hole's stats as extra.ld: b = app start (once), h = this hole's set-up
   (sh: building it, ff: until it is on screen, tee: shader warm-up finished at Tee off, sc: switching course just before) */
var LDT={boot:null,hole:null,sc:null,p:null};
function setCourse(id,persist=true,tee=0){const C=COURSES[id]||COURSES.troy;if(C===CUR&&TB===C.tb&&COURSE===C.course&&COURSE&&TEE===tee)return;TEE=tee;   // (split build: the starting course's data arrives after CUR first points at it)
  if(!courseReady(C.id))courseSync(C.id);if(!courseReady(C.id)){console.warn('[course] not loaded, staying on',CUR&&CUR.id);if(CUR)return;}const sc0=performance.now();try{setCourseRun(C,persist);}finally{LDT.sc={c:C.id,ms:Math.round(performance.now()-sc0)};}}
function setCourseRun(C,persist){if(CUR)CUR.__seen=1;C.__seen=1;CUR=C;TB=C.tb;COURSE=C.course;hfixApply(COURSE,C.id);
  if(HFIX[C.id])for(const k in HFIX[C.id])if(HFIX[C.id][k].tip&&TB[k-1])TB[k-1].tip=HFIX[C.id][k].tip;DEM=C.dem;WIDE=C.wide;SAVE_KEY=C.saveKey;SURR.ready=null;
  HOLES.length=0;for(let i=0;i<TB.length;i++)HOLES[i]=null;G.terrains=[];G.hole=null;TOTAL_PAR=TB.reduce((s,h)=>s+h.par,0);
  if(persist)try{localStorage.setItem('golf-course',C.id);}catch(e){}
  const cl=$('courseLbl');if(cl){cl.textContent=C.name.toUpperCase()+' \u00b7 '+C.town.toUpperCase();cl.title=C.name+' \u00b7 '+C.town;}
  const me=$('mEyebrow');if(me)me.textContent=courseLine();const mt=$('mTitle');if(mt)mt.textContent=C.name;
  document.querySelectorAll('#coursePick button').forEach(b=>{const on=b.dataset.c===C.id;b.classList.toggle('on',on);b.setAttribute('aria-pressed',String(on));});
  buildHoleGrid();}
function later(t,fn){G.waitT=t;G.waitFn=fn;}
function curClub(){return CLUBS[G.clubIdx];}
// v95: a computer with a mouse and keyboard: the hints name the keys
const DESK=(()=>{try{return matchMedia('(hover:hover) and (pointer:fine)').matches;}catch(e){return false;}})();
function lieMul(c,lie){const k=c.kind;if(c.id==='1W'&&lie!=='tee'&&lie!=='sand'&&lie!=='fescue'&&!onTeeBox())return lie==='fairway'?.96:lie==='cut'?.92:.75;   // (sand and fescue use their own tables: the driver is the worst club there)
  if(lie==='sand'&&BUNKER_T[G.stype])return 1;
  if(lie==='sand')return SAND_C[tidOf(c)]??.6;
  if(lie==='fescue')return FES_C[tidOf(c)]??.6;
  if(lie==='rough')return LIE_T.rough[clubGroup(c)]*(tidOf(c)==='5W'?1.04:1);if(lie==='cut')return LIE_T.cut[clubGroup(c)];return 1;}
/* full shots from fairway bunkers and fescue, per club (shot lab): the old club groups made a PW go further than a 9-iron out
   of sand and the 7-iron the longest iron out of fescue. Each club now goes a little shorter than the next-longer one, the
   hybrid advances it furthest, and the woods are a poor bet */
const SAND_C={'1W':.6,'3W':.72,'5W':.78,'4H':.88,'5I':.88,'6I':.9,'7I':.92,'8I':.93,'9I':.94,'PW':.95,'GW':.95,'SW':.96,'LW':.95};   // Oct 13 2026: a clean pick from a fairway bunker loses only a little; the danger is the tighter timing window and catching it heavy (SAND_FAT)
const FES_C={'1W':.4,'3W':.42,'5W':.45,'4H':.65,'5I':.63,'6I':.655,'7I':.68,'8I':.7,'9I':.735,'PW':.76,'GW':.79,'SW':.83,'LW':.855};   // v100: a touch more from the hybrid and irons   // the 5-wood's extra loft gets it up out of grass a little better
/* tough lies by club (golf instruction + launch-monitor tests): grass grabs long, low-lofted clubs and shuts the face, so fairway woods
   and long irons come out short and wild; hybrids cut through medium rough best of the long clubs; from deep rough and fescue the
   lofted, heavy clubs (short irons, wedges) are the reliable way out. [carry factor, extra dispersion] */
const clubGroup=c=>{const id=tidOf(c);return c.kind==='wood'?'wood':c.kind==='hybrid'?'hyb':(id==='5I'||id==='6I')?'long':(id==='7I'||id==='8I')?'mid':(id==='9I'||id==='PW')?'short':(id==='SW'||id==='LW')?'sand':'gap';};
// v65 rebalance (PGA 2K-style): every club loses something in the rough, stepping down smoothly from wedges to woods, and each shot
// rolls its own number inside a range (the lie readout shows it), like 2K's "Rough 84-92%"; fescue is the heavy rough
const LIE_T={cut:{wood:.97,hyb:.98,long:.97,mid:.98,short:.99,gap:.99,sand:.99},rough:{wood:.8,hyb:.86,long:.84,mid:.88,short:.91,gap:.92,sand:.93},fescue:{wood:.45,hyb:.6,long:.55,mid:.66,short:.74,gap:.78,sand:.82}};
const LIE_E={cut:{wood:1.12,hyb:1.08,long:1.1,mid:1.06,short:1.04,gap:1.03,sand:1.03},rough:{wood:1.6,hyb:1.35,long:1.45,mid:1.3,short:1.2,gap:1.15,sand:1.15},fescue:{wood:2.6,hyb:1.9,long:2.2,mid:1.8,short:1.55,gap:1.45,sand:1.4}};
const LIE_V={cut:.015,rough:.04,fescue:.07},LIE_VG={wood:1.25,hyb:1,long:1.1,mid:.9,short:.75,gap:.7,sand:.7};
const lieVar=(c,lie)=>LIE_V[lie]?LIE_V[lie]*LIE_VG[clubGroup(c)]:0;
function lieRange(c,lie){const v=lieVar(c,lie);if(!v)return'';const m=lieMul(c,lie);return Math.round((m-v)*100)+'\u2013'+Math.round(Math.min(1,m+v)*100)+'%';}
const lieErr=(c,lie)=>LIE_E[lie]?LIE_E[lie][clubGroup(c)]:lie==='sand'?1.6:1;
function pinDist(){const p=G.hole.pin;return hyp(G.ball.x-p[0],G.ball.y-p[1]);}
function pinRise(){const p=G.hole.pin;return hAt(p[0],p[1])-hAt(G.ball.x,G.ball.y);}
function natMax(){const c=curClub();return clubCarry(c)*lieMul(c,G.lie)*SHOTS[G.stype].c;}
function previewDist(){const c=curClub();return c.putter?G.puttMax:isShort()&&G.swMax?G.swMax:natMax();}
/* ---- short game: chips run out by club (a 7-iron rolls about 3x its carry, a lob wedge well under its carry), pitches release a little,
   flops stop. The meter is sized round the shot like the putter's, and the planner finds the carry that finishes at the cup. ---- */
/* Oct 28 2026 short-game balance (Cam: "being closer to the hole is not really a benefit"; real daily replays: pitches from 40-70 yd
   finished 6.3 yd away, full shots from 70-100 yd 3.0): wider short-game timing windows (pitch 1.2, chip 1.2 - Cam later Oct 28: chip was 1.4, looked far bigger than an approach's; spinner 1), the
   short-game rating moves the window and the sideways miss less, chunks and blades start smaller and are capped (45% / 50% of
   carry), a bladed pitch runs 1.4x (was 2.2x), pitches stray sideways less, and the meter is sized from the carry needed.
   Shot lab, Dex, same timing: 30 yd chip 4.6 -> 1.9 yd, 50 yd pitch 12.5 -> 3.3, full 85 yd 4.7 (unchanged). */
/* short-game mishits by shot (from the shot lab): a bladed chip only runs a bit long; thinned high-spin shots (flop,
   spinner, pick, pitch) come off with no spin and release, so the hard shots carry the bigger risk. rel = extra roll as a share
   of carry at the worst blade */
const R3B_TWIRL_YD=15;   // a twirl is possible when a pure approach is landing within this many yards of the pin (it plays if it finishes close)
const BLADE={chipAmp:.6,chipR:1.2,rel:{pitch:.2,flop:1.3,spin:1.2,pick:.5,splash:.2}},SG_RAMP=.01;   // short-game mishits ramp in over the first .01 of meter past the window (strikeShot)
const SHORT_T={chip:1,pitch:1,flop:1,spin:1,splash:1,pick:1,blast:1},isShort=()=>!!SHORT_T[G.stype]&&!curClub().putter;
const CHIP_R={'7I':3,'8I':2.5,'9I':2,'PW':1.6,'GW':1.25,'SW':1,'LW':.7},PITCH_R={'9I':.5,'PW':.42,'GW':.34,'SW':.27,'LW':.2};
const SHORT_SURF={green:1,fairway:.7,tee:.7,cut:.5,rough:.28,fescue:.12,sand:0};
const SHORT_RK={spin:.035,flop:.1,splash:.42,pick:.16,blast:1.15};   // flop (was the .22 default): sky-high and stops dead
function shortRoll(c,st,L){const k=st==='chip'?(CHIP_R[tidOf(c)]??1):st==='pitch'?(PITCH_R[tidOf(c)]??.3):SHORT_RK[st]??.22;return k*(SHORT_SURF[L]??.5);}
// roll from a point with a starting speed over the real ground; returns where it stops and the path
function simRollP(x,y,dx,dy,v,path){let vx=dx*v,vy=dy*v;const h=1/240,pts=path?[[x,y]]:null;let lx=x,ly=y;
  for(let t=0;t<20;t+=h){const L=lieAt(x,y);if(L==='water'||L==='ob')return{x,y,pts,bad:true};
    const sp=hyp(vx,vy),mu=muRoll(L,sp),[gx,gy]=gradAt(x,y),sx=-GACC*gx,sy=-GACC*gy,smag=hyp(sx,sy);let ax=sx,ay=sy;if(sp>1e-6){ax-=mu*vx/sp;ay-=mu*vy/sp;}
    vx+=ax*h;vy+=ay*h;if(hyp(vx,vy)<Math.max(.1,mu*h*1.5)&&smag<muStill(L)*.95)break;x+=vx*h;y+=vy*h;
    if(pts&&hyp(x-lx,y-ly)>.5){pts.push([x,y]);lx=x;ly=y;}}
  if(pts)pts.push([x,y]);return{x,y,pts};}
// where a short shot of this carry lands (flying over the real ground) and where it finishes
/* v92: the wind's push per yard of carry, exactly as the shot itself applies it (so the meter's pin marker and the landing ring allow for it) */
function windK(){const c=curClub();if(c.putter)return 0;return G.wind.mph*.85/200*c.loft*SHOTS[G.stype].w*shotMods().wind*cmod().wind;}
/* v101: the player judges the wind themselves again: the meter yardages, the landing ring, the "plays X" yardage and the short-game
   flag no longer allow for it (the ball still feels it). The rivals' planning keeps using it */
function windAlong(aim){if(!G.aiTurn)return 0;const w=dirOf(G.wind.a),d=dirOf(aim);return windK()*(w[0]*d[0]+w[1]*d[1]);}   // >0 helping, <0 into the wind
function shortFinish(carry,aim,path){const c=curClub(),[dx,dy]=dirOf(aim),b=G.ball,M=shotMods(),wv=[dx,dy],wk=carry*windAlong(aim);   // distance only
  const f={sx:b.x,sy:b.y,y0:hAt(b.x,b.y)+.03,dx,dy,px:-dy,py:dx,carry,lat:0,wx:wv[0]*wk,wy:wv[1]*wk,apex:shotApex(c,carry)*M.apex,club:c,stype:G.stype,rollMul:M.roll*(cmod().roll?cmod().roll(c,G.stype):1),back:M.back*cmod().spin};
  let lx=b.x+dx*carry,ly=b.y+dy*carry,u=.5;for(;u<2.4;u+=.01){const q=flightPos(f,u);lx=q[0];ly=q[1];if(q[2]<=hAt(q[0],q[1])+.03)break;}
  const L=lieAt(lx,ly);if(L==='water'||L==='ob')return{x:lx,y:ly,lx,ly,L,bad:true,pts:path?[[lx,ly]]:null};
  // the same landing, hops and roll the shot itself will use (see land / stepHop / startRoll)
  const[tx,ty]=travelDir(f,u);let R=f.carry*shortRoll(c,G.stype,L)*f.rollMul;
  const spinBack=L==='green'&&f.back>0;if(spinBack)R=-Math.min(3.5,f.carry*.03)*f.back;
  const mu=MU.green,Tb=Math.max(.8+f.carry/140,.55+Math.sqrt(f.apex)*.28),g=clamp(8*f.apex/(Tb*Tb),16,42),vyIn=clamp(4*f.apex/Tb*(1+Math.max(0,u-1)),1,60),e=HOP_E[L]??.3;
  let vh=R>0?Math.min(Math.sqrt(2*mu*R)*.95,24):1.3;
  const hopDist=v0=>{let d=0,vy=vyIn*e,vv=v0;for(let k=0;k<4&&vy>=1.6;k++){d+=vv*2*vy/g;vy*=e;vv*=.72;}return d;};
  let Dh=hopDist(vh);if(R>0&&Dh>R*.6){vh*=R*.6/Dh;Dh=R*.6;}
  const rollV=R>0?Math.sqrt(2*mu*Math.max(0,R-Dh)):Math.sign(R)*Math.sqrt(2*mu*Math.abs(R));
  let [gx,gy]=gradAt(lx,ly),x=lx,y=ly,Y=hAt(lx,ly)+.01,hv={vx:tx*vh-gx*vyIn*e*1.6,vz:ty*vh-gy*vyIn*e*1.6,vy:vyIn*e,n:0};const pts=path?[[x,y]]:null;
  if(!(vyIn*e<1.6||L==='sand')){const h=1/120;for(let i=0;i<2400;i++){hv.vy-=g*h;Y+=hv.vy*h;x+=hv.vx*h;y+=hv.vz*h;const gnd=hAt(x,y);
      if(Y<=gnd&&hv.vy<0){Y=gnd;const L2=lieAt(x,y);if(L2==='water'||L2==='ob')return{x,y,lx,ly,L,bad:true,pts};const vi=-hv.vy,e2=HOP_E[L2]??.3;hv.n++;if(pts)pts.push([x,y]);
        if(vi*e2<1.6||hv.n>=4||L2==='sand')break;[gx,gy]=gradAt(x,y);hv.vy=vi*e2;hv.vx=hv.vx*.72-gx*vi*e2*1.6;hv.vz=hv.vz*.72-gy*vi*e2*1.6;}}}
  let rx,ry;if(rollV<0){rx=-tx;ry=-ty;}else{const l=hyp(hv.vx,hv.vz);if(l>.3){rx=hv.vx/l;ry=hv.vz/l;}else{rx=tx;ry=ty;}}
  const r=simRollP(x,y,rx,ry,Math.abs(rollV),path);if(pts&&r.pts)r.pts=pts.concat(r.pts);return{...r,lx,ly,L};}
// the carry that finishes level with the cup along the aim line
function shortPlan(){const b=G.ball,key=[G.clubIdx,G.stype,G.aim.toFixed(4),b.x.toFixed(2),b.y.toFixed(2),G.lie,G.swMax|0,G.imp.x,G.imp.y,G.traj,G.wind.a.toFixed(3),G.wind.mph,!!G.aiTurn].join('|');
  if(G.shortP&&G.shortP.key===key)return G.shortP;
  const p=G.hole.pin,[dx,dy]=dirOf(G.aim),want=(p[0]-b.x)*dx+(p[1]-b.y)*dy,mx=natMax()*shotMods().carry,along=q=>(q.x-b.x)*dx+(q.y-b.y)*dy;
  let lo=.5,hi=mx,over=false;if(along(shortFinish(hi,G.aim))<want){lo=hi;over=true;}
  else for(let i=0;i<15;i++){const m=(lo+hi)/2;if(along(shortFinish(m,G.aim))<want)lo=m;else hi=m;}
  const carry=over?mx:(lo+hi)/2,F=shortFinish(carry,G.aim,true);
  return G.shortP={key,carry,over,land:[F.lx,F.ly],landL:F.L,fin:[F.x,F.y],pts:F.pts,bad:!!F.bad};}
/* chips, pitches and spinners: the meter is sized from the distance to the pin (the same for every club), so the flag shows how big
   a swing each club needs: less loft runs out more and needs a smaller swing. Flops (and bunker shots) use the club's natural
   distance and no flag, judged like a full shot. There's no preview of the run-out: you read the roll yourself. */
// every short-game shot (flop and bunker shots too) gets a meter sized to the pin, with the flag on it
function setShortMax(){if(!isShort()){G.swMax=0;G.shortP=null;return;}G.swMax=0;G.shortP=null;const mx=natMax();
  const p=G.hole.pin,ka=windAlong(angTo(G.ball.x,G.ball.y,p[0],p[1]));
  G.swMax=clamp(pinDist()/(1+shortRoll(curClub(),G.stype,G.lie==='rough'?'fairway':'green'))*1.8/(shotMods().carry*Math.max(.6,1+Math.min(0,ka)))+1.5,Math.min(6,mx),mx);/* Oct 28 2026: sized from the carry the shot needs (a chip rolls most of the way), so the flag sits high on the meter */G.shortP=null;}
// pick the short-game shot: chip when it can land on the green and run, pitch when it has to carry more, the club that finishes closest
function chooseShort(){const d=pinDist(),L=G.lie;if(bunkerSide()){G.stype='splash';G.clubIdx=CI('SW');G.shortP=null;setShortMax();return true;}if(L==='sand'||L==='green'||d>70)return false;
  const J=shortJobFor();while(J.k<J.cands.length)shortEval(J,J.k++);
  if(!J.best)return false;
  G.stype=J.best.st;G.clubIdx=CI(J.best.id);G.shortP=null;setShortMax();return true;}
/* Oct 2026: the candidates (up to 11 chips and pitches, each a 16-step search over carries) took 50-110 ms on a phone in the frame
   the next shot was set up. They are now worked out a few per frame during the pause after the ball stops, from the same inputs
   prepareShot will give chooseShort (the lie and aim it will set, no spin). chooseShort uses that work only if its inputs match
   exactly; otherwise (or for anything not finished) it does the rest itself, so the choice is always the same as before. */
const SJ={job:null};
function shortKey(lie,aim,imp,traj,ps){return [G.hole&&G.hole.id,G.hi,G.ball.x,G.ball.y,lie,aim,imp.x,imp.y,traj,!!ps,G.wind.a,G.wind.mph,!!G.aiTurn,CHAR_ID,G.mode].join('|');}
function shortJobNew(lie,aim,imp,traj,ps){const p=G.hole.pin,d=pinDist(),cands=[];if(d<=40)for(const id of['7I','8I','9I','PW','GW','SW','LW'])cands.push(['chip',id]);for(const id of['PW','GW','SW','LW'])cands.push(['pitch',id]);
  return{key:shortKey(lie,aim,imp,traj,ps),lie,aim,imp:{x:imp.x,y:imp.y},traj,ps,p,cands,k:0,best:null};}
function shortJobFor(){const J=SJ.job;SJ.job=null;const key=shortKey(G.lie,G.aim,G.imp,G.traj,G.pshot);if(J&&J.key===key)return J;return shortJobNew(G.lie,G.aim,G.imp,G.traj,G.pshot);}
function shortEval(J,k){const[st,id]=J.cands[k],sv=[G.lie,G.aim,G.imp,G.traj,G.pshot,G.stype,G.clubIdx,G.swMax,G.shortP];
  try{G.lie=J.lie;G.aim=J.aim;G.imp=J.imp;G.traj=J.traj;G.pshot=J.ps;G.stype=st;G.clubIdx=CI(id);G.swMax=0;G.shortP=null;const P=shortPlan(),p=J.p;if(P.over||P.bad)return;
    const miss=hyp(P.fin[0]-p[0],P.fin[1]-p[1]),landPen=P.landL==='green'?0:(P.landL==='fairway'||P.landL==='tee')?1.2:P.landL==='cut'?1.8:P.landL==='rough'?4:8;
    const edge=P.landL==='green'?0:0;const sc=miss+landPen+(st==='pitch'?1.6:0)+(st==='chip'?Math.abs((CHIP_R[id]??1)-2)*.15:0)+edge;
    if(!J.best||sc<J.best.sc)J.best={sc,st,id};}
  finally{[G.lie,G.aim,G.imp,G.traj,G.pshot,G.stype,G.clubIdx,G.swMax,G.shortP]=sv;}}
/* after the ball stops: the lie and aim prepareShot will set; start the job if chooseShort would search */
function shortPrep(){SJ.job=null;try{if(MATCH.on||G.aiTurn||!G.hole)return;const lie=shotLie(),aim=(()=>{const t=aimTarget();return angTo(G.ball.x,G.ball.y,t[0],t[1]);})();
  const sv=[G.lie,G.aim];G.lie=lie;G.aim=aim;let go=false;try{go=!bunkerSide()&&lie!=='sand'&&lie!=='green'&&pinDist()<=70;}finally{[G.lie,G.aim]=sv;}
  if(go)SJ.job=shortJobNew(lie,aim,{x:0,y:0},0,false);}catch(e){SJ.job=null;}}
function shortTick(){const J=SJ.job;if(!J||J.k>=J.cands.length)return;const t0=performance.now();do{shortEval(J,J.k++);}while(J.k<J.cands.length&&performance.now()-t0<5);}
// a putt from off the green only when the whole line is mown grass
function puttLineClean(){const b=G.ball,p=G.hole.pin,d=pinDist();for(let i=1;i<20;i++){const t=i/20,L=lieAt(b.x+(p[0]-b.x)*t,b.y+(p[1]-b.y)*t);if(L!=='green'&&L!=='fairway'&&L!=='tee'&&L!=='cut')return false;}return true;}
const shotApex=(c,carry)=>c.apex*SHOTS[G.stype].a*Math.sqrt(clamp(carry/(c.carry*SHOTS[G.stype].c),.2,1))*(G.imp.y>0?1-.22*G.imp.y:1-.14*G.imp.y);
// the putter's full stroke is sized from what this putt needs (so the target sits around three-quarters of the meter, uphill or down)
// putter meter length (yards of roll on the starting surface). Off the green the ball starts on slower grass, so the yards
// it needs there are a fraction of the distance to the hole: size the meter from that, so the flag sits around 40-70% of
// the meter instead of near the bottom (which took three quick taps). No 1-yd floor: a downhill putt off the fringe can need
// only a few inches of fringe roll, and the floor put its flag at 10-25%
/* Oct 28 2026 putting meter (Cam): on the green the meter is sized so the flag sits further along the closer the putt: about 85% of
   the way at 4 ft, 75% at 10, 65% at 25 and 50% from 60 ft (smooth in between, by the log of the distance). Short putts get time for
   the taps; on a long putt the flag sits low on a long meter, so the same tap off the flag leaves the ball further away (lag putting
   was far too easy when every meter was cut to put the flag about three-quarters up). Off the green it's still cut to fit. */
const PUTT_FLAG=[[4,.85],[10,.75],[25,.65],[60,.5]];
function puttFlagAt(ft){const P=PUTT_FLAG;if(ft<=P[0][0])return P[0][1];for(let i=1;i<P.length;i++)if(ft<=P[i][0]){const a=Math.log(P[i-1][0]),b=Math.log(P[i][0]),t=(Math.log(ft)-a)/(b-a);return P[i-1][1]+(P[i][1]-P[i-1][1])*t;}return P[P.length-1][1];}
function calcPuttMax(){const q=puttNeed(),n=Math.max(0,q.need),k=cmod().puttM??1,b=G.lie==='green'?clamp(n/puttFlagAt(q.d*3),1,80):clamp(n*1.4+.1,.3,80);return k===1?b:Math.max(b*k,n*1.12+.2);}   // v103: a blade putter's meter is finer
function aimTarget(){const h=G.hole,s=alongCl(h,G.ball.x,G.ball.y);if(h.len-s>300){const p=h.at(s+255);return[p[0],p[1]];}return h.pin;}
/* the driver is a tee club. Brick and El Chupacabra (the two biggest hitters) can also take it off the fairway, shorter and wilder */
const DECK_DRIVER={brute:1,ch43:1};
/* on the tee box: the lie says so, or the ball is still at the hole's tee spot (some mapped tee boxes are smaller than the real ones,
   so a teed ball can read as fairway or rough) */
function onTeeBox(){const h=G.hole;if(!h)return false;if(G.lie==='tee')return true;const t=(h.line&&h.line[0])||[0,0];return Math.min(hyp(G.ball.x-t[0],G.ball.y-t[1]),hyp(G.ball.x,G.ball.y))<8;}
function driverOK(){if(onTeeBox())return true;return G.lie==='fairway'&&!G.aiTurn&&!!DECK_DRIVER[CHAR_ID];}
const clubLabel=c=>c.id==='1W'?'Driver':c.lbl||c.id;
/* off the tee on par 4s and 5s it's driver, unless the hole is short enough to lay up to the green or trouble (water, OB,
   bunkers, fescue) covers a good part of the driver's landing zone along the aim line */
function teeDriver(){const h=G.hole;if(!h||h.par<4||!onTeeBox())return false;
  const dC=clubCarry(CLUBS[0]);if(pinDist()<dC+25)return false;
  const[dx,dy]=dirOf(G.aim),px=-dy,py=dx;let bad=0,n=0;
  for(let s=dC-10;s<=dC+30;s+=8)for(let w=-14;w<=14;w+=7){const L=lieAt(G.ball.x+dx*s+px*w,G.ball.y+dy*s+py*w);n++;if(L==='water'||L==='ob'||L==='sand'||L==='fescue')bad+=Math.abs(w)>10?.6:1;}
  return bad/n<.2;}
function autoClub(d){
  if(G.lie==='green')return PUTTER;
  if(d<14&&(G.lie==='fairway'||G.lie==='tee'||G.lie==='cut'))return PUTTER;
  if(teeDriver())return 0;
  if(G.lie==='sand'){for(let i=PUTTER-1;i>=CI('5I');i--){const c=CLUBS[i];if(clubCarry(c)*lieMul(c,G.lie)>=d*.97)return i;}return CI('5I');}
  const lo=driverOK()?0:1;for(let i=PUTTER-1;i>=lo;i--){const c=CLUBS[i];if(clubCarry(c)*lieMul(c,G.lie)>=d*(G.lie==='fescue'?.93:.97)&&lieErr(c,G.lie)<2.4)return i;}   // from fescue a straighter club a few yards short beats a wild one
  if(G.lie==='rough'||G.lie==='fescue'){let bi=lo,bs=-1;for(let i=lo;i<PUTTER;i++){const c=CLUBS[i],sc=clubCarry(c)*lieMul(c,G.lie)/(1+(lieErr(c,G.lie)-1)*.5);if(sc>bs){bs=sc;bi=i;}}return bi;}
  return lo;
}
/* where the club meets the ball (x: -1 left .. 1 right, y: -1 bottom .. 1 top), power shots and uneven lies */
function stance(){const b=G.ball,[dx,dy]=dirOf(G.aim),px=-dy,py=dx,r=1.6;
  const gx=(hAt(b.x+r,b.y)-hAt(b.x-r,b.y))/(2*r),gy=(hAt(b.x,b.y+r)-hAt(b.x,b.y-r))/(2*r);
  let along=gx*dx+gy*dy,side=gx*px+gy*py;const dz=v=>Math.abs(v)<.022?0:v-Math.sign(v)*.022;return{along:dz(along),side:dz(side)};}
// -1 when the golfer on screen swings left-handed (lg.lefty): mirrors which way a mistimed strike curves, and which side of the ball his feet are on
function lefty(){return typeof R3B!=='undefined'&&R3B.lg&&R3B.lg.lefty?-1:1;}
function stanceLabel(){if(curClub().putter||G.lie==='green')return'';const S=stance(),a=[];S.side*=lefty();
  if(S.along>.02)a.push('Uphill');else if(S.along<-.02)a.push('Downhill');if(S.side>.02)a.push('Above feet');else if(S.side<-.02)a.push('Below feet');return a.join(' \u00b7 ');}
/* backspin on chips and pitches: it takes some of the release off but never checks them up or draws them back (that's
   what the flop and the spinner are for). Factor on the backspin's roll cut; 1 = full effect. */
const SPIN_K={chip:.7,pitch:.6};
/* Oct 2026: how much of the strike dot's backspin a full shot keeps from each lie (grass between club and ball kills spin): it
   shortens the roll-out by that share, and only a lie keeping at least half can still spin the ball back;
   the short game has its own lie table (SG_LIE) */
const BACK_LIE={cut:.8,rough:.3,fescue:0};
/* Oct 28 2026 (Cam: hybrids, woods and drivers shouldn't spin like they do): the share of the strike dot's backspin each club can
   put on the ball. A low strike with the driver no longer checks it up or spins it back; only clubs keeping at least half (irons,
   wedges) can draw the ball back. Topspin (a high strike) and sidespin are unchanged. */
const clubBack=c=>c.kind==='wood'?(c.id==='1W'||c.id==='MD'?0:.15):c.kind==='hybrid'?.35:c.kind==='iron'?(['3I','4I','5I','DI'].includes(c.id)?.75:1):1;
function shotMods(){const c=curClub();if(c.putter)return{carry:1,apex:1,roll:1,curve:0,win:1,back:0,wind:1};const tj=G.traj||0,bl=isShort()?1:(BACK_LIE[G.lie]??1);
  const S=stance(),ix=G.imp.x,iy=G.imp.y,ps=G.pshot?1:0;
  return{carry:(1+.15*ps)*(1-clamp(S.along,-.15,.15)*1.1)*(1-Math.abs(ix)*.04)*(iy<0?1+iy*.04:1)*(tj>0?.97:1),
    apex:(1+clamp(S.along,-.15,.15)*1.8)*(1-.08*ps)*(tj>0?1.3:tj<0?.68:1),
    roll:(1-clamp(S.along,-.15,.15)*1.5)*(iy>0?1+.9*iy:1+.72*iy*(SPIN_K[G.stype]??1)*bl*clubBack(c))*(tj>0?.55:tj<0?1.6:1),wind:tj>0?1.35:tj<0?.55:1,
    curve:ix*.085-clamp(S.side,-.15,.15)*.55-clamp(S.along,-.15,.15)*.12,
    win:(ps?.72:1)*(tj?.9:1)*clamp(1-(Math.abs(S.along)+Math.abs(S.side))*2.2,.6,1),back:iy<-.5&&SPIN_K[G.stype]===undefined&&bl*clubBack(c)>=.5?(-iy-.5)*2*bl*clubBack(c):0};}   // too little spin left to suck back (the rough): it checks, then releases
/* Oct 28 2026 approach shots (Cam: approaches were about twice as accurate as tour players', so par 4s were 50%+ birdies): full
   swings with an iron, hybrid or wedge get a slightly smaller timing window (APPR_WIN) and a little natural scatter in carry and
   line (APPR_K, as a share of carry; half of it on a perfect strike, 80% on a nice one). Woods, short-game shots and putts unchanged. */
const APPR_WIN=.9,APPR_K={wedge:.016,iron:.02,hybrid:.024};
const apprShot=()=>{const c=curClub();return !c.putter&&!isShort()&&!!APPR_K[c.kind];};
function apprDisp(club,perfect){if(!apprShot())return{c:1,l:0};const k=APPR_K[club.kind]*(perfect===2?.5:perfect===1?.8:1)*cmod().err(club);return{c:1+gauss()*k*.9,l:gauss()*k};}
const tightWin=()=>apprShot()||(!isShort()&&curClub().kind==='wood'&&G.lie==='tee');   // Cam: woods and the driver off the tee get the smaller window too
function perfectWin(){if(!curClub().putter)return perfectWinBase()*shotMods().win*cmod().win(curClub())*(tightWin()?APPR_WIN:1);return perfectWinBase()*cmod().win(curClub());}
// the player's window is 20% tighter than the rivals' (their timing spread was tuned against the original width)
function perfectWinBase(){const k=G.aiTurn?1:.8;if(curClub().putter)return .026*k;return((G.lie==='sand'&&!BUNKER_T[G.stype]&&!isShort())?SAND_WIN:(G.lie==='rough'||G.lie==='sand'||G.lie==='fescue')?.018:G.lie==='cut'?.022:.024)*SHOTS[G.stype].win*k;}
const SAND_WIN=.0145,SAND_FAT=[.12,7,.5];   // heavy from the sand: carry lost = .12 + 7 x how far early (s), at most half   // full shots from a fairway bunker: the tightest window in the game (fairway .024, rough .018)
// touch screens show the cursor a frame or two late; judge the tap against what the player saw
// what you see is what you get: the tap is judged exactly where the cursor is drawn
try{localStorage.removeItem('troyburne-tap-lag');}catch(e){}
// putting: meter power that sends the ball just past the cup (friction along the line, plus the rise or fall)
// how far this putt would roll on flat ground to finish just past the cup: friction along the line plus the rise or fall
// (on stimp-11 greens every foot of rise costs about 5 yards of roll, so the rise matters as much as the distance)
function puttNeed(){const b=G.ball,p=G.hole.pin,d=hyp(p[0]-b.x,p[1]-b.y);
  const n=Math.max(4,Math.ceil(d/.5));let work=0;for(let i=0;i<n;i++){const t=(i+.5)/n,L=lieAt(b.x+(p[0]-b.x)*t,b.y+(p[1]-b.y)*t);work+=(MU[L]||MU.fairway)*d/n;}
  const mu0=MU[G.lie]||MU.fairway,dz=hAt(p[0],p[1])-hAt(b.x,b.y);return{d,need:(work+GACC*dz+MU_GREEN*.45)/mu0};}
function puttTargetPower(){const q=puttNeed();if(q.d<.3)return null;return Math.max(0,q.need/G.puttMax);}
function roundDiff(){let d=0;G.scores.forEach((s,i)=>{if(s)d+=s-TB[i].par;});return d;}
const fmtDiff=d=>d===0?'E':d>0?'+'+d:'−'+(-d);
const aimingState=()=>G.state==='aim'||G.state==='power'||G.state==='acc';

