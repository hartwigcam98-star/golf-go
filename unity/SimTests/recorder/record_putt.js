// (re-run: node unity/SimTests/recorder/record_putt.js . /tmp/putt, then copy putt_cases.json to SimTests)
/* Stage 4 recorder: putts on Troy Burne 1's green and from its fringe, by a neutral golfer in the web game. For every spot it writes
   down the meter's size (calcPuttMax), what the putt needs (puttNeed), where the flag sits (puttTargetPower), whether the flag
   is out, then the stroke (the ball's starting velocity) and the roll to rest with a seed.
   usage: node record_putt.js <site> <outDir>                                                                              */
const fs = require('fs'), path = require('path'), boot = require('./boot.js');
const SITE = process.argv[2], OUT = process.argv[3];
const GOLFER = process.env.GOLFER || '';
(async () => {
  const g = await boot(SITE);
  await g.ev(`(()=>{Math.random=rng(99);G.mode='practice';G.pinSeed=424242;G.scores=[];setCourse('troy',false);startHole(0);$('introM').hidden=true;try{R3R.on=false;}catch(e){}
    prepareShot();
    const no=()=>{};for(const k of Object.keys(sfx))if(typeof sfx[k]==='function')sfx[k]=no;
    for(const n of ['toast','leafBurst','birdsFrom','splashDrops','tone','later','showShotStats','saveGame','shortPrep','r3React','queueDivot'])try{eval(n+'=no');}catch(e){}
    // the neutral golfer (as the stage 1 strike cases): every mod 1, no bag changes
    const one=()=>1;window.__ID={carry:one,err:one,win:one,curve:1,spin:1,wind:1,putt:1,mis:1,sgVar:1,puttD:1,misFull:1,perf:1.03};
    G.cm=__ID;BAGC.set(__ID,{v:BAGV,w:__ID});
    // GOLFER=<id>: that golfer's own game instead (charMods, the standard bag: the Unity game's golfers)
    if(${JSON.stringify(GOLFER)})G.cm=charMods(CHARS.find(c=>c.id===${JSON.stringify(GOLFER)}));return 'ok';})()`);
  const spots = JSON.parse(await g.ev(`(()=>{const p=G.hole.pin,o={green:[],fringe:[]};for(let r=.4;r<=32;r*=1.13)for(let k=0;k<12;k++){const a=k/12*TAU+r*1.7,x=p[0]+Math.cos(a)*r,y=p[1]+Math.sin(a)*r,L=lieAt(x,y);
      if(L==='green')o.green.push([+x.toFixed(3),+y.toFixed(3)]);else if((L==='fairway'||L==='cut'||L==='tee')&&r<14)o.fringe.push([+x.toFixed(3),+y.toFixed(3)]);}
    const pick=(v,n)=>{const s=[];for(let i=0;i<n&&v.length;i++)s.push(v[Math.floor(i*v.length/n)]);return s;};return JSON.stringify({green:pick(o.green,70),fringe:pick(o.fringe,24),n:[o.green.length,o.fringe.length]});})()`));
  console.log('spots', spots.n);
  const cases = []; let seed = 61000;
  for (const [bx, by] of [...spots.green, ...spots.fringe]) for (let k = 0; k < 3; k++)
    cases.push({ bx, by, scale: [1, .8, 1.25, 1.05, .92, 1.5][(cases.length) % 6], off: [0, .04, -.06, .02, -.02][(cases.length) % 5], e: [0, .006, -.012, .025, -.03, null, .015, -.004][(cases.length) % 8], seed: seed++, lseed: 800000 + seed * 13 });
  const res = [];
  for (const c of cases) {
    const r = JSON.parse(await g.ev(`(()=>{try{
      const c=${JSON.stringify(c)};
      G.ball={x:c.bx,y:c.by};G.strokes=1;G.prev={...G.ball};G.lie=shotLie();G.imp={x:0,y:0};G.traj=0;G.pshot=false;G.spin=0;G.aiTurn=false;G.buried=false;G.stype='full';
      G.wind={a:(c.seed*0.37)%6.283,mph:(c.seed*7)%13};const p=G.hole.pin;G.fromLie=undefined;
      G.clubIdx=PUTTER;G.flagOut=G.lie==='green'&&pinDist()<=5;G.aim=angTo(c.bx,c.by,p[0],p[1])+c.off;G.puttMax=calcPuttMax();
      const q=puttNeed(),tp=puttTargetPower(),pw=Math.min(1,Math.max(.02,(tp===null?.1:tp)*c.scale));
      const pre={lie:G.lie,puttMax:G.puttMax,need:q.need,d:q.d,tp,flagOut:G.flagOut,win:perfectWin(),aim:G.aim,power:pw,clean:puttLineClean()};
      G.followT=0;G.state='acc';G.meter.power=pw;executeShot(pw,c.e,c.seed);
      if(!G.roll)return JSON.stringify({err:'no roll',state:G.state});const v0=[G.roll.vx,G.roll.vy];
      let draws=0;const R=rng(c.lseed);Math.random=()=>{draws++;return R();};
      let out=null;const P0=penalty,H0=holed,S0=stopBall;
      penalty=(k,soft)=>{out=out||{d:draws,kind:k,x:G.ball.x,y:G.ball.y};P0(k,soft);};
      holed=(k)=>{out=out||{d:draws,kind:'holed',how:k||'',x:G.ball.x,y:G.ball.y};H0(k);};
      stopBall=()=>{const pr=pathReliefSpot();out=out||{d:draws,kind:'rest',x:G.ball.x,y:G.ball.y,lie:lieAt(G.ball.x,G.ball.y),plie:physLie(G.ball.x,G.ball.y),relief:pr?[pr.x,pr.y]:null};const s0=G.strokes;S0();if(out.kind==='rest'&&G.strokes>s0)out.gimme=true;};
      let n=0;const dt=1/60;
      try{while(n<60*40){n++;
        if(G.state==='flight'&&G.flight)stepFlight(dt);
        if(G.state==='bounce'&&G.hop)stepHop(dt);
        if(G.state==='roll'&&G.roll)stepRoll(dt);
        if(!['flight','bounce','roll'].includes(G.state))break;}}
      finally{penalty=P0;holed=H0;stopBall=S0;}
      return JSON.stringify({...c,pre,v0,lastPerf:G.lastPerf,missBy:G.missBy,frames:n,out});
    }catch(e){return JSON.stringify({err:String(e&&e.stack||e)});}})()`));
    if (r.err) console.log('ERR', r.err.slice(0, 500));
    else res.push(r);
  }
  fs.mkdirSync(OUT, { recursive: true });
  if (GOLFER) for (const r of res) r.golfer = GOLFER;
  fs.writeFileSync(path.join(OUT, 'putt_cases' + (GOLFER ? '_' + GOLFER : '') + '.json'), JSON.stringify(res));
  const out = {}; for (const r of res) { const k = r.pre.lie + ':' + (r.out ? r.out.kind + (r.out.how ? '/' + r.out.how : '') + (r.out.gimme ? '/gimme' : '') : 'none'); out[k] = (out[k] || 0) + 1; }
  console.log(res.length, 'cases', JSON.stringify(out), 'flag out', res.filter(r => r.pre.flagOut).length, 'errors', g.errs.slice(0, 3));
  await g.close();
})();
