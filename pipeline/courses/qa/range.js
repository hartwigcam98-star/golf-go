// Range gate for a new course: node qa/range.js <key> [port]   (page served from work/test as in the other gates)
// Prints the range's source and size, checks its tee and target sit inside it, hits a ball and checks it comes back to the mat,
// and reports how much of the range has lidar ground. If lidar is under 90% it prints the box to put in pipeline/ranges/lidar_want.json.
const { chromium } = require('playwright');
const c=process.argv[2],port=process.argv[3]||8766;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:390,height:844}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(u=>!u.href.startsWith('http://localhost'),r=>r.abort());
 await p.addInitScript(()=>{window.__noPerf=1;try{localStorage.setItem('golf-news-seen','zzzz');}catch(e){}});
 await p.goto(`http://localhost:${port}/index.html`,{waitUntil:'domcontentloaded',timeout:240000});await p.waitForTimeout(6000);
 const r=await p.evaluate((c)=>window.__ev(`(()=>{document.getElementById('menuM').hidden=true;const K=COURSES['${c}'];if(!K)return{err:'no course ${c}'};
   if(RANGE_AT['${c}'])return{src:'borrowed from '+RANGE_AT['${c}'],ok:!!COURSES[RANGE_AT['${c}']]};
   setCourse('${c}',false);const R=rangeOf(K);if(!R)return{src:'none'};const src=RANGEX['${c}']?'traced':'map';
   const inR=(x,y)=>{let q=false;const P=R.P;for(let a=0,bb=P.length-1;a<P.length;bb=a++){const[xa,ya]=P[a],[xb,yb]=P[bb];if((ya>y)!==(yb>y)&&x<(xb-xa)*(y-ya)/(yb-ya)+xa)q=!q;}return q;};
   const out={src,len:R.len,teeIn:inR(...R.line[0]),pinIn:inR(...R.pin)};
   startHole(TB.length);out.targets=G.hole.targets.length;G.state='aim';try{prepareShot();}catch(e){}G.paused=false;G.wind={a:0,mph:0};
   try{strikeShot(.9,0);}catch(e){out.err=String(e);return out;}let n=0;while(G.state!=='aim'&&n<6000){update(1/60);n++;}
   out.back=G.state==='aim'&&Math.hypot(G.ball.x,G.ball.y)<.01&&G.rangeN===1;
   const xs=R.P.map(q=>q[0]),ys=R.P.map(q=>q[1]),box=[Math.min(...xs)-45,Math.min(...ys)-45,Math.max(...xs)+45,Math.max(...ys)+45].map(Math.round);let tot=0,lid=0;
   for(let x=box[0]+45;x<=box[2]-45;x+=5)for(let y=box[1]+45;y<=box[3]-45;y+=5)if(inR(x,y)){tot++;const L=lidW(x,y);if(L&&L.w>.5)lid++;}
   out.lidar=Math.round(100*lid/Math.max(1,tot));out.box=box;return out;})()`),c);
 const ok=r.src&&r.src!=='none'&&!r.err&&(r.src.startsWith('borrowed')?r.ok:(r.teeIn&&r.pinIn&&r.back&&r.len>=180));
 console.log(c,JSON.stringify(r));
 if(r.lidar!=null&&r.lidar<90)console.log(`lidar ${r.lidar}%: add "${c}": ${JSON.stringify(r.box)} to pipeline/ranges/lidar_want.json and run the range job (RUNBOOK step 5b)`);
 console.log(ok&&!errs.length?'RANGE PASS':'RANGE FAIL','errors',JSON.stringify(errs.slice(0,5)));await b.close();})();
