// (re-run: node unity/SimTests/recorder/record_short.js . /tmp/short, then copy short_cases.json to SimTests)
/* Stage 3 recorder: short-game shots round Troy Burne 1's green, struck by a neutral golfer in the web game and flown, bounced and
   rolled to rest with a landing seed. For every spot it writes down what the web game works out before the swing (the meter's
   size swMax, the planned carry and finish, chooseShort's pick), then the strike (every flight field) and the landing.
   usage: node record_short.js <site> <outDir>                                                                            */
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
  // spots round the green on every lie
  const spots = JSON.parse(await g.ev(`(()=>{const p=G.hole.pin,o={};for(let r=4;r<=60;r+=1.5)for(let k=0;k<48;k++){const a=k/48*TAU+r*.37,x=p[0]+Math.cos(a)*r,y=p[1]+Math.sin(a)*r,L=lieAt(x,y);
      if(L==='water'||L==='ob'||L==='green')continue;(o[L]=o[L]||[]).push([+x.toFixed(2),+y.toFixed(2),+r.toFixed(1)]);}
    return JSON.stringify({pin:p,o:Object.fromEntries(Object.entries(o).map(([k,v])=>[k,v.length]))
      ,pick:Object.fromEntries(Object.entries(o).map(([k,v])=>{const n={fairway:14,cut:10,rough:14,fescue:8,sand:12,dirt:6,tee:2}[k]||4,s=[];for(let i=0;i<n&&v.length;i++)s.push(v[Math.floor(i*v.length/n)]);return[k,s];}))});})()`));
  console.log('lies round the green', JSON.stringify(spots.o));
  const cases = []; let seed = 31000;
  for (const [lie, pts] of Object.entries(spots.pick)) for (const [bx, by, r] of pts) {
    const shots = lie === 'sand' ? (r <= 45 ? [['splash', 'SW'], ['pick', 'SW'], ['blast', 'SW'], ['blast', 'SW', 1], ['splash', 'LW']] : [['full', '9I'], ['punch', '7I']])
      : [['choose'], ['chip', '8I'], ['chip', 'SW'], ['pitch', 'GW'], ['pitch', 'LW'], ['flop', 'LW'], ['spin', 'SW'], ['punch', '8I']];
    let k = 0;
    for (const s of shots) { cases.push({ bx, by, stype: s[0], club: s[1] || null, buried: !!s[2], scale: [1, .85, 1.15, 1, .93][k % 5], e: [0, .012, -.015, .03, -.035, null, .006][(cases.length) % 7], seed: seed++, lseed: 500000 + seed * 11 }); k++; }
  }
  const res = [];
  for (const c of cases) {
    const r = JSON.parse(await g.ev(`(()=>{try{
      const c=${JSON.stringify(c)};
      G.ball={x:c.bx,y:c.by};G.strokes=1;G.prev={...G.ball};G.lie=shotLie();G.imp={x:0,y:0};G.traj=0;G.pshot=false;G.spin=0;G.flagOut=false;G.aiTurn=false;G.buried=c.buried;
      G.wind={a:(c.seed*0.37)%6.283,mph:(c.seed*7)%13};const p=G.hole.pin;G.aim=angTo(c.bx,c.by,p[0],p[1]);G.fromLie=undefined;
      let chose=null;
      if(c.stype==='choose'){G.clubIdx=CI('PW');G.stype='full';G.swMax=0;G.shortP=null;SJ.job=null;const ok=chooseShort();if(!ok)return JSON.stringify({skip:'no short pick'});chose={stype:G.stype,club:curClub().id};}
      else{G.clubIdx=CI(c.club);G.stype=c.stype;if(c.stype!=='full'&&c.stype!=='punch'&&!shotOK(c.stype,G.clubIdx))return JSON.stringify({skip:'club'});
        if(c.stype==='spin'&&!(G.lie==='fairway'||G.lie==='tee'||G.lie==='cut'))return JSON.stringify({skip:'spin lie'});
        if(BUNKER_T[c.stype]&&!bunkerSide())return JSON.stringify({skip:'bunker'});setShortMax();}
      const short=isShort(),M=shotMods(),P=short?shortPlan():null;
      const pw=short?Math.min(1,Math.max(.02,P.carry/(G.swMax*M.carry)*c.scale)):Math.min(1,.8*c.scale);
      const pre={lie:G.lie,stype:G.stype,club:curClub().id,swMax:G.swMax,onTee:onTeeBox(),win:perfectWin(),natMax:natMax(),
        plan:P?{carry:P.carry,over:P.over,landL:P.landL,fin:P.fin,land:P.land,bad:P.bad}:null,aim:G.aim,power:pw};
      G.followT=0;G.state='acc';G.meter.power=pw;executeShot(pw,c.e,c.seed);
      const f=G.flight;if(!f)return JSON.stringify({err:'no flight',state:G.state});
      const fl={};for(const k of Object.keys(f)){const v=f[k];if(typeof v==='number'||typeof v==='boolean'||typeof v==='string')fl[k]=v;}fl.club=f.club.id;
      let draws=0;const R=rng(c.lseed);Math.random=()=>{draws++;return R();};
      let out=null;const P0=penalty,H0=holed,S0=stopBall;
      penalty=(k,soft)=>{out=out||{d:draws,kind:k,x:G.ball.x,y:G.ball.y};P0(k,soft);};
      holed=(k)=>{out=out||{d:draws,kind:'holed',how:k||'',x:G.ball.x,y:G.ball.y};H0(k);};
      stopBall=()=>{const pr=pathReliefSpot();out=out||{d:draws,kind:'rest',x:G.ball.x,y:G.ball.y,lie:lieAt(G.ball.x,G.ball.y),plie:physLie(G.ball.x,G.ball.y),relief:pr?[pr.x,pr.y]:null};const s0=G.strokes;S0();if(out.kind==='rest'&&G.strokes>s0)out.gimme=true;};
      const tr=[];let n=0;const dt=1/60;
      try{while(n<60*40){n++;
        if(G.state==='flight'&&G.flight)stepFlight(dt);
        if(G.state==='bounce'&&G.hop)stepHop(dt);
        if(G.state==='roll'&&G.roll)stepRoll(dt);
        if(n%15===0)tr.push([n,G.state,+G.ball.x.toFixed(4),+G.ball.y.toFixed(4),+G.bY.toFixed(4)]);
        if(!['flight','bounce','roll'].includes(G.state))break;}}
      finally{penalty=P0;holed=H0;stopBall=S0;}
      return JSON.stringify({...c,pre,chose,flight:fl,wind:{a:G.wind.a,mph:G.wind.mph},frames:n,out,trace:tr,lastPerf:G.lastPerf});
    }catch(e){return JSON.stringify({err:String(e&&e.stack||e)});}})()`));
    if (r.err) console.log('ERR', r.err.slice(0, 500));
    else if (!r.skip) res.push(r);
  }
  fs.mkdirSync(OUT, { recursive: true });
  fs.writeFileSync(path.join(OUT, 'short_cases.json'), JSON.stringify(res));
  const by = {}; for (const r of res) { const k = r.pre.stype + '@' + r.pre.lie; by[k] = (by[k] || 0) + 1; }
  const out = {}; for (const r of res) { const k = r.out ? r.out.kind + (r.out.gimme ? ':gimme' : '') : 'none'; out[k] = (out[k] || 0) + 1; }
  console.log(res.length, 'cases', JSON.stringify(by)); console.log(JSON.stringify(out), 'errors', g.errs.slice(0, 3));
  await g.close();
})();
