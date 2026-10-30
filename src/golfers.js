/* ---------- golfers: twenty characters, each with attributes in the spirit of the Challenge upgrades ---------- */
// Play Now stats run 1-10; d10 maps them (and the Challenge V2 stats) onto -2..+2 around the average golfer (5.5)
const d10=v=>(v-1)/9*4-2;
const CHAR_STATS=[['pow','Power'],['ctl','Control'],['imp','Impact'],['sg','Short game'],['putt','Putting'],['spin','Spin']];
const CHARS=[
 {id:'boss',name:'The Boss',nick:'Club champion, 40 years running',blurb:'Flat cap, cigar and a swing nobody would teach. Nothing fancy, nothing broken: he just gets it round.',
  st:{pow:6,ctl:5,imp:5,sg:6,putt:6,spin:5},trait:{name:'Grinder',d:'Mishits cost him 30% less distance.'},fx:{grind:1}},
 {id:'granny',name:'Coach Dot',nick:'Retired PE teacher, whistle included',blurb:'She hits it nowhere and straight down the middle, every time, then gets up and down from anywhere. Do not three-putt in front of her.',
  st:{pow:2,ctl:10,imp:5,sg:7,putt:8,spin:1},trait:{name:'Low and steady',d:'Her flat ball flight drifts 25% less in the wind.'},fx:{wind:.75}},
 {id:'brute',name:'Brick',nick:'Strongman, long-drive hopeful',blurb:'Built like a barn door and swings like he is splitting logs. When he catches it, it is gone. Touch around the greens is a work in progress.',
  st:{pow:10,ctl:3,imp:4,sg:3,putt:3,spin:6},trait:{name:'Bomber',d:'+5% carry with the driver and woods, but his chunks are 25% heavier.'},fx:{bomb:1}},
 {id:'ch09',name:'Scout',nick:'Junior club champ, age 12',blurb:'Fearless, loose and annoyingly natural. Short off the tee, but the timing is effortless and he has never been nervous over a putt.',
  st:{pow:3,ctl:5,imp:10,sg:6,putt:6,spin:3},trait:{name:'Fearless',d:'Perfect strikes: +6% carry with woods (not 3%), and iron shots bite twice as hard.'},fx:{perf:1.06}},
 {id:'ch43',name:'El Chupacabra',nick:'Lucha libre legend, weekend golfer',blurb:'Plays every shot like a top-rope dive. Huge power and huge spin, and the ball goes wherever it likes when the timing is off.',
  st:{pow:8,ctl:3,imp:5,sg:4,putt:3,spin:10},trait:{name:'High flyer',d:'Flop shots get a 40% wider timing window.'},fx:{flop:1.4}},
 {id:'ch06',name:'Dex',nick:'College athlete, headphones on',blurb:'Long, smooth and locked in with his playlist. A pure iron player whose chipping and putting have not caught up yet.',
  st:{pow:8,ctl:8,imp:5,sg:3,putt:3,spin:6},trait:{name:'Pure striker',d:'His irons and hybrids stray 15% less.'},fx:{iron:.85}},
 {id:'remy',name:'Remy',nick:'Twilight-league regular',blurb:'Shorts, skate shoes and nine holes after work every night. Nothing flashy, but he almost never makes a big number.',
  st:{pow:5,ctl:6,imp:5,sg:6,putt:8,spin:3},trait:{name:'Twilight league',d:'His putting window is 12% wider.'},fx:{putw:1.12}},
 {id:'ty',name:'Ty',nick:'Sketchbook kid, scarf in July',blurb:'Draws every hole before he plays it and swings like a cartoon. Short off the tee, but give him a wedge and he will invent a shot.',
  st:{pow:1,ctl:5,imp:8,sg:8,putt:5,spin:6},trait:{name:'Imagination',d:'Chips, pitches and bunker shots get a 12% wider timing window.'},fx:{sgw:1.12}},
 {id:'vegas',name:'Big Vegas',nick:'Lounge singer, plays in the jumpsuit',blurb:'Thank you, thank you very much. All power and showmanship, and the ball goes wherever the band is playing when he mistimes it.',
  st:{pow:10,ctl:1,imp:6,sg:5,putt:5,spin:6},trait:{name:'Showstopper',d:'Perfect strikes: +6% carry with woods (not 3%), and iron shots bite twice as hard.'},fx:{perf:1.06}},
 {id:'peasant',name:'Farmer Hob',nick:'Grows hay, hits it low',blurb:'Learned the game knocking stones across the back forty. A low, boring ball flight that the wind can barely touch.',
  st:{pow:8,ctl:6,imp:3,sg:5,putt:5,spin:6},trait:{name:'Plough line',d:'His low ball flight drifts 20% less in the wind.'},fx:{wind:0.8}},
 {id:'ch01',name:'Gary',nick:'Sales rep, Friday afternoons',blurb:'Has played the same ball for three years. Short, straight and smiling, and he finds every fairway on the course.',
  st:{pow:5,ctl:8,imp:5,sg:6,putt:6,spin:3},trait:{name:'Fairway finder',d:'His driver and woods stray 15% less.'},fx:{wood:0.85}},
 {id:'ch08',name:'Marco',nick:'Personal trainer, first tee time',blurb:'Warms up for twenty minutes and swings like he is still in the gym. Fast hands, loose putter.',
  st:{pow:8,ctl:5,imp:8,sg:3,putt:3,spin:6},trait:{name:'Fast hands',d:'+2% carry on every full shot.'},fx:{carry:1.02}},
 {id:'ch12',name:'Jordan',nick:'Caddie turned player',blurb:'Spent ten summers carrying bags and reading other people\u2019s putts. Now he gets to hit them himself.',
  st:{pow:5,ctl:6,imp:5,sg:8,putt:7,spin:2},trait:{name:'Caddie\u2019s eye',d:'Chips, pitches and bunker shots get a 10% wider timing window.'},fx:{sgw:1.1}},
 {id:'ch17',name:'Mack',nick:'Site foreman, plays in work boots',blurb:'Comes straight from the job site with a hard hat in the cart. Swings hard, misses hard, and somehow it still finds the green.',
  st:{pow:10,ctl:3,imp:5,sg:3,putt:6,spin:6},trait:{name:'Steel toes',d:'Mishits cost him 30% less distance.'},fx:{grind:1}},
 {id:'ch23',name:'Preston',nick:'New clubs every month',blurb:'Blazer on the range, launch monitor in the bag. The swing is borrowed from a lesson video, but those forged irons are honest.',
  st:{pow:6,ctl:7,imp:6,sg:5,putt:5,spin:4},trait:{name:'Tour gear',d:'His irons and hybrids stray 12% less.'},fx:{iron:0.88}},
 {id:'ch24',name:'Shadow',nick:'Plays at dawn, never seen teeing off',blurb:'Nobody knows his name or his handicap. Silent swing, perfect tempo, and a ball that seems to vanish into the fog.',
  st:{pow:5,ctl:6,imp:8,sg:6,putt:3,spin:5},trait:{name:'Silent strike',d:'Perfect strikes: +5% carry with woods (not 3%), and iron shots bite harder.'},fx:{perf:1.05}},
 {id:'ch28',name:'Andre',nick:'Club pro on his day off',blurb:'Teaches all week and finally gets to play for himself. A tour-quality swing with the long clubs.',
  st:{pow:8,ctl:8,imp:5,sg:3,putt:5,spin:4},trait:{name:'Pro swing',d:'His driver and woods stray 15% less.'},fx:{wood:0.85}},
 {id:'ch31',name:'Nina',nick:'College golfer, four-year starter',blurb:'Scholarship player with a stroke built on ten thousand practice putts. Not the longest, but nerves of steel inside ten feet.',
  st:{pow:4,ctl:7,imp:5,sg:6,putt:8,spin:3},trait:{name:'Clutch putter',d:'Her putting window is 12% wider.'},fx:{putw:1.12}},
 {id:'ch39',name:'Master Ko',nick:'Ninety years old, still breaks 80',blurb:'Moves like water, hits it about as far. Around the greens he has seen every shot there is.',
  st:{pow:1,ctl:7,imp:6,sg:8,putt:8,spin:3},trait:{name:'Patience',d:'Chips, pitches and bunker shots get a 15% wider timing window.'},fx:{sgw:1.15}},
 {id:'ch42',name:'Danny',nick:'Summer job at the range',blurb:'Picks the range every morning and hits the leftovers every night. All speed and swagger; the short game can wait.',
  st:{pow:8,ctl:3,imp:8,sg:5,putt:3,spin:6},trait:{name:'Range rat',d:'Perfect strikes: +5% carry with woods (not 3%), and iron shots bite harder.'},fx:{perf:1.05}}];
