// node run.js <steps.json>  steps: [["ev","code"],["wait",ms],["shot","file"],["log","code"]]
const { chromium } = require('playwright');const fs=require('fs');const steps=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
(async()=>{const b=await chromium.launch({executablePath:process.env.CHROME||'/opt/pw-browsers/chromium',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:+(process.env.W||900),height:+(process.env.H||560)}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(u=>!u.href.startsWith('http://localhost'),r=>r.abort());
 await p.addInitScript(ns=>{window.__noPerf=1;if(ns)window.__noSh=1;try{localStorage.setItem('golf-news-seen','zzzz');localStorage.setItem('golf-gfx','high');}catch(e){}},!!process.env.NOSH);
 await p.goto('http://localhost:'+(process.env.PORT||8765)+'/index.html'+(process.env.Q||''),{waitUntil:'domcontentloaded',timeout:240000});await p.waitForTimeout(9000);
 await p.addStyleTag({content:'.modal{display:none!important}'+(process.env.NOUI?' #game *{visibility:hidden!important} #game canvas{visibility:visible!important} #game #c{visibility:hidden!important}':'')});
 for(const [k,a] of steps){
  if(k==='wait')await p.waitForTimeout(a);
  else if(k==='shot')await p.screenshot({path:a,timeout:300000});
  else{const r=await p.evaluate(s=>{try{return JSON.stringify(window.__ev(s));}catch(e){return 'ERR '+e.message}},a);if(k==='log')console.log(r&&r.length>3000?r.slice(0,3000)+'...':r);
   if(k==='save'){const [f,code]=a;}}
  if(k==='dumpf'){const [f,cf]=a;const r=await p.evaluate(s=>JSON.stringify(window.__ev(s)),fs.readFileSync(cf,'utf8'));fs.writeFileSync(f,r);console.log('dumped',f,r.length);}
  if(k==='dump'){const [f,code]=a;const r=await p.evaluate(s=>JSON.stringify(window.__ev(s)),code);fs.writeFileSync(f,r);console.log('dumped',f,r.length);}
 }
 console.log('errors',JSON.stringify(errs.slice(0,4)));await b.close();})();
