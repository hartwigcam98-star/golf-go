// (re-run: node unity/SimTests/recorder/record_land.js . /tmp/land, then copy troy1_sim.json to Assets/Resources and land_cases.json to SimTests)
/* Stage 2 recorder: shots on Troy Burne 1, struck in the web game, then flown, bounced and rolled to rest with a fixed seed
   (dt 1/60, the loop's order: flight, hops, roll in one frame). Writes
     land_cases.json   each case: the flight as struck (every field), wind, the landing seed, then what happened (rest spot,
                       outcome, strokes, frames, a trace every 15 frames, the dice drawn)
     troy1_sim.json    what the landing needs from the hole: trees (crown profiles), cart paths, the lie grid with the ground
                       under the trees (dirt), and the surface tables as this course sets them
   Cosmetic calls (sounds, toasts, leaves, birds, splashes) are stubbed: only the dice the steps themselves draw count.
   usage: node record_land.js <site> <outDir>                                                                         */
const fs = require('fs'), path = require('path'), boot = require('./boot.js');
const SITE = process.argv[2], OUT = process.argv[3];
(async () => {
  const g = await boot(SITE);
  const setup = await g.ev(`(()=>{Math.random=rng(99);G.mode='practice';G.pinSeed=424242;G.scores=[];setCourse('troy',false);startHole(0);$('introM').hidden=true;try{R3R.on=false;}catch(e){}
    prepareShot();
    // cosmetic: no sound, toasts, leaves, birds, splashes, timers
    const no=()=>{},bad=[];for(const k of Object.keys(sfx))if(typeof sfx[k]==='function')sfx[k]=no;
    for(const n of ['toast','leafBurst','birdsFrom','splashDrops','tone','later','showShotStats','saveGame','shortPrep','pathClack','r3React'])try{eval(n+'=no');}catch(e){bad.push(n);}
    return JSON.stringify({bad,pin:G.hole.pin,tee:G.hole.tee,aim:G.aim,lie:G.lie,par:G.hole.par});})()`);
  console.log('hole', setup);
  // the sim export
  const sim = await g.ev(`(()=>{const h=G.hole,L=h.lg,names=['ob',...LIE_CODES.filter((v,i,a)=>a.indexOf(v)===i)];if(!names.includes('dirt'))names.push('dirt');if(!names.includes('path'))names.push('path');
    const lie=new Array(L.nx*L.ny);for(let j=0;j<L.ny;j++)for(let i=0;i<L.nx;i++){const n=lieAt(L.x0+i,L.y0+j);lie[j*L.nx+i]=names.indexOf(n);}
    const cpArr=cp=>{if(!cp)return null;const r=[];const ks=Object.keys(cp.r).map(Number);const n=ks.length?Math.max(...ks)+1:0;for(let k=0;k<n;k++)r.push(cp.r[k]||0);return{B:cp.B,r};};
    const trees=h.trees.map(t=>({x:t.x,y:t.y,r:t.r,cr:t.cr||0,mh:t.mh||0,gh:t.gh,con:t.con?1:0,cactus:t.cactus?1:0,vs:t.vs||1,cp:cpArr(t.cp),cs:t.cs||null}));
    return JSON.stringify({lieNames:names,lg:{x0:L.x0,y0:L.y0,nx:L.nx,ny:L.ny,data:lie},trees,paths:h.paths||[],bkF:!!h.bkF,
      MU,HOP_E,SURF,MU_REST,MU_REST_FW,CUP,CAPV,GACC,GIMME_YD,PATH_HW,PATH_ON,bury:bkSand().bury,
      wide:(()=>{const g=h.hg,st=4,m=200,x0=g.x0-m,y0=g.y0-m,nx=Math.ceil(((g.nx-1)*g.st+2*m)/st)+1,ny=Math.ceil(((g.ny-1)*g.st+2*m)/st)+1,d=new Array(nx*ny);
        for(let j=0;j<ny;j++)for(let i=0;i<nx;i++)d[j*nx+i]=+hAt(x0+i*st,y0+j*st).toFixed(3);return{x0,y0,st,nx,ny,data:d};})(),
      chk:{hAt:[hAt(500,-100),hAt(300,-300)],grad:gradAt(300,-300)}});})()`);
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'troy1_sim.json'), sim);
  const S = JSON.parse(setup), pin = S.pin, tee = S.tee;
  // the cases: tee shots fanned across the hole, approaches from the fairway and rough at a spread of distances, wedges into the green
  const cases = [];
  let seed = 5000;
  const aimTo = (x, y, tx, ty) => Math.atan2(tx - x, -(ty - y));
  const add = (bx, by, club, aim, power, e, strokes) => cases.push({ bx, by, club, aim, power, e, strokes, seed: seed++, lseed: 900000 + seed * 7 });
  const teeClubs = ['1W', '3W', '5W', '4H', '5I'];
  for (let k = 0; k < 40; k++) add(tee[0], tee[1], teeClubs[k % 5], S.aim + (k % 9 - 4) * .06, [1, .95, .85, .7][k % 4], [0, .01, -.02, .04, null, -.05][k % 6], 0);
  // approach spots: along the line from the pin back, and off to the sides
  const ux = tee[0] - pin[0], uy = tee[1] - pin[1], ul = Math.hypot(ux, uy), nx = ux / ul, ny = uy / ul;
  const irons = [[175, '5I'], [160, '6I'], [150, '7I'], [138, '8I'], [125, '9I'], [112, 'PW'], [98, 'GW'], [85, 'SW'], [70, 'LW']];
  let k = 0;
  for (const [d, club] of irons) for (const side of [-18, 0, 14]) for (const pw of [1, .9]) {
    const bx = pin[0] + nx * d - ny * side, by = pin[1] + ny * d + nx * side;
    add(bx, by, club, aimTo(bx, by, pin[0], pin[1]) + ((k % 5) - 2) * .02, pw, [0, .015, -.01, .03, null][k % 5], 1); k++;
  }
  // aimed shots: at tree crowns and trunks, the cart paths, the water and the bunkers, each from a spot its club's carry away
  const T = JSON.parse(await g.ev(`(()=>{const h=G.hole,pts={tree:[],path:[],water:[],sand:[]};
    for(const t of h.trees)pts.tree.push([t.x,t.y]);
    for(const pl of h.paths||[])for(let i=0;i<pl.length;i+=3)pts.path.push(pl[i]);
    const L=h.lg;for(let j=0;j<L.ny;j+=3)for(let i=0;i<L.nx;i+=3){const x=L.x0+i,y=L.y0+j,n=lieAt(x,y);if(n==='water'||n==='sand')pts[n].push([x,y]);}
    const cl=CLUBS.filter(c=>!c.putter).map(c=>[c.id,clubCarry(c)]);return JSON.stringify({pts,cl});})()`));
  const pick = (a, n) => { const o = []; for (let i = 0; i < n && a.length; i++) o.push(a[Math.floor(i * a.length / n)]); return o; };
  const near = d => T.cl.reduce((b, c) => Math.abs(c[1] - d) < Math.abs(b[1] - d) ? c : b);
  for (const [kind, n] of [['tree', 40], ['path', 30], ['water', 16], ['sand', 16]]) {
    let i = 0;
    for (const [x, y] of pick(T.pts[kind], n)) {
      const D = [150, 120, 185, 95, 210][i % 5], tl = Math.hypot(tee[0] - x, tee[1] - y) || 1;
      let bx = x + (tee[0] - x) / tl * Math.min(D, tl), by = y + (tee[1] - y) / tl * Math.min(D, tl);
      const c = near(Math.min(D, tl)), off = kind === 'tree' ? ((i % 3) - 1) * 1.2 : 0;
      add(bx, by, c[0], aimTo(bx, by, x, y) + off / Math.max(30, Math.min(D, tl)), [1, .97, .92][i % 3], [0, .012, -.008, null][i % 4], 1); i++;
    }
  }
  { let i = 0; for (const [x, y] of pick(T.pts.tree, 30)) { const D = [45, 60, 75][i % 3], tl = Math.hypot(tee[0] - x, tee[1] - y) || 1, bx = x + (tee[0] - x) / tl * D, by = y + (tee[1] - y) / tl * D;
      add(bx, by, ['4H', '5I', '6I'][i % 3], aimTo(bx, by, x, y), [.55, .45, .6][i % 3], [0, .01, -.01][i % 3], 1); i++; } }
  // rolls: the ball already rolling, at the cup (centred and off-centre, a range of paces) and along the cart paths
  const rolls = [];
  for (let k = 0; k < 70; k++) {
    const d = 1 + (k % 7) * .8, a = k * 2.399, sx = pin[0] + Math.cos(a) * d, sy = pin[1] + Math.sin(a) * d, off = ((k % 9) - 4) / 4 * .07, sp = [.6, 1, 1.4, 1.9, 2.5, 3.2, 4.2, 1.2, 2.1][k % 9];
    const ux = (pin[0] - sx) / d, uy = (pin[1] - sy) / d; rolls.push({ roll: 1, bx: sx - uy * off, by: sy + ux * off, vx: ux * sp * (1 + d * .35), vy: uy * sp * (1 + d * .35), seed: 0, lseed: 700000 + k * 13, strokes: 1 });
  }
  { let k = 0; for (const [x, y] of pick(T.pts.path, 25)) { const a = k * 1.7; rolls.push({ roll: 1, bx: x, by: y, vx: Math.cos(a) * (2 + k % 5 * 2), vy: Math.sin(a) * (2 + k % 5 * 2), seed: 0, lseed: 710000 + k * 17, strokes: 1 }); k++; } }
  cases.push(...rolls);
  const res = [];
  for (const c of cases) {
    const r = JSON.parse(await g.ev(`(()=>{try{
      const c=${JSON.stringify(c)};
      G.ball={x:c.bx,y:c.by};G.lie=lieAt(c.bx,c.by);if(G.lie==='water'||G.lie==='ob')return JSON.stringify({skip:G.lie});G.strokes=c.strokes;G.clubIdx=CI(c.club);G.stype='full';G.aim=c.aim;G.flagOut=false;G.buried=false;
      G.wind={a:(c.seed*0.37)%6.283,mph:(c.seed*7)%13};G.followT=0;G.state='acc';G.meter.power=c.power;G.aiTurn=false;G.fromLie=undefined;
      let fl=null;
      if(c.roll){G.prev={x:c.bx,y:c.by};G.fromLie=G.lie;G.flight=null;G.hop=null;G.roll={vx:c.vx,vy:c.vy,t:0,lip:false};G.state='roll';G.bY=hAt(c.bx,c.by);}
      else{executeShot(c.power,c.e,c.seed);
      const f=G.flight;if(!f)return JSON.stringify({err:'no flight',state:G.state});
      fl={};for(const k of Object.keys(f)){const v=f[k];if(typeof v==='number'||typeof v==='boolean'||typeof v==='string')fl[k]=v;}fl.club=f.club.id;}
      const evs={};for(const k of ['tree','rustle','pin','lip','rim','land','splash'])sfx[k]=()=>{evs[k]=(evs[k]||0)+1;};
      const lie0=G.lie,prev={...G.prev};
      let draws=0;const R=rng(c.lseed);Math.random=()=>{draws++;return R();};
      let out=null;const P0=penalty,H0=holed,S0=stopBall,A0=typeof pathAsk==='function'?pathAsk:null;
      penalty=(k,soft)=>{out=out||{d:draws,kind:k,x:G.ball.x,y:G.ball.y};P0(k,soft);};
      holed=(k)=>{out=out||{d:draws,kind:'holed',how:k||'',x:G.ball.x,y:G.ball.y};H0(k);};
      stopBall=()=>{const b={x:G.ball.x,y:G.ball.y};const pr=pathReliefSpot();out=out||{d:draws,kind:'rest',x:b.x,y:b.y,lie:lieAt(b.x,b.y),plie:physLie(b.x,b.y),relief:pr?[pr.x,pr.y]:null};S0();
        if(out.kind==='rest'&&G.state==='holed')out.kind='holed';};
      const tr=[];let n=0;const dt=1/60;
      try{while(n<60*40){n++;
        if(G.state==='flight'&&G.flight)stepFlight(dt);
        if(G.state==='bounce'&&G.hop)stepHop(dt);
        if(G.state==='roll'&&G.roll)stepRoll(dt);
        if(n%15===0)tr.push([n,G.state,+G.ball.x.toFixed(4),+G.ball.y.toFixed(4),+G.bY.toFixed(4)]);
        if(!['flight','bounce','roll'].includes(G.state))break;}}
      finally{penalty=P0;holed=H0;stopBall=S0;}
      if(out&&out.kind==='rest'&&G.strokes>c.strokes+1)out.gimme=true;
      return JSON.stringify({...c,lie0,flight:fl,evs,wind:G.wind,frames:n,draws,state:G.state,strokes:G.strokes,out,trace:tr,end:[G.ball.x,G.ball.y],shotInfo:G.shotInfo,prev});
    }catch(e){return JSON.stringify({err:String(e&&e.stack||e)});}})()`));
    if (r.err) console.log('ERR', r.err.slice(0, 400));
    if (!r.skip) res.push(r);
  }
  fs.writeFileSync(path.join(OUT, 'land_cases.json'), JSON.stringify(res));
  const ev = {}; for (const r of res) for (const k in r.evs || {}) ev[k] = (ev[k] || 0) + 1; console.log('cases with each sound', JSON.stringify(ev));
  const tally = {}; for (const r of res) { const k = r.out ? r.out.kind + (r.out.how ? ':' + r.out.how : '') + (r.out.gimme ? ':gimme' : '') + (r.out.lie ? ':' + r.out.lie : '') + (r.out.plie === 'path' ? '(path)' : '') : 'none:' + r.state; tally[k] = (tally[k] || 0) + 1; }
  console.log(res.length, 'cases', JSON.stringify(tally), 'errors', g.errs.slice(0, 3));
  await g.close();
})();