/* ---------- tour legends (Oct 2026): ten knock-off pros on existing bodies (base), re-dressed at load time:
   lg = shirt (top), pants, shoes, socks (sock2 = argyle second colour), hat ('cap' | 'flat' | 'visor'), hatc, shades, hide (baked headgear).
   Stats keep the roster's 33-point total so nobody is simply better; their shape follows the real player. ---------- */
const LEGENDS=[
 {id:'lg_tyger',base:'ch28',name:'Tyger Woodz',nick:'Fifteen majors and a red shirt on Sunday',blurb:'The fist pump, the stinger, the stare. Everything in his game is elite, and when he flushes one it simply goes further.',
  st:{pow:7,ctl:5,imp:6,sg:6,putt:6,spin:4},trait:{name:'Sunday Red',d:'Perfect strikes: +6% carry with woods (not 3%), and iron shots bite twice as hard.'},fx:{perf:1.06},
  lg:{top:'#c8102e',pants:'#16181c',shoe:'#1c1c1e',hat:'cap',hatc:'#16181c',belt:'#16181c'}},
 {id:'lg_jack',base:'remy',name:'Jack Nickels',nick:'The Golden Cub',blurb:'Plays the percentages, hits a high fade and holes every putt that matters. Never beats himself.',
  st:{pow:7,ctl:6,imp:5,sg:4,putt:8,spin:4},trait:{name:'Clutch Cub',d:'His putting window is 12% wider.'},fx:{putw:1.12},
  lg:{top:'#f2c94c',pants:'#8a8f98',shoe:'#f4f4f2',hair:'#e8cf86',belt:'#f4f4f2',girth:1.04}},
 {id:'lg_arnie',base:'ch01',name:'Arnie Palmtree',nick:'The Duke, and his army',blurb:'Swings from the heels, hitches his pants and charges at every flag. Even his misses come out of the rough running.',
  st:{pow:7,ctl:4,imp:6,sg:5,putt:6,spin:6},trait:{name:'Army Charge',d:'Mishits cost him 30% less distance.'},fx:{grind:1},
  lg:{top:'#7fb2d9',pants:'#c9b48a',shoe:'#f4f4f2',hat:'visor',hatc:'#f2efe6',belt:'#3a2a20',scale:1.01,girth:1.05}},
 {id:'lg_phil',base:'ch08',name:'Phil Pickelson',nick:'Lefty, the flop-shot wizard',blurb:'Aviators on, aggressive to every pin, and a short game from another planet. The driver goes wherever it likes.',
  st:{pow:6,ctl:3,imp:5,sg:8,putt:5,spin:7},trait:{name:'Flop Wizard',d:'Flop shots get a 40% wider timing window.'},fx:{flop:1.4},
  lg:{top:'#f4f4f2',pants:'#1d2633',shoe:'#f4f4f2',hat:'visor',hatc:'#f4f4f2',shades:1,belt:'#16181c',scale:1.03,girth:1.12,lefty:1}},
 {id:'lg_rory',base:'ch42',name:'Rory McAllroy',nick:'Northern Irish bomber',blurb:'The fastest, freest swing on tour. When it is on he wins by eight; around the greens he is merely very good.',
  st:{pow:10,ctl:4,imp:6,sg:4,putt:4,spin:4},trait:{name:'Bomber',d:'+5% carry with the driver and woods, but his chunks are 25% heavier.'},fx:{bomb:1},
  lg:{top:'#1f2f4d',pants:'#9ba3ad',shoe:'#f4f4f2',belt:'#16181c',scale:.97}},
 {id:'lg_scotty',base:'ch17',name:'Scotty Shuffler',nick:'World No. 1, happy feet',blurb:'Shuffles his feet through every swing and still hits it on a string. Iron play that wins majors by five.',
  st:{pow:7,ctl:7,imp:6,sg:5,putt:4,spin:5},trait:{name:'Ball Striker',d:'His irons and hybrids stray 15% less.'},fx:{iron:.85},
  lg:{top:'#c9d6e3',pants:'#22324d',shoe:'#f4f4f2',hat:'cap',hatc:'#f4f4f2',belt:'#3a2a20',scale:1.06}},
 {id:'lg_seve',base:'mx_joe',name:'Sevvy Ballestrada',nick:'The Spanish magician',blurb:'Wild off the tee and unbeatable from the car park. There is no lie he cannot escape and no shot he will not try.',
  st:{pow:6,ctl:2,imp:6,sg:9,putt:6,spin:5},trait:{name:'Escape Artist',d:'Chips, pitches and bunker shots get a 15% wider timing window.'},fx:{sgw:1.15},
  lg:{top:'#1c2b4a',pants:'#1c2b4a',shoe:'#1c1c1e',belt:'#16181c'}},
 {id:'lg_barry',base:'ch42',name:'Barry Player',nick:'The Black Knight',blurb:'Dresses all in black, does a thousand push-ups a day and never leaves a bunker shot in the sand.',
  st:{pow:4,ctl:7,imp:6,sg:8,putt:5,spin:4},trait:{name:'Bunker Master',d:'Chips, pitches and bunker shots get a 12% wider timing window.'},fx:{sgw:1.12},
  lg:{top:'#121214',pants:'#121214',shoe:'#121214',hat:'flat',hatc:'#121214',belt:'#121214',scale:.93}},
 {id:'lg_hoagan',base:'ch01',name:'Ben Hoagan',nick:'The Hawk',blurb:'Dug it out of the dirt. Cold stare, white flat cap and a swing so repeatable it bores the gallery.',
  st:{pow:5,ctl:10,imp:7,sg:4,putt:4,spin:4},trait:{name:'Fairway Finder',d:'His driver and woods stray 15% less.'},fx:{wood:.85},
  lg:{top:'#e9e6df',pants:'#a3a6ab',shoe:'#3a2a20',hat:'flat',hatc:'#f2f0ea',belt:'#3a2a20',scale:.97}},
 {id:'lg_payne',base:'ch23',name:'Payne Stewie',nick:'Knickers, flat cap, silky tempo',blurb:'The smoothest swing you ever saw, in plus-fours and argyle. His low, penetrating flight cuts through any wind.',
  st:{pow:5,ctl:6,imp:6,sg:5,putt:7,spin:5},trait:{name:'Silky Tempo',d:'His low ball flight drifts 20% less in the wind.'},fx:{wind:.8},
  lg:{top:'#f4f1e8',pants:'#5d6f8c',shoe:'#f4f4f2',sock:'#1d2b4f',sock2:'#e9e3d1',hat:'flat',hatc:'#5d6f8c',plaid:'#c9b48a'}}];
