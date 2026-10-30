/* ---------- clubs & surfaces ---------- */
const CLUBS=[
 {id:'1W',deg:10.5,name:'Driver',carry:250,roll:.13,apex:28,loft:.8,kind:'wood'},
 {id:'3W',deg:15,name:'3 Wood',carry:230,roll:.11,apex:29,loft:.84,kind:'wood'},
 {id:'5W',deg:18,name:'5 Wood',carry:215,roll:.1,apex:30,loft:.87,kind:'wood'},
 {id:'4H',deg:22,name:'4 Hybrid',carry:200,roll:.085,apex:31,loft:.9,kind:'hybrid'},
 {id:'5I',deg:26,name:'5 Iron',carry:182,roll:.07,apex:32,loft:.95,kind:'iron'},
 {id:'6I',deg:29,name:'6 Iron',carry:171,roll:.06,apex:33,loft:.97,kind:'iron'},
 {id:'7I',deg:33,name:'7 Iron',carry:160,roll:.05,apex:34,loft:1,kind:'iron'},
 {id:'8I',deg:37,name:'8 Iron',carry:148,roll:.042,apex:35,loft:1.05,kind:'iron'},
 {id:'9I',deg:41,name:'9 Iron',carry:136,roll:.035,apex:36,loft:1.1,kind:'iron'},
 {id:'PW',deg:45,name:'Pitching Wedge',carry:124,roll:.028,apex:37,loft:1.15,kind:'wedge'},
 {id:'GW',deg:50,name:'Gap Wedge',carry:108,roll:.022,apex:38,loft:1.19,kind:'wedge'},
 {id:'SW',deg:56,name:'Sand Wedge',carry:92,roll:.016,apex:39,loft:1.25,kind:'wedge'},
 {id:'LW',deg:60,name:'Lob Wedge',carry:75,roll:.012,apex:40,loft:1.32,kind:'wedge'},
 {id:'PT',name:'Putter',carry:0,putter:true,kind:'putter'},
];
/* v103 club swaps: a slot (named by its stock club) can hold another club. tid = which stock club's lie tables it borrows */
const CLUB_ALT={
 '3W':[{id:'4W',deg:16.5,name:'4 Wood',carry:222,roll:.105,apex:29.5,loft:.855,kind:'wood',tid:'3W'},{id:'MD',lbl:'MD',deg:13,name:'Mini Driver',carry:240,roll:.12,apex:28.5,loft:.82,kind:'wood',tid:'3W'}],
 '5W':[{id:'7W',deg:21,name:'7 Wood',carry:205,roll:.09,apex:31.5,loft:.89,kind:'wood',tid:'5W'},{id:'3H',deg:19,name:'3 Hybrid',carry:210,roll:.09,apex:30.5,loft:.88,kind:'hybrid',tid:'4H'}],
 '4H':[{id:'3H',deg:19,name:'3 Hybrid',carry:210,roll:.09,apex:30.5,loft:.88,kind:'hybrid',tid:'4H'},{id:'5H',deg:25,name:'5 Hybrid',carry:190,roll:.08,apex:32,loft:.93,kind:'hybrid',tid:'4H'},
       {id:'4I',deg:23,name:'4 Iron',carry:192,roll:.075,apex:31,loft:.93,kind:'iron',tid:'5I'},{id:'DI',lbl:'DI',deg:20,name:'Driving Iron',carry:205,roll:.095,apex:28.5,loft:.88,kind:'iron',tid:'5I'}],
 '5I':[{id:'5H',deg:25,name:'5 Hybrid',carry:190,roll:.08,apex:32,loft:.93,kind:'hybrid',tid:'4H'}],
 'GW':[{id:'52',lbl:'52\u00b0',deg:52,name:'52\u00b0 Gap Wedge',carry:101,roll:.02,apex:38.5,loft:1.21,kind:'wedge',tid:'GW'}],
 'SW':[{id:'54',lbl:'54\u00b0',deg:54,name:'54\u00b0 Sand Wedge',carry:98,roll:.018,apex:38.5,loft:1.23,kind:'wedge',tid:'SW'}],
 'LW':[{id:'58',lbl:'58\u00b0',deg:58,name:'58\u00b0 Lob Wedge',carry:82,roll:.014,apex:39.5,loft:1.29,kind:'wedge',tid:'LW'},{id:'64',lbl:'64\u00b0',deg:64,name:'64\u00b0 Lob Wedge',carry:66,roll:.01,apex:41,loft:1.38,kind:'wedge',tid:'LW'}]};
