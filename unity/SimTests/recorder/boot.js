// opens the repo's web game headless (like tools/check/snapshot.js) and returns an evaluator in the game's scope
const path=require('path');
const { chromium } = require(process.env.PLAYWRIGHT_CORE||'playwright');
const { serve } = require(path.join(__dirname,'../../../tools/check/serve.js'));
module.exports=async function boot(site){
  const { srv, url } = await serve(site);
  const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || undefined, args: ['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist'] });
  const ctx = await browser.newContext({ viewport:{width:390,height:844}, deviceScaleFactor: +(process.env.GGDPR || 1), serviceWorkers:'block' });
  await ctx.route(u => !u.href.startsWith(url), r => r.abort());
  const page = await ctx.newPage(); const errs=[];
  page.on('pageerror', e => errs.push(e.message));
  await page.addInitScript(() => { let a = 12345; Math.random = () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; try { localStorage.clear(); } catch (e) { } });
  await page.clock.install({ time: new Date('2026-06-01T12:00:00Z') });
  await page.clock.pauseAt(new Date('2026-06-01T12:00:01Z'));
  await page.goto(url + '/index.html', { timeout: 600000, waitUntil: 'load' });
  for (let k=0;k<600;k++){ if(await page.evaluate(()=>{try{return !!window.__ev('typeof G!=="undefined"&&!!G.hole');}catch(e){return false;}}))break; await new Promise(r=>setTimeout(r,100)); }
  await page.clock.runFor(1500);
  const ev = s => page.evaluate(s => window.__ev(s), s);
  // another course: its Blender clubhouse file comes in by a script tag (startHole waits for it, and returns at once with no hole until
  // it's in): load it before the exporters start the holes. export_all.sh sets GGCOURSE.
  if (process.env.GGCOURSE) for (let k = 0; k < 300; k++) { if (await ev(`b10ClubReady('${process.env.GGCOURSE}')`)) break; await new Promise(r => setTimeout(r, 200)); }
  return { ev, errs, page, close: async()=>{await browser.close();srv.close();} };
};