CHARS.push(...LEGENDS);
LEGENDS.forEach(c=>c.off=1);   // Oct 19 2026: the legends are off the picker for now (still in CHARS so their bodies and lookups keep working)
/* Oct 13 2026: the legends wear realistic MakeHuman bodies (char_mh_<name>.js, built by pipeline/mh, CC0 assets). Each body is built at
   the player's own height, so the old scale/girth adjustments are off; hair colour per legend. (The ?mh test switch is retired.) */
try{localStorage.removeItem('golf-mh');}catch(e){}
LEGENDS.forEach(c=>{c.base='mh_'+c.id.slice(3);c.lg={...c.lg,scale:1,girth:1};const HC={lg_tyger:'#141110',lg_arnie:'#6b5a48',lg_phil:'#2b2420',lg_rory:'#2a1f18',lg_scotty:'#5a4330',lg_seve:'#1c1612',lg_barry:'#16120f',lg_hoagan:'#2a221c',lg_payne:'#7a5a3a'};if(HC[c.id])c.lg.hair=HC[c.id];const GR={lg_tyger:{ptr:'anser'},lg_jack:{ptr:'mallet',drv:'persimmon'},lg_arnie:{ptr:'blade',ptrc:'#b08d57',drv:'persimmon'},lg_phil:{ptr:'anser',ptrc:'#2c3036'},lg_rory:{ptr:'spider',ptrc:'#202326',ptrs:'#e0482f'},
  lg_scotty:{ptr:'spider',ptrc:'#24365e',ptrs:'#f2f2f2'},lg_seve:{ptr:'blade',drv:'persimmon'},lg_barry:{ptr:'blade',ptrc:'#2c3036',drv:'persimmon'},lg_hoagan:{ptr:'blade',ptrc:'#b8955a',drv:'persimmon'},lg_payne:{ptr:'anser'}};   // signature clubs (looks only)
  if(GR[c.id])Object.assign(c.lg,GR[c.id]);});
