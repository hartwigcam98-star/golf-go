/* Export one hole from the current game for the next/ renderer, using the game's own code (so the terrain, surfaces and trees
   are exactly what the game plays on). Run from the repo root:
     node next/tools/export-hole.mjs <course> <hole 1-18> [--port 8765]
   Needs Playwright (Chromium). Serves the repo on localhost, loads a copy of index.html with a small hook, builds the hole and
   writes next/data/<course>/h<hole>.json (metadata) and .bin (height grids and the surface map). */
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { extname, join, resolve } from 'node:path';

// Playwright from this project or a global install (NODE_PATH=$(npm root -g))
let chromium;try{({chromium}=await import('playwright'));}catch{({chromium}=createRequire(import.meta.url)('playwright'));}
const [course, holeArg] = process.argv.slice(2);
if (!course || !holeArg) { console.error('usage: node next/tools/export-hole.mjs <course> <hole 1-18>'); process.exit(1); }
const hole = parseInt(holeArg, 10) - 1, root = resolve('.');
const HOOKED = '_export_tmp.html';
const src = await readFile(join(root, 'index.html'), 'utf8'), tail = 'else boot(window.claude?.hot?.data??{});\n})();';
if (!src.includes(tail)) throw new Error('index.html boot line not found; update the hook');
await writeFile(join(root, HOOKED), src.replace(tail, 'else boot(window.claude?.hot?.data??{});\nwindow.__ev=x=>eval(x);\n})();'));

const types = { '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.webmanifest': 'application/manifest+json' };
const server = createServer(async (req, res) => {
  try { const p = decodeURIComponent(new URL(req.url, 'http://x').pathname); const body = await readFile(join(root, p));
    res.writeHead(200, { 'Content-Type': types[extname(p)] || 'application/octet-stream' }); res.end(body); }
  catch { res.writeHead(404); res.end(); }
}).listen(0);
const port = server.address().port;
const browser = await chromium.launch({ args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'] });
try {
  const page = await browser.newPage();
  page.on('pageerror', e => console.error('page error:', e.message));
  await page.goto(`http://localhost:${port}/${HOOKED}`, { waitUntil: 'load', timeout: 240000 });
  await page.waitForFunction(() => window.__ev && __ev('typeof startHole') === 'function', null, { timeout: 240000 });
  const out = await page.evaluate(([c, i]) => __ev(`(()=>{
    if(!COURSES['${c}'])throw new Error('unknown course ${c}');
    render=function(){};G.paused=true;setCourse('${c}',false);G.mode='practice';G.pinSeed=0;startHole(${i});
    const h=G.hole,TU=turfOf(),b64=a=>{const u=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);let s='';for(let k=0;k<u.length;k+=32768)s+=String.fromCharCode.apply(null,u.subarray(k,k+32768));return btoa(s);};
    const poly=P=>P.pts.map(p=>[+p[0].toFixed(2),+p[1].toFixed(2)]);
    const trees=(typeof R3T!=='undefined'&&R3T.list&&R3T.list.length?R3T.list:h.allTrees||[]).map(t=>({x:+t.x.toFixed(1),y:+t.y.toFixed(1),r:+(t.r||5).toFixed(1),h:t.h!=null?+(+t.h).toFixed(1):null,sp:t.sp||null,gh:+(t.gh??hAtH(h,t.x,t.y)).toFixed(2)}));
    const far=(h.farTrees||[]).map(t=>({x:+t.x.toFixed(1),y:+t.y.toFixed(1),r:+(t.r||5).toFixed(1),sp:t.sp||null,gh:+(t.gh??hAtH(h,t.x,t.y)).toFixed(2)}));
    return {meta:{format:1,course:CUR.id,name:CUR.name,hole:G.hi+1,par:h.par,scen:CUR.scen,units:'yards; x east, y south (hole frame, tee at 0,0); heights in yards',
      bounds:h.bounds,pin:h.pin,pins:h.pins||null,axis:h.axis,teeAim:G.aim,
      hg:{x0:h.hg.x0,y0:h.hg.y0,st:h.hg.st,nx:h.hg.nx,ny:h.hg.ny},gg:{x0:h.gg.x0,y0:h.gg.y0,st:h.gg.st,nx:h.gg.nx,ny:h.gg.ny},
      lg:{x0:h.lg.x0,y0:h.lg.y0,st:1,nx:h.lg.nx,ny:h.lg.ny,codes:LIE_CODES},
      polys:{fairways:h.fairways.map(poly),greens:h.greens.map(poly),tees:h.tees.map(poly),bunkers:h.bunkers.map(poly),water:h.water.map(w=>({lvl:w.lvl,pts:poly(w)}))},
      turf:{fw:TU.fw,ro:TU.ro,gr:TU.gr,te:TU.te,st:TU.st,sand:TU.sand,sp:TU.sp},trees,far},
     hg:b64(h.hg.data),gg:b64(h.gg.data),lg:b64(h.lg.code)};})()`), [course, hole]);
  const bin = [Buffer.from(out.hg, 'base64'), Buffer.from(out.gg, 'base64'), Buffer.from(out.lg, 'base64')];
  let off = 0; out.meta.bin = {};
  for (const [k, b, t] of [['hg', bin[0], 'f32'], ['gg', bin[1], 'f32'], ['lg', bin[2], 'u8']]) { out.meta.bin[k] = { offset: off, length: b.length, type: t }; off += b.length; }
  const dir = join(root, 'next', 'data', out.meta.course); await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `h${out.meta.hole}.bin`), Buffer.concat(bin));
  await writeFile(join(dir, `h${out.meta.hole}.json`), JSON.stringify(out.meta));
  console.log(`wrote next/data/${out.meta.course}/h${out.meta.hole}.{json,bin}: ${(off / 1024).toFixed(0)} KB grids, ${out.meta.trees.length} trees, ${out.meta.far.length} far trees`);
} finally { await browser.close(); server.close(); await rm(join(root, HOOKED), { force: true }); }
