#!/usr/bin/env node
/* Compares two snapshot folders from snapshot.js (baseline first). Prints every difference and exits 1 if there is any.
   Pictures may differ by rendering noise only: a pixel counts as changed when any channel moves by more than 24, and a picture
   fails when more than 0.2% of its pixels change (measured in headless Chromium, so nothing beyond Playwright is needed).
   Side-by-side images (baseline | candidate | changed pixels in red) of any picture that fails go to <candidate>/diff/.
   usage: node tools/check/compare.js <baselineOut> <candidateOut> [--report report.md]                                  */
const fs = require('fs'), path = require('path');
const [A, B] = process.argv.slice(2, 4).map(p => path.resolve(p));
const ri = process.argv.indexOf('--report'), REPORT = ri > 0 ? process.argv[ri + 1] : null;
const sa = JSON.parse(fs.readFileSync(path.join(A, 'snapshot.json'), 'utf8')), sb = JSON.parse(fs.readFileSync(path.join(B, 'snapshot.json'), 'utf8'));
const out = [], bad = m => out.push(m);
const eq = (x, y) => JSON.stringify(x) === JSON.stringify(y);

// errors: any error in the candidate that the baseline didn't have
const newErr = (ea, eb, where) => { for (const e of eb || []) if (!(ea || []).includes(e)) bad(`${where}: new error: ${e}`); };
newErr(sa.bootErrors, sb.bootErrors, 'boot'); newErr(sa.dataErrors, sb.dataErrors, 'data');

for (const k of new Set([...Object.keys(sa.data), ...Object.keys(sb.data)])) {
  if (!(k in sb.data)) { bad(`data ${k}: missing in candidate`); continue; }
  if (!(k in sa.data)) { bad(`data ${k}: new in candidate (not in baseline)`); continue; }
  if (sa.data[k] !== sb.data[k]) bad(`data ${k}: contents differ`);
}
if (!eq(sa.tables.clubs, sb.tables.clubs)) bad('club table differs');
if (!eq(sa.tables.courseIds, sb.tables.courseIds)) bad('course list differs');
for (const id of sa.tables.courseIds) if (sa.tables.courses[id] !== sb.tables.courses[id]) bad(`course ${id}: registry entry differs`);

let holes = 0, shots = 0, pics = 0;
const picJobs = [];
for (const id of Object.keys(sa.courses)) {
  const ca = sa.courses[id], cb = sb.courses[id];
  if (!cb) { bad(`course ${id}: not in candidate run`); continue; }
  for (const k of ['err', 'cur', 'n', 'par', 'club']) if (!eq(ca[k], cb[k])) bad(`course ${id}: ${k} ${JSON.stringify(ca[k])} -> ${JSON.stringify(cb[k])}`);
  newErr(ca.errors, cb.errors, `course ${id}`);
  (ca.holes || []).forEach((ha, i) => {
    const hb = (cb.holes || [])[i], w = `${id} hole ${i + 1}`; holes++;
    if (!hb) { bad(`${w}: missing`); return; }
    if (!eq(ha.err, hb.err)) bad(`${w}: error ${ha.err || 'none'} -> ${hb.err || 'none'}`);
    for (const f of new Set([...Object.keys(ha.fp || {}), ...Object.keys(hb.fp || {})])) if ((ha.fp || {})[f] !== (hb.fp || {})[f]) bad(`${w}: ${f} differs`);
    const pa = ha.play || {}, pb = hb.play || {};
    shots += (pa.shots || []).length;
    if (!eq(pa.shots, pb.shots)) {
      const n = Math.max((pa.shots || []).length, (pb.shots || []).length);
      for (let s = 0; s < n; s++) if (!eq((pa.shots || [])[s], (pb.shots || [])[s])) { bad(`${w}: shot ${s + 1} ${JSON.stringify((pa.shots || [])[s])} -> ${JSON.stringify((pb.shots || [])[s])}`); break; }
    } else if (pa.score !== pb.score || pa.end !== pb.end || pa.steps !== pb.steps) bad(`${w}: round ended differently (${pa.score}/${pa.end}/${pa.steps} -> ${pb.score}/${pb.end}/${pb.steps})`);
  });
  const ia = path.join(A, 'img', id + '.png'), ib = path.join(B, 'img', id + '.png');
  if (fs.existsSync(ia) !== fs.existsSync(ib)) { bad(`${id}: picture ${fs.existsSync(ia) ? 'missing' : 'new'} in candidate`); continue; }
  if (!fs.existsSync(ia)) continue; pics++;
  const ba = fs.readFileSync(ia), bb = fs.readFileSync(ib);
  if (!ba.equals(bb)) picJobs.push([id, ba, bb]);
}

async function measurePics() {
  if (!picJobs.length) return;
  const { chromium } = require('playwright'), browser = await chromium.launch(), page = await browser.newPage();
  for (const [id, ba, bb] of picJobs) {
    const r = await page.evaluate(async ([a, b]) => {
      const load = s => new Promise((ok, no) => { const i = new Image(); i.onload = () => ok(i); i.onerror = no; i.src = 'data:image/png;base64,' + s; });
      const [ia, ib] = await Promise.all([load(a), load(b)]);
      if (ia.width !== ib.width || ia.height !== ib.height) return { size: true };
      const w = ia.width, h = ia.height, c = document.createElement('canvas'); c.width = w * 3; c.height = h;
      const x = c.getContext('2d'); x.drawImage(ia, 0, 0); x.drawImage(ib, w, 0);
      const da = x.getImageData(0, 0, w, h), db = x.getImageData(w, 0, w, h), dd = x.createImageData(w, h);
      let n = 0;
      for (let k = 0; k < da.data.length; k += 4) {
        const m = Math.max(Math.abs(da.data[k] - db.data[k]), Math.abs(da.data[k + 1] - db.data[k + 1]), Math.abs(da.data[k + 2] - db.data[k + 2]));
        if (m > 24) n++;
        dd.data[k] = m > 24 ? 255 : m * 4; dd.data[k + 1] = dd.data[k + 2] = m > 24 ? 0 : m * 4; dd.data[k + 3] = 255;
      }
      x.putImageData(dd, 2 * w, 0);
      return { share: n / (w * h), png: c.toDataURL('image/png') };
    }, [ba.toString('base64'), bb.toString('base64')]);
    if (r.size) { bad(`${id}: picture size differs`); continue; }
    if (r.share > .002) {
      bad(`${id}: picture differs (${(r.share * 100).toFixed(2)}% of pixels) -> diff/${id}.png`);
      fs.mkdirSync(path.join(B, 'diff'), { recursive: true }); fs.writeFileSync(path.join(B, 'diff', id + '.png'), Buffer.from(r.png.split(',')[1], 'base64'));
    }
  }
  await browser.close();
}

measurePics().then(() => {
const head = `Compared ${Object.keys(sa.data).length} data blocks, ${Object.keys(sa.courses).length} courses, ${holes} holes, ${shots} scripted shots, ${pics} pictures.`;
const txt = out.length ? `${head}\n\n${out.length} difference(s):\n` + out.map(x => '- ' + x).join('\n') : `${head}\n\nNo differences: the candidate plays and looks the same as the baseline.`;
console.log(txt);
if (REPORT) fs.writeFileSync(REPORT, txt + '\n');
process.exit(out.length ? 1 : 0);
}).catch(e => { console.error(e); process.exit(2); });
