const { chromium } = require('playwright');
const c=process.argv[2],port=process.argv[3]||8766;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(u=>!u.href.startsWith('http://localhost'),r=>r.abort());
 await p.addInitScript(()=>{window.__noPerf=1;try{localStorage.setItem('golf-news-seen','zzzz');}catch(e){}});
 await p.goto(`http://localhost:${port}/index.html`,{waitUntil:'domcontentloaded',timeout:240000});await p.waitForTimeout(6000);
 const res=await p.evaluate((c)=>window.__ev(`(()=>{const out=[];document.getElementById('menuM').hidden=true;setCourse('${c}',false);
   for(let i=0;i<18;i++){startHole(i);G.state='aim';try{prepareShot();}catch(e){}G.paused=false;G.wind={a:0,mph:0,...(G.wind||{})};G.wind.mph=0;
     const club=G.clubIdx;try{strikeShot(.97,0);}catch(e){out.push({h:i+1,err:String(e)});continue;}
     let n=0;while(G.state!=='aim'&&G.state!=='card'&&n<4000){update(1/60);n++;}
     const h=G.hole,b=G.ball;out.push({h:i+1,lie:G.lie,carry:Math.round(Math.hypot(b.x-h.line[0][0],b.y-h.line[0][1])),toPin:Math.round(Math.hypot(b.x-h.pin[0],b.y-h.pin[1])),state:G.state});}
   return out;})()`),c);
 console.log(c,res.map(r=>r.err?('ERR '+r.h+' '+r.err):(r.h+':'+r.lie+'/'+r.toPin+'/'+r.state)).join(' '));console.log('errors',JSON.stringify(errs.slice(0,5)));await b.close();})();
