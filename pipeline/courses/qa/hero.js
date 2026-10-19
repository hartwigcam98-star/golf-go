const { chromium } = require('playwright');
const list=JSON.parse(process.argv[2]),OUT=process.argv[3],port=process.argv[4]||8766;
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:640,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(u=>!u.href.startsWith('http://localhost'),r=>r.abort());
 await p.addInitScript(()=>{window.__noPerf=1;try{localStorage.setItem('golf-news-seen','zzzz');localStorage.setItem('golf-gfx','high');}catch(e){}});
 await p.goto(`http://localhost:${port}/index.html`,{waitUntil:'domcontentloaded',timeout:240000});await p.waitForTimeout(8000);
 await p.addStyleTag({content:'#game *{visibility:hidden!important} #game canvas{visibility:visible!important} #game #c{visibility:hidden!important} .modal{display:none!important}'});
 for(const [c,hiReq] of list){
  const info=await p.evaluate(([c,hiReq])=>window.__ev(`(()=>{const c='${c}';let hi=${hiReq};document.getElementById('menuM').hidden=true;G.paused=false;setCourse(c,false);
    if(hi<0){let best=null;for(let i=0;i<18;i++){startHole(i);const h=G.hole;if(h.par!==3)continue;const pin=h.pin;let wd=1e9;
        for(let a=0;a<24;a++)for(const r of [15,25,35,45]){const x=pin[0]+Math.cos(a/24*6.283)*r,y=pin[1]+Math.sin(a/24*6.283)*r;if(lieCodeAt(h,x,y)===6)wd=Math.min(wd,r);}
        const L=Math.hypot(pin[0]-h.line[0][0],pin[1]-h.line[0][1]);const sc=(wd<50?1000-wd:0)+L*.5;if(!best||sc>best.sc)best={sc,i};}hi=best?best.i:17;}
    startHole(hi);const tb=document.getElementById('teeBtn');if(tb)tb.click();
    const h=G.hole,T=h.line[0],P=h.pin,dx=P[0]-T[0],dy=P[1]-T[1],l=Math.hypot(dx,dy),ux=dx/l,uy=dy/l;
    const par3=h.par===3,back=par3?22:34,ht=par3?11:22;
    const L=par3?[P[0],hAt(P[0],P[1])+1,P[1]]:[T[0]+dx*.55,hAt(T[0]+dx*.55,T[1]+dy*.55),T[1]+dy*.55];
    const ex=T[0]-ux*back,ey=T[1]-uy*back;const E=[ex,Math.max(hAt(ex,ey),hAt(T[0],T[1]))+ht,ey];
    window.__camOv={E,L};return {hi,par:h.par};})()`),[c,hiReq]);
  await p.waitForTimeout(12000);
  const cy=await p.evaluate(()=>window.__ev('V.cy'));
  await p.screenshot({path:`${OUT}/hero_${c}.png`,clip:{x:0,y:Math.max(0,cy-200),width:640,height:360},timeout:400000});
  console.log(c,JSON.stringify(info),'cy',cy);}
 console.log('errors',JSON.stringify(errs.slice(0,5)));await b.close();})();