const CLUBS_STD=CLUBS.slice();
for(const k in CLUB_ALT)for(const a of CLUB_ALT[k])a.slot=k;
const tidOf=c=>c.tid||c.id;
// the set for a turn: yours (with swaps) or the stock set (rivals); woods/hybrids/long iron slots kept longest-first
function clubSet(sw){const a=CLUBS_STD.map(c=>{const id=sw&&sw[c.id];return(id&&(CLUB_ALT[c.id]||[]).find(x=>x.id===id))||c;});
  const L=a.slice(1,5).sort((x,y)=>y.carry-x.carry);for(let i=0;i<4;i++)a[1+i]=L[i];return a;}
function clubsFor(ai){const a=clubSet(ai?null:(typeof BAG!=='undefined'?BAG.set:null));for(let i=0;i<a.length;i++)CLUBS[i]=a[i];}
const PUTTER=13, GACC=8, CI=id=>{let i=CLUBS.findIndex(c=>c.id===id);if(i<0)i=CLUBS.findIndex(c=>c.slot===id);return i;};
const ids=(...a)=>a.map(CI);
// shot types: carry, apex, roll, wind and error multipliers, impact-window scale, clubs allowed
const SHOTS={
 full:{c:1,a:1,r:1,w:1,e:1,win:1,clubs:CLUBS.map((c,i)=>i).filter(i=>i!==PUTTER),hint:'Full swing'},
 punch:{c:.8,a:.13,r:3,w:.35,e:.8,win:1,clubs:ids('4H','5I','6I','7I','8I','9I','PW'),hint:'Punch — low, bores through wind, runs out, stays under branches'},
 pitch:{c:.62,a:.85,r:.55,w:.8,e:.8,win:1.2,clubs:ids('9I','PW','GW','SW','LW'),hint:'Pitch — soft, medium height, checks up'},
 chip:{c:.33,a:.22,r:0,w:.3,e:.7,win:1.2,clubs:ids('7I','8I','9I','PW','GW','SW','LW'),hint:'Chip — low hop, then rolls like a putt'},
 flop:{c:.42,a:1.6,r:.12,w:1.3,e:2.1,win:.55,clubs:ids('GW','SW','LW'),hint:'Flop — sky-high and stops dead; tight timing'},
 spin:{c:.58,a:.6,r:.1,w:.8,e:.85,win:1,clubs:ids('PW','GW','SW','LW'),hint:'Spinner — a pitch with lots of spin: one hop and it checks up (fairway lies only)'},
 // greenside bunker shots (offered in the sand within 45 yards of the pin)
 splash:{c:.36,a:.34,r:.4,w:.7,e:1,win:1,clubs:ids('GW','SW','LW'),hint:'Splash — the standard bunker shot: up, out and a little release'},
 pick:{c:.43,a:.28,r:.15,w:.8,e:1.5,win:.6,clubs:ids('GW','SW','LW'),hint:'Pick — clean off the top of the sand: lands soft and stops; tight timing'},
 blast:{c:.3,a:.13,r:1.5,w:.5,e:.7,win:1.3,clubs:ids('PW','GW','SW','LW'),hint:'Blast — forgiving: comes out low and runs out'},
};
/* short-game meter: power = position^1.8, so a 15% chip sits a third of the way along and gives time to tap */
const SG_K=1.8,mK=()=>isShort()?SG_K:1,m2p=f=>Math.pow(clamp(f,0,1),mK()),p2m=p=>Math.pow(clamp(p,0,1),1/mK());
const BUNKER_T={splash:1,pick:1,blast:1},bunkerSide=()=>G.lie==='sand'&&!!G.hole&&pinDist()<=45;
const shotOK=(t,ci)=>SHOTS[t].clubs.includes(ci);
// green speed from the stimpmeter: the ramp releases the ball at 6 ft/s and it rolls STIMP feet on a flat green, so the rolling deceleration is v^2/(2d)
const STIMP=11,STIMP_V=2,MU_GREEN=STIMP_V*STIMP_V/(2*STIMP/3),CAP_YD=.85;
const CAPV=Math.sqrt(2*MU_GREEN*CAP_YD);   // a centred ball that would have run on CAP_YD (2.5 ft) past still drops
const MU={green:MU_GREEN,fairway:1.2,tee:1.2,cut:2.4,rough:11,sand:28,fescue:17};   // Oct 13 2026: fairway/tee/cut friction cut from 3.2/3.2/5.5 so slopes kick the ball (a full shot's roll-out on flat ground is planned from this, so it is unchanged)
// a slow ball on a green: the grass holds it less as it dies, so it trickles on down a slope instead of parking on it.
// Below 0.4 yd/s the green's rolling resistance eases to 45% (fully by 0.15 yd/s): a ball comes to rest only on slopes under
// about 3% (the cup-slope rule); on anything steeper it keeps trickling downhill at a walking-pace crawl. Faster rolls are unchanged.
// slow rolls lose less to the grass than fast ones (greens and, more mildly, fairways), so a dying ball still feeds down a slope
const MU_REST=.45,MU_REST_FW=.65,muRoll=(L,sp)=>{const m=MU[L]||MU.fairway;return L==='green'?m*(MU_REST+(1-MU_REST)*smooth(.15,.4,sp)):(L==='fairway'||L==='tee')?m*(MU_REST_FW+(1-MU_REST_FW)*smooth(.2,.9,sp)):m;},
  muStill=L=>(MU[L]||MU.fairway)*(L==='green'?MU_REST:(L==='fairway'||L==='tee')?MU_REST_FW:1);
