// node shot2.js <port> <cid,cid,...> <outdir>  -- course-side clubhouse views like the clubhouse gallery (shot.js), saved as <cid>.jpg
const { chromium } = require('playwright');const fs=require('fs');
const [port,ids,outdir]=process.argv.slice(2);fs.mkdirSync(outdir,{recursive:true});
const HCF=outdir+'/../besthole.json';const HC=fs.existsSync(HCF)?JSON.parse(fs.readFileSync(HCF,'utf8')):{};
(async()=>{const b=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--enable-unsafe-swiftshader','--use-angle=swiftshader','--ignore-gpu-blocklist']});
 const p=await b.newPage({viewport:{width:760,height:900}});const errs=[];p.on('pageerror',e=>errs.push(e.message));
 await p.route(u=>!u.href.startsWith('http://localhost'),r=>r.abort());
 await p.addInitScript(()=>{window.__noPerf=1;try{localStorage.setItem('golf-news-seen','zzzz');localStorage.setItem('golf-gfx','high');}catch(e){}});
 await p.goto(`http://localhost:${port}/index.html`,{waitUntil:'domcontentloaded',timeout:240000});await p.waitForTimeout(7000);
 await p.addStyleTag({content:'#game *{visibility:hidden!important} #game canvas{visibility:visible!important} #game #c{visibility:hidden!important} .modal{display:none!important}'});
 for(const cid of ids.split(',')){
  const r=await p.evaluate(([cid,hc])=>window.__ev(`(()=>{try{$('menuM').hidden=true;}catch(e){}G.paused=false;setCourse(${JSON.stringify(cid)},false);
    let best=null;for(let i=0;i<TB.length;i++){if(${JSON.stringify(hc)}!=null&&i!==${JSON.stringify(hc)})continue;const h=buildHole(TB[i],i);for(const q of (h.buildings||[]))if(q.club){
      const L=h.line||[];let md=1e9,mp=null;for(let k=0;k+1<L.length;k++){const a=L[k],b=L[k+1],dx=b[0]-a[0],dy=b[1]-a[1],l2=dx*dx+dy*dy||1;let t=((q.x-a[0])*dx+(q.y-a[1])*dy)/l2;t=Math.max(0,Math.min(1,t));const px=a[0]+dx*t,py=a[1]+dy*t,d=Math.hypot(q.x-px,q.y-py);if(d<md){md=d;mp=[px,py];}}
      if(!best||q.area>best.area*1.3||(q.area>best.area*.77&&md<best.md))best={i,area:q.area,md,mp,x:q.x+h.T0[0],y:q.y+h.T0[1]};}}
    if(!best)return {none:true};window.__best=best;startHole(best.i);return best;})()`),[cid,HC[cid]??null]);
  if(r.none){console.log(cid,'no clubhouse');continue;}HC[cid]=r.i;fs.writeFileSync(HCF,JSON.stringify(HC));
  await p.waitForTimeout(2500);
  const cam=await p.evaluate(()=>window.__ev(`(()=>{const h=G.hole,B=window.__best,T0=h.T0;const q=(h.buildings||[]).filter(q=>q.club).sort((a,b)=>Math.hypot(a.x+T0[0]-B.x,a.y+T0[1]-B.y)-Math.hypot(b.x+T0[0]-B.x,b.y+T0[1]-B.y))[0];
    let ux=B.mp[0]-T0[0]-q.x,uy=B.mp[1]-T0[1]-q.y;const ul=Math.hypot(ux,uy)||1;ux/=ul;uy/=ul;
    const bb=q.bb,sz=Math.max(bb[2]-bb[0],bb[3]-bb[1]),a0=Math.atan2(uy,ux),TR=(h.trees||[]),BS=(h.buildings||[]);let best=null;
    for(const da of [0,20,-20,40,-40,60,-60,90,-90,135,-135,180])for(const dm of [1,1.25,.8,1.5]){const d=Math.max(45,Math.min(120,sz*dm*1.15)),a=a0+da*Math.PI/180,ex=q.x+Math.cos(a)*d,ey=q.y+Math.sin(a)*d;
      if(BS.some(b=>inPoly(b,ex,ey)))continue;let pen=0;const sx=q.x-ex,sy=q.y-ey,sl=Math.hypot(sx,sy);
      for(const t of TR){const tx=t.x-ex,ty=t.y-ey,pr=(tx*sx+ty*sy)/sl;if(pr<-3||pr>sl-sz*.35)continue;const pd=Math.abs(tx*sy-ty*sx)/sl;const rr=(t.r||3)+1.2;if(pd<rr)pen+=pr<15?3:1;}
      for(let k=1;k<12;k++){const f=k/12*.7,px=ex+sx*f,py=ey+sy*f;if(BS.some(b=>b!==q&&inPoly(b,px,py)))pen+=3;}
      if(h.water&&h.water.some(w=>inPoly(w,ex,ey)))pen+=.5;const sc=pen*10+Math.abs(da)/30+Math.abs(dm-1)*2;if(!best||sc<best.sc)best={sc,ex,ey,d,pen,da};}
    const d=best.d,ex=best.ex,ey=best.ey,g0=hAt(q.x,q.y),ge=hAt(ex,ey);const eave=(q.rec&&q.rec[0])||4;
    G.ball.x=ex;G.ball.y=ey;window.__camOv={E:[ex,Math.max(ge+1.7,g0+eave*.55)+d*.05,ey],L:[q.x,g0+eave*.6,q.y]};G.state='aim';return {d,da:best.da};})()`));
  await p.waitForTimeout(4500);await p.screenshot({path:`${outdir}/${cid}.png`,timeout:180000});console.log(cid,JSON.stringify(cam));}
 console.log('errors',JSON.stringify(errs.slice(0,4)));await b.close();})();