const LEG_BASE=Object.fromEntries(LEGENDS.map(c=>[c.id,c.base])),LEG_LOOK=Object.fromEntries(LEGENDS.map(c=>[c.id,c.lg]));

/*@data CHAR_PIC*/
/*@data CHAR_PIC.assign1*/
let CHAR_ID=(()=>{try{const v=localStorage.getItem('golf-char');return CHARS.some(c=>c.id===v&&!c.off)?v:'boss';}catch(e){return'boss';}})();
const curChar=()=>CHARS.find(c=>c.id===CHAR_ID)||CHARS[0];
function charMods(ch){const S=ch.st,F=ch.fx||{},d=k=>d10(S[k]);return{
  carry:c=>1+.025*d('pow')+(F.bomb&&c.kind==='wood'?.05:0)+(F.carry?F.carry-1:0),
  err:c=>isShort()&&!c.putter?Math.max(.5,1-.06*d('sg')):Math.max(.5,1-.08*d('ctl')-((c.kind==='iron'||c.kind==='hybrid')&&F.iron?1-F.iron:0)-(c.kind==='wood'&&F.wood?1-F.wood:0)),
  win:c=>c.putter?(1+.15*d('putt'))*(F.putw||1):isShort()?(1+.1*d('sg'))*(G.stype==='flop'&&F.flop?F.flop:1)*(F.sgw||1):1+.07*d('imp'),
  curve:1+.08*d('spin'),spin:1+.15*d('spin'),wind:F.wind||1,putt:Math.max(.5,1-.07*d('putt')),
  mis:(1-.1*d('sg'))*(F.grind?.7:1)*(F.bomb?1.25:1),sgVar:Math.max(.4,1-.15*d('sg')),puttD:Math.max(.4,1-.15*d('putt')),misFull:(F.grind?.7:1)*(F.bomb?1.15:1),perf:F.perf||1.03};}
let CHAR_M=null,CHAR_MID=null;const curCharMods=()=>{if(CHAR_MID!==CHAR_ID){CHAR_MID=CHAR_ID;CHAR_M=charMods(curChar());}return CHAR_M;};
function golferRow(){const c=curChar();$('mGolferImg').src=CHAR_PIC[c.id];setT('mGolferName',c.name);setT('mGolferSub',c.trait.name+' \u00b7 change golfer');}
let chSel=null;
function openChars(){chSel=CHAR_ID;$('menuM').hidden=true;$('charM').hidden=false;renderChars();}
function renderChars(){const g=$('chGrid');g.innerHTML='';
  for(const c of CHARS){if(c.off)continue;const b=document.createElement('button');b.className=(c.id===chSel?'on ':'')+(c.id===CHAR_ID?'cur':'');b.setAttribute('aria-pressed',String(c.id===chSel));
    b.innerHTML='<img alt="" src="'+CHAR_PIC[c.id]+'"><b>'+c.name+'</b>';b.onclick=()=>{chSel=c.id;sfx.tick();renderChars();try{$('chDet').scrollIntoView({behavior:'smooth',block:'start'});}catch(e){}};g.appendChild(b);}   // 20 golfers: bring the details into view
  const c=CHARS.find(x=>x.id===chSel);let h='<h2>'+c.name+'</h2><div class="nick">'+c.nick+'</div><p>'+c.blurb+'</p><div class="chstats">';
  for(const[k,n]of CHAR_STATS){const v=c.st[k];h+='<span>'+n+'</span><div class="chbar'+(v>=9?' hi':'')+'" aria-label="'+n+' '+v+' of 10">'+[1,2,3,4,5,6,7,8,9,10].map(i=>'<i class="'+(i<=v?'f':'')+'"></i>').join('')+'</div>';}
  {const T={pow:'Long hitter',ctl:'Keeps it in play',imp:'Pure striker',sg:'Short-game wizard',putt:'Elite putter',spin:'Spin master'},W={pow:'Short off the tee',ctl:'Wild when he misses',imp:'Tight timing window',sg:'Shaky around the greens',putt:'Streaky putter',spin:'Little spin'};
    const hi=CHAR_STATS.filter(([k])=>c.st[k]>=8).map(([k])=>T[k]),lo=CHAR_STATS.filter(([k])=>c.st[k]<=2).map(([k])=>W[k]);
    if(hi.length||lo.length)h+='</div><div class="chtags">'+hi.map(t=>'<span class="up">'+t+'</span>').join('')+lo.map(t=>'<span class="dn">'+t+'</span>').join('');}
  h+='</div><div class="chtrait"><b>'+c.trait.name+'</b>'+c.trait.d+'</div>';$('chDet').innerHTML=h;
  $('chGo').textContent=c.id===CHAR_ID?'Keep '+c.name:'Play as '+c.name;renderBag();}
