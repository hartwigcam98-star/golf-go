// (re-run: node unity/SimTests/recorder/record_round.js . /tmp/round, then copy round_cases.json to SimTests)
/* Stage 5 recorder: the round around the shots on all 18 holes of Troy Burne, neutral golfer. For each hole: the hole's wind
   (holeWind with a fixed round seed), then prepareShot from the tee and from spots all over the hole (lie, aim, club, shot type,
   meter sizes, flag out), then shots hit into the water and the relief options the game offers (waterCross, lateral, back on
   the line, replay, the best one).
   usage: node record_round.js <site> <outDir>                                                                              */
const fs = require('fs'), path = require('path'), boot = require('./boot.js');
const SITE = process.argv[2], OUT = process.argv[3];
(async () => {
  const g = await boot(SITE);
  await g.ev(`(()=>{Math.random=rng(99);G.mode='practice';G.pinSeed=424242;G.scores=[];setCourse('troy',false);startHole(0);$('introM').hidden=true;try{R3R.on=false;}catch(e){}
    prepareShot();
    const no=()=>{};for(const k of Object.keys(sfx))if(typeof sfx[k]==='function')sfx[k]=no;
    for(const n of ['toast','leafBurst','birdsFrom','splashDrops','tone','later','showShotStats','saveGame','shortPrep','r3React','queueDivot'])try{eval(n+'=no');}catch(e){}
    // the neutral golfer (as the stage 1 strike cases): every mod 1, no bag changes
    const one=()=>1;window.__ID={carry:one,err:one,win:one,curve:1,spin:1,wind:1,putt:1,mis:1,sgVar:1,puttD:1,misFull:1,perf:1.03};
    G.cm=__ID;BAGC.set(__ID,{v:BAGV,w:__ID});return 'ok';})()`);
  // each hole's pin as exported (hNN.json, practice mode) so the C# side plays to the same cup; and the hole's three pin spots
  const pinOf = hi => JSON.parse(fs.readFileSync(path.join(__dirname, '../../Assets/Resources/troy/h' + String(hi + 1).padStart(2, '0') + '.json'), 'utf8')).pin;
  const out = [];
  for (let hi = 0; hi < 18; hi++) {
    const r = JSON.parse(await g.ev(`(()=>{try{
      Math.random=rng(${hi}*7+3);G.mode='practice';G.pinSeed=424242;G.roundSeed=777;startHole(${hi});$('introM').hidden=true;try{R3R.on=false;}catch(e){}G.hole.pin=${JSON.stringify(pinOf(hi))};
      const W=holeWind(${hi}),rs=roundWindSeed();
      const H={hole:${hi}+1,wind:W,roundSeed:rs,prep:[],water:[],pins:G.hole.pins.map(p=>[p[0],p[1]])};
      const prep=(x,y,strokes)=>{G.ball={x,y};G.prev={x,y};G.strokes=strokes;G.stype='full';G.buried=false;G.imp={x:0,y:0};G.traj=0;G.pshot=false;SJ.job=null;G.aiTurn=false;
        prepareShot();return{x,y,strokes,lie:G.lie,aim:G.aim,club:curClub().id,stype:G.stype,swMax:G.swMax,puttMax:G.puttMax,flagOut:G.flagOut,onTee:onTeeBox()};};
      const t=G.hole.line&&G.hole.line[0]||[0,0];H.prep.push(prep(G.ball.x,G.ball.y,0));
      const b=G.hole.bounds,R=rng(${hi}*101+5);let tries=0;
      while(H.prep.length<26&&tries++<600){const x=+(b[0]+R()*(b[2]-b[0])).toFixed(2),y=+(b[1]+R()*(b[3]-b[1])).toFixed(2),L=lieAt(x,y);if(L==='water'||L==='ob')continue;H.prep.push(prep(x,y,1));}
      // water: aim at the hole's water from a club's length back toward the tee
      const wpts=[];const L=G.hole.lg;for(let j=0;j<L.ny;j+=4)for(let i=0;i<L.nx;i+=4){const x=L.x0+i,y=L.y0+j;if(lieAt(x,y)==='water')wpts.push([x,y]);}
      H.nWater=wpts.length;
      for(let k=0;k<Math.min(6,wpts.length);k++){const [wx,wy]=wpts[Math.floor(k*wpts.length/6)],tl=Math.hypot(wx-t[0],wy-t[1])||1,D=Math.min(tl,[150,120,95][k%3]);
        const bx=wx+(t[0]-wx)/tl*D,by=wy+(t[1]-wy)/tl*D,L0=lieAt(bx,by);if(L0==='water'||L0==='ob')continue;
        G.ball={x:bx,y:by};G.prev={x:bx,y:by};G.strokes=1;G.lie=shotLie();G.aim=angTo(bx,by,wx,wy);G.stype='full';G.imp={x:0,y:0};G.traj=0;G.pshot=false;G.flagOut=false;G.buried=false;
        const cl=autoClub(D);G.clubIdx=cl===PUTTER?CI('PW'):cl;G.wind={a:1,mph:3};G.followT=0;G.state='acc';G.meter.power=1;const seed=90000+${hi}*100+k;executeShot(1,0,seed);
        const f=G.flight;if(!f)continue;const fl={};for(const kk of Object.keys(f)){const v=f[kk];if(typeof v==='number'||typeof v==='boolean'||typeof v==='string')fl[kk]=v;}fl.club=f.club.id;
        const lseed=70000+${hi}*100+k;const RR=rng(lseed);Math.random=RR;let opts=null,kind=null;const P0=penalty;
        penalty=(kd,soft)=>{kind=kd;P0(kd,soft);if(kd==='water'){const C=waterCross();const o=reliefOpts(C);opts={C,o:o.map(q=>({k:q.k,x:q.x,y:q.y,L:q.L,d:q.d})),best:reliefBest(o).k,at:[G.ball.x,G.ball.y]};}};
        let n=0;try{while(n<2400){n++;if(G.state==='flight'&&G.flight)stepFlight(1/60);
          if(G.recOn&&['flight','bounce','roll'].includes(G.state))G.rec.push({t:n/60,x:G.ball.x,y:G.ball.y,Y:G.bY});
          if(G.state==='bounce'&&G.hop)stepHop(1/60);if(G.state==='roll'&&G.roll)stepRoll(1/60);if(!['flight','bounce','roll'].includes(G.state))break;}}finally{penalty=P0;}
        H.water.push({bx,by,flight:fl,lseed,kind,opts,prev:[bx,by]});}
      return JSON.stringify(H);
    }catch(e){return JSON.stringify({err:String(e&&e.stack||e)});}})()`));
    if (r.err) { console.log('ERR', hi + 1, r.err.slice(0, 400)); continue; }
    out.push(r);
    console.log('hole', r.hole, 'prep', r.prep.length, 'water cells', r.nWater, 'into water', r.water.filter(w => w.kind === 'water').length, 'clubs', [...new Set(r.prep.map(p => p.club + (p.stype !== 'full' ? '/' + p.stype : '')))].join(' '));
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'round_cases.json'), JSON.stringify(out));
  console.log('errors', g.errs.slice(0, 3));
  await g.close();
})();
