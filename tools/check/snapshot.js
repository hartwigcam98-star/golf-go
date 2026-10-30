#!/usr/bin/env node
/* Golf Go snapshot check: records what the game does, so a restructure can prove it changed nothing.

   For every course and hole it records
     - a fingerprint of the hole as the game builds it (layout, pins, lie grid, heights, trees, buildings ...)
     - a scripted round: the game picks club and aim as it does for a player, every swing is struck with a fixed seed,
       and the ball's resting spot, lie, shot type and strokes are written down after each one
     - a picture of hole 1 from the tee (render repeated until it holds still)
   plus a fingerprint of every big data block (course layouts, lidar greens and ground, trees, textures, golfer rigs),
   and any errors the page threw.

   Everything runs on a frozen clock with seeded dice and no network, so two runs of the same code give the same file.

   usage: node tools/check/snapshot.js <siteDir> <outDir> [--courses troy,stoneridge] [--shard 2/8] [--no-img] [--no-play]
     --shard k/n   only every n-th course starting at k (1-based), so a check can be split across machines
     --no-play     hole fingerprints only (no scripted round): the quick check
   then:  node tools/check/compare.js <baselineOut> <candidateOut>                                                       */
const fs = require('fs'), path = require('path');
const { chromium } = require('playwright');
const { serve } = require('./serve.js');

const args = process.argv.slice(2), flag = k => { const i = args.indexOf(k); return i < 0 ? null : args[i + 1]; };
const SITE = path.resolve(args[0] || '.'), OUT = path.resolve(args[1] || 'snap');
const ONLY = flag('--courses') ? flag('--courses').split(',') : null, NOIMG = args.includes('--no-img'), NOPLAY = args.includes('--no-play');
const SHARD = flag('--shard') ? flag('--shard').split('/').map(Number) : null;
fs.mkdirSync(path.join(OUT, 'img'), { recursive: true });

// names of the big data blocks: long declaration lines in the game script, and the declarations in the data files
function dataNames() {
  const names = new Set();
  const scan = (txt, min) => { for (const l of txt.split('\n')) { if (l.length < min) continue; const m = /^\s*(?:const|let|var)\s+([A-Za-z_$][\w$]*)\s*=/.exec(l); if (m) names.add(m[1]); } };
  const idx = fs.readFileSync(path.join(SITE, 'index.html'), 'utf8');
  const main = idx.slice(idx.indexOf('const $=id=>document.getElementById(id)'));   // the game script (not three.js)
  scan(main, 20000);
  for (const f of ['greens.js', 'ground.js', 'trees.js']) if (fs.existsSync(path.join(SITE, f))) scan(fs.readFileSync(path.join(SITE, f), 'utf8'), 1000);
  return [...names].sort();
}

