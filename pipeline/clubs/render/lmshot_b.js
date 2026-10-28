// usage: PORT=8766 node lmshot.js '[[course,x,y,dist,height,name,az?],...]' outdir   (x,y course yd; dist/height of the camera; az radians or omitted = look from the nearest hole line)
const { chromium } = require('playwright');const list=JSON.parse(process.argv[2]),OUT=process.argv[3];
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:800,height:500}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(u=>!u.href.startsWith('http://localhost'),r=>r.abort());
 await p.addInitScript(()=>{window.__noPerf=1;window.__noSh=1;try{localStorage.setItem('golf-news-seen','zzzz');localStorage.setItem('golf-gfx','high');}catch(e){}});
 await p.goto('http://localhost:'+(process.env.PORT||8767)+'/index.html?b10=0',{waitUntil:'domcontentloaded',timeout:240000});await p.waitForTimeout(8000);
 await p.addStyleTag({content:'#game *{visibility:hidden!important} #game canvas{visibility:visible!important} #game #c{visibility:hidden!important} .modal{display:none!important}'});
 for(const [c,x,y,d,ht,name,az] of list){
  const info=await p.evaluate(a=>window.__ev(`(()=>{let [c,x,y,d,ht,az]=${JSON.stringify(a)};document.getElementById('menuM').hidden=true;G.paused=false;setCourse(c,false);if(x===null||x==='pin'){const HH=COURSES[c].course.holes[y];const q=x===null?HH.line[0]:HH.pin;x=q[0];y=q[1];}
    let bi=0,bd=1e9;for(let i=0;i<18;i++){const L=COURSE.holes[i].line;for(const q of L){const dd=Math.hypot(q[0]-x,q[1]-y);if(dd<bd){bd=dd;bi=i;}}}startHole(bi);G.state='aim';
    const h=G.hole,lx=x-h.T0[0],ly=y-h.T0[1];let ang;if(az==='wf'){CUR._lm=null;const o=lmAnchors().list.filter(q=>q.k==='wf').sort((a,b)=>Math.hypot(a.x-x,a.y-y)-Math.hypot(b.x-x,b.y-y))[0];ang=o.a+.35;}else if(az!=null)ang=az;else{const L=h.line;let best=L[0],bb=1e9;for(const q of L){const dd=Math.hypot(q[0]-lx,q[1]-ly);if(dd<bb&&dd>d*.6){bb=dd;best=q;}}ang=Math.atan2(best[1]-ly,best[0]-lx);}
    const ex=lx+Math.cos(ang)*d,ey=ly+Math.sin(ang)*d;if(window.__noSh){R3.sun.castShadow=false;}G.ball.x=ex;G.ball.y=ey;window.__camOv={E:[ex,Math.max(hAt(ex,ey),hAt(lx,ly))+ht,ey],L:[lx,hAt(lx,ly)+1.5,ly]};return {hole:bi+1};})()`),[c,x,y,d,ht,az??null]);
  await p.waitForTimeout(5000);await p.screenshot({path:OUT+'/'+name+'.png',timeout:180000});console.log(name,JSON.stringify(info));}
 console.log('errors',errs.slice(0,3));await b.close();})();
