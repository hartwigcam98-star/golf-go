// usage: node qarun.js ids out.json [port]   (serves /home/claude/golf/work/test via python http.server on the port)
const { chromium } = require('playwright');const fs=require('fs');
const ids=process.argv[2].split(','),out=process.argv[3],port=process.argv[4]||8767;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(u=>!u.href.startsWith('http://localhost'),r=>r.abort());
 await p.addInitScript(()=>{window.__noPerf=1;try{localStorage.setItem('golf-news-seen','zzzz');}catch(e){}});
 await p.goto(`http://localhost:${port}/index.html`,{waitUntil:'domcontentloaded',timeout:240000});await p.waitForTimeout(6000);
 await p.evaluate(()=>window.__ev(`(()=>{window.__golf={setCourse:id=>setCourse(id,false),startHole:i=>startHole(i)};document.getElementById('menuM').hidden=true;G.paused=true;})()`));
 const fn=fs.readFileSync('/home/claude/golf/qa/qacheck.js','utf8').replace(/^\/\*[\s\S]*?\*\/\s*/,'');
 const t0=Date.now();const res=await p.evaluate(([fn,ids])=>window.__ev('('+fn+')')(ids),[fn,ids]);fs.writeFileSync(out,JSON.stringify(res));
 console.log('done',((Date.now()-t0)/1000).toFixed(1)+'s holes',res.length,'errors',JSON.stringify(errs.slice(0,5)));await b.close();})();
