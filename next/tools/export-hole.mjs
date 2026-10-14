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
     hg:b64(h.hg.data),gg:b64(h.gg.data),lg:b64(h.lg.code),
     // the game's instanced species trees for this hole: each group is one prototype (bark limbs, leafy masses, leaf cards; full and
     // light detail, interleaved pos/nor/linear colour[/uv]) with every tree's matrix and tint, exactly as r3TreeFlush placed them
     tgroups:(R3T.groups||[]).map(g=>{const part=im=>{const d=im.geometry.attributes.position.data;return{kind:im.material===R3.mat.bark?'bark':im.material===R3.mat.sleaf?'leaf':'mass',stride:d.stride,data:b64(d.array)};};
       return{sp:g.ts[0].sp,fall:!!g.ts[0].fall,n:g.ts.length,M:b64(g.M),C:b64(g.C),full:g.full.map(part),lite:g.lite.map(part)};}),
     // the surroundings past the hole: the game's skirt mesh (DEM / wide ground, the hole cut out), its outer rim level, and the
     // painted surroundings texture (woods, fields, roads, water from the map) with the rectangle it covers
     surr:R3.skirt?{pos:b64(R3.skirt.geometry.attributes.position.array),base:b64((()=>{const P=R3.skirt.geometry.attributes.position.array,o=new Float32Array(P.length/3);for(let k=0;k<o.length;k++)o[k]=demRel(h,P[k*3],P[k*3+2])-.35;return o;})()),idx:b64(new Uint32Array(R3.skirt.geometry.index.array)),
       rim:R3.flat?R3.flat.geometry.attributes.position.array[1]:null,ss:R3.GU.gSS.value.toArray(),
       tex:SURR.tex&&SURR.tex.image&&SURR.tex.image.toDataURL?SURR.tex.image.toDataURL('image/jpeg',.88):null}:null};})()`), [course, hole]);
  // one .bin of 4-byte-aligned chunks; the .json says where each one is
  const bin = []; let off = 0; out.meta.bin = {};
  const add = (k, b64, type) => { const b = Buffer.from(b64, 'base64'), pad = (4 - b.length % 4) % 4; out.meta.bin[k] = { offset: off, length: b.length, type };
    bin.push(b, Buffer.alloc(pad)); off += b.length + pad; return k; };
  add('hg', out.hg, 'f32'); add('gg', out.gg, 'f32'); add('lg', out.lg, 'u8');
  if (out.surr) { out.meta.surr = { pos: add('sPos', out.surr.pos, 'f32'), base: add('sBase', out.surr.base, 'f32'),   // base: bare ground (no canopy lift)
    idx: add('sIdx', out.surr.idx, 'u32'), rim: out.surr.rim, ss: out.surr.ss, tex: null };
    if (out.surr.tex) out.meta.surr.tex = `h${out.meta.hole}.surr.jpg`; }
  out.meta.treeGroups = out.tgroups.map((g, i) => ({ sp: g.sp, fall: g.fall, n: g.n, M: add(`t${i}M`, g.M, 'f32'), C: add(`t${i}C`, g.C, 'f32'),
    full: g.full.map((q, j) => ({ kind: q.kind, stride: q.stride, data: add(`t${i}f${j}`, q.data, 'f32') })),
    lite: g.lite.map((q, j) => ({ kind: q.kind, stride: q.stride, data: add(`t${i}l${j}`, q.data, 'f32') })) }));
  const dir = join(root, 'next', 'data', out.meta.course); await mkdir(dir, { recursive: true });
  await writeFile(join(dir, `h${out.meta.hole}.bin`), Buffer.concat(bin));
  if (out.surr && out.surr.tex) await writeFile(join(dir, out.meta.surr.tex), Buffer.from(out.surr.tex.split(',')[1], 'base64'));
  await writeFile(join(dir, `h${out.meta.hole}.json`), JSON.stringify(out.meta));
  console.log(`wrote next/data/${out.meta.course}/h${out.meta.hole}.{json,bin}: ${(off / 1024).toFixed(0)} KB binary, ${out.meta.treeGroups.length} tree groups (${out.meta.treeGroups.reduce((a, g) => a + g.n, 0)} trees), ${out.meta.far.length} far trees`);
} finally { await browser.close(); server.close(); await rm(join(root, HOOKED), { force: true }); }