function pickChar(){const id=chSel,prev=CHAR_ID;const done=ok=>{if(!ok){CHAR_ID=prev;try{localStorage.setItem('golf-char',prev);}catch(e){}toast('COULD NOT LOAD','That golfer did not download. Try again.','#ff9b6a');}golferRow();};
  CHAR_ID=id;try{localStorage.setItem('golf-char',id);}catch(e){}golferRow();
  if(typeof r3GolferSet==='function'&&R3.on)r3GolferSet(id,done);else done(true);
  $('charM').hidden=true;$('menuM').hidden=false;sfx.tick();}
const CAREER_KEY='golf-career-v1';
function blankCareer(){return{v:1,pts:0,st:{pow:0,ctl:0,imp:0,spin:0,putt:0},gear:{drv:0,irn:0,wdg:0,ptr:0,ball:0},look:'classic',owned:['classic'],beaten:[],record:{},match:null};}
let CAR=blankCareer();
function loadCareer(){try{const d=JSON.parse(localStorage.getItem(CAREER_KEY)||'null');if(d&&d.v===1){CAR={...blankCareer(),...d,st:{...blankCareer().st,...d.st},gear:{...blankCareer().gear,...d.gear}};}}catch(e){}}
function saveCareer(){try{localStorage.setItem(CV===2?CAREER2_KEY:CAREER_KEY,JSON.stringify(CAR));}catch(e){}}
loadCareer();
/* ---------- Challenge V2: you start as Gary with the worst stats and unlock each golfer by beating them on their course.
   Stats here run 1-10 (they map onto the same -2..+2 range as the Play Now 1-5 stats); Master Ko, last, is maxed out.
   No skill upgrades: points buy knock-off equipment. Progress is kept apart from the original Challenge. ---------- */
const CH2_START='ch01',CH2_ORDER=['ch01', 'remy', 'ch12', 'ch08', 'ch42', 'ch23', 'ch31', 'ch28', 'ch06', 'ch17', 'ch09', 'granny', 'brute', 'peasant', 'ty', 'vegas', 'ch24', 'boss', 'ch43', 'ch39'];
const CH2_COURSE={'remy':'troy','ch12':'stoneridge','ch08':'quarry','ch42':'legend','ch23':'wilderness','ch31':'sandvalley','ch28':'mammoth','ch06':'sedge','ch17':'lido','ch09':'heritage','granny':'pawplant','brute':'caledonia','peasant':'trueblue','ty':'crsc','vegas':'crls','ch24':'senator','boss':'legislator','ch43':'judge','ch39':'rossbridge'};
const CH2_ST={ch01:{pow:1,ctl:1,imp:1,sg:1,putt:1,spin:1},remy:{pow:1,ctl:1,imp:1,sg:1,putt:4,spin:1},ch12:{pow:1,ctl:1,imp:1,sg:4,putt:4,spin:1},ch08:{pow:5,ctl:2,imp:4,sg:1,putt:1,spin:2},ch42:{pow:5,ctl:1,imp:5,sg:2,putt:1,spin:3},ch23:{pow:3,ctl:7,imp:3,sg:3,putt:3,spin:1},ch31:{pow:4,ctl:6,imp:4,sg:4,putt:4,spin:1},ch28:{pow:7,ctl:7,imp:4,sg:2,putt:4,spin:2},ch06:{pow:7,ctl:7,imp:5,sg:2,putt:3,spin:5},ch17:{pow:10,ctl:3,imp:6,sg:3,putt:5,spin:5},ch09:{pow:3,ctl:6,imp:10,sg:6,putt:6,spin:3},granny:{pow:2,ctl:10,imp:6,sg:9,putt:8,spin:2},brute:{pow:10,ctl:5,imp:5,sg:6,putt:6,spin:8},peasant:{pow:10,ctl:7,imp:5,sg:7,putt:7,spin:7},ty:{pow:2,ctl:8,imp:10,sg:10,putt:8,spin:8},vegas:{pow:10,ctl:3,imp:9,sg:9,putt:9,spin:9},ch24:{pow:9,ctl:9,imp:10,sg:9,putt:5,spin:9},boss:{pow:9,ctl:9,imp:9,sg:9,putt:9,spin:9},ch43:{pow:10,ctl:9,imp:10,sg:9,putt:9,spin:10},ch39:{pow:10,ctl:10,imp:10,sg:10,putt:10,spin:10}};
const GEAR2_TIERS={drv:['Callawhy Big Birtha','TaylorMaid Stealthy','Titlelist TS-Wee','Pong G-430 Max'],irn:['Mizunope Forged','Srixxon ZX-Ish','Titlelist T-Hundred','Mizunope Pro Blades'],
  wdg:['Clevelund RTX-ish','Vokay SM-Nein','Titlelist Vokay Raw','Vokay Tour Grind'],ptr:['Odysee White Hot','Pong Anser-ish','Scotty Camerone','Scotty Camerone Circle Tee'],
  ball:['Top-Fight','Bridgestoned Tour','Taylor-Maid TP-Five','Pro V-Won']};
// opponents' skill follows the original ladder, but climbs a little faster (rung i plays like rung 18*(i/18)^0.8 of the old ladder)
function skAt(x){const a=Math.floor(x),b=Math.min(RIVALS1.length-1,a+1),f=x-a,A=RIVALS1[a].sk,B=RIVALS1[b].sk,o={};for(const k in A)o[k]=A[k]+(B[k]-A[k])*f;return o;}
const RIVALS2=CH2_ORDER.slice(1).map((cid,i)=>{const c=CHARS.find(x=>x.id===cid),s=CH2_ST[cid],n=CH2_ORDER.length-2,o=skAt(n*Math.pow(i/n,.8));
  return{id:'c2_'+cid,cid,name:c.name,short:c.name,nick:c.nick,blurb:c.blurb,course:CH2_COURSE[cid],reward:RIVALS1[i].reward,look:null,
    sk:{pow:o.pow*(1+.02*d10(s.pow)),acc:o.acc*(1-.06*d10(s.ctl)),putt:clamp(o.putt+.03*d10(s.putt),.2,.99),miss:o.miss*clamp(1-.12*d10(s.imp),.5,1.5),wind:o.wind,perr:o.perr*(1-.05*d10(s.ctl))}};});