const SURF={green:.9,fairway:1.08,tee:1.08,cut:.8,rough:.35,sand:.05,fescue:.15};
/* v100 roll-out: how well a green holds a full shot, by club (rolls on a green vs the fairway). Low-spin woods still release,
   hybrids and irons check up: a 3 wood runs about 17 yd on, a hybrid 9, a 5 iron 6, a 7 iron 4 (good-amateur numbers) */
const GREEN_HOLD={'1W':.8,'3W':.74,'5W':.73,'4H':.64,'5I':.62,'6I':.65,'7I':.72,'8I':.74,'9I':.8,'PW':.8,'GW':.8,'SW':.8,'LW':.8};   // v106: eased from v100 (greens were too sticky)
// a softer swing still lands shallow with little spin: roll is figured from a carry between this shot's and the full swing's
const PART_K={wood:.8,hybrid:.5,iron:.35,wedge:0};
// out of the rough the grass gets between club and ball: no spin, so it lands running (a flyer). Woods spin little anyway
const FLYER={cut:{wood:1,hyb:1.05,long:1.1,mid:1.15,short:1.2,gap:1.2,sand:1.2},rough:{wood:1.15,hyb:1.4,long:1.7,mid:2.1,short:2.6,gap:2.6,sand:2.6},fescue:{wood:1.2,hyb:1.5,long:1.85,mid:2.3,short:2.8,gap:2.8,sand:2.8}};   // short irons and wedges lose the most spin
// short game out of the rough / fescue: distance range, extra release (chips run a bit more, pitches and flops a lot more), spin kept, fescue grabs
const SG_LIE={cut:{v:.03,r:1.08,chip:1.03,back:.8},rough:{v:.07,r:1.3,chip:1.12,back:.5},fescue:{v:.11,r:1.5,chip:1.22,back:0,chunk:.1}};
const LIE_NAME={tee:'Tee box',fairway:'Fairway',cut:'First cut',rough:'Rough',sand:'Bunker',green:'Green',fescue:'Fescue',water:'Water',ob:'Out of bounds'};
const lieNm=k=>k==='fescue'&&typeof CUR!=='undefined'&&CUR.scen==='desert'?'Desert':LIE_NAME[k];   // v108: desert courses: the native area is desert, not fescue
const LIE_COL={tee:'#7cc257',fairway:'#6db14a',cut:'#5ea247',rough:'#3f7d35',sand:'#f4efe2',green:'#9ad873',fescue:'#c9b35f'};
const CUP_R=.059, CUP=.059, IMPACT=.12;   // the cup is 4.25 in across (0.059 yd radius); the ball drops once its centre is just inside the rim

/* ---------- Troy Burne (tips) — unofficial re-creation ----------
   Per hole: par, the tip on the tee card, and the green (size, rise and tilt). The fairways, bunkers and water come from the mapped course. */
