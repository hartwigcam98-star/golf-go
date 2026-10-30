#!/usr/bin/env node
/* Golf Go publish build: splits the repo's all-in-one game into a small core plus one file per course.

   The repo keeps every course in one page (index.html, with its big data lines in data/ and packed back in by
   tools/datafiles.py; greens.js, ground.js and trees.js hold the lidar greens, ground, buildings and tree crowns for all
   courses), because the course pipeline writes there. What players
   download is built from it:
     dist/index.html   the game without any course data; window.CFILES maps each course id to its file
     dist/c/<id>.js    one course: its layout + surroundings (+ the shared blocks they use) and its LIDG/LIDW/BLDX/R3NAIP parts
     dist/sw.js        offline cache list updated (course files instead of the three big data files)
   and every other tracked file is copied as is. The game loads a course's file the first time it's played (see CFILES in
   index.html); with no CFILES (the repo copy) every course is inline and ready.

   usage: node tools/split/build.js [outDir=dist]       (run from the repo root) */
const fs = require('fs'), path = require('path'), crypto = require('crypto'), { execSync } = require('child_process');
const OUT = path.resolve(process.argv[2] || 'dist');
const sha = t => crypto.createHash('sha1').update(t).digest('hex').slice(0, 10);
const die = m => { console.error('BUILD FAILED: ' + m); process.exit(1); };

// the repo keeps the big data lines in data/ (tools/datafiles.py); the build starts from the all-in-one page they pack into
const src = execSync('python3 tools/datafiles.py pack', { encoding: 'utf8', maxBuffer: 1 << 30 });
const L = src.split('\n');