// runs inside the game's scope (through window.__ev)
const PAGE_LIB = String.raw`(()=>{
const H=window.__H={};
// cyrb53 over a string
H.str=(s,seed=0)=>{let h1=0xdeadbeef^seed,h2=0x41c6ce57^seed;for(let i=0;i<s.length;i++){const c=s.charCodeAt(i);h1=Math.imul(h1^c,2654435761);h2=Math.imul(h2^c,1597334677);}
  h1=Math.imul(h1^(h1>>>16),2246822507)^Math.imul(h2^(h2>>>13),3266489909);h2=Math.imul(h2^(h2>>>16),2246822507)^Math.imul(h1^(h1>>>13),3266489909);
  return (4294967296*(2097151&h2)+(h1>>>0)).toString(36);};
const plain=v=>{const p=Object.getPrototypeOf(v);return p===Object.prototype||p===null;};
// a stable text form of plain data: functions, DOM and three.js objects are left out (they are not data)
H.ser=(v,d=0)=>{if(v===null||v===undefined)return String(v);const t=typeof v;
  if(t==='number')return Object.is(v,-0)?'-0':String(v);if(t==='string')return JSON.stringify(v);if(t==='boolean')return String(v);if(t==='function')return 'f';
  if(d>12)return '…';
  if(ArrayBuffer.isView(v)){const b=new Uint8Array(v.buffer,v.byteOffset,v.byteLength);let s='';for(let i=0;i<b.length;i+=8192)s+=String.fromCharCode.apply(null,b.subarray(i,i+8192));return v.constructor.name+':'+H.str(s);}
  if(Array.isArray(v))return '['+v.map(x=>H.ser(x,d+1)).join(',')+']';
  if(v instanceof Map)return 'Map{'+[...v].map(([k,x])=>H.ser(k,d+1)+':'+H.ser(x,d+1)).join(',')+'}';
  if(v instanceof Set)return 'Set{'+[...v].map(x=>H.ser(x,d+1)).join(',')+'}';
  if(t==='object'&&plain(v))return '{'+Object.keys(v).sort().map(k=>JSON.stringify(k)+':'+H.ser(v[k],d+1)).join(',')+'}';
  return '<'+((v.constructor&&v.constructor.name)||'obj')+'>';};
H.h=v=>H.str(H.ser(v));
// the hole as built: each field on its own, so a difference says where it is
H.holeFP=h=>{const o={};for(const k of Object.keys(h).sort()){if(typeof h[k]==='function')continue;o[k]=H.h(h[k]);}return o;};
const r=(x,n=4)=>+x.toFixed(n);
// one scripted hole: the game's own club and aim choice, power from the game's planners, seeded swings
H.play=(i)=>{const S=[];let steps=0;const st=()=>{update(1/60);steps++;};
  $('introM').hidden=true;try{R3R.on=false;}catch(e){}prepareShot();
  for(let s=0;s<12&&G.state!=='holed'&&G.state!=='card';s++){
    let k=0;while(G.state!=='aim'&&G.state!=='holed'&&G.state!=='card'&&k++<1800)st();
    if(G.state!=='aim'){S.push(['stuck',G.state]);break;}
    try{R3R.on=false;}catch(e){}
    const c=curClub();let pw=1;
    if(c.putter)pw=Math.min(1,Math.max(.03,pinDist()/G.puttMax*1.1));
    else if(isShort())pw=Math.min(1,Math.max(.02,shortPlan().carry/(G.swMax*shotMods().carry)));
    G.meter.power=pw;G.state='acc';executeShot(pw,0,7919*(i+1)+s);
    k=0;while(['acc','flight','bounce','roll','hop'].includes(G.state)&&k++<6000)st();
    S.push([c.id,G.stype,r(pw),r(G.ball.x),r(G.ball.y),lieAt(G.ball.x,G.ball.y),G.strokes,G.state,r(G.aim),G.wind.mph]);}
  return{shots:S,steps,score:G.scores[i]??null,end:G.state};};
// a picture of the current view, once two renders in a row agree (or after 12)
H.pic=()=>{const a=$('gl'),c=$('c'),o=document.createElement('canvas');o.width=a.width;o.height=a.height;const x=o.getContext('2d');
  let prev='',n=0;for(;n<12;n++){render();x.clearRect(0,0,o.width,o.height);x.drawImage(a,0,0);x.drawImage(c,0,0,o.width,o.height);const d=o.toDataURL('image/png');if(d===prev)break;prev=d;}
  return{png:prev,renders:n+1};};
return 'ok';})()`;