const TB_TROY=[
 {par:5,tip:'A long, mostly flat opener that tightens as it goes. Three stacked bunkers left and three more right squeeze the lay-up zone, and sand rings a raised green — fourteen traps in all.',
  green:{rx:22,ry:17,elev:1.8},slope:[.25,-.3],bumps:[[450,-40,18,1.5],[480,42,16,1.2]]},
 {par:4,tip:'A lake runs the whole left side and two large bunkers pinch the landing area. Water sits left of the green and three bunkers guard the right, so choose your miss.',
  green:{rx:20,ry:16,elev:1.2},slope:[-.3,-.25]},
 {par:3,tip:'Two very deep bunkers guard the front left and front right. A spine runs across the green, so land it on the right side of the ridge.',
  green:{rx:17,ry:15,elev:1.5,spine:.9},slope:[.1,-.2]},
 {par:4,tip:'The one par 4 you can think about driving. Twelve bunkers defend it, four around the green, but the putting surface is one of the tamest on the course.',
  green:{rx:18,ry:15,elev:1},slope:[.15,-.1]},
 {par:5,drop:6,tip:'Straight and gently downhill, and still a three-shotter for most. Five fairway bunkers catch loose drives and four more wrap the green.',
  green:{rx:21,ry:17,elev:1.2},slope:[-.2,-.3]},
 {par:4,tip:'A wall of clustered bunkers crosses the fairway straight ahead. The green is the wildest around — it falls hard from back to front with a sneaky false front.',
  green:{rx:18,ry:16,elev:2.2},slope:[0,-.75]},
 {par:4,teeRise:7,tip:'An elevated tee with a view over the whole hole. Three stacked bunkers sit right of the fairway, a small pot guards the front of the green, and a collection area waits behind it.',
  green:{rx:19,ry:16,elev:1.4},slope:[.2,.25],bumps:[[412,0,11,-1.6]]},
 {par:3,tip:'A long, dangerous par 3. The big, deep bunker left of the green pulls in tee shots like a magnet.',
  green:{rx:17,ry:17,elev:1.3},slope:[.3,-.2]},
 {par:4,tip:'A long par 4 with ten bunkers, but it finishes on the easiest, flattest green on the course — a real chance to close the front nine well.',
  green:{rx:22,ry:18,elev:.8},slope:[.08,-.1]},
 {par:4,tip:'A strong dogleg left. A long waste bunker runs down the left side, and a pond lurks left of the approach — cut the corner and you bring both into play.',
  green:{rx:19,ry:16,elev:1},slope:[.25,-.2]},
 {par:3,tip:'The signature hole. A pond sits right of the line on the way in, and the bunkers left of the green are the most punishing on the course — deep and steep.',
  green:{rx:18,ry:14,elev:.8},slope:[0,-.3]},
 {par:5,tip:'A reachable par 5 that hugs the shoreline on the left from tee to green. Eight bunkers and an elevated three-tier green make the second shot a real decision.',
  green:{rx:18,ry:18,elev:2.3,tier:.7},slope:[.1,-.35]},
 {par:3,tip:'A lengthy par 3 with the lake down the left and a pond protecting the right side of a big green.',
  green:{rx:19,ry:15,elev:.9},slope:[.35,0]},
 {par:4,tip:'One of the hardest tee shots out here: lake on the left, a cluster of bunkers in the right side of the landing zone, and a little waterfall pond by the approach.',
  green:{rx:20,ry:16,elev:1.3},slope:[-.2,-.25]},
 {par:3,tip:'The shortest hole with the toughest green. A spine snakes across the putting surface and putts break faster than you expect.',
  green:{rx:15,ry:13,elev:1.4,spine:1},slope:[.5,-.35]},
 {par:5,tip:'The longest hole: the pond it shares with 10 sits left of the tee-shot landing area. The final approach climbs to a green perched well above the fairway.',
  green:{rx:20,ry:17,elev:1},slope:[-.2,-.2],rise:{from:470,to:535,h:5.5}},
 {par:4,drop:8,tip:'A stunning downhill par 4 with a pond tucked right of the green, so favour the left on the approach. Bunkers line the left side of the fairway.',
  green:{rx:20,ry:16,elev:.6},slope:[.1,-.2]},
 {par:4,tip:'A long par 4 with no tricks. Two big bunkers sit right, fescue waits for a wide miss, and a deep hollow lurks short left of the green.',
  green:{rx:21,ry:17,elev:1.2},slope:[-.15,-.25],bumps:[[440,-20,12,-2.6]]},
];

/* Mapped Troy Burne geometry: OpenStreetMap contributors (ODbL), converted to yards. */
/*@data COURSE_TROY*/