// ---- the course registry: one line per course inside `const COURSES={ ... }};`
const c0 = L.findIndex(l => l.startsWith('const COURSES={'));
if (c0 < 0) die('no COURSES registry');
let c1 = c0; while (c1 < L.length && !/\}\};\s*$/.test(L[c1])) c1++;
const courses = [];
for (let i = c0; i <= c1; i++) {
  const m = /^\s*([a-z0-9_]+):\{.*\bid:'([a-z0-9_]+)'/.exec(L[i]); if (!m) continue;
  const cm = /\bcourse:([A-Z][A-Z0-9_]*)/.exec(L[i]), sm = /\bsurr:([A-Z][A-Z0-9_]*)/.exec(L[i]), dm = /\bdata:'([a-z0-9_]+)'/.exec(L[i]);
  if (!cm || !sm) die('course line without course/surr identifiers: ' + m[2]);
  courses.push({ id: m[2], line: i, course: cm[1], surr: sm[1], data: dm ? dm[1] : null });
}
if (courses.length < 10) die('only ' + courses.length + ' courses found');

// ---- top-level single-line data definitions (`let NAME=...;`) and what each refers to
const defs = new Map();
L.forEach((l, i) => { const m = /^let ([A-Z][A-Z0-9_]*)=/.exec(l); if (m) defs.set(m[1], i); });
const refsOf = i => { const out = new Set(), t = L[i];
  for (const m of t.matchAll(/\b[A-Z][A-Z0-9_]{2,}\b/g)) if (defs.has(m[0]) && defs.get(m[0]) !== i) out.add(m[0]); return out; };
const closure = roots => { const seen = new Set(), st = [...roots];
  while (st.length) { const n = st.pop(); if (seen.has(n)) continue; if (!defs.has(n)) die('no definition for ' + n); seen.add(n); for (const r of refsOf(defs.get(n))) st.push(r); }
  return [...seen].sort((a, b) => defs.get(a) - defs.get(b)); };   // in file order, so each definition comes after what it uses
const moved = new Set();
for (const c of courses) { c.names = closure([c.course, c.surr]); c.names.forEach(n => moved.add(n)); }

// ---- the statement that blanks those bindings after the registry (memory work): drop it with them
const nullIdx = L.findIndex((l, i) => i > c1 && /^\((COURSE|SURR)_[A-Z0-9_]+=/.test(l));
if (nullIdx >= 0) for (const m of L[nullIdx].matchAll(/\b([A-Z][A-Z0-9_]*)=/g)) if (!moved.has(m[1]) && defs.has(m[1])) die('blanking line names ' + m[1] + ' which is not course data');
const dropLines = new Set([...moved].map(n => defs.get(n)));
if (nullIdx >= 0) dropLines.add(nullIdx);

// ---- core page
const core = L.map((l, i) => {
  if (dropLines.has(i)) return null;
  if (i >= c0 && i <= c1) return l.replace(/\bcourse:[A-Z][A-Z0-9_]*/, 'course:null').replace(/\bsurr:[A-Z][A-Z0-9_]*/, 'surr:null');
  return l;
}).filter(l => l !== null);
let coreText = core.join('\n');
// nothing left may still refer to a moved binding (outside strings this would be a ReferenceError on a phone)
for (const n of moved) { const re = new RegExp('\\b' + n + '\\b'); if (re.test(coreText)) die('core still refers to ' + n); }

// ---- the data files: any `const NAME={...}` whose keys are all course (or shared data) keys is split per course; anything
//      else in them (comments aside) stays in the core page as it is
const allKeys = new Set(courses.flatMap(c => [c.id, c.data].filter(Boolean)));
const extraScripts = ['greens.js', 'ground.js', 'trees.js'], T = {}, keep = [];
for (const f of extraScripts) for (const l of fs.readFileSync(f, 'utf8').split('\n')) {
  const m = /^(?:const|let|var) ([A-Za-z_$][\w$]*)=(.*)$/.exec(l);
  if (m) { let o = null; try { o = JSON.parse(m[2].replace(/;\s*$/, '')); } catch (e) {}
    if (o && typeof o === 'object' && !Array.isArray(o) && Object.keys(o).length && Object.keys(o).every(k => allKeys.has(k))) { T[m[1]] = o; continue; } }
  if (l.trim() && !/^\s*\/\//.test(l)) keep.push(l);
}
for (const n of ['LIDG', 'LIDW', 'R3NAIP']) if (!T[n]) die(n + ' was not found as a per-course table');
console.log('per-course tables: ' + Object.keys(T).join(', ') + (keep.length ? '; kept in core from the data files: ' + keep.length + ' line(s)' : ''));

// ---- course files
fs.rmSync(OUT, { recursive: true, force: true }); fs.mkdirSync(path.join(OUT, 'c'), { recursive: true });
const CF = {}, report = [];
for (const c of courses) {
  const keys = [...new Set([c.data || c.id, c.id])], dat = {};
  for (const k of Object.keys(T)) for (const key of keys) if (T[k][key] !== undefined) (dat[k] = dat[k] || {})[key] = T[k][key];
  const body = c.names.map(n => L[defs.get(n)]).join('\n');
  const text = 'GGC(' + JSON.stringify(c.id) + ',function(){\n' + body + '\nreturn{course:' + c.course + ',surr:' + c.surr + '};},' + JSON.stringify(dat) + ');\n';
  const v = sha(text), rel = 'c/' + c.id + '.js';
  fs.writeFileSync(path.join(OUT, rel), text);
  CF[c.id] = { u: rel + '?v=' + v, s: Buffer.byteLength(text) };
  report.push([c.id, Math.round(Buffer.byteLength(text) / 1024)]);
}

// ---- swap the three data scripts for the course map
const tagRe = /<script src="(greens|ground|trees)\.js\?v=[^"]*"><\/script>\n?/g;
const tags = coreText.match(tagRe) || [];
if (tags.length !== 3) die('expected 3 data script tags, found ' + tags.length);
let first = true;
coreText = coreText.replace(tagRe, () => { if (!first) return ''; first = false;
  return '<script>window.CFILES=' + JSON.stringify(CF) + ';' + Object.keys(T).map(n => 'var ' + n + '={};').join('') + '</script>\n' +
    (keep.length ? '<script>\n' + keep.join('\n') + '\n</script>\n' : ''); });
// ---- big static blobs (textures, golfer animation, leaf atlas, course pictures, three.js, sounds) each go to their own
//      versioned file, so a code change doesn't make phones download them again. A line moves only if it is `const|let NAME=<literal>;`
//      or `Object.assign(NAME,<literal>);` whose literal evaluates on its own; three.js (its own <script>) moves whole.
const vm = require('vm'), ASSETS = [];
fs.mkdirSync(path.join(OUT, 'a'), { recursive: true });
const addAsset = (name, js) => { const v = sha(js), rel = 'a/ga_' + name + '.js'; fs.writeFileSync(path.join(OUT, rel), js); ASSETS.push(rel + '?v=' + v); return rel + '?v=' + v; };
{ let CL = coreText.split('\n');
  // three.js: <script>/* three.js ... */ ... })();</script>
  const t0 = CL.findIndex(l => /^<script>\/\* three\.js r\d+/.test(l));
  if (t0 >= 0) { let t1 = t0; while (t1 < CL.length && CL[t1] !== '</script>') t1++;
    const body = CL.slice(t0, t1).join('\n').replace(/^<script>/, '');
    const u = addAsset('three', body + '\n');
    CL.splice(t0, t1 - t0 + 1, '<script src="' + u + '"></script>'); }
  // the main game script: big literal lines inside it
  const m0 = CL.findIndex((l, i) => l === '<script>' && CL.slice(i + 1, i + 40).some(x => x.length > 50000) || l === '<script>' && i > 0 && CL.findIndex((x, j) => j > i && x.length > 50000) > i);
  const moves = [];
  CL.forEach((l, i) => { if (l.length < 50000) return;
    let m = /^(const|let) ([A-Za-z_$][\w$]*)=(.*);\s*$/.exec(l), kind = 'def', name, lit;
    if (m) { name = m[2]; lit = m[3]; } else if ((m = /^Object\.assign\(([A-Za-z_$][\w$]*),(.*)\);\s*$/.exec(l))) { kind = 'assign'; name = m[1]; lit = m[2]; } else return;
    const key = name + (kind === 'assign' ? '_' + i : '');
    try { vm.runInNewContext('(' + lit + ')', {}, { timeout: 5000 }); } catch (e) { console.log('blob stays inline (not a plain literal): ' + key); return; }
    moves.push({ i, kind, name, key, lit, decl: m[1] }); });
  if (moves.length) {
    // the asset scripts run before the game script that uses them
    const first = Math.min(...moves.map(x => x.i)); let s0 = first; while (s0 > 0 && !/^<script>/.test(CL[s0])) s0--;
    const tagsA = [];
    for (const mv of moves) { const u = addAsset(mv.key, '(window.__GA=window.__GA||{})[' + JSON.stringify(mv.key) + ']=' + mv.lit + ';\n'); tagsA.push('<script src="' + u + '"></script>');
      CL[mv.i] = mv.kind === 'def' ? mv.decl + ' ' + mv.name + '=__GA[' + JSON.stringify(mv.key) + '];' : 'Object.assign(' + mv.name + ',__GA[' + JSON.stringify(mv.key) + ']);'; }
    // if any of them didn't arrive (no signal on a first launch), say so instead of opening a broken game
    tagsA.push('<script>if(!window.THREE||!window.__GA||Object.keys(__GA).length<' + moves.length + '){window.__GAFAIL=1;document.addEventListener("DOMContentLoaded",()=>{document.body.innerHTML=\'<div style="position:fixed;inset:0;display:flex;align-items:center;justify-content:center;text-align:center;padding:24px;background:#0f2233;color:#fff6dc;font:600 18px sans-serif">Golf Go couldn\\u2019t finish loading.<br>Check your connection and open it again.</div>\';});}</script>');
    CL.splice(s0, 0, ...tagsA); }
  coreText = CL.join('\n'); }
console.log('static blobs moved out: ' + ASSETS.map(u => u.split('?')[0].replace('a/ga_', '').replace('.js', '')).join(', '));
fs.writeFileSync(path.join(OUT, 'index.html'), coreText);

// ---- every other tracked file, as is
const skipTop = new Set(['.github', 'pipeline', 'supabase', 'app', 'tools', 'dist', 'data', 'src']);   // data/, src/: packed into the page above
const tracked = execSync('git ls-files -z', { encoding: 'utf8' }).split('\0').filter(Boolean);
for (const f of tracked) {
  if (skipTop.has(f.split('/')[0]) || f === 'index.html' || f === 'sw.js' || extraScripts.includes(f)) continue;
  const to = path.join(OUT, f); fs.mkdirSync(path.dirname(to), { recursive: true }); fs.copyFileSync(f, to);
}

// ---- offline cache: course files replace the three data files; new cache version for the new page
let sw = fs.readFileSync('sw.js', 'utf8');
const dm = /const DATA=(\[[^\]]*\]);/.exec(sw); if (!dm) die('sw.js DATA list not found');
const DATA = JSON.parse(dm[1]).filter(u => !extraScripts.some(f => u.startsWith(f + '?'))).concat(Object.values(CF).map(x => x.u.split('/').pop())).concat(ASSETS.map(u => u.split('/').pop()));   // the cache keeps files whose last path part + ?v= is listed
if (!/const PRE=\[\];/.test(sw)) die('sw.js PRE list not found');
sw = sw.replace(/const PRE=\[\];/, 'const PRE=' + JSON.stringify(ASSETS) + ';');
sw = sw.replace(dm[0], 'const DATA=' + JSON.stringify(DATA) + ';').replace(/const V='[0-9a-f]+'/, "const V='" + sha(coreText) + "'");
if (!/const V='/.test(sw)) die('sw.js version not found');
fs.writeFileSync(path.join(OUT, 'sw.js'), sw);
fs.writeFileSync(path.join(OUT, '.nojekyll'), '');

const kb = f => Math.round(fs.statSync(f).size / 1024);
console.log('core index.html ' + kb(path.join(OUT, 'index.html')) + ' KB (was ' + kb('index.html') + ' KB); ' + courses.length + ' course files, ' +
  report.reduce((a, b) => a + b[1], 0) + ' KB in all; largest ' + report.sort((a, b) => b[1] - a[1]).slice(0, 3).map(r => r.join(' ') + ' KB').join(', '));