let RIVALS=RIVALS1;
const CAREER2_KEY='golf-challenge2-v1';
function blankCareer2(){return{v:1,pts:0,gear:{drv:0,irn:0,wdg:0,ptr:0,ball:0},beaten:[],record:{},match:null,char:CH2_START,unlocked:[CH2_START]};}
let CAR1=CAR,CAR2=blankCareer2(),CV=1;
try{const d=JSON.parse(localStorage.getItem(CAREER2_KEY)||'null');if(d&&d.v===1)CAR2={...blankCareer2(),...d,gear:{...blankCareer2().gear,...d.gear}};}catch(e){}
const carOf=v=>v===CV?CAR:v===2?CAR2:CAR1;
function careerUse(v){if(v===CV)return;if(CV===1)CAR1=CAR;else CAR2=CAR;CV=v;CAR=v===2?CAR2:CAR1;RIVALS=v===2?RIVALS2:RIVALS1;}
const ch2Char=id=>CHARS.find(x=>x.id===id)||CHARS.find(x=>x.id===CH2_START);
// your V2 golfer (1-10 stats and their trait) plus the equipment you have bought
function careerMods2(){const c=ch2Char(CAR.char),s=CH2_ST[c.id]||CH2_ST[CH2_START];
  const B=charMods({st:s,fx:c.fx}),g=CAR.gear;return{...B,
    carry:cl=>B.carry(cl)+(cl.kind==='wood'?.02*g.drv:0)+.01*g.ball,
    err:cl=>Math.max(.45,B.err(cl)-((cl.kind==='iron'||cl.kind==='hybrid')?.05*g.irn:0)),
    win:cl=>B.win(cl)+(cl.putter?.1*g.ptr:(cl.kind==='wedge'&&G.stype!=='full'?.07*g.wdg:0)),
    spin:B.spin+.1*g.wdg,wind:B.wind*(1-.04*g.ball),putt:Math.max(.5,B.putt-.06*g.ptr)};}
function myLook(){if(CV===2)return null;const o=OUTFITS.find(x=>x.id===CAR.look)||OUTFITS[0];return{...LOOK_ME,top:o.top,hat:o.hat};}
function careerMods(){return CV===2?careerMods2():careerMods1();}
function careerMods1(){const s=CAR.st,g=CAR.gear;return{
  carry:c=>1+.018*s.pow+(c.kind==='wood'?.02*g.drv:0)+.01*g.ball,
  err:c=>Math.max(.45,1-.06*s.ctl-((c.kind==='iron'||c.kind==='hybrid')?.05*g.irn:0)),
  win:c=>c.putter?1+.08*s.putt+.1*g.ptr:1+.05*s.imp+(c.kind==='wedge'&&G.stype!=='full'?.07*g.wdg:0),
  curve:1+.08*s.spin,spin:1+.12*s.spin+.1*g.wdg,wind:1-.04*g.ball,putt:Math.max(.5,1-.07*s.putt-.06*g.ptr)};}
function rivalMods(r){const k=r.sk.pow;return{carry:()=>k,err:()=>1,win:()=>1,curve:1,spin:1,wind:1,putt:1};}

/* ---------- v103 custom bag: every slot has sidegrade models (a plus and a minus of equal worth, checked in simulated rounds).
   It applies to your own shots in every mode (in the Challenge your tier upgrades stack on top); rivals play their own gear. ---------- */
const BAG_SLOTS=[
 {k:'drv',name:'Driver & woods',m:[
   {id:'std',name:'Standard',g:[],c:[]},
   {id:'bomb',name:'Bomber',g:['+5% carry with woods','Rolls out a little more'],c:['Wood misses stray 10% wider']},
   {id:'max',name:'Max forgiveness',g:['Wood misses stray 15% less','Mistimed woods lose half the distance'],c:['−3.5% carry with woods']},
   {id:'shape',name:'Shaper',g:['Draws and fades 40% stronger with woods'],c:['Perfect window 10% smaller with woods']}]},
 {k:'irn',name:'Irons & hybrid',m:[
   {id:'std',name:'Standard',g:[],c:[]},
   {id:'cav',name:'Cavity back',g:['+3% carry','Mistimed shots lose 30% less'],c:['Rolls out 25% more on greens','Shaping 20% weaker']},
   {id:'forged',name:'Forged',g:['Checks up 15% more','Shaping 15% stronger'],c:['−2% carry']},
   {id:'blade',name:'Blades',g:['Perfect strikes bite twice as hard','Shaping 35% stronger'],c:['Perfect window 8% smaller','Mistimed shots lose 20% more']}]},
 {k:'wdg',name:'Wedges',m:[
   {id:'std',name:'Standard',g:[],c:[]},
   {id:'high',name:'High bounce',g:['Bunker shot window 15% bigger','Rough and fescue hurt chips and pitches 40% less'],c:['Flop and spinner windows 20% smaller']},
   {id:'low',name:'Low bounce',g:['Flop and spinner windows 20% bigger','A little more backspin'],c:['Bunker window 15% smaller','Rough and fescue hurt chips and pitches 40% more']},
   {id:'milled',name:'Milled spin',g:['Chips and pitches check 30% more','Backspin 30% stronger'],c:['Mishit chips and pitches go 20% further wrong']}]},
 {k:'ptr',name:'Putter',m:[
   {id:'std',name:'Standard',g:[],c:[]},
   {id:'blade',name:'Blade',g:['Finer putting meter: the same tap misses the pace 15% less'],c:['Line wanders 15% more']},
   {id:'mallet',name:'Mallet',g:['Line wanders 10% less'],c:['Coarser putting meter: pace misses 25% more']},
   {id:'lock',name:'Arm-lock',g:['Inside 12 ft the line wanders 20% less'],c:['Beyond 30 ft: line 15% wider, pace misses 40% more']}]},
 {k:'ball',name:'Ball',m:[
   {id:'std',name:'Standard',g:[],c:[]},
   {id:'dist',name:'Distance',g:['+2% carry on every club'],c:['Chips and pitches release 25% more','Less backspin, wind moves it 5% more']},
   {id:'ure',name:'Tour urethane',g:['Approaches roll 10% less, short game checks 15% more','More backspin'],c:['−2% carry on every club']},
   {id:'low',name:'Low spin',g:['Wind moves it 20% less'],c:['Shaping 30% weaker','Approaches roll out 20% more, chips 10% more']}]}];
