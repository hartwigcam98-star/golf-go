/* ---------- career: 18-hole match play against a ladder of rivals, points, skills, gear and outfits ---------- */
const LOOK_ME={top:'#56698a',pants:'#b7b6b1',skin:'#e6b48e',hat:'#b3223a',hatType:'beanie',beard:'#4a3325',boot:'#2b2521'};
const OUTFITS=[
 {id:'classic',name:'Classic',top:'#56698a',hat:'#b3223a',cost:0},
 {id:'navy',name:'Navy',top:'#8a9098',hat:'#1f2e4a',cost:150},
 {id:'forest',name:'Forest',top:'#3f6146',hat:'#e07a2e',cost:150},
 {id:'midnight',name:'Midnight',top:'#2a2d33',hat:'#e9e6df',cost:150},
 {id:'sunday',name:'Sunday red',top:'#a8262f',hat:'#1c1c1e',cost:250},
 {id:'sand',name:'Links',top:'#c7b68f',hat:'#3b5a6e',cost:250}];
// fictional rivals, two per course; sk: pow = carry multiplier, acc = timing spread (smaller is better), putt 0-1, miss = mishit chance, wind = how well they allow for it, perr = power spread
const RIVALS1=[
 {id:'gus',name:'Dave Kowalski',nick:'Dave from Accounting',course:'troy',reward:300,blurb:'Takes Friday afternoons off for golf and keeps score very generously. Talks through your backswing.',
  sk:{pow:0.86,acc:0.052,putt:0.35,miss:0.045,wind:0.3,perr:0.09},look:{top:'#c9a13b',pants:'#4b4f58',skin:'#e8b996',hat:'#2f3b52',hatType:'cap',beard:null,boot:'#e9e6df'}},
 {id:'kelly',name:'Kelly Brandt',nick:'The Club Pro',course:'stoneridge',reward:380,blurb:'Gives lessons all week and finally gets to play. Textbook swing, shaky putter.',
  sk:{pow:0.9,acc:0.045,putt:0.45,miss:0.035,wind:0.45,perr:0.08},look:{top:'#e7eef2',pants:'#2e3a4b',skin:'#f0c7a6',hat:'#d24b6a',hatType:'visor',hair:'#6b4a2e',beard:null,boot:'#f4f4f4'}},
 {id:'hank',name:'Tyler Hanson',nick:'The College Kid',course:'caledonia',reward:460,blurb:'Freshman on scholarship. Bombs it past you, then goes looking for it in the fescue.',
  sk:{pow:1.0,acc:0.046,putt:0.45,miss:0.04,wind:0.5,perr:0.08},look:{top:'#2f5d3a',pants:'#c9c2b0',skin:'#d9a07c',hat:'#e2e2de',hatType:'cap',beard:null,boot:'#3a3029'}},
 {id:'priya',name:'Priya Nair',nick:'The Local Legend',course:'trueblue',reward:540,blurb:'Seven-time club champion. Not long, but she has not missed a fairway since 2019.',
  sk:{pow:0.92,acc:0.036,putt:0.6,miss:0.03,wind:0.65,perr:0.065},look:{top:'#5b3f8c',pants:'#ecebe6',skin:'#b98260',hat:'#ecebe6',hatType:'visor',hair:'#1c1614',beard:null,boot:'#ffffff'}},
 {id:'beau',name:'Vance Marlowe',nick:'The Machine',course:'rossbridge',reward:620,blurb:'Four majors and not one wasted swing. At his peak he hit 72 fairways in a row.',
  sk:{pow:0.98,acc:0.033,putt:0.62,miss:0.025,wind:0.7,perr:0.06},look:{top:'#1f3558',pants:'#e6e2d8',skin:'#efc4a2',hat:'#f4f4f2',hatType:'visor',hair:'#d8b46a',beard:null,boot:'#f4f4f4'}},
 {id:'marisol',name:'Sol Whitaker',nick:'The Iron Duke',course:'legislator',reward:700,blurb:'Legend of the long iron. Won the Open by nine and carried a 1-iron until the day he retired.',
  sk:{pow:0.97,acc:0.029,putt:0.72,miss:0.02,wind:0.75,perr:0.055},look:{top:'#7a2632',pants:'#d9d0bd',skin:'#e2ae88',hat:'#6b5a45',hatType:'flat',beard:null,boot:'#3a2a20'}},
 {id:'theo',name:'Augustus Crane',nick:'The Golden Heron',course:'judge',reward:800,blurb:'Six majors in the persimmon era. Tall, quiet, and still the smoothest swing anyone has seen.',
  sk:{pow:1.03,acc:0.026,putt:0.78,miss:0.015,wind:0.8,perr:0.05},look:{top:'#e0b43a',pants:'#23272e',skin:'#e8b996',hat:'#f2efe6',hatType:'cap',beard:null,boot:'#f2efe6'}},
 {id:'rex',name:'Old Tom Ashby',short:'Old Tom',nick:'The Old Master',course:'senator',reward:1000,blurb:'Twelve majors, the course record at True Blue, and legend says he has never three-putted. Beat him and the island is yours.',
  sk:{pow:1.06,acc:0.022,putt:0.85,miss:0.01,wind:0.9,perr:0.045},look:{top:'#3f5a45',pants:'#d8d2c2',skin:'#e0a98a',hat:'#8a8a86',hatType:'flat',beard:'#d9d4ca',boot:'#3a2a20'}},
 {id:'wren',name:'Wren Castillo',nick:'The Wedge Wizard',course:'sedge',reward:1100,blurb:'Never takes more than a 7-iron off the tee on Sedge Valley and still beats you by four. Lives inside a hundred yards.',
  sk:{pow:0.95,acc:0.02,putt:0.88,miss:0.009,wind:0.9,perr:0.043},look:{top:'#2f6f6a',pants:'#e8e2d4',skin:'#c98e6a',hat:'#f1ede4',hatType:'visor',hair:'#2a1d16',beard:null,boot:'#f4f4f4'}},
 {id:'baron',name:'Dutch Halvorsen',short:'Dutch',nick:'The Sand Baron',course:'sandvalley',reward:1200,blurb:'Grew up raking the barrens before there was a golf course. Treats the waste areas like fairways and holes out from the sand for fun.',
  sk:{pow:1.07,acc:0.02,putt:0.88,miss:0.008,wind:0.92,perr:0.042},look:{top:'#b8743a',pants:'#3c3a36',skin:'#e8b996',hat:'#5a4a3a',hatType:'flat',beard:'#b08a5a',boot:'#3a2a20'}},
 {id:'bjorn',name:'Bjorn Lindqvist',short:'Bjorn',nick:'The Mammoth',course:'mammoth',reward:1350,blurb:'Six foot six with 340-yard carries and, somehow, the softest hands around the green. Drives the 6th for breakfast.',
  sk:{pow:1.1,acc:0.019,putt:0.9,miss:0.007,wind:0.94,perr:0.04},look:{top:'#1d2a3a',pants:'#c9c2b0',skin:'#f0c7a6',hat:'#c23b2e',hatType:'cap',hair:'#e0c27a',beard:'#d8b46a',boot:'#ffffff'}},
 {id:'vale',name:'Eleanor Vale',short:'Eleanor',nick:'The Architect',course:'lido',reward:1500,blurb:'Studied every hole of the lost Lido from century-old drawings. She knows where every ball will feed before you hit it. The best player south of the Iron Range.',
  sk:{pow:1.08,acc:0.017,putt:0.93,miss:0.005,wind:0.97,perr:0.037},look:{top:'#e7e1d2',pants:'#2b2f38',skin:'#e2ae88',hat:'#2b2f38',hatType:'visor',hair:'#8a5a3a',beard:null,boot:'#2b2f38'}},
 {id:'moose',name:'Gunnar Lindahl',short:'Gunnar',nick:'The Lumberjack',course:'legend',reward:1650,blurb:'Splits firewood all winter and splits fairways all summer. Never met a dogleg he would not cut over the pines.',
  sk:{pow:1.12,acc:0.016,putt:0.93,miss:0.005,wind:0.97,perr:0.036},look:{top:'#a3272c',pants:'#3a3f47',skin:'#efc4a2',hat:'#2b2f38',hatType:'cap',hair:'#c9a46a',beard:'#b08a5a',boot:'#3a2a20'}},
 {id:'ore',name:'Mae Kowalczyk',short:'Mae',nick:'The Iron Lady',course:'quarry',reward:1800,blurb:'Grew up in Biwabik and learned the game on the mine dumps before The Quarry was built over them. Hits every iron like it owes her money.',
  sk:{pow:1.08,acc:0.014,putt:0.95,miss:0.004,wind:0.98,perr:0.034},look:{top:'#3b5a7a',pants:'#e6e2d8',skin:'#e8b996',hat:'#e6e2d8',hatType:'visor',hair:'#5a3a26',beard:null,boot:'#ffffff'}},
 {id:'pinerat',name:'Wade Tillman',short:'Wade',nick:'The Pine Rat',course:'crls',reward:1850,blurb:'Grew up two miles down the road from Cambrian Ridge. Spends half the round in the pine straw under the loblollies and still walks off with birdie.',
  sk:{pow:1.11,acc:0.0135,putt:0.955,miss:0.004,wind:0.985,perr:0.0335},look:{top:'#6b7a3a',pants:'#c9c2b0',skin:'#c98e6a',hat:'#3a3f2a',hatType:'cap',beard:'#4a3426',boot:'#3a2a20'}},
 {id:'canyon',name:'Ruby Calloway',short:'Ruby',nick:'The Canyon Queen',course:'crsc',reward:1950,blurb:'Holds the women\u2019s record on Sherling/Canyon and has never laid up on the 636-yard 8th. Reads those huge Trail greens like the morning paper.',
  sk:{pow:1.09,acc:0.0125,putt:0.965,miss:0.0035,wind:0.99,perr:0.033},look:{top:'#8c2f4a',pants:'#ecebe6',skin:'#9a6648',hat:'#ecebe6',hatType:'visor',hair:'#1c1614',beard:null,boot:'#ffffff'}},
 {id:'oaks',name:'Delia Ashworth',short:'Delia',nick:'The Live Oak',course:'heritage',reward:1960,blurb:'Walks the oak avenue at The Heritage Club every morning before the gates open. Unhurried, unbothered, and dead straight between the old rice-field marshes.',
  sk:{pow:1.08,acc:0.0123,putt:0.967,miss:0.0034,wind:0.992,perr:0.0328},look:{top:'#3f6b4a',pants:'#ecebe6',skin:'#e8b996',hat:'#ecebe6',hatType:'visor',hair:'#b08a5a',beard:null,boot:'#ffffff'}},
 {id:'marsh',name:'Josiah Pruitt',short:'Josiah',nick:'The Marsh Hen',course:'pawplant',reward:1980,blurb:'Shrimps the creeks behind Pawleys Plantation in the off-season and knows every tide over the marsh. Fires at the 13th’s island green like there’s no water at all.',
  sk:{pow:1.12,acc:0.0122,putt:0.968,miss:0.0032,wind:0.995,perr:0.0325},look:{top:'#c9b98a',pants:'#3c4a5a',skin:'#b98260',hat:'#2e4a5a',hatType:'cap',hair:'#2a1d16',beard:'#2a1d16',boot:'#3a2a20'}},
 {id:'loon',name:'Elias Northwind',short:'Elias',nick:'The Last Legend',course:'wilderness',reward:2000,blurb:'Seven majors, one quiet cabin on Lake Vermilion, and no interest in your excuses. Beat him at the Wilderness and there is no one left.',
  sk:{pow:1.1,acc:0.012,putt:0.97,miss:0.003,wind:1.0,perr:0.032},look:{top:'#2f4a3a',pants:'#d8d2c2',skin:'#e0a98a',hat:'#6b5a45',hatType:'flat',hair:'#d9d4ca',beard:'#d9d4ca',boot:'#3a2a20'}}];