(async () => {
  const t0 = Date.now(), { srv, url } = await serve(SITE);
  const browser = await chromium.launch({ args: ['--enable-unsafe-swiftshader', '--use-angle=swiftshader', '--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, serviceWorkers: 'block' });
  await ctx.route(u => !u.href.startsWith(url), r => r.abort());   // no Supabase, no analytics: nothing outside the site
  const page = await ctx.newPage();
  let errs = [];
  page.on('pageerror', e => errs.push('pageerror: ' + e.message));
  page.on('console', m => { if (m.type() === 'error' && !/Failed to load resource/.test(m.text())) errs.push('console: ' + m.text().slice(0, 300)); });
  // the clock stands still unless moved: no frames or timers run on their own, so nothing happens between the check's steps
  // seeded dice from the very first line of the page (boot picks a round seed for pins and wind)
  await page.addInitScript(() => { let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; try { localStorage.clear(); } catch (e) { } });
  await page.clock.install({ time: new Date('2026-06-01T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-06-01T12:00:01Z'));
  await page.goto(url + '/index.html', { timeout: 600000, waitUntil: 'load' });
  await page.clock.runFor(1500);   // boot: a fixed 1.5 s of frames
  const ev = s => page.evaluate(s => window.__ev(s), s);
  await ev(PAGE_LIB);

  const snap = { site: path.basename(SITE), bootErrors: errs, data: {}, courses: {} };
  errs = [];
  // shared tables the game builds from its data
  snap.tables = JSON.parse(await ev(`JSON.stringify({clubs:__H.h(CLUBS),courseIds:Object.keys(COURSES),
    courses:Object.fromEntries(Object.keys(COURSES).map(id=>[id,__H.h(Object.fromEntries(Object.entries(COURSES[id]).filter(([k])=>k[0]!=='_')))]))})`));

  let ids = ONLY || snap.tables.courseIds;
  if (SHARD) ids = ids.filter((_, i) => i % SHARD[1] === SHARD[0] - 1);
  for (const id of ids) {
    const c0 = Date.now();
    errs = [];
    const res = JSON.parse(await ev(`(()=>{const out={holes:[]};try{
      Math.random=rng(${[...id].reduce((a, ch) => a * 31 + ch.charCodeAt(0) | 0, 7)});
      G.mode='round';G.pinSeed=424242;G.scores=[];setCourse('${id}',false);out.cur=CUR.id;out.n=TB.length;out.par=TOTAL_PAR;
    }catch(e){out.err=String(e&&e.stack||e);}return JSON.stringify(out);})()`));
    // the Blender clubhouse file for this course (the game loads it by script tag before the first hole)
    for (let k = 0; k < 300; k++) {
      if (await ev(`(()=>!b10On()||b10ClubReady(CUR.id,null))()`)) break;
      await new Promise(r => setTimeout(r, 100));
    }
    res.club = await ev(`__H.h(window.B10CLUBS&&B10CLUBS[CUR.id]||null)`);
    for (let i = 0; i < (res.n || 0); i++) {
      const a = Date.now();
      const hr = JSON.parse(await ev(`(()=>{const o={};try{
        Math.random=rng(${i + 1}*104729+${id.length});startHole(${i});if(!G.hole||G.hi!==${i})throw new Error('hole did not start');o.fp=__H.holeFP(G.hole);
      }catch(e){o.err=String(e&&e.stack||e).slice(0,600);}return JSON.stringify(o);})()`));
      const b = Date.now();
      if (!hr.err && !NOPLAY) Object.assign(hr, JSON.parse(await ev(`(()=>{const o={};try{
        Math.random=rng(${i + 1}*15485863);o.play=__H.play(${i});
      }catch(e){o.err=String(e&&e.stack||e).slice(0,600);}return JSON.stringify(o);})()`)));
      if (process.env.SNAP_TIME) console.log('  hole', i + 1, 'build', b - a, 'ms  play', Date.now() - b, 'ms');
      res.holes.push(hr);
      if (i === 0 && !NOIMG && !hr.err) {
        const p = JSON.parse(await ev(`(()=>{try{Math.random=rng(99);startHole(0);$('introM').hidden=true;try{R3R.on=false;}catch(e){}prepareShot();try{R3R.on=false;}catch(e){}
          const t=camTarget();cam.E=[...t.E];cam.L=[...t.L];return JSON.stringify(__H.pic());}catch(e){return JSON.stringify({err:String(e)});}})()`));
        if (p.png) fs.writeFileSync(path.join(OUT, 'img', id + '.png'), Buffer.from(p.png.split(',')[1], 'base64'));
        res.pic = { renders: p.renders, err: p.err };
      }
    }
    res.errors = errs;
    snap.courses[id] = res;
    const sc = res.holes.map(h => h.play && h.play.score).filter(x => x != null);
    console.log(`${id.padEnd(14)} ${res.n || 0} holes  scripted score ${sc.reduce((a, b) => a + b, 0)} (par ${res.par})  errors ${errs.length}  ${((Date.now() - c0) / 1000).toFixed(0)}s`);
  }
  // data blocks, last: on the published build a course's data only arrives when the course is first played
  for (const n of dataNames()) {
    snap.data[n] = await ev(`(()=>{try{return __H.h(${n});}catch(e){return 'unreachable';}})()`);
  }
  snap.dataErrors = errs; errs = [];
  fs.writeFileSync(path.join(OUT, 'snapshot.json'), JSON.stringify(snap, null, 1));
  console.log(`done in ${((Date.now() - t0) / 60000).toFixed(1)} min -> ${OUT}`);
  await browser.close(); srv.close();
})().catch(e => { console.error(e); process.exit(2); });
