// usage: node bldexport.js ids out.json : per course origin, clubhouse polygons and surround buildings (course yards)
const { chromium } = require('playwright');const fs=require('fs');const ids=process.argv[2]?process.argv[2].split(','):null,out=process.argv[3];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(u=>!u.href.startsWith('http://localhost'),r=>r.abort());await p.addInitScript(()=>{window.__noPerf=1;});
 await p.goto('http://localhost:8766/index.html',{waitUntil:'domcontentloaded',timeout:240000});await p.waitForTimeout(6000);
 const r=await p.evaluate((ids)=>window.__ev(`(()=>{const o={};for(const id of ${JSON.stringify(ids)}||Object.keys(COURSES)){const C=COURSES[id],CO=C.course,S=C.surr;
   const lines=CO.holes.map(h=>h.line);
   o[id]={origin:CO.origin||null,club:(CO.polys.clubhouse||[]),bld:S&&S.bld?S.bld.map(B=>[B[0],B[1]]):[],houses:S&&S.houses?S.houses.length:0,lines};}return o;})()`),ids);
 fs.writeFileSync(out,JSON.stringify(r));console.log(Object.entries(r).map(([k,v])=>k+':'+v.club.length+'/'+v.bld.length).join(' '),JSON.stringify(errs.slice(0,3)));await b.close();})();