const RV=id=>RIVALS1.find(r=>r.id===id)||(typeof RIVALS2!=='undefined'?RIVALS2.find(r=>r.id===id):null);
const first=n=>n.split(' ')[0],rn=r=>r.short||first(r.name);
const SKILLS=[
 {k:'pow',name:'Power',d:'+1.8% carry on every full shot'},
 {k:'ctl',name:'Control',d:'Mistimed shots stray 6% less'},
 {k:'imp',name:'Impact',d:'Nice / perfect window 5% wider'},
 {k:'spin',name:'Spin',d:'More backspin bite and more shape from the strike point'},
 {k:'putt',name:'Putting',d:'Wider putting window and straighter misses'}];
const SKILL_COST=[150,300,500,750,1000];
const GEAR=[
 {k:'drv',name:'Driver & woods',tiers:['Standard','Pro','Tour','Tour X'],d:'+2% carry with woods per tier'},
 {k:'irn',name:'Irons & hybrid',tiers:['Standard','Forged','Tour forged','Blades'],d:'Irons stray 5% less per tier'},
 {k:'wdg',name:'Wedges',tiers:['Standard','Milled','Tour grind','Raw tour'],d:'+7% window on pitches and chips, extra check'},
 {k:'ptr',name:'Putter',tiers:['Standard','Mallet','Tour blade','Milled tour'],d:'+10% putting window per tier'},
 {k:'ball',name:'Ball',tiers:['Distance','Tour soft','Tour urethane','Tour X'],d:'+1% carry and less wind drift per tier'}];
const GEAR_COST=[400,900,1600];