const BAG_KEY='golf-bag';
let BAG=(()=>{const o={drv:'std',irn:'std',wdg:'std',ptr:'std',ball:'std',set:{}};try{const d=JSON.parse(localStorage.getItem(BAG_KEY)||'null');if(d){for(const k in o)if(k!=='set'&&BAG_SLOTS.find(x=>x.k===k).m.some(m=>m.id===d[k]))o[k]=d[k];
  if(d.set)for(const k in d.set)if((CLUB_ALT[k]||[]).some(a=>a.id===d.set[k]))o.set[k]=d.set[k];}}catch(e){}return o;})(),BAGV=1;
const bagSave=()=>{BAGV++;try{localStorage.setItem(BAG_KEY,JSON.stringify(BAG));}catch(e){}};
function bagSet(k,id){BAG[k]=id;bagSave();}
function bagSwap(slot,id){if(id&&id!==slot)BAG.set[slot]=id;else delete BAG.set[slot];bagSave();clubsFor(G.aiTurn&&!G.simBag);}
// your clubs on your turns, the stock set on a rival's
(()=>{let v=!!G.aiTurn;delete G.aiTurn;Object.defineProperty(G,'aiTurn',{get:()=>v,set:x=>{x=!!x;if(x!==v){v=x;if(!G.simBag)clubsFor(x);}},enumerable:true,configurable:true});clubsFor(v);})();
/* the bag panel on the golfers screen: models per slot, club swaps, and the stock yardages and gaps for the golfer you're looking at */
function bagYardages(ch){const m=bagWrap(charMods(ch),BAG),B=bagFx(BAG),set=clubSet(BAG.set),st0=G.stype;G.stype='full';
  try{return set.filter(c=>!c.putter).map(c=>{const ca=c.carry*m.carry(c);return{c,carry:ca,total:ca+ca*c.roll*SURF.fairway*B.roll(c,'full')};});}finally{G.stype=st0;}}
function renderBag(){const el=$('chBag');if(!el)return;const ch=CHARS.find(x=>x.id===chSel)||curChar();
  let h='<h2 class="bagh">Your bag</h2><div class="bagnote">Every model trades a strength for a weakness. Your bag counts in every mode; rivals carry their own.</div>';
  for(const S of BAG_SLOTS){const cur=S.m.find(m=>m.id===BAG[S.k])||S.m[0];
    h+='<div class="bagslot"><div class="bagk">'+S.name+'</div><div class="bagseg">'+S.m.map(m=>'<button data-bm="'+S.k+':'+m.id+'"'+(m.id===cur.id?' class="on"':'')+'>'+m.name+'</button>').join('')+'</div>';
    h+='<div class="bagfx">'+(cur.id==='std'?'<span class="z">Balanced: no strengths, no weaknesses.</span>':cur.g.map(t=>'<span class="p">+ '+t+'</span>').join('')+cur.c.map(t=>'<span class="m">\u2212 '+t+'</span>').join(''))+'</div></div>';}
  const Y=bagYardages(ch);
  h+='<h2 class="bagh">Clubs &amp; yardages</h2><div class="bagnote">'+ch.name+' with this bag: carry and total on the fairway, full swing, no wind. Slots marked \u21c4 can take a different club.</div>';
  h+='<table class="yd"><thead><tr><th>Club</th><th>Loft</th><th>Carry</th><th>Total</th><th>Gap</th></tr></thead><tbody>';
  const yl=o=>o.id==='1W'?'Driver':o.id==='MD'?'Mini driver':o.id==='DI'?'Driving iron':o.lbl||o.id;
  Y.forEach((y,i)=>{const c=y.c,slot=c.slot||c.id,alts=CLUB_ALT[slot],nx=Y[i+1],gap=nx?Math.round(y.carry-nx.carry):null,gc=gap==null?'':gap>=20?' class="gw"':gap<=6?' class="gt"':'';
    const nm=alts?'<select data-sw="'+slot+'" aria-label="'+c.name+' slot">'+[CLUBS_STD.find(x=>x.id===slot)].concat(alts).map(o=>'<option value="'+o.id+'"'+(o.id===c.id?' selected':'')+'>\u21c4 '+yl(o)+'</option>').join('')+'</select>':'<span>'+yl(c)+'</span>';
    h+='<tr><td>'+nm+'</td><td>'+c.deg+'\u00b0</td><td><b>'+Math.round(y.carry)+'</b></td><td>'+Math.round(y.total)+'</td><td'+gc+'>'+(gap==null?'':gap)+'</td></tr>';});
  h+='</tbody></table><div class="bagnote">Gaps of 20+ yards are in red, 6 or less in amber.</div>';
  el.innerHTML=h;
  el.querySelectorAll('[data-bm]').forEach(b=>b.onclick=()=>{const[k,id]=b.dataset.bm.split(':');bagSet(k,id);sfx.tick();renderBag();});
  el.querySelectorAll('select[data-sw]').forEach(sl=>sl.onchange=()=>{bagSwap(sl.dataset.sw,sl.value);sfx.tick();renderBag();});}
