// node dump.js [out.json]  (PORT, PAGE: a harness page with window.__ev, e.g. pipeline/courses/test/mkharness.py output)
// per R3NAIP key: course ids, tree extent, bunker polygons, scenery -> input for mkcfg.py
// dump per R3NAIP key: ext, bunker polygons, course id(s)
const { chromium } = require('playwright');const fs=require('fs');
(async()=>{const b=await chromium.launch({args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:400,height:300}});
 await p.route(u=>!u.href.startsWith('http://localhost'),r=>r.abort());
 await p.addInitScript(()=>{window.__noPerf=1;try{localStorage.setItem('golf-news-seen','zzzz');}catch(e){}});
 await p.goto('http://localhost:'+(process.env.PORT||8766)+'/'+(process.env.PAGE||'index.html'),{waitUntil:'domcontentloaded',timeout:240000});await p.waitForTimeout(9000);
 const r=await p.evaluate(()=>window.__ev(`(()=>{const o={};for(const id in COURSES){const C=COURSES[id],k=C.data||id;if(!R3NAIP[k])continue;const c=C.course||{};const P=c.polys||{};
   (o[k]=o[k]||{ids:[],ext:R3NAIP[k].ext,bunker:P.bunker||[],scen:C.scen||null,trees:C.trees||null}).ids.push(id);}return JSON.stringify(o);})()`));
 fs.writeFileSync(process.argv[2]||'courses.json',r);const o=JSON.parse(r);console.log(Object.keys(o).length,Object.entries(o).map(([k,v])=>k+':'+v.bunker.length+(v.scen?'/'+v.scen:'')).join(' '));await b.close();})();