const BAG_SHORTN={chip:1,pitch:1,spin:1,flop:1};
// what each model does: multipliers (and carry additions) by club and shot
function bagFx(b){const W=c=>c&&c.kind==='wood',I=c=>c&&(c.kind==='iron'||c.kind==='hybrid'),Wd=c=>c&&c.kind==='wedge',full=()=>!isShort(),st=()=>G.stype;
  const F={
  carry:c=>{if(!c||c.putter)return 0;let a=0;if(W(c))a+=b.drv==='bomb'?.05:b.drv==='max'?-.035:0;if(I(c))a+=b.irn==='cav'?.03:b.irn==='forged'?-.02:0;a+=b.ball==='dist'?.02:b.ball==='ure'?-.02:0;return a;},
  err:c=>W(c)?(b.drv==='bomb'?1.1:b.drv==='max'?.85:1):1,
  win:c=>{if(!c||c.putter)return 1;let m=1;if(W(c)&&full()&&b.drv==='shape')m*=.9;if(I(c)&&full()&&b.irn==='blade')m*=.92;
    if(Wd(c)){const t=st();if(BUNKER_T[t])m*=b.wdg==='high'?1.15:b.wdg==='low'?.85:1;if(t==='flop'||t==='spin')m*=b.wdg==='high'?.8:b.wdg==='low'?1.2:1;}return m;},
  curve:c=>{let m=1;if(W(c)&&b.drv==='shape')m*=1.4;if(I(c))m*=b.irn==='cav'?.8:b.irn==='forged'?1.15:b.irn==='blade'?1.35:1;if(b.ball==='low')m*=.7;return m;},
  spin:c=>{let m=1;if(Wd(c))m*=b.wdg==='milled'?1.3:b.wdg==='low'?1.1:1;m*=b.ball==='ure'?1.15:b.ball==='dist'?.85:1;return m;},
  wind:b.ball==='low'?.8:b.ball==='dist'?1.05:1,
  mis:c=>Wd(c)&&b.wdg==='milled'?1.2:1,
  misFull:c=>W(c)&&b.drv==='max'?.5:I(c)?(b.irn==='cav'?.7:b.irn==='blade'?1.2:1):1,
  bite:c=>I(c)&&b.irn==='blade'?2:1,
  roll:(c,t)=>{let m=1;const sh=!!BAG_SHORTN[t];
    if(!sh){if(W(c)&&b.drv==='bomb')m*=1.1;if(I(c))m*=b.irn==='cav'?1.25:b.irn==='forged'?.85:1;m*=b.ball==='ure'?.9:b.ball==='low'?1.2:1;}
    else{if(Wd(c)&&b.wdg==='milled')m*=.7;m*=b.ball==='dist'?1.25:b.ball==='ure'?.85:b.ball==='low'?1.1:1;}return m;},
  sgLie:c=>Wd(c)?(b.wdg==='high'?.6:b.wdg==='low'?1.4:1):1,
  putt:d=>b.ptr==='blade'?1.15:b.ptr==='mallet'?.9:b.ptr==='lock'?(d<4?.8:d>10?1.15:1):1,
  puttD:d=>1,puttM:d=>b.ptr==='blade'?.85:b.ptr==='mallet'?1.25:b.ptr==='lock'&&d>10?1.4:1};
  return F;}
function bagWrap(m,b){const B=bagFx(b||BAG),cc=()=>curClub(),pd=()=>G.hole?pinDist():0;
  return{...m,carry:c=>m.carry(c)+B.carry(c),err:c=>m.err(c)*B.err(c),win:c=>m.win(c)*B.win(c),
    get curve(){return m.curve*B.curve(cc());},get spin(){return m.spin*B.spin(cc());},wind:m.wind*B.wind,
    get putt(){return m.putt*B.putt(pd());},get puttD(){return (m.puttD??1)*B.puttD(pd());},get puttM(){return B.puttM(pd());},
    get mis(){return(m.mis??1)*B.mis(cc());},get misFull(){return(m.misFull??1)*B.misFull(cc());},perf:m.perf,
    get bite(){return B.bite(cc());},roll:(c,t)=>B.roll(c,t),get sgLie(){return B.sgLie(cc());}};}
const BAGC=new WeakMap();
const cmod=()=>{const m=G.cm||curCharMods();if(G.aiTurn&&!G.simBag)return m;const b=G.simBag||BAG,v=G.simBag?'s'+JSON.stringify(G.simBag):BAGV;let e=BAGC.get(m);if(!e||e.v!==v){e={v,w:bagWrap(m,b)};BAGC.set(m,e);}return e.w;};
const clubCarry=c=>c.carry*cmod().carry(c);

